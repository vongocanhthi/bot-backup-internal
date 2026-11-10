import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Db } from '../lib/db'
import { splitSql } from './sql'

export async function migrate(db: Db): Promise<string[]> {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`)
  const dir = path.join(process.cwd(), 'migrations')
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
  const applied: string[] = []
  for (const file of files) {
    const existing = await db.query(`SELECT id FROM schema_migrations WHERE id = $1`, [file])
    if (existing.rows.length > 0) continue
    const sql = readFileSync(path.join(dir, file), 'utf8')
    const statements = splitSql(sql)
    await db.transaction(async (tx) => {
      for (const statement of statements) {
        await tx.query(statement)
      }
      await tx.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [file])
    })
    applied.push(file)
  }
  return applied
}
