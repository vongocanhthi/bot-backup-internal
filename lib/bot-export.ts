import { ACCENT_LABELS, GENDER_LABELS, type VoiceAccent, type VoiceGender } from './voice'
import { kindLabel } from './labels'

export const CHARACTER_INSTRUCTION =
  'Luôn dùng các ảnh tham chiếu dưới đây cho đúng nhân vật. Không đổi ngoại hình đã chốt (tóc, trang phục, màu sắc, phong cách vẽ). Khi dựng hình hoặc làm video, bám mô tả và URL ảnh này để nhân vật trông giống nhau trên mọi tài khoản.'

export const VOICE_INSTRUCTION =
  'Luôn dùng đúng giọng đã chốt cho từng nhân vật (tên giọng, engine, giới tính, tuổi, vùng miền, tốc độ, cao độ, cách nói). Không đổi giọng giữa các video. Nếu có file nghe mẫu, file đó nằm trong gói nhân vật và bản sao lưu.'

export type ExportVoice = {
  name: string | null
  provider: string | null
  gender: string | null
  age: string | null
  accent: string | null
  speed: string | null
  pitch: string | null
  style: string | null
  sampleLine: string | null
  sampleFile: string | null
}

export type ExportImage = {
  kind: string
  label: string | null
  url: string
}

export type ExportCharacter = {
  name: string
  appearance: string
  images: ExportImage[]
  voice?: ExportVoice | null
  sourceFiles?: { filename: string; note: string | null }[]
}

export function renderBotExport(
  bot: { id: string; name: string; title: string; prompt: string },
  characters: ExportCharacter[],
): string {
  const lines = [bot.prompt.trimEnd(), '', '===== NHÂN VẬT =====', CHARACTER_INSTRUCTION, VOICE_INSTRUCTION, '']
  if (characters.length === 0) {
    lines.push('Chưa có nhân vật.')
    return `${lines.join('\n').trimEnd()}\n`
  }
  for (const character of characters) {
    lines.push(`## ${character.name}`)
    lines.push(character.appearance.trim())
    lines.push('')
    if (character.images.length === 0) {
      lines.push('Ảnh tham chiếu: chưa có.')
    } else {
      lines.push('Ảnh tham chiếu:')
      for (const image of character.images) {
        const name = image.label ? `${kindLabel(image.kind)} (${image.label})` : kindLabel(image.kind)
        lines.push(`- ${name}: ${image.url}`)
      }
    }
    lines.push('')
    lines.push(...voiceLines(character.voice))
    lines.push('')
    lines.push(...sourceLines(character.sourceFiles))
    lines.push('')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

function voiceLines(voice: ExportVoice | null | undefined): string[] {
  if (!voice || !hasVoice(voice)) return ['Giọng nói: chưa chốt.']
  const lines = ['Giọng nói:']
  if (voice.name) lines.push(`- Tên giọng: ${voice.name}`)
  if (voice.provider) lines.push(`- Engine: ${voice.provider}`)
  if (voice.gender) lines.push(`- Giới tính: ${GENDER_LABELS[voice.gender as VoiceGender] ?? voice.gender}`)
  if (voice.age) lines.push(`- Tuổi: ${voice.age}`)
  if (voice.accent) lines.push(`- Vùng miền: ${ACCENT_LABELS[voice.accent as VoiceAccent] ?? voice.accent}`)
  if (voice.speed) lines.push(`- Tốc độ: ${voice.speed}`)
  if (voice.pitch) lines.push(`- Cao độ: ${voice.pitch}`)
  if (voice.style) lines.push(`- Cách nói: ${voice.style}`)
  if (voice.sampleLine) lines.push(`- Câu mẫu: ${voice.sampleLine}`)
  if (voice.sampleFile) lines.push(`- File nghe mẫu: ${voice.sampleFile}`)
  return lines
}

function sourceLines(files: { filename: string; note: string | null }[] | undefined): string[] {
  if (!files || files.length === 0) return ['File gốc: chưa có.']
  const lines = ['File gốc (Remotion/SVG/sprite):']
  for (const file of files) {
    lines.push(file.note ? `- ${file.filename} — ${file.note}` : `- ${file.filename}`)
  }
  return lines
}

function hasVoice(voice: ExportVoice): boolean {
  return Boolean(
    voice.name ||
      voice.provider ||
      voice.gender ||
      voice.age ||
      voice.accent ||
      voice.speed ||
      voice.pitch ||
      voice.style ||
      voice.sampleLine ||
      voice.sampleFile,
  )
}

export function renderCharacterMarkdown(character: ExportCharacter): string {
  const lines = [
    `# ${character.name}`,
    '',
    character.appearance.trim(),
    '',
    CHARACTER_INSTRUCTION,
    VOICE_INSTRUCTION,
    '',
    ...voiceLines(character.voice),
    '',
    ...sourceLines(character.sourceFiles),
    '',
    '## Ảnh tham chiếu',
  ]
  if (character.images.length === 0) {
    lines.push('Chưa có ảnh tham chiếu.')
  } else {
    for (const image of character.images) {
      const name = image.label ? `${kindLabel(image.kind)} (${image.label})` : kindLabel(image.kind)
      lines.push(`- ${name}: ${image.url}`)
    }
  }
  return `${lines.join('\n').trimEnd()}\n`
}
