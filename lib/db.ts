export type Db = {
  query: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>
  transaction: <T>(fn: (db: Db) => Promise<T>) => Promise<T>
}
