'use client'

import Link from 'next/link'
import { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const LINKS = [
  { href: '/', label: 'Lịch' },
  { href: '/kenh', label: 'Kênh' },
  { href: '/bot', label: 'Cấu hình bot' },
  { href: '/nhan-vat', label: 'Nhân vật' },
  { href: '/prompt-sao-luu', label: 'Prompt sao lưu' },
  { href: '/doi-mat-khau', label: 'Đổi mật khẩu' },
]

function isCurrent(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

function TabLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus()
  return <span className={pending ? 'is-pending' : undefined}>{label}</span>
}

function TabList({
  items,
  pathname,
}: {
  items: { href: string; label: string }[]
  pathname: string
}) {
  return (
    <div className="menu-tabs">
      {items.map((item) => {
        const current = isCurrent(pathname, item.href)
        return (
          <Link key={item.href} href={item.href} prefetch aria-current={current ? 'page' : undefined}>
            <TabLabel label={item.label} />
          </Link>
        )
      })}
    </div>
  )
}

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const items = [
    ...LINKS,
    ...(isAdmin
      ? [
          { href: '/tai-khoan', label: 'Tài khoản' },
          { href: '/khoa-api', label: 'Khóa API' },
          { href: '/sao-luu', label: 'Sao lưu' },
        ]
      : []),
  ]
  const currentLabel = items.find((item) => isCurrent(pathname, item.href))?.label ?? 'Menu'

  useEffect(() => {
    const selected = document.querySelectorAll<HTMLAnchorElement>('.menu-tabs a[aria-current="page"]')
    selected.forEach((node) => {
      if (node.offsetParent) node.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    })
  }, [pathname])

  return (
    <>
      <nav className="menu-desktop" aria-label="Mục chính">
        <TabList items={items} pathname={pathname} />
      </nav>
      <details className="menu-disclosure">
        <summary>Mục quản lý · {currentLabel}</summary>
        <nav className="menu-scroll" aria-label="Mục chính">
          <TabList items={items} pathname={pathname} />
        </nav>
      </details>
    </>
  )
}
