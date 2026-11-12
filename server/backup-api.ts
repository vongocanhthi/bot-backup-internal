import type { Db } from '../lib/db'
import { botBackupColumnsUnavailable, isMissingBotBackupColumns } from '../lib/api-key-errors'
import { HttpError } from '../lib/http-error'
import { IMAGE_KINDS, type ImageKind } from '../lib/constants'
import { assertNoSecrets } from '../lib/secret-scan'
import { isBotId } from '../lib/slug'
import { describeBackupVoice } from '../lib/voice'
import { assertPublicHttpsUrl } from '../lib/urls'
import { addCharacterImage, createCharacter, getCharacter, saveSourceFile, saveVoiceSample, updateCharacter } from './content'
import { assertKeyBot, type BackupKey } from './api-keys'

function text(value: unknown, field: string, max: number, required = true): string {
  if (typeof value !== 'string') throw new HttpError(`${field} không hợp lệ.`, 400)
  const trimmed = value.trim()
  if (!trimmed && required) throw new HttpError(`${field} là bắt buộc.`, 400)
  if (trimmed.length > max) throw new HttpError(`${field} quá dài.`, 400)
  return trimmed
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError('JSON không hợp lệ.', 400)
  return value as Record<string, unknown>
}

export async function upsertBackupBot(db: Db, key: BackupKey, body: unknown) {
  const input = record(body)
  const idValue = input.id ?? input.code
  const id = text(idValue, 'Mã bot', 80)
  if (!isBotId(id)) throw new HttpError('Mã bot không hợp lệ.', 400)
  assertKeyBot(key, id)
  const name = text(input.name, 'Tên', 160)
  const title = text(input.title, 'Tiêu đề', 200)
  const prompt = text(input.prompt, 'Nội dung', 200_000)
  const notes = input.notes == null || input.notes === '' ? null : text(input.notes, 'Ghi chú', 8000, false)
  const settings = input.settings == null ? {} : input.settings
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new HttpError('settings phải là object JSON.', 400)
  const settingsJson = JSON.stringify(settings)
  if (settingsJson.length > 20_000) throw new HttpError('settings quá dài.', 400)
  assertNoSecrets([name, title, prompt, notes ?? '', settingsJson].join('\n'))
  try {
    await db.query(
      `INSERT INTO bots (id, name, title, prompt, settings, notes)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         title = EXCLUDED.title,
         prompt = EXCLUDED.prompt,
         settings = EXCLUDED.settings,
         notes = EXCLUDED.notes,
         updated_at = now()`,
      [id, name, title, prompt, settingsJson, notes],
    )
  } catch (error) {
    if (isMissingBotBackupColumns(error)) throw botBackupColumnsUnavailable()
    throw error
  }
  return { id, name, title }
}

export async function upsertBackupCharacter(db: Db, key: BackupKey, body: unknown) {
  const input = record(body)
  const botId = text(input.botId, 'Mã bot', 80)
  if (!isBotId(botId)) throw new HttpError('Mã bot không hợp lệ.', 400)
  assertKeyBot(key, botId)
  const name = text(input.name, 'Tên nhân vật', 120)
  const appearance = text(input.appearance, 'Mô tả ngoại hình', 8000)
  const voiceText = ['voiceName', 'voiceProvider', 'voiceAge', 'voiceSpeed', 'voicePitch', 'voiceStyle', 'voiceSampleLine', 'voiceGender', 'voiceAccent']
    .map((field) => (typeof input[field] === 'string' ? input[field] : ''))
    .join('\n')
  assertNoSecrets([name, appearance, voiceText].join('\n'))
  const found = await db.query(
    `SELECT id FROM characters WHERE bot_id = $1 AND name = $2 ORDER BY created_at ASC LIMIT 1`,
    [botId, name],
  )
  const voice = {
    voiceName: input.voiceName,
    voiceProvider: input.voiceProvider,
    voiceGender: input.voiceGender,
    voiceAge: input.voiceAge,
    voiceAccent: input.voiceAccent,
    voiceSpeed: input.voiceSpeed,
    voicePitch: input.voicePitch,
    voiceStyle: input.voiceStyle,
    voiceSampleLine: input.voiceSampleLine,
  }
  if (found.rows.length === 0) {
    const created = await createCharacter(db, { botId, name, appearance })
    const updated = await updateCharacter(db, created.id, voice)
    return { id: updated.id, botId: updated.botId, name: updated.name }
  }
  const updated = await updateCharacter(db, String(found.rows[0]?.id), { name, appearance, ...voice })
  return { id: updated.id, botId: updated.botId, name: updated.name }
}

export async function addBackupImageUrl(db: Db, key: BackupKey, characterId: string, body: unknown) {
  const character = await requireCharacter(db, key, characterId)
  const input = record(body)
  const kind = text(input.kind, 'Loại ảnh', 40)
  if (!IMAGE_KINDS.includes(kind as ImageKind)) throw new HttpError('Loại ảnh không hợp lệ.', 400)
  const url = text(input.url, 'URL ảnh', 2000)
  assertNoSecrets(url)
  const label = input.label == null || input.label === '' ? null : text(input.label, 'Nhãn ảnh', 80, false)
  const image = await addCharacterImage(db, character.id, { kind, label, url: assertPublicHttpsUrl(url) })
  return { id: image.id, characterId: character.id, kind: image.kind, url: image.url }
}

export async function addBackupImageFile(
  db: Db,
  key: BackupKey,
  characterId: string,
  file: { filename: string; contentType: string; bytes: Uint8Array },
  kind: string,
  label: string | null,
  upload: (bytes: Buffer) => Promise<string>,
) {
  const character = await requireCharacter(db, key, characterId)
  if (!IMAGE_KINDS.includes(kind as ImageKind)) throw new HttpError('Loại ảnh không hợp lệ.', 400)
  const types = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
  if (!types.has(file.contentType)) throw new HttpError('Chỉ nhận PNG, JPEG, WEBP hoặc GIF.', 400)
  if (file.bytes.byteLength <= 0 || file.bytes.byteLength > 4 * 1024 * 1024) throw new HttpError('Ảnh phải lớn hơn 0 và không quá 4 MB.', 400)
  const url = await upload(Buffer.from(file.bytes))
  const image = await addCharacterImage(db, character.id, { kind, label, url })
  return { id: image.id, characterId: character.id, kind: image.kind, url: image.url }
}

export async function saveBackupVoice(
  db: Db,
  key: BackupKey,
  characterId: string,
  file: { filename: string; contentType: string; bytes: Uint8Array },
) {
  const character = await requireCharacter(db, key, characterId)
  const described = describeBackupVoice(file.filename, file.contentType, file.bytes.byteLength)
  await saveVoiceSample(db, character.id, { filename: described.filename, contentType: described.contentType, bytes: file.bytes })
  return { characterId: character.id, filename: described.filename, byteSize: file.bytes.byteLength }
}

export async function saveBackupSource(
  db: Db,
  key: BackupKey,
  characterId: string,
  file: { filename: string; contentType: string; bytes: Uint8Array; note: string | null },
) {
  const character = await requireCharacter(db, key, characterId)
  const ext = file.filename.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'json' || ext === 'txt' || ext === 'md') assertNoSecrets(Buffer.from(file.bytes).toString('utf8'))
  await saveSourceFile(db, character.id, file, { replace: true })
  return { characterId: character.id }
}

async function requireCharacter(db: Db, key: BackupKey, characterId: string) {
  const character = await getCharacter(db, characterId)
  if (!character) throw new HttpError('Không tìm thấy nhân vật.', 404)
  assertKeyBot(key, character.botId)
  return character
}
