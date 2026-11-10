import { PasswordForm } from '@/components/PasswordForm'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Đổi mật khẩu' }

export default async function PasswordPage() {
  const session = await getSession()
  if (!session) return null
  return (
    <div className="stack">
      <header>
        <h1>Đổi mật khẩu</h1>
      </header>
      <PasswordForm csrf={session.csrfToken} email={session.user.email} />
    </div>
  )
}
