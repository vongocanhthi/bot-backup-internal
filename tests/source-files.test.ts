import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { HttpError } from '../lib/http-error'
import { describeSourceUpload } from '../lib/source-files'
import { createBot, createCharacter, saveSourceFile } from '../server/content'
import { createTestDb } from './helpers'

let db: Awaited<ReturnType<typeof createTestDb>>['db']
let close: () => Promise<void>

before(async () => {
  const handle = await createTestDb()
  db = handle.db
  close = handle.close
})

after(async () => close())

test('source uploads accept zip json and txt and reject other types or files over 4 MB', () => {
  assert.equal(describeSourceUpload('Cam Remotion.zip', 'application/octet-stream', 12).filename, 'Cam-Remotion.zip')
  assert.equal(describeSourceUpload('notes.txt', '', 4).contentType, 'text/plain')
  assert.equal(describeSourceUpload('palette.json', 'application/json', 4).contentType, 'application/json')
  assert.throws(() => describeSourceUpload('sprite.png', 'image/png', 10), (error: unknown) => {
    assert.ok(error instanceof HttpError)
    assert.match(error.message, /File gốc phải là \.zip, \.json, \.txt hoặc \.md/)
    return true
  })
  assert.throws(() => describeSourceUpload('big.zip', 'application/zip', 4 * 1024 * 1024 + 1), (error: unknown) => {
    assert.ok(error instanceof HttpError)
    assert.match(error.message, /File gốc lớn hơn 4 MB/)
    return true
  })
})

test('a character can store more than one source file but not two with the same name', async () => {
  const bot = await createBot(db, { id: 'bot-sources', name: 'Bot', title: 'Bot', prompt: 'Prompt.' })
  const character = await createCharacter(db, { botId: bot.id, name: 'Cam', appearance: 'Áo cam.' })
  await saveSourceFile(db, character.id, {
    filename: 'cam.zip',
    contentType: 'application/zip',
    bytes: Uint8Array.from([1, 2, 3]),
    note: 'gói 1',
  })
  await saveSourceFile(db, character.id, {
    filename: 'readme.txt',
    contentType: 'text/plain',
    bytes: Uint8Array.from([65]),
    note: null,
  })
  await assert.rejects(
    () =>
      saveSourceFile(db, character.id, {
        filename: 'cam.zip',
        contentType: 'application/zip',
        bytes: Uint8Array.from([9]),
        note: null,
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError)
      assert.match(error.message, /cùng tên/)
      return true
    },
  )
})
