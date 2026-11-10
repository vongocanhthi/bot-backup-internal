'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Lịch' },
  { href: '/kenh', label: 'Kênh' },
  { href: '/bot', label: 'Cấu hình bot' },
  { href: '/nhan-vat', label: 'Nhân vật' },
  { href: '/doi-mat-khau', label: 'Đổi mật khẩu' },
]

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const items = [
    ...LINKS,
    ...(isAdmin
      ? [
          { href: '/tai-khoan', label: 'Tài khoản' },
          { href: '/sao-luu', label: 'Sao lưu' },
        ]
      : []),
  ]
  return (
    <nav className="tabs" aria-label="Mục chính">
      {items.map((item) => {
        const current = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link key={item.href} href={item.href} aria-current={current ? 'page' : undefined}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
