import { guardMutation } from '@/server/guard'
import { api, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'
import { ingestSnapshot } from '@/server/snapshots'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  const session = await guardMutation(req, { admin: true })
  const body = await readJson(req)
  const snapshot = await ingestSnapshot(getDb(), {
    payload: body,
    source: 'upload',
    importedBy: { id: session.user.id, email: session.user.email },
  })
  return json({ snapshot })
})
