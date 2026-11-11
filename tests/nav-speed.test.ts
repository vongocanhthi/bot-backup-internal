import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('management tabs prefetch and can show a pending state immediately', () => {
  const nav = readFileSync('components/Nav.tsx', 'utf8')
  assert.match(nav, /from 'next\/link'/)
  assert.match(nav, /useLinkStatus/)
  assert.match(nav, /prefetch/)
  assert.equal(nav.includes('<a '), false)
})

test('panel routes expose a loading skeleton so dynamic navigation is not blocked', () => {
  const loading = readFileSync('app/(panel)/loading.tsx', 'utf8')
  assert.match(loading, /data-loading/)
  assert.match(loading, /Đang mở trang/)
})

test('schedule view switches use client navigation', () => {
  const page = readFileSync('app/(panel)/page.tsx', 'utf8')
  assert.match(page, /<Link href="\/" prefetch/)
  assert.match(page, /<Link href="\/\?view=week" prefetch/)
  assert.equal(page.includes('<a href="/"'), false)
  assert.equal(page.includes('<a href="/?view=week"'), false)
})
