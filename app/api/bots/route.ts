import { createBot } from '@/server/content'
import { guardMutation } from '@/server/guard'
import { api, field, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  await guardMutation(req, { admin: true })
  const body = await readJson(req)
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const bot = await createBot(getDb(), {
    id: field(record.id),
    name: field(record.name),
    title: field(record.title),
    prompt: field(record.prompt),
  })
  return json({ bot })
})
