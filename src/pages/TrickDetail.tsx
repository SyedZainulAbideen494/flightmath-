import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, AlertTriangle, Lightbulb, Play, Sparkles } from 'lucide-react'
import { trickById, tricks } from '@/data/tricks/tricks'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/Button'
import { Badge, EmptyState, Eyebrow, ProgressBar } from '@/components/ui/Ui'

export function TrickDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const trick = trickById(id)
  const stat = useAppStore((s) => s.concepts[trick?.spec.concept ?? ''])

  if (!trick) {
    return (
      <div className="pt-8">
        <EmptyState
          icon={<AlertTriangle size={22} />}
          title="That shortcut isn't in the lab."
          body="The link may be out of date. Browse the full Tricks Lab library to find the technique you need."
          action={<Button onClick={() => navigate('/tricks')}>Open Tricks Lab</Button>}
        />
      </div>
    )
  }

  const related = tricks.filter((item) => item.category === trick.category && item.id !== trick.id).slice(0, 3)
  const mastery = stat?.mastery ?? 0

  return (
    <div className="space-y-9 pb-10">
      <Link to="/tricks" className="btn btn-ghost !px-0 text-sm"><ArrowLeft size={16} /> All shortcuts</Link>

      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{trick.category}</Badge>
            <Eyebrow>Tricks Lab</Eyebrow>
          </div>
          <h1 className="display text-[clamp(2.3rem,5.4vw,4rem)] font-bold">{trick.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">{trick.explanation}</p>
        </div>
        <div className="glass-panel rounded-panel p-6">
          <Eyebrow className="mb-3">When to use it</Eyebrow>
          <p className="text-sm leading-relaxed">{trick.when}</p>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-muted">
              <span>{stat ? 'Your mastery' : 'Not practised yet'}</span>
              <span className="num">{stat ? `${mastery}%` : '—'}</span>
            </div>
            <ProgressBar value={mastery} tone={mastery >= 80 ? 'sage' : 'amber'} />
          </div>
          <Button variant="amber" full className="mt-6" onClick={() => navigate(`/session/trick/${trick.id}`)} icon={<Play size={16} fill="currentColor" />}>
            Practise this trick
          </Button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="glass-panel rounded-panel p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-2 text-gold"><Lightbulb size={18} /><Eyebrow className="!text-gold">Why it works</Eyebrow></div>
          <p className="text-[1.0625rem] leading-relaxed">{trick.why}</p>
          <div className="hairline my-7" />
          <div className="mb-4 flex items-center gap-2 text-coral"><AlertTriangle size={18} /><Eyebrow className="!text-coral">Common mistake</Eyebrow></div>
          <p className="text-sm leading-relaxed text-muted">{trick.commonMistake}</p>
        </article>

        <article className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-5">The method</Eyebrow>
          <ol className="space-y-4">
            {trick.steps.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent-soft text-xs text-accent">{String(index + 1).padStart(2, '0')}</span>
                <span className="pt-1 text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-7 rounded-tile border border-line bg-inset/60 p-5">
            <div className="eyebrow mb-3">Worked example</div>
            <div className="num text-2xl font-semibold text-accent">{trick.example.prompt}</div>
            <ol className="mt-4 space-y-2">
              {trick.example.sequence.map((line, index) => (
                <li key={`${line}-${index}`} className="flex gap-3 text-sm text-muted">
                  <span className="num shrink-0 text-faint">→</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 border-t border-line pt-3 text-sm">Answer <span className="num ml-2 font-semibold text-ink">{trick.example.answer}</span></div>
          </div>
        </article>
      </section>

      {related.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <Eyebrow className="mb-2">Keep going</Eyebrow>
              <h2 className="text-xl font-bold">More {trick.category.toLowerCase()} shortcuts</h2>
            </div>
            <Link to="/tricks" className="text-sm text-muted hover:text-ink">Full library →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((item) => (
              <Link key={item.id} to={`/tricks/${item.id}`} className="glass-panel group flex items-center justify-between gap-3 rounded-btn p-4 transition-colors hover:border-accent/50">
                <span>
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{item.example.prompt}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-faint transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="glass-panel flex flex-wrap items-center justify-between gap-5 rounded-panel p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Sparkles size={18} className="text-gold" />
          <div>
            <div className="font-semibold">Ready to make it automatic?</div>
            <div className="text-sm text-muted">Eight generated examples, with hints available the whole way.</div>
          </div>
        </div>
        <Button variant="accent" onClick={() => navigate(`/session/trick/${trick.id}`)} trailing={<ArrowRight size={16} />}>Start drill</Button>
      </section>
    </div>
  )
}
