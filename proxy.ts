import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decideAccess } from './lib/access'
import { SESSION_COOKIE } from './lib/constants'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  const decision = decideAccess(pathname, hasSession)
  if (decision.type === 'unauthorized') {
    return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 })
  }
  if (decision.type === 'redirect') {
    const url = request.nextUrl.clone()
    url.pathname = decision.pathname
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
