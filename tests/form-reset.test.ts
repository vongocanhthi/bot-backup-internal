import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const forms = [
  'components/ApiKeysManager.tsx',
  'components/AccountsManager.tsx',
  'components/CharactersManager.tsx',
  'components/ChannelManager.tsx',
  'components/SnapshotTools.tsx',
  'components/BotEditor.tsx',
  'components/BackupManager.tsx',
  'components/PasswordForm.tsx',
  'components/LoginForm.tsx',
]

test('forms do not reset currentTarget after an await', () => {
  for (const file of forms) {
    const source = readFileSync(file, 'utf8')
    assert.equal(source.includes('currentTarget.reset'), false, file)
    assert.equal(source.includes('currentTarget?.reset'), false, file)
  }
  const keys = readFileSync('components/ApiKeysManager.tsx', 'utf8')
  assert.match(keys, /const formEl = event\.currentTarget/)
  assert.match(keys, /formEl\?\.reset\(\)/)
  assert.match(keys, /setCreated\(/)
  assert.match(keys, /router\.refresh\(\)/)
  assert.match(keys, /Chỉ hiện một lần/)
})
