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
