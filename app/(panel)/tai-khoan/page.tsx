import { AccountsManager } from '@/components/AccountsManager'
import { listUsers } from '@/server/auth'
import { getDb } from '@/server/pool'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tài khoản' }

export default async function AccountsPage() {
  const session = await getSession()
  if (!session?.user.isAdmin) {
    return (
      <section className="card">
        <h1>Tài khoản</h1>
        <p>Chỉ quản trị viên mới vào được mục này.</p>
      </section>
    )
  }
  const users = await listUsers(getDb())
  return (
    <div className="stack">
      <header>
        <h1>Tài khoản</h1>
        <p className="muted">Mật khẩu được lưu dạng băm. Tài khoản bị vô hiệu không đăng nhập được.</p>
      </header>
      <AccountsManager csrf={session.csrfToken} currentId={session.user.id} users={users} />
    </div>
  )
}
