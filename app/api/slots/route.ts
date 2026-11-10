import { createSlot } from '@/server/channels'
import { guardMutation } from '@/server/guard'
import { api, field, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  await guardMutation(req, { admin: true })
  const body = await readJson(req)
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const weekday = record.weekday == null || record.weekday === '' ? null : Number(record.weekday)
  const slot = await createSlot(getDb(), {
    channelCode: field(record.channelCode),
    weekday: Number.isFinite(weekday) ? weekday : null,
    timeLocal: field(record.timeLocal),
    label: field(record.label) || null,
  })
  return json({ slot })
})
