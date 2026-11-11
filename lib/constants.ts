export const SESSION_COOKIE = 'qlk_session'
export const SESSION_HOURS = 12
export const MIN_PASSWORD_LENGTH = 10
export const MAX_PASSWORD_LENGTH = 200
export const LOGIN_WINDOW_MINUTES = 15
export const LOGIN_EMAIL_LIMIT = 5
export const LOGIN_IP_LIMIT = 30
export const DEFAULT_BOOTSTRAP_EMAIL = 'anhthi199x@gmail.com'
export const TZ = 'Asia/Saigon'
export const BACKUP_FORMAT = 'qlk-backup'
export const BACKUP_VERSION = 3
export const RESTORE_CONFIRM = 'KHOI PHUC'
export const IMPORT_TOKEN_PREFIX = 'qlkimp_'

export const PLATFORMS = ['facebook', 'youtube', 'tiktok', 'x'] as const
export const POSTING_SERVICES = ['buffer', 'x', 'schedule-n-chill', 'postiz'] as const
export const BUFFER_CONNECTIONS = ['anhthi199x', 'anhthimxh', 'anhthimusics', 'voanhviet77', 'yenkiem2000'] as const
export const IMAGE_KINDS = ['front', 'full_body', 'expression', 'other'] as const

export type Platform = (typeof PLATFORMS)[number]
export type PostingService = (typeof POSTING_SERVICES)[number]
export type BufferConnection = (typeof BUFFER_CONNECTIONS)[number]
export type ImageKind = (typeof IMAGE_KINDS)[number]
