import { TopNav } from './TopNav'
import { RightSidebar } from './RightSidebar'

interface ShellProps {
  children: React.ReactNode
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-bg-base">
      <TopNav />
      <RightSidebar />
      <main className="pt-12 lg:pr-[220px]">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
