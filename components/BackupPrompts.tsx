'use client'

import { useState } from 'react'
import { BACKUP_PROMPTS, BACKUP_PROMPT_STEPS, fillBackupPrompt } from '../lib/backup-prompts'

export function BackupPrompts() {
  const [tenBot, setTenBot] = useState('')
  const [slug, setSlug] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [copyError, setCopyError] = useState('')

  async function copyPrompt(id: string, value: string) {
    setCopyError('')
    try {
      await writeClipboard(value)
      setCopiedId(id)
    } catch {
      setCopiedId('')
      setCopyError('Không sao chép được. Hãy bôi đen đoạn prompt rồi sao chép thủ công.')
    }
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h2>Thứ tự làm</h2>
        <ol className="prompt-steps">
          {BACKUP_PROMPT_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section className="card stack">
        <h2>Điền chỗ trống</h2>
        <p className="muted">Để trống thì bản hiển thị và bản sao chép vẫn giữ {'{TEN_BOT}'} và {'{SLUG}'}.</p>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="ten-bot">Tên bot</label>
            <input
              id="ten-bot"
              value={tenBot}
              onChange={(event) => {
                setTenBot(event.target.value)
                setCopiedId('')
              }}
              placeholder="{TEN_BOT}"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="slug-bot">Slug thư mục</label>
            <input
              id="slug-bot"
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value)
                setCopiedId('')
              }}
              placeholder="{SLUG}"
              autoComplete="off"
            />
          </div>
        </div>
      </section>
      {BACKUP_PROMPTS.map((prompt) => {
        const text = fillBackupPrompt(prompt.body, { tenBot, slug })
        return (
          <article className="card stack" key={prompt.id}>
            <div className="row">
              <h2>{prompt.title}</h2>
              <button type="button" aria-label={`Sao chép ${prompt.title}`} onClick={() => copyPrompt(prompt.id, text)}>
                Sao chép
              </button>
              {copiedId === prompt.id ? (
                <span className="ok" role="status">
                  Đã sao chép
                </span>
              ) : null}
            </div>
            <pre className="export">{text}</pre>
          </article>
        )
      })}
      {copyError ? (
        <p className="error" role="alert">
          {copyError}
        </p>
      ) : null}
    </div>
  )
}

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Fall through to the selection fallback when the browser blocks the async clipboard.
    }
  }
  const area = document.createElement('textarea')
  area.value = value
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.appendChild(area)
  area.select()
  const copied = document.execCommand('copy')
  area.remove()
  if (!copied) throw new Error('copy failed')
}
