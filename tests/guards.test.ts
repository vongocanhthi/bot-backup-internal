import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { assertPublicHttpsUrl } from '../lib/urls'
import { HttpError } from '../lib/http-error'
import { uploadToImgbb } from '../server/imgbb'

const adminRoutes = [
  'app/api/admins/route.ts',
  'app/api/admins/[id]/route.ts',
  'app/api/channels/route.ts',
  'app/api/channels/[code]/route.ts',
  'app/api/slots/route.ts',
  'app/api/slots/[id]/route.ts',
  'app/api/snapshots/route.ts',
  'app/api/import-tokens/route.ts',
  'app/api/import-tokens/[id]/route.ts',
  'app/api/bots/route.ts',
  'app/api/bots/[id]/route.ts',
  'app/api/characters/route.ts',
  'app/api/characters/[id]/route.ts',
  'app/api/characters/[id]/images/route.ts',
  'app/api/characters/[id]/voice/route.ts',
  'app/api/characters/[id]/sources/route.ts',
  'app/api/characters/[id]/sources/[fileId]/route.ts',
  'app/api/character-images/[id]/route.ts',
  'app/api/backup/restore/route.ts',
  'app/api/api-keys/route.ts',
  'app/api/api-keys/[id]/route.ts',
]

test('mutating admin routes check an admin session and csrf', () => {
  for (const file of adminRoutes) {
    const source = readFileSync(file, 'utf8')
    assert.match(source, /guardMutation\(req, \{ admin: true \}\)/, file)
  }
  const password = readFileSync('app/api/auth/password/route.ts', 'utf8')
  assert.match(password, /guardMutation\(req\)/)
  assert.equal(password.includes('admin: true'), false)
  const backup = readFileSync('app/api/backup/route.ts', 'utf8')
  assert.match(backup, /guardRead\(req, \{ admin: true \}\)/)
})

test('snapshot import never calls Buffer', () => {
  for (const file of ['server/snapshots.ts', 'app/api/import/route.ts', 'app/api/snapshots/route.ts']) {
    const source = readFileSync(file, 'utf8')
    assert.equal(/buffer\.com|api\.buffer/i.test(source), false, file)
  }
  const route = readFileSync('app/api/import/route.ts', 'utf8')
  assert.match(route, /authenticateImportToken/)
  assert.match(route, /ingestSnapshot/)
})

test('imgbb key stays on the server and private urls are rejected', async () => {
  assert.throws(() => assertPublicHttpsUrl('http://example.com/a.png'), HttpError)
  assert.throws(() => assertPublicHttpsUrl('https://127.0.0.1/a.png'), HttpError)
  assert.throws(() => assertPublicHttpsUrl('https://169.254.169.254/latest'), HttpError)
  const ui = readFileSync('components/CharactersManager.tsx', 'utf8')
  assert.equal(ui.includes('IMGBB_API_KEY'), false)
  let seen = ''
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seen = String(input)
    return new Response(JSON.stringify({ data: { url: 'https://i.ibb.co/example/ok.png' } }), { status: 200 })
  }) as typeof fetch
  try {
    const url = await uploadToImgbb(Buffer.from('image'), { IMGBB_API_KEY: 'server-side-key' })
    assert.equal(url, 'https://i.ibb.co/example/ok.png')
    assert.match(seen, /server-side-key/)
    assert.match(seen, /api\.imgbb\.com/)
  } finally {
    globalThis.fetch = original
  }
})

test('repository examples do not commit a bootstrap password or imgbb key', () => {
  const example = readFileSync('.env.example', 'utf8')
  assert.match(example, /ADMIN_BOOTSTRAP_EMAIL=anhthi199x@gmail.com/)
  assert.match(example, /ADMIN_BOOTSTRAP_PASSWORD=\s*$/m)
  assert.match(example, /IMGBB_API_KEY=\s*$/m)
  assert.equal(example.includes('BEGIN '), false)
})
