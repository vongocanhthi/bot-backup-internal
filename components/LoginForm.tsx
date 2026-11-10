'use client'

import { useId, useState } from 'react'

export function LoginForm({ expired }: { expired: boolean }) {
  const emailId = useId()
  const passwordId = useId()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    })
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      setError(data.error || 'Không đăng nhập được.')
      setPending(false)
      return
    }
    window.location.assign('/')
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      {expired ? <p className="error">Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.</p> : null}
      <div className="field">
        <label htmlFor={emailId}>Email</label>
        <input id={emailId} name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor={passwordId}>Mật khẩu</label>
        <input id={passwordId} name="password" type="password" autoComplete="current-password" required />
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
    </form>
  )
}
