export function parseBotIdentity(text: string): { name: string; title: string } {
  const line = (text.split(/\r?\n/, 1)[0] ?? '').trim()
  const quoted = line.match(/^Bạn là (?:bot\s+)?"([^"]+)"/)
  if (quoted) {
    const name = quoted[1].trim()
    return { name, title: name }
  }
  const body = line.replace(/^Bạn là\s+/, '')
  const firstSentence = body.split(/\.(?:\s|$)/)[0]?.trim() ?? body
  const withoutDash = firstSentence.split(' — ')[0]?.trim() ?? firstSentence
  const paren = withoutDash.match(/^(.*?)\s*(\([^)]*\))\s*$/)
  if (paren?.[1]?.trim()) {
    const name = paren[1].trim()
    const extra = paren[2]
    const title = extra.length <= 30 ? `${name} ${extra}` : name
    return { name, title }
  }
  return { name: withoutDash, title: withoutDash }
}
