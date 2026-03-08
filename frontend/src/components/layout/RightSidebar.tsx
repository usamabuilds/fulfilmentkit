'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { modules } from '@/lib/nav/modules'
import { cn } from '@/lib/utils/cn'

export function RightSidebar() {
  const pathname = usePathname()
  const activeModule = modules.find((m) => pathname.startsWith(m.basePath))

  if (!activeModule || activeModule.pages.length <= 1) return null

  return (
    <aside className="glass-sidebar fixed top-12 right-0 bottom-0 w-[220px] z-40 p-3 hidden lg:block">
      <p className="text-caption-2 text-text-tertiary px-2 mb-2">
        {activeModule.label.toUpperCase()}
      </p>
      <nav className="flex flex-col gap-0.5">
        {activeModule.pages.map((page) => {
          const isActive = pathname === page.href
          return (
            <Link
              key={page.href}
              href={page.href}
              className={cn(
                'px-3 py-2 rounded-[8px] text-subhead transition-all duration-200',
                isActive
                  ? 'nav-pill-active text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-black/5'
              )}
            >
              {page.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
