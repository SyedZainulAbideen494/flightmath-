import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BellRing, Check, Download, Gauge, Keyboard, Moon, RotateCcw, ShieldCheck, SlidersHorizontal,
  Sun, Trash2, Upload, UserRound, Vibrate, Volume2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { useUiStore } from '@/stores/useUiStore'
import { haptic, playSound } from '@/hooks/useSound'
import { Button, IconButton } from '@/components/ui/Button'
import { Eyebrow, SectionTitle } from '@/components/ui/Ui'
import { Modal } from '@/components/ui/Modal'
import { rankProgress } from '@/features/gamification/ranks'
import type { Intensity, ThemePreference } from '@/lib/types'
import clsx from 'clsx'

function Toggle({ checked, onChange, label, description, icon: Icon }: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description: string
  icon?: LucideIcon
}) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-tile border border-line bg-inset/30 px-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && <Icon size={18} className="mt-0.5 shrink-0 text-accent" />}
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="mt-0.5 text-xs leading-relaxed text-muted">{description}</div>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx('relative h-7 w-12 shrink-0 rounded-full border transition-colors', checked ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface/60')}
      >
        <span className={clsx('absolute top-1 h-4 w-4 rounded-full transition-all', checked ? 'left-6 bg-accent' : 'left-1 bg-faint')} />
      </button>
    </div>
  )
}

export function Settings() {
  const navigate = useNavigate()
  const state = useAppStore()
  const pushToast = useUiStore((s) => s.pushToast)
  const fileRef = useRef<HTMLInputElement>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(state.profile.name)
  const rank = rankProgress(state.stats.xp)

  const update = state.updateSettings

  const exportBackup = () => {
    const blob = new Blob([state.exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `flightmath-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    pushToast({ title: 'Backup exported', detail: 'Your FlightMath data is saved as a JSON file.', tone: 'success' })
  }

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const ok = await state.importData(await file.text())
      pushToast(ok
        ? { title: 'Backup restored', detail: 'Your progress has been replaced with the imported data.', tone: 'success' }
        : { title: 'Could not restore backup', detail: 'That file is not a valid FlightMath backup.', tone: 'error' })
    } catch {
      pushToast({ title: 'Could not read that file', tone: 'error' })
    }
  }

  const confirmReset = async () => {
    await state.resetProgress()
    setResetOpen(false)
    pushToast({ title: 'Progress reset', detail: 'FlightMath is back to a clean cockpit.', tone: 'success' })
  }

  const previewSound = () => {
    playSound('correct', true)
    if (state.settings.haptics) haptic(14)
  }

  return (
    <div className="space-y-10 pb-10">
      <section>
        <Eyebrow className="mb-4 flex items-center gap-2 text-accent"><span className="h-px w-6 bg-accent" /> Settings</Eyebrow>
        <h1 className="display text-[clamp(2.4rem,5.8vw,4.4rem)] font-extralight">Set your <span className="font-extrabold text-accent">cockpit.</span></h1>
        <p className="mt-5 max-w-xl text-muted">Every preference and every byte of progress lives on this device. Nothing is sent anywhere.</p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3"><UserRound size={19} className="text-accent" /><Eyebrow className="!text-accent">Profile</Eyebrow></div>
          <label className="block">
            <span className="mb-2 block text-sm text-muted">Display name</span>
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={32}
              className="input-shell"
              aria-label="Display name"
            />
          </label>
          <Button className="mt-4" size="sm" disabled={!nameDraft.trim() || nameDraft.trim() === state.profile.name} onClick={() => state.updateProfile({ name: nameDraft.trim() })} icon={<Check size={14} />}>
            Save name
          </Button>
          <div className="hairline my-6" />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <div className="font-medium">{rank.current.name}</div>
              <div className="text-xs text-muted">{state.stats.xp.toLocaleString()} XP · joined {new Date(state.profile.createdAt).toLocaleDateString()}</div>
            </div>
            <Button size="sm" onClick={() => { state.reopenOnboarding(); navigate('/onboarding') }} icon={<SlidersHorizontal size={14} />}>Redo setup</Button>
          </div>
        </div>

        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3"><Sun size={19} className="text-accent" /><Eyebrow className="!text-accent">Appearance & motion</Eyebrow></div>
          <div className="mb-5">
            <div className="mb-2 block text-sm text-muted">Theme</div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['system', 'System', SlidersHorizontal],
                ['light', 'Ivory', Sun],
                ['dark', 'Obsidian', Moon],
              ] as [ThemePreference, string, LucideIcon][]).map(([value, label, Icon]) => (
                <button
                  key={value}
                  onClick={() => update({ theme: value })}
                  aria-pressed={state.settings.theme === value}
                  className={clsx('flex flex-col items-center gap-2 rounded-tile border px-3 py-4 text-sm transition-colors', state.settings.theme === value ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-muted hover:text-ink')}
                >
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          </div>
          <Toggle checked={state.settings.reducedMotion} onChange={(value) => update({ reducedMotion: value })} label="Reduce motion" description="Minimise animation and transition effects." />
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Training" title="Session behaviour" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle checked={state.settings.sound} onChange={(value) => update({ sound: value })} label="Answer sounds" description="Quiet cues for correct and incorrect answers." icon={Volume2} />
          <Toggle checked={state.settings.haptics} onChange={(value) => update({ haptics: value })} label="Haptic feedback" description="Gentle vibration on supported devices." icon={Vibrate} />
          <Toggle checked={state.settings.timerPreference === 'show'} onChange={(value) => update({ timerPreference: value ? 'show' : 'hide' })} label="Show session timer" description="Display the elapsed clock during practice." icon={Gauge} />
          <Toggle checked={state.settings.examSound} onChange={(value) => update({ examSound: value })} label="Exam countdown cues" description="Audible ticks at key exam time marks." icon={BellRing} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={previewSound} icon={<Volume2 size={14} />}>Preview feedback</Button>
          <span className="text-xs text-faint">Uses the same local tones as your sessions.</span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3"><Gauge size={19} className="text-accent" /><Eyebrow className="!text-accent">Difficulty & goals</Eyebrow></div>
          <div className="mb-6">
            <div className="mb-2 block text-sm text-muted">Adaptive intensity</div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['relaxed', 'Relaxed', 'Room to think'],
                ['balanced', 'Balanced', 'Steady push'],
                ['challenge', 'Challenge', 'Harder sets'],
              ] as [Intensity, string, string][]).map(([value, label, sub]) => (
                <button
                  key={value}
                  onClick={() => update({ intensity: value })}
                  aria-pressed={state.settings.intensity === value}
                  className={clsx('rounded-tile border px-3 py-4 text-left transition-colors', state.settings.intensity === value ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-muted hover:text-ink')}
                >
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="mt-1 block text-[0.6875rem] text-faint">{sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="daily-goal" className="mb-2 flex justify-between text-sm text-muted">
              <span>Daily goal</span>
              <span className="num text-ink">{state.settings.dailyGoalMinutes} minutes</span>
            </label>
            <input
              id="daily-goal"
              type="range"
              min={5}
              max={60}
              step={5}
              value={state.settings.dailyGoalMinutes}
              onChange={(event) => update({ dailyGoalMinutes: Number(event.target.value) })}
              className="w-full accent-[var(--warm-amber)]"
            />
          </div>
        </div>

        <div className="glass-panel rounded-panel p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3"><ShieldCheck size={19} className="text-accent" /><Eyebrow className="!text-accent">Privacy & data</Eyebrow></div>
          <p className="text-sm leading-relaxed text-muted">FlightMath stores your profile, progress and attempt history in local browser storage. Export a backup before clearing browser data or moving devices.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={exportBackup} icon={<Download size={16} />}>Export backup</Button>
            <Button onClick={() => fileRef.current?.click()} icon={<Upload size={16} />}>Import backup</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={(event) => void importBackup(event)} className="hidden" aria-label="Import FlightMath backup" />
          </div>
          <div className="hairline my-7" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-coral">Reset all progress</div>
              <div className="mt-1 text-xs text-muted">Removes XP, levels, attempts and preferences from this device.</div>
            </div>
            <Button variant="danger" onClick={() => setResetOpen(true)} icon={<Trash2 size={15} />}>Reset</Button>
          </div>
        </div>
      </section>

      <section className="glass-panel flex flex-wrap items-center justify-between gap-5 rounded-panel p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-tile border border-accent/40 bg-accent-soft text-accent"><Keyboard size={22} /></div>
          <div>
            <Eyebrow className="mb-1">Desktop shortcut</Eyebrow>
            <h2 className="font-display text-lg font-bold">Command palette</h2>
            <p className="mt-1 text-sm text-muted">Press <kbd className="num rounded border border-line-strong px-2 py-0.5 text-xs">⌘ K</kbd> or <kbd className="num rounded border border-line-strong px-2 py-0.5 text-xs">Ctrl K</kbd> anywhere to jump between pages and sessions.</p>
          </div>
        </div>
        <IconButton aria-label="Open command palette" onClick={() => useUiStore.getState().setCommandOpen(true)}><SlidersHorizontal size={18} /></IconButton>
      </section>

      <p className="text-center text-xs text-faint">FlightMath · original practice material for aspiring cadet pilots · works offline after load.</p>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset all progress?">
        <p className="text-sm leading-relaxed text-muted">This permanently clears your XP, rank, streaks, lesson states, attempts, achievements and settings on this device. Export a backup first if you want to keep them.</p>
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => void confirmReset()} icon={<RotateCcw size={15} />}>Yes, reset everything</Button>
        </div>
      </Modal>
    </div>
  )
}
