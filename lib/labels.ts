import type { ImageKind } from './constants'

export const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
}

export const SERVICE_LABELS: Record<string, string> = {
  buffer: 'Buffer',
  x: 'X (x.com)',
  'schedule-n-chill': 'Schedule n Chill',
  postiz: 'Postiz',
}

export const CONNECTION_LABELS: Record<string, string> = {
  anhthi199x: 'Buffer · anhthi199x',
  anhthimxh: 'Buffer · anhthimxh',
}

export const KIND_LABELS: Record<ImageKind, string> = {
  front: 'Mặt trước',
  full_body: 'Toàn thân',
  expression: 'Biểu cảm',
  other: 'Khác',
}

export function platformLabel(value: string | null): string {
  if (!value) return 'Chưa rõ'
  return PLATFORM_LABELS[value] ?? value
}

export function serviceLabel(value: string | null): string {
  if (!value) return 'Chưa rõ'
  return SERVICE_LABELS[value] ?? value
}

export function connectionLabel(value: string | null): string {
  if (!value) return 'Chưa gán kết nối'
  return CONNECTION_LABELS[value] ?? value
}

export function kindLabel(value: string): string {
  if (value in KIND_LABELS) return KIND_LABELS[value as ImageKind]
  return value
}

export function statusLabel(status: string | null): string {
  if (!status) return 'Không rõ trạng thái'
  const map: Record<string, string> = {
    scheduled: 'Đã lên lịch',
    published: 'Đã đăng',
    sent: 'Đã đăng',
    draft: 'Nháp',
    error: 'Lỗi',
    failed: 'Lỗi',
  }
  return map[status] ?? status
}
