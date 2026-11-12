import { HttpError } from '@/lib/http-error'
import { backupKeyFromRequest } from '@/server/api-keys'
import { saveBackupVoice } from '@/server/backup-api'
import { api, json } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const PUT = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const db = getDb()
  const key = await backupKeyFromRequest(db, req)
  const { id } = await ctx.params
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) throw new HttpError('Thiếu file giọng.', 400)
  const voice = await saveBackupVoice(db, key, id, {
    filename: file.name,
    contentType: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
  })
  return json({ voice })
})
