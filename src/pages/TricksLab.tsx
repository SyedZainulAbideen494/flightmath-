import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Play, Search, Sparkles, Target, WandSparkles } from 'lucide-react'
import { trickCategories, tricks } from '@/data/tricks/tricks'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/Button'
import { Badge, EmptyState, Eyebrow, ProgressBar, SectionTitle } from '@/components/ui/Ui'
import clsx from 'clsx'

export function TricksLab() {
  const navigate = useNavigate()
  const concepts = useAppStore((s) => s.concepts)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')

  const filtered = useMemo(() => tricks.filter((trick) => {
    const matchesCategory = category === 'All' || trick.category === category
    const text = `${trick.title} ${trick.category} ${trick.explanation} ${trick.when}`.toLowerCase()
    return matchesCategory && text.includes(query.trim().toLowerCase())
  }), [query, category])

  const practiced = tricks.filter((trick) => (concepts[trick.spec.concept ?? '']?.attempts ?? 0) > 0).length
  const mastered = tricks.filter((trick) => (concepts[trick.spec.concept ?? '']?.mastery ?? 0) >= 80).length

  return (
    <div className="space-y-10 pb-10">
      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div>
          <Eyebrow className="mb-4 flex items-center gap-2 text-accent"><span className="h-px w-6 bg-accent" /> Tricks Lab</Eyebrow>
          <h1 className="display text-[clamp(2.4rem,5.8vw,4.4rem)] font-extralight">Small tricks. <span className="font-extrabold text-accent">Big speed.</span></h1>
          <p className="mt-5 max-w-xl text-muted">A library of mental shortcuts with the reasoning, the steps and the trap to avoid. Practise any trick on freshly generated numbers.</p>
        </div>
        <div className="glass-panel rounded-panel p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-tile border border-gold/40 bg-gold/10 text-gold"><WandSparkles size={20} /></div>
            <div>
              <div className="num text-2xl font-semibold">{practiced}<span className="text-base text-faint">/{tricks.length}</span></div>
              <div className="text-xs text-muted">shortcuts practised</div>
            </div>
          </div>
          <ProgressBar value={(practiced / tricks.length) * 100} className="mt-5" tone="sage" />
          <div className="mt-3 text-xs text-faint">{mastered} shortcut{mastered === 1 ? '' : 's'} at 80% mastery or better</div>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Shortcut library"
          title={`${filtered.length} trick${filtered.length === 1 ? '' : 's'} to add to your toolkit`}
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
            {['All', ...trickCategories].map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={clsx('shrink-0 rounded-btn border px-4 py-2 text-sm transition-all', category === item ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-muted hover:text-ink')}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:w-72">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shortcuts…"
              aria-label="Search shortcuts"
              className="input-shell !py-3 !pl-11 text-sm"
            />
          </label>
        </div>

        {filtered.length ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((trick, index) => {
              const stat = concepts[trick.spec.concept ?? '']
              const mastery = stat?.mastery ?? 0
              return (
                <article key={trick.id} className="glass-panel group flex flex-col rounded-panel p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <Badge tone="accent">{trick.category}</Badge>
                    <span className="num text-xs text-faint">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold tracking-[-0.025em]">{trick.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{trick.when}</p>
                  <div className="mt-5 rounded-tile border border-line bg-inset/50 p-4">
                    <div className="eyebrow mb-2">Example</div>
                    <div className="num text-base text-accent">{trick.example.prompt}</div>
                    <div className="mt-2 text-xs text-muted">{trick.example.sequence.at(-1)}</div>
                  </div>
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-xs text-muted">
                      <span>{stat ? 'Your mastery' : 'Not practised yet'}</span>
                      <span className="num">{stat ? `${mastery}%` : '—'}</span>
                    </div>
                    <ProgressBar value={mastery} tone={mastery >= 80 ? 'sage' : 'amber'} />
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="accent" onClick={() => navigate(`/session/trick/${trick.id}`)} icon={<Play size={13} />}>Practise</Button>
                    <Link to={`/tricks/${trick.id}`} className="btn btn-ghost btn-sm">Learn the trick <ArrowRight size={13} /></Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-7">
            <EmptyState
              icon={<Search size={22} />}
              title="No shortcut matches that search."
              body="Try a broader term like percent, multiply, speed or ratio — or clear the category filter to see the full library."
              action={<Button onClick={() => { setQuery(''); setCategory('All') }}>Clear filters</Button>}
            />
          </div>
        )}
      </section>

      <section className="glass-panel flex flex-wrap items-center justify-between gap-6 rounded-panel p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-tile border border-accent/40 bg-accent-soft text-accent"><Sparkles size={22} /></div>
          <div>
            <Eyebrow className="mb-2">How the lab works</Eyebrow>
            <h2 className="font-display text-xl font-bold">Understand it, then automate it.</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">Read why a shortcut works, follow the worked example, then drill generated examples until the method feels automatic.</p>
          </div>
        </div>
        <Button onClick={() => navigate('/session/trick')} trailing={<ArrowRight size={16} />}>Random shortcut drill</Button>
      </section>

      <div className="flex flex-wrap gap-4 text-xs text-faint">
        <span className="flex items-center gap-1.5"><BookOpen size={13} /> Every trick explains the reasoning</span>
        <span className="flex items-center gap-1.5"><Target size={13} /> Progress tracked per shortcut</span>
      </div>
    </div>
  )
}
