import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createChannel, getChannelByCode, updateChannel } from '../server/channels'
import { createTestDb } from './helpers'

let db: Awaited<ReturnType<typeof createTestDb>>['db']
let close: () => Promise<void>

before(async () => {
  const handle = await createTestDb()
  db = handle.db
  close = handle.close
})

after(async () => close())

test('renaming a channel keeps the stable code', async () => {
  const created = await createChannel(db, {
    name: 'Tên cũ',
    code: 'ma-on-dinh',
    platform: 'facebook',
    connectionLabel: 'anhthi199x',
  })
  assert.equal(created.code, 'ma-on-dinh')
  const renamed = await updateChannel(db, 'ma-on-dinh', {
    name: 'Tên hiển thị mới',
    code: 'ma-khac',
    platform: 'youtube',
  })
  assert.equal(renamed.code, 'ma-on-dinh')
  assert.equal(renamed.name, 'Tên hiển thị mới')
  assert.equal(renamed.platform, 'youtube')
  assert.equal(renamed.connectionLabel, 'anhthi199x')
  assert.equal((await getChannelByCode(db, 'ma-on-dinh'))?.name, 'Tên hiển thị mới')
  assert.equal(await getChannelByCode(db, 'ma-khac'), null)
})

test('a supplied duplicate code is rejected and a generated code stays after rename', async () => {
  await createChannel(db, { name: 'Kênh A', code: 'kenh-a' })
  await assert.rejects(() => createChannel(db, { name: 'Kênh B', code: 'kenh-a' }))
  const generated = await createChannel(db, { name: 'Mẹ Bỉm Thông Thái' })
  assert.equal(generated.code, 'me-bim-thong-thai')
  const renamed = await updateChannel(db, generated.code, { name: 'Tên khác hẳn' })
  assert.equal(renamed.code, 'me-bim-thong-thai')
})
