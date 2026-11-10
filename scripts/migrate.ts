import { loadEnv } from './load-env'
import { closeDb, getDb } from '../server/pool'
import { migrate } from '../server/migrate'

loadEnv()

try {
  const applied = await migrate(getDb())
  console.log(applied.length ? `Đã áp dụng: ${applied.join(', ')}` : 'Schema đã cập nhật.')
} finally {
  await closeDb()
}
