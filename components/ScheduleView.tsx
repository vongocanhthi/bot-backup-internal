import { connectionLabel, platformLabel, statusLabel } from '../lib/labels'
import { formatTimeInSaigon, weekdayLabel } from '../lib/time'
import type { ScheduleData } from '../server/schedule'

export function ScheduleView({
  data,
  view,
  channel,
}: {
  data: ScheduleData
  view: string
  channel: string
}) {
  const selected = data.channels.find((item) => item.code === channel)
  return (
    <div className="stack">
      {view === 'channel' && selected ? (
        <section className="card">
          <h2>Quy tắc lặp lại — {selected.name}</h2>
          <p className="muted">
            Mã kênh <code>{selected.code}</code> không đổi khi đổi tên. {platformLabel(selected.platform)} ·{' '}
            {connectionLabel(selected.connectionLabel)}
          </p>
          {data.weeklyTemplate.length === 0 ? (
            <p>Chưa có slot định kỳ.</p>
          ) : (
            <ul>
              {data.weeklyTemplate.map((slot) => (
                <li key={slot.id}>
                  {weekdayLabel(slot.weekday)} · {slot.timeLocal} · {slot.label || 'Không nhãn'}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      {data.days.map((day) => (
        <article className="day" key={day.date}>
          <h2>{day.label}</h2>
          <div className="split">
            <section>
              <h3>Slot định kỳ</h3>
              {day.slots.length === 0 ? <p className="muted">Không có slot.</p> : null}
              <ul>
                {day.slots.map((slot) => (
                  <li key={`${day.date}-${slot.id}`}>
                    <strong>{slot.timeLocal}</strong> · {slot.channelName}{' '}
                    <span className="muted">({slot.channelCode})</span>
                    {slot.label ? ` — ${slot.label}` : ''}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3>Bài thực tế trong snapshot</h3>
              {day.posts.length === 0 ? <p className="muted">Không có bài trong khoảng này.</p> : null}
              <ul>
                {day.posts.map((post) => (
                  <li key={post.id}>
                    <strong>{formatTimeInSaigon(post.scheduledAt || post.publishedAt || day.date)}</strong> ·{' '}
                    {post.channelName || post.channelCode || 'Chưa khớp kênh'} — {post.title || 'Không tiêu đề'} ·{' '}
                    {statusLabel(post.status)}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </article>
      ))}
      {view === 'channel' && data.channelPosts.length > 0 ? (
        <section className="card">
          <h2>Mọi bài của kênh trong snapshot</h2>
          <ul>
            {data.channelPosts.map((post) => (
              <li key={post.id}>
                {post.scheduledAt || post.publishedAt
                  ? formatTimeInSaigon(post.scheduledAt || post.publishedAt || '')
                  : 'Chưa có giờ'}{' '}
                · {post.title || 'Không tiêu đề'} · {statusLabel(post.status)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.undated.length > 0 ? (
        <section className="card">
          <h2>Bài trong snapshot chưa có giờ</h2>
          <ul>
            {data.undated.map((post) => (
              <li key={post.id}>
                {post.channelName || post.channelCode || 'Chưa khớp kênh'} — {post.title || 'Không tiêu đề'}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
