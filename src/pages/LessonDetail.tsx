import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Lightbulb, Play, Sparkles, Target, Clock3, Check } from 'lucide-react'
import { chapterById, levelById, levels } from '@/data/curriculum/chapters'
import { buildLessonContent } from '@/features/learning/lessonContent'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/Button'
import { Badge, Eyebrow } from '@/components/ui/Ui'
import { isLevelUnlocked } from '@/features/learning/unlock'

export function LessonDetail() {
  const { levelId = '' } = useParams()
  const navigate = useNavigate()
  const level = levelById[levelId] ?? levels[0]
  const chapter = chapterById[level.chapterId]
  const content = buildLessonContent(level, chapter)
  const stats = useAppStore((s) => s.levels[level.id])
  const unlocked = isLevelUnlocked(level.id, useAppStore((s) => s.levels))

  return (
    <div className="space-y-8 pb-10">
      <button onClick={() => navigate('/learn')} className="btn btn-ghost !px-0 text-sm"><ArrowLeft size={16} /> Learning path</button>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <Eyebrow className="mb-3">{chapter?.title} · Level {level.index}</Eyebrow>
          <h1 className="display text-[clamp(2.2rem,5vw,3.8rem)] font-bold">{level.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">{level.descriptor}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="accent"><Target size={12} /> {level.kind === 'boss' ? '80% to clear' : '70% to pass'}</Badge>
            <Badge tone="gold"><Sparkles size={12} /> {level.xp} XP</Badge>
            <Badge><Clock3 size={12} /> ~{Math.ceil(level.timeTargetSec / 60)} min</Badge>
            {stats && <Badge tone="success"><Check size={12} /> Best {stats.bestScore}%</Badge>}
          </div>
        </div>

        <div className="glass-panel flex flex-col justify-between rounded-panel p-6 sm:p-8">
          <div>
            <Eyebrow>Your mission</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Learn the idea, try the guided example, then answer {level.questionCount} questions. FlightMath generates fresh numbers every time.
            </p>
          </div>
          <Button variant="amber" size="lg" full className="mt-7" disabled={!unlocked} onClick={() => navigate(`/session/${level.kind}/${level.id}`)} icon={<Play size={17} fill="currentColor" />}>
            {unlocked ? 'Start lesson' : 'Complete previous level first'}
          </Button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="glass-panel rounded-panel p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-2 text-accent"><Lightbulb size={18} /><Eyebrow className="!text-accent">Concept</Eyebrow></div>
          <p className="text-[1.0625rem] leading-relaxed">{content.concept}</p>
          <div className="hairline my-7" />
          <div className="mb-3 flex items-center gap-2 text-gold"><Sparkles size={17} /><Eyebrow className="!text-gold">Why it matters</Eyebrow></div>
          <p className="text-sm leading-relaxed text-muted">{content.why}</p>
        </article>

        <article className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-4">The shortcut</Eyebrow>
          <p className="font-display text-2xl font-bold leading-snug tracking-[-0.02em]">{content.shortcut}</p>
          <div className="mt-7 rounded-tile border border-line bg-inset/60 p-5">
            <div className="eyebrow mb-3">Worked example</div>
            <div className="num text-2xl font-semibold text-accent">{content.example.prompt}</div>
            <ol className="mt-4 space-y-2.5">
              {content.example.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm text-muted">
                  <span className="num shrink-0 text-faint">{String(i + 1).padStart(2, '0')}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 border-t border-line pt-3 text-sm">Answer <span className="num ml-2 font-semibold text-ink">{content.example.answer}</span></div>
          </div>
        </article>
      </section>

      <section className="glass-panel flex flex-wrap items-center justify-between gap-5 rounded-panel p-6 sm:p-8">
        <div>
          <Eyebrow className="mb-2">Next step</Eyebrow>
          <h2 className="font-display text-xl font-bold">Guided → independent → mastery</h2>
          <p className="mt-1 text-sm text-muted">Hints and Learn are always available. Using them never blocks progress.</p>
        </div>
        <Button onClick={() => navigate(`/session/${level.kind}/${level.id}`)} trailing={<ArrowRight size={16} />}>Take me to the questions</Button>
      </section>
    </div>
  )
}
