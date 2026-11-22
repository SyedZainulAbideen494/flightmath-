import type { AppData } from '@/lib/types'
import { todayKey } from '@/lib/defaults'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  xp: number
  test: (data: AppData) => boolean
}

export const achievements: Achievement[] = [
  {
    id: 'first-flight', title: 'First Flight', description: 'Complete your first lesson.', icon: 'plane', xp: 25,
    test: (d) => d.stats.lessonsCompleted >= 1,
  },
  {
    id: 'quick-thinker', title: 'Quick Thinker', description: 'Answer 10 questions in under 8 seconds.', icon: 'zap', xp: 35,
    test: (d) => d.stats.quickAnswers >= 10,
  },
  {
    id: 'precision-pilot', title: 'Precision Pilot', description: 'Score 100% in a session of at least 8 questions.', icon: 'target', xp: 40,
    test: (d) => d.sessions.some((s) => s.questionCount >= 8 && s.accuracy >= 1),
  },
  {
    id: 'no-assistance', title: 'No Assistance', description: 'Complete a level without using a hint.', icon: 'sparkles', xp: 40,
    test: (d) => d.stats.noHintLevels >= 1,
  },
  {
    id: 'comeback', title: 'Comeback', description: 'Correct 5 questions you previously got wrong.', icon: 'rotate', xp: 50,
    test: (d) => d.stats.recoveredMistakes >= 5,
  },
  {
    id: 'mental-engine', title: 'Mental Engine', description: 'Complete 100 mental calculations.', icon: 'engine', xp: 60,
    test: (d) => d.stats.calculations >= 100,
  },
  {
    id: 'consistent-cadet', title: 'Consistent Cadet', description: 'Maintain a 7-day streak.', icon: 'calendar', xp: 70,
    test: (d) => d.streak.longest >= 7,
  },
  {
    id: 'percentage-pro', title: 'Percentage Pro', description: 'Master five percentage concepts.', icon: 'percent', xp: 65,
    test: (d) => Object.values(d.concepts).filter((c) => c.concept.includes('percent') && c.mastery >= 80).length >= 5,
  },
  {
    id: 'speed-demon', title: 'Speed Demon', description: 'Improve your answer time five times.', icon: 'gauge', xp: 55,
    test: (d) => d.stats.improvementCount >= 5,
  },
  {
    id: 'flight-ready', title: 'Flight Ready', description: 'Score 80% or better in a full practice exam.', icon: 'award', xp: 100,
    test: (d) => d.sessions.some((s) => s.mode === 'exam' && s.accuracy >= 0.8),
  },
  {
    id: 'boss-slayer', title: 'Checkpoint Cleared', description: 'Defeat a chapter boss level.', icon: 'shield', xp: 45,
    test: (d) => d.stats.bossCompleted >= 1,
  },
  {
    id: 'daily-discipline', title: 'Daily Discipline', description: 'Answer 20 questions in one day.', icon: 'sun', xp: 35,
    test: (d) => {
      const key = todayKey()
      return d.attempts.filter((a) => todayKey(new Date(a.at)) === key).length >= 20
    },
  },
]

export function newlyEarnedAchievements(data: AppData): Achievement[] {
  const unlocked = new Set(data.achievements.map((a) => a.id))
  return achievements.filter((a) => !unlocked.has(a.id) && a.test(data))
}
