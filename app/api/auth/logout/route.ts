import { deleteSession } from '@/server/auth'
import { guardMutation } from '@/server/guard'
import { api, clearSession, json } from '@/server/http'
import { getDb } from '@/server/pool'
import { currentSessionToken } from '@/server/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  await guardMutation(req)
  const token = await currentSessionToken()
  await deleteSession(getDb(), token)
  return clearSession(json({ ok: true }))
})
