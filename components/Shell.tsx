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
      <div className="app-frame">
        <aside className="sidebar">
          <div className="side-brand">
            <p className="eyebrow">Nội bộ</p>
            <p className="brand">Quản lý lịch kênh (nội bộ)</p>
            <p className="muted">
              {user.email} · {user.isAdmin ? 'Quản trị' : 'Chỉ xem'}
            </p>
          </div>
          <Nav isAdmin={user.isAdmin} />
          <LogoutButton csrf={csrf} />
        </aside>
        <div id="noi-dung" className="content">
          {children}
        </div>
      </div>
    </div>
  )
}
