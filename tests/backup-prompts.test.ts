import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BackupPrompts } from '../components/BackupPrompts'
import { BACKUP_PROMPTS, BACKUP_PROMPT_STEPS, fillBackupPrompt } from '../lib/backup-prompts'

test('placeholders stay until a bot name or folder slug is filled', () => {
  const source = BACKUP_PROMPTS[0]?.body ?? ''
  assert.match(fillBackupPrompt(source), /\{TEN_BOT\}/)
  assert.match(fillBackupPrompt(source, { tenBot: '   ', slug: '' }), /\/workspace\/\{SLUG\}-backup\//)
  const filled = fillBackupPrompt(source, { tenBot: 'Cam Tò Mò Bot', slug: 'Cam Tò Mò' })
  assert.match(filled, /Bạn là Cam Tò Mò Bot\./)
  assert.match(filled, /\/workspace\/cam-to-mo-backup\//)
  assert.equal(filled.includes('{TEN_BOT}'), false)
  assert.equal(filled.includes('{SLUG}'), false)
  assert.match(fillBackupPrompt(BACKUP_PROMPTS[1]?.body ?? '', { tenBot: 'Bot cũ' }), /Bạn là Bot cũ\./)
})

test('the prompt page renders both templates and the step order', () => {
  const html = renderToStaticMarkup(createElement(BackupPrompts))
  assert.match(html, /Thứ tự làm/)
  for (const step of BACKUP_PROMPT_STEPS) assert.match(html, new RegExp(step.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(html, /Prompt sao lưu bot lên web/)
  assert.match(html, /Prompt dừng bot cũ/)
  assert.match(html, /Sao chép/)
  assert.match(html, /\{TEN_BOT\}/)
  assert.match(html, /\/workspace\/\{SLUG\}-backup\//)
  assert.match(html, /SendToAgent/)
  assert.match(html, /chuột phải → Delete/)
  assert.match(html, /NGUON_TU_LIEU\.md/)
  assert.match(html, /Prompt sao lưu qua API/)
  assert.match(html, /BACKUP_API_KEY/)
  assert.match(html, /x-vercel-protection-bypass/)
  assert.equal(/bbk_[A-Za-z0-9_-]{20,}/.test(html), false)
  const page = readFileSync('app/(panel)/prompt-sao-luu/page.tsx', 'utf8')
  assert.match(page, /<h1>Prompt sao lưu<\/h1>/)
  assert.match(page, /<BackupPrompts/)
  const nav = readFileSync('components/Nav.tsx', 'utf8')
  assert.match(nav, /href: '\/prompt-sao-luu', label: 'Prompt sao lưu'/)
  const component = readFileSync('components/BackupPrompts.tsx', 'utf8')
  assert.match(component, /navigator\.clipboard/)
  assert.match(component, /execCommand\('copy'\)/)
  assert.match(component, /Đã sao chép/)
})
