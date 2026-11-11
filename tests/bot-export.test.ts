import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { CHARACTER_INSTRUCTION } from '../lib/bot-export'
import { parseBotIdentity } from '../lib/bot-identity'
import { saigonDate } from '../lib/time'
import { channelSeed } from '../seed/catalog'
import { addCharacterImage, botExportText, createBot, createCharacter, saveSourceFile, saveVoiceSample, updateCharacter } from '../server/content'
import { createTestDb } from './helpers'

const expected: Record<string, { name: string; title?: string }> = {
  '008dfbb6-77f2-4f50-8a6a-812ea7e95168': { name: 'Sao Lại Thế Nhỉ' },
  '17f49035-7e47-4121-ba95-49a96e231ced': { name: 'AI Daily Bot' },
  '203bc76b-eb96-48cb-9010-c6bfa27badfa': { name: 'Tin Nóng VN Bot' },
  '490e51f8-9b10-4db9-8a33-c7232fb4fd2d': { name: 'Việt Review · Xuyên Không Bot' },
  '4539412b-61bf-4306-93f9-3713071aa45b': { name: 'Mẹ Bỉm Thông Thái Bot' },
  '4d736526-241d-4a37-bc7a-74677eefc9f3': { name: 'Tin Tức VN Bot' },
  'b5dcac99-1d45-4693-9ed3-1e14bf0c46bc': { name: 'Quản Lý Kênh & Sao Lưu Bot' },
  'c04edcc3-68b8-4e71-80ea-86d09832b97e': { name: 'Kinh Dị Hoạt Hình Bot', title: 'Kinh Dị Hoạt Hình Bot (Yến Review)' },
  'e27f7d11-ae6f-4a7b-bcfb-9c33f75b9e65': { name: 'Postiz Đăng Đa Kênh Bot' },
  'f9c2331a-9e1d-46a3-94b0-fe3dfaa293a9': { name: 'Cam Tò Mò Bot' },
}

test('bot names come from the attached setup prompts', () => {
  const dir = path.join(process.cwd(), 'seed', 'bots')
  const files = readdirSync(dir).filter((file) => file.endsWith('.txt'))
  assert.equal(files.length, 10)
  for (const file of files) {
    const id = file.replace(/\.txt$/, '')
    const text = readFileSync(path.join(dir, file), 'utf8')
    const identity = parseBotIdentity(text)
    assert.equal(identity.name, expected[id]?.name, id)
    if (expected[id]?.title) assert.equal(identity.title, expected[id]?.title)
  }
})

test('seeded channels keep stated ids and leave unknown ones blank', () => {
  const byCode = Object.fromEntries(channelSeed.map((channel) => [channel.code, channel]))
  assert.equal(byCode['goc-thuc-tinh']?.connectionLabel, 'anhthi199x')
  assert.equal(byCode['goc-thuc-tinh']?.externalId, '6ae73f93e29c69a171277801')
  assert.equal(byCode['lam-sao-lai-the']?.connectionLabel, 'anhthimxh')
  assert.equal(byCode['lam-sao-lai-the']?.platformExternalId, 'UCRL2IWSCNOP-f2NXjfN2OJw')
  assert.equal(byCode['tin-nong-vn']?.externalId, '6ae463fc2f1f5ed6481dc0d7')
  assert.equal(byCode['tin-nong-vn']?.connectionLabel, null)
  assert.equal(byCode['cam-to-mo-youtube']?.externalId, null)
  assert.equal(byCode['viet-review']?.platform, null)
  assert.equal(byCode['thi-review']?.name, 'Thi Review (Mẹ Bỉm Thông Thái)')
  assert.equal(JSON.stringify(channelSeed).includes('token'), false)
})

test('Asia/Saigon date rolls over at 17:00 UTC', () => {
  assert.equal(saigonDate('2026-11-10T16:59:00.000Z'), '2026-11-10')
  assert.equal(saigonDate('2026-11-10T17:30:00.000Z'), '2026-11-11')
})

let db: Awaited<ReturnType<typeof createTestDb>>['db']
let close: () => Promise<void>

before(async () => {
  const handle = await createTestDb()
  db = handle.db
  close = handle.close
})

after(async () => close())

test('config export includes the character section and reference image urls', async () => {
  const bot = await createBot(db, {
    id: 'bot-test-cam',
    name: 'Cam Tò Mò Bot',
    title: 'Cam Tò Mò Bot',
    prompt: 'Bạn là Cam Tò Mò Bot.',
  })
  const character = await createCharacter(db, {
    botId: bot.id,
    name: 'Cam',
    appearance: 'Áo cam #FF6B4A, quần #2B2D42.',
  })
  await addCharacterImage(db, character.id, {
    kind: 'front',
    label: 'nhìn thẳng',
    url: 'https://i.ibb.co/example/cam-front.png',
  })
  const exported = await botExportText(db, bot.id)
  assert.match(exported.text, /===== NHÂN VẬT =====/)
  assert.match(exported.text, new RegExp(CHARACTER_INSTRUCTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(exported.text, /## Cam/)
  assert.match(exported.text, /Áo cam #FF6B4A/)
  assert.match(exported.text, /Mặt trước \(nhìn thẳng\): https:\/\/i\.ibb\.co\/example\/cam-front\.png/)
  assert.match(exported.text, /Bạn là Cam Tò Mò Bot\./)
  assert.match(exported.text, /Luôn dùng đúng giọng đã chốt/)
})

test('config export includes the character voice', async () => {
  const bot = await createBot(db, {
    id: 'bot-voice',
    name: 'Bot giọng',
    title: 'Bot giọng',
    prompt: 'Prompt.',
  })
  const character = await createCharacter(db, { botId: bot.id, name: 'Mai', appearance: 'Áo đỏ.' })
  await updateCharacter(db, character.id, {
    voiceName: 'Hoài My',
    voiceProvider: 'edge-tts',
    voiceGender: 'nu',
    voiceAge: 'trẻ',
    voiceAccent: 'nam',
    voiceSpeed: '1.0',
    voicePitch: 'ấm',
    voiceStyle: 'thân thiện',
    voiceSampleLine: 'Chào cả nhà.',
  })
  await saveVoiceSample(db, character.id, {
    filename: 'hoai-my.wav',
    contentType: 'audio/wav',
    bytes: Uint8Array.from([82, 73, 70, 70]),
  })
  const exported = await botExportText(db, bot.id)
  assert.match(exported.text, /Tên giọng: Hoài My/)
  assert.match(exported.text, /Engine: edge-tts/)
  assert.match(exported.text, /Giới tính: Nữ/)
  assert.match(exported.text, /Vùng miền: Nam/)
  assert.match(exported.text, /Tốc độ: 1\.0/)
  assert.match(exported.text, /Cao độ: ấm/)
  assert.match(exported.text, /Cách nói: thân thiện/)
  assert.match(exported.text, /Câu mẫu: Chào cả nhà\./)
  assert.match(exported.text, /File nghe mẫu: voices\//)
  await saveSourceFile(db, character.id, {
    filename: 'mai-remotion.zip',
    contentType: 'application/zip',
    bytes: Uint8Array.from([80, 75, 3, 4]),
    note: 'Dự án Remotion',
  })
  const withSource = await botExportText(db, bot.id)
  assert.match(withSource.text, /File gốc \(Remotion\/SVG\/sprite\):/)
  assert.match(withSource.text, /mai-remotion\.zip — Dự án Remotion/)
})
