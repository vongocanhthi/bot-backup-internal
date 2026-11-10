import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decideAccess } from '../lib/access'
import { sessionCookieBase } from '../lib/cookies'
import { SESSION_HOURS } from '../lib/constants'

test('unauthenticated pages redirect to login', () => {
  for (const path of ['/', '/kenh', '/bot', '/nhan-vat', '/tai-khoan', '/sao-luu', '/doi-mat-khau', '/bot/abc']) {
    assert.deepEqual(decideAccess(path, false), { type: 'redirect', pathname: '/login' })
  }
  assert.equal(decideAccess('/login', false).type, 'next')
  assert.equal(decideAccess('/robots.txt', false).type, 'next')
})

test('authenticated login page goes home and APIs without a cookie are rejected', () => {
  assert.deepEqual(decideAccess('/login', true), { type: 'redirect', pathname: '/' })
  assert.equal(decideAccess('/api/channels', false).type, 'unauthorized')
  assert.equal(decideAccess('/api/auth/password', false).type, 'unauthorized')
  assert.equal(decideAccess('/api/backup/restore', false).type, 'unauthorized')
  assert.equal(decideAccess('/api/auth/login', false).type, 'next')
  assert.equal(decideAccess('/api/import', false).type, 'next')
  assert.equal(decideAccess('/api/auth/end', false).type, 'next')
  assert.equal(decideAccess('/', true).type, 'next')
})

test('session cookie is httpOnly for 12 hours and secure in production', () => {
  const prod = sessionCookieBase(SESSION_HOURS * 60 * 60, 'production')
  const dev = sessionCookieBase(SESSION_HOURS * 60 * 60, 'test')
  assert.equal(prod.httpOnly, true)
  assert.equal(prod.secure, true)
  assert.equal(prod.sameSite, 'lax')
  assert.equal(prod.maxAge, SESSION_HOURS * 60 * 60)
  assert.equal(dev.secure, false)
})
