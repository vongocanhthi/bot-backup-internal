import { randomUUID } from 'node:crypto'
import type { Db } from '../lib/db'
import { HttpError } from '../lib/http-error'
import { asInt, asIso, blank } from '../lib/rows'
import type { PostItem, SnapshotMeta } from '../lib/types'

export type IncomingPost = {
  channelCode?: unknown
  externalId?: unknown
  title?: unknown
  body?: unknown
  status?: unknown
  scheduledAt?: unknown
  publishedAt?: unknown
  platform?: unknown
  service?: unknown
  raw?: unknown
}

function optionalString(value: unknown, field: string, max: number): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new HttpError(`${field} không hợp lệ.`, 400)
  const text = value.trim()
  if (!text) return null
  if (text.length > max) throw new HttpError(`${field} quá dài.`, 400)
  return text
}

function optionalDate(value: unknown, field: string): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new HttpError(`${field} không hợp lệ.`, 400)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new HttpError(`${field} không hợp lệ.`, 400)
  return date.toISOString()
}

export function parseSnapshotPayload(value: unknown): { label: string | null; posts: IncomingPost[] } {
  if (!value || typeof value !== 'object') throw new HttpError('Snapshot phải là JSON.', 400)
  const record = value as Record<string, unknown>
  const posts = record.posts
  if (!Array.isArray(posts)) throw new HttpError('Thiếu mảng posts.', 400)
  if (posts.length > 5000) throw new HttpError('Snapshot có quá nhiều bài.', 400)
  const label = optionalString(record.label, 'Nhãn snapshot', 200)
  return { label, posts: posts as IncomingPost[] }
}

export async function listSnapshots(db: Db): Promise<SnapshotMeta[]> {
  const result = await db.query(
    `SELECT s.id, s.imported_at, s.source, s.label, s.imported_by_email,
            (SELECT count(*) FROM posts p WHERE p.snapshot_id = s.id) AS post_count
     FROM snapshots s
     ORDER BY s.imported_at DESC
     LIMIT 100`,
  )
  return result.rows.map((row) => ({
    id: String(row.id),
    importedAt: asIso(row.imported_at) ?? new Date(0).toISOString(),
    source: String(row.source),
    label: blank(row.label == null ? null : String(row.label)),
    importedByEmail: blank(row.imported_by_email == null ? null : String(row.imported_by_email)),
    postCount: asInt(row.post_count) ?? 0,
  }))
}

export async function listPosts(db: Db, snapshotId: string): Promise<PostItem[]> {
  const result = await db.query(
    `SELECT p.*, c.name AS channel_name
     FROM posts p
     LEFT JOIN channels c ON c.id = p.channel_id
     WHERE p.snapshot_id = $1`,
    [snapshotId],
  )
  return result.rows.map((row) => ({
    id: String(row.id),
    snapshotId: String(row.snapshot_id),
    channelCode: blank(row.channel_code == null ? null : String(row.channel_code)),
    channelName: blank(row.channel_name == null ? null : String(row.channel_name)),
    externalId: blank(row.external_id == null ? null : String(row.external_id)),
    title: blank(row.title == null ? null : String(row.title)),
    body: blank(row.body == null ? null : String(row.body)),
    status: blank(row.status == null ? null : String(row.status)),
    scheduledAt: asIso(row.scheduled_at),
    publishedAt: asIso(row.published_at),
    platform: blank(row.platform == null ? null : String(row.platform)),
    service: blank(row.service == null ? null : String(row.service)),
  }))
}

export async function ingestSnapshot(
  db: Db,
  input: {
    payload: unknown
    source: 'upload' | 'api'
    importedBy: { id: string; email: string } | null
  },
): Promise<SnapshotMeta> {
  const parsed = parseSnapshotPayload(input.payload)
  const snapshotId = randomUUID()
  const importedAt = new Date().toISOString()
  await db.transaction(async (tx) => {
    await tx.query(
      `INSERT INTO snapshots (id, imported_at, source, label, imported_by, imported_by_email)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [snapshotId, importedAt, input.source, parsed.label, input.importedBy?.id ?? null, input.importedBy?.email ?? null],
    )
    for (const post of parsed.posts) {
      const channelCode = optionalString(post.channelCode, 'Mã kênh', 80)?.toLowerCase() ?? null
      let channelId: string | null = null
      if (channelCode) {
        const channel = await tx.query<{ id: string }>(`SELECT id FROM channels WHERE code = $1`, [channelCode])
        channelId = channel.rows[0]?.id ?? null
      }
      const raw = post.raw === undefined ? post : post.raw
      await tx.query(
        `INSERT INTO posts (
          id, snapshot_id, channel_code, channel_id, external_id, title, body, status,
          scheduled_at, published_at, platform, service, raw
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)`,
        [
          randomUUID(),
          snapshotId,
          channelCode,
          channelId,
          optionalString(post.externalId, 'ID bài', 200),
          optionalString(post.title, 'Tiêu đề', 500),
          optionalString(post.body, 'Nội dung', 20_000),
          optionalString(post.status, 'Trạng thái', 40),
          optionalDate(post.scheduledAt, 'Giờ lên lịch'),
          optionalDate(post.publishedAt, 'Giờ đăng'),
          optionalString(post.platform, 'Nền tảng', 40),
          optionalString(post.service, 'Dịch vụ', 40),
          raw == null ? null : JSON.stringify(raw),
        ],
      )
    }
  })
  const snapshots = await listSnapshots(db)
  const saved = snapshots.find((item) => item.id === snapshotId)
  if (!saved) throw new HttpError('Không lưu được snapshot.', 500)
  return saved
}
