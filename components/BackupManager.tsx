'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RESTORE_CONFIRM } from '../lib/constants'
import { sendForm } from './api'

export function BackupManager({ csrf }: { csrf: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function restore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (confirm !== RESTORE_CONFIRM) {
      setError('Nhập đúng KHOI PHUC để xác nhận.')
      return
    }
    if (!window.confirm('Khôi phục sẽ thay thế kênh, slot, snapshot, bot và nhân vật. Tiếp tục?')) return
    const form = new FormData(event.currentTarget)
    form.set('confirm', confirm)
    setPending(true)
    setError('')
    setMessage('')
    try {
      await sendForm('/api/backup/restore', csrf, form)
      setMessage('Đã khôi phục dữ liệu.')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không khôi phục được.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h2>Xuất</h2>
        <p>Tệp zip gồm kênh, slot, snapshot, cấu hình bot và nhân vật kèm URL ảnh. Không gồm mật khẩu hay mã nhập.</p>
        <a className="button" href="/api/backup">
          Tải bản sao lưu
        </a>
      </section>
      <form className="card stack" onSubmit={restore}>
        <h2>Khôi phục</h2>
        <p>Chọn file JSON hoặc zip có data.json. Thao tác thay thế dữ liệu nội dung, không đổi tài khoản quản trị.</p>
        <div className="field">
          <label htmlFor="backup-file">Tệp</label>
          <input id="backup-file" name="file" type="file" accept="application/json,application/zip,.json,.zip" required />
        </div>
        <div className="field">
          <label htmlFor="backup-confirm">Nhập {RESTORE_CONFIRM} để xác nhận</label>
          <input id="backup-confirm" value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
        </div>
        {message ? <p className="ok">{message}</p> : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="danger" disabled={pending || confirm !== RESTORE_CONFIRM}>
          Khôi phục
        </button>
      </form>
    </div>
  )
}
