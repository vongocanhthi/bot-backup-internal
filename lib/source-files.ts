import { HttpError } from './http-error'

export const MAX_SOURCE_BYTES = 4 * 1024 * 1024
export const SOURCE_EXTENSIONS = ['zip', 'json', 'txt', 'md'] as const

export function safeSourceFilename(name: string): string {
  const base = (name.split(/[/\\]/).pop() ?? '').trim()
  const cleaned = base
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
  return cleaned
}

export function sourceExtension(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return (SOURCE_EXTENSIONS as readonly string[]).includes(ext) ? ext : null
}

export function contentTypeForSource(ext: string): string {
  if (ext === 'zip') return 'application/zip'
  if (ext === 'json') return 'application/json'
  if (ext === 'md') return 'text/markdown'
  return 'text/plain'
}

export function sourceFilePath(characterId: string, filename: string): string {
  return `sources/${characterId}/${filename}`
}

export function describeSourceUpload(filename: string, contentType: string, size: number): { filename: string; contentType: string } {
  const safe = safeSourceFilename(filename)
  const ext = sourceExtension(safe)
  if (!ext) throw new HttpError('File gốc phải là .zip, .json, .txt hoặc .md.', 400)
  if (size <= 0) throw new HttpError('File gốc trống.', 400)
  if (size > MAX_SOURCE_BYTES) {
    throw new HttpError('File gốc lớn hơn 4 MB. Mỗi lần tải lên chỉ khoảng 4,5 MB.', 400)
  }
  const expected = contentTypeForSource(ext)
  const type = contentType.toLowerCase()
  const allowed =
    !type ||
    type === 'application/octet-stream' ||
    type === expected ||
    (ext === 'zip' && type === 'application/x-zip-compressed') ||
    ((ext === 'txt' || ext === 'md') && (type === 'text/plain' || type === 'text/markdown'))
  if (!allowed) throw new HttpError('File gốc phải là .zip, .json, .txt hoặc .md.', 400)
  return { filename: safe, contentType: expected }
}
