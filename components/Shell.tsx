import type { ReactNode } from 'react'
import type { UserPublic } from '../lib/types'
import { LogoutButton } from './LogoutButton'
import { Nav } from './Nav'

export function Shell({
  user,
  csrf,
  children,
}: {
  user: UserPublic
  csrf: string
  children: ReactNode
}) {
  return (
    <div className="app-shell">
      <a className="skip" href="#noi-dung">
        Đến nội dung
      </a>
      <header className="topbar">
        <div>
          <p className="eyebrow">Nội bộ</p>
          <p className="brand">Quản lý lịch kênh (nội bộ)</p>
          <p className="muted">
            {user.email} · {user.isAdmin ? 'Quản trị' : 'Chỉ xem'}
          </p>
        </div>
        <LogoutButton csrf={csrf} />
      </header>
      <Nav isAdmin={user.isAdmin} />
      <div id="noi-dung" className="content">
        {children}
      </div>
    </div>
  )
}
