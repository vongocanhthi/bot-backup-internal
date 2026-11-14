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
      await writeClipboard(value)
      setMessage('Đã sao chép')
    } catch {
      setMessage('Không sao chép được. Hãy bôi đen rồi sao chép.')
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

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Use the selection fallback when the browser blocks the async clipboard.
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
