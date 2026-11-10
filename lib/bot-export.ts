import { kindLabel } from './labels'

export const CHARACTER_INSTRUCTION =
  'Luôn dùng các ảnh tham chiếu dưới đây cho đúng nhân vật. Không đổi ngoại hình đã chốt (tóc, trang phục, màu sắc, phong cách vẽ). Khi dựng hình hoặc làm video, bám mô tả và URL ảnh này để nhân vật trông giống nhau trên mọi tài khoản.'

export type ExportImage = {
  kind: string
  label: string | null
  url: string
}

export type ExportCharacter = {
  name: string
  appearance: string
  images: ExportImage[]
}

export function renderBotExport(
  bot: { id: string; name: string; title: string; prompt: string },
  characters: ExportCharacter[],
): string {
  const lines = [bot.prompt.trimEnd(), '', '===== NHÂN VẬT =====', CHARACTER_INSTRUCTION, '']
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
  }
  return `${lines.join('\n').trimEnd()}\n`
}

export function renderCharacterMarkdown(character: ExportCharacter): string {
  const lines = [`# ${character.name}`, '', character.appearance.trim(), '', CHARACTER_INSTRUCTION, '', '## Ảnh tham chiếu']
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
