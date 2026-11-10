import { createUser } from '@/server/auth'
import { guardMutation } from '@/server/guard'
import { api, field, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  await guardMutation(req, { admin: true })
  const body = await readJson(req)
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const user = await createUser(getDb(), {
    email: field(record.email),
    password: field(record.password),
    isAdmin: record.isAdmin === true,
  })
  return json({ user })
})
