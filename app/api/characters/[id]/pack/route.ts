import { getCharacter, getVoiceAudio } from '@/server/content'
import { guardRead } from '@/server/guard'
import { HttpError } from '@/lib/http-error'
import { api, download } from '@/server/http'
import { buildCharacterPack } from '@/server/pack'
import { getDb } from '@/server/pool'
import { safeFilePart } from '@/lib/slug'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = api<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await guardRead(req)
  const { id } = await ctx.params
  const db = getDb()
  const character = await getCharacter(db, id)
  if (!character) throw new HttpError('Không tìm thấy nhân vật.', 404)
  const audio = await getVoiceAudio(db, id)
  const zip = await buildCharacterPack(character, audio ? { filename: audio.filename, bytes: audio.bytes } : null)
  return download(zip, 'application/zip', `${safeFilePart(character.name)}-nhan-vat.zip`)
})
