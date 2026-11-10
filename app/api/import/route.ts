import { api, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'
import { ingestSnapshot } from '@/server/snapshots'
import { authenticateImportToken } from '@/server/tokens'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  await authenticateImportToken(getDb(), req.headers.get('authorization'))
  const body = await readJson(req)
  const snapshot = await ingestSnapshot(getDb(), {
    payload: body,
    source: 'api',
    importedBy: null,
  })
  return json({ snapshotId: snapshot.id, importedAt: snapshot.importedAt, postCount: snapshot.postCount })
})
