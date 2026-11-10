import { SESSION_COOKIE, SESSION_HOURS } from './constants'

export function sessionCookieBase(maxAgeSeconds = SESSION_HOURS * 60 * 60, nodeEnv = process.env.NODE_ENV) {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}
