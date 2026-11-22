import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Calculator, Search, Sigma } from 'lucide-react'
import { formulaCategories, formulas } from '@/data/formulas/formulas'
import { Badge, EmptyState, Eyebrow, SectionTitle } from '@/components/ui/Ui'
import { Button } from '@/components/ui/Button'
import { levelById } from '@/data/curriculum/chapters'
import clsx from 'clsx'

export function Formulas() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const filtered = useMemo(() => formulas.filter((formula) => {
    const matchesCategory = category === 'All' || formula.category === category
    const haystack = `${formula.name} ${formula.expression} ${formula.variables} ${formula.example} ${formula.shortcut ?? ''}`.toLowerCase()
    return matchesCategory && haystack.includes(query.trim().toLowerCase())
  }), [query, category])

  return (
    <div className="space-y-9 pb-10">
      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div>
          <Eyebrow className="mb-4 flex items-center gap-2 text-accent"><span className="h-px w-6 bg-accent" /> Formula reference</Eyebrow>
          <h1 className="display text-[clamp(2.4rem,5.8vw,4.4rem)] font-extralight">The rules of <span className="font-extrabold text-accent">the route.</span></h1>
          <p className="mt-5 max-w-xl text-muted">A compact reference of every relationship practised in FlightMath, with units, variables and a worked example.</p>
        </div>
        <div className="glass-panel rounded-panel p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-tile border border-accent/40 bg-accent-soft text-accent"><Sigma size={21} /></div>
            <div>
              <div className="num text-2xl font-semibold">{formulas.length}</div>
              <div className="text-xs text-muted">formulas across {formulaCategories.length} topics</div>
            </div>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-faint">Use this as training reference. FlightMath content is original practice material, not official assessment content.</p>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Reference library" title="Find a formula" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
            {['All', ...formulaCategories].map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={clsx('shrink-0 rounded-btn border px-4 py-2 text-sm transition-all', category === item ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-muted hover:text-ink')}>
                {item}
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:w-72">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search formulas…"
              aria-label="Search formulas"
              className="input-shell !py-3 !pl-11 text-sm"
            />
          </label>
        </div>

        {filtered.length ? (
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {filtered.map((formula) => {
              const level = levelById[formula.levelId]
              return (
                <article key={formula.id} className="glass-panel rounded-panel p-6 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge tone="accent">{formula.category}</Badge>
                      <h3 className="mt-4 font-display text-xl font-bold tracking-[-0.02em]">{formula.name}</h3>
                    </div>
                    <Calculator size={18} className="text-faint" />
                  </div>
                  <div className="num mt-5 rounded-tile border border-accent/30 bg-accent-soft px-4 py-4 text-base text-accent sm:text-lg">{formula.expression}</div>
                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="grid gap-1 sm:grid-cols-[92px_1fr]">
                      <dt className="text-xs uppercase tracking-wider text-faint">Variables</dt>
                      <dd className="text-muted">{formula.variables}</dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[92px_1fr]">
                      <dt className="text-xs uppercase tracking-wider text-faint">Units</dt>
                      <dd className="num text-muted">{formula.units}</dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[92px_1fr]">
                      <dt className="text-xs uppercase tracking-wider text-faint">Example</dt>
                      <dd className="text-muted">{formula.example}</dd>
                    </div>
                  </dl>
                  {formula.shortcut && (
                    <div className="mt-5 rounded-tile border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
                      <span className="font-semibold">Shortcut:</span> {formula.shortcut}
                    </div>
                  )}
                  {level && (
                    <Link to={`/lesson/${level.id}`} className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
                      Practise in “{level.title}” <ArrowRight size={14} />
                    </Link>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-7">
            <EmptyState
              icon={<Search size={22} />}
              title="No formula matches that search."
              body="Try a shorter term, choose a different category, or clear both filters to see the full reference."
              action={<Button onClick={() => { setQuery(''); setCategory('All') }}>Clear filters</Button>}
            />
          </div>
        )}
      </section>

      <section className="glass-panel flex flex-wrap items-center justify-between gap-5 rounded-panel p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-tile border border-accent/40 bg-accent-soft text-accent"><BookOpen size={22} /></div>
          <div>
            <Eyebrow className="mb-1">Reference → recall</Eyebrow>
            <h2 className="font-display text-lg font-bold">Reading a formula is step one. Using it under pressure is the goal.</h2>
          </div>
        </div>
        <Link to="/practice" className="btn btn-accent">Go practise</Link>
      </section>
    </div>
  )
}
