'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { modules } from '@/lib/nav/modules'
import { cn } from '@/lib/utils/cn'

export function TopNav() {
  const pathname = usePathname()
  const activeModule = modules.find((m) => pathname.startsWith(m.basePath))

  return (
    <header className="glass-nav fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-4">
      <Link href="/dashboard" className="flex items-center gap-2 mr-8 shrink-0">
        <div className="w-6 h-6 rounded-[6px] bg-accent flex items-center justify-center">
          <span className="text-white text-caption-2 font-bold">FK</span>
        </div>
        <span className="text-headline text-text-primary hidden sm:block">FulfilmentKit</span>
      </Link>

      <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
        {modules.map((module) => {
          const isActive = activeModule?.id === module.id
          return (
            <Link
              key={module.id}
              href={module.pages[0].href}
              className={cn(
                'relative px-3 py-1.5 rounded-[8px] text-subhead whitespace-nowrap transition-colors duration-200',
                isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 nav-pill-active rounded-[8px]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">{module.label}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
