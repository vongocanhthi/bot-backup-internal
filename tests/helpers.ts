import { PGlite } from '@electric-sql/pglite'
import type { Db } from '../lib/db'
import { migrate } from '../server/migrate'

process.env.BCRYPT_COST = '4'

function normalize(params?: unknown[]) {
  return (params ?? []).map((value) => (value === undefined ? null : value))
}

export function adaptPglite(pg: PGlite): Db {
  return {
    query: async <T = Record<string, unknown>>(text: string, params?: unknown[]) => {
      const result = await pg.query<T>(text, normalize(params))
      return { rows: result.rows }
    },
    transaction: (fn) =>
      pg.transaction(async (tx) => {
        const inner: Db = {
          query: async <T = Record<string, unknown>>(text: string, params?: unknown[]) => {
            const result = await tx.query<T>(text, normalize(params))
            return { rows: result.rows }
          },
          transaction: (nested) => nested(inner),
        }
        return fn(inner)
      }),
  }
}

export async function createTestDb() {
  const pg = new PGlite()
  const db = adaptPglite(pg)
  await migrate(db)
  return { db, close: () => pg.close() }
}
