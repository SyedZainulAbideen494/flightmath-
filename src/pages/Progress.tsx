import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, BarChart3, Clock3, Flame, Target, Trophy, Zap } from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { chapters } from '@/data/curriculum/chapters'
import { BarChart, ConsistencyStrip, Ring, Sparkline } from '@/components/charts/Charts'
import { Badge, EmptyState, Eyebrow, ProgressBar, SectionTitle } from '@/components/ui/Ui'
import { Button } from '@/components/ui/Button'
import { formatDate, formatDuration, formatPercent, relativeDate } from '@/lib/format'
import { rankProgress } from '@/features/gamification/ranks'
import { chapterProgress } from '@/features/learning/unlock'
import { strongestConcepts, weakestConcepts } from '@/features/progress/mastery'

const DAY = 86_400_000

export function Progress() {
  const navigate = useNavigate()
  const state = useAppStore()
  const rank = rankProgress(state.stats.xp)

  const trends = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (13 - i))
      return { start: date.getTime(), end: date.getTime() + DAY, label: date.toLocaleDateString(undefined, { day: 'numeric' }) }
    })
    const questions = days.map((day) => state.attempts.filter((a) => a.at >= day.start && a.at < day.end).length)
    const correct = days.map((day) => state.attempts.filter((a) => a.at >= day.start && a.at < day.end && a.correct).length)
    const accuracy = days.map((_, i) => questions[i] ? Math.round((correct[i] / questions[i]) * 100) : 0)
    const xp = days.map((day) => state.xpEvents.filter((event) => event.at >= day.start && event.at < day.end).reduce((sum, event) => sum + event.amount, 0))
    return { questions, correct, accuracy, xp, labels: days.map((day) => day.label) }
  }, [state.attempts, state.xpEvents])

  const accuracy = state.stats.totalQuestions ? state.stats.correctAnswers / state.stats.totalQuestions : 0
  const avgSeconds = state.stats.totalQuestions ? state.stats.totalTimeMs / state.stats.totalQuestions / 1000 : 0
  const strongest = strongestConcepts(state.concepts, 4)
  const weakest = weakestConcepts(state.concepts, 4)
  const recentSessions = state.sessions.slice(-6).reverse()
  const chapterStats = chapters.map((chapter) => ({ chapter, progress: chapterProgress(chapter.id, state.levels) }))
  const masteredLevels = Object.values(state.levels).filter((level) => ['completed', 'perfected', 'mastered'].includes(level.status)).length
  const totalLevels = chapters.reduce((sum, chapter) => sum + chapter.levels.length, 0)
  const xpByMode = useMemo(() => {
    const totals = new Map<string, number>()
    state.sessions.forEach((session) => totals.set(session.mode, (totals.get(session.mode) ?? 0) + session.xp))
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [state.sessions])

  return (
    <div className="space-y-10 pb-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <Eyebrow className="mb-4 flex items-center gap-2 text-accent"><span className="h-px w-6 bg-accent" /> Progress analytics</Eyebrow>
          <h1 className="display text-[clamp(2.4rem,5.8vw,4.4rem)] font-extralight">Read your <span className="font-extrabold text-accent">instruments.</span></h1>
          <p className="mt-5 max-w-xl text-muted">Everything here is calculated from your own sessions and answers on this device.</p>
        </div>
        <div className="glass-panel rounded-panel p-6">
          <Eyebrow className="mb-3">Current rank</Eyebrow>
          <div className="flex items-center justify-between gap-5">
            <div>
              <div className="font-display text-2xl font-bold">{rank.current.name}</div>
              <p className="mt-1 text-xs text-muted">{rank.current.descriptor}</p>
              <div className="mt-3 text-xs text-faint">{rank.next ? `${rank.remaining} XP to ${rank.next.name}` : 'Highest rank reached'}</div>
            </div>
            <Ring value={rank.progress * 100} size={92} stroke={7} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total XP', value: state.stats.xp.toLocaleString(), sub: `${xpByMode.length ? 'across training modes' : 'start a session to earn'}`, icon: Zap, tone: 'text-gold' },
          { label: 'Accuracy', value: formatPercent(accuracy), sub: `${state.stats.correctAnswers} of ${state.stats.totalQuestions} correct`, icon: Target, tone: 'text-sage' },
          { label: 'Average answer', value: avgSeconds ? `${avgSeconds.toFixed(1)}s` : '—', sub: `fastest ${state.stats.fastestMs ? `${(state.stats.fastestMs / 1000).toFixed(1)}s` : 'not yet'}`, icon: Clock3, tone: 'text-accent' },
          { label: 'Levels cleared', value: `${masteredLevels}/${totalLevels}`, sub: `${state.stats.bossCompleted} checkpoint${state.stats.bossCompleted === 1 ? '' : 's'}`, icon: Trophy, tone: 'text-amber' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="glass-panel rounded-panel p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{item.label}</span>
                <Icon size={17} className={item.tone} />
              </div>
              <div className="num mt-4 text-3xl font-semibold">{item.value}</div>
              <div className="mt-1 text-xs text-faint">{item.sub}</div>
            </div>
          )
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow className="mb-2">Last 14 days</Eyebrow>
              <h2 className="text-xl font-bold">Questions answered</h2>
            </div>
            <Badge tone="accent"><Activity size={12} /> {trends.questions.reduce((a, b) => a + b, 0)} total</Badge>
          </div>
          <BarChart values={trends.questions} labels={trends.labels} height={150} />
          <div className="hairline my-6" />
          <div className="mb-3 flex items-end justify-between">
            <div>
              <Eyebrow className="mb-1">Accuracy trend</Eyebrow>
              <div className="text-sm text-muted">Daily percentage where answers exist</div>
            </div>
            <span className="num text-lg font-semibold">{accuracy ? formatPercent(accuracy) : '—'}</span>
          </div>
          <Sparkline values={trends.accuracy.filter((_, i) => trends.questions[i] > 0)} label="Daily accuracy trend" />
        </div>

        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-2">Consistency</Eyebrow>
          <h2 className="text-xl font-bold">Five weeks of training</h2>
          <p className="mt-2 text-sm text-muted">Every marked day contains at least one recorded answer.</p>
          <div className="mt-6"><ConsistencyStrip activeDates={state.streak.dates} /></div>
          <div className="hairline my-6" />
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="num text-3xl font-semibold text-accent">{state.streak.current}</div>
              <div className="text-xs text-muted">current streak</div>
            </div>
            <div>
              <div className="num text-3xl font-semibold text-gold">{state.streak.longest}</div>
              <div className="text-xs text-muted">longest streak</div>
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-muted">
              <span>XP this fortnight</span>
              <span className="num">{trends.xp.reduce((a, b) => a + b, 0)}</span>
            </div>
            <Sparkline values={trends.xp} height={60} color="var(--soft-gold)" label="XP earned over the last fourteen days" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-2">Concept mastery</Eyebrow>
          <h2 className="text-xl font-bold">Strongest signals</h2>
          {strongest.length ? (
            <div className="mt-6 space-y-4">
              {strongest.map((stat) => (
                <div key={stat.concept}>
                  <div className="mb-2 flex justify-between text-sm"><span>{stat.label}</span><span className="num text-sage">{stat.mastery}%</span></div>
                  <ProgressBar value={stat.mastery} tone="sage" />
                </div>
              ))}
            </div>
          ) : <p className="mt-5 text-sm text-muted">Complete a few questions to see concept mastery.</p>}
        </div>

        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-2">Where to focus</Eyebrow>
          <h2 className="text-xl font-bold">Needs attention</h2>
          {weakest.length ? (
            <div className="mt-6 space-y-4">
              {weakest.map((stat) => (
                <div key={stat.concept}>
                  <div className="mb-2 flex justify-between text-sm"><span>{stat.label}</span><span className="num text-accent">{stat.mastery}%</span></div>
                  <ProgressBar value={stat.mastery} tone="amber" />
                </div>
              ))}
              <Button size="sm" className="mt-2" onClick={() => navigate('/session/weakness')} icon={<Target size={14} />}>Drill weak spots</Button>
            </div>
          ) : <p className="mt-5 text-sm text-muted">Answer at least two questions in a topic and FlightMath will rank it here.</p>}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Curriculum" title="Chapter completion" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {chapterStats.map(({ chapter, progress }) => (
            <Link key={chapter.id} to={`/learn?chapter=${chapter.id}`} className="glass-panel group rounded-panel p-5 transition-colors hover:border-accent/50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="num text-xs text-faint">Chapter {String(chapter.index).padStart(2, '0')}</div>
                  <div className="mt-1 font-display text-base font-bold group-hover:text-accent">{chapter.title}</div>
                </div>
                <span className="num text-sm text-muted">{Math.round(progress)}%</span>
              </div>
              <ProgressBar value={progress} className="mt-4" tone={progress >= 100 ? 'sage' : 'amber'} />
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <Eyebrow className="mb-2">Session log</Eyebrow>
              <h2 className="text-xl font-bold">Recent flights</h2>
            </div>
            <BarChart3 size={18} className="text-faint" />
          </div>
          {recentSessions.length ? (
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-line bg-inset/40 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{session.label}</div>
                    <div className="text-xs text-faint">{relativeDate(session.endedAt)} · {formatDuration(session.durationMs)} · {session.questionCount} questions</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num text-sm text-muted">{formatPercent(session.accuracy)}</span>
                    <Badge tone={session.accuracy >= 0.8 ? 'success' : session.accuracy >= 0.6 ? 'accent' : 'error'}>{session.mode}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<BarChart3 size={20} />} title="No sessions logged yet." body="Complete any lesson or practice mode and it will appear here with its real accuracy and duration." action={<Button onClick={() => navigate('/practice')}>Find a session</Button>} />
          )}
        </div>

        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-2">XP by mode</Eyebrow>
          <h2 className="text-xl font-bold">Where your effort went</h2>
          {xpByMode.length ? (
            <div className="mt-6 space-y-4">
              {xpByMode.map(([mode, xp]) => (
                <div key={mode}>
                  <div className="mb-2 flex justify-between text-sm"><span className="capitalize">{mode}</span><span className="num text-muted">{xp} XP</span></div>
                  <ProgressBar value={(xp / xpByMode[0][1]) * 100} />
                </div>
              ))}
            </div>
          ) : <p className="mt-5 text-sm text-muted">Nothing to chart yet. Your first session creates this breakdown.</p>}
          <div className="hairline my-6" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-faint">
              {state.sessions.length} sessions · {formatDate(state.profile.createdAt)} join date
            </div>
            <Link to="/achievements" className="text-sm text-muted hover:text-ink">All achievements <ArrowRight size={14} className="inline" /></Link>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-4 text-xs text-faint">
        <span className="flex items-center gap-1.5"><Flame size={13} /> No cloud sync, no invented data</span>
        <span className="flex items-center gap-1.5"><Target size={13} /> Mastery blends accuracy, speed and independence</span>
      </div>
    </div>
  )
}
