import { LoginForm } from '@/components/LoginForm'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Đăng nhập' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ het_han?: string }>
}) {
  const params = await searchParams
  return (
    <main className="login-wrap">
      <section className="card login-card stack">
        <p className="eyebrow">Nội bộ</p>
        <h1>Quản lý lịch kênh (nội bộ)</h1>
        <p className="muted">Mọi trang đều yêu cầu đăng nhập. Giờ hiển thị theo Asia/Saigon.</p>
        <LoginForm expired={params.het_han === '1'} />
      </section>
    </main>
  )
}
