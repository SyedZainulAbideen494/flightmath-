import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Lightbulb, SkipForward, Check, X, Timer, Flame, BookOpen,
  Flag, Maximize2, RotateCcw, Trophy, Target, Home,
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { useUiStore } from '@/stores/useUiStore'
import { useMotionPref } from '@/hooks/useMotionPref'
import { haptic, playSound } from '@/hooks/useSound'
import { chapters, levels, levelById, chapterById } from '@/data/curriculum/chapters'
import { trickById, tricks } from '@/data/tricks/tricks'
import type { Chapter, Difficulty, GeneratedQuestion, GeneratorSpec, Level, SessionRecord } from '@/lib/types'
import { generateQuestion, generateSimilar, pickSpec, specKey } from '@/features/questions'
import { validateAnswer, displayAnswer } from '@/features/questions/validation'
import { mulberry32 } from '@/features/questions/random'
import { adaptiveDifficulty, weakestConcepts } from '@/features/progress/mastery'
import { unlockedLevels, recommendedLevel } from '@/features/learning/unlock'
import { QuestionInput } from '@/features/learning/QuestionInput'
import { Button } from '@/components/ui/Button'
import { Badge, Eyebrow, ProgressBar } from '@/components/ui/Ui'
import { Modal } from '@/components/ui/Modal'
import { formatClock, formatDuration } from '@/lib/format'
import { rankFor } from '@/features/gamification/ranks'
import clsx from 'clsx'

type Mode = 'lesson' | 'boss' | 'exam' | 'sprint' | 'lightning' | 'precision' | 'daily' | 'pilot' | 'weakness' | 'survival' | 'quick' | 'trick' | 'review' | 'mistakes'

interface AnswerRecord {
  question: GeneratedQuestion
  userAnswer: string
  correct: boolean
  timeMs: number
  hintsUsed: number
  retryFor?: string
}

interface Feedback {
  kind: 'correct' | 'incorrect' | 'skipped'
  explanation: string
  correctAnswer: string
  similar?: GeneratedQuestion
  similarSpec?: GeneratorSpec
}

interface SessionConfig {
  mode: Mode
  label: string
  specs: GeneratorSpec[]
  count: number
  duration: number
  intro: boolean
  hints: boolean
  exam: boolean
  level?: Level
  chapter?: Chapter
  pass: number
  mistakeLimit?: number
}

function specsForConcept(concept: string): GeneratorSpec[] {
  const levelSpecs = levels
    .filter((item) => item.id === concept || item.specs.some((spec) => spec.concept === concept))
    .flatMap((item) => item.specs)
  const trickSpecs = tricks
    .filter((trick) => trick.spec.concept === concept || trick.id === concept)
    .map((trick) => trick.spec)
  return [...levelSpecs, ...trickSpecs]
}

export function SessionPage() {
  const { mode = 'lesson', id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const reduced = useMotionPref()
  const state = useAppStore()
  const showCelebration = useUiStore((s) => s.showCelebration)
  const rngRef = useRef(mulberry32(Date.now() % 2147483647))
  const startedAtRef = useRef(Date.now())
  const rankAtStartRef = useRef(rankFor(state.stats.xp).name)
  const achievementsAtStartRef = useRef(state.achievements.length)
  const finishedRef = useRef(false)

  const config = useMemo<SessionConfig>(() => {
    const level = id ? levelById[id] : undefined
    const unlocked = unlockedLevels(state.levels).flatMap((item) => item.specs)
    const distinctUnlocked = Array.from(new Map(unlocked.map((spec) => [specKey(spec), spec])).values())

    switch (mode as Mode) {
      case 'lesson':
      case 'boss': {
        const chosen = level ?? levelById[recommendedLevel(state.levels)]!
        return {
          mode: mode as Mode, label: chosen.title, specs: chosen.specs, count: chosen.questionCount,
          duration: 0, intro: true, hints: true, exam: false, level: chosen,
          chapter: chapterById[chosen.chapterId], pass: chosen.kind === 'boss' ? 0.8 : 0.7,
        }
      }
      case 'exam': {
        const count = [10, 20, 30, 50].includes(Number(params.get('count'))) ? Number(params.get('count')) : 10
        return {
          mode: 'exam', label: `FlightMath practice exam · ${count} questions`, specs: distinctUnlocked,
          count, duration: count * 75, intro: true, hints: false, exam: true, pass: 0.7,
        }
      }
      case 'sprint':
        return { mode: 'sprint', label: '60-second sprint', specs: distinctUnlocked, count: 999, duration: 60, intro: false, hints: false, exam: false, pass: 0 }
      case 'lightning':
        return { mode: 'lightning', label: 'Lightning round', specs: distinctUnlocked, count: 12, duration: 0, intro: false, hints: true, exam: false, pass: 0 }
      case 'precision':
        return { mode: 'precision', label: 'Precision mode', specs: distinctUnlocked, count: 10, duration: 0, intro: false, hints: true, exam: false, pass: 0 }
      case 'daily':
        return { mode: 'daily', label: 'Today’s challenge', specs: distinctUnlocked, count: 10, duration: 0, intro: false, hints: true, exam: false, pass: 0 }
      case 'pilot': {
        const pilotLevel = level ?? levels.find((item) => item.chapterId === 'pilot-math')!
        const pilotSpecs = chapters.find((c) => c.id === 'pilot-math')!.levels.flatMap((item) => item.specs)
        return { mode: 'pilot', label: 'Pilot challenge', specs: pilotSpecs, count: 10, duration: 0, intro: false, hints: true, exam: false, level: pilotLevel, pass: 0 }
      }
      case 'weakness': {
        const weak = weakestConcepts(state.concepts, 3)
        const specs = weak.flatMap((item) => specsForConcept(item.concept))
        return {
          mode: 'weakness', label: 'Weakness mode', specs: specs.length ? specs : distinctUnlocked,
          count: 10, duration: 0, intro: false, hints: true, exam: false, pass: 0,
        }
      }
      case 'survival':
        return { mode: 'survival', label: 'Survival mode', specs: distinctUnlocked, count: 20, duration: 0, intro: false, hints: true, exam: false, pass: 0, mistakeLimit: 3 }
      case 'quick': {
        const minutes = Math.min(15, Math.max(2, Number(params.get('minutes')) || 5))
        return { mode: 'quick', label: `${minutes}-minute quick start`, specs: distinctUnlocked, count: minutes * 4, duration: 0, intro: false, hints: true, exam: false, pass: 0 }
      }
      case 'trick': {
        const trick = id ? trickById(id) : undefined
        return {
          mode: 'trick', label: trick?.title ?? 'Shortcut practice', specs: trick ? [trick.spec] : distinctUnlocked,
          count: 8, duration: 0, intro: false, hints: true, exam: false, pass: 0,
        }
      }
      case 'review': {
        const due = Object.values(state.concepts).filter((item) => item.attempts && item.dueAt <= Date.now())
        const specs = due.flatMap((item) => specsForConcept(item.concept))
        return { mode: 'review', label: 'Review now', specs: specs.length ? specs : distinctUnlocked, count: Math.max(5, Math.min(12, due.length * 2)), duration: 0, intro: false, hints: true, exam: false, pass: 0 }
      }
      case 'mistakes': {
        const seen = new Set<string>()
        const specs = state.attempts.filter((attempt) => !attempt.correct).flatMap((attempt) => {
          const found = specsForConcept(attempt.concept)
          return found.filter((spec) => { const key = specKey(spec); if (seen.has(key)) return false; seen.add(key); return true })
        })
        return { mode: 'mistakes', label: 'Retry mistakes', specs: specs.length ? specs : distinctUnlocked, count: 10, duration: 0, intro: false, hints: true, exam: false, pass: 0 }
      }
      default: {
        const first = levelById['foundations-1']!
        return { mode: 'lesson', label: first.title, specs: first.specs, count: first.questionCount, duration: 0, intro: true, hints: true, exam: false, level: first, pass: 0.7 }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, params, state.levels, state.concepts, state.attempts])

  const initialSpec = config.specs[0] ?? { family: 'arithmetic', params: { op: 'add' } }
  const [phase, setPhase] = useState<'intro' | 'question' | 'review' | 'results'>(config.intro ? 'intro' : 'question')
  const [currentSpec, setCurrentSpec] = useState<GeneratorSpec>(initialSpec)
  const [current, setCurrent] = useState<GeneratedQuestion | null>(() => config.intro ? null : generateQuestion(initialSpec, {
    rng: rngRef.current,
    difficulty: adaptiveDifficulty(
      initialSpec.concept ? state.concepts[initialSpec.concept] : undefined,
      state.settings.intensity,
      config.mode,
    ),
    variant: 1 + Math.floor(rngRef.current() * 97),
    levelId: config.level?.id,
    chapterId: config.chapter?.id,
    concept: initialSpec.concept,
    conceptLabel: initialSpec.conceptLabel,
  }))
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [hintsShown, setHintsShown] = useState(0)
  const [sessionHints, setSessionHints] = useState(0)
  const [assists, setAssists] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [marked, setMarked] = useState<string[]>([])
  const [retryFor, setRetryFor] = useState<string | undefined>()
  const [mistakes, setMistakes] = useState(0)
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now())
  const [timeLeft, setTimeLeft] = useState(config.duration)
  const [now, setNow] = useState(Date.now())
  const [learnOpen, setLearnOpen] = useState(false)
  const [results, setResults] = useState<{ correct: number; accuracy: number; elapsed: number; xp: number } | null>(null)

  const makeQuestion = useCallback((nextIndex: number, difficulty?: Difficulty, specOverride?: GeneratorSpec, similarFrom?: GeneratedQuestion) => {
    const spec = specOverride ?? pickSpec(config.specs, rngRef.current, currentSpec)
    const adaptive = difficulty ?? adaptiveDifficulty(
      spec.concept ? state.concepts[spec.concept] : undefined,
      state.settings.intensity,
      config.mode,
    )
    const question = similarFrom
      ? generateSimilar(similarFrom, spec, {
        rng: rngRef.current,
        difficulty: adaptive,
        levelId: config.level?.id,
        chapterId: config.chapter?.id,
        concept: spec.concept,
        conceptLabel: spec.conceptLabel,
      })
      : generateQuestion(spec, {
        rng: rngRef.current,
        difficulty: adaptive,
        variant: nextIndex + 1 + Math.floor(rngRef.current() * 97),
        levelId: config.level?.id,
        chapterId: config.chapter?.id,
        concept: spec.concept,
        conceptLabel: spec.conceptLabel,
      })
    setCurrent(question)
    setCurrentSpec(spec)
    setValue('')
    setFeedback(null)
    setHintsShown(0)
    setQuestionStartedAt(Date.now())
    void nextIndex
  }, [config, currentSpec, state.concepts, state.settings.intensity])

  const begin = useCallback(() => {
    startedAtRef.current = Date.now()
    setPhase('question')
    makeQuestion(0)
  }, [makeQuestion])

  // Modes without a briefing need their first question as soon as the session opens.
  useEffect(() => {
    if (!config.intro && phase === 'question' && !current) begin()
  }, [config.intro, phase, current, begin])

  const finish = useCallback((early = false) => {
    if (finishedRef.current) return
    finishedRef.current = true
    const answered = answers
    const correct = answered.filter((a) => a.correct).length
    const accuracy = answered.length ? correct / answered.length : 0
    const elapsed = Date.now() - startedAtRef.current
    const passed = accuracy >= config.pass
    const completionXp = config.level && passed ? config.level.xp : 0
    const examXp = config.mode === 'exam' ? Math.round(accuracy * 80 + 20) : 0
    const totalXp = xpEarned + completionXp + examXp
    setXpEarned(totalXp)
    setResults({ correct, accuracy, elapsed, xp: totalXp })

    if (config.level && (config.mode === 'lesson' || config.mode === 'boss')) {
      state.updateLevelResult(config.level, accuracy, elapsed / 1000, sessionHints)
    }
    const breakdown: Record<string, { correct: number; total: number }> = {}
    answered.forEach((answer) => {
      const key = answer.question.conceptLabel || answer.question.concept
      breakdown[key] ??= { correct: 0, total: 0 }
      breakdown[key].total += 1
      if (answer.correct) breakdown[key].correct += 1
    })
    const session: Omit<SessionRecord, 'id' | 'endedAt'> = {
      mode: config.mode, label: config.label, startedAt: startedAtRef.current,
      questionCount: answered.length, correct, xp: totalXp, durationMs: elapsed,
      accuracy, levelId: config.level?.id, chapterId: config.chapter?.id,
      hintsUsed: sessionHints, conceptBreakdown: breakdown,
    }
    state.recordSession(session)
    if (config.mode === 'exam') setPhase('review')
    else setPhase('results')

    const newRank = rankFor(state.stats.xp + totalXp).name
    if (newRank !== rankAtStartRef.current) {
      showCelebration({ kind: 'rank', title: newRank, detail: 'A new rank unlocked. Nicely flown.' })
    }
    if (state.achievements.length + 1 > achievementsAtStartRef.current) {
      showCelebration({ kind: 'achievement', title: 'Achievement unlocked', detail: 'Open Achievements to see what you earned.' })
    }
    void early
  }, [answers, config, sessionHints, state, xpEarned, showCelebration])

  const goNext = useCallback((nextAnswers = answers, nextStreak = streak) => {
    const nextIndex = index + 1
    if (config.mode === 'exam' && nextIndex >= config.count) { finish(); return }
    if (config.mode !== 'sprint' && nextIndex >= config.count) { finish(); return }
    if (config.mode === 'survival' && mistakes >= (config.mistakeLimit ?? 3)) { finish(); return }
    setIndex(nextIndex)
    makeQuestion(nextIndex)
    void nextAnswers
    void nextStreak
  }, [answers, config, finish, index, makeQuestion, mistakes, streak])

  const submitAnswer = useCallback((answerOverride?: string) => {
    const answer = answerOverride ?? value
    if (!current || feedback || !answer.trim()) return
    const correct = validateAnswer(current, answer)
    const timeMs = Date.now() - questionStartedAt
    const hintsUsed = hintsShown >= 4 ? 4 : hintsShown
    const record: AnswerRecord = { question: current, userAnswer: answer, correct, timeMs, hintsUsed, retryFor }
    const nextAnswers = [...answers, record]
    setAnswers(nextAnswers)
    const nextStreak = correct ? streak + 1 : 0
    setStreak(nextStreak)
    setBestStreak((best) => Math.max(best, nextStreak))
    if (!correct) setMistakes((count) => count + 1)
    const gain = correct ? 4 + (retryFor ? 6 : 0) : 0
    setXpEarned((xp) => xp + gain)
    state.recordAttempt({
      question: current, correct, userAnswer: answer, timeMs, hintsUsed,
      mode: config.mode, retryFor,
    })
    playSound(correct ? 'correct' : 'incorrect', state.settings.sound)
    if (state.settings.haptics) haptic(correct ? 14 : [18, 30, 18])

    if (correct) {
      const similar = generateSimilar(current, currentSpec, { rng: rngRef.current, difficulty: 'hard' })
      setFeedback({
        kind: 'correct', explanation: current.explanation, correctAnswer: displayAnswer(current), similar, similarSpec: currentSpec,
      })
    } else {
      const similar = generateSimilar(current, currentSpec, {
        rng: rngRef.current,
        difficulty: mistakes >= 1 ? 'easy' : current.difficulty,
      })
      setFeedback({
        kind: 'incorrect',
        explanation: `Not quite. ${current.explanation}`,
        correctAnswer: displayAnswer(current),
        similar, similarSpec: currentSpec,
      })
    }
  }, [answers, config.mode, current, currentSpec, feedback, hintsShown, mistakes, questionStartedAt, retryFor, state, streak, value])

  const submit = useCallback(() => submitAnswer(), [submitAnswer])

  const skip = useCallback(() => {
    if (!current || feedback) return
    const record: AnswerRecord = { question: current, userAnswer: '', correct: false, timeMs: Date.now() - questionStartedAt, hintsUsed: hintsShown }
    const nextAnswers = [...answers, record]
    setAnswers(nextAnswers)
    setStreak(0)
    setMistakes((count) => count + 1)
    state.recordAttempt({ question: current, correct: false, userAnswer: '', timeMs: record.timeMs, hintsUsed: hintsShown, mode: config.mode })
    setFeedback({ kind: 'skipped', explanation: current.explanation, correctAnswer: displayAnswer(current) })
  }, [answers, config.mode, current, feedback, hintsShown, questionStartedAt, state])

  const revealHint = useCallback(() => {
    if (!current || config.exam || hintsShown >= 4) return
    const next = hintsShown + 1
    setHintsShown(next)
    setSessionHints((count) => count + 1)
    if (next === 4) setAssists((count) => count + 1)
  }, [config.exam, current, hintsShown])

  const useSimilar = useCallback((from?: GeneratedQuestion) => {
    if (!current) return
    const source = from ?? current
    const spec = currentSpec
    const similar = generateSimilar(source, spec, { rng: rngRef.current, difficulty: 'medium' })
    setRetryFor(source.id)
    makeQuestion(index, 'medium', spec, similar)
  }, [current, currentSpec, index, makeQuestion])

  const continueAfterFeedback = useCallback(() => {
    if (!feedback) return
    if (feedback.kind === 'incorrect' && feedback.similar && feedback.similarSpec && config.mode !== 'exam' && !['sprint', 'lightning'].includes(config.mode)) {
      setRetryFor(current?.id)
      makeQuestion(index, 'easy', feedback.similarSpec, feedback.similar)
      return
    }
    goNext()
  }, [config.mode, current, feedback, goNext, index, makeQuestion])

  // Timer for timed modes.
  useEffect(() => {
    if (config.duration <= 0 || phase !== 'question') return
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 0) return 0
        if ([10, 5, 3, 2, 1].includes(value) && state.settings.sound) playSound('tick', true)
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [config.duration, phase, state.settings.sound])

  useEffect(() => {
    if (config.duration > 0 && timeLeft <= 0 && phase === 'question' && !feedback) finish(true)
  }, [config.duration, timeLeft, phase, feedback, finish])

  // Live clock for per-question timer display.
  useEffect(() => {
    if (phase !== 'question' || state.settings.timerPreference === 'hide') return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [phase, state.settings.timerPreference])

  // Fast modes auto-advance.
  useEffect(() => {
    if (!feedback || !['sprint', 'lightning'].includes(config.mode)) return
    const timer = setTimeout(goNext, 620)
    return () => clearTimeout(timer)
  }, [feedback, config.mode, goNext])

  // Survival ends after the mistake limit.
  useEffect(() => {
    if (config.mode === 'survival' && mistakes >= (config.mistakeLimit ?? 3) && !feedback && phase === 'question') finish(true)
  }, [config.mode, mistakes, feedback, phase, finish])

  // Keyboard controls.
  useEffect(() => {
    if (phase !== 'question') return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        if (event.key === 'Enter') { event.preventDefault(); submit() }
        return
      }
      if (event.key.toLowerCase() === 'h') revealHint()
      if (event.key.toLowerCase() === 'l' && !config.exam) setLearnOpen(true)
      if (event.key.toLowerCase() === 's' && !feedback) skip()
      if (['1', '2', '3', '4'].includes(event.key) && current?.options) {
        const option = current.options[Number(event.key) - 1]
        if (option) { setValue(option); submitAnswer(option) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, submitAnswer, revealHint, config.exam, feedback, skip, current])

  const progress = config.mode === 'sprint' ? 0 : Math.min(100, (index / config.count) * 100)
  const questionElapsed = Math.max(0, now - questionStartedAt)

  if (phase === 'results' && results) {
    const passed = results.accuracy >= config.pass
    const weak = Object.entries(
      answers.reduce<Record<string, { correct: number; total: number }>>((acc, answer) => {
        const key = answer.question.conceptLabel
        acc[key] ??= { correct: 0, total: 0 }
        acc[key].total += 1
        if (answer.correct) acc[key].correct += 1
        return acc
      }, {}),
    ).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    const recommended = recommendedLevel(state.levels)
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-12 pt-4">
        <motion.div initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-strong relative overflow-hidden rounded-panel p-7 text-center sm:p-11">
          <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-amber/15 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold">
              {passed || config.pass === 0 ? <Trophy size={25} /> : <Target size={25} />}
            </div>
            <Eyebrow className="!text-gold">{config.pass === 0 ? 'Session complete' : passed ? 'Checkpoint cleared' : 'Training complete'}</Eyebrow>
            <h1 className="display mt-2 text-4xl font-bold sm:text-5xl">{config.pass === 0 ? 'Nice calculation.' : passed ? 'Clear for takeoff.' : 'One step closer.'}</h1>
            <p className="mt-3 text-sm text-muted">{config.label} · {results.correct} of {answers.length} correct</p>
            <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-4">
              {[
                { label: 'Accuracy', value: `${Math.round(results.accuracy * 100)}%` },
                { label: 'Time', value: formatDuration(results.elapsed) },
                { label: 'XP earned', value: `+${results.xp}` },
              ].map((item) => (
                <div key={item.label}>
                  <div className="num text-2xl font-semibold text-ink">{item.value}</div>
                  <div className="mt-1 text-xs text-muted">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="glass-panel rounded-panel p-6 sm:p-8">
            <Eyebrow className="mb-4">Performance detail</Eyebrow>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Best streak</span><span className="num">{bestStreak}</span></div>
              <div className="flex justify-between"><span className="text-muted">Hints used</span><span className="num">{sessionHints}</span></div>
              <div className="flex justify-between"><span className="text-muted">Shortcut practice</span><span className="num">{assists}</span></div>
              <div className="flex justify-between"><span className="text-muted">Average time</span><span className="num">{answers.length ? formatDuration(answers.reduce((sum, a) => sum + a.timeMs, 0) / answers.length) : '—'}</span></div>
              {config.mode === 'sprint' && <div className="flex justify-between"><span className="text-muted">Personal record</span><span className="num">{state.stats.bestSprint}</span></div>}
            </div>
          </div>
          <div className="glass-panel rounded-panel p-6 sm:p-8">
            <Eyebrow className="mb-4">Concept read</Eyebrow>
            {weak.length ? (
              <>
                <p className="text-sm text-muted">Strongest: <span className="text-ink">{weak.at(-1)?.[0]}</span></p>
                <p className="mt-2 text-sm text-muted">Focus next: <span className="text-ink">{weak[0]?.[0]}</span></p>
                <Button variant="accent" className="mt-6" onClick={() => navigate('/session/weakness')} icon={<Target size={15} />}>Train weak areas</Button>
              </>
            ) : <p className="text-sm text-muted">Answer a few more questions to reveal concept-level feedback.</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {config.level && <Button variant="amber" onClick={() => navigate(`/session/${config.mode}/${config.level!.id}`)} icon={<RotateCcw size={16} />}>Try again</Button>}
          <Button onClick={() => navigate(`/session/lesson/${recommended}`)} trailing={<ArrowRight size={16} />}>Next lesson</Button>
          <Button variant="ghost" onClick={() => navigate('/')} icon={<Home size={16} />}>Back home</Button>
        </div>
      </div>
    )
  }

  if (phase === 'review' && config.exam) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        <Eyebrow>FlightMath practice exam · review</Eyebrow>
        <h1 className="display text-4xl font-bold">Review your answers.</h1>
        <p className="text-sm text-muted">Nothing here is an official assessment question. Use the review to learn, then finish to save your result.</p>
        <div className="space-y-2">
          {answers.map((answer, i) => (
            <div key={`${answer.question.id}-${i}`} className={clsx('glass-panel rounded-tile p-4', !answer.correct && 'border-coral/30')}>
              <div className="flex items-start gap-3">
                <span className={clsx('num grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs', answer.correct ? 'border-sage text-sage' : 'border-coral text-coral')}>{answer.correct ? <Check size={14} /> : <X size={14} />}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{answer.question.prompt}</div>
                  <div className="mt-1 text-xs text-muted">Yours: <span className="num">{answer.userAnswer || 'skipped'}</span> · Correct: <span className="num text-sage">{displayAnswer(answer.question)}</span></div>
                  {!answer.correct && <p className="mt-2 text-xs leading-relaxed text-faint">{answer.question.explanation}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button variant="amber" onClick={() => { setPhase('results'); if (results) { /* results already saved */ } }} icon={<Check size={16} />}>Finish exam</Button>
      </div>
    )
  }

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-3xl space-y-7 pb-12 pt-4">
        <button onClick={() => navigate(-1)} className="btn btn-ghost !px-0 text-sm"><ArrowLeft size={16} /> Back</button>
        <Eyebrow className="!text-accent">{config.exam ? 'Exam briefing' : 'Before you begin'}</Eyebrow>
        <h1 className="display text-[clamp(2.2rem,5vw,3.6rem)] font-bold">{config.label}</h1>
        {config.level ? (
          <>
            <p className="text-lg leading-relaxed text-muted">{config.level.descriptor}</p>
            <div className="glass-panel rounded-panel p-6">
              <Eyebrow className="mb-3">What you will learn</Eyebrow>
              <p className="text-sm leading-relaxed">{state.concepts[config.level.specs[0]?.concept ?? '']?.label ?? config.level.title}: recognising this question type instantly and solving it with the shortest reliable method.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge tone="accent">{config.count} questions</Badge>
                <Badge tone="gold">{config.level.xp} XP on pass</Badge>
                <Badge>{config.pass * 100}% needed</Badge>
              </div>
            </div>
          </>
        ) : (
          <div className="glass-panel rounded-panel p-6">
            <p className="text-sm leading-relaxed text-muted">This is a FlightMath practice test. It is not an official IndiGo or ADAPT assessment. No hints or explanations appear during the test; you can skip questions and mark them for review.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="accent">{config.count} questions</Badge>
              <Badge>{Math.round(config.duration / 60)} minutes</Badge>
              <Badge tone="gold">Review at the end</Badge>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Button variant="amber" size="lg" onClick={begin} icon={<Check size={17} />}>{config.exam ? 'Begin practice exam' : 'Start session'}</Button>
          {config.exam && <Button variant="ghost" onClick={() => navigate('/practice')}>Change exam length</Button>}
        </div>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-4xl flex-col pb-8 pt-2">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost !px-0 !min-h-0 text-xs"><ArrowLeft size={14} /> Leave session</button>
        <div className="flex items-center gap-2">
          {config.exam && (
            <Button variant="ghost" size="sm" onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen()
              else void document.documentElement.requestFullscreen?.()
            }} icon={<Maximize2 size={14} />}>Focus</Button>
          )}
          {state.settings.timerPreference === 'show' && (
            <span className={clsx('pill flex items-center gap-1.5 num', timeLeft > 0 && timeLeft < 10 ? 'border-coral text-coral' : 'text-muted')}>
              <Timer size={13} />
              {config.duration > 0 ? formatClock(timeLeft) : formatDuration(questionElapsed)}
            </span>
          )}
          <span className="pill flex items-center gap-1.5 text-accent"><Flame size={13} /><span className="num">{streak}</span></span>
          <span className="pill text-muted">+<span className="num">{xpEarned}</span> XP</span>
        </div>
      </div>

      <div className="mb-7">
        <div className="mb-2 flex justify-between text-xs text-muted">
          <span>{config.exam ? `Question ${Math.min(index + 1, config.count)} of ${config.count}` : config.label}</span>
          <span className="num">{config.mode === 'sprint' ? `${answers.length} answered` : `${Math.min(index, config.count)}/${config.count}`}</span>
        </div>
        <ProgressBar value={progress} tone={config.exam ? 'sage' : 'amber'} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          className="glass-strong flex-1 rounded-panel p-6 sm:p-9"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow className="!text-accent">{current.conceptLabel}</Eyebrow>
              <div className="mt-1 text-xs text-faint">{current.subtopic} · {current.difficulty} · target {current.timeTargetSec}s</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={current.type === 'mcq' ? 'neutral' : 'accent'}>{current.type === 'mcq' ? 'Choose one' : current.type === 'numeric' ? 'Type answer' : current.type}</Badge>
              {config.exam && (
                <Button
                  size="sm"
                  variant={marked.includes(current.id) ? 'accent' : 'outline'}
                  onClick={() => setMarked((list) => list.includes(current.id) ? list.filter((item) => item !== current.id) : [...list, current.id])}
                  icon={<Flag size={13} />}
                >
                  {marked.includes(current.id) ? 'Marked' : 'Mark'}
                </Button>
              )}
            </div>
          </div>

          <h1 className="num text-balance mb-9 text-center text-[clamp(1.8rem,5vw,3.2rem)] font-semibold leading-[1.2]">{current.prompt}</h1>

          <QuestionInput
            question={current}
            value={value}
            onChange={setValue}
            onSubmit={submit}
            disabled={Boolean(feedback)}
            locked={Boolean(feedback)}
          />

          {hintsShown > 0 && !config.exam && (
            <div className="mx-auto mt-7 max-w-2xl space-y-2">
              {current.hints.slice(0, hintsShown).map((hint, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-tile border border-gold/25 bg-gold/5 px-4 py-3 text-sm">
                  <span className="eyebrow mr-2 !text-[0.5625rem] !text-gold">Hint {i + 1}</span>{hint}
                </motion.div>
              ))}
              {hintsShown === 4 && (
                <Button variant="accent" size="sm" onClick={() => useSimilar()} icon={<RotateCcw size={14} />}>Solve a similar one instead</Button>
              )}
            </div>
          )}

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx('mx-auto mt-7 max-w-2xl rounded-tile border p-5', feedback.kind === 'correct' ? 'border-sage/40 bg-sage/10' : 'border-coral/40 bg-coral/10')}
              >
                <div className={clsx('flex items-center gap-2 font-semibold', feedback.kind === 'correct' ? 'text-sage' : 'text-coral')}>
                  {feedback.kind === 'correct' ? <Check size={17} /> : <X size={17} />}
                  {feedback.kind === 'correct' ? 'Nice calculation.' : feedback.kind === 'skipped' ? 'Skipped for now.' : 'Not quite — let’s look at the method.'}
                </div>
                {!config.exam && (
                  <>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{feedback.explanation}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-faint">
                      <span>Concept: <span className="text-ink">{current.conceptLabel}</span></span>
                      <span>Correct: <span className="num text-sage">{feedback.correctAnswer}</span></span>
                    </div>
                  </>
                )}
                <Button
                  variant={feedback.kind === 'correct' ? 'accent' : 'amber'}
                  className="mt-5"
                  onClick={continueAfterFeedback}
                  trailing={<ArrowRight size={15} />}
                >
                  {feedback.kind === 'incorrect' && !config.exam ? 'Try a similar question' : config.exam ? 'Next question' : 'Continue'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <div className="flex flex-wrap gap-2">
              {!config.exam && (
                <>
                  <Button variant="accent" size="sm" onClick={revealHint} disabled={hintsShown >= 4} icon={<Lightbulb size={15} />}>
                    Hint {hintsShown}/4
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLearnOpen(true)} icon={<BookOpen size={15} />}>Learn</Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={skip} disabled={Boolean(feedback)} icon={<SkipForward size={15} />}>Skip</Button>
            </div>
            {current.type === 'numeric' && !feedback && (
              <Button variant="primary" onClick={submit} disabled={!value.trim()} trailing={<ArrowRight size={15} />}>Check answer</Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between text-[0.6875rem] text-faint">
        <span>{config.exam ? 'FlightMath practice test · not official assessment content' : 'Progress saves automatically on this device'}</span>
        <span className="hidden sm:inline">Enter submit · H hint · L learn · S skip</span>
      </div>

      <Modal open={learnOpen} onClose={() => setLearnOpen(false)} title="Learn this skill" wide>
        <div className="space-y-5">
          <div>
            <Eyebrow className="mb-2">Concept</Eyebrow>
            <p className="text-sm leading-relaxed">{current.explanation}</p>
          </div>
          <div className="rounded-tile border border-line bg-inset/50 p-4">
            <Eyebrow className="mb-3 !text-gold">How to solve it</Eyebrow>
            <ol className="space-y-2">
              {current.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted"><span className="num text-faint">{i + 1}</span>{step}</li>
              ))}
            </ol>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Eyebrow className="mb-2">Mental trick</Eyebrow><p className="text-sm text-ink">{current.shortcut}</p></div>
            <div><Eyebrow className="mb-2">Illustration</Eyebrow><p className="text-sm text-muted">{current.hints[1]}</p></div>
          </div>
          <div className="hairline" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setLearnOpen(false)}>Back to question</Button>
            <Button variant="accent" onClick={() => { setLearnOpen(false); useSimilar() }} icon={<RotateCcw size={15} />}>Solve a similar one</Button>
            <Button variant="ghost" onClick={() => { setLearnOpen(false); skip() }}>Skip this question</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
