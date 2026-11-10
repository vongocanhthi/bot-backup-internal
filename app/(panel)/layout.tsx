import { redirect } from 'next/navigation'
import { Shell } from '@/components/Shell'
import { HttpError } from '@/lib/http-error'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  let session: Awaited<ReturnType<typeof getSession>>
  try {
    session = await getSession()
  } catch (error) {
    if (error instanceof HttpError) {
      return (
        <main className="login-wrap">
          <section className="card stack">
            <h1>Chưa kết nối được</h1>
            <p>{error.message}</p>
          </section>
        </main>
      )
    }
    throw error
  }
  if (!session) redirect('/api/auth/end')
  return (
    <Shell user={session.user} csrf={session.csrfToken}>
      {children}
    </Shell>
  )
}
