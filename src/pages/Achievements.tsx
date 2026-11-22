import { Link } from 'react-router-dom'
import {
  Award, CalendarDays, Cog, Flame, Gauge, Percent, Plane, RotateCcw, Shield, Sparkles, Sun, Target, Trophy, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { achievements } from '@/features/gamification/achievements'
import { ranks, rankProgress } from '@/features/gamification/ranks'
import { useAppStore } from '@/stores/useAppStore'
import { Badge, Eyebrow, ProgressBar, SectionTitle } from '@/components/ui/Ui'
import { formatDate } from '@/lib/format'
import clsx from 'clsx'

const icons: Record<string, LucideIcon> = {
  plane: Plane, zap: Zap, target: Target, sparkles: Sparkles, rotate: RotateCcw,
  engine: Cog, calendar: CalendarDays, percent: Percent, gauge: Gauge,
  award: Award, shield: Shield, sun: Sun,
}

export function Achievements() {
  const state = useAppStore()
  const unlocked = new Map(state.achievements.map((item) => [item.id, item.unlockedAt]))
  const rank = rankProgress(state.stats.xp)
  const earnedXp = state.achievements.reduce((sum, item) => {
    const achievement = achievements.find((a) => a.id === item.id)
    return sum + (achievement?.xp ?? 0)
  }, 0)

  return (
    <div className="space-y-10 pb-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <Eyebrow className="mb-4 flex items-center gap-2 text-accent"><span className="h-px w-6 bg-accent" /> Achievements & ranks</Eyebrow>
          <h1 className="display text-[clamp(2.4rem,5.8vw,4.4rem)] font-extralight">Milestones <span className="font-extrabold text-accent">earned.</span></h1>
          <p className="mt-5 max-w-xl text-muted">Badges unlock automatically from real training behaviour. No purchases, no invisible mechanics.</p>
        </div>
        <div className="glass-panel rounded-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Eyebrow className="mb-2">Badge collection</Eyebrow>
              <div className="num text-3xl font-semibold">{state.achievements.length}<span className="text-lg text-faint">/{achievements.length}</span></div>
            </div>
            <Trophy size={28} className="text-gold" />
          </div>
          <ProgressBar value={(state.achievements.length / achievements.length) * 100} className="mt-5" tone="amber" />
          <div className="mt-3 flex justify-between text-xs text-faint"><span>{earnedXp} XP from badges</span><span>{rank.current.name}</span></div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Badges" title="Your flight log" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {achievements.map((achievement) => {
            const Icon = icons[achievement.icon] ?? Trophy
            const unlockedAt = unlocked.get(achievement.id)
            const isUnlocked = Boolean(unlockedAt)
            return (
              <article
                key={achievement.id}
                className={clsx(
                  'flex gap-4 rounded-panel border p-5',
                  isUnlocked ? 'border-gold/40 bg-gold/[0.07]' : 'border-line bg-surface/40',
                )}
              >
                <div className={clsx(
                  'grid h-12 w-12 shrink-0 place-items-center rounded-tile border',
                  isUnlocked ? 'border-gold/50 bg-gold/10 text-gold' : 'border-line-strong text-faint',
                )}>
                  <Icon size={21} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={clsx('font-display text-base font-bold', !isUnlocked && 'text-muted')}>{achievement.title}</h3>
                    <Badge tone={isUnlocked ? 'gold' : 'neutral'}>{isUnlocked ? `+${achievement.xp} XP` : 'Locked'}</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{achievement.description}</p>
                  {unlockedAt && <div className="mt-3 text-xs text-faint">Earned {formatDate(unlockedAt)}</div>}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <Eyebrow className="mb-2">Rank ladder</Eyebrow>
          <h2 className="text-2xl font-bold">From ground trainee to elite aviator</h2>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold text-accent">{rank.current.name}</span>
              <span className="num text-muted">{state.stats.xp} XP</span>
            </div>
            <ProgressBar value={rank.progress * 100} />
            <div className="mt-2 text-xs text-faint">{rank.next ? `Next: ${rank.next.name} at ${rank.next.minXp} XP` : 'Top rank reached'}</div>
          </div>
          <div className="mt-7 space-y-2">
            {ranks.map((item) => {
              const current = item.name === rank.current.name
              const reached = state.stats.xp >= item.minXp
              return (
                <div key={item.name} className={clsx('flex items-center gap-3 rounded-tile border px-4 py-3', current ? 'border-accent/50 bg-accent-soft' : 'border-line bg-inset/30')}>
                  <span className={clsx('grid h-7 w-7 place-items-center rounded-full border text-xs', reached ? 'border-gold/50 bg-gold/10 text-gold' : 'border-line-strong text-faint')}>
                    {reached ? '✓' : '·'}
                  </span>
                  <span className={clsx('flex-1 text-sm', current ? 'font-semibold text-accent' : reached ? 'text-ink' : 'text-muted')}>{item.name}</span>
                  <span className="num text-xs text-faint">{item.minXp.toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="glass-panel flex flex-col justify-between rounded-panel p-6 sm:p-8">
          <div>
            <Eyebrow className="mb-2">Streak rewards</Eyebrow>
            <h2 className="font-display text-2xl font-bold">Show up. Build momentum.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">Your streak extends on any day with a recorded answer. Consistency is worth more than one perfect session.</p>
            <div className="mt-7 grid grid-cols-2 gap-4">
              <div className="rounded-tile border border-line bg-inset/40 p-4">
                <Flame size={18} className="text-accent" />
                <div className="num mt-3 text-2xl font-semibold">{state.streak.current}</div>
                <div className="text-xs text-muted">current streak</div>
              </div>
              <div className="rounded-tile border border-line bg-inset/40 p-4">
                <Trophy size={18} className="text-gold" />
                <div className="num mt-3 text-2xl font-semibold">{state.streak.longest}</div>
                <div className="text-xs text-muted">longest streak</div>
              </div>
            </div>
          </div>
          <Link to="/daily" className="btn btn-accent mt-8 self-start">Open daily training</Link>
        </div>
      </section>
    </div>
  )
}
