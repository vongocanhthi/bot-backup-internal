import { randomUUID } from 'node:crypto'
import type { Db } from '../lib/db'
import { HttpError } from '../lib/http-error'
import { IMAGE_KINDS, type ImageKind } from '../lib/constants'
import { renderBotExport, type ExportCharacter } from '../lib/bot-export'
import { asInt, asIso, blank } from '../lib/rows'
import { isBotId } from '../lib/slug'
import { assertPublicHttpsUrl } from '../lib/urls'
import type { Bot, Character, CharacterImage } from '../lib/types'

function textField(value: unknown, field: string, max: number, required = true): string {
  if (typeof value !== 'string') throw new HttpError(`${field} không hợp lệ.`, 400)
  const text = value.trim()
  if (!text && required) throw new HttpError(`${field} là bắt buộc.`, 400)
  if (text.length > max) throw new HttpError(`${field} quá dài.`, 400)
  return text
}

function mapBot(row: Record<string, unknown>): Bot {
  return {
    id: String(row.id),
    name: String(row.name),
    title: String(row.title),
    prompt: String(row.prompt),
    createdAt: asIso(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: asIso(row.updated_at) ?? new Date(0).toISOString(),
  }
}

function mapImage(row: Record<string, unknown>): CharacterImage {
  return {
    id: String(row.id),
    characterId: String(row.character_id),
    kind: String(row.kind) as ImageKind,
    label: blank(row.label == null ? null : String(row.label)),
    url: String(row.url),
    createdAt: asIso(row.created_at) ?? new Date(0).toISOString(),
  }
}

export async function listBots(db: Db): Promise<Bot[]> {
  const result = await db.query(`SELECT * FROM bots ORDER BY name ASC`)
  return result.rows.map(mapBot)
}

export async function getBot(db: Db, id: string): Promise<Bot | null> {
  const result = await db.query(`SELECT * FROM bots WHERE id = $1`, [id])
  return result.rows[0] ? mapBot(result.rows[0]) : null
}

export async function createBot(
  db: Db,
  input: { id: string; name: string; title: string; prompt: string },
): Promise<Bot> {
  if (!isBotId(input.id)) throw new HttpError('Mã bot không hợp lệ.', 400)
  const name = textField(input.name, 'Tên', 160)
  const title = textField(input.title, 'Tiêu đề', 200)
  const prompt = textField(input.prompt, 'Nội dung', 200_000)
  try {
    await db.query(`INSERT INTO bots (id, name, title, prompt) VALUES ($1, $2, $3, $4)`, [
      input.id,
      name,
      title,
      prompt,
    ])
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === '23505') throw new HttpError('Mã bot đã tồn tại.', 400)
    throw error
  }
  const bot = await getBot(db, input.id)
  if (!bot) throw new HttpError('Không tạo được bot.', 500)
  return bot
}

export async function updateBot(
  db: Db,
  id: string,
  input: { name?: unknown; title?: unknown; prompt?: unknown },
): Promise<Bot> {
  const existing = await getBot(db, id)
  if (!existing) throw new HttpError('Không tìm thấy bot.', 404)
  const name = input.name === undefined ? existing.name : textField(input.name, 'Tên', 160)
  const title = input.title === undefined ? existing.title : textField(input.title, 'Tiêu đề', 200)
  const prompt = input.prompt === undefined ? existing.prompt : textField(input.prompt, 'Nội dung', 200_000)
  await db.query(
    `UPDATE bots SET name = $1, title = $2, prompt = $3, updated_at = now() WHERE id = $4`,
    [name, title, prompt, id],
  )
  const bot = await getBot(db, id)
  if (!bot || bot.id !== id) throw new HttpError('Mã bot bị đổi.', 500)
  return bot
}

export async function listCharacters(db: Db, botId?: string | null): Promise<Character[]> {
  const [characters, images] = await Promise.all([
    db.query(
      `SELECT * FROM characters
       WHERE ($1::text IS NULL OR bot_id = $1)
       ORDER BY sort_order ASC, name ASC`,
      [botId ?? null],
    ),
    db.query(`SELECT * FROM character_images ORDER BY created_at ASC`),
  ])
  const grouped = new Map<string, CharacterImage[]>()
  for (const row of images.rows) {
    const image = mapImage(row)
    const list = grouped.get(image.characterId) ?? []
    list.push(image)
    grouped.set(image.characterId, list)
  }
  const kindOrder: Record<string, number> = { front: 1, full_body: 2, expression: 3, other: 4 }
  return characters.rows.map((row) => ({
    id: String(row.id),
    botId: String(row.bot_id),
    name: String(row.name),
    appearance: String(row.appearance),
    sortOrder: asInt(row.sort_order) ?? 0,
    images: (grouped.get(String(row.id)) ?? []).sort((a, b) => (kindOrder[a.kind] ?? 9) - (kindOrder[b.kind] ?? 9)),
  }))
}

export async function getCharacter(db: Db, id: string): Promise<Character | null> {
  const all = await listCharacters(db)
  return all.find((character) => character.id === id) ?? null
}

export async function createCharacter(
  db: Db,
  input: { botId: string; name: string; appearance: string },
): Promise<Character> {
  const bot = await getBot(db, input.botId)
  if (!bot) throw new HttpError('Không tìm thấy bot.', 404)
  const name = textField(input.name, 'Tên nhân vật', 120)
  const appearance = textField(input.appearance, 'Mô tả ngoại hình', 8000)
  const count = await db.query<{ n: number | string }>(
    `SELECT count(*) AS n FROM characters WHERE bot_id = $1`,
    [input.botId],
  )
  const id = randomUUID()
  await db.query(
    `INSERT INTO characters (id, bot_id, name, appearance, sort_order) VALUES ($1, $2, $3, $4, $5)`,
    [id, input.botId, name, appearance, Number(count.rows[0]?.n ?? 0)],
  )
  const created = await getCharacter(db, id)
  if (!created) throw new HttpError('Không tạo được nhân vật.', 500)
  return created
}

export async function updateCharacter(
  db: Db,
  id: string,
  input: { name?: unknown; appearance?: unknown },
): Promise<Character> {
  const existing = await getCharacter(db, id)
  if (!existing) throw new HttpError('Không tìm thấy nhân vật.', 404)
  const name = input.name === undefined ? existing.name : textField(input.name, 'Tên nhân vật', 120)
  const appearance =
    input.appearance === undefined ? existing.appearance : textField(input.appearance, 'Mô tả ngoại hình', 8000)
  await db.query(`UPDATE characters SET name = $1, appearance = $2, updated_at = now() WHERE id = $3`, [
    name,
    appearance,
    id,
  ])
  const updated = await getCharacter(db, id)
  if (!updated) throw new HttpError('Không tìm thấy nhân vật.', 404)
  return updated
}

export async function deleteCharacter(db: Db, id: string) {
  const existing = await getCharacter(db, id)
  if (!existing) throw new HttpError('Không tìm thấy nhân vật.', 404)
  await db.query(`DELETE FROM characters WHERE id = $1`, [id])
}

export async function addCharacterImage(
  db: Db,
  characterId: string,
  input: { kind: string; label: string | null; url: string },
): Promise<CharacterImage> {
  const character = await getCharacter(db, characterId)
  if (!character) throw new HttpError('Không tìm thấy nhân vật.', 404)
  if (!IMAGE_KINDS.includes(input.kind as ImageKind)) throw new HttpError('Loại ảnh không hợp lệ.', 400)
  const url = assertPublicHttpsUrl(input.url)
  const label = input.label?.trim() || null
  if (label && label.length > 80) throw new HttpError('Nhãn ảnh quá dài.', 400)
  const id = randomUUID()
  await db.query(
    `INSERT INTO character_images (id, character_id, kind, label, url) VALUES ($1, $2, $3, $4, $5)`,
    [id, characterId, input.kind, label, url],
  )
  const saved = await getCharacter(db, characterId)
  const image = saved?.images.find((item) => item.id === id)
  if (!image) throw new HttpError('Không lưu được ảnh.', 500)
  return image
}

export async function deleteCharacterImage(db: Db, id: string) {
  const found = await db.query(`SELECT id FROM character_images WHERE id = $1`, [id])
  if (found.rows.length === 0) throw new HttpError('Không tìm thấy ảnh.', 404)
  await db.query(`DELETE FROM character_images WHERE id = $1`, [id])
}

export async function botExportText(db: Db, id: string): Promise<{ bot: Bot; text: string; characters: Character[] }> {
  const [bot, characters] = await Promise.all([getBot(db, id), listCharacters(db, id)])
  if (!bot) throw new HttpError('Không tìm thấy bot.', 404)
  const exportCharacters: ExportCharacter[] = characters.map((character) => ({
    name: character.name,
    appearance: character.appearance,
    images: character.images.map((image) => ({ kind: image.kind, label: image.label, url: image.url })),
  }))
  return { bot, text: renderBotExport(bot, exportCharacters), characters }
}
