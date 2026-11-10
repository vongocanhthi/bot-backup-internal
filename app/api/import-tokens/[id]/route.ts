import { guardMutation } from '@/server/guard'
import { api, json } from '@/server/http'
import { getDb } from '@/server/pool'
import { revokeImportToken } from '@/server/tokens'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const DELETE = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await guardMutation(req, { admin: true })
  const { id } = await ctx.params
  await revokeImportToken(getDb(), id)
  return json({ ok: true })
})
