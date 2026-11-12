import { HttpError } from '@/lib/http-error'
import { backupKeyFromRequest } from '@/server/api-keys'
import { saveBackupSource } from '@/server/backup-api'
import { api, field, json } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const db = getDb()
  const key = await backupKeyFromRequest(db, req)
  const { id } = await ctx.params
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) throw new HttpError('Thiếu file gốc.', 400)
  const saved = await saveBackupSource(db, key, id, {
    filename: file.name,
    contentType: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
    note: field(form.get('note')),
  })
  return json({ sourceFile: saved })
})