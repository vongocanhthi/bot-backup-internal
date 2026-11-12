import { HttpError } from './http-error'

export const VOICE_GENDERS = ['nu', 'nam', 'khac'] as const
export const VOICE_ACCENTS = ['bac', 'trung', 'nam'] as const
export const VOICE_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'] as const
export const MAX_VOICE_BYTES = 4 * 1024 * 1024

export type VoiceGender = (typeof VOICE_GENDERS)[number]
export type VoiceAccent = (typeof VOICE_ACCENTS)[number]

export const GENDER_LABELS: Record<VoiceGender, string> = {
  nu: 'Nữ',
  nam: 'Nam',
  khac: 'Khác',
}

export const ACCENT_LABELS: Record<VoiceAccent, string> = {
  bac: 'Bắc',
  trung: 'Trung',
  nam: 'Nam',
}

export function extensionForAudio(contentType: string): string {
  if (contentType === 'audio/mpeg') return 'mp3'
  if (contentType === 'audio/wav') return 'wav'
  if (contentType === 'audio/webm') return 'webm'
  if (contentType === 'audio/ogg') return 'ogg'
  return 'm4a'
}

export function voiceFilePath(characterId: string, contentType: string): string {
  return `voices/${characterId}.${extensionForAudio(contentType)}`
}

export function isVoiceAudioType(value: string): boolean {
  return (VOICE_AUDIO_TYPES as readonly string[]).includes(value)
}

const BACKUP_VOICE = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
} as const

export function describeBackupVoice(filename: string, contentType: string, size: number): { filename: string; contentType: string } {
  const base = (filename.split(/[/\\]/).pop() ?? '').trim()
  const ext = base.split('.').pop()?.toLowerCase() ?? ''
  const type = contentType.toLowerCase()
  const fromExt = ext === 'mp3' || ext === 'wav' || ext === 'm4a' ? ext : null
  const fromType =
    type === 'audio/mpeg' ? 'mp3' : type === 'audio/wav' || type === 'audio/x-wav' ? 'wav' : type === 'audio/mp4' || type === 'audio/x-m4a' ? 'm4a' : null
  if (!fromExt && !fromType) throw new HttpError('File giọng phải là MP3, M4A hoặc WAV, tối đa 4 MB.', 400)
  if (fromExt && fromType && fromExt !== fromType) throw new HttpError('File giọng phải là MP3, M4A hoặc WAV, tối đa 4 MB.', 400)
  if (size <= 0 || size > MAX_VOICE_BYTES) throw new HttpError('File giọng phải lớn hơn 0 và không quá 4 MB.', 400)
  const kind = fromExt ?? fromType ?? 'mp3'
  return { filename: base.slice(0, 180) || `giong.${kind}`, contentType: BACKUP_VOICE[kind] }
}
