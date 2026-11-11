import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BotEditor } from '@/components/BotEditor'
import { CopyButton } from '@/components/CopyButton'
import { botExportText } from '@/server/content'
import { getDb } from '@/server/pool'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: id }
}

export default async function BotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const [session, exported] = await Promise.all([
    getSession(),
    botExportText(db, decodeURIComponent(id)).catch(() => null),
  ])
  if (!exported) notFound()
  const characters = exported.characters
  return (
    <div className="stack">
      <header>
        <h1>{exported.bot.name}</h1>
        <p>
          Mã bot: <code>{exported.bot.id}</code>
        </p>
        <p className="muted">{exported.bot.title}</p>
      </header>
      <section className="card">
        {session?.user.isAdmin ? <BotEditor bot={exported.bot} csrf={session.csrfToken} /> : <pre className="export">{exported.bot.prompt}</pre>}
      </section>
      <section className="card stack">
        <h2>Bản sao chép kèm nhân vật</h2>
        <div className="actions">
          <CopyButton text={exported.text} />
          <a className="button secondary" href={`/api/bots/${exported.bot.id}/export`}>
            Tải .txt
          </a>
        </div>
        <pre className="export">{exported.text}</pre>
      </section>
      <section className="card">
        <h2>Nhân vật</h2>
        {characters.length === 0 ? <p>Chưa có nhân vật.</p> : null}
        <ul>
          {characters.map((character) => (
            <li key={character.id}>
              <Link href={`/nhan-vat?bot=${character.botId}`} prefetch>
                {character.name}
              </Link>{' '}
              · {character.images.length} ảnh
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
