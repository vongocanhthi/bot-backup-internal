import { revokeApiKey } from '@/server/api-keys'
import { guardMutation } from '@/server/guard'
import { api, json } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const DELETE = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await guardMutation(req, { admin: true })
  const { id } = await ctx.params
  await revokeApiKey(getDb(), id)
  return json({ ok: true })
})
