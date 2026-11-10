import { updateUser } from '@/server/auth'
import { guardMutation } from '@/server/guard'
import { api, field, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const PATCH = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const session = await guardMutation(req, { admin: true })
  const { id } = await ctx.params
  const body = await readJson(req)
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const user = await updateUser(getDb(), session.user.id, id, {
    disabled: typeof record.disabled === 'boolean' ? record.disabled : undefined,
    isAdmin: typeof record.isAdmin === 'boolean' ? record.isAdmin : undefined,
    password: record.password ? field(record.password) : undefined,
  })
  return json({ user })
})
