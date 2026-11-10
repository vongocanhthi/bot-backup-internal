import { randomUUID } from 'node:crypto'
import type { Db } from '../lib/db'
import { HttpError } from '../lib/http-error'
import { IMPORT_TOKEN_PREFIX } from '../lib/constants'
import { asBool, asIso } from '../lib/rows'
import { randomToken, sha256 } from '../lib/security'
import type { ImportTokenMeta } from '../lib/types'

export async function listImportTokens(db: Db): Promise<ImportTokenMeta[]> {
  const result = await db.query(`SELECT * FROM import_tokens ORDER BY created_at DESC`)
  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    tokenPrefix: String(row.token_prefix),
    revoked: asBool(row.revoked),
    lastUsedAt: asIso(row.last_used_at),
    createdAt: asIso(row.created_at) ?? new Date(0).toISOString(),
  }))
}

export async function createImportToken(db: Db, input: { name: string; userId: string }) {
  const name = input.name.trim()
  if (!name || name.length > 80) throw new HttpError('Tên mã nhập cần từ 1 đến 80 ký tự.', 400)
  const active = await db.query<{ n: number | string }>(
    `SELECT count(*) AS n FROM import_tokens WHERE revoked = false`,
  )
  if (Number(active.rows[0]?.n ?? 0) >= 20) {
    throw new HttpError('Đã có quá nhiều mã còn hiệu lực. Hãy thu hồi bớt.', 400)
  }
  const token = `${IMPORT_TOKEN_PREFIX}${randomToken(32)}`
  const id = randomUUID()
  await db.query(
    `INSERT INTO import_tokens (id, name, token_hash, token_prefix, created_by) VALUES ($1, $2, $3, $4, $5)`,
    [id, name, sha256(token), token.slice(0, 16), input.userId],
  )
  return { id, token, tokenPrefix: token.slice(0, 16), name }
}

export async function revokeImportToken(db: Db, id: string) {
  const result = await db.query(`SELECT id FROM import_tokens WHERE id = $1`, [id])
  if (result.rows.length === 0) throw new HttpError('Không tìm thấy mã nhập.', 404)
  await db.query(`UPDATE import_tokens SET revoked = true WHERE id = $1`, [id])
}

export async function authenticateImportToken(db: Db, header: string | null): Promise<{ id: string; name: string }> {
  const match = header?.match(/^Bearer\s+(\S+)$/i)
  const token = match?.[1] ?? ''
  if (!token.startsWith(IMPORT_TOKEN_PREFIX)) throw new HttpError('Mã nhập không hợp lệ.', 401)
  const result = await db.query(
    `SELECT id, name, revoked FROM import_tokens WHERE token_hash = $1`,
    [sha256(token)],
  )
  const row = result.rows[0]
  if (!row || asBool(row.revoked)) throw new HttpError('Mã nhập không hợp lệ.', 401)
  await db.query(`UPDATE import_tokens SET last_used_at = now() WHERE id = $1`, [row.id])
  return { id: String(row.id), name: String(row.name) }
}
