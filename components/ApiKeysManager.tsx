'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateTimeInSaigon } from '../lib/time'
import type { ApiKeyRecord } from '../lib/types'
import { CopyButton } from './CopyButton'
import { sendJson } from './api'

export function ApiKeysManager({
  csrf,
  keys,
  bots,
  notice,
}: {
  csrf: string
  keys: ApiKeyRecord[]
  bots: { id: string; name: string }[]
  notice: string
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{ name: string; key: string } | null>(null)
  const [pendingKeys, setPendingKeys] = useState<ApiKeyRecord[]>([])
  const names = new Map(bots.map((bot) => [bot.id, bot.name]))
  const visibleKeys = [...pendingKeys.filter((item) => !keys.some((key) => key.id === item.id)), ...keys]

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formEl = event.currentTarget
    const form = new FormData(formEl)
    setError('')
    try {
      const data = (await sendJson('/api/api-keys', 'POST', csrf, {
        name: form.get('name'),
        botId: form.get('botId'),
      })) as { key?: string; name?: string; id?: string; prefix?: string; botId?: string | null }
      if (!data.key) throw new Error('Máy chủ không trả khóa.')
      const name = data.name || String(form.get('name') || '')
      setCreated({ name, key: data.key })
      if (data.id && data.prefix) {
        setPendingKeys((current) => [
          {
            id: data.id as string,
            name,
            prefix: data.prefix as string,
            scope: 'backup',
            botId: data.botId || null,
            createdAt: new Date().toISOString(),
            lastUsedAt: null,
            revokedAt: null,
          },
          ...current,
        ])
      }
      formEl?.reset()
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tạo được khóa.')
    }
  }

  async function revoke(id: string) {
    if (!window.confirm('Thu hồi khóa này? Bot đang dùng khóa sẽ không tải lên được nữa.')) return
    setError('')
    try {
      await sendJson(`/api/api-keys/${id}`, 'DELETE', csrf)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thu hồi được.')
    }
  }

  return (
    <div className="stack">
      {notice ? (
        <p className="error" role="alert">
          {notice}
        </p>
      ) : null}
      <form className="card stack" onSubmit={create}>
        <h2>Tạo khóa</h2>
        <div className="field">
          <label htmlFor="key-name">Tên</label>
          <input id="key-name" name="name" required maxLength={80} placeholder="Cam Tò Mò" />
        </div>
        <div className="field">
          <label htmlFor="key-bot">Bot (để trống nếu khóa ghi được mọi bot)</label>
          <select id="key-bot" name="botId" defaultValue="">
            <option value="">Mọi bot</option>
            {bots.map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Tạo khóa</button>
      </form>
      {created ? (
        <section className="card stack">
          <h2>Khóa mới</h2>
          <p className="error">Chỉ hiện một lần. Hãy sao chép và lưu ở nơi khác. Trang này không giữ phần sau của khóa.</p>
          <p>
            {created.name}: <code>{created.key}</code>
          </p>
          <CopyButton text={created.key} />
        </section>
      ) : null}
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Tiền tố</th>
              <th>Bot</th>
              <th>Tạo lúc</th>
              <th>Dùng lần cuối</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleKeys.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>
                  <code>{item.prefix}</code>
                </td>
                <td>{item.botId ? (names.get(item.botId) ?? item.botId) : 'Mọi bot'}</td>
                <td>{formatDateTimeInSaigon(item.createdAt)}</td>
                <td>{item.lastUsedAt ? formatDateTimeInSaigon(item.lastUsedAt) : 'Chưa dùng'}</td>
                <td>{item.revokedAt ? 'Đã thu hồi' : 'Đang dùng'}</td>
                <td>
                  {item.revokedAt ? null : (
                    <button type="button" className="danger" onClick={() => revoke(item.id)}>
                      Thu hồi
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleKeys.length === 0 ? <p>Chưa có khóa.</p> : null}
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
