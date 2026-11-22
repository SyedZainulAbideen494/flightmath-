import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Plane, Sparkles, Gauge, Clock3, Headphones, Flame, Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { useMotionPref } from '@/hooks/useMotionPref'
import type { Intensity } from '@/lib/types'
import { Brand } from '@/components/layout/Brand'

const goals = [
  'Airline cadet pilot assessments',
  'Faster mental maths',
  'Improve my calculation accuracy',
  'General maths confidence',
]
const comfortLevels = [
  'I struggle with basic calculations',
  "I know the basics but I'm slow",
  "I'm comfortable with maths",
  'I want advanced speed training',
]
const times = [3, 5, 10, 15]
const focusOptions = ['Quiet space', 'Soft background sound', 'Music helps me focus', 'I adapt anywhere']
const intensities: { value: Intensity; title: string; detail: string }[] = [
  { value: 'relaxed', title: 'Relaxed', detail: 'Learn without pressure.' },
  { value: 'balanced', title: 'Balanced', detail: 'Mix learning and speed.' },
  { value: 'challenge', title: 'Challenge', detail: 'Push speed and accuracy.' },
]

const icons = [Sparkles, Compass, Gauge, Clock3, Headphones, Flame, Plane]

export function Onboarding() {
  const navigate = useNavigate()
  const reduced = useMotionPref()
  const finish = useAppStore((s) => s.finishOnboarding)
  const skip = useAppStore((s) => s.skipOnboarding)
  const profile = useAppStore((s) => s.profile)

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [selectedGoals, setSelectedGoals] = useState<string[]>(profile.goals)
  const [comfort, setComfort] = useState(profile.comfort)
  const [minutes, setMinutes] = useState(profile.dailyMinutes || 5)
  const [focus, setFocus] = useState(profile.focus)
  const [intensity, setIntensity] = useState<Intensity>(profile.intensity)

  const total = 7
  const canContinue = step === 0 || step === 6 || (step === 1 ? selectedGoals.length > 0 : true)

  const complete = () => {
    finish({
      goals: selectedGoals, comfort, dailyMinutes: minutes, focus, intensity,
      name: profile.name,
    })
    navigate('/', { replace: true })
  }

  const next = () => {
    if (step === total - 1) { complete(); return }
    setDirection(1)
    setStep((value) => Math.min(total - 1, value + 1))
  }
  const back = () => { setDirection(-1); setStep((value) => Math.max(0, value - 1)) }

  const toggleGoal = (goal: string) => setSelectedGoals((current) =>
    current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal],
  )

  const choice = (value: string, current: string, setter: (value: string) => void) => (
    <button
      onClick={() => setter(value)}
      className={`group flex w-full items-center justify-between gap-4 rounded-btn border px-5 py-4 text-left transition-all duration-200 ${current === value ? 'border-accent bg-accent-soft text-ink' : 'border-line-strong text-muted hover:border-accent/60 hover:text-ink'}`}
    >
      <span className="text-[0.9375rem]">{value}</span>
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${current === value ? 'border-accent bg-accent text-obsidian' : 'border-line-strong'}`}>
        {current === value && <Check size={12} strokeWidth={3} />}
      </span>
    </button>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[18%] -top-[22%] h-[70vh] w-[70vh] rounded-full bg-sienna/25 blur-[110px]" />
        <div className="absolute -right-[12%] top-[12%] h-[60vh] w-[60vh] rounded-full bg-amber/20 blur-[120px]" />
        <div className="absolute bottom-[-28%] left-[24%] h-[75vh] w-[75vh] rounded-full bg-accent/10 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: 'radial-gradient(circle at 50% 10%, rgba(255,249,239,0.25), transparent 55%)' }} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-8 pt-safe sm:px-10 lg:px-16">
        <div className="flex items-center justify-between py-7">
          <Brand />
          <button onClick={() => { skip(); navigate('/', { replace: true }) }} className="btn btn-ghost btn-sm">Skip for now</button>
        </div>

        <div className="mb-8 mt-4 flex gap-1.5" aria-label={`Step ${step + 1} of ${total}`}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full bg-accent"
                initial={false}
                animate={{ width: i <= step ? '100%' : '0%' }}
                transition={reduced ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-1 items-center">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="min-h-[420px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: direction * 36 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: -direction * 28 }}
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 30 }}
                >
                  <div className="eyebrow mb-5 flex items-center gap-2 text-accent">
                    {(() => { const Icon = icons[step]; return <Icon size={14} /> })()}
                    Step {String(step + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                  </div>

                  {step === 0 && (
                    <>
                      <h1 className="display max-w-2xl text-[clamp(2.9rem,7vw,5.4rem)] font-extralight">
                        Train your mind for the <span className="font-extrabold text-accent">cockpit.</span>
                      </h1>
                      <p className="mt-7 max-w-lg text-lg font-light leading-relaxed text-muted">
                        Master mental maths. Build speed. Become sharper every day.
                      </p>
                      <div className="mt-10 flex items-center gap-3 text-sm text-faint">
                        <Plane size={17} className="text-gold" />
                        <span>Train your mind. Calculate faster. Think like a pilot.</span>
                      </div>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <h1 className="display text-[clamp(2.2rem,5vw,3.8rem)] font-bold">What are you training for?</h1>
                      <p className="mb-8 mt-4 text-muted">Choose as many as apply. We will shape your path around them.</p>
                      <div className="grid max-w-xl gap-2.5">
                        {goals.map((goal) => (
                          <button
                            key={goal}
                            onClick={() => toggleGoal(goal)}
                            className={`flex items-center justify-between gap-4 rounded-btn border px-5 py-4 text-left transition-all ${selectedGoals.includes(goal) ? 'border-accent bg-accent-soft text-ink' : 'border-line-strong text-muted hover:border-accent/60 hover:text-ink'}`}
                          >
                            <span>{goal}</span>
                            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border ${selectedGoals.includes(goal) ? 'border-accent bg-accent text-obsidian' : 'border-line-strong'}`}>
                              {selectedGoals.includes(goal) && <Check size={12} strokeWidth={3} />}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <h1 className="display text-[clamp(2.2rem,5vw,3.8rem)] font-bold">How comfortable are you with mental maths?</h1>
                      <p className="mb-8 mt-4 text-muted">There is no wrong answer. We adapt to you.</p>
                      <div className="grid max-w-xl gap-2.5">{comfortLevels.map((item) => choice(item, comfort, setComfort))}</div>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <h1 className="display text-[clamp(2.2rem,5vw,3.8rem)] font-bold">How much time can you give it each day?</h1>
                      <p className="mb-8 mt-4 text-muted">Small sessions, repeated often, build the fastest recall.</p>
                      <div className="grid max-w-xl grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {times.map((time) => (
                          <button
                            key={time}
                            onClick={() => setMinutes(time)}
                            className={`rounded-btn border px-4 py-7 text-center transition-all ${minutes === time ? 'border-accent bg-accent-soft' : 'border-line-strong hover:border-accent/60'}`}
                          >
                            <div className="num display text-3xl font-bold">{time}</div>
                            <div className="mt-1 text-xs text-muted">minutes</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {step === 4 && (
                    <>
                      <h1 className="display text-[clamp(2.2rem,5vw,3.8rem)] font-bold">What helps you focus best?</h1>
                      <p className="mb-8 mt-4 text-muted">We will keep the interface calm either way.</p>
                      <div className="grid max-w-xl gap-2.5">{focusOptions.map((item) => choice(item, focus, setFocus))}</div>
                    </>
                  )}

                  {step === 5 && (
                    <>
                      <h1 className="display text-[clamp(2.2rem,5vw,3.8rem)] font-bold">Choose your training intensity</h1>
                      <p className="mb-8 mt-4 text-muted">You can change this any time in Settings.</p>
                      <div className="grid max-w-xl gap-2.5">
                        {intensities.map((item) => (
                          <button
                            key={item.value}
                            onClick={() => setIntensity(item.value)}
                            className={`rounded-btn border px-5 py-5 text-left transition-all ${intensity === item.value ? 'border-accent bg-accent-soft' : 'border-line-strong hover:border-accent/60'}`}
                          >
                            <div className="font-display text-lg font-bold">{item.title}</div>
                            <div className="mt-1 text-sm text-muted">{item.detail}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {step === 6 && (
                    <>
                      <h1 className="display text-[clamp(2.2rem,5vw,3.8rem)] font-bold">Your personal flight plan.</h1>
                      <p className="mb-8 mt-4 text-muted">Ready when you are. Everything you choose lives on this device.</p>
                      <div className="glass-panel max-w-xl rounded-panel p-6">
                        {[
                          ['Goal', selectedGoals[0] ?? 'Sharper mental maths'],
                          ['Starting point', comfort || 'Comfortable with maths'],
                          ['Daily session', `${minutes} minutes`],
                          ['Focus', focus || 'I adapt anywhere'],
                          ['Intensity', intensities.find((i) => i.value === intensity)?.title ?? 'Balanced'],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-start justify-between gap-5 border-b border-line py-3 last:border-0">
                            <span className="eyebrow !text-[0.5625rem]">{label}</span>
                            <span className="text-right text-sm text-ink">{value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex items-center gap-2 text-xs text-faint"><Sparkles size={14} className="text-gold" /> Your first lesson is only a tap away.</div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="relative hidden min-h-[560px] items-center justify-center lg:flex" aria-hidden="true">
              <div className="absolute h-[420px] w-[420px] rounded-full border border-accent/15" />
              <div className="absolute h-[310px] w-[310px] rounded-full border border-accent/25" />
              <div className="glass-panel relative grid h-[260px] w-[260px] place-items-center rounded-full">
                <motion.div animate={reduced ? undefined : { y: [0, -7, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
                  <Plane size={86} strokeWidth={0.8} className="rotate-45 text-amber" />
                </motion.div>
              </div>
              <div className="absolute bottom-10 right-0 text-right">
                <div className="num text-5xl font-light text-ivory/25">0{step + 1}</div>
                <div className="eyebrow mt-1">{['Welcome', 'Goal', 'Level', 'Time', 'Focus', 'Intensity', 'Plan'][step]}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <button onClick={back} disabled={step === 0} className="btn btn-ghost disabled:opacity-0"><ArrowLeft size={16} /> Back</button>
          <button onClick={next} disabled={!canContinue} className="btn btn-amber btn-lg">
            {step === total - 1 ? 'Start my journey' : step === 0 ? 'Start training' : 'Continue'}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
