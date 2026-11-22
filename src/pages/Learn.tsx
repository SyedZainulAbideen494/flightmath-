import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calculator, Sparkles, Percent, PieChart, Scale, Boxes, Gauge, ChartNoAxesColumn,
  Parentheses, Fuel, Shapes, Grid3X3, Compass, Plane, Target, Lock, Check, Play, Star, CircleDot,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { chapters } from '@/data/curriculum/chapters'
import type { Level, LevelStat } from '@/lib/types'
import { useAppStore } from '@/stores/useAppStore'
import { isLevelUnlocked } from '@/features/learning/unlock'
import { Badge, Eyebrow, ProgressBar } from '@/components/ui/Ui'
import { chapterProgress } from '@/features/learning/unlock'
import { useMotionPref } from '@/hooks/useMotionPref'
import clsx from 'clsx'

const icons: Record<string, LucideIcon> = {
  calculator: Calculator, sparkles: Sparkles, percent: Percent, fractions: PieChart,
  scale: Scale, units: Boxes, gauge: Gauge, chart: ChartNoAxesColumn, brackets: Parentheses,
  fuel: Fuel, pattern: Shapes, dice: Grid3X3, shapes: Shapes, grid: Grid3X3,
  compass: Compass, plane: Plane, target: Target,
}

function statusOf(level: Level, stats: Record<string, LevelStat>, unlocked: boolean): LevelStat['status'] | 'locked' {
  if (!unlocked) return 'locked'
  return stats[level.id]?.status ?? 'available'
}

const statusStyles: Record<string, string> = {
  locked: 'border-line-strong bg-inset/70 text-faint',
  available: 'border-accent bg-accent-soft text-accent shadow-[0_0_0_6px_rgba(215,141,96,0.07)]',
  'in-progress': 'border-gold/70 bg-gold/10 text-gold',
  completed: 'border-sage/60 bg-sage/10 text-sage',
  perfected: 'border-sage bg-sage/15 text-sage',
  mastered: 'border-gold bg-gold/15 text-gold',
}

export function Learn() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const reduced = useMotionPref()
  const levelStats = useAppStore((s) => s.levels)
  const selectedId = params.get('chapter') ?? chapters[0].id
  const chapter = chapters.find((c) => c.id === selectedId) ?? chapters[0]
  const [hovered, setHovered] = useState<string | null>(null)

  const progress = chapterProgress(chapter.id, levelStats)
  const step = 132
  const height = chapter.levels.length * step + 90
  const points = useMemo(() => chapter.levels.map((_, i) => ({
    x: 28 + Math.sin(i * 0.95 + 0.4) * 15 + (i % 2) * 6,
    y: 62 + i * step,
  })), [chapter, step])

  const path = points.map((point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`
    const previous = points[i - 1]
    const midY = (previous.y + point.y) / 2
    return `C ${previous.x} ${midY}, ${point.x} ${midY}, ${point.x} ${point.y}`
  }).join(' ')

  const completedCount = chapter.levels.filter((level) => ['completed', 'perfected', 'mastered'].includes(levelStats[level.id]?.status ?? '')).length

  return (
    <div className="space-y-8 pb-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Eyebrow className="mb-3">Learning path</Eyebrow>
          <h1 className="display text-[clamp(2.2rem,4.4vw,3.6rem)] font-bold">Your route to fluency.</h1>
          <p className="mt-3 max-w-xl text-muted">Follow the path in order, revisit unlocked lessons, and clear each chapter checkpoint.</p>
        </div>
        <div className="glass-panel rounded-panel px-6 py-4 lg:min-w-[260px]">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Chapter progress</span>
            <span className="num text-lg font-semibold">{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} className="mt-3" />
          <div className="mt-2 text-xs text-faint">{completedCount} of {chapter.levels.length} levels cleared</div>
        </div>
      </section>

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
        {chapters.map((item) => {
          const active = item.id === chapter.id
          const percent = chapterProgress(item.id, levelStats)
          return (
            <button
              key={item.id}
              onClick={() => setParams({ chapter: item.id })}
              className={clsx(
                'flex shrink-0 items-center gap-2.5 rounded-btn border px-4 py-2.5 text-sm transition-all',
                active ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-muted hover:border-accent/50 hover:text-ink',
              )}
            >
              <span className="num text-xs text-faint">{String(item.index).padStart(2, '0')}</span>
              {item.title}
              {percent === 100 && <Check size={13} className="text-sage" />}
            </button>
          )
        })}
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="glass-panel h-fit rounded-panel p-6 sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <Badge tone="accent">Chapter {String(chapter.index).padStart(2, '0')}</Badge>
            {chapter.levels.some((l) => l.kind === 'boss') && <Badge tone="gold"><Star size={11} /> Checkpoint</Badge>}
          </div>
          <h2 className="font-display text-3xl font-bold tracking-[-0.03em]">{chapter.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{chapter.subtitle}</p>
          <div className="hairline my-6" />
          <div className="space-y-3 text-sm text-muted">
            <div className="flex justify-between"><span>Lessons</span><span className="num text-ink">{chapter.levels.filter((l) => l.kind === 'lesson').length}</span></div>
            <div className="flex justify-between"><span>Checkpoints</span><span className="num text-ink">{chapter.levels.filter((l) => l.kind !== 'lesson').length}</span></div>
            <div className="flex justify-between"><span>Cleared</span><span className="num text-ink">{completedCount}</span></div>
          </div>
          <div className="mt-7 rounded-tile border border-line bg-inset/50 p-4 text-xs leading-relaxed text-muted">
            {chapter.id === 'pilot-math' || chapter.id === 'adapt'
              ? 'All content here is FlightMath practice material, not official assessment content.'
              : 'Pass a level with 70% accuracy to unlock the next node. Boss checkpoints need 80%.'}
          </div>
        </div>

        <div className="glass-panel relative overflow-hidden rounded-panel px-4 py-6 sm:px-8">
          <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
            <div className="absolute left-[18%] top-[10%] h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute bottom-[6%] right-[8%] h-56 w-56 rounded-full bg-gold/10 blur-3xl" />
          </div>
          <svg
            className="pointer-events-none absolute inset-x-0 top-0 h-full w-full"
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={path} fill="none" stroke="var(--border-strong)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeDasharray="5 8" />
          </svg>

          <div className="relative" style={{ height }}>
            {chapter.levels.map((level, i) => {
              const unlocked = isLevelUnlocked(level.id, levelStats)
              const status = statusOf(level, levelStats, unlocked)
              const Icon = icons[chapter.icon] ?? CircleDot
              const point = points[i]
              const stat = levelStats[level.id]
              return (
                <motion.div
                  key={level.id}
                  className={clsx('absolute flex items-center gap-4', i % 2 === 0 ? 'flex-row' : 'flex-row-reverse text-right')}
                  style={{ left: `${point.x}%`, top: point.y, transform: 'translate(-50%, -50%)' }}
                  initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24, delay: i * 0.03 }}
                >
                  <button
                    onClick={() => unlocked && navigate(`/lesson/${level.id}`)}
                    onMouseEnter={() => setHovered(level.id)}
                    onMouseLeave={() => setHovered(null)}
                    disabled={!unlocked}
                    aria-label={`${level.title} — ${status}`}
                    className={clsx(
                      'relative grid h-14 w-14 shrink-0 place-items-center rounded-full border transition-all duration-200 sm:h-16 sm:w-16',
                      statusStyles[status],
                      unlocked && 'hover:scale-110',
                      !unlocked && 'cursor-not-allowed',
                    )}
                  >
                    {status === 'locked' ? <Lock size={19} /> : <Icon size={22} strokeWidth={1.8} />}
                    {level.kind !== 'lesson' && <span className="absolute -bottom-1 rounded-full border border-gold/50 bg-canvas px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-wider text-gold">Boss</span>}
                  </button>
                  <div className={clsx('max-w-[190px]', i % 2 !== 0 && 'text-right')}>
                    <div className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-faint">Level {level.index}</div>
                    <div className={clsx('mt-0.5 text-sm font-semibold leading-tight', unlocked ? 'text-ink' : 'text-faint')}>{level.title}</div>
                    {(status === 'completed' || status === 'perfected' || status === 'mastered') && (
                      <div className="mt-1 flex items-center gap-1 text-[0.6875rem] text-sage" style={{ justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end' }}>
                        <Check size={11} /> {stat?.bestScore ?? 100}%
                      </div>
                    )}
                    {hovered === level.id && unlocked && (
                      <button onClick={() => navigate(`/session/${level.kind}/${level.id}`)} className="btn btn-accent btn-sm mt-2 !min-h-0 !h-8 !px-3 !text-[0.6875rem]">
                        <Play size={11} /> Play
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-faint">
        <Link to="/practice" className="hover:text-ink">Skip to practice modes →</Link>
        <span>Locked levels open as you pass the previous checkpoint.</span>
      </div>
    </div>
  )
}
