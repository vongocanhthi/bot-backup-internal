import { HttpError } from '../lib/http-error'
import { assertPublicHttpsUrl } from '../lib/urls'

export async function uploadToImgbb(bytes: Buffer, env?: { IMGBB_API_KEY?: string }): Promise<string> {
  const key = env?.IMGBB_API_KEY ?? process.env.IMGBB_API_KEY
  if (!key) throw new HttpError('Chưa cấu hình IMGBB_API_KEY trên máy chủ.', 500)
  const form = new FormData()
  form.set('image', bytes.toString('base64'))
  const endpoint = new URL('https://api.imgbb.com/1/upload')
  endpoint.searchParams.set('key', key)
  let response: Response
  try {
    response = await fetch(endpoint, { method: 'POST', body: form })
  } catch {
    throw new HttpError('Không kết nối được imgbb.', 502)
  }
  const payload = (await response.json().catch(() => null)) as { data?: { url?: string } } | null
  const url = payload?.data?.url
  if (!response.ok || !url) throw new HttpError('imgbb không nhận ảnh.', 502)
  return assertPublicHttpsUrl(url)
}
