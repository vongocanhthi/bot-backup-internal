import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import type { Db } from '../lib/db'
import { HttpError } from '../lib/http-error'
import { resetRateLimits } from '../lib/rate-limit'
import { scanSecrets } from '../lib/secret-scan'
import { describeBackupVoice } from '../lib/voice'
import { sha256 } from '../lib/security'
import { authenticateBackupKey, createApiKey, revokeApiKey } from '../server/api-keys'
import { saveBackupSource, upsertBackupBot, upsertBackupCharacter } from '../server/backup-api'
import { createBot, getCharacter, getSourceFile, getVoiceAudio } from '../server/content'
import { saveBackupVoice } from '../server/backup-api'
import { createTestDb } from './helpers'

let db: Awaited<ReturnType<typeof createTestDb>>['db']
let close: () => Promise<void>

const userId = '00000000-0000-4000-8000-000000000000'

before(async () => {
  resetRateLimits()
  const handle = await createTestDb()
  db = handle.db
  close = handle.close
  await db.query(`INSERT INTO users (id, email, password_hash, is_admin) VALUES ($1, 'api@example.com', 'hash', true)`, [userId])
})

after(async () => close())

test('a new key stores only a hash and an 8 character prefix', async () => {
  await createBot(db, { id: 'bot-khoa', name: 'Bot khóa', title: 'Bot khóa', prompt: 'Prompt.' })
  const created = await createApiKey(db, { name: 'Cam', botId: 'bot-khoa', userId })
  assert.equal(created.prefix.length, 8)
  assert.equal(created.key.startsWith(created.prefix), true)
  assert.equal(created.key.startsWith('bbk_'), true)
  const stored = await db.query<{ key_hash: string }>(`SELECT key_hash FROM api_keys WHERE id = $1`, [created.id])
  assert.equal(stored.rows[0]?.key_hash, sha256(created.key))
  assert.equal(stored.rows[0]?.key_hash === created.key, false)
  const auth = await authenticateBackupKey(db, `Bearer ${created.key}`, '203.0.113.1')
  assert.equal(auth.name, 'Cam')
  assert.equal(auth.botId, 'bot-khoa')
})

test('missing, invalid, and revoked keys are rejected', async () => {
  await assert.rejects(() => authenticateBackupKey(db, null, '203.0.113.2'), /Khóa API không hợp lệ/)
  await assert.rejects(() => authenticateBackupKey(db, 'Bearer bbk_khong-dung', '203.0.113.2'), /Khóa API không hợp lệ/)
  const created = await createApiKey(db, { name: 'Thu hồi', botId: null, userId })
  await revokeApiKey(db, created.id)
  await assert.rejects(() => authenticateBackupKey(db, `Bearer ${created.key}`, '203.0.113.3'), /đã bị thu hồi/)
})

test('a key bound to one bot cannot write another bot', async () => {
  await createBot(db, { id: 'bot-a', name: 'A', title: 'A', prompt: 'Prompt A.' })
  await createBot(db, { id: 'bot-b', name: 'B', title: 'B', prompt: 'Prompt B.' })
  const created = await createApiKey(db, { name: 'Chỉ A', botId: 'bot-a', userId })
  const key = await authenticateBackupKey(db, `Bearer ${created.key}`, '203.0.113.4')
  await assert.rejects(
    () => upsertBackupCharacter(db, key, { botId: 'bot-b', name: 'Mai', appearance: 'Áo đỏ.' }),
    /chỉ được ghi bot đã gán/,
  )
  const character = await upsertBackupCharacter(db, key, {
    botId: 'bot-a',
    name: 'Cam',
    appearance: 'Áo cam.',
    voiceName: 'Ngọc Huyền',
  })
  assert.equal(character.name, 'Cam')
  const again = await upsertBackupCharacter(db, key, { botId: 'bot-a', name: 'Cam', appearance: 'Áo cam cố định.' })
  assert.equal(again.id, character.id)
  const saved = await getCharacter(db, character.id)
  assert.equal(saved?.appearance, 'Áo cam cố định.')
  assert.equal(saved?.voice.name, 'Ngọc Huyền')
})

test('backup text is rejected when it contains a secret', async () => {
  const open = await createApiKey(db, { name: 'Mở', botId: null, userId })
  const key = await authenticateBackupKey(db, `Bearer ${open.key}`, '203.0.113.5')
  assert.equal(scanSecrets('Không đưa mật khẩu hay token vào gói.').length, 0)
  await assert.rejects(
    () =>
      upsertBackupBot(db, key, {
        id: 'bot-bi-mat',
        name: 'Bot',
        title: 'Bot',
        prompt: 'password=supersecretvalue',
        settings: {},
      }),
    /bí mật/,
  )
  assert.equal(await db.query(`SELECT id FROM bots WHERE id = 'bot-bi-mat'`).then((result) => result.rows.length), 0)
})

test('voice and source uploads keep the 4 MB ceiling and replace a source file by name', async () => {
  assert.throws(() => describeBackupVoice('mau.mp3', 'audio/mpeg', 4 * 1024 * 1024 + 1), /không quá 4 MB/)
  assert.throws(() => describeBackupVoice('anh.png', 'image/png', 10), /MP3, M4A hoặc WAV/)
  const open = await createApiKey(db, { name: 'File', botId: null, userId })
  const key = await authenticateBackupKey(db, `Bearer ${open.key}`, '203.0.113.6')
  await upsertBackupBot(db, key, { id: 'bot-file', name: 'Bot file', title: 'Bot file', prompt: 'Prompt sạch.', settings: { theme: 'cam' }, notes: 'ghi chú' })
  const character = await upsertBackupCharacter(db, key, { botId: 'bot-file', name: 'Cam', appearance: 'Áo cam.' })
  await saveBackupVoice(db, key, character.id, { filename: 'mau.mp3', contentType: 'audio/mpeg', bytes: Uint8Array.from([1, 2, 3]) })
  const audio = await getVoiceAudio(db, character.id)
  assert.equal(audio?.contentType, 'audio/mpeg')
  await saveBackupSource(db, key, character.id, {
    filename: 'nguon.md',
    contentType: 'text/markdown',
    bytes: new TextEncoder().encode('chưa rõ nguồn'),
    note: 'nguồn',
  })
  await saveBackupSource(db, key, character.id, {
    filename: 'nguon.md',
    contentType: 'text/markdown',
    bytes: new TextEncoder().encode('đã cập nhật'),
    note: 'nguồn',
  })
  const listed = await getCharacter(db, character.id)
  assert.equal(listed?.sourceFiles.length, 1)
  const file = await getSourceFile(db, character.id, listed!.sourceFiles[0]!.id)
  assert.equal(new TextDecoder().decode(file?.bytes), 'đã cập nhật')
  await assert.rejects(
    () =>
      saveBackupSource(db, key, character.id, {
        filename: 'bi-mat.txt',
        contentType: 'text/plain',
        bytes: new TextEncoder().encode('api_key=abcdefghijkl'),
        note: null,
      }),
    /bí mật/,
  )
})

test('a missing api_keys table returns a migration error', async () => {
  const missing: Db = {
    query: async () => {
      const error = new Error('relation "api_keys" does not exist')
      Object.assign(error, { code: '42P01' })
      throw error
    },
    transaction: async (fn) => fn(missing),
  }
  await assert.rejects(() => authenticateBackupKey(missing, 'Bearer bbk_abc', '203.0.113.7'), (error: unknown) => {
    assert.ok(error instanceof HttpError)
    assert.equal(error.status, 503)
    assert.match(error.message, /004_api_keys/)
    return true
  })
})

test('backup API routes accept a bearer key and do not use the session csrf guard', () => {
  for (const file of [
    'app/api/v1/backup/ping/route.ts',
    'app/api/v1/backup/bot/route.ts',
    'app/api/v1/backup/character/route.ts',
    'app/api/v1/backup/character/[id]/image/route.ts',
    'app/api/v1/backup/character/[id]/voice/route.ts',
    'app/api/v1/backup/character/[id]/source-file/route.ts',
  ]) {
    const source = readFileSync(file, 'utf8')
    assert.match(source, /backupKeyFromRequest/, file)
    assert.equal(source.includes('guardMutation'), false, file)
    assert.equal(source.includes('x-csrf-token'), false, file)
  }
})
