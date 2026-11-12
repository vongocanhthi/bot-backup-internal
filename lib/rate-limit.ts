import { HttpError } from './http-error'

type Bucket = { count: number; reset: number }

const buckets = new Map<string, Bucket>()

export function hitRateLimit(key: string, limit = 60, windowMs = 60_000, now = Date.now()) {
  const current = buckets.get(key)
  if (!current || current.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return
  }
  current.count += 1
  if (current.count > limit) throw new HttpError('Quá nhiều yêu cầu. Hãy thử lại sau một phút.', 429)
}

export function resetRateLimits() {
  buckets.clear()
}
