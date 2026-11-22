import { create } from 'zustand'
import { clearData, loadData, saveData } from '@/lib/db'
import { defaultData, todayKey } from '@/lib/defaults'
import type {
  AchievementState, AppData, GeneratedQuestion, Level, LevelStat, Profile, SessionRecord, Settings,
} from '@/lib/types'
import { computeMastery, emptyConcept, reviewIntervalDays } from '@/features/progress/mastery'
import { newlyEarnedAchievements } from '@/features/gamification/achievements'
import { computeMissionProgress, ensureMissions, missionsForDate } from '@/features/gamification/missions'
import { rankFor } from '@/features/gamification/ranks'

const DAY = 86_400_000

function yesterdayKey(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return todayKey(date)
}

function snapshot(state: AppData): AppData {
  return {
    profile: state.profile,
    settings: state.settings,
    stats: state.stats,
    streak: state.streak,
    levels: state.levels,
    concepts: state.concepts,
    attempts: state.attempts,
    sessions: state.sessions,
    achievements: state.achievements,
    missions: state.missions,
    xpEvents: state.xpEvents,
  }
}

function persist(state: AppData): void {
  void saveData(snapshot(state))
}

function withAchievements(data: AppData): AppData {
  const earned = newlyEarnedAchievements(data)
  if (!earned.length) return data
  return {
    ...data,
    achievements: [...data.achievements, ...earned.map((a): AchievementState => ({ id: a.id, unlockedAt: Date.now() }))],
    stats: { ...data.stats, xp: data.stats.xp + earned.reduce((sum, a) => sum + a.xp, 0) },
    xpEvents: [...data.xpEvents, ...earned.map((a) => ({ id: `ach-${a.id}`, amount: a.xp, reason: a.title, at: Date.now() }))],
  }
}

export interface AppState extends AppData {
  hydrated: boolean
  hydrate: () => Promise<void>
  updateProfile: (patch: Partial<Profile>) => void
  updateSettings: (patch: Partial<Settings>) => void
  finishOnboarding: (answers: Partial<Profile>) => void
  skipOnboarding: () => void
  reopenOnboarding: () => void
  recordAttempt: (input: {
    question: GeneratedQuestion
    correct: boolean
    userAnswer: string
    timeMs: number
    hintsUsed: number
    mode: string
    retryFor?: string
  }) => void
  recordSession: (session: Omit<SessionRecord, 'id' | 'endedAt'>) => void
  updateLevelResult: (level: Level, accuracy: number, timeSec: number, hintsUsed: number) => void
  awardXp: (amount: number, reason: string) => void
  resetProgress: () => Promise<void>
  importData: (raw: string) => Promise<boolean>
  exportData: () => string
}

export const useAppStore = create<AppState>()((set, get) => ({
  ...defaultData(),
  hydrated: false,

  hydrate: async () => {
    try {
      await loadDataSequence()
      const stored = await loadData()
      const base = defaultData()
      if (stored) {
        const data = ensureMissions({
          ...base,
          ...stored,
          profile: { ...base.profile, ...stored.profile },
          settings: { ...base.settings, ...stored.settings },
          stats: { ...base.stats, ...stored.stats },
          streak: { ...base.streak, ...stored.streak },
          missions: stored.missions ?? base.missions,
        })
        set({ ...data, hydrated: true })
      } else {
        set({ ...ensureMissions(base), hydrated: true })
      }
    } catch {
      set({ ...ensureMissions(defaultData()), hydrated: true })
    }
  },

  updateProfile: (patch) => set((state) => {
    const next = { ...state, profile: { ...state.profile, ...patch } }
    persist(next)
    return next
  }),

  updateSettings: (patch) => set((state) => {
    const next = { ...state, settings: { ...state.settings, ...patch }, profile: { ...state.profile, intensity: patch.intensity ?? state.profile.intensity } }
    persist(next)
    return next
  }),

  finishOnboarding: (answers) => set((state) => {
    const next = ensureMissions({
      ...state,
      profile: { ...state.profile, ...answers, onboardingComplete: true, onboardingSkipped: false },
      settings: { ...state.settings, intensity: answers.intensity ?? state.settings.intensity, dailyGoalMinutes: answers.dailyMinutes ?? state.settings.dailyGoalMinutes },
    })
    persist(next)
    return next
  }),

  skipOnboarding: () => set((state) => {
    const next = { ...state, profile: { ...state.profile, onboardingComplete: true, onboardingSkipped: true } }
    persist(next)
    return next
  }),

  reopenOnboarding: () => set((state) => {
    const next = { ...state, profile: { ...state.profile, onboardingComplete: false } }
    persist(next)
    return next
  }),

  recordAttempt: ({ question, correct, userAnswer, timeMs, hintsUsed, mode, retryFor }) => set((state) => {
    const now = Date.now()
    const key = todayKey()
    const conceptKey = question.concept
    const existing = state.concepts[conceptKey] ?? emptyConcept(conceptKey, question.conceptLabel, now)

    const recent = [...existing.recent, correct].slice(-12)
    const changed: typeof existing = {
      ...existing,
      label: question.conceptLabel || existing.label,
      attempts: existing.attempts + 1,
      correct: existing.correct + (correct ? 1 : 0),
      totalTimeMs: existing.totalTimeMs + timeMs,
      fastestMs: correct ? (existing.fastestMs ? Math.min(existing.fastestMs, timeMs) : timeMs) : existing.fastestMs,
      hintsUsed: existing.hintsUsed + hintsUsed,
      mistakes: existing.mistakes + (correct ? 0 : 1),
      retryAttempts: existing.retryAttempts + (retryFor ? 1 : 0),
      retrySuccess: existing.retrySuccess + (retryFor && correct ? 1 : 0),
      lastSeenAt: now,
      recent,
    }
    changed.mastery = computeMastery(changed, question.timeTargetSec)
    const days = reviewIntervalDays(changed, correct, hintsUsed, timeMs, question.timeTargetSec)
    changed.intervalDays = days
    changed.dueAt = now + (days === 0 ? 4 * 60 * 1000 : days * DAY)
    changed.confidence = Math.round(recent.filter(Boolean).length / recent.length * 100)

    const previousBest = existing.fastestMs
    const improved = correct && previousBest > 0 && timeMs < previousBest * 0.8

    const streak = { ...state.streak }
    if (streak.lastDate !== key) {
      streak.current = streak.lastDate === yesterdayKey() ? streak.current + 1 : 1
      streak.lastDate = key
      streak.dates = [...new Set([...streak.dates, key])].slice(-400)
      streak.longest = Math.max(streak.longest, streak.current)
    }

    const xpGain = (correct ? 4 : 0) + (retryFor && correct ? 6 : 0) + (correct && hintsUsed === 0 && existing.attempts === 0 ? 5 : 0)
    const data: AppData = {
      ...state,
      stats: {
        ...state.stats,
        xp: state.stats.xp + xpGain,
        totalQuestions: state.stats.totalQuestions + 1,
        correctAnswers: state.stats.correctAnswers + (correct ? 1 : 0),
        totalTimeMs: state.stats.totalTimeMs + timeMs,
        fastestMs: correct ? (state.stats.fastestMs ? Math.min(state.stats.fastestMs, timeMs) : timeMs) : state.stats.fastestMs,
        hintsUsed: state.stats.hintsUsed + hintsUsed,
        calculations: state.stats.calculations + 1,
        quickAnswers: state.stats.quickAnswers + (correct && timeMs <= 8000 ? 1 : 0),
        recoveredMistakes: state.stats.recoveredMistakes + (retryFor && correct ? 1 : 0),
        improvementCount: state.stats.improvementCount + (improved ? 1 : 0),
      },
      streak,
      concepts: { ...state.concepts, [conceptKey]: changed },
      attempts: [...state.attempts, {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        questionId: question.id,
        concept: conceptKey,
        conceptLabel: question.conceptLabel,
        chapterId: question.chapterId ?? '',
        levelId: question.levelId ?? '',
        prompt: question.prompt,
        userAnswer,
        correctAnswer: question.answer,
        correct,
        timeMs,
        hintsUsed,
        difficulty: question.difficulty,
        at: now,
        mode,
        retryFor,
      }],
      xpEvents: xpGain ? [...state.xpEvents, { id: `ans-${now}`, amount: xpGain, reason: correct ? 'Correct answer' : 'Recovery', at: now }] : state.xpEvents,
    }
    const more = withAchievements(data)
    const final = { ...more, missions: { ...more.missions, items: computeMissionProgress(more) } }
    persist(final)
    return final
  }),

  recordSession: (input) => set((state) => {
    const now = Date.now()
    const session: SessionRecord = { ...input, id: `s-${now}-${Math.random().toString(36).slice(2, 6)}`, endedAt: now }
    const passed = input.accuracy >= 0.7
    const data: AppData = {
      ...state,
      sessions: [...state.sessions.slice(-199), session],
      stats: {
        ...state.stats,
        xp: state.stats.xp + input.xp,
        lessonsCompleted: state.stats.lessonsCompleted + (input.mode === 'lesson' && passed ? 1 : 0),
        bossCompleted: state.stats.bossCompleted + (input.mode === 'boss' && input.accuracy >= 0.8 ? 1 : 0),
        examsCompleted: state.stats.examsCompleted + (input.mode === 'exam' ? 1 : 0),
        bestSprint: input.mode === 'sprint' ? Math.max(state.stats.bestSprint, input.correct) : state.stats.bestSprint,
        noHintLevels: input.mode === 'lesson' && input.hintsUsed === 0 && passed ? state.stats.noHintLevels + 1 : state.stats.noHintLevels,
      },
      xpEvents: [...state.xpEvents, { id: session.id, amount: input.xp, reason: input.label, at: now }],
    }
    const more = withAchievements(data)
    const final = { ...more, missions: { ...more.missions, items: computeMissionProgress(more) } }
    persist(final)
    return final
  }),

  updateLevelResult: (level, accuracy, timeSec, hintsUsed) => set((state) => {
    const existing = state.levels[level.id]
    const completed = accuracy >= (level.kind === 'boss' ? 0.8 : 0.7)
    const status: LevelStat['status'] = !completed
      ? (existing?.status === 'completed' || existing?.status === 'mastered' || existing?.status === 'perfected' ? existing.status : 'in-progress')
      : accuracy >= 0.98 && hintsUsed === 0 ? 'mastered'
      : accuracy >= 0.95 ? 'perfected' : 'completed'
    const next = {
      ...state,
      levels: {
        ...state.levels,
        [level.id]: {
          levelId: level.id,
          status,
          attempts: (existing?.attempts ?? 0) + 1,
          completedAt: completed ? existing?.completedAt ?? Date.now() : existing?.completedAt ?? null,
          bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, accuracy),
          bestTimeSec: existing?.bestTimeSec ? Math.min(existing.bestTimeSec, timeSec) : timeSec,
          bestScore: Math.max(existing?.bestScore ?? 0, Math.round(accuracy * 100)),
          mastery: Math.max(existing?.mastery ?? 0, Math.round(accuracy * 100) - hintsUsed * 2),
          hintsUsed: (existing?.hintsUsed ?? 0) + hintsUsed,
          perfect: (existing?.perfect ?? false) || accuracy >= 1,
          lastPlayedAt: Date.now(),
        },
      },
    }
    persist(next)
    return next
  }),

  awardXp: (amount, reason) => set((state) => {
    const next = {
      ...state,
      stats: { ...state.stats, xp: state.stats.xp + amount },
      xpEvents: [...state.xpEvents, { id: `xp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, amount, reason, at: Date.now() }],
    }
    persist(next)
    return next
  }),

  resetProgress: async () => {
    await clearData()
    set({ ...ensureMissions(defaultData()), hydrated: true })
  },

  importData: async (raw) => {
    try {
      const parsed = JSON.parse(raw) as Partial<AppData>
      if (!parsed.profile || !parsed.stats || !Array.isArray(parsed.attempts)) return false
      const base = defaultData()
      const data = ensureMissions({
        ...base,
        ...parsed,
        profile: { ...base.profile, ...parsed.profile },
        settings: { ...base.settings, ...parsed.settings },
        stats: { ...base.stats, ...parsed.stats },
        streak: { ...base.streak, ...parsed.streak },
        missions: parsed.missions ?? missionsForDate(),
      })
      await saveData(data)
      set({ ...data, hydrated: true })
      return true
    } catch {
      return false
    }
  },

  exportData: () => JSON.stringify(snapshot(get()), null, 2),
}))

async function loadDataSequence(): Promise<void> {
  // Kept as a hook for future migrations; currently a no-op.
}

export function currentRank(state: AppData = useAppStore.getState()) {
  return rankFor(state.stats.xp)
}
