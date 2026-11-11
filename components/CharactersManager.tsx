'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IMAGE_KINDS } from '../lib/constants'
import { kindLabel } from '../lib/labels'
import { ACCENT_LABELS, GENDER_LABELS, type VoiceAccent, type VoiceGender } from '../lib/voice'
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
        voiceName: form.get('voiceName'),
        voiceProvider: form.get('voiceProvider'),
        voiceGender: form.get('voiceGender'),
        voiceAge: form.get('voiceAge'),
        voiceAccent: form.get('voiceAccent'),
        voiceSpeed: form.get('voiceSpeed'),
        voicePitch: form.get('voicePitch'),
        voiceStyle: form.get('voiceStyle'),
        voiceSampleLine: form.get('voiceSampleLine'),
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

  async function uploadVoice(characterId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      await sendForm(`/api/characters/${characterId}/voice`, csrf, form)
      event.currentTarget.reset()
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được file nghe mẫu.')
    }
  }

  async function removeVoice(characterId: string) {
    if (!window.confirm('Xóa file nghe mẫu của nhân vật này?')) return
    setError('')
    try {
      await sendJson(`/api/characters/${characterId}/voice`, 'DELETE', csrf)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không xóa được file nghe mẫu.')
    }
  }

  async function uploadSource(characterId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      await sendForm(`/api/characters/${characterId}/sources`, csrf, form)
      event.currentTarget.reset()
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được file gốc.')
    }
  }

  async function removeSource(characterId: string, fileId: string) {
    if (!window.confirm('Xóa file gốc này?')) return
    setError('')
    try {
      await sendJson(`/api/characters/${characterId}/sources/${fileId}`, 'DELETE', csrf)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không xóa được file gốc.')
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
                <h3>Giọng nói</h3>
                <VoiceFields character={character} />
                <button type="submit">Lưu nhân vật</button>
              </form>
            ) : (
              <>
                <p>{character.appearance}</p>
                <VoiceSummary character={character} />
              </>
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
            <section className="stack">
              <h3>File nghe mẫu</h3>
              {character.voice.sample ? (
                <audio controls preload="none" src={`/api/characters/${character.id}/voice`}>
                  {character.voice.sample.filename}
                </audio>
              ) : (
                <p className="muted">Chưa có file nghe mẫu. Ảnh vẫn tải lên imgbb; file giọng lưu trong Postgres, tối đa 4 MB.</p>
              )}
              {isAdmin ? (
                <form className="actions" onSubmit={(event) => uploadVoice(character.id, event)}>
                  <label htmlFor={`voice-file-${character.id}`}>Tải file giọng</label>
                  <input
                    id={`voice-file-${character.id}`}
                    name="file"
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/webm,audio/ogg,audio/mp4,.mp3,.wav,.webm,.ogg,.m4a"
                    required
                  />
                  <button type="submit">Lưu file giọng</button>
                  {character.voice.sample ? (
                    <button type="button" className="secondary" onClick={() => removeVoice(character.id)}>
                      Xóa file giọng
                    </button>
                  ) : null}
                </form>
              ) : null}
            </section>
            <section className="stack">
              <h3>File gốc (Remotion/SVG/sprite)</h3>
              {character.sourceFiles.length === 0 ? (
                <p className="muted">Chưa có file gốc. Tải zip dự án Remotion, SVG hoặc sprite (tối đa 4 MB mỗi file).</p>
              ) : (
                <ul className="source-files">
                  {character.sourceFiles.map((file) => (
                    <li key={file.id}>
                      <a href={`/api/characters/${character.id}/sources/${file.id}`}>{file.filename}</a>
                      <span className="muted">
                        {' '}
                        · {formatBytes(file.byteSize)}
                        {file.note ? ` · ${file.note}` : ''}
                      </span>
                      {isAdmin ? (
                        <button type="button" className="secondary" onClick={() => removeSource(character.id, file.id)}>
                          Xóa
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {isAdmin ? (
                <form className="form-grid cols-3" onSubmit={(event) => uploadSource(character.id, event)}>
                  <div className="field">
                    <label htmlFor={`source-file-${character.id}`}>File .zip, .json hoặc .txt</label>
                    <input id={`source-file-${character.id}`} name="file" type="file" accept=".zip,.json,.txt,application/zip,application/json,text/plain" required />
                  </div>
                  <div className="field">
                    <label htmlFor={`source-note-${character.id}`}>Ghi chú</label>
                    <input id={`source-note-${character.id}`} name="note" maxLength={500} placeholder="Dự án Remotion của Cam" />
                  </div>
                  <button type="submit">Tải file gốc</button>
                </form>
              ) : null}
            </section>
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function VoiceFields({ character }: { character: Character }) {
  return (
    <div className="grid-2">
      <div className="field">
        <label htmlFor={`voice-name-${character.id}`}>Tên giọng</label>
        <input id={`voice-name-${character.id}`} name="voiceName" defaultValue={character.voice.name ?? ''} placeholder="Hoài My" />
      </div>
      <div className="field">
        <label htmlFor={`voice-provider-${character.id}`}>Engine</label>
        <input id={`voice-provider-${character.id}`} name="voiceProvider" defaultValue={character.voice.provider ?? ''} placeholder="VieNeu, edge-tts" />
      </div>
      <div className="field">
        <label htmlFor={`voice-gender-${character.id}`}>Giới tính</label>
        <select id={`voice-gender-${character.id}`} name="voiceGender" defaultValue={character.voice.gender ?? ''}>
          <option value="">Chưa rõ</option>
          <option value="nu">Nữ</option>
          <option value="nam">Nam</option>
          <option value="khac">Khác</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`voice-age-${character.id}`}>Tuổi</label>
        <input id={`voice-age-${character.id}`} name="voiceAge" defaultValue={character.voice.age ?? ''} placeholder="trẻ, người lớn" />
      </div>
      <div className="field">
        <label htmlFor={`voice-accent-${character.id}`}>Vùng miền</label>
        <select id={`voice-accent-${character.id}`} name="voiceAccent" defaultValue={character.voice.accent ?? ''}>
          <option value="">Chưa rõ</option>
          <option value="bac">Bắc</option>
          <option value="trung">Trung</option>
          <option value="nam">Nam</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`voice-speed-${character.id}`}>Tốc độ</label>
        <input id={`voice-speed-${character.id}`} name="voiceSpeed" defaultValue={character.voice.speed ?? ''} placeholder="1.0" />
      </div>
      <div className="field">
        <label htmlFor={`voice-pitch-${character.id}`}>Cao độ</label>
        <input id={`voice-pitch-${character.id}`} name="voicePitch" defaultValue={character.voice.pitch ?? ''} placeholder="trung bình, hơi ấm" />
      </div>
      <div className="field">
        <label htmlFor={`voice-style-${character.id}`}>Cách nói</label>
        <textarea id={`voice-style-${character.id}`} name="voiceStyle" defaultValue={character.voice.style ?? ''} />
      </div>
      <div className="field">
        <label htmlFor={`voice-line-${character.id}`}>Câu mẫu</label>
        <textarea id={`voice-line-${character.id}`} name="voiceSampleLine" defaultValue={character.voice.sampleLine ?? ''} />
      </div>
    </div>
  )
}

function VoiceSummary({ character }: { character: Character }) {
  const voice = character.voice
  const rows = [
    ['Tên giọng', voice.name],
    ['Engine', voice.provider],
    ['Giới tính', voice.gender ? (GENDER_LABELS[voice.gender as VoiceGender] ?? voice.gender) : null],
    ['Tuổi', voice.age],
    ['Vùng miền', voice.accent ? (ACCENT_LABELS[voice.accent as VoiceAccent] ?? voice.accent) : null],
    ['Tốc độ', voice.speed],
    ['Cao độ', voice.pitch],
    ['Cách nói', voice.style],
    ['Câu mẫu', voice.sampleLine],
  ].filter((row) => row[1])
  if (rows.length === 0) return <p className="muted">Chưa chốt giọng.</p>
  return (
    <dl>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
