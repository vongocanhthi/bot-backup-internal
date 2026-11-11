import { NextResponse } from 'next/server'
import { deleteSourceFile, getSourceFile } from '@/server/content'
import { guardMutation, guardRead } from '@/server/guard'
import { HttpError } from '@/lib/http-error'
import { api, json } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = api<{ params: Promise<{ id: string; fileId: string }> }>(async (req, ctx) => {
  await guardRead(req)
  const { id, fileId } = await ctx.params
  const file = await getSourceFile(getDb(), id, fileId)
  if (!file) throw new HttpError('Không tìm thấy file gốc.', 404)
  const filename = file.filename.replace(/["\r\n]/g, '')
  return new NextResponse(new Blob([new Uint8Array(file.bytes)]), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
})

export const DELETE = api<{ params: Promise<{ id: string; fileId: string }> }>(async (req, ctx) => {
  await guardMutation(req, { admin: true })
  const { id, fileId } = await ctx.params
  await deleteSourceFile(getDb(), id, fileId)
  return json({ ok: true })
})
