import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { exportBackup, restoreBackup } from '../server/backup'
import { createChannel, getChannelByCode } from '../server/channels'
import { addCharacterImage, createBot, createCharacter } from '../server/content'
import { ingestSnapshot } from '../server/snapshots'
import { createTestDb } from './helpers'

let db: Awaited<ReturnType<typeof createTestDb>>['db']
let close: () => Promise<void>

before(async () => {
  const handle = await createTestDb()
  db = handle.db
  close = handle.close
})

after(async () => close())

test('backup roundtrip keeps channel codes and character image urls and omits secrets', async () => {
  await createChannel(db, { name: 'Tin Nóng VN', code: 'tin-nong-vn', platform: 'facebook', postingService: 'buffer' })
  const bot = await createBot(db, { id: 'bot-backup', name: 'Bot', title: 'Bot', prompt: 'Nội dung bot.' })
  const character = await createCharacter(db, { botId: bot.id, name: 'Cam', appearance: 'Áo cam cố định.' })
  await addCharacterImage(db, character.id, { kind: 'full_body', label: null, url: 'https://i.ibb.co/example/full.png' })
  await ingestSnapshot(db, {
    source: 'upload',
    importedBy: null,
    payload: {
      label: 'thử',
      posts: [{ channelCode: 'tin-nong-vn', title: 'Bài 1', status: 'scheduled', scheduledAt: '2026-11-12T12:00:00+07:00' }],
    },
  })
  const data = await exportBackup(db)
  const json = JSON.stringify(data)
  assert.equal(json.includes('password'), false)
  assert.equal(json.includes('token_hash'), false)
  assert.equal(json.includes('csrf'), false)
  assert.match(json, /https:\/\/i\.ibb\.co\/example\/full\.png/)
  const restored = JSON.parse(json) as typeof data
  const channel = restored.channels.find((item) => item.code === 'tin-nong-vn')
  assert.ok(channel)
  channel.name = 'Tin Nóng đã khôi phục'
  await restoreBackup(db, restored)
  const saved = await getChannelByCode(db, 'tin-nong-vn')
  assert.equal(saved?.code, 'tin-nong-vn')
  assert.equal(saved?.name, 'Tin Nóng đã khôi phục')
  const again = await exportBackup(db)
  assert.equal(again.characterImages[0]?.url, 'https://i.ibb.co/example/full.png')
  assert.equal(again.posts.length, 1)
})
