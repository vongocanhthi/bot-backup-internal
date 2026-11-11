import { RESTORE_CONFIRM } from '@/lib/constants'
import { HttpError } from '@/lib/http-error'
import { readBackupBundle, restoreBackup } from '@/server/backup'
import { guardMutation } from '@/server/guard'
import { api, field, json } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api(async (req) => {
  await guardMutation(req, { admin: true })
  const form = await req.formData()
  if (field(form.get('confirm')) !== RESTORE_CONFIRM) {
    throw new HttpError('Nhập đúng KHOI PHUC để khôi phục.', 400)
  }
  const file = form.get('file')
  if (!(file instanceof File)) throw new HttpError('Thiếu tệp sao lưu.', 400)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const bundle = await readBackupBundle(bytes, file.name)
  const result = await restoreBackup(getDb(), bundle.data, bundle.voices)
  return json({ ok: true, ...result })
})
