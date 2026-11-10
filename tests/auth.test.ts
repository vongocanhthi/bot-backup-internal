import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { DEFAULT_BOOTSTRAP_EMAIL } from '../lib/constants'
import { tokensMatch } from '../lib/security'
import {
  changePassword,
  createUser,
  ensureBootstrapAdmin,
  loginWithPassword,
  updateUser,
} from '../server/auth'
import { HttpError } from '../lib/http-error'
import { createTestDb } from './helpers'

const PASSWORD = 'correct-horse-1'
let db: Awaited<ReturnType<typeof createTestDb>>['db']
let close: () => Promise<void>

before(async () => {
  process.env.ADMIN_BOOTSTRAP_EMAIL = DEFAULT_BOOTSTRAP_EMAIL
  process.env.ADMIN_BOOTSTRAP_PASSWORD = PASSWORD
  const handle = await createTestDb()
  db = handle.db
  close = handle.close
})

after(async () => {
  await close()
})

test('bootstrap creates the documented admin and stores a hash', async () => {
  const result = await ensureBootstrapAdmin(db)
  assert.equal(result.bootstrapped, true)
  const row = await db.query<{ password_hash: string; is_admin: boolean }>(
    `SELECT password_hash, is_admin FROM users WHERE email = $1`,
    [DEFAULT_BOOTSTRAP_EMAIL],
  )
  assert.equal(row.rows[0]?.is_admin, true)
  assert.notEqual(row.rows[0]?.password_hash, PASSWORD)
  assert.match(String(row.rows[0]?.password_hash), /^\$2[aby]\$/)
})

test('bootstrap does not reset the password while an active admin exists', async () => {
  const first = await loginWithPassword(db, { email: DEFAULT_BOOTSTRAP_EMAIL, password: PASSWORD, ip: '203.0.113.4' })
  await changePassword(db, first.user.id, PASSWORD, 'replacement-pass-2')
  const again = await ensureBootstrapAdmin(db)
  assert.equal(again.bootstrapped, false)
  const login = await loginWithPassword(db, {
    email: DEFAULT_BOOTSTRAP_EMAIL,
    password: 'replacement-pass-2',
    ip: '203.0.113.4',
  })
  assert.equal(login.user.email, DEFAULT_BOOTSTRAP_EMAIL)
  await assert.rejects(
    () => loginWithPassword(db, { email: DEFAULT_BOOTSTRAP_EMAIL, password: PASSWORD, ip: '203.0.113.5' }),
    (error: unknown) => error instanceof HttpError && error.status === 401,
  )
})

test('wrong password, disabled account, and rate limit', async () => {
  const user = await createUser(db, { email: 'viewer@example.com', password: 'viewer-pass-1', isAdmin: false })
  await assert.rejects(
    () => loginWithPassword(db, { email: 'viewer@example.com', password: 'nope-nope-nope', ip: '203.0.113.20' }),
    (error: unknown) => error instanceof HttpError && error.message === 'Email hoặc mật khẩu không đúng.',
  )
  await updateUser(db, user.id, user.id, { disabled: true }).catch(() => undefined)
  const admin = await loginWithPassword(db, {
    email: DEFAULT_BOOTSTRAP_EMAIL,
    password: 'replacement-pass-2',
    ip: '203.0.113.21',
  })
  await updateUser(db, admin.user.id, user.id, { disabled: true })
  await assert.rejects(
    () => loginWithPassword(db, { email: 'viewer@example.com', password: 'viewer-pass-1', ip: '203.0.113.22' }),
    (error: unknown) => error instanceof HttpError && error.status === 403,
  )
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(() =>
      loginWithPassword(db, { email: 'missing@example.com', password: 'wrong-password', ip: '203.0.113.30' }),
    )
  }
  await assert.rejects(
    () => loginWithPassword(db, { email: 'missing@example.com', password: 'wrong-password', ip: '203.0.113.30' }),
    (error: unknown) => error instanceof HttpError && error.status === 429,
  )
})

test('csrf tokens must match and a non-admin cannot be treated as admin by the session flag', async () => {
  const login = await loginWithPassword(db, {
    email: DEFAULT_BOOTSTRAP_EMAIL,
    password: 'replacement-pass-2',
    ip: '203.0.113.40',
  })
  assert.equal(tokensMatch(login.csrfToken, login.csrfToken), true)
  assert.equal(tokensMatch(login.csrfToken, 'different-token'), false)
  assert.equal(tokensMatch('', login.csrfToken), false)
  assert.equal(login.user.isAdmin, true)
})

test('empty database asks for the bootstrap password and does not invent one', async () => {
  const fresh = await createTestDb()
  delete process.env.ADMIN_BOOTSTRAP_PASSWORD
  try {
    const result = await ensureBootstrapAdmin(fresh.db, { ADMIN_BOOTSTRAP_EMAIL: DEFAULT_BOOTSTRAP_EMAIL })
    assert.equal(result.needsPassword, true)
    assert.equal(result.bootstrapped, false)
    const users = await fresh.db.query(`SELECT id FROM users`)
    assert.equal(users.rows.length, 0)
  } finally {
    process.env.ADMIN_BOOTSTRAP_PASSWORD = PASSWORD
    await fresh.close()
  }
})
