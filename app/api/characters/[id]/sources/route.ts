import { saveSourceFile } from '@/server/content'
import { guardMutation } from '@/server/guard'
import { HttpError } from '@/lib/http-error'
import { api, field, json } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await guardMutation(req, { admin: true })
  const { id } = await ctx.params
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) throw new HttpError('Thiếu file gốc.', 400)
  const bytes = new Uint8Array(await file.arrayBuffer())
  await saveSourceFile(getDb(), id, {
    filename: file.name,
    contentType: file.type,
    bytes,
    note: field(form.get('note')),
  })
  return json({ ok: true })
})
