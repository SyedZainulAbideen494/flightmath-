import { Flame, Zap } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Brand } from './Brand'
import { useAppStore } from '@/stores/useAppStore'
import { rankFor } from '@/features/gamification/ranks'
import { AnimatedNumber } from '@/components/ui/Feedback'

const titles: Record<string, string> = {
  '/learn': 'Learning path',
  '/practice': 'Practice',
  '/tricks': 'Tricks Lab',
  '/mistakes': 'Mistake Bank',
  '/progress': 'Progress',
  '/daily': 'Daily training',
  '/formulas': 'Formula reference',
  '/achievements': 'Achievements',
  '/settings': 'Settings',
}

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const xp = useAppStore((s) => s.stats.xp)
  const streak = useAppStore((s) => s.streak.current)
  const title = titles[location.pathname]

  return (
    <header className="pt-safe sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line/70 bg-canvas/70 px-5 py-3 backdrop-blur-xl lg:hidden">
      {title ? (
        <button onClick={() => navigate(-1)} className="text-left">
          <div className="eyebrow !text-[0.5625rem]">FlightMath</div>
          <div className="font-display text-lg font-bold tracking-[-0.02em]">{title}</div>
        </button>
      ) : <Brand />}
      <div className="flex items-center gap-2">
        <span className="pill flex items-center gap-1.5 !py-1.5 text-accent"><Flame size={13} /><span className="num">{streak}</span></span>
        <span className="pill flex items-center gap-1.5 !py-1.5"><Zap size={13} className="text-gold" /><AnimatedNumber value={xp} className="num" /></span>
      </div>
    </header>
  )
}

export function DesktopTopStrip() {
  const xp = useAppStore((s) => s.stats.xp)
  const rank = rankFor(xp)
  return (
    <div className="hidden items-center justify-between px-10 pb-2 pt-6 lg:flex xl:px-14">
      <div className="eyebrow">Warm up the mind · {rank.name}</div>
      <div className="text-xs text-faint">⌘K for commands · all progress saved locally</div>
    </div>
  )
}
