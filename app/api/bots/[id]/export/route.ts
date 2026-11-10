import { botExportText } from '@/server/content'
import { guardRead } from '@/server/guard'
import { api, download } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await guardRead(req)
  const { id } = await ctx.params
  const exported = await botExportText(getDb(), decodeURIComponent(id))
  return download(exported.text, 'text/plain; charset=utf-8', `${exported.bot.id}.txt`)
})
