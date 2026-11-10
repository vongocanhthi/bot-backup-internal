import type { Db } from '../lib/db'
import { eachDate, formatDayLabel, isoWeekday, saigonDate } from '../lib/time'
import type { PostItem, Slot, SnapshotMeta } from '../lib/types'
import { listChannels } from './channels'
import { listSlots } from './channels'
import { listPosts, listSnapshots } from './snapshots'

export async function getSchedule(
  db: Db,
  opts: { from: string; to: string; channelCode?: string | null; snapshotId?: string | null },
) {
  const [channels, slots, snapshots] = await Promise.all([
    listChannels(db),
    listSlots(db, null),
    listSnapshots(db),
  ])
  const snapshot = opts.snapshotId
    ? (snapshots.find((item) => item.id === opts.snapshotId) ?? snapshots[0] ?? null)
    : (snapshots[0] ?? null)
  const posts = snapshot ? await listPosts(db, snapshot.id) : []
  const channelCode = opts.channelCode || null
  const days = eachDate(opts.from, opts.to).map((date) => {
    const weekday = isoWeekday(date)
    return {
      date,
      label: formatDayLabel(date),
      slots: slots.filter((slot) => slotMatches(slot, weekday, channelCode)),
      posts: posts.filter((post) => postMatches(post, date, channelCode)),
    }
  })
  const channelPosts = channelCode ? posts.filter((post) => post.channelCode === channelCode) : []
  const weeklyTemplate = channelCode ? slots.filter((slot) => slot.channelCode === channelCode) : []
  const undated = posts.filter((post) => !post.scheduledAt && !post.publishedAt && (!channelCode || post.channelCode === channelCode))
  return {
    timezone: 'Asia/Saigon',
    snapshot,
    snapshots,
    channels,
    days,
    weeklyTemplate,
    channelPosts,
    undated,
  }
}

function slotMatches(slot: Slot, weekday: number, channelCode: string | null) {
  if (channelCode && slot.channelCode !== channelCode) return false
  return slot.weekday == null || slot.weekday === weekday
}

function postMatches(post: PostItem, date: string, channelCode: string | null) {
  if (channelCode && post.channelCode !== channelCode) return false
  const when = post.scheduledAt || post.publishedAt
  if (!when) return false
  return saigonDate(when) === date
}

export type ScheduleData = Awaited<ReturnType<typeof getSchedule>>
export type ScheduleSnapshot = SnapshotMeta | null
