'use client'

import { useId, useState } from 'react'
import { sendJson } from './api'

export function PasswordForm({ csrf, email }: { csrf: string; email: string }) {
  const currentId = useId()
  const nextId = useId()
  const confirmId = useId()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next = String(form.get('next') || '')
    const confirm = String(form.get('confirm') || '')
    if (next !== confirm) {
      setError('Mật khẩu mới và phần xác nhận chưa khớp.')
      return
    }
    setPending(true)
    setError('')
    try {
      await sendJson('/api/auth/password', 'POST', csrf, {
        currentPassword: form.get('current'),
        newPassword: next,
      })
      window.location.assign('/login')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không đổi được mật khẩu.')
      setPending(false)
    }
  }

  return (
    <form className="stack card" onSubmit={onSubmit}>
      <p className="muted">
        Tài khoản: <strong>{email}</strong>. Sau khi đổi, mọi phiên sẽ kết thúc và bạn đăng nhập lại.
      </p>
      <div className="field">
        <label htmlFor={currentId}>Mật khẩu hiện tại</label>
        <input id={currentId} name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="field">
        <label htmlFor={nextId}>Mật khẩu mới</label>
        <input id={nextId} name="next" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      <div className="field">
        <label htmlFor={confirmId}>Nhập lại mật khẩu mới</label>
        <input id={confirmId} name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      <p className="muted">Tối thiểu 10 ký tự.</p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Đang lưu…' : 'Đổi mật khẩu'}
      </button>
    </form>
  )
}
