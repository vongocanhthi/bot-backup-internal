import { randomUUID } from 'node:crypto'
import type { Db } from '../lib/db'
import { HttpError } from '../lib/http-error'
import {
  DEFAULT_BOOTSTRAP_EMAIL,
  LOGIN_EMAIL_LIMIT,
  LOGIN_IP_LIMIT,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  SESSION_HOURS,
} from '../lib/constants'
import { asBool, asIso } from '../lib/rows'
import { randomToken, sha256 } from '../lib/security'
import type { SessionContext, UserPublic } from '../lib/types'
import { dummyPasswordHash, hashPassword, verifyPassword } from './password'

type UserRecord = UserPublic & { passwordHash: string }

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 200
}

function mapUser(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    isAdmin: asBool(row.is_admin),
    disabled: asBool(row.disabled),
    createdAt: asIso(row.created_at) ?? new Date(0).toISOString(),
    passwordHash: String(row.password_hash),
  }
}

function publicUser(user: UserRecord): UserPublic {
  const { passwordHash: _passwordHash, ...safe } = user
  return safe
}

async function findUserByEmail(db: Db, email: string): Promise<UserRecord | null> {
  const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email])
  return result.rows[0] ? mapUser(result.rows[0]) : null
}

async function findUserById(db: Db, id: string): Promise<UserRecord | null> {
  const result = await db.query(`SELECT * FROM users WHERE id = $1`, [id])
  return result.rows[0] ? mapUser(result.rows[0]) : null
}

export async function ensureBootstrapAdmin(
  db: Db,
  env?: { ADMIN_BOOTSTRAP_EMAIL?: string; ADMIN_BOOTSTRAP_PASSWORD?: string },
) {
  const source = env ?? {
    ADMIN_BOOTSTRAP_EMAIL: process.env.ADMIN_BOOTSTRAP_EMAIL,
    ADMIN_BOOTSTRAP_PASSWORD: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  }
  const active = await db.query(
    `SELECT id FROM users WHERE is_admin = true AND disabled = false LIMIT 1`,
  )
  if (active.rows.length > 0) return { bootstrapped: false, needsPassword: false }
  const email = normalizeEmail(source.ADMIN_BOOTSTRAP_EMAIL || DEFAULT_BOOTSTRAP_EMAIL)
  const password = source.ADMIN_BOOTSTRAP_PASSWORD || ''
  if (!password) {
    const anyUser = await db.query(`SELECT id FROM users LIMIT 1`)
    return { bootstrapped: false, needsPassword: anyUser.rows.length === 0 }
  }
  if (!isEmail(email)) throw new HttpError('ADMIN_BOOTSTRAP_EMAIL không hợp lệ.', 500)
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new HttpError('ADMIN_BOOTSTRAP_PASSWORD cần từ 10 đến 200 ký tự.', 500)
  }
  const passwordHash = await hashPassword(password)
  const existing = await findUserByEmail(db, email)
  if (existing) {
    await db.query(
      `UPDATE users SET password_hash = $1, is_admin = true, disabled = false, updated_at = now() WHERE email = $2`,
      [passwordHash, email],
    )
  } else {
    try {
      await db.query(
        `INSERT INTO users (id, email, password_hash, is_admin, disabled) VALUES ($1, $2, $3, true, false)`,
        [randomUUID(), email, passwordHash],
      )
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
      if (code !== '23505') throw error
    }
  }
  return { bootstrapped: true, needsPassword: false }
}

async function isRateLimited(db: Db, email: string, ip: string): Promise<boolean> {
  const result = await db.query<{ email_fails: number | string; ip_fails: number | string }>(
    `SELECT
      (SELECT count(*) FROM login_attempts
        WHERE success = false AND email = $1 AND attempted_at > now() - interval '15 minutes') AS email_fails,
      (SELECT count(*) FROM login_attempts
        WHERE success = false AND ip = $2 AND attempted_at > now() - interval '15 minutes') AS ip_fails`,
    [email, ip],
  )
  const row = result.rows[0]
  const emailFails = Number(row?.email_fails ?? 0)
  const ipFails = Number(row?.ip_fails ?? 0)
  return emailFails >= LOGIN_EMAIL_LIMIT || ipFails >= LOGIN_IP_LIMIT
}

async function recordAttempt(db: Db, email: string, ip: string, success: boolean) {
  await db.query(`INSERT INTO login_attempts (email, ip, success) VALUES ($1, $2, $3)`, [email, ip, success])
}

export async function loginWithPassword(
  db: Db,
  input: { email: string; password: string; ip: string },
): Promise<{ token: string; csrfToken: string; expiresAt: string; user: UserPublic }> {
  const boot = await ensureBootstrapAdmin(db)
  if (boot.needsPassword) {
    throw new HttpError('Chưa có quản trị viên. Đặt ADMIN_BOOTSTRAP_PASSWORD rồi thử lại.', 500)
  }
  const email = normalizeEmail(input.email || '')
  const password = input.password || ''
  const ip = input.ip || 'unknown'
  await db.query(`DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 day'`)
  if (!email || !password || password.length > MAX_PASSWORD_LENGTH) {
    throw new HttpError('Email hoặc mật khẩu không đúng.', 401)
  }
  if (await isRateLimited(db, email, ip)) {
    throw new HttpError('Quá nhiều lần thử. Đợi khoảng 15 phút rồi thử lại.', 429)
  }
  const user = email && isEmail(email) ? await findUserByEmail(db, email) : null
  const hash = user?.passwordHash ?? (await dummyPasswordHash())
  const matches = await verifyPassword(password, hash)
  if (!user || !matches) {
    await recordAttempt(db, email, ip, false)
    throw new HttpError('Email hoặc mật khẩu không đúng.', 401)
  }
  if (user.disabled) {
    await recordAttempt(db, email, ip, false)
    throw new HttpError('Tài khoản đã bị vô hiệu.', 403)
  }
  const session = await createSession(db, user.id)
  await recordAttempt(db, email, ip, true)
  return { ...session, user: publicUser(user) }
}

export async function createSession(db: Db, userId: string) {
  const token = randomToken(32)
  const csrfToken = randomToken(32)
  const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
  await db.query(
    `INSERT INTO sessions (id, user_id, token_hash, csrf_token, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), userId, sha256(token), csrfToken, expires.toISOString()],
  )
  return { token, csrfToken, expiresAt: expires.toISOString() }
}

export async function findSession(db: Db, token: string): Promise<SessionContext | null> {
  if (!token) return null
  const result = await db.query(
    `SELECT s.id, s.csrf_token, s.expires_at, u.id AS user_id, u.email, u.is_admin, u.disabled, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1`,
    [sha256(token)],
  )
  const row = result.rows[0]
  if (!row) return null
  const expiresAt = asIso(row.expires_at)
  if (!expiresAt || new Date(expiresAt).getTime() <= Date.now() || asBool(row.disabled)) {
    await db.query(`DELETE FROM sessions WHERE id = $1`, [row.id])
    return null
  }
  return {
    id: String(row.id),
    csrfToken: String(row.csrf_token),
    expiresAt,
    user: {
      id: String(row.user_id),
      email: String(row.email),
      isAdmin: asBool(row.is_admin),
      disabled: false,
      createdAt: asIso(row.created_at) ?? new Date(0).toISOString(),
    },
  }
}

export async function deleteSession(db: Db, token: string) {
  if (!token) return
  await db.query(`DELETE FROM sessions WHERE token_hash = $1`, [sha256(token)])
}

export async function listUsers(db: Db): Promise<UserPublic[]> {
  const result = await db.query(`SELECT * FROM users ORDER BY created_at ASC, email ASC`)
  return result.rows.map((row) => publicUser(mapUser(row)))
}

function assertPassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new HttpError(`Mật khẩu cần từ ${MIN_PASSWORD_LENGTH} đến ${MAX_PASSWORD_LENGTH} ký tự.`, 400)
  }
}

export async function createUser(
  db: Db,
  input: { email: string; password: string; isAdmin: boolean },
): Promise<UserPublic> {
  const email = normalizeEmail(input.email || '')
  if (!isEmail(email)) throw new HttpError('Email không hợp lệ.', 400)
  assertPassword(input.password)
  const passwordHash = await hashPassword(input.password)
  try {
    const result = await db.query(
      `INSERT INTO users (id, email, password_hash, is_admin, disabled)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [randomUUID(), email, passwordHash, input.isAdmin],
    )
    return publicUser(mapUser(result.rows[0]))
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === '23505') throw new HttpError('Email đã tồn tại.', 400)
    throw error
  }
}

async function countActiveAdmins(db: Db): Promise<number> {
  const result = await db.query<{ n: number | string }>(
    `SELECT count(*) AS n FROM users WHERE is_admin = true AND disabled = false`,
  )
  return Number(result.rows[0]?.n ?? 0)
}

export async function updateUser(
  db: Db,
  actorId: string,
  userId: string,
  input: { disabled?: boolean; isAdmin?: boolean; password?: string },
): Promise<UserPublic> {
  const user = await findUserById(db, userId)
  if (!user) throw new HttpError('Không tìm thấy tài khoản.', 404)
  if (input.disabled === true && userId === actorId) {
    throw new HttpError('Không thể vô hiệu hóa chính mình.', 400)
  }
  if (input.password) {
    if (userId === actorId) throw new HttpError('Hãy dùng trang Đổi mật khẩu.', 400)
    assertPassword(input.password)
  }
  const willRemoveAdmin =
    user.isAdmin &&
    !user.disabled &&
    (input.disabled === true || input.isAdmin === false)
  if (willRemoveAdmin && (await countActiveAdmins(db)) <= 1) {
    throw new HttpError('Không thể gỡ quản trị viên đang hoạt động cuối cùng.', 400)
  }
  const passwordHash = input.password ? await hashPassword(input.password) : null
  const updated = await db.transaction(async (tx) => {
    const result = await tx.query(
      `UPDATE users
       SET disabled = COALESCE($2, disabled),
           is_admin = COALESCE($3, is_admin),
           password_hash = COALESCE($4, password_hash),
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [userId, input.disabled ?? null, input.isAdmin ?? null, passwordHash],
    )
    if (input.disabled === true || input.password) {
      await tx.query(`DELETE FROM sessions WHERE user_id = $1`, [userId])
    }
    return result.rows[0]
  })
  return publicUser(mapUser(updated))
}

export async function changePassword(db: Db, userId: string, currentPassword: string, nextPassword: string) {
  assertPassword(nextPassword)
  if (nextPassword === currentPassword) {
    throw new HttpError('Mật khẩu mới phải khác mật khẩu hiện tại.', 400)
  }
  const user = await findUserById(db, userId)
  if (!user) throw new HttpError('Không tìm thấy tài khoản.', 404)
  const matches = await verifyPassword(currentPassword, user.passwordHash)
  if (!matches) throw new HttpError('Mật khẩu hiện tại không đúng.', 400)
  const passwordHash = await hashPassword(nextPassword)
  await db.transaction(async (tx) => {
    await tx.query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [passwordHash, userId])
    await tx.query(`DELETE FROM sessions WHERE user_id = $1`, [userId])
  })
}

export function describedLimits() {
  return { email: LOGIN_EMAIL_LIMIT, ip: LOGIN_IP_LIMIT, windowMinutes: 15, sessionHours: SESSION_HOURS }
}
