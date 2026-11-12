import { BackupPrompts } from '@/components/BackupPrompts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Prompt sao lưu' }

export default function PromptSaoLuuPage() {
  return (
    <div className="stack">
      <header>
        <h1>Prompt sao lưu</h1>
        <p className="muted">Mẫu prompt để gửi cho bot. Không có mật khẩu, token hay khóa API.</p>
      </header>
      <BackupPrompts />
    </div>
  )
}
