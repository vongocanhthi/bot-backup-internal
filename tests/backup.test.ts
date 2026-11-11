import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import JSZip from 'jszip'
import { backupZip, exportBackup, parseBackup, readBackupBundle, restoreBackup } from '../server/backup'
import { createChannel, getChannelByCode } from '../server/channels'
import { addCharacterImage, createBot, createCharacter, getSourceFile, getVoiceAudio, saveSourceFile, saveVoiceSample, updateCharacter } from '../server/content'
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

test('a version 1 backup without voice fields still restores', () => {
  const parsed = parseBackup({
    format: 'qlk-backup',
    version: 1,
    channels: [],
    slots: [],
    snapshots: [],
    posts: [],
    bots: [{ id: 'bot-old', name: 'Bot', title: 'Bot', prompt: 'Cũ.' }],
    characters: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        botId: 'bot-old',
        name: 'Cũ',
        appearance: 'Mô tả cũ.',
      },
    ],
    characterImages: [],
  })
  assert.equal(parsed.characters.length, 1)
  assert.equal(parsed.characters[0]?.sourceFiles.length, 0)
  assert.equal(parsed.characters[0]?.voice.name, null)
})

test('backup zip keeps the character voice and audio file', async () => {
  const bot = await createBot(db, { id: 'bot-voice-backup', name: 'Bot', title: 'Bot', prompt: 'Prompt.' })
  const character = await createCharacter(db, { botId: bot.id, name: 'Mai', appearance: 'Áo đỏ.' })
  await updateCharacter(db, character.id, {
    voiceName: 'Hoài My',
    voiceProvider: 'edge-tts',
    voiceAccent: 'nam',
    voiceSampleLine: 'Chào cả nhà.',
  })
  const wav = Uint8Array.from([82, 73, 70, 70, 1, 2, 3, 4])
  await saveVoiceSample(db, character.id, { filename: 'hoai-my.wav', contentType: 'audio/wav', bytes: wav })
  const zipBytes = await backupZip(db)
  const zip = await JSZip.loadAsync(zipBytes)
  const charactersFile = zip.file('characters.json')
  assert.ok(charactersFile)
  const charactersJson = await charactersFile.async('string')
  assert.match(charactersJson, /Hoài My/)
  assert.match(charactersJson, /Chào cả nhà\./)
  const audioEntry = zip.file(`voices/${character.id}.wav`)
  assert.ok(audioEntry)
  const audio = await audioEntry.async('uint8array')
  assert.deepEqual(Array.from(audio), Array.from(wav))
  const bundle = await readBackupBundle(zipBytes, 'sao-luu.zip')
  await restoreBackup(db, bundle.data, bundle.voices)
  const saved = await getVoiceAudio(db, character.id)
  assert.ok(saved)
  assert.deepEqual(Array.from(saved.bytes), Array.from(wav))
  const again = await exportBackup(db)
  const restoredCharacter = again.characters.find((item) => item.id === character.id)
  assert.equal(restoredCharacter?.voice.name, 'Hoài My')
  assert.equal(restoredCharacter?.voice.sampleLine, 'Chào cả nhà.')
})

test('backup zip keeps character source packages and older backups still parse', async () => {
  const bot = await createBot(db, { id: 'bot-source-backup', name: 'Bot', title: 'Bot', prompt: 'Prompt.' })
  const character = await createCharacter(db, { botId: bot.id, name: 'Cam', appearance: 'Áo cam.' })
  const payload = Uint8Array.from([80, 75, 3, 4, 9, 8, 7])
  await saveSourceFile(db, character.id, {
    filename: 'cam-remotion.zip',
    contentType: 'application/octet-stream',
    bytes: payload,
    note: 'Sprite + CamSprite.tsx',
  })
  const zipBytes = await backupZip(db)
  const zip = await JSZip.loadAsync(zipBytes)
  const entry = zip.file(`sources/${character.id}/cam-remotion.zip`)
  assert.ok(entry)
  assert.deepEqual(Array.from(await entry.async('uint8array')), Array.from(payload))
  const charactersJson = await zip.file('characters.json')!.async('string')
  assert.match(charactersJson, /sources\/.+\/cam-remotion\.zip/)
  assert.match(charactersJson, /Sprite \+ CamSprite\.tsx/)
  const bundle = await readBackupBundle(zipBytes, 'sao-luu.zip')
  await restoreBackup(db, bundle.data, bundle.voices, bundle.sources)
  const again = await exportBackup(db)
  const restored = again.characters.find((item) => item.id === character.id)
  assert.equal(restored?.sourceFiles[0]?.filename, 'cam-remotion.zip')
  assert.equal(restored?.sourceFiles[0]?.note, 'Sprite + CamSprite.tsx')
  const saved = await getSourceFile(db, character.id, restored!.sourceFiles[0]!.id)
  assert.ok(saved)
  assert.deepEqual(Array.from(saved.bytes), Array.from(payload))
})
