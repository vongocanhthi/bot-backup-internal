import JSZip from 'jszip'
import type { Db } from '../lib/db'
import { HttpError } from '../lib/http-error'
import { BACKUP_FORMAT, BACKUP_VERSION, BUFFER_CONNECTIONS, IMAGE_KINDS, PLATFORMS, POSTING_SERVICES, type ImageKind } from '../lib/constants'
import { asBool, asInt, asIso, blank } from '../lib/rows'
import { isBotId, isChannelCode } from '../lib/slug'
import { assertPublicHttpsUrl } from '../lib/urls'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type BackupChannel = {
  id: string
  code: string
  name: string
  platform: string | null
  postingService: string | null
  connectionLabel: string | null
  externalId: string | null
  platformExternalId: string | null
  externalUrl: string | null
  orgId: string | null
  notes: string | null
  botId: string | null
  active: boolean
}

type BackupSlot = { id: string; channelCode: string; weekday: number | null; timeLocal: string; label: string | null }
type BackupSnapshot = { id: string; importedAt: string; source: string; label: string | null; importedByEmail: string | null }
type BackupPost = {
  id: string
  snapshotId: string
  channelCode: string | null
  externalId: string | null
  title: string | null
  body: string | null
  status: string | null
  scheduledAt: string | null
  publishedAt: string | null
  platform: string | null
  service: string | null
  raw: unknown
}
type BackupBot = { id: string; name: string; title: string; prompt: string }
type BackupCharacter = { id: string; botId: string; name: string; appearance: string; sortOrder: number }
type BackupImage = { id: string; characterId: string; kind: ImageKind; label: string | null; url: string }

export type BackupData = {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  channels: BackupChannel[]
  slots: BackupSlot[]
  snapshots: BackupSnapshot[]
  posts: BackupPost[]
  bots: BackupBot[]
  characters: BackupCharacter[]
  characterImages: BackupImage[]
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(`${field} không hợp lệ.`, 400)
  return value as Record<string, unknown>
}

function arrayOf(value: unknown, field: string, max: number): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new HttpError(`${field} phải là mảng.`, 400)
  if (value.length > max) throw new HttpError(`${field} quá dài.`, 400)
  return value.map((item, index) => record(item, `${field}[${index}]`))
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') throw new HttpError(`${field} không hợp lệ.`, 400)
  const trimmed = value.trim()
  if (!trimmed) throw new HttpError(`${field} là bắt buộc.`, 400)
  if (trimmed.length > max) throw new HttpError(`${field} quá dài.`, 400)
  return trimmed
}

function optional(value: unknown, field: string, max: number): string | null {
  if (value == null || value === '') return null
  return text(value, field, max)
}

function oneOf(value: unknown, allowed: readonly string[], field: string): string | null {
  const item = optional(value, field, 80)
  if (!item) return null
  if (!allowed.includes(item)) throw new HttpError(`${field} không hợp lệ.`, 400)
  return item
}

function uuid(value: unknown, field: string): string {
  const id = text(value, field, 80)
  if (!UUID.test(id)) throw new HttpError(`${field} không hợp lệ.`, 400)
  return id
}

function iso(value: unknown, field: string): string {
  const raw = text(value, field, 80)
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) throw new HttpError(`${field} không hợp lệ.`, 400)
  return date.toISOString()
}

function optionalIso(value: unknown, field: string): string | null {
  if (value == null || value === '') return null
  return iso(value, field)
}

export function parseBackup(value: unknown): BackupData {
  const data = record(value, 'Bản sao lưu')
  if (data.format !== BACKUP_FORMAT || data.version !== BACKUP_VERSION) {
    throw new HttpError('Định dạng bản sao lưu không được hỗ trợ.', 400)
  }
  const channels = arrayOf(data.channels, 'channels', 500).map((item, index) => {
    const code = text(item.code, `channels[${index}].code`, 48)
    if (!isChannelCode(code)) throw new HttpError(`Mã kênh ${code} không hợp lệ.`, 400)
    const botId = optional(item.botId, `channels[${index}].botId`, 80)
    if (botId && !isBotId(botId)) throw new HttpError('Mã bot trong kênh không hợp lệ.', 400)
    const url = optional(item.externalUrl, `channels[${index}].externalUrl`, 500)
    if (url && !url.startsWith('https://')) throw new HttpError('URL kênh phải là https.', 400)
    return {
      id: uuid(item.id, `channels[${index}].id`),
      code,
      name: text(item.name, `channels[${index}].name`, 160),
      platform: oneOf(item.platform, PLATFORMS, `channels[${index}].platform`),
      postingService: oneOf(item.postingService, POSTING_SERVICES, `channels[${index}].postingService`),
      connectionLabel: oneOf(item.connectionLabel, BUFFER_CONNECTIONS, `channels[${index}].connectionLabel`),
      externalId: optional(item.externalId, `channels[${index}].externalId`, 200),
      platformExternalId: optional(item.platformExternalId, `channels[${index}].platformExternalId`, 200),
      externalUrl: url,
      orgId: optional(item.orgId, `channels[${index}].orgId`, 120),
      notes: optional(item.notes, `channels[${index}].notes`, 4000),
      botId,
      active: item.active !== false,
    }
  })
  const codes = new Set<string>()
  for (const channel of channels) {
    if (codes.has(channel.code)) throw new HttpError(`Mã kênh ${channel.code} bị trùng.`, 400)
    codes.add(channel.code)
  }
  const bots = arrayOf(data.bots, 'bots', 500).map((item, index) => {
    const id = text(item.id, `bots[${index}].id`, 80)
    if (!isBotId(id)) throw new HttpError('Mã bot không hợp lệ.', 400)
    return {
      id,
      name: text(item.name, `bots[${index}].name`, 160),
      title: text(item.title, `bots[${index}].title`, 200),
      prompt: text(item.prompt, `bots[${index}].prompt`, 200_000),
    }
  })
  const botIds = new Set(bots.map((bot) => bot.id))
  for (const channel of channels) {
    if (channel.botId && !botIds.has(channel.botId)) throw new HttpError('Kênh trỏ tới bot không có trong bản sao lưu.', 400)
  }
  const snapshots = arrayOf(data.snapshots, 'snapshots', 2000).map((item, index) => ({
    id: uuid(item.id, `snapshots[${index}].id`),
    importedAt: iso(item.importedAt, `snapshots[${index}].importedAt`),
    source: text(item.source, `snapshots[${index}].source`, 40),
    label: optional(item.label, `snapshots[${index}].label`, 200),
    importedByEmail: optional(item.importedByEmail, `snapshots[${index}].importedByEmail`, 200),
  }))
  const snapshotIds = new Set(snapshots.map((item) => item.id))
  const slots = arrayOf(data.slots, 'slots', 5000).map((item, index) => {
    const channelCode = text(item.channelCode, `slots[${index}].channelCode`, 48)
    if (!codes.has(channelCode)) throw new HttpError('Slot trỏ tới kênh không có trong bản sao lưu.', 400)
    const weekday = item.weekday == null || item.weekday === '' ? null : Number(item.weekday)
    if (weekday != null && (!Number.isInteger(weekday) || weekday < 1 || weekday > 7)) {
      throw new HttpError('Thứ của slot không hợp lệ.', 400)
    }
    const timeLocal = text(item.timeLocal, `slots[${index}].timeLocal`, 5)
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeLocal)) throw new HttpError('Giờ slot không hợp lệ.', 400)
    return {
      id: uuid(item.id, `slots[${index}].id`),
      channelCode,
      weekday,
      timeLocal,
      label: optional(item.label, `slots[${index}].label`, 200),
    }
  })
  const posts = arrayOf(data.posts, 'posts', 20_000).map((item, index) => {
    const snapshotId = uuid(item.snapshotId, `posts[${index}].snapshotId`)
    if (!snapshotIds.has(snapshotId)) throw new HttpError('Bài trỏ tới snapshot không có trong bản sao lưu.', 400)
    const channelCode = optional(item.channelCode, `posts[${index}].channelCode`, 80)
    return {
      id: uuid(item.id, `posts[${index}].id`),
      snapshotId,
      channelCode,
      externalId: optional(item.externalId, `posts[${index}].externalId`, 200),
      title: optional(item.title, `posts[${index}].title`, 500),
      body: optional(item.body, `posts[${index}].body`, 20_000),
      status: optional(item.status, `posts[${index}].status`, 40),
      scheduledAt: optionalIso(item.scheduledAt, `posts[${index}].scheduledAt`),
      publishedAt: optionalIso(item.publishedAt, `posts[${index}].publishedAt`),
      platform: optional(item.platform, `posts[${index}].platform`, 40),
      service: optional(item.service, `posts[${index}].service`, 40),
      raw: item.raw ?? null,
    }
  })
  const characters = arrayOf(data.characters, 'characters', 2000).map((item, index) => {
    const botId = text(item.botId, `characters[${index}].botId`, 80)
    if (!botIds.has(botId)) throw new HttpError('Nhân vật trỏ tới bot không có trong bản sao lưu.', 400)
    return {
      id: uuid(item.id, `characters[${index}].id`),
      botId,
      name: text(item.name, `characters[${index}].name`, 120),
      appearance: text(item.appearance, `characters[${index}].appearance`, 8000),
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : 0,
    }
  })
  const characterIds = new Set(characters.map((item) => item.id))
  const characterImages = arrayOf(data.characterImages, 'characterImages', 5000).map((item, index) => {
    const characterId = uuid(item.characterId, `characterImages[${index}].characterId`)
    if (!characterIds.has(characterId)) throw new HttpError('Ảnh trỏ tới nhân vật không có trong bản sao lưu.', 400)
    const kind = text(item.kind, `characterImages[${index}].kind`, 40)
    if (!IMAGE_KINDS.includes(kind as ImageKind)) throw new HttpError('Loại ảnh không hợp lệ.', 400)
    return {
      id: uuid(item.id, `characterImages[${index}].id`),
      characterId,
      kind: kind as ImageKind,
      label: optional(item.label, `characterImages[${index}].label`, 80),
      url: assertPublicHttpsUrl(text(item.url, `characterImages[${index}].url`, 2000)),
    }
  })
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    channels,
    slots,
    snapshots,
    posts,
    bots,
    characters,
    characterImages,
  }
}

export async function exportBackup(db: Db): Promise<BackupData> {
  const [channels, slots, snapshots, posts, bots, characters, images] = await Promise.all([
    db.query(`SELECT * FROM channels ORDER BY code ASC`),
    db.query(
      `SELECT s.id, s.weekday, s.time_local, s.label, c.code AS channel_code
       FROM weekly_slots s JOIN channels c ON c.id = s.channel_id
       ORDER BY c.code ASC, s.time_local ASC`,
    ),
    db.query(`SELECT * FROM snapshots ORDER BY imported_at ASC`),
    db.query(`SELECT * FROM posts ORDER BY created_at ASC`),
    db.query(`SELECT * FROM bots ORDER BY id ASC`),
    db.query(`SELECT * FROM characters ORDER BY sort_order ASC, name ASC`),
    db.query(`SELECT * FROM character_images ORDER BY created_at ASC`),
  ])
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    channels: channels.rows.map((row) => ({
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      platform: blank(row.platform == null ? null : String(row.platform)),
      postingService: blank(row.posting_service == null ? null : String(row.posting_service)),
      connectionLabel: blank(row.connection_label == null ? null : String(row.connection_label)),
      externalId: blank(row.external_id == null ? null : String(row.external_id)),
      platformExternalId: blank(row.platform_external_id == null ? null : String(row.platform_external_id)),
      externalUrl: blank(row.external_url == null ? null : String(row.external_url)),
      orgId: blank(row.org_id == null ? null : String(row.org_id)),
      notes: blank(row.notes == null ? null : String(row.notes)),
      botId: blank(row.bot_id == null ? null : String(row.bot_id)),
      active: asBool(row.active),
    })),
    slots: slots.rows.map((row) => ({
      id: String(row.id),
      channelCode: String(row.channel_code),
      weekday: asInt(row.weekday),
      timeLocal: String(row.time_local),
      label: blank(row.label == null ? null : String(row.label)),
    })),
    snapshots: snapshots.rows.map((row) => ({
      id: String(row.id),
      importedAt: asIso(row.imported_at) ?? new Date(0).toISOString(),
      source: String(row.source),
      label: blank(row.label == null ? null : String(row.label)),
      importedByEmail: blank(row.imported_by_email == null ? null : String(row.imported_by_email)),
    })),
    posts: posts.rows.map((row) => ({
      id: String(row.id),
      snapshotId: String(row.snapshot_id),
      channelCode: blank(row.channel_code == null ? null : String(row.channel_code)),
      externalId: blank(row.external_id == null ? null : String(row.external_id)),
      title: blank(row.title == null ? null : String(row.title)),
      body: blank(row.body == null ? null : String(row.body)),
      status: blank(row.status == null ? null : String(row.status)),
      scheduledAt: asIso(row.scheduled_at),
      publishedAt: asIso(row.published_at),
      platform: blank(row.platform == null ? null : String(row.platform)),
      service: blank(row.service == null ? null : String(row.service)),
      raw: row.raw ?? null,
    })),
    bots: bots.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      title: String(row.title),
      prompt: String(row.prompt),
    })),
    characters: characters.rows.map((row) => ({
      id: String(row.id),
      botId: String(row.bot_id),
      name: String(row.name),
      appearance: String(row.appearance),
      sortOrder: asInt(row.sort_order) ?? 0,
    })),
    characterImages: images.rows.map((row) => ({
      id: String(row.id),
      characterId: String(row.character_id),
      kind: String(row.kind) as ImageKind,
      label: blank(row.label == null ? null : String(row.label)),
      url: String(row.url),
    })),
  }
}

export async function backupZip(db: Db): Promise<Uint8Array> {
  const data = await exportBackup(db)
  const zip = new JSZip()
  zip.file('data.json', JSON.stringify(data, null, 2))
  zip.file(
    'README.txt',
    [
      'Bản sao lưu Quản lý lịch kênh (nội bộ).',
      'Không gồm mật khẩu, phiên đăng nhập hay mã nhập snapshot.',
      'Bài đăng là snapshot đã nhập, không phải dữ liệu thời gian thực.',
      'Khôi phục thay thế kênh, slot, snapshot, bot và nhân vật. Không đổi tài khoản quản trị.',
      '',
    ].join('\n'),
  )
  return zip.generateAsync({ type: 'uint8array' })
}

export async function restoreBackup(db: Db, value: unknown) {
  const data = parseBackup(value)
  await db.transaction(async (tx) => {
    await tx.query(`DELETE FROM character_images`)
    await tx.query(`DELETE FROM characters`)
    await tx.query(`DELETE FROM posts`)
    await tx.query(`DELETE FROM snapshots`)
    await tx.query(`DELETE FROM weekly_slots`)
    await tx.query(`DELETE FROM channels`)
    await tx.query(`DELETE FROM bots`)
    for (const bot of data.bots) {
      await tx.query(`INSERT INTO bots (id, name, title, prompt) VALUES ($1, $2, $3, $4)`, [
        bot.id,
        bot.name,
        bot.title,
        bot.prompt,
      ])
    }
    const channelIds = new Map<string, string>()
    for (const channel of data.channels) {
      await tx.query(
        `INSERT INTO channels (
          id, code, name, platform, posting_service, connection_label, external_id,
          platform_external_id, external_url, org_id, notes, bot_id, active
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          channel.id,
          channel.code,
          channel.name,
          channel.platform,
          channel.postingService,
          channel.connectionLabel,
          channel.externalId,
          channel.platformExternalId,
          channel.externalUrl,
          channel.orgId,
          channel.notes,
          channel.botId,
          channel.active,
        ],
      )
      channelIds.set(channel.code, channel.id)
    }
    for (const slot of data.slots) {
      await tx.query(
        `INSERT INTO weekly_slots (id, channel_id, weekday, time_local, label) VALUES ($1, $2, $3, $4, $5)`,
        [slot.id, channelIds.get(slot.channelCode), slot.weekday, slot.timeLocal, slot.label],
      )
    }
    for (const snapshot of data.snapshots) {
      await tx.query(
        `INSERT INTO snapshots (id, imported_at, source, label, imported_by, imported_by_email)
         VALUES ($1, $2, $3, $4, NULL, $5)`,
        [snapshot.id, snapshot.importedAt, snapshot.source, snapshot.label, snapshot.importedByEmail],
      )
    }
    for (const post of data.posts) {
      await tx.query(
        `INSERT INTO posts (
          id, snapshot_id, channel_code, channel_id, external_id, title, body, status,
          scheduled_at, published_at, platform, service, raw
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)`,
        [
          post.id,
          post.snapshotId,
          post.channelCode,
          post.channelCode ? (channelIds.get(post.channelCode) ?? null) : null,
          post.externalId,
          post.title,
          post.body,
          post.status,
          post.scheduledAt,
          post.publishedAt,
          post.platform,
          post.service,
          post.raw == null ? null : JSON.stringify(post.raw),
        ],
      )
    }
    for (const character of data.characters) {
      await tx.query(
        `INSERT INTO characters (id, bot_id, name, appearance, sort_order) VALUES ($1, $2, $3, $4, $5)`,
        [character.id, character.botId, character.name, character.appearance, character.sortOrder],
      )
    }
    for (const image of data.characterImages) {
      await tx.query(
        `INSERT INTO character_images (id, character_id, kind, label, url) VALUES ($1, $2, $3, $4, $5)`,
        [image.id, image.characterId, image.kind, image.label, image.url],
      )
    }
  })
  return { channels: data.channels.length, bots: data.bots.length, posts: data.posts.length }
}

export async function readBackupFile(bytes: Uint8Array, filename: string): Promise<unknown> {
  if (bytes.byteLength > 4_000_000) throw new HttpError('Tệp lớn hơn 4 MB.', 400)
  if (filename.toLowerCase().endsWith('.zip')) {
    const zip = await JSZip.loadAsync(bytes)
    const entry = zip.file('data.json')
    if (!entry) throw new HttpError('Zip thiếu data.json.', 400)
    const text = await entry.async('string')
    return JSON.parse(text) as unknown
  }
  try {
    return JSON.parse(Buffer.from(bytes).toString('utf8')) as unknown
  } catch {
    throw new HttpError('Không đọc được JSON.', 400)
  }
}
