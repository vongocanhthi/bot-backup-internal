import 'server-only'
import { HttpError } from '../lib/http-error'
import { tokensMatch } from '../lib/security'
import { getSession } from './session'

export async function guardRead(_req: Request, opts?: { admin?: boolean }) {
  const session = await getSession()
  if (!session) throw new HttpError('Chưa đăng nhập.', 401)
  if (opts?.admin && !session.user.isAdmin) throw new HttpError('Cần quyền quản trị.', 403)
  return session
}

export async function guardMutation(req: Request, opts?: { admin?: boolean }) {
  const session = await guardRead(req, opts)
  const header = req.headers.get('x-csrf-token') || ''
  if (!tokensMatch(header, session.csrfToken)) throw new HttpError('CSRF không hợp lệ.', 403)
  return session
}
