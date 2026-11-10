import { ChannelManager } from '@/components/ChannelManager'
import { listChannels, listSlots } from '@/server/channels'
import { listBots } from '@/server/content'
import { getDb } from '@/server/pool'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Kênh' }

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams
  const db = getDb()
  const session = await getSession()
  const [channels, slots, bots] = await Promise.all([listChannels(db), listSlots(db), listBots(db)])
  return (
    <div className="stack">
      <header>
        <h1>Kênh</h1>
        <p className="muted">Mã nội bộ giữ nguyên khi đổi tên hiển thị. ID ngoài chỉ hiện khi cấu hình bot đã ghi.</p>
      </header>
      <ChannelManager
        csrf={session?.csrfToken || ''}
        isAdmin={Boolean(session?.user.isAdmin)}
        channels={channels}
        slots={slots}
        bots={bots.map((bot) => ({ id: bot.id, name: bot.name }))}
        selectedCode={params.code}
      />
    </div>
  )
}
