import { HttpError } from './http-error'

export function errorCode(error: unknown): string {
  return typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
}

export function isMissingApiKeysTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return errorCode(error) === '42P01' && /api_keys/i.test(message)
}

export function isMissingBotBackupColumns(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return errorCode(error) === '42703' && /settings|notes/i.test(message)
}

export function apiKeysUnavailable(): HttpError {
  return new HttpError('Chưa có bảng api_keys. Hãy chạy migration 004_api_keys.sql trước khi dùng khóa API.', 503)
}

export function botBackupColumnsUnavailable(): HttpError {
  return new HttpError('Database chưa có cột settings/notes của bot. Hãy chạy migration 004_api_keys.sql.', 503)
}
