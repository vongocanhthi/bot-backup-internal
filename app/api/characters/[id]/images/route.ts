import { addCharacterImage } from '@/server/content'
import { guardMutation } from '@/server/guard'
import { HttpError } from '@/lib/http-error'
import { api, field, json } from '@/server/http'
import { uploadToImgbb } from '@/server/imgbb'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export const POST = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await guardMutation(req, { admin: true })
  const { id } = await ctx.params
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) throw new HttpError('Thiếu file ảnh.', 400)
  if (file.size > 4 * 1024 * 1024) throw new HttpError('Ảnh lớn hơn 4 MB.', 400)
  if (!TYPES.has(file.type)) throw new HttpError('Chỉ nhận PNG, JPEG, WEBP hoặc GIF.', 400)
  const bytes = Buffer.from(await file.arrayBuffer())
  const url = await uploadToImgbb(bytes)
  const image = await addCharacterImage(getDb(), id, {
    kind: field(form.get('kind')),
    label: field(form.get('label')) || null,
    url,
  })
  return json({ image })
})
