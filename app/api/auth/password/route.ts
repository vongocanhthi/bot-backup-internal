import { changePassword } from '@/server/auth'
import { guardMutation } from '@/server/guard'
import { api, clearSession, field, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  const session = await guardMutation(req)
  const body = await readJson(req)
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  await changePassword(getDb(), session.user.id, field(record.currentPassword), field(record.newPassword))
  return clearSession(json({ ok: true }))
})
