'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SAMPLE_SNAPSHOT } from '../lib/sample'
import type { ImportTokenMeta } from '../lib/types'
import { sendJson } from './api'
import { CopyButton } from './CopyButton'

export function SnapshotTools({ csrf, tokens }: { csrf: string; tokens: ImportTokenMeta[] }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [token, setToken] = useState('')
  const [pending, setPending] = useState(false)

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) {
      setError('Chọn một tệp JSON.')
      return
    }
    setPending(true)
    setError('')
    try {
      const payload = JSON.parse(await file.text()) as Record<string, unknown>
      if (form.get('label')) payload.label = String(form.get('label'))
      await sendJson('/api/snapshots', 'POST', csrf, payload)
      setMessage('Đã nhập snapshot. Dữ liệu chỉ lưu trong hệ thống, không gửi lên Buffer.')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không nhập được snapshot.')
    } finally {
      setPending(false)
    }
  }

  async function createToken(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    try {
      const created = (await sendJson('/api/import-tokens', 'POST', csrf, { name: form.get('name') })) as {
        token?: string
      }
      setToken(created.token || '')
      setMessage('Mã chỉ hiện một lần. Hãy sao chép ngay.')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tạo được mã.')
    } finally {
      setPending(false)
    }
  }

  async function revoke(id: string) {
    if (!window.confirm('Thu hồi mã nhập này?')) return
    setError('')
    try {
      await sendJson(`/api/import-tokens/${id}`, 'DELETE', csrf)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thu hồi được.')
    }
  }

  return (
    <details>
      <summary>Nhập snapshot và mã nhập</summary>
      <div className="stack">
        <p>
          Việc nhập chỉ lưu bản sao trong hệ thống này. Không tạo, không sửa và không xóa bài trên Buffer hay mạng xã hội.
        </p>
        <form className="form-grid" onSubmit={upload}>
          <div className="field">
            <label htmlFor="snapshot-file">Tệp JSON</label>
            <input id="snapshot-file" name="file" type="file" accept="application/json,.json" required />
          </div>
          <div className="field">
            <label htmlFor="snapshot-label">Nhãn</label>
            <input id="snapshot-label" name="label" maxLength={200} />
          </div>
          <button type="submit" disabled={pending}>
            Nhập snapshot
          </button>
        </form>
        <pre className="export">{SAMPLE_SNAPSHOT}</pre>
        <form className="form-grid" onSubmit={createToken}>
          <div className="field">
            <label htmlFor="token-name">Tên mã nhập API</label>
            <input id="token-name" name="name" required maxLength={80} />
          </div>
          <button type="submit" className="secondary" disabled={pending}>
            Tạo mã
          </button>
        </form>
        {token ? (
          <p>
            <code>{token}</code> <CopyButton text={token} label="Sao chép mã" />
          </p>
        ) : null}
        <ul>
          {tokens.map((item) => (
            <li key={item.id}>
              {item.name} · <code>{item.tokenPrefix}…</code> · {item.revoked ? 'Đã thu hồi' : 'Còn hiệu lực'}
              {item.revoked ? null : (
                <button type="button" className="secondary" onClick={() => revoke(item.id)}>
                  Thu hồi
                </button>
              )}
            </li>
          ))}
        </ul>
        {message ? <p className="ok">{message}</p> : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </details>
  )
}
