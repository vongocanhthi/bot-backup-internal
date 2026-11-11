'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

const LINKS = [
  { href: '/', label: 'Lịch' },
  { href: '/kenh', label: 'Kênh' },
  { href: '/bot', label: 'Cấu hình bot' },
  { href: '/nhan-vat', label: 'Nhân vật' },
  { href: '/doi-mat-khau', label: 'Đổi mật khẩu' },
]

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const currentRef = useRef<HTMLAnchorElement>(null)
  const items = [
    ...LINKS,
    ...(isAdmin
      ? [
          { href: '/tai-khoan', label: 'Tài khoản' },
          { href: '/sao-luu', label: 'Sao lưu' },
        ]
      : []),
  ]

  useEffect(() => {
    currentRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [pathname])

  return (
    <nav className="menu-scroll" aria-label="Mục chính">
      <div className="menu-tabs">
        {items.map((item) => {
          const current = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={current ? currentRef : undefined}
              aria-current={current ? 'page' : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
