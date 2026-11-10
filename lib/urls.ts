import { HttpError } from './http-error'

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|172\.(1[6-9]|2\d|3[0-1])\.|\[::1\]|\[fc|\[fd|\[fe80)/i

export function assertPublicHttpsUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new HttpError('URL ảnh không hợp lệ.', 400)
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new HttpError('Ảnh phải là URL https công khai.', 400)
  }
  const host = url.hostname.toLowerCase()
  if (PRIVATE_HOST.test(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new HttpError('URL ảnh không được trỏ về máy nội bộ.', 400)
  }
  return url.toString()
}
