import { randomUUID } from 'node:crypto'
import type { Db } from '../lib/db'
import { HttpError } from '../lib/http-error'
import { BUFFER_CONNECTIONS, PLATFORMS, POSTING_SERVICES } from '../lib/constants'
import { asBool, asIso, asInt, blank } from '../lib/rows'
import { isBotId, isChannelCode, slugify } from '../lib/slug'
import type { Channel, Slot } from '../lib/types'

export type ChannelInput = {
  name?: unknown
  platform?: unknown
  postingService?: unknown
  connectionLabel?: unknown
  externalId?: unknown
  platformExternalId?: unknown
  externalUrl?: unknown
  orgId?: unknown
  notes?: unknown
  botId?: unknown
  active?: unknown
  code?: unknown
}

function mapChannel(row: Record<string, unknown>): Channel {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    platform: blank(asStringOrNull(row.platform)),
    postingService: blank(asStringOrNull(row.posting_service)),
    connectionLabel: blank(asStringOrNull(row.connection_label)),
    externalId: blank(asStringOrNull(row.external_id)),
    platformExternalId: blank(asStringOrNull(row.platform_external_id)),
    externalUrl: blank(asStringOrNull(row.external_url)),
    orgId: blank(asStringOrNull(row.org_id)),
    notes: blank(asStringOrNull(row.notes)),
    botId: blank(asStringOrNull(row.bot_id)),
    active: asBool(row.active),
    createdAt: asIso(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: asIso(row.updated_at) ?? new Date(0).toISOString(),
  }
}

function asStringOrNull(value: unknown): string | null {
  if (value == null) return null
  return String(value)
}

function choice(value: unknown, allowed: readonly string[], field: string): string | null {
  const text = blank(typeof value === 'string' ? value : value == null ? null : String(value))
  if (!text) return null
  if (!allowed.includes(text)) throw new HttpError(`${field} không hợp lệ.`, 400)
  return text
}

function optionalText(value: unknown, field: string, max: number): string | null {
  if (value == null) return null
  if (typeof value !== 'string') throw new HttpError(`${field} không hợp lệ.`, 400)
  const text = value.trim()
  if (!text) return null
  if (text.length > max) throw new HttpError(`${field} quá dài.`, 400)
  return text
}

function optionalUrl(value: unknown): string | null {
  const text = optionalText(value, 'URL', 500)
  if (!text) return null
  let url: URL
  try {
    url = new URL(text)
  } catch {
    throw new HttpError('URL không hợp lệ.', 400)
  }
  if (url.protocol !== 'https:') throw new HttpError('URL phải bắt đầu bằng https.', 400)
  return url.toString()
}

async function assertBot(db: Db, botId: string | null) {
  if (!botId) return
  if (!isBotId(botId)) throw new HttpError('Mã bot không hợp lệ.', 400)
  const found = await db.query(`SELECT id FROM bots WHERE id = $1`, [botId])
  if (found.rows.length === 0) throw new HttpError('Không tìm thấy bot.', 400)
}

function readChannelInput(input: ChannelInput) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name || name.length > 160) throw new HttpError('Tên kênh cần từ 1 đến 160 ký tự.', 400)
  return {
    name,
    platform: choice(input.platform, PLATFORMS, 'Nền tảng'),
    postingService: choice(input.postingService, POSTING_SERVICES, 'Dịch vụ đăng'),
    connectionLabel: choice(input.connectionLabel, BUFFER_CONNECTIONS, 'Kết nối Buffer'),
    externalId: optionalText(input.externalId, 'ID ngoài', 200),
    platformExternalId: optionalText(input.platformExternalId, 'ID nền tảng', 200),
    externalUrl: optionalUrl(input.externalUrl),
    orgId: optionalText(input.orgId, 'Org ID', 120),
    notes: optionalText(input.notes, 'Ghi chú', 4000),
    botId: optionalText(input.botId, 'Bot', 80),
    active: input.active !== false && input.active !== 'false',
  }
}

export async function listChannels(db: Db): Promise<Channel[]> {
  const result = await db.query(`SELECT * FROM channels ORDER BY active DESC, name ASC`)
  return result.rows.map(mapChannel)
}

export async function getChannelByCode(db: Db, code: string): Promise<Channel | null> {
  const result = await db.query(`SELECT * FROM channels WHERE code = $1`, [code])
  return result.rows[0] ? mapChannel(result.rows[0]) : null
}

async function uniqueCode(db: Db, base: string): Promise<string> {
  let code = base
  let n = 2
  while (await getChannelByCode(db, code)) {
    code = `${base}-${n}`
    n += 1
    if (n > 50) throw new HttpError('Không tạo được mã kênh.', 400)
  }
  return code
}

export async function createChannel(db: Db, input: ChannelInput): Promise<Channel> {
  const data = readChannelInput(input)
  await assertBot(db, data.botId)
  const requested = optionalText(input.code, 'Mã kênh', 48)
  let code: string
  if (requested) {
    if (!isChannelCode(requested)) throw new HttpError('Mã kênh chỉ gồm chữ thường, số và dấu gạch ngang.', 400)
    if (await getChannelByCode(db, requested)) throw new HttpError('Mã kênh đã tồn tại.', 400)
    code = requested
  } else {
    code = await uniqueCode(db, slugify(data.name))
  }
  const id = randomUUID()
  await db.query(
    `INSERT INTO channels (
      id, code, name, platform, posting_service, connection_label, external_id,
      platform_external_id, external_url, org_id, notes, bot_id, active
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      id,
      code,
      data.name,
      data.platform,
      data.postingService,
      data.connectionLabel,
      data.externalId,
      data.platformExternalId,
      data.externalUrl,
      data.orgId,
      data.notes,
      data.botId,
      data.active,
    ],
  )
  const created = await getChannelByCode(db, code)
  if (!created) throw new HttpError('Không tạo được kênh.', 500)
  return created
}

export async function updateChannel(db: Db, code: string, input: ChannelInput): Promise<Channel> {
  if (!isChannelCode(code)) throw new HttpError('Mã kênh không hợp lệ.', 400)
  const existing = await getChannelByCode(db, code)
  if (!existing) throw new HttpError('Không tìm thấy kênh.', 404)
  const data = readChannelInput({ ...existingToInput(existing), ...input, active: input.active ?? existing.active })
  await assertBot(db, data.botId)
  await db.query(
    `UPDATE channels SET
      name = $1,
      platform = $2,
      posting_service = $3,
      connection_label = $4,
      external_id = $5,
      platform_external_id = $6,
      external_url = $7,
      org_id = $8,
      notes = $9,
      bot_id = $10,
      active = $11,
      updated_at = now()
     WHERE code = $12`,
    [
      data.name,
      data.platform,
      data.postingService,
      data.connectionLabel,
      data.externalId,
      data.platformExternalId,
      data.externalUrl,
      data.orgId,
      data.notes,
      data.botId,
      data.active,
      code,
    ],
  )
  const updated = await getChannelByCode(db, code)
  if (!updated || updated.code !== code) throw new HttpError('Mã kênh bị đổi.', 500)
  return updated
}

function existingToInput(channel: Channel): ChannelInput {
  return {
    name: channel.name,
    platform: channel.platform,
    postingService: channel.postingService,
    connectionLabel: channel.connectionLabel,
    externalId: channel.externalId,
    platformExternalId: channel.platformExternalId,
    externalUrl: channel.externalUrl,
    orgId: channel.orgId,
    notes: channel.notes,
    botId: channel.botId,
    active: channel.active,
  }
}

function mapSlot(row: Record<string, unknown>): Slot {
  return {
    id: String(row.id),
    channelId: String(row.channel_id),
    channelCode: String(row.code),
    channelName: String(row.name),
    weekday: asInt(row.weekday),
    timeLocal: String(row.time_local),
    label: blank(asStringOrNull(row.label)),
  }
}

export async function listSlots(db: Db, channelCode?: string | null): Promise<Slot[]> {
  const result = await db.query(
    `SELECT s.id, s.channel_id, s.weekday, s.time_local, s.label, c.code, c.name
     FROM weekly_slots s
     JOIN channels c ON c.id = s.channel_id
     WHERE ($1::text IS NULL OR c.code = $1)
     ORDER BY c.name ASC, s.time_local ASC`,
    [channelCode ?? null],
  )
  return result.rows.map(mapSlot)
}

export async function createSlot(
  db: Db,
  input: { channelCode: string; weekday: number | null; timeLocal: string; label: string | null },
): Promise<Slot> {
  if (!isChannelCode(input.channelCode)) throw new HttpError('Mã kênh không hợp lệ.', 400)
  const channel = await getChannelByCode(db, input.channelCode)
  if (!channel) throw new HttpError('Không tìm thấy kênh.', 404)
  if (input.weekday != null && (input.weekday < 1 || input.weekday > 7)) {
    throw new HttpError('Thứ trong tuần không hợp lệ.', 400)
  }
  const timeMatch = input.timeLocal.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/)
  if (!timeMatch) {
    throw new HttpError('Giờ không hợp lệ.', 400)
  }
  const timeLocal = `${timeMatch[1]}:${timeMatch[2]}`
  const label = input.label?.trim() || null
  if (label && label.length > 200) throw new HttpError('Nhãn slot quá dài.', 400)
  const id = randomUUID()
  await db.query(
    `INSERT INTO weekly_slots (id, channel_id, weekday, time_local, label) VALUES ($1, $2, $3, $4, $5)`,
    [id, channel.id, input.weekday, timeLocal, label],
  )
  const slots = await listSlots(db, channel.code)
  const created = slots.find((slot) => slot.id === id)
  if (!created) throw new HttpError('Không tạo được slot.', 500)
  return created
}

export async function deleteSlot(db: Db, id: string) {
  const result = await db.query(`DELETE FROM weekly_slots WHERE id = $1`, [id])
  void result
  const check = await db.query(`SELECT id FROM weekly_slots WHERE id = $1`, [id])
  if (check.rows.length > 0) throw new HttpError('Không xóa được slot.', 500)
}
