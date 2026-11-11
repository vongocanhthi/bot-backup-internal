import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '../lib/constants'
import { findSession } from './auth'
import { getDb } from './pool'

export const getSession = cache(async () => {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  return findSession(getDb(), token)
})

export async function currentSessionToken() {
  const jar = await cookies()
  return jar.get(SESSION_COOKIE)?.value ?? ''
}
