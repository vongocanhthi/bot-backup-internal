import type { ImageKind } from './constants'

export type UserPublic = {
  id: string
  email: string
  isAdmin: boolean
  disabled: boolean
  createdAt: string
}

export type SessionContext = {
  id: string
  csrfToken: string
  expiresAt: string
  user: UserPublic
}

export type Channel = {
  id: string
  code: string
  name: string
  platform: string | null
  postingService: string | null
  connectionLabel: string | null
  externalId: string | null
  platformExternalId: string | null
  externalUrl: string | null
  orgId: string | null
  notes: string | null
  botId: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type Slot = {
  id: string
  channelId: string
  channelCode: string
  channelName: string
  weekday: number | null
  timeLocal: string
  label: string | null
}

export type ApiKeyRecord = {
  id: string
  name: string
  prefix: string
  scope: string
  botId: string | null
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export type Bot = {
  id: string
  name: string
  title: string
  prompt: string
  createdAt: string
  updatedAt: string
}

export type CharacterImage = {
  id: string
  characterId: string
  kind: ImageKind
  label: string | null
  url: string
  createdAt: string
}

export type CharacterVoice = {
  name: string | null
  provider: string | null
  gender: string | null
  age: string | null
  accent: string | null
  speed: string | null
  pitch: string | null
  style: string | null
  sampleLine: string | null
  sample: { filename: string; contentType: string; byteSize: number } | null
}

export type CharacterSourceFile = {
  id: string
  characterId: string
  filename: string
  contentType: string
  byteSize: number
  note: string | null
  createdAt: string
}

export type Character = {
  id: string
  botId: string
  name: string
  appearance: string
  sortOrder: number
  images: CharacterImage[]
  voice: CharacterVoice
  sourceFiles: CharacterSourceFile[]
}

export type SnapshotMeta = {
  id: string
  importedAt: string
  source: string
  label: string | null
  importedByEmail: string | null
  postCount: number
}

export type PostItem = {
  id: string
  snapshotId: string
  channelCode: string | null
  channelName: string | null
  externalId: string | null
  title: string | null
  body: string | null
  status: string | null
  scheduledAt: string | null
  publishedAt: string | null
  platform: string | null
  service: string | null
}

export type ImportTokenMeta = {
  id: string
  name: string
  tokenPrefix: string
  revoked: boolean
  lastUsedAt: string | null
  createdAt: string
}
