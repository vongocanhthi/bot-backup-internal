export type AccessDecision =
  | { type: 'next' }
  | { type: 'redirect'; pathname: string }
  | { type: 'unauthorized' }

const PUBLIC_PAGES = new Set(['/login', '/robots.txt', '/favicon.ico'])
const PUBLIC_API = new Set(['/api/auth/login', '/api/auth/end', '/api/import'])

export function decideAccess(pathname: string, hasSession: boolean): AccessDecision {
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') return { type: 'next' }
  if (pathname.startsWith('/api/')) {
    if (PUBLIC_API.has(pathname) || pathname.startsWith('/api/v1/backup')) return { type: 'next' }
    if (!hasSession) return { type: 'unauthorized' }
    return { type: 'next' }
  }
  if (!hasSession && !PUBLIC_PAGES.has(pathname)) {
    return { type: 'redirect', pathname: '/login' }
  }
  if (hasSession && pathname === '/login') return { type: 'redirect', pathname: '/' }
  return { type: 'next' }
}
