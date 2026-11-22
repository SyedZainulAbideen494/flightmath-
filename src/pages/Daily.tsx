import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Clock3, Flame, Play, RotateCcw, Sparkles, Target } from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/Button'
import { Badge, Eyebrow, ProgressBar } from '@/components/ui/Ui'
import { ConsistencyStrip } from '@/components/charts/Charts'
import { computeMissionProgress } from '@/features/gamification/missions'
import { recommendedLevel } from '@/features/learning/unlock'
import { levelById } from '@/data/curriculum/chapters'
import { formatDuration } from '@/lib/format'
import { todayKey } from '@/lib/defaults'
import clsx from 'clsx'

export function Daily() {
  const navigate = useNavigate()
  const state = useAppStore()
  const missions = computeMissionProgress(state)
  const due = useMemo(() => Object.values(state.concepts).filter((stat) => stat.attempts > 0 && stat.dueAt <= Date.now()), [state.concepts])
  const todayAttempts = useMemo(() => state.attempts.filter((attempt) => todayKey(new Date(attempt.at)) === todayKey()), [state.attempts])
  const correctToday = todayAttempts.filter((attempt) => attempt.correct).length
  const trainedMs = todayAttempts.reduce((sum, attempt) => sum + attempt.timeMs, 0)
  const goalMs = state.settings.dailyGoalMinutes * 60_000
  const goalProgress = Math.min(100, (trainedMs / goalMs) * 100)
  const recommendedId = recommendedLevel(state.levels)
  const recommended = levelById[recommendedId]
  const done = missions.filter((mission) => mission.done).length
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-10 pb-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <Eyebrow className="mb-4 flex items-center gap-2 text-accent"><span className="h-px w-6 bg-accent" /> Daily training</Eyebrow>
          <h1 className="display text-[clamp(2.3rem,5.6vw,4.2rem)] font-extralight">{today}.</h1>
          <p className="mt-5 max-w-xl text-muted">A steady rhythm beats a rare heroics session. Finish today&apos;s plan and keep the line moving.</p>
        </div>
        <div className="glass-panel rounded-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Eyebrow className="mb-2">Current streak</Eyebrow>
              <div className="flex items-baseline gap-2"><span className="num text-4xl font-semibold text-accent">{state.streak.current}</span><span className="text-sm text-muted">day{state.streak.current === 1 ? '' : 's'}</span></div>
            </div>
            <Flame size={34} className="text-accent" />
          </div>
          <div className="mt-5"><ConsistencyStrip activeDates={state.streak.dates} /></div>
          <div className="mt-3 text-xs text-faint">Longest run: {state.streak.longest} days</div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow className="mb-2">Today&apos;s flight plan</Eyebrow>
              <h2 className="text-2xl font-bold">Daily missions</h2>
            </div>
            <Badge tone={done === missions.length ? 'success' : 'accent'}>{done}/{missions.length} complete</Badge>
          </div>
          <div className="space-y-2">
            {missions.map((mission) => (
              <Link key={mission.id} to={mission.link} className="group flex items-center gap-4 rounded-tile border border-line bg-inset/30 px-4 py-4 transition-colors hover:border-accent/50">
                <span className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-full border', mission.done ? 'border-sage/60 bg-sage/10 text-sage' : 'border-line-strong text-faint')}>
                  {mission.done ? <Check size={16} /> : <Target size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={clsx('block text-sm font-medium', mission.done && 'text-muted line-through')}>{mission.title}</span>
                  <ProgressBar value={(mission.progress / mission.target) * 100} className="mt-2 max-w-xs" tone={mission.done ? 'sage' : 'amber'} />
                </span>
                <span className="num shrink-0 text-xs text-faint">{mission.progress}/{mission.target}</span>
                <span className="num shrink-0 text-xs text-gold">+{mission.xp} XP</span>
                <ArrowRight size={15} className="shrink-0 text-faint transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
          {done === missions.length && (
            <div className="mt-6 flex items-center gap-3 rounded-tile border border-sage/40 bg-sage/10 p-4 text-sm text-sage">
              <Sparkles size={17} /> All missions complete. Fly a bonus session if you feel sharp.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="glass-panel relative overflow-hidden rounded-panel p-6 sm:p-8">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
            <Eyebrow className="mb-3">Daily goal</Eyebrow>
            <div className="flex items-baseline justify-between">
              <span className="font-display text-3xl font-bold">{formatDuration(trainedMs)}</span>
              <span className="num text-sm text-muted">/ {state.settings.dailyGoalMinutes}:00</span>
            </div>
            <ProgressBar value={goalProgress} className="mt-4" tone={goalProgress >= 100 ? 'sage' : 'amber'} />
            <div className="mt-3 flex justify-between text-xs text-faint"><span>{correctToday} correct today</span><span>{Math.round(goalProgress)}% of goal</span></div>
          </div>

          <div className="glass-panel rounded-panel p-6 sm:p-8">
            <Eyebrow className="mb-3">Ten-question challenge</Eyebrow>
            <h2 className="font-display text-xl font-bold">Today&apos;s checkride warm-up</h2>
            <p className="mt-2 text-sm text-muted">A fresh mixed set drawn from your unlocked curriculum.</p>
            <Button variant="amber" className="mt-5" full onClick={() => navigate('/session/daily')} icon={<Play size={16} fill="currentColor" />}>Take the challenge</Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-3">Recommended lesson</Eyebrow>
          <h2 className="font-display text-2xl font-bold">{recommended?.title ?? 'Ready for take-off'}</h2>
          <p className="mt-2 text-sm text-muted">{recommended?.descriptor ?? 'Start with the foundations and FlightMath will chart the route.'}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate(`/lesson/${recommendedId}`)} variant="accent">See concept</Button>
            <Button onClick={() => navigate(`/session/lesson/${recommendedId}`)} trailing={<ArrowRight size={15} />}>Start lesson</Button>
          </div>
        </div>

        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-3">Spaced repetition</Eyebrow>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold">Review queue</h2>
            <span className="num text-lg text-accent">{due.length}</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            {due.length ? 'Concepts whose recall window is open right now.' : 'All caught up. FlightMath will surface concepts when they need another pass.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate('/session/review')} icon={<RotateCcw size={15} />}>Review now</Button>
            <Link to="/mistakes" className="btn btn-ghost">Open Mistake Bank</Link>
          </div>
        </div>
      </section>

      <section className="glass-panel flex flex-wrap items-center justify-between gap-5 rounded-panel p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-tile border border-accent/40 bg-accent-soft text-accent"><Clock3 size={22} /></div>
          <div>
            <Eyebrow className="mb-1">Short on time?</Eyebrow>
            <h2 className="font-display text-lg font-bold">Two focused minutes still count.</h2>
          </div>
        </div>
        <Button onClick={() => navigate('/session/quick?minutes=2')}>Quick 2-minute session</Button>
      </section>
    </div>
  )
}
