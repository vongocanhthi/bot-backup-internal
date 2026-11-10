import { CopyButton } from '@/components/CopyButton'
import { NewBotForm } from '@/components/BotEditor'
import { listBots } from '@/server/content'
import { getDb } from '@/server/pool'
import { getSession } from '@/server/session'
import { formatDateTimeInSaigon } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cấu hình bot' }

export default async function BotsPage() {
  const session = await getSession()
  const bots = await listBots(getDb())
  return (
    <div className="stack">
      <header>
        <h1>Cấu hình bot</h1>
        <p className="muted">Mã bot không đổi. Bản sao chép và tệp .txt kèm mục Nhân vật nếu bot đã có nhân vật.</p>
      </header>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Mã bot</th>
              <th>Tiêu đề</th>
              <th>Cập nhật</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bots.map((bot) => (
              <tr key={bot.id}>
                <td>{bot.name}</td>
                <td>
                  <code>{bot.id}</code>
                </td>
                <td>{bot.title}</td>
                <td>{formatDateTimeInSaigon(bot.updatedAt)}</td>
                <td className="actions">
                  <a href={`/bot/${bot.id}`}>Xem</a>
                  <CopyButton url={`/api/bots/${bot.id}/export`} />
                  <a href={`/api/bots/${bot.id}/export`}>Tải .txt</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {session?.user.isAdmin ? <NewBotForm csrf={session.csrfToken} /> : null}
    </div>
  )
}
