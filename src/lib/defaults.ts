import type { AppData, Profile, Settings, Stats } from './types'

export const defaultProfile: Profile = {
  name: 'Cadet',
  onboardingComplete: false,
  onboardingSkipped: false,
  goals: [],
  comfort: '',
  dailyMinutes: 5,
  focus: '',
  intensity: 'balanced',
  createdAt: Date.now(),
}

export const defaultSettings: Settings = {
  sound: false,
  backgroundSound: 'none',
  reducedMotion: false,
  theme: 'dark',
  timerPreference: 'show',
  dailyGoalMinutes: 5,
  intensity: 'balanced',
  answerPreference: 'numeric',
  haptics: true,
  examSound: false,
}

export const defaultStats: Stats = {
  xp: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  totalTimeMs: 0,
  fastestMs: 0,
  lessonsCompleted: 0,
  bossCompleted: 0,
  hintsUsed: 0,
  quickAnswers: 0,
  noHintLevels: 0,
  recoveredMistakes: 0,
  calculations: 0,
  examsCompleted: 0,
  bestSprint: 0,
  improvementCount: 0,
}

export function todayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function defaultData(): AppData {
  return {
    profile: { ...defaultProfile },
    settings: { ...defaultSettings },
    stats: { ...defaultStats },
    streak: { current: 0, longest: 0, lastDate: null, dates: [], freezes: 2 },
    levels: {},
    concepts: {},
    attempts: [],
    sessions: [],
    achievements: [],
    missions: { date: todayKey(), items: [] },
    xpEvents: [],
  }
}
