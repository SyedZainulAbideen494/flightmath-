export type Difficulty = 'easy' | 'medium' | 'hard'
export type QuestionType = 'numeric' | 'mcq' | 'boolean' | 'matching' | 'order' | 'shortcut'
export type ThemePreference = 'system' | 'light' | 'dark'
export type Intensity = 'relaxed' | 'balanced' | 'challenge'

export interface GeneratorSpec {
  family: string
  params?: Record<string, string | number | boolean>
  concept?: string
  conceptLabel?: string
}

export interface GeneratedQuestion {
  id: string
  specKey: string
  variant: number
  prompt: string
  type: QuestionType
  answer: string
  numericAnswer?: number
  tolerance?: number
  options?: string[]
  pairs?: { left: string; right: string }[]
  orderItems?: string[]
  answerUnit?: string
  chapterId?: string
  levelId?: string
  concept: string
  conceptLabel: string
  subtopic: string
  difficulty: Difficulty
  explanation: string
  steps: string[]
  hints: [string, string, string, string]
  shortcut: string
  timeTargetSec: number
  generatedAt: number
}

export interface Level {
  id: string
  chapterId: string
  index: number
  title: string
  kind: 'lesson' | 'boss' | 'exam'
  specs: GeneratorSpec[]
  questionCount: number
  xp: number
  timeTargetSec: number
  descriptor: string
}

export interface Chapter {
  id: string
  index: number
  title: string
  subtitle: string
  icon: string
  levels: Level[]
}

export interface Profile {
  name: string
  onboardingComplete: boolean
  onboardingSkipped: boolean
  goals: string[]
  comfort: string
  dailyMinutes: number
  focus: string
  intensity: Intensity
  createdAt: number
}

export interface Settings {
  sound: boolean
  backgroundSound: string
  reducedMotion: boolean
  theme: ThemePreference
  timerPreference: 'show' | 'hide'
  dailyGoalMinutes: number
  intensity: Intensity
  answerPreference: 'numeric' | 'mcq'
  haptics: boolean
  examSound: boolean
}

export interface ConceptStat {
  concept: string
  label: string
  attempts: number
  correct: number
  totalTimeMs: number
  fastestMs: number
  hintsUsed: number
  mistakes: number
  retryAttempts: number
  retrySuccess: number
  mastery: number
  confidence: number
  lastSeenAt: number
  dueAt: number
  intervalDays: number
  recent: boolean[]
}

export interface LevelStat {
  levelId: string
  status: 'available' | 'in-progress' | 'completed' | 'perfected' | 'mastered'
  attempts: number
  completedAt: number | null
  bestAccuracy: number
  bestTimeSec: number | null
  bestScore: number
  mastery: number
  hintsUsed: number
  perfect: boolean
  lastPlayedAt: number
}

export interface AttemptRecord {
  id: string
  questionId: string
  concept: string
  conceptLabel: string
  chapterId: string
  levelId: string
  prompt: string
  userAnswer: string
  correctAnswer: string
  correct: boolean
  timeMs: number
  hintsUsed: number
  difficulty: Difficulty
  at: number
  mode: string
  retryFor?: string
  retrySuccess?: boolean
}

export interface SessionRecord {
  id: string
  mode: string
  label: string
  startedAt: number
  endedAt: number
  questionCount: number
  correct: number
  xp: number
  durationMs: number
  accuracy: number
  levelId?: string
  chapterId?: string
  hintsUsed: number
  conceptBreakdown: Record<string, { correct: number; total: number }>
}

export interface AchievementState {
  id: string
  unlockedAt: number
}

export interface MissionItem {
  id: string
  title: string
  target: number
  progress: number
  done: boolean
  xp: number
  link: string
}

export interface MissionState {
  date: string
  items: MissionItem[]
}

export interface StreakState {
  current: number
  longest: number
  lastDate: string | null
  dates: string[]
  freezes: number
}

export interface Stats {
  xp: number
  totalQuestions: number
  correctAnswers: number
  totalTimeMs: number
  fastestMs: number
  lessonsCompleted: number
  bossCompleted: number
  hintsUsed: number
  quickAnswers: number
  noHintLevels: number
  recoveredMistakes: number
  calculations: number
  examsCompleted: number
  bestSprint: number
  improvementCount: number
}

export interface AppData {
  profile: Profile
  settings: Settings
  stats: Stats
  streak: StreakState
  levels: Record<string, LevelStat>
  concepts: Record<string, ConceptStat>
  attempts: AttemptRecord[]
  sessions: SessionRecord[]
  achievements: AchievementState[]
  missions: MissionState
  xpEvents: { id: string; amount: number; reason: string; at: number }[]
}

export interface AnswerContext {
  hintsUsed: number
  retry?: boolean
  mode?: string
}

export interface QuestionOptions {
  rng?: () => number
  difficulty?: Difficulty
  variant?: number
  levelId?: string
  chapterId?: string
  concept?: string
  conceptLabel?: string
  subtopic?: string
}
