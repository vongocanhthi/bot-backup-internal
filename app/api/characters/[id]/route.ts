import { deleteCharacter, updateCharacter } from '@/server/content'
import { guardMutation } from '@/server/guard'
import { api, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const PATCH = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await guardMutation(req, { admin: true })
  const { id } = await ctx.params
  const body = await readJson(req)
  const character = await updateCharacter(getDb(), id, (body ?? {}) as Record<string, unknown>)
  return json({ character })
})

export const DELETE = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await guardMutation(req, { admin: true })
  const { id } = await ctx.params
  await deleteCharacter(getDb(), id)
  return json({ ok: true })
})
