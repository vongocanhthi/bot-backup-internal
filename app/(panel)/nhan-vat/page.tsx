import { CharactersManager } from '@/components/CharactersManager'
import { listBots, listCharacters } from '@/server/content'
import { getDb } from '@/server/pool'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nhân vật' }

export default async function CharactersPage({ searchParams }: { searchParams: Promise<{ bot?: string }> }) {
  const params = await searchParams
  const db = getDb()
  const session = await getSession()
  const [bots, characters] = await Promise.all([listBots(db), listCharacters(db, params.bot || null)])
  return (
    <div className="stack">
      <header>
        <h1>Nhân vật</h1>
        <p className="muted">
          Ảnh tải lên imgbb từ máy chủ. Khi sao chép cấu hình bot, mục Nhân vật kèm mô tả, URL ảnh và lời nhắc luôn dùng ảnh tham chiếu.
        </p>
      </header>
      <CharactersManager
        csrf={session?.csrfToken || ''}
        isAdmin={Boolean(session?.user.isAdmin)}
        bots={bots.map((bot) => ({ id: bot.id, name: bot.name }))}
        characters={characters}
        botId={params.bot || ''}
      />
    </div>
  )
}
