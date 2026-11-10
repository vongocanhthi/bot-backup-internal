export function asString(value: unknown): string | null {
  if (value == null) return null
  const text = String(value)
  return text.length ? text : null
}

export function asBool(value: unknown): boolean {
  return value === true || value === 't' || value === 'true' || value === 1 || value === '1'
}

export function asIso(value: unknown): string | null {
  if (value == null) return null
  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function asInt(value: unknown): number | null {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function blank(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text : null
}
