import bcrypt from 'bcryptjs'

export function bcryptCost(): number {
  const cost = Number(process.env.BCRYPT_COST || 12)
  if (!Number.isInteger(cost) || cost < 4 || cost > 15) return 12
  return cost
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, bcryptCost())
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

let dummy: Promise<string> | null = null

export function dummyPasswordHash(): Promise<string> {
  dummy ??= hashPassword('dummy-password-not-used')
  return dummy
}
