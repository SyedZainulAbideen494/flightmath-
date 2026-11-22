import { useId } from 'react'

export function Sparkline({ values, height = 72, color = 'var(--warm-amber)', label }: { values: number[]; height?: number; color?: string; label?: string }) {
  const id = useId()
  if (values.length < 2) return <div className="grid h-[72px] place-items-center text-xs text-faint">Train a little to see your trend.</div>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((value, i) => `${(i / (values.length - 1)) * 100},${100 - ((value - min) / span) * 86 - 7}`).join(' ')
  const area = `0,100 ${points} 100,100`
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} className="w-full overflow-visible" role="img" aria-label={label ?? 'Trend chart'}>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#spark-${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="100" cy={100 - ((values.at(-1)! - min) / span) * 86 - 7} r="2.2" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function BarChart({ values, labels, height = 120 }: { values: number[]; labels?: string[]; height?: number }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {values.map((value, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-sienna/40 to-amber/90 transition-all duration-500"
              style={{ height: `${Math.max(3, (value / max) * 100)}%` }}
              title={`${labels?.[i] ?? `Day ${i + 1}`}: ${value}`}
            />
          </div>
          {labels && <span className="text-[0.625rem] text-faint">{labels[i]}</span>}
        </div>
      ))}
    </div>
  )
}

export function Ring({ value, size = 112, stroke = 8, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={label ?? `${Math.round(value)} percent`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--warm-amber)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.2,0.8,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="num text-xl font-semibold">{Math.round(value)}<span className="text-xs text-muted">%</span></span>
      </div>
    </div>
  )
}

export function ConsistencyStrip({ activeDates }: { activeDates: string[] }) {
  const days = Array.from({ length: 35 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (34 - i))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return { key, active: activeDates.includes(key), today: i === 34 }
  })
  return (
    <div className="grid grid-cols-7 gap-1.5" role="img" aria-label="Training consistency over five weeks">
      {days.map((day) => (
        <div
          key={day.key}
          title={day.key}
          className={`aspect-square rounded-[5px] border ${day.active ? 'border-amber/50 bg-amber/45' : 'border-line bg-surface/40'} ${day.today ? 'ring-1 ring-accent' : ''}`}
        />
      ))}
    </div>
  )
}
