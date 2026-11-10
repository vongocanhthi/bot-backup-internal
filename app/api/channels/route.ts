import { createChannel } from '@/server/channels'
import { guardMutation } from '@/server/guard'
import { api, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  await guardMutation(req, { admin: true })
  const body = await readJson(req)
  const channel = await createChannel(getDb(), (body ?? {}) as Record<string, unknown>)
  return json({ channel })
})
