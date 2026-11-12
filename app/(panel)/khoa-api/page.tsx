import { ApiKeysManager } from '@/components/ApiKeysManager'
import { HttpError } from '@/lib/http-error'
import { listApiKeys } from '@/server/api-keys'
import { listBots } from '@/server/content'
import { getDb } from '@/server/pool'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Khóa API' }

export default async function ApiKeysPage() {
  const session = await getSession()
  if (!session?.user.isAdmin) {
    return (
      <section className="card">
        <h1>Khóa API</h1>
        <p>Chỉ quản trị viên mới vào được mục này.</p>
      </section>
    )
  }
  const db = getDb()
  let notice = ''
  let keys: Awaited<ReturnType<typeof listApiKeys>> = []
  try {
    keys = await listApiKeys(db)
  } catch (error) {
    if (error instanceof HttpError) notice = error.message
    else throw error
  }
  const bots = (await listBots(db)).map((bot) => ({ id: bot.id, name: bot.name }))
  return (
    <div className="stack">
      <header>
        <h1>Khóa API</h1>
        <p className="muted">
          Bot dùng khóa này để tải sao lưu qua /api/v1/backup, không cần mật khẩu đăng nhập. Chỉ lưu phần băm của khóa. Vercel
          Authentication vẫn bật; bot tự gửi header x-vercel-protection-bypass.
        </p>
      </header>
      <ApiKeysManager csrf={session.csrfToken} keys={keys} bots={bots} notice={notice} />
    </div>
  )
}
