import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Quản lý lịch kênh (nội bộ)',
    template: '%s · Quản lý lịch kênh (nội bộ)',
  },
  description: 'Công cụ nội bộ quản lý lịch kênh và cấu hình bot.',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={beVietnam.className}>{children}</body>
    </html>
  )
}
