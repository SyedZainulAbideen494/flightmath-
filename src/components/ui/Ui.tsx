import type { ReactNode } from 'react'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useMotionPref } from '@/hooks/useMotionPref'

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('eyebrow', className)}>{children}</div>
}

export function Card({ children, className, glass = true }: { children: ReactNode; className?: string; glass?: boolean }) {
  return (
    <div className={clsx(glass ? 'glass-panel rounded-panel' : 'bg-surface rounded-panel border border-line', className)}>
      {children}
    </div>
  )
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'error' | 'gold'; className?: string }) {
  const tones = {
    neutral: 'border-line-strong text-muted',
    accent: 'border-accent/50 text-accent',
    success: 'border-sage/50 text-sage',
    error: 'border-coral/50 text-coral',
    gold: 'border-gold/50 text-gold',
  }
  return <span className={clsx('inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide', tones[tone], className)}>{children}</span>
}

export function ProgressBar({ value, className, tone = 'amber' }: { value: number; className?: string; tone?: 'amber' | 'sage' | 'coral' }) {
  const reduced = useMotionPref()
  const color = tone === 'sage' ? 'bg-sage' : tone === 'coral' ? 'bg-coral' : 'bg-accent'
  return (
    <div className={clsx('track', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className={clsx('h-full rounded-full', color)}
        initial={false}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 140, damping: 24 }}
      />
    </div>
  )
}

export function SectionTitle({ eyebrow, title, action, className }: { eyebrow?: string; title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h2 className="text-[1.6rem] font-bold tracking-[-0.025em] sm:text-[2rem]">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="glass-panel flex flex-col items-start gap-4 rounded-panel px-6 py-10 sm:px-9">
      {icon && <div className="grid h-12 w-12 place-items-center rounded-tile border border-accent/30 bg-accent-soft text-accent">{icon}</div>}
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">{body}</p>
      </div>
      {action}
    </div>
  )
}

export function StatLine({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <div>
        <div className="text-sm text-muted">{label}</div>
        {sub && <div className="text-xs text-faint">{sub}</div>}
      </div>
      <div className="num text-lg font-semibold">{value}</div>
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={clsx('hairline', className)} />
}
