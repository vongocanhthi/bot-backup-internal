'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BUFFER_CONNECTIONS, PLATFORMS, POSTING_SERVICES } from '../lib/constants'
import { connectionLabel, platformLabel, serviceLabel } from '../lib/labels'
import { slugify } from '../lib/slug'
import { weekdayLabel } from '../lib/time'
import type { Bot, Channel, Slot } from '../lib/types'
import { sendJson } from './api'

const WEEKDAYS = [
  { value: '', label: 'Mỗi ngày' },
  { value: '1', label: 'Thứ Hai' },
  { value: '2', label: 'Thứ Ba' },
  { value: '3', label: 'Thứ Tư' },
  { value: '4', label: 'Thứ Năm' },
  { value: '5', label: 'Thứ Sáu' },
  { value: '6', label: 'Thứ Bảy' },
  { value: '7', label: 'Chủ Nhật' },
]

export function ChannelManager({
  csrf,
  isAdmin,
  channels,
  slots,
  bots,
  selectedCode,
}: {
  csrf: string
  isAdmin: boolean
  channels: Channel[]
  slots: Slot[]
  bots: Pick<Bot, 'id' | 'name'>[]
  selectedCode?: string
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const selected = channels.find((channel) => channel.code === selectedCode) ?? null
  const selectedSlots = slots.filter((slot) => slot.channelCode === selected?.code)

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    setError('')
    try {
      const result = (await sendJson('/api/channels', 'POST', csrf, { ...data, active: true })) as { channel: Channel }
      router.push(`/kenh?code=${result.channel.code}`)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tạo được kênh.')
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const form = new FormData(event.currentTarget)
    const data = Object.fromEntries(form.entries())
    setError('')
    try {
      await sendJson(`/api/channels/${selected.code}`, 'PATCH', csrf, { ...data, active: form.get('active') === 'on' })
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được kênh.')
    }
  }

  async function addSlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const formEl = event.currentTarget
    const form = new FormData(formEl)
    setError('')
    try {
      await sendJson('/api/slots', 'POST', csrf, {
        channelCode: selected.code,
        weekday: form.get('weekday'),
        timeLocal: form.get('timeLocal'),
        label: form.get('label'),
      })
      formEl?.reset()
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thêm được slot.')
    }
  }

  async function removeSlot(id: string) {
    if (!window.confirm('Xóa slot này?')) return
    setError('')
    try {
      await sendJson(`/api/slots/${id}`, 'DELETE', csrf)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không xóa được slot.')
    }
  }

  return (
    <div className="stack">
      <section className="card legend">
        <span>Hai kết nối Buffer tách biệt:</span>
        <span className="badge badge-anhthi199x">anhthi199x</span>
        <span className="badge badge-anhthimxh">anhthimxh</span>
        <span className="muted">Hệ thống chỉ lưu nhãn và ID, không lưu token.</span>
      </section>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Mã cố định</th>
              <th>Tên</th>
              <th>Nền tảng</th>
              <th>Dịch vụ</th>
              <th>Kết nối</th>
              <th>ID</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {channels.map((channel) => (
              <tr key={channel.id}>
                <td>
                  <code>{channel.code}</code>
                </td>
                <td>
                  {channel.name}{' '}
                  {channel.active ? null : <span className="badge badge-off">Ngừng</span>}
                </td>
                <td>{platformLabel(channel.platform)}</td>
                <td>{serviceLabel(channel.postingService)}</td>
                <td>
                  <span className={channel.connectionLabel ? `badge badge-${channel.connectionLabel}` : 'badge'}>
                    {connectionLabel(channel.connectionLabel)}
                  </span>
                </td>
                <td>
                  <code>{channel.externalId || '—'}</code>
                </td>
                <td>
                  <a href={`/kenh?code=${channel.code}`}>Sửa</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isAdmin ? (
        <form className="card stack" onSubmit={create}>
          <h2>Thêm kênh</h2>
          <p className="muted">Mã kênh được chốt lúc tạo và không đổi khi đổi tên.</p>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="new-name">Tên hiển thị</label>
              <input
                id="new-name"
                name="name"
                required
                onBlur={(event) => setCode((current) => current || slugify(event.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="new-code">Mã kênh</label>
              <input id="new-code" name="code" value={code} onChange={(event) => setCode(event.target.value)} required />
            </div>
          </div>
          <ChoiceFields idPrefix="new" bots={bots} />
          <button type="submit">Tạo kênh</button>
        </form>
      ) : null}
      {selected ? (
        <form className="card stack" key={selected.code} onSubmit={save}>
          <h2>
            {selected.name} · <code>{selected.code}</code>
          </h2>
          <p className="muted">Mã này giữ nguyên khi đổi tên.</p>
          <div className="field">
            <label htmlFor="edit-name">Tên hiển thị</label>
            <input id="edit-name" name="name" defaultValue={selected.name} required disabled={!isAdmin} />
          </div>
          <ChoiceFields idPrefix="edit" channel={selected} disabled={!isAdmin} bots={bots} />
          <div className="field">
            <label htmlFor="edit-notes">Ghi chú</label>
            <textarea id="edit-notes" name="notes" defaultValue={selected.notes ?? ''} disabled={!isAdmin} />
          </div>
          <label>
            <input type="checkbox" name="active" defaultChecked={selected.active} disabled={!isAdmin} /> Đang dùng
          </label>
          {selected.externalUrl ? (
            <p>
              URL: <a href={selected.externalUrl}>{selected.externalUrl}</a>
            </p>
          ) : null}
          {selected.platformExternalId ? (
            <p>
              ID nền tảng: <code>{selected.platformExternalId}</code>
            </p>
          ) : null}
          {isAdmin ? <button type="submit">Lưu kênh</button> : null}
        </form>
      ) : null}
      {selected ? (
        <section className="card stack">
          <h2>Slot định kỳ</h2>
          <ul>
            {selectedSlots.map((slot) => (
              <li key={slot.id}>
                {weekdayLabel(slot.weekday)} · {slot.timeLocal} · {slot.label || 'Không nhãn'}
                {isAdmin ? (
                  <button type="button" className="secondary" onClick={() => removeSlot(slot.id)}>
                    Xóa
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {isAdmin ? (
            <form className="form-grid cols-3" onSubmit={addSlot}>
              <div className="field">
                <label htmlFor="slot-day">Thứ</label>
                <select id="slot-day" name="weekday" defaultValue="">
                  {WEEKDAYS.map((day) => (
                    <option key={day.label} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="slot-time">Giờ (Asia/Saigon)</label>
                <input id="slot-time" name="timeLocal" type="time" required />
              </div>
              <div className="field">
                <label htmlFor="slot-label">Nhãn</label>
                <input id="slot-label" name="label" maxLength={200} />
              </div>
              <button type="submit">Thêm slot</button>
            </form>
          ) : null}
        </section>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function ChoiceFields({
  idPrefix,
  channel,
  disabled = false,
  bots = [],
}: {
  idPrefix: string
  channel?: Channel
  disabled?: boolean
  bots?: Pick<Bot, 'id' | 'name'>[]
}) {
  const botField = `${idPrefix}-bot`
  return (
    <div className="grid-2">
      <Select idPrefix={idPrefix} name="platform" label="Nền tảng" value={channel?.platform} disabled={disabled} options={PLATFORMS} labels={platformLabel} />
      <Select
        idPrefix={idPrefix}
        name="postingService"
        label="Dịch vụ đăng"
        value={channel?.postingService}
        disabled={disabled}
        options={POSTING_SERVICES}
        labels={serviceLabel}
      />
      <Select
        idPrefix={idPrefix}
        name="connectionLabel"
        label="Kết nối Buffer"
        value={channel?.connectionLabel}
        disabled={disabled}
        options={BUFFER_CONNECTIONS}
        labels={(value) => (value ? connectionLabel(value) : 'Chưa gán kết nối')}
      />
      <div className="field">
        <label htmlFor={botField}>Bot</label>
        <select id={botField} name="botId" defaultValue={channel?.botId ?? ''} disabled={disabled}>
          <option value="">Không gắn</option>
          {bots.map((bot) => (
            <option key={bot.id} value={bot.id}>
              {bot.name}
            </option>
          ))}
        </select>
      </div>
      <TextField idPrefix={idPrefix} name="externalId" label="ID dịch vụ đăng" value={channel?.externalId} disabled={disabled} />
      <TextField idPrefix={idPrefix} name="platformExternalId" label="ID nền tảng" value={channel?.platformExternalId} disabled={disabled} />
      <TextField idPrefix={idPrefix} name="externalUrl" label="URL" value={channel?.externalUrl} disabled={disabled} />
      <TextField idPrefix={idPrefix} name="orgId" label="Org ID" value={channel?.orgId} disabled={disabled} />
    </div>
  )
}

function TextField({
  idPrefix,
  name,
  label,
  value,
  disabled,
}: {
  idPrefix: string
  name: string
  label: string
  value?: string | null
  disabled?: boolean
}) {
  const id = `${idPrefix}-${name}`
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} defaultValue={value ?? ''} disabled={disabled} />
    </div>
  )
}

function Select({
  idPrefix,
  name,
  label,
  value,
  options,
  labels,
  disabled,
}: {
  idPrefix: string
  name: string
  label: string
  value?: string | null
  options: readonly string[]
  labels: (value: string | null) => string
  disabled?: boolean
}) {
  const id = `${idPrefix}-${name}`
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} defaultValue={value ?? ''} disabled={disabled}>
        <option value="">Chưa rõ</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels(option)}
          </option>
        ))}
      </select>
    </div>
  )
}
