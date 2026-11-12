import { createApiKey, listApiKeys } from '@/server/api-keys'
import { guardMutation, guardRead } from '@/server/guard'
import { api, field, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = api(async (req) => {
  await guardRead(req, { admin: true })
  const keys = await listApiKeys(getDb())
  return json({ keys })
})

export const POST = api(async (req) => {
  const session = await guardMutation(req, { admin: true })
  const body = await readJson(req)
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const created = await createApiKey(getDb(), {
    name: field(record.name),
    botId: field(record.botId) || null,
    userId: session.user.id,
  })
  return json({
    id: created.id,
    name: created.name,
    prefix: created.prefix,
    botId: created.botId,
    key: created.key,
  })
})
