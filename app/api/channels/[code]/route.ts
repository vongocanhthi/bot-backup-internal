import { updateChannel } from '@/server/channels'
import { guardMutation } from '@/server/guard'
import { api, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const PATCH = api<{ params: Promise<{ code: string }> }>(async (req, ctx) => {
  await guardMutation(req, { admin: true })
  const { code } = await ctx.params
  const body = await readJson(req)
  const channel = await updateChannel(getDb(), code, (body ?? {}) as Record<string, unknown>)
  return json({ channel })
})
