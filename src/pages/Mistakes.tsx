import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, ChevronDown, Clock3, RotateCcw, Search, Sparkles, Target, Trophy } from 'lucide-react'
import { levels } from '@/data/curriculum/chapters'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/Button'
import { Badge, EmptyState, Eyebrow, ProgressBar, SectionTitle } from '@/components/ui/Ui'
import { formatDate, relativeDate } from '@/lib/format'
import clsx from 'clsx'
import type { AttemptRecord } from '@/lib/types'

interface MistakeGroup {
  concept: string
  label: string
  mistakes: number
  recovered: number
  lastAt: number
  attempts: AttemptRecord[]
}

export function Mistakes() {
  const navigate = useNavigate()
  const attempts = useAppStore((s) => s.attempts)
  const concepts = useAppStore((s) => s.concepts)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const groups = useMemo<MistakeGroup[]>(() => {
    const wrong = attempts.filter((attempt) => !attempt.correct)
    const byConcept = new Map<string, MistakeGroup>()
    wrong.forEach((attempt) => {
      const key = attempt.concept || 'unknown'
      const group = byConcept.get(key) ?? {
        concept: key, label: attempt.conceptLabel || key, mistakes: 0, recovered: 0, lastAt: 0, attempts: [],
      }
      group.mistakes += 1
      group.lastAt = Math.max(group.lastAt, attempt.at)
      group.attempts.push(attempt)
      byConcept.set(key, group)
    })
    Object.values(concepts).forEach((stat) => {
      const group = byConcept.get(stat.concept)
      if (group) group.recovered = stat.retrySuccess
    })
    return Array.from(byConcept.values())
      .filter((group) => `${group.label} ${group.concept}`.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => b.mistakes - a.mistakes || b.lastAt - a.lastAt)
  }, [attempts, concepts, query])

  const due = useMemo(() => Object.values(concepts)
    .filter((stat) => stat.attempts > 0 && stat.dueAt <= Date.now())
    .sort((a, b) => a.dueAt - b.dueAt), [concepts])

  const totalMistakes = attempts.filter((attempt) => !attempt.correct).length
  const recovered = useAppStore((s) => s.stats.recoveredMistakes)

  return (
    <div className="space-y-10 pb-10">
      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div>
          <Eyebrow className="mb-4 flex items-center gap-2 text-accent"><span className="h-px w-6 bg-accent" /> Mistake Bank</Eyebrow>
          <h1 className="display text-[clamp(2.4rem,5.8vw,4.4rem)] font-extralight">Every slip is <span className="font-extrabold text-accent">data.</span></h1>
          <p className="mt-5 max-w-xl text-muted">FlightMath stores your incorrect answers privately on this device. Revisit them with fresh numbers until the pattern breaks.</p>
        </div>
        <div className="glass-panel rounded-panel p-6">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="num text-3xl font-semibold text-coral">{totalMistakes}</div>
              <div className="text-xs text-muted">slips recorded</div>
            </div>
            <div>
              <div className="num text-3xl font-semibold text-sage">{recovered}</div>
              <div className="text-xs text-muted">recovered</div>
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-muted">
              <span>Recovery rate</span>
              <span className="num">{totalMistakes ? Math.round((recovered / totalMistakes) * 100) : 0}%</span>
            </div>
            <ProgressBar value={totalMistakes ? (recovered / totalMistakes) * 100 : 0} tone="sage" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-3">Spaced repetition</Eyebrow>
          {due.length ? (
            <>
              <h2 className="font-display text-2xl font-bold">Due for a second look</h2>
              <p className="mt-2 text-sm text-muted">These concepts have reached their review interval. A short recall now protects the gain later.</p>
              <div className="mt-5 max-h-72 space-y-2 overflow-y-auto pr-1">
                {due.slice(0, 8).map((stat) => (
                  <div key={stat.concept} className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-line bg-inset/40 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{stat.label}</div>
                      <div className="text-xs text-faint">Mastery {stat.mastery}% · last seen {relativeDate(stat.lastSeenAt).toLowerCase()}</div>
                    </div>
                    <Badge tone={stat.mastery >= 70 ? 'success' : 'accent'}><Clock3 size={11} /> Due</Badge>
                  </div>
                ))}
              </div>
              <Button className="mt-6" variant="accent" onClick={() => navigate('/session/review')} icon={<RotateCcw size={16} />}>Start review now</Button>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold">Nothing due right now.</h2>
              <p className="mt-2 text-sm text-muted">Your review queue is clear. FlightMath will bring concepts back at the right moment.</p>
              <Link to="/practice" className="btn btn-outline mt-6">Browse practice modes <ArrowRight size={15} /></Link>
            </>
          )}
        </div>

        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-3">How recovery works</Eyebrow>
          <h2 className="font-display text-2xl font-bold">Fix it once. Keep it fixed.</h2>
          <ol className="mt-6 space-y-4 text-sm text-muted">
            <li className="flex gap-3"><span className="num text-accent">01</span><span>Review the short explanation attached to your slip.</span></li>
            <li className="flex gap-3"><span className="num text-accent">02</span><span>Answer a similar question with new numbers and a progressive hint ladder.</span></li>
            <li className="flex gap-3"><span className="num text-accent">03</span><span>Correct retries earn bonus XP and reschedule the concept for later recall.</span></li>
          </ol>
          <Button className="mt-7" full onClick={() => navigate('/session/mistakes')} icon={<Target size={16} />}>Retry my mistakes</Button>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Wrong answers" title="Mistakes by concept" />
        {groups.length ? (
          <>
            <label className="relative mb-5 block max-w-sm">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter concepts…"
                aria-label="Filter mistakes by concept"
                className="input-shell !py-3 !pl-11 text-sm"
              />
            </label>
            <div className="space-y-3">
              {groups.map((group) => {
                const expanded = open === group.concept
                const level = levels.find((item) => item.specs.some((spec) => spec.concept === group.concept))
                const ratio = group.mistakes ? Math.min(100, (group.recovered / group.mistakes) * 100) : 0
                return (
                  <div key={group.concept} className="glass-panel overflow-hidden rounded-panel">
                    <button
                      onClick={() => setOpen(expanded ? null : group.concept)}
                      aria-expanded={expanded}
                      className="flex w-full flex-wrap items-center gap-4 p-5 text-left sm:p-6"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-lg font-bold">{group.label}</span>
                          <Badge tone="error">{group.mistakes} slip{group.mistakes === 1 ? '' : 's'}</Badge>
                        </div>
                        <div className="mt-2 max-w-md">
                          <ProgressBar value={ratio} tone="sage" />
                          <div className="mt-1.5 text-xs text-faint">{group.recovered} recovered · last {relativeDate(group.lastAt).toLowerCase()}</div>
                        </div>
                      </div>
                      <ChevronDown size={18} className={clsx('text-faint transition-transform', expanded && 'rotate-180')} />
                    </button>
                    {expanded && (
                      <div className="border-t border-line px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
                        <div className="divide-y divide-line">
                          {group.attempts.slice(-5).reverse().map((attempt) => (
                            <div key={attempt.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                              <div className="min-w-0">
                                <div className="truncate text-sm">{attempt.prompt}</div>
                                <div className="num mt-1 text-xs text-faint">yours: {attempt.userAnswer || '—'} · correct: {attempt.correctAnswer}</div>
                              </div>
                              <div className="text-xs text-faint">{formatDate(attempt.at)}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" icon={<RotateCcw size={13} />} onClick={() => navigate('/session/mistakes')}>Retry similar questions</Button>
                          {level && <Link to={`/lesson/${level.id}`} className="btn btn-ghost btn-sm" ><BookOpen size={13} /> Revise concept</Link>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <EmptyState
            icon={query ? <Search size={22} /> : <Trophy size={22} />}
            title={query ? 'No matching concepts.' : 'Your Mistake Bank is empty.'}
            body={query ? 'Try a shorter search term or clear the filter.' : 'Either you have not started training yet, or you have recovered every slip so far. Keep flying clean runs and this stays quiet.'}
            action={query
              ? <Button onClick={() => setQuery('')}>Clear filter</Button>
              : <Button variant="accent" onClick={() => navigate('/practice')} icon={<Sparkles size={16} />}>Start training</Button>}
          />
        )}
      </section>

      <div className="flex flex-wrap gap-4 text-xs text-faint">
        <span className="flex items-center gap-1.5"><Check size={13} /> Recoveries are tracked per concept</span>
        <span className="flex items-center gap-1.5"><Clock3 size={13} /> Review timing adapts to your accuracy</span>
        <span className="flex items-center gap-1.5"><Target size={13} /> All data stays on this device</span>
      </div>
    </div>
  )
}
