'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Bot } from '../lib/types'
import { sendJson } from './api'

export function BotEditor({ bot, csrf }: { bot: Bot; csrf: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    try {
      await sendJson(`/api/bots/${encodeURIComponent(bot.id)}`, 'PATCH', csrf, {
        name: form.get('name'),
        title: form.get('title'),
        prompt: form.get('prompt'),
        notes: form.get('notes'),
        settings: form.get('settings'),
      })
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="bot-name">Tên</label>
        <input id="bot-name" name="name" defaultValue={bot.name} required />
      </div>
      <div className="field">
        <label htmlFor="bot-title">Tiêu đề</label>
        <input id="bot-title" name="title" defaultValue={bot.title} required />
      </div>
      <div className="field">
        <label htmlFor="bot-prompt">Nội dung cấu hình</label>
        <textarea id="bot-prompt" name="prompt" defaultValue={bot.prompt} required />
      </div>
      <div className="field">
        <label htmlFor="bot-notes">Ghi chú</label>
        <textarea id="bot-notes" name="notes" defaultValue={bot.notes ?? ''} />
      </div>
      <div className="field">
        <label htmlFor="bot-settings">Cài đặt (JSON)</label>
        <textarea
          id="bot-settings"
          name="settings"
          defaultValue={Object.keys(bot.settings).length ? JSON.stringify(bot.settings, null, 2) : ''}
        />
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        Lưu cấu hình
      </button>
    </form>
  )
}

export function NewBotForm({ csrf }: { csrf: string }) {
  const router = useRouter()
  const [error, setError] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      const result = (await sendJson('/api/bots', 'POST', csrf, Object.fromEntries(form.entries()))) as {
        bot: Bot
      }
      router.push(`/bot/${result.bot.id}`)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tạo được bot.')
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <h2>Thêm bot</h2>
      <div className="field">
        <label htmlFor="new-bot-id">Mã bot ổn định</label>
        <input id="new-bot-id" name="id" required />
      </div>
      <div className="field">
        <label htmlFor="new-bot-name">Tên</label>
        <input id="new-bot-name" name="name" required />
      </div>
      <div className="field">
        <label htmlFor="new-bot-title">Tiêu đề</label>
        <input id="new-bot-title" name="title" required />
      </div>
      <div className="field">
        <label htmlFor="new-bot-prompt">Nội dung</label>
        <textarea id="new-bot-prompt" name="prompt" required />
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Tạo bot</button>
    </form>
  )
}
