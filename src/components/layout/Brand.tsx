import clsx from 'clsx'

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-accent/40 bg-accent-soft">
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" strokeOpacity="0.35" className="text-accent" />
          <path d="M16 4.5 19.2 16 16 13.6 12.8 16 16 4.5Z" fill="currentColor" className="text-gold" />
          <path d="M16 27.5 12.8 16 16 18.4 19.2 16 16 27.5Z" fill="currentColor" className="text-accent/70" />
          <circle cx="16" cy="16" r="2" fill="currentColor" className="text-ink" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[1.0625rem] font-extrabold tracking-[-0.03em]">Flight<span className="text-accent">Math</span></div>
          <div className="mt-1 text-[0.5625rem] font-medium uppercase tracking-[0.19em] text-faint">Mind · Speed · Precision</div>
        </div>
      )}
    </div>
  )
}
