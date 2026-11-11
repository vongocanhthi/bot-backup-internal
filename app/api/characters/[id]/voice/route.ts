import { NextResponse } from 'next/server'
import { deleteVoiceSample, getVoiceAudio, saveVoiceSample } from '@/server/content'
import { guardMutation, guardRead } from '@/server/guard'
import { HttpError } from '@/lib/http-error'
import { api, json } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await guardRead(req)
  const { id } = await ctx.params
  const audio = await getVoiceAudio(getDb(), id)
  if (!audio) throw new HttpError('Chưa có file nghe mẫu.', 404)
  const filename = audio.filename.replace(/["\r\n]/g, '')
  return new NextResponse(new Blob([new Uint8Array(audio.bytes)]), {
    headers: {
      'Content-Type': audio.contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
})

export const POST = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await guardMutation(req, { admin: true })
  const { id } = await ctx.params
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) throw new HttpError('Thiếu file nghe mẫu.', 400)
  const bytes = new Uint8Array(await file.arrayBuffer())
  await saveVoiceSample(getDb(), id, { filename: file.name, contentType: file.type, bytes })
  return json({ ok: true })
})

export const DELETE = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await guardMutation(req, { admin: true })
  const { id } = await ctx.params
  await deleteVoiceSample(getDb(), id)
  return json({ ok: true })
})
