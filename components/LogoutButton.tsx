'use client'

import { useState } from 'react'
import { sendJson } from './api'

export function LogoutButton({ csrf }: { csrf: string }) {
  const [pending, setPending] = useState(false)

  async function logout() {
    setPending(true)
    try {
      await sendJson('/api/auth/logout', 'POST', csrf)
      window.location.assign('/login')
    } catch {
      setPending(false)
    }
  }

  return (
    <button type="button" className="secondary" onClick={logout} disabled={pending}>
      Đăng xuất
    </button>
  )
}
