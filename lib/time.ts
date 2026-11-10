import { TZ } from './constants'

const WEEKDAYS = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']

export function saigonDate(value: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export function todayInSaigon(now = new Date()): string {
  return saigonDate(now)
}

export function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return next.toISOString().slice(0, 10)
}

export function isoWeekday(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return jsDay === 0 ? 7 : jsDay
}

export function formatDayLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  const year = isoDate.slice(0, 4)
  return `${WEEKDAYS[isoWeekday(isoDate)]}, ${day}/${month}/${year}`
}

export function weekdayLabel(weekday: number | null): string {
  if (weekday == null) return 'Mỗi ngày'
  return WEEKDAYS[weekday] ?? 'Không rõ'
}

export function formatTimeInSaigon(value: Date | string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
}

export function formatDateTimeInSaigon(value: Date | string): string {
  const date = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
  return `${date} ${formatTimeInSaigon(value)}`
}

export function fileStamp(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}${get('month')}${get('day')}-${get('hour')}${get('minute')}`
}

export function eachDate(from: string, to: string): string[] {
  const dates: string[] = []
  let cursor = from
  while (cursor <= to && dates.length < 31) {
    dates.push(cursor)
    cursor = addIsoDays(cursor, 1)
  }
  return dates
}
