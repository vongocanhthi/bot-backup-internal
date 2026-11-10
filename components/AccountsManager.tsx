'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateTimeInSaigon } from '../lib/time'
import type { UserPublic } from '../lib/types'
import { sendJson } from './api'

export function AccountsManager({ csrf, currentId, users }: { csrf: string; currentId: string; users: UserPublic[] }) {
  const router = useRouter()
  const [error, setError] = useState('')

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      await sendJson('/api/admins', 'POST', csrf, {
        email: form.get('email'),
        password: form.get('password'),
        isAdmin: form.get('isAdmin') === 'on',
      })
      event.currentTarget.reset()
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tạo được tài khoản.')
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setError('')
    try {
      await sendJson(`/api/admins/${id}`, 'PATCH', csrf, body)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không cập nhật được.')
    }
  }

  async function setPassword(id: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await patch(id, { password: form.get('password') })
    event.currentTarget.reset()
  }

  return (
    <div className="stack">
      <form className="card stack" onSubmit={create}>
        <h2>Thêm tài khoản</h2>
        <div className="field">
          <label htmlFor="account-email">Email</label>
          <input id="account-email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="account-password">Mật khẩu tạm</label>
          <input id="account-password" name="password" type="password" minLength={10} required />
        </div>
        <label>
          <input name="isAdmin" type="checkbox" /> Cấp quyền quản trị
        </label>
        <button type="submit">Tạo tài khoản</button>
      </form>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Tạo lúc</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.isAdmin ? 'Quản trị' : 'Chỉ xem'}</td>
                <td>{user.disabled ? 'Vô hiệu' : 'Đang dùng'}</td>
                <td>{formatDateTimeInSaigon(user.createdAt)} Asia/Saigon</td>
                <td>
                  <div className="actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => patch(user.id, { isAdmin: !user.isAdmin })}
                    >
                      {user.isAdmin ? 'Gỡ quyền quản trị' : 'Cấp quyền quản trị'}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={user.id === currentId}
                      onClick={() => patch(user.id, { disabled: !user.disabled })}
                    >
                      {user.disabled ? 'Kích hoạt' : 'Vô hiệu hóa'}
                    </button>
                  </div>
                  {user.id === currentId ? null : (
                    <form onSubmit={(event) => setPassword(user.id, event)}>
                      <label htmlFor={`pw-${user.id}`}>Đặt mật khẩu mới</label>
                      <input id={`pw-${user.id}`} name="password" type="password" minLength={10} required />
                      <button type="submit" className="secondary">
                        Lưu mật khẩu
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
