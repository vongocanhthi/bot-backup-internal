export function splitSql(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  for (const line of sql.split('\n')) {
    if (line.trim().startsWith('--')) continue
    current += `${line}\n`
    if (line.trim().endsWith(';')) {
      const statement = current.trim().replace(/;\s*$/, '')
      if (statement) statements.push(statement)
      current = ''
    }
  }
  const rest = current.trim().replace(/;\s*$/, '')
  if (rest) statements.push(rest)
  return statements
}
