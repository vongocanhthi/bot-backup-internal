import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseBotIdentity } from '../lib/bot-identity'
import { characterSeed, channelSeed, slotSeed } from '../seed/catalog'
import { ensureBootstrapAdmin } from '../server/auth'
import { migrate } from '../server/migrate'
import { closeDb, getDb } from '../server/pool'
import { loadEnv } from './load-env'

loadEnv()
const db = getDb()

try {
  await migrate(db)
  const dir = path.join(process.cwd(), 'seed', 'bots')
  const files = readdirSync(dir).filter((file) => file.endsWith('.txt')).sort()
  if (files.length !== 10) {
    throw new Error(`Cần đúng 10 file cấu hình bot, đang có ${files.length}.`)
  }
  const overwrite = process.env.SEED_OVERWRITE === '1'
  for (const file of files) {
    const id = file.replace(/\.txt$/, '')
    const prompt = readFileSync(path.join(dir, file), 'utf8').trim()
    const identity = parseBotIdentity(prompt)
    if (overwrite) {
      await db.query(
        `INSERT INTO bots (id, name, title, prompt) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, prompt = EXCLUDED.prompt, updated_at = now()`,
        [id, identity.name, identity.title, prompt],
      )
    } else {
      await db.query(
        `INSERT INTO bots (id, name, title, prompt) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [id, identity.name, identity.title, prompt],
      )
    }
  }
  for (const channel of channelSeed) {
    await db.query(
      `INSERT INTO channels (
        id, code, name, platform, posting_service, connection_label, external_id,
        platform_external_id, external_url, org_id, notes, bot_id, active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (code) DO NOTHING`,
      [
        randomUUID(),
        channel.code,
        channel.name,
        channel.platform,
        channel.postingService,
        channel.connectionLabel,
        channel.externalId,
        channel.platformExternalId,
        channel.externalUrl,
        channel.orgId,
        channel.notes,
        channel.botId,
        channel.active,
      ],
    )
  }
  for (const group of slotSeed) {
    const channel = await db.query<{ id: string }>(`SELECT id FROM channels WHERE code = $1`, [group.channelCode])
    const channelId = channel.rows[0]?.id
    if (!channelId) continue
    const count = await db.query<{ n: number | string }>(`SELECT count(*) AS n FROM weekly_slots WHERE channel_id = $1`, [
      channelId,
    ])
    if (Number(count.rows[0]?.n ?? 0) > 0) continue
    for (const item of group.items) {
      await db.query(
        `INSERT INTO weekly_slots (id, channel_id, weekday, time_local, label) VALUES ($1, $2, NULL, $3, $4)`,
        [randomUUID(), channelId, item.time, item.label],
      )
    }
  }
  for (const character of characterSeed) {
    const existing = await db.query(`SELECT id FROM characters WHERE bot_id = $1 AND name = $2`, [
      character.botId,
      character.name,
    ])
    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE characters
         SET voice_name = $3, voice_provider = $4, voice_style = $5, updated_at = now()
         WHERE bot_id = $1 AND name = $2 AND voice_name IS NULL`,
        [character.botId, character.name, character.voiceName, character.voiceProvider, character.voiceStyle],
      )
      continue
    }
    await db.query(
      `INSERT INTO characters (id, bot_id, name, appearance, sort_order, voice_name, voice_provider, voice_style)
       VALUES ($1, $2, $3, $4, 0, $5, $6, $7)`,
      [
        randomUUID(),
        character.botId,
        character.name,
        character.appearance,
        character.voiceName,
        character.voiceProvider,
        character.voiceStyle,
      ],
    )
  }
  const boot = await ensureBootstrapAdmin(db)
  console.log(
    boot.bootstrapped
      ? 'Đã seed dữ liệu và tạo quản trị viên đầu tiên.'
      : 'Đã seed dữ liệu. Quản trị viên chỉ được tạo khi chưa có admin hoạt động và đã đặt ADMIN_BOOTSTRAP_PASSWORD.',
  )
} finally {
  await closeDb()
}
