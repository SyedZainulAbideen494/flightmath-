import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { MoreHorizontal, X } from 'lucide-react'
import { primaryNav, moreNav } from './navigation'

export function BottomNav() {
  const [more, setMore] = useState(false)
  const location = useLocation()
  const isMoreActive = moreNav.some((item) => location.pathname.startsWith(item.to))

  return (
    <>
      {more && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMore(false)} aria-label="Close more menu" />
          <div className="glass-strong absolute inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] rounded-panel p-3">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="eyebrow">More</span>
              <button onClick={() => setMore(false)} className="btn btn-ghost !min-h-0 !h-8 !w-8 !p-0" aria-label="Close"><X size={17} /></button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {moreNav.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMore(false)}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-2.5 rounded-tile px-3 py-3 text-sm',
                    isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface/60 hover:text-ink',
                  )}
                >
                  <Icon size={17} /> {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-line bg-canvas/90 px-2 pt-1.5 backdrop-blur-2xl lg:hidden"
        style={{ paddingBottom: 'calc(0.4rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {primaryNav.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'relative flex min-w-[56px] flex-col items-center gap-1 rounded-tile px-1 py-1.5 text-[0.625rem] font-medium transition-colors',
              isActive ? 'text-accent' : 'text-faint',
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute -top-1.5 h-[2px] w-7 rounded-full bg-accent" />}
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.7} />
                <span>{label === 'Mistake Bank' ? 'Mistakes' : label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setMore(true)}
          aria-label="More navigation"
          className={clsx('flex min-w-[56px] flex-col items-center gap-1 px-1 py-1.5 text-[0.625rem] font-medium', isMoreActive ? 'text-accent' : 'text-faint')}
        >
          <MoreHorizontal size={20} strokeWidth={1.8} />
          <span>More</span>
        </button>
      </nav>
    </>
  )
}
