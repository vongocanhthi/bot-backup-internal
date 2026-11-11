import { Pool } from 'pg'
import type { Db } from '../lib/db'
import { HttpError } from '../lib/http-error'

const globalPool = globalThis as unknown as { __qlkPool?: Pool }

function normalize(params?: unknown[]) {
  return (params ?? []).map((value) => (value === undefined ? null : value))
}

export function poolConfig(url: string) {
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url)
  return {
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 10_000,
    ssl: local ? undefined : { rejectUnauthorized: false },
  }
}

export function getPool(): Pool {
  if (typeof window !== 'undefined') {
    throw new Error('Database không được dùng trên trình duyệt.')
  }
  const url = process.env.DATABASE_URL
  if (!url) throw new HttpError('Chưa cấu hình DATABASE_URL.', 500)
  globalPool.__qlkPool ??= new Pool(poolConfig(url))
  return globalPool.__qlkPool
}

export function getDb(): Db {
  const pool = getPool()
  const db: Db = {
    query: async (text, params) => {
      const result = await pool.query(text, normalize(params))
      return { rows: result.rows }
    },
    transaction: async (fn) => {
      const client = await pool.connect()
      const tx: Db = {
        query: async (text, params) => {
          const result = await client.query(text, normalize(params))
          return { rows: result.rows }
        },
        transaction: (inner) => inner(tx),
      }
      try {
        await client.query('BEGIN')
        const result = await fn(tx)
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
  }
  return db
}

export async function closeDb(): Promise<void> {
  if (!globalPool.__qlkPool) return
  await globalPool.__qlkPool.end()
  globalPool.__qlkPool = undefined
}
