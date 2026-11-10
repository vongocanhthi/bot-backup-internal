import { loginWithPassword } from '@/server/auth'
import { api, attachSession, clientIp, field, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  const body = await readJson(req)
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const result = await loginWithPassword(getDb(), {
    email: field(record.email),
    password: field(record.password),
    ip: clientIp(req),
  })
  const response = json({ ok: true, csrfToken: result.csrfToken, user: result.user })
  return attachSession(response, result.token)
})
