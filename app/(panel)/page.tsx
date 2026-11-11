import Link from 'next/link'
import { ScheduleView } from '@/components/ScheduleView'
import { SnapshotTools } from '@/components/SnapshotTools'
import { formatDateTimeInSaigon, addIsoDays, todayInSaigon } from '@/lib/time'
import { getSchedule } from '@/server/schedule'
import { getSession } from '@/server/session'
import { getDb } from '@/server/pool'
import { listImportTokens } from '@/server/tokens'

export const dynamic = 'force-dynamic'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; channel?: string; snapshot?: string }>
}) {
  const params = await searchParams
  const view = params.view === 'week' || params.view === 'channel' ? params.view : 'today'
  const today = todayInSaigon()
  const from = today
  const to = view === 'today' ? today : addIsoDays(today, 6)
  const db = getDb()
  const session = await getSession()
  const [data, tokens] = await Promise.all([
    getSchedule(db, {
      from,
      to,
      channelCode: view === 'channel' ? params.channel || null : null,
      snapshotId: params.snapshot || null,
    }),
    session?.user.isAdmin ? listImportTokens(db) : Promise.resolve([]),
  ])
  const snapshot = data.snapshot

  return (
    <div className="stack">
      <header>
        <h1>Lịch kênh</h1>
        <p className="muted">Giờ hiển thị theo Asia/Saigon (UTC+7). Slot định kỳ và bài thực tế được tách riêng.</p>
      </header>
      <section className="banner" role="status">
        {snapshot ? (
          <>
            <p className="kicker">Snapshot — không phải thời gian thực</p>
            <strong className="time">{formatDateTimeInSaigon(snapshot.importedAt)} · Asia/Saigon</strong>
            <p>
              Bài thực tế lấy từ bản nhập này
              {snapshot.label ? ` (“${snapshot.label}”)` : ''} · nguồn {snapshot.source} · {snapshot.postCount} bài
              {snapshot.importedByEmail ? ` · ${snapshot.importedByEmail}` : ''}. Slot định kỳ là kế hoạch tuần hiện
              tại, không nằm trong snapshot.
            </p>
          </>
        ) : (
          <>
            <p className="kicker">Chưa có snapshot</p>
            <strong className="time">Chưa nhập bài thực tế</strong>
            <p>Slot định kỳ vẫn hiện. Hệ thống không tự lấy lịch từ Buffer.</p>
          </>
        )}
      </section>
      <div className="tabs" aria-label="Khoảng lịch">
        <Link href="/" prefetch aria-current={view === 'today' ? 'page' : undefined}>
          Hôm nay
        </Link>
        <Link href="/?view=week" prefetch aria-current={view === 'week' ? 'page' : undefined}>
          7 ngày tới
        </Link>
        <Link
          href={`/?view=channel${params.channel ? `&channel=${params.channel}` : ''}`}
          prefetch
          aria-current={view === 'channel' ? 'page' : undefined}
        >
          Theo kênh
        </Link>
      </div>
      {view === 'channel' ? (
        <form className="actions" action="/" method="get">
          <input type="hidden" name="view" value="channel" />
          <label htmlFor="channel-pick">Kênh</label>
          <select id="channel-pick" name="channel" defaultValue={params.channel || ''}>
            <option value="">Chọn kênh</option>
            {data.channels.map((channel) => (
              <option key={channel.code} value={channel.code}>
                {channel.name}
              </option>
            ))}
          </select>
          <button type="submit" className="secondary">
            Xem
          </button>
        </form>
      ) : null}
      {data.snapshots.length > 0 ? (
        <form className="actions" action="/" method="get">
          {view !== 'today' ? <input type="hidden" name="view" value={view} /> : null}
          {params.channel ? <input type="hidden" name="channel" value={params.channel} /> : null}
          <label htmlFor="snapshot-pick">Snapshot</label>
          <select id="snapshot-pick" name="snapshot" defaultValue={snapshot?.id || ''}>
            {data.snapshots.map((item) => (
              <option key={item.id} value={item.id}>
                {formatDateTimeInSaigon(item.importedAt)} · {item.label || item.source} · {item.postCount} bài
              </option>
            ))}
          </select>
          <button type="submit" className="secondary">
            Xem bản này
          </button>
        </form>
      ) : null}
      {view === 'channel' && !params.channel ? <p>Chọn một kênh để xem lịch.</p> : <ScheduleView data={data} view={view} channel={params.channel || ''} />}
      {session?.user.isAdmin ? <SnapshotTools csrf={session.csrfToken} tokens={tokens} /> : null}
    </div>
  )
}
