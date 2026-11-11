import JSZip from 'jszip'
import { renderCharacterMarkdown } from '../lib/bot-export'
import { toExportVoice } from './content'
import { kindLabel } from '../lib/labels'
import { safeFilePart } from '../lib/slug'
import { assertPublicHttpsUrl } from '../lib/urls'
import type { Character } from '../lib/types'

const MAX_IMAGE_BYTES = 8_000_000

export async function buildCharacterPack(
  character: Character,
  audio?: { filename: string; bytes: Uint8Array } | null,
): Promise<Uint8Array> {
  const zip = new JSZip()
  const files: { label: string; url: string; file?: string }[] = []
  const folder = zip.folder('images')
  let index = 1
  for (const image of character.images) {
    const label = image.label ? `${kindLabel(image.kind)} (${image.label})` : kindLabel(image.kind)
    try {
      const downloaded = await fetchPublicImage(image.url)
      const filename = `${String(index).padStart(2, '0')}-${safeFilePart(label)}${downloaded.ext}`
      folder?.file(filename, downloaded.bytes)
      files.push({ label, url: image.url, file: `images/${filename}` })
    } catch {
      files.push({ label, url: image.url })
    }
    index += 1
  }
  if (audio) zip.file(`voices/${audio.filename}`, audio.bytes)
  const markdown = [
    renderCharacterMarkdown({
      name: character.name,
      appearance: character.appearance,
      images: character.images.map((image) => ({ kind: image.kind, label: image.label, url: image.url })),
      voice: {
        ...toExportVoice(character),
        sampleFile: audio ? `voices/${audio.filename}` : toExportVoice(character).sampleFile,
      },
    }).trimEnd(),
    '',
    '## File trong gói',
    ...files.map((file) => `- ${file.label}: ${file.url}${file.file ? ` (file: ${file.file})` : ' (không tải được file, dùng URL)'}`),
    '',
  ].join('\n')
  zip.file('nhan-vat.md', markdown)
  return zip.generateAsync({ type: 'uint8array' })
}

async function fetchPublicImage(url: string): Promise<{ bytes: Uint8Array; ext: string }> {
  const first = await fetchChecked(url)
  return first
}

async function fetchChecked(url: string): Promise<{ bytes: Uint8Array; ext: string }> {
  assertPublicHttpsUrl(url)
  const response = await fetch(url, { redirect: 'manual' })
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location')
    if (!location) throw new Error('redirect')
    const next = new URL(location, url).toString()
    assertPublicHttpsUrl(next)
    const followed = await fetch(next, { redirect: 'manual' })
    if (!followed.ok) throw new Error('status')
    return readBody(followed, next)
  }
  if (!response.ok) throw new Error('status')
  return readBody(response, url)
}

async function readBody(response: Response, url: string) {
  const length = Number(response.headers.get('content-length') || 0)
  if (length > MAX_IMAGE_BYTES) throw new Error('size')
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('size')
  return { bytes, ext: extension(url, response.headers.get('content-type')) }
}

function extension(url: string, contentType: string | null): string {
  const pathExt = new URL(url).pathname.split('.').pop() ?? ''
  if (/^[a-z0-9]{2,5}$/i.test(pathExt)) return `.${pathExt.toLowerCase()}`
  if (contentType?.includes('png')) return '.png'
  if (contentType?.includes('jpeg')) return '.jpg'
  if (contentType?.includes('webp')) return '.webp'
  if (contentType?.includes('gif')) return '.gif'
  return '.img'
}
