import { randomUUID } from 'node:crypto'
import type { Db } from '../lib/db'
import { apiKeysUnavailable, isMissingApiKeysTable } from '../lib/api-key-errors'
import { HttpError } from '../lib/http-error'
import { asIso, blank } from '../lib/rows'
import type { ApiKeyRecord } from '../lib/types'
import { hitRateLimit } from '../lib/rate-limit'
import { isBotId } from '../lib/slug'
import { randomToken, sha256, tokensMatch } from '../lib/security'

export const API_KEY_PREFIX = 'bbk_'

export type BackupKey = {
  id: string
  name: string
  botId: string | null
}

function wrapKeysError(error: unknown): never {
  if (isMissingApiKeysTable(error)) throw apiKeysUnavailable()
  throw error
}

export async function listApiKeys(db: Db): Promise<ApiKeyRecord[]> {
  try {
    const result = await db.query(
      `SELECT id, name, key_prefix, scope, bot_id, created_at, last_used_at, revoked_at
       FROM api_keys
       ORDER BY created_at DESC`,
    )
    return result.rows.map(mapKey)
  } catch (error) {
    wrapKeysError(error)
  }
}

export async function createApiKey(db: Db, input: { name: string; botId: string | null; userId: string }) {
  const name = input.name.trim()
  if (!name || name.length > 80) throw new HttpError('Tên khóa cần từ 1 đến 80 ký tự.', 400)
  const botId = input.botId?.trim() || null
  if (botId && !isBotId(botId)) throw new HttpError('Mã bot không hợp lệ.', 400)
  if (botId) {
    const bot = await db.query(`SELECT id FROM bots WHERE id = $1`, [botId])
    if (bot.rows.length === 0) throw new HttpError('Không tìm thấy bot.', 404)
  }
  const key = `${API_KEY_PREFIX}${randomToken(32)}`
  const id = randomUUID()
  const prefix = key.slice(0, 8)
  try {
    await db.query(
      `INSERT INTO api_keys (id, name, key_prefix, key_hash, scope, bot_id, created_by)
       VALUES ($1, $2, $3, $4, 'backup', $5, $6)`,
      [id, name, prefix, sha256(key), botId, input.userId],
    )
  } catch (error) {
    wrapKeysError(error)
  }
  return { id, name, prefix, botId, key }
}

export async function revokeApiKey(db: Db, id: string) {
  try {
    const found = await db.query(`SELECT id, revoked_at FROM api_keys WHERE id = $1`, [id])
    if (found.rows.length === 0) throw new HttpError('Không tìm thấy khóa API.', 404)
    if (found.rows[0]?.revoked_at) return
    await db.query(`UPDATE api_keys SET revoked_at = now() WHERE id = $1`, [id])
  } catch (error) {
    if (error instanceof HttpError) throw error
    wrapKeysError(error)
  }
}

export async function authenticateBackupKey(db: Db, authorization: string | null, ip: string): Promise<BackupKey> {
  hitRateLimit(`backup-ip:${ip || 'local'}`)
  const match = authorization?.match(/^Bearer\s+(\S+)$/i)
  const presented = match?.[1] ?? ''
  const digest = sha256(presented || 'empty')
  if (!presented.startsWith(API_KEY_PREFIX)) {
    tokensMatch(digest, sha256('missing-backup-key'))
    throw new HttpError('Khóa API không hợp lệ.', 401)
  }
  let row: Record<string, unknown> | undefined
  try {
    const result = await db.query(
      `SELECT id, name, key_hash, scope, bot_id, revoked_at FROM api_keys WHERE key_hash = $1`,
      [digest],
    )
    row = result.rows[0]
  } catch (error) {
    wrapKeysError(error)
  }
  const stored = row ? String(row.key_hash) : sha256('missing-backup-key')
  const matches = tokensMatch(stored, digest)
  if (!row || !matches) throw new HttpError('Khóa API không hợp lệ.', 401)
  if (row.revoked_at) throw new HttpError('Khóa API đã bị thu hồi.', 401)
  if (String(row.scope) !== 'backup') throw new HttpError('Khóa API không có quyền sao lưu.', 403)
  const key = { id: String(row.id), name: String(row.name), botId: blank(row.bot_id == null ? null : String(row.bot_id)) }
  hitRateLimit(`backup-key:${key.id}`, 120)
  try {
    await db.query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [key.id])
  } catch (error) {
    wrapKeysError(error)
  }
  return key
}

export async function backupKeyFromRequest(db: Db, req: Request): Promise<BackupKey> {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return authenticateBackupKey(db, req.headers.get('authorization'), forwarded || 'local')
}

export function assertKeyBot(key: BackupKey, botId: string) {
  if (key.botId && key.botId !== botId) throw new HttpError('Khóa này chỉ được ghi bot đã gán.', 403)
}

function mapKey(row: Record<string, unknown>): ApiKeyRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    prefix: String(row.key_prefix),
    scope: String(row.scope),
    botId: blank(row.bot_id == null ? null : String(row.bot_id)),
    createdAt: asIso(row.created_at) ?? new Date(0).toISOString(),
    lastUsedAt: asIso(row.last_used_at),
    revokedAt: asIso(row.revoked_at),
  }
}
