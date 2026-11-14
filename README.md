# Quản lý lịch kênh (nội bộ)

Website nội bộ để xem lịch kênh, giữ mã kênh ổn định, lưu cấu hình bot Grok và nhân vật. Giao diện tiếng Việt. Mọi giờ hiển thị theo **Asia/Saigon** (UTC+7).

Ứng dụng chỉ **đọc** lịch đã nhập. Không có đường gọi nào tạo hoặc sửa bài trên Buffer.

## Chạy local

Cần Node.js 22+ và Postgres (Neon hoặc Postgres local).

```bash
cp .env.example .env
# điền DATABASE_URL và ADMIN_BOOTSTRAP_PASSWORD
npm install
npm run migrate
npm run seed
npm run dev
```

Mở http://localhost:3000. Mọi đường dẫn chưa đăng nhập chuyển về `/login`.

Postgres local ví dụ:

```bash
docker run --name qlk-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=qlk -p 5432:5432 -d postgres:16
```

`DATABASE_URL=postgres://postgres:postgres@localhost:5432/qlk`

## Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `DATABASE_URL` | Có | Chuỗi kết nối Postgres. Trên Vercel, Neon gắn biến này. |
| `ADMIN_BOOTSTRAP_EMAIL` | Không | Email quản trị viên đầu tiên. Mặc định `anhthi199x@gmail.com` nếu bỏ trống. |
| `ADMIN_BOOTSTRAP_PASSWORD` | Khi chưa có admin | Mật khẩu chỉ đọc lúc chạy, lưu dạng bcrypt. Không commit. |
| `IMGBB_API_KEY` | Khi tải ảnh nhân vật | Khóa imgbb, chỉ dùng trên server. Không đưa ra trình duyệt. |

`ADMIN_BOOTSTRAP_PASSWORD` chỉ được dùng khi **chưa có quản trị viên đang hoạt động**. Nếu còn admin, đổi mật khẩu trong app không bị env ghi đè. Nếu mọi admin bị vô hiệu, lần đăng nhập sau sẽ tạo lại hoặc kích hoạt lại email bootstrap và đặt lại hash từ env.

Gợi ý: đăng nhập xong hãy vào **Đổi mật khẩu**. Env không tự cập nhật theo mật khẩu mới.

## Vercel (Hobby) và Neon

1. Đẩy repo lên GitHub và import project trên Vercel. Framework: Next.js. Lệnh build: `npm run build`.
2. Giữ **Deployment Protection / Vercel Authentication bật** cho Production, Preview và mọi deployment. Đây là lớp ngoài, cộng với đăng nhập của app. Không tắt.
3. Trong Marketplace, gắn **Neon Postgres**. Vercel sẽ có `DATABASE_URL`. Dùng chuỗi pooled nếu Neon cung cấp.
4. Đặt `ADMIN_BOOTSTRAP_EMAIL=anhthi199x@gmail.com` và `ADMIN_BOOTSTRAP_PASSWORD` (Sensitive) cho Production và Preview.
5. Đặt `IMGBB_API_KEY` (Sensitive) nếu cần tải ảnh nhân vật.
6. Sau lần deploy, chạy migration và seed một lần từ máy có `DATABASE_URL` của Neon:

```bash
npm run migrate
npm run seed
```

Seed không ghi đè kênh, slot, bot hay nhân vật đã có. `SEED_OVERWRITE=1 npm run seed` mới cập nhật lại tên và prompt bot từ `seed/bots`.

## Việc app làm

- Đăng nhập email/mật khẩu, mật khẩu bcrypt, cookie phiên httpOnly ~12 giờ (`secure` khi production), CSRF cho thao tác ghi, giới hạn 5 lần sai / email và 30 lần / IP trong 15 phút.
- Quản trị viên thêm tài khoản, vô hiệu hóa, cấp hoặc gỡ quyền quản trị. Tài khoản không bị xóa.
- Kênh có **mã nội bộ ổn định**. Đổi tên không đổi mã.
- Lịch **Hôm nay**, **7 ngày tới**, **Theo kênh**. Slot tuần và bài thực tế tách riêng. Bài thực tế đến từ snapshot JSON (tải lên hoặc `POST /api/import` với `Authorization: Bearer <mã>`). Mã nhập chỉ hiện một lần, DB lưu hash. Mỗi màn hình ghi rõ thời điểm snapshot.
- Cấu hình bot: xem, sửa, sao chép, tải `.txt`. File seed lấy từ 10 prompt đính kèm; mã bot là phần tên file trước `.txt`.
- Nhân vật: mô tả ngoại hình cố định và ảnh (mặt trước, toàn thân, biểu cảm). Ảnh gửi server rồi lên `https://api.imgbb.com/1/upload`. Bản sao chép bot có mục **Nhân vật** và câu nhắc luôn dùng ảnh tham chiếu. Có tải zip gói nhân vật.
- Sao lưu zip/JSON và khôi phục (quản trị, phải gõ `KHOI PHUC`). Không gồm mật khẩu, phiên, mã nhập.
- Trang **Prompt sao lưu**: mẫu prompt để sao chép (sao lưu bot lên web, dừng bot cũ, hoặc tải lên bằng API). Chỗ `{TEN_BOT}` và `{SLUG}` điền trên trang; để trống thì giữ nguyên. Không lưu prompt trong database.
- Khóa API cho bot tải sao lưu mà không dùng mật khẩu đăng nhập. Xem mục dưới.

`robots.txt` chặn toàn bộ. Trang gửi `noindex`.

## Snapshot

```json
{
  "label": "Nhập tay",
  "posts": [
    {
      "channelCode": "tin-nong-vn",
      "externalId": "",
      "title": "Cảnh báo lừa đảo",
      "status": "scheduled",
      "scheduledAt": "2026-11-10T12:00:00+07:00",
      "publishedAt": null,
      "platform": "facebook",
      "service": "buffer"
    }
  ]
}
```

`POST /api/import` với Bearer token trả về `{ snapshotId, importedAt, postCount }`.

## Giọng nhân vật

Mỗi nhân vật có thể lưu giọng để tài khoản Grok khác dựng lại đúng âm: tên giọng, engine, giới tính, tuổi, vùng miền (Bắc/Trung/Nam), tốc độ, cao độ, cách nói, câu mẫu, và một file nghe mẫu tùy chọn.

File nghe mẫu lưu trong Postgres (`character_voice_samples`, tối đa 4 MB mỗi file: MP3, WAV, WEBM, OGG, M4A). Không dùng imgbb vì dịch vụ đó chỉ nhận ảnh, và không thêm kho Blob nên không có biến môi trường mới. Bản sao lưu zip gồm `characters.json` và thư mục `voices/`. Khi copy hoặc tải cấu hình bot, mục Nhân vật kèm các thông số giọng.

Sau khi cập nhật mã, chạy `npm run migrate` trên database đang dùng. Dữ liệu nhân vật cũ giữ nguyên; các cột giọng để trống cho đến khi nhập.

## File gốc nhân vật

Mỗi nhân vật có thể lưu một hoặc nhiều file gốc để dựng lại hoạt hình trên tài khoản Grok khác: zip dự án Remotion (sprite PNG, manifest, component, palette, font, README), hoặc file `.json` / `.txt` đi kèm. File nằm trong Postgres (`character_source_files`, migration `003_character_source_files.sql`), tối đa 4 MB mỗi file. Không thêm biến môi trường.

Bản sao lưu zip đặt file tại `sources/<mã nhân vật>/<tên file>` và ghi đường dẫn trong `characters.json`. Bản sao lưu cũ không có mục này vẫn khôi phục được. Khi copy hoặc tải cấu hình bot, mục nhân vật liệt kê tên các file gốc.

Nhãn kết nối Buffer được phép: `anhthi199x`, `anhthimxh`, `anhthimusics`, `voanhviet77`, `yenkiem2000`.

## Khóa API sao lưu

Bot có thể tải bản sao lưu mà không đăng nhập bằng mật khẩu. Quản trị tạo khóa ở tab **Khóa API**. Khóa có dạng `bbk_` cộng 32 byte ngẫu nhiên. Cơ sở dữ liệu chỉ lưu phần băm SHA-256 và 8 ký tự đầu để nhận diện. Khóa đầy đủ hiện **một lần**. Thu hồi thì khóa ngừng dùng ngay.

Migration: `migrations/004_api_keys.sql`. Bảng `api_keys` gồm id, name, key_prefix, key_hash, scope (mặc định `backup`), bot_id, created_by, created_at, last_used_at, revoked_at. `bots.id` đang là text nên `bot_id` cũng là text, khóa ngoại tới `bots`, xóa bot thì cột này thành null. Cùng migration thêm `bots.settings` (jsonb) và `bots.notes`. Nếu bảng chưa có, API trả 503 tiếng Việt thay vì sập trang.

Vercel Authentication vẫn bật. App không đọc header bypass. Bot (client) tự thêm header mà Vercel kiểm tra trước khi request vào app:

- `Authorization: Bearer $BACKUP_API_KEY`
- `x-vercel-protection-bypass: $VERCEL_BYPASS_SECRET`

Biến bot tự giữ, không commit: `BACKUP_API_BASE`, `BACKUP_API_KEY`, `VERCEL_BYPASS_SECRET`. Không có biến môi trường mới trên app. Ảnh multipart vẫn dùng `IMGBB_API_KEY`; nếu thiếu, endpoint ảnh trả 400.

Giới hạn body của Vercel khoảng 4,5 MB mỗi request. File giọng và file gốc tối đa 4 MB.

Endpoint JSON, xác thực bằng Bearer, không dùng cookie hay CSRF:

- `GET /api/v1/backup/ping` — tên khóa và bot được gán, nếu có.
- `POST /api/v1/backup/bot` — tạo hoặc cập nhật bot theo `id` hoặc `code`: name, title, prompt, settings, notes. Văn bản bị quét bí mật; dính thì từ chối và nêu loại. Ghi chú và cài đặt hiện trên trang bot và nằm trong bản sao lưu của site. Bản sao lưu cũ không có hai mục này vẫn khôi phục được.
- `POST /api/v1/backup/character` — tạo hoặc cập nhật nhân vật theo bot và tên, gồm ngoại hình và các trường giọng.
- `POST /api/v1/backup/character/{id}/image` — JSON `{ url, kind }` hoặc multipart ảnh để server gửi lên imgbb.
- `PUT /api/v1/backup/character/{id}/voice` — multipart MP3, M4A hoặc WAV, tối đa 4 MB.
- `POST /api/v1/backup/character/{id}/source-file` — multipart `.zip`, `.json`, `.txt` hoặc `.md`, tối đa 4 MB, ghi đè nếu trùng tên.

Khóa có `bot_id` thì chỉ được ghi bot đó. Khóa đã thu hồi bị từ chối. So khớp phần băm theo thời gian không đổi. Mỗi IP bị giới hạn nhẹ, khoảng 60 request mỗi phút.

Vercel giới hạn body request khoảng 4,5 MB. File mẫu nên là một câu ngắn. Bản sao lưu có nhiều file lớn có thể vượt giới hạn đó khi tải lên từ trang web.

## Lệnh

```bash
npm test
npm run build
npm run migrate
npm run seed
```

## Giả định

- Người đã đăng nhập nhưng không phải quản trị được xem lịch, kênh, bot, nhân vật và đổi mật khẩu của mình. Sửa dữ liệu, tài khoản, nhập snapshot, mã nhập và sao lưu chỉ dành cho quản trị.
- Quản trị có thể đặt mật khẩu mới cho tài khoản khác (phiên của tài khoản đó bị hủy) để khỏi bị khóa khi quên mật khẩu.
- Fat Frog / Tin Tức VN Facebook gắn nhãn Buffer `anhthi199x` vì org `6ae29d0382663d76d4903a01` trùng org mà cấu hình Sao Lại Thế Nhỉ gán cho kết nối đó. Tin Nóng VN có Buffer channel id nhưng không có nhãn kết nối, nên nhãn để trống.
- Cam Tò Mò YouTube được tạo vì bot quản lý kênh nêu Facebook và YouTube; không có ID nên để trống. Việt Review không có nền tảng hay ID trong cấu hình.
- Yến Review, Postiz và bot quản lý kênh chỉ được seed là bot, không bịa thêm kênh.
- Slot tuần chỉ được tạo nơi cấu hình nói giờ thường xuyên. Kênh Sao Lại Thế Nhỉ đang tạm dừng nên không có slot.
- Góc Thức Tỉnh và Làm Sao Lại Thế là hai kênh. Tin Tức VN tách Facebook, YouTube (Schedule n Chill 306) và TikTok (307, đang ngừng). AI Daily đăng bằng X, không dùng Buffer.
- Nhân vật seed chỉ có mô tả (Cam và nhân vật chính của Sao Lại Thế Nhỉ). Không bịa URL ảnh. Xóa nhân vật trong app không xóa file trên imgbb.
- Khôi phục thay thế kênh, slot, snapshot, bài, bot và nhân vật. Không đổi user, phiên hay mã nhập.
- Lịch mặc định dùng snapshot mới nhất. Slot là kế hoạch hiện tại, không đóng băng trong snapshot.
- Cookie `secure` bật khi `NODE_ENV=production`. Máy dev dùng HTTP vẫn đăng nhập được.
- Giới hạn body của Vercel khoảng 4,5 MB áp vào ảnh tải lên và tệp khôi phục.
