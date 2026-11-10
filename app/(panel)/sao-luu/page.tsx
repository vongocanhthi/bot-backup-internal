import { BackupManager } from '@/components/BackupManager'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sao lưu' }

export default async function BackupPage() {
  const session = await getSession()
  if (!session?.user.isAdmin) {
    return (
      <section className="card">
        <h1>Sao lưu</h1>
        <p>Chỉ quản trị viên mới vào được mục này.</p>
      </section>
    )
  }
  return (
    <div className="stack">
      <header>
        <h1>Sao lưu</h1>
        <p className="muted">Xuất và khôi phục dữ liệu nội dung. Tài khoản, phiên và mã nhập không nằm trong tệp.</p>
      </header>
      <BackupManager csrf={session.csrfToken} />
    </div>
  )
}
