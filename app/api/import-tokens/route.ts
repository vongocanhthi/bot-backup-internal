import { guardMutation } from '@/server/guard'
import { api, field, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'
import { createImportToken } from '@/server/tokens'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  const session = await guardMutation(req, { admin: true })
  const body = await readJson(req)
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const created = await createImportToken(getDb(), { name: field(record.name), userId: session.user.id })
  return json(created)
})
