import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { Flame, Command, Plane } from 'lucide-react'
import { Brand } from './Brand'
import { navItems } from './navigation'
import { useAppStore } from '@/stores/useAppStore'
import { rankFor } from '@/features/gamification/ranks'
import { useUiStore } from '@/stores/useUiStore'
import { AnimatedNumber } from '@/components/ui/Feedback'

export function Sidebar() {
  const xp = useAppStore((s) => s.stats.xp)
  const streak = useAppStore((s) => s.streak.current)
  const rank = rankFor(xp)
  const setCommandOpen = useUiStore((s) => s.setCommandOpen)

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-canvas/80 px-4 py-7 backdrop-blur-xl lg:flex xl:w-[248px] xl:px-5">
      <NavLink to="/" className="mb-12 px-2"><Brand /></NavLink>

      <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'group relative flex items-center gap-3 rounded-tile px-3 py-2.5 text-sm transition-all duration-200',
              isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface/60 hover:text-ink',
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-accent" />}
                <Icon size={18} strokeWidth={1.8} />
                <span className="font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button onClick={() => setCommandOpen(true)} className="btn btn-ghost mb-4 justify-start !px-3 text-xs">
        <Command size={15} /> Command menu <span className="ml-auto rounded-chip border border-line px-1.5 py-0.5 num text-[0.625rem]">⌘K</span>
      </button>

      <div className="glass-panel rounded-tile p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow !text-[0.5625rem]">Current rank</span>
          <Flame size={14} className="text-accent" />
        </div>
        <div className="mt-2 font-display text-base font-bold">{rank.name}</div>
        <div className="mt-1 flex items-baseline justify-between text-xs text-muted">
          <span><AnimatedNumber value={xp} className="num text-ink" /> XP</span>
          <span className="num">{streak} day streak</span>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 px-2 text-[0.625rem] text-faint">
        <Plane size={12} /> FlightMath practice material
      </div>
    </aside>
  )
}
