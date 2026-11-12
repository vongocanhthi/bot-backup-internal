import { HttpError } from '@/lib/http-error'
import { backupKeyFromRequest } from '@/server/api-keys'
import { addBackupImageFile, addBackupImageUrl } from '@/server/backup-api'
import { api, field, json, readJson } from '@/server/http'
import { uploadToImgbb } from '@/server/imgbb'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const db = getDb()
  const key = await backupKeyFromRequest(db, req)
  const { id } = await ctx.params
  const type = req.headers.get('content-type') ?? ''
  if (type.includes('multipart/form-data')) {
    if (!process.env.IMGBB_API_KEY) throw new HttpError('Chưa cấu hình IMGBB_API_KEY trên máy chủ.', 400)
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw new HttpError('Thiếu file ảnh.', 400)
    const image = await addBackupImageFile(
      db,
      key,
      id,
      { filename: file.name, contentType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) },
      field(form.get('kind')),
      field(form.get('label')) || null,
      (bytes) => uploadToImgbb(bytes),
    )
    return json({ image })
  }
  const image = await addBackupImageUrl(db, key, id, await readJson(req))
  return json({ image })
})
