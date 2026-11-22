import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, Bomb, CalendarDays, Clock3, Crosshair, GraduationCap, Layers3,
  Plane, Repeat2, Sparkles, Target, Timer, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, Eyebrow, ProgressBar, SectionTitle } from '@/components/ui/Ui'
import { useAppStore } from '@/stores/useAppStore'
import { chapters } from '@/data/curriculum/chapters'
import { weakestConcepts } from '@/features/progress/mastery'
import clsx from 'clsx'

type ModeId = 'daily' | 'sprint' | 'lightning' | 'precision' | 'survival' | 'exam' | 'pilot' | 'weakness' | 'review' | 'mistakes' | 'quick'

interface ModeInfo {
  id: ModeId
  title: string
  tagline: string
  detail: string
  icon: LucideIcon
  tone: 'amber' | 'sage' | 'gold' | 'coral'
  tag: string
}

const modes: ModeInfo[] = [
  { id: 'daily', title: 'Daily challenge', tagline: 'Ten fresh questions, every day.', detail: 'A balanced mix drawn from everything you have unlocked. No lesson interruptions.', icon: CalendarDays, tone: 'amber', tag: '10 questions' },
  { id: 'sprint', title: '60-second sprint', tagline: 'How much can you clear in a minute?', detail: 'Fast arithmetic under the clock. Answers lock in as soon as they are submitted.', icon: Timer, tone: 'gold', tag: 'Timed' },
  { id: 'lightning', title: 'Lightning round', tagline: 'Twelve questions, no time to dwell.', detail: 'Quick recognition and clean mental steps. Hints remain available if you need them.', icon: Zap, tone: 'amber', tag: '12 questions' },
  { id: 'precision', title: 'Precision mode', tagline: 'Slow is smooth. Smooth is fast.', detail: 'Harder questions where accuracy matters more than speed. Review every explanation.', icon: Crosshair, tone: 'sage', tag: 'Accuracy' },
  { id: 'survival', title: 'Survival mode', tagline: 'Three slips and the run ends.', detail: 'Twenty questions with a three-mistake limit. Stay calm and protect your rhythm.', icon: Bomb, tone: 'coral', tag: '3 lives' },
  { id: 'exam', title: 'Practice exam', tagline: 'Sit a full FlightMath paper.', detail: 'Exam conditions: no hints, a per-question clock and a review screen before results.', icon: GraduationCap, tone: 'amber', tag: 'Exam conditions' },
  { id: 'pilot', title: 'Pilot challenge', tagline: 'Fuel, speed, distance and planning.', detail: 'Aviation-flavoured mental maths using FlightMath practice scenarios. Never official assessment material.', icon: Plane, tone: 'sage', tag: 'Aviation' },
  { id: 'weakness', title: 'Weakness drill', tagline: 'Aim straight at your roughest topic.', detail: 'FlightMath selects the concepts with the lowest mastery from your recent work.', icon: Target, tone: 'coral', tag: 'Adaptive' },
  { id: 'review', title: 'Spaced review', tagline: 'Bring back what is about to fade.', detail: 'Questions are chosen from concepts whose review interval is due right now.', icon: Repeat2, tone: 'gold', tag: 'Due today' },
  { id: 'mistakes', title: 'Retry mistakes', tagline: 'Turn old slips into clean recalls.', detail: 'Revisit the concepts behind your incorrect answers with freshly generated numbers.', icon: Layers3, tone: 'sage', tag: 'Recovery' },
  { id: 'quick', title: 'Quick start', tagline: 'A short session on your schedule.', detail: 'Pick a duration and FlightMath builds a compact, mixed practice set.', icon: Clock3, tone: 'amber', tag: 'Flexible' },
]

const toneClass: Record<ModeInfo['tone'], string> = {
  amber: 'border-accent/40 bg-accent-soft text-accent',
  sage: 'border-sage/40 bg-sage/10 text-sage',
  gold: 'border-gold/40 bg-gold/10 text-gold',
  coral: 'border-coral/40 bg-coral/10 text-coral',
}

export function Practice() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const requested = params.get('mode') as ModeId | null
  const [selected, setSelected] = useState<ModeId>(modes.some((m) => m.id === requested) ? requested! : 'daily')
  const [examCount, setExamCount] = useState(10)
  const [minutes, setMinutes] = useState(5)
  const attempts = useAppStore((s) => s.attempts)
  const concepts = useAppStore((s) => s.concepts)
  const sessions = useAppStore((s) => s.sessions)

  const active = modes.find((mode) => mode.id === selected) ?? modes[0]
  const dueCount = useMemo(() => Object.values(concepts).filter((c) => c.attempts > 0 && c.dueAt <= Date.now()).length, [concepts])
  const mistakeCount = useMemo(() => attempts.filter((a) => !a.correct).length, [attempts])
  const weak = weakestConcepts(concepts, 1)[0]
  const recentAccuracy = useMemo(() => {
    const recent = attempts.slice(-40)
    if (!recent.length) return 0
    return Math.round((recent.filter((a) => a.correct).length / recent.length) * 100)
  }, [attempts])

  const path = useMemo(() => {
    if (selected === 'exam') return `/session/exam?count=${examCount}`
    if (selected === 'quick') return `/session/quick?minutes=${minutes}`
    return `/session/${selected}`
  }, [selected, examCount, minutes])

  return (
    <div className="space-y-10 pb-10">
      <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
        <div>
          <Eyebrow className="mb-4 flex items-center gap-2 text-accent"><span className="h-px w-6 bg-accent" /> Training modes</Eyebrow>
          <h1 className="display text-[clamp(2.4rem,5.8vw,4.4rem)] font-extralight">Choose your <span className="font-extrabold text-accent">flight plan.</span></h1>
          <p className="mt-5 max-w-xl text-muted">Every mode generates fresh questions locally. Pick a goal, then fly it.</p>
        </div>
        <div className="glass-panel rounded-panel p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Recent accuracy</span>
            <span className="num text-2xl font-semibold">{recentAccuracy}%</span>
          </div>
          <ProgressBar value={recentAccuracy} className="mt-3" tone={recentAccuracy >= 75 ? 'sage' : 'amber'} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted">
            <div><span className="num mr-1 text-ink">{sessions.length}</span> sessions</div>
            <div><span className="num mr-1 text-ink">{mistakeCount}</span> slips logged</div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Free practice" title="Pick a mode" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modes.map((mode) => {
            const Icon = mode.icon
            const activeCard = mode.id === selected
            return (
              <button
                key={mode.id}
                onClick={() => setSelected(mode.id)}
                aria-pressed={activeCard}
                className={clsx(
                  'group rounded-panel border p-5 text-left transition-all duration-200',
                  activeCard ? 'border-accent bg-accent-soft shadow-float' : 'border-line bg-surface/40 hover:border-accent/50 hover:bg-surface/70',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={clsx('grid h-11 w-11 place-items-center rounded-tile border', toneClass[mode.tone])}><Icon size={20} /></span>
                  <Badge tone={mode.tone === 'coral' ? 'error' : mode.tone === 'sage' ? 'success' : mode.tone === 'gold' ? 'gold' : 'accent'}>{mode.tag}</Badge>
                </div>
                <div className="mt-5 font-display text-lg font-bold tracking-[-0.02em]">{mode.title}</div>
                <p className="mt-1 text-sm font-medium text-accent">{mode.tagline}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{mode.detail}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="glass-panel rounded-panel p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <Eyebrow className="mb-3">Selected flight plan</Eyebrow>
            <h2 className="font-display text-[1.8rem] font-bold tracking-[-0.03em]">{active.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{active.detail}</p>

            {active.id === 'exam' && (
              <div className="mt-6">
                <div className="mb-2 text-xs text-muted">Paper length</div>
                <div className="flex flex-wrap gap-2">
                  {[10, 20, 30, 50].map((count) => (
                    <button key={count} onClick={() => setExamCount(count)} className={clsx('rounded-btn border px-4 py-2 text-sm', examCount === count ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-muted hover:text-ink')}>
                      {count} questions
                    </button>
                  ))}
                </div>
              </div>
            )}
            {active.id === 'quick' && (
              <div className="mt-6">
                <div className="mb-2 text-xs text-muted">Duration</div>
                <div className="flex flex-wrap gap-2">
                  {[2, 5, 10, 15].map((value) => (
                    <button key={value} onClick={() => setMinutes(value)} className={clsx('rounded-btn border px-4 py-2 text-sm', minutes === value ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-muted hover:text-ink')}>
                      {value} min
                    </button>
                  ))}
                </div>
              </div>
            )}
            {active.id === 'weakness' && (
              <p className="mt-6 rounded-tile border border-line bg-inset/50 p-4 text-sm text-muted">
                {weak ? <>Current focus: <span className="text-ink">{weak.label}</span> · mastery {weak.mastery}%.</> : 'Not enough data yet — the session will use your unlocked curriculum while FlightMath learns your weak spots.'}
              </p>
            )}
            {active.id === 'review' && (
              <p className="mt-6 rounded-tile border border-line bg-inset/50 p-4 text-sm text-muted">
                <span className="num mr-1 text-ink">{dueCount}</span> concept{dueCount === 1 ? '' : 's'} due for review right now.
              </p>
            )}
            {active.id === 'mistakes' && (
              <p className="mt-6 rounded-tile border border-line bg-inset/50 p-4 text-sm text-muted">
                <span className="num mr-1 text-ink">{mistakeCount}</span> incorrect answer{mistakeCount === 1 ? '' : 's'} in your history.
              </p>
            )}
          </div>

          <div className="rounded-panel border border-line bg-inset/40 p-6">
            <Eyebrow className="mb-4">Chapter coverage</Eyebrow>
            <div className="space-y-2.5">
              {chapters.slice(0, 5).map((chapter) => (
                <div key={chapter.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate text-muted">{chapter.title}</span>
                  <span className="num shrink-0 text-xs text-faint">{chapter.levels.length} levels</span>
                </div>
              ))}
            </div>
            <div className="hairline my-5" />
            <Button variant="amber" size="lg" full onClick={() => navigate(path)} trailing={<ArrowRight size={17} />}>
              Start {active.title.toLowerCase()}
            </Button>
            <p className="mt-3 text-center text-[0.6875rem] text-faint">FlightMath practice material · generated locally, offline ready.</p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-4 text-xs text-faint">
        <span className="flex items-center gap-1.5"><Sparkles size={13} /> Fresh numbers every attempt</span>
        <span className="flex items-center gap-1.5"><Target size={13} /> Adaptive difficulty</span>
        <span className="flex items-center gap-1.5"><Clock3 size={13} /> Saved progress on this device</span>
      </section>
    </div>
  )
}
