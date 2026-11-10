'use client'

import { useState } from 'react'

export function CopyButton({
  text,
  url,
  label = 'Sao chép',
}: {
  text?: string
  url?: string
  label?: string
}) {
  const [message, setMessage] = useState('')

  async function onClick() {
    try {
      let value = text ?? ''
      if (!value && url) {
        const response = await fetch(url)
        if (response.status === 401) {
          window.location.assign('/login')
          return
        }
        if (!response.ok) throw new Error('fetch')
        value = await response.text()
      }
      if (!value) throw new Error('empty')
      await navigator.clipboard.writeText(value)
      setMessage('Đã sao chép')
    } catch {
      setMessage('Không sao chép được. Hãy dùng Tải .txt.')
    }
  }

  return (
    <span className="actions">
      <button type="button" className="secondary" onClick={onClick}>
        {label}
      </button>
      {message ? <span className="muted">{message}</span> : null}
    </span>
  )
}
