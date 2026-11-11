export default function Loading() {
  return (
    <div className="stack" aria-busy="true" aria-live="polite" data-loading="true">
      <div className="skeleton-bar title" />
      <div className="skeleton-bar" />
      <div className="skeleton-card" />
      <p className="muted">Đang mở trang…</p>
    </div>
  )
}
