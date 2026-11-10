import { backupZip } from '@/server/backup'
import { guardRead } from '@/server/guard'
import { api, download } from '@/server/http'
import { getDb } from '@/server/pool'
import { fileStamp } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = api(async (req) => {
  await guardRead(req, { admin: true })
  const zip = await backupZip(getDb())
  return download(zip, 'application/zip', `sao-luu-qlk-${fileStamp()}.zip`)
})
