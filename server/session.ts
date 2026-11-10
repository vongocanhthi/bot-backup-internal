import 'server-only'
import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '../lib/constants'
import { findSession } from './auth'
import { getDb } from './pool'

export async function getSession() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  return findSession(getDb(), token)
}

export async function currentSessionToken() {
  const jar = await cookies()
  return jar.get(SESSION_COOKIE)?.value ?? ''
}
