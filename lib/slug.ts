export function slugify(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
  const slug = ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'kenh'
}

export function isChannelCode(code: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code) && code.length <= 48
}

export function isBotId(id: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{2,80}$/.test(id)
}

export function safeFilePart(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return cleaned || 'tep'
}
