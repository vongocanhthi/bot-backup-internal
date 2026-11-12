import { backupKeyFromRequest } from '@/server/api-keys'
import { api, json } from '@/server/http'
import { getDb } from '@/server/pool'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = api(async (req) => {
  const key = await backupKeyFromRequest(getDb(), req)
  return json({
    ok: true,
    name: key.name,
    botId: key.botId,
    message: key.botId ? 'Khóa hợp lệ và chỉ ghi được một bot.' : 'Khóa hợp lệ.',
  })
})
