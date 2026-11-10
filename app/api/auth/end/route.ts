import { NextResponse } from 'next/server'
import { clearSession } from '@/server/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET(req: Request) {
  const site = req.headers.get('sec-fetch-site')
  const url = new URL('/login', req.url)
  if (site && site !== 'same-origin' && site !== 'none') {
    return NextResponse.redirect(url)
  }
  url.searchParams.set('het_han', '1')
  return clearSession(NextResponse.redirect(url))
}
