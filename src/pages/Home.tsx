import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Flame, Zap, Play, Sparkles, Target, Clock3, Trophy, Compass, AlertCircle, Check,
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/Button'
import { Badge, Eyebrow, ProgressBar } from '@/components/ui/Ui'
import { Ring, ConsistencyStrip } from '@/components/charts/Charts'
import { rankProgress } from '@/features/gamification/ranks'
import { computeMissionProgress } from '@/features/gamification/missions'
import { weakestConcepts } from '@/features/progress/mastery'
import { recommendedLevel } from '@/features/learning/unlock'
import { chapters, levelById } from '@/data/curriculum/chapters'
import { achievements } from '@/features/gamification/achievements'
import { greeting, formatDuration } from '@/lib/format'
import { AnimatedNumber } from '@/components/ui/Feedback'
import { useMotionPref } from '@/hooks/useMotionPref'

export function Home() {
  const navigate = useNavigate()
  const reduced = useMotionPref()
  const state = useAppStore()
  const [quickMinutes, setQuickMinutes] = useState(5)

  const rank = rankProgress(state.stats.xp)
  const missions = computeMissionProgress(state)
  const weakest = weakestConcepts(state.concepts, 1)[0]
  const recommendedId = recommendedLevel(state.levels)
  const recommended = levelById[recommendedId]
  const chapter = chapters.find((c) => c.id === recommended?.chapterId)
  const completedToday = useMemo(() => {
    const key = new Date().toDateString()
    return state.attempts.filter((a) => new Date(a.at).toDateString() === key)
  }, [state.attempts])
  const correctToday = completedToday.filter((a) => a.correct).length
  const goalMinutes = state.settings.dailyGoalMinutes
  const trainedMs = completedToday.reduce((sum, a) => sum + a.timeMs, 0)
  const goalProgress = Math.min(100, (trainedMs / 1000 / 60 / goalMinutes) * 100)
  const recentAchievements = state.achievements.slice(-3).reverse()

  return (
    <div className="space-y-14 pb-8">
      <section className="grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
        <div>
          <Eyebrow className="mb-4 flex items-center gap-2 text-accent"><span className="h-px w-6 bg-accent" /> {greeting()}, {state.profile.name}</Eyebrow>
          <h1 className="display max-w-3xl text-[clamp(2.6rem,6.4vw,5rem)] font-extralight">
            Ready for your <span className="font-extrabold text-accent">next flight?</span>
          </h1>
          <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-muted">
            A few focused minutes today make the calculation feel automatic tomorrow.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button variant="amber" size="lg" onClick={() => navigate(`/session/lesson/${recommendedId}`)} icon={<Play size={17} fill="currentColor" />}>
              Continue training
            </Button>
            <Button onClick={() => navigate('/learn')} trailing={<ArrowRight size={16} />}>View learning path</Button>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
            <span className="flex items-center gap-2 text-muted"><Zap size={15} className="text-gold" /><AnimatedNumber value={state.stats.xp} className="num text-ink" /> XP</span>
            <span className="flex items-center gap-2 text-muted"><Flame size={15} className="text-accent" /><span className="num text-ink">{state.streak.current}</span> day streak</span>
            <span className="flex items-center gap-2 text-muted"><Target size={15} className="text-sage" /><span className="num text-ink">{correctToday}</span> correct today</span>
          </div>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-panel p-6 sm:p-7"
        >
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>Current rank</Eyebrow>
              <div className="mt-2 font-display text-2xl font-bold tracking-[-0.02em]">{rank.current.name}</div>
              <p className="mt-1 text-xs text-muted">{rank.current.descriptor}</p>
            </div>
            <Ring value={rank.progress * 100} size={92} stroke={7} />
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-muted">
              <span>{rank.next ? `Next: ${rank.next.name}` : 'Highest rank reached'}</span>
              <span className="num">{rank.next ? `${rank.remaining} XP` : '✓'}</span>
            </div>
            <ProgressBar value={rank.progress * 100} />
          </div>
          <div className="mt-6"><ConsistencyStrip activeDates={state.streak.dates} /></div>
        </motion.div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <Eyebrow className="mb-2">Today's flight plan</Eyebrow>
              <h2 className="text-2xl font-bold tracking-[-0.02em]">Daily missions</h2>
            </div>
            <Badge tone="gold">{missions.filter((m) => m.done).length}/{missions.length} done</Badge>
          </div>
          <div className="space-y-1">
            {missions.map((mission) => (
              <Link key={mission.id} to={mission.link} className="group flex items-center gap-4 rounded-tile px-2 py-3 transition-colors hover:bg-surface/50">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${mission.done ? 'border-sage/60 bg-sage/10 text-sage' : 'border-line-strong text-faint'}`}>
                  {mission.done ? <Check size={15} /> : <Compass size={15} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${mission.done ? 'text-muted line-through' : ''}`}>{mission.title}</span>
                  <ProgressBar value={(mission.progress / mission.target) * 100} className="mt-2 max-w-[220px]" tone={mission.done ? 'sage' : 'amber'} />
                </span>
                <span className="num shrink-0 text-xs text-faint">{mission.progress}/{mission.target}</span>
                <ArrowRight size={14} className="text-faint transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
          <div className="mt-7 border-t border-line pt-5">
            <div className="mb-2 flex justify-between text-xs text-muted">
              <span>Daily goal · {goalMinutes} min</span>
              <span className="num">{formatDuration(trainedMs)} trained</span>
            </div>
            <ProgressBar value={goalProgress} tone="sage" />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="glass-panel relative overflow-hidden rounded-panel p-6 sm:p-8">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
            <Eyebrow className="mb-3">Continue learning path</Eyebrow>
            <div className="text-xs text-accent">{chapter?.title ?? 'FlightMath'}</div>
            <h2 className="mt-1 font-display text-[1.75rem] font-bold tracking-[-0.025em]">{recommended?.title ?? 'Mental Math Foundations'}</h2>
            <p className="mt-2 text-sm text-muted">{recommended?.descriptor ?? 'Build the engine.'}</p>
            <div className="mt-6 flex items-center gap-3">
              <Button variant="accent" onClick={() => navigate(`/session/lesson/${recommendedId}`)} icon={<Play size={15} />}>Resume lesson</Button>
              <Link to={`/lesson/${recommendedId}`} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">See concept</Link>
            </div>
          </div>

          <div className="glass-panel rounded-panel p-6 sm:p-8">
            <Eyebrow className="mb-3">Quick start</Eyebrow>
            <h3 className="font-display text-lg font-bold">Just want to calculate?</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {[2, 5, 10].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => setQuickMinutes(minutes)}
                  className={`rounded-btn border px-4 py-2 text-sm transition-all ${quickMinutes === minutes ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-muted hover:text-ink'}`}
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <Button className="mt-5" full onClick={() => navigate(`/session/quick?minutes=${quickMinutes}`)} icon={<Zap size={16} />}>
              Start {quickMinutes}-minute session
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-3">Today's challenge</Eyebrow>
          <h2 className="font-display text-[1.6rem] font-bold">Ten questions. One clean run.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">A fresh mix drawn from everything you have unlocked. No lesson interruptions.</p>
          <Button className="mt-6" onClick={() => navigate('/session/daily')} trailing={<ArrowRight size={16} />}>Take the challenge</Button>
        </div>

        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-4">Where to focus</Eyebrow>
          {weakest ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-display text-xl font-bold">{weakest.label}</div>
                  <p className="mt-1 text-sm text-muted">Mastery {weakest.mastery}% · {weakest.mistakes} slips recorded</p>
                </div>
                <Badge tone="error"><AlertCircle size={12} /> Needs attention</Badge>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button variant="accent" onClick={() => navigate('/session/weakness')} icon={<Target size={16} />}>Fix this weakness</Button>
                <Link to="/mistakes" className="text-sm text-muted hover:text-ink">Open Mistake Bank →</Link>
              </div>
            </>
          ) : (
            <div>
              <div className="font-display text-xl font-bold">Your weak spots are still hidden.</div>
              <p className="mt-2 text-sm text-muted">Complete a few lessons and FlightMath will identify exactly where to train.</p>
              <Button className="mt-5" variant="accent" onClick={() => navigate(`/session/lesson/${recommendedId}`)}>Start first lesson</Button>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <Eyebrow className="mb-2">Recent achievements</Eyebrow>
            <h2 className="text-xl font-bold">Milestones earned</h2>
          </div>
          <Link to="/achievements" className="text-sm text-muted hover:text-ink">All achievements →</Link>
        </div>
        {recentAchievements.length ? (
          <div className="flex flex-wrap gap-3">
            {recentAchievements.map((unlocked) => {
              const achievement = achievements.find((a) => a.id === unlocked.id)
              return (
                <div key={unlocked.id} className="glass-panel flex items-center gap-3 rounded-btn px-4 py-3">
                  <Trophy size={17} className="text-gold" />
                  <div>
                    <div className="text-sm font-semibold">{achievement?.title ?? unlocked.id}</div>
                    <div className="text-xs text-faint">{achievement?.description}</div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-panel px-6 py-5">
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="text-gold" />
              <div>
                <div className="text-sm font-semibold">Your first achievement is close</div>
                <div className="text-xs text-muted">Complete one lesson to earn First Flight.</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/session/lesson/${recommendedId}`)} icon={<Clock3 size={14} />}>Begin</Button>
          </div>
        )}
      </section>
    </div>
  )
}
