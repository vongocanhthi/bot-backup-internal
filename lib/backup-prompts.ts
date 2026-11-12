import { slugify } from './slug'

export const BACKUP_PROMPT_STEPS = [
  'Gửi prompt sao lưu cho bot đang được sao lưu.',
  'Quản Lý Kênh tải lên web và kiểm tra.',
  'Gửi prompt dừng cho bot cũ.',
  'Anh tự xoá bot ở thanh bên: chuột phải → Delete.',
] as const

export type BackupPrompt = {
  id: string
  title: string
  body: string
}

export const BACKUP_PROMPTS: readonly BackupPrompt[] = [
  {
    id: 'sao-luu-bot',
    title: 'Prompt sao lưu bot lên web',
    body: `Bạn là {TEN_BOT}. Hãy sao lưu chính mình để một tài khoản Grok khác dựng lại được bot này.

Chỉ SAO CHÉP. Không di chuyển, không sửa và không xóa file gốc.

Tạo thư mục /workspace/{SLUG}-backup/ rồi chép vào đúng cấu trúc dưới đây.

1. profile/
- profile.json và settings.json: bản sao agent-data của chính bạn.
- prompt.txt: toàn bộ prompt hiện tại của bạn.

2. characters/<ten-nhan-vat>/
Mỗi nhân vật một thư mục, tên thư mục là tên nhân vật.
- Ảnh PNG: mặt trước (front), toàn thân (full_body), các biểu cảm (expressions), và character sheet.
- File văn bản mô tả ngoại hình cố định.
- File rig và SVG nếu có.
- Thư mục voice/:
  - Một file nghe mẫu .mp3 sạch, không nhạc nền, nhỏ hơn 4 MB.
  - Một file JSON ghi tên và phiên bản engine, tên preset hoặc giọng, tốc độ, cao độ, các tham số khác, và câu mẫu.
  - Script tổng hợp giọng (synth) nếu có.

3. animation/
- Mã nguồn Remotion hoặc hoạt hình, component, và asset cần để render.
- Không chép node_modules, thư mục build, hoặc file .env.

4. workflow/
- Script, style guide và template.
- Mô tả lịch đăng và routine.
- Danh sách kênh, kèm tên tài khoản Buffer. Không chép token.

5. README.md bằng tiếng Việt
- Liệt kê nội dung trong gói.
- Cách dựng lại bot trên tài khoản Grok khác.
- Phần còn thiếu hoặc bị mất, và vì sao.

6. NGUON_TU_LIEU.md
Với mỗi file âm thanh, nhạc, ảnh, video mẫu và mỗi nguồn tin, ghi nguồn: trang web, URL gốc, tác giả, giấy phép, hoặc "chưa rõ nguồn".

Quy tắc
- Không đưa mật khẩu, token, API key hay cookie. Quét nội dung, xóa những chỗ đó, rồi báo nếu phát hiện.
- Mỗi file tối đa 4 MB. File lớn hơn thì không chép vào gói; ghi đường dẫn của nó trên máy vào README.
- Nếu nén zip, mỗi zip tối đa 4 MB. Lớn hơn thì tách theo chủ đề (profile, nhân vật, animation, workflow).
- Không đổi lịch. Không đăng bài. Không xóa gì.

Khi xong, trả lời bot "Quản Lý Kênh & Sao Lưu Bot" bằng SendToAgent. Nội dung gồm:
- Đường dẫn thư mục.
- Danh sách file và dung lượng.
- Những gì còn thiếu.
- Xác nhận trong gói không có bí mật.
`,
  },
  {
    id: 'dung-bot-cu',
    title: 'Prompt dừng bot cũ',
    body: `Bạn là {TEN_BOT}. Bản sao lưu trên web đã được kiểm tra. Hãy dừng bot cũ này.

1. Dừng mọi việc đang chạy và mọi subagent.
2. Tạm dừng (pause), không xóa, toàn bộ routine và lịch đã lên. Liệt kê từng mục đã tạm dừng.
3. Không tạo, không dời và không xóa bài đã hẹn trên Buffer hay lịch đăng. Bài đã hẹn trong Buffer giữ nguyên. Báo kênh nào còn bài đang chờ để người dùng tự quyết.
4. Không xóa file trong /workspace. Đây là máy dùng chung.
5. Không đăng bài. Không gửi tin cho ai.

Sau đó báo lại:
- Những gì đã tạm dừng hoặc đã dừng.
- Những gì vẫn còn chạy.

Rồi chờ. Người dùng sẽ tự xóa bot này trên thanh bên: chuột phải → Delete. Bạn không tự xóa mình.
`,
  },
  {
    id: 'sao-luu-api',
    title: 'Prompt sao lưu qua API',
    body: `Bạn là {TEN_BOT}. Hãy đẩy bản sao lưu lên web bằng API. Không in khóa, không ghi khóa vào file.

Dùng biến môi trường đã có sẵn:
- BACKUP_API_BASE: gốc của trang, không có dấu / ở cuối
- BACKUP_API_KEY: khóa sao lưu
- VERCEL_BYPASS_SECRET: mã Protection Bypass for Automation của Vercel

Vercel Authentication vẫn bật. Mỗi lệnh curl thêm đúng hai header này. Không điền giá trị thật vào lệnh:

-H "Authorization: Bearer $BACKUP_API_KEY" \\
-H "x-vercel-protection-bypass: $VERCEL_BYPASS_SECRET"

Mỗi request tối đa khoảng 4,5 MB. File giọng và file gốc tối đa 4 MB.

1. Kiểm tra khóa.
curl -sS \\
  -H "Authorization: Bearer $BACKUP_API_KEY" \\
  -H "x-vercel-protection-bypass: $VERCEL_BYPASS_SECRET" \\
  "$BACKUP_API_BASE/api/v1/backup/ping"

2. Ghi bot theo mã ổn định (tạo mới hoặc cập nhật). Quét và không gửi mật khẩu, token, API key, cookie.
curl -sS -X POST \\
  -H "Authorization: Bearer $BACKUP_API_KEY" \\
  -H "x-vercel-protection-bypass: $VERCEL_BYPASS_SECRET" \\
  -H "content-type: application/json" \\
  -d '{"id":"<mã-bot-ổn-định>","name":"{TEN_BOT}","title":"{TEN_BOT}","prompt":"...","settings":{},"notes":""}' \\
  "$BACKUP_API_BASE/api/v1/backup/bot"

3. Ghi từng nhân vật theo cặp bot và tên.
curl -sS -X POST \\
  -H "Authorization: Bearer $BACKUP_API_KEY" \\
  -H "x-vercel-protection-bypass: $VERCEL_BYPASS_SECRET" \\
  -H "content-type: application/json" \\
  -d '{"botId":"<mã-bot>","name":"<tên nhân vật>","appearance":"...","voiceName":"...","voiceProvider":"...","voiceGender":"nu","voiceAccent":"bac","voiceSpeed":"1.0","voicePitch":"...","voiceStyle":"...","voiceSampleLine":"..."}' \\
  "$BACKUP_API_BASE/api/v1/backup/character"

4. Ảnh: gửi URL imgbb, hoặc tải file nếu máy chủ đã có IMGBB_API_KEY. kind là front, full_body, expression hoặc other.
curl -sS -X POST \\
  -H "Authorization: Bearer $BACKUP_API_KEY" \\
  -H "x-vercel-protection-bypass: $VERCEL_BYPASS_SECRET" \\
  -F "kind=front" -F "file=@anh.png" \\
  "$BACKUP_API_BASE/api/v1/backup/character/<id>/image"

5. File giọng MP3, M4A hoặc WAV, tối đa 4 MB, không nhạc nền.
curl -sS -X PUT \\
  -H "Authorization: Bearer $BACKUP_API_KEY" \\
  -H "x-vercel-protection-bypass: $VERCEL_BYPASS_SECRET" \\
  -F "file=@mau.mp3" \\
  "$BACKUP_API_BASE/api/v1/backup/character/<id>/voice"

6. File gốc .zip, .json, .txt hoặc .md, tối đa 4 MB. Cùng tên thì ghi đè.
curl -sS -X POST \\
  -H "Authorization: Bearer $BACKUP_API_KEY" \\
  -H "x-vercel-protection-bypass: $VERCEL_BYPASS_SECRET" \\
  -F "note=Remotion" -F "file=@goi.zip" \\
  "$BACKUP_API_BASE/api/v1/backup/character/<id>/source-file"

7. Viết NGUON_TU_LIEU.md rồi tải lên bằng endpoint source-file. Với mỗi file âm thanh, nhạc, ảnh, video mẫu và mỗi nguồn tin, ghi nguồn: trang web, URL gốc, tác giả, giấy phép, hoặc "chưa rõ nguồn".

8. Không đổi lịch. Không đăng bài. Không xóa gì. Nếu khóa bị gán một bot thì chỉ ghi bot đó.

Khi xong, trả lời bot "Quản Lý Kênh & Sao Lưu Bot" bằng SendToAgent: những gì đã tải, mã nhân vật, phần còn thiếu, và xác nhận không gửi bí mật.
`,
  },
]

export function fillBackupPrompt(body: string, values: { tenBot?: string; slug?: string } = {}): string {
  const tenBot = values.tenBot?.trim() ?? ''
  const slugInput = values.slug?.trim() ?? ''
  const slug = slugInput ? slugify(slugInput) : ''
  return body.replaceAll('{TEN_BOT}', tenBot || '{TEN_BOT}').replaceAll('{SLUG}', slug || '{SLUG}')
}
