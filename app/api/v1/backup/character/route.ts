import { backupKeyFromRequest } from '@/server/api-keys'
import { upsertBackupCharacter } from '@/server/backup-api'
import { api, json, readJson } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  const db = getDb()
  const key = await backupKeyFromRequest(db, req)
  const character = await upsertBackupCharacter(db, key, await readJson(req))
  return json({ character })
})
