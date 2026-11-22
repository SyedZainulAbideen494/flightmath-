import type { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar, DesktopTopStrip } from '@/components/layout/TopBar'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { ToastViewport, Celebration } from '@/components/ui/Feedback'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="atmosphere" />
      <div className="grain" />
      <Sidebar />
      <div className="lg:pl-[232px] xl:pl-[248px]">
        <TopBar />
        <DesktopTopStrip />
        <main className="mx-auto w-full max-w-[1320px] px-5 pb-28 pt-6 sm:px-8 lg:pb-16 lg:pt-2 xl:px-14">
          {children}
        </main>
      </div>
      <BottomNav />
      <CommandPalette />
      <ToastViewport />
      <Celebration />
    </div>
  )
}
