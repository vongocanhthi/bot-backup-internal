import 'server-only'
import { NextResponse } from 'next/server'
import { HttpError } from '../lib/http-error'
import { sessionCookieBase } from '../lib/cookies'

export function toErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === '28P01' || code === '3D000') {
    return NextResponse.json({ error: 'Không kết nối được cơ sở dữ liệu.' }, { status: 500 })
  }
  console.error(error)
  return NextResponse.json({ error: 'Lỗi máy chủ.' }, { status: 500 })
}

export function api<C = unknown>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      return await handler(req, ctx)
    } catch (error) {
      return toErrorResponse(error)
    }
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new HttpError('JSON không hợp lệ.', 400)
  }
}

export function field(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') || 'unknown'
}

export function attachSession(response: NextResponse, token: string) {
  const base = sessionCookieBase()
  response.cookies.set({ ...base, value: token })
  return response
}

export function clearSession(response: NextResponse) {
  const base = sessionCookieBase(0)
  response.cookies.set({ ...base, value: '' })
  return response
}

export function download(body: string | Uint8Array, contentType: string, filename: string) {
  const payload = typeof body === 'string' ? body : new Blob([new Uint8Array(body)])
  return new NextResponse(payload, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
