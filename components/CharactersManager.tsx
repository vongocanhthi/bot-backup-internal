'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IMAGE_KINDS } from '../lib/constants'
import { kindLabel } from '../lib/labels'
import type { Bot, Character } from '../lib/types'
import { sendForm, sendJson } from './api'

export function CharactersManager({
  csrf,
  isAdmin,
  bots,
  characters,
  botId,
}: {
  csrf: string
  isAdmin: boolean
  bots: Pick<Bot, 'id' | 'name'>[]
  characters: Character[]
  botId: string
}) {
  const router = useRouter()
  const [error, setError] = useState('')

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      await sendJson('/api/characters', 'POST', csrf, {
        botId: form.get('botId'),
        name: form.get('name'),
        appearance: form.get('appearance'),
      })
      event.currentTarget.reset()
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tạo được nhân vật.')
    }
  }

  async function save(character: Character, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      await sendJson(`/api/characters/${character.id}`, 'PATCH', csrf, {
        name: form.get('name'),
        appearance: form.get('appearance'),
      })
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được nhân vật.')
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Xóa nhân vật này? Ảnh trên imgbb không bị xóa.')) return
    setError('')
    try {
      await sendJson(`/api/characters/${id}`, 'DELETE', csrf)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không xóa được.')
    }
  }

  async function upload(characterId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      await sendForm(`/api/characters/${characterId}/images`, csrf, form)
      event.currentTarget.reset()
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không tải được ảnh.')
    }
  }

  async function removeImage(id: string) {
    setError('')
    try {
      await sendJson(`/api/character-images/${id}`, 'DELETE', csrf)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không xóa được ảnh.')
    }
  }

  return (
    <div className="stack">
      <form className="actions" action="/nhan-vat" method="get">
        <label htmlFor="bot-filter">Bot</label>
        <select id="bot-filter" name="bot" defaultValue={botId} onChange={(event) => router.push(`/nhan-vat?bot=${event.target.value}`)}>
          <option value="">Tất cả</option>
          {bots.map((bot) => (
            <option key={bot.id} value={bot.id}>
              {bot.name}
            </option>
          ))}
        </select>
      </form>
      {isAdmin ? (
        <form className="card stack" onSubmit={create}>
          <h2>Thêm nhân vật</h2>
          <div className="field">
            <label htmlFor="char-bot">Bot</label>
            <select id="char-bot" name="botId" defaultValue={botId} required>
              <option value="">Chọn bot</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="char-name">Tên</label>
            <input id="char-name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="char-look">Ngoại hình cố định</label>
            <textarea id="char-look" name="appearance" required placeholder="Tóc, trang phục, màu, phong cách vẽ, những gì không được đổi" />
          </div>
          <button type="submit">Thêm</button>
        </form>
      ) : null}
      {characters.map((character) => {
        const bot = bots.find((item) => item.id === character.botId)
        return (
          <article className="card character" key={character.id}>
            <h2>
              {character.name} <span className="muted">{bot?.name}</span>
            </h2>
            {isAdmin ? (
              <form className="stack" onSubmit={(event) => save(character, event)}>
                <div className="field">
                  <label htmlFor={`name-${character.id}`}>Tên</label>
                  <input id={`name-${character.id}`} name="name" defaultValue={character.name} required />
                </div>
                <div className="field">
                  <label htmlFor={`look-${character.id}`}>Ngoại hình cố định</label>
                  <textarea id={`look-${character.id}`} name="appearance" defaultValue={character.appearance} required />
                </div>
                <button type="submit">Lưu mô tả</button>
              </form>
            ) : (
              <p>{character.appearance}</p>
            )}
            <div className="images">
              {character.images.map((image) => (
                <figure className="image-card" key={image.id}>
                  <img className="thumb" src={image.url} alt={`${character.name} — ${kindLabel(image.kind)}`} />
                  <figcaption>
                    {kindLabel(image.kind)}
                    {image.label ? ` · ${image.label}` : ''}
                  </figcaption>
                  {isAdmin ? (
                    <button type="button" className="secondary" onClick={() => removeImage(image.id)}>
                      Xóa ảnh
                    </button>
                  ) : null}
                </figure>
              ))}
            </div>
            {isAdmin ? (
              <form className="form-grid cols-3" onSubmit={(event) => upload(character.id, event)}>
                <div className="field">
                  <label htmlFor={`kind-${character.id}`}>Loại ảnh</label>
                  <select id={`kind-${character.id}`} name="kind" defaultValue="front">
                    {IMAGE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kindLabel(kind)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`label-${character.id}`}>Nhãn</label>
                  <input id={`label-${character.id}`} name="label" maxLength={80} />
                </div>
                <div className="field">
                  <label htmlFor={`file-${character.id}`}>Ảnh</label>
                  <input id={`file-${character.id}`} name="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required />
                </div>
                <button type="submit">Tải lên imgbb</button>
              </form>
            ) : null}
            <div className="actions">
              <a className="button secondary" href={`/api/characters/${character.id}/pack`}>
                Tải gói nhân vật
              </a>
              {isAdmin ? (
                <button type="button" className="danger" onClick={() => remove(character.id)}>
                  Xóa nhân vật
                </button>
              ) : null}
            </div>
          </article>
        )
      })}
      {characters.length === 0 ? <p>Chưa có nhân vật.</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
