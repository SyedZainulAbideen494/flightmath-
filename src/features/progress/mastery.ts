import type { ConceptStat, Difficulty, Intensity } from '@/lib/types'

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

export function emptyConcept(concept: string, label: string, now = Date.now()): ConceptStat {
  return {
    concept,
    label,
    attempts: 0,
    correct: 0,
    totalTimeMs: 0,
    fastestMs: 0,
    hintsUsed: 0,
    mistakes: 0,
    retryAttempts: 0,
    retrySuccess: 0,
    mastery: 0,
    confidence: 0,
    lastSeenAt: now,
    dueAt: now,
    intervalDays: 0,
    recent: [],
  }
}

/** Mastery blends accuracy, speed, independent work and retention. */
export function computeMastery(stat: ConceptStat, timeTargetSec = 20): number {
  if (!stat.attempts) return 0
  const accuracy = stat.correct / stat.attempts
  const recent = stat.recent.slice(-8)
  const recentAccuracy = recent.length ? recent.filter(Boolean).length / recent.length : accuracy
  const avgMs = stat.totalTimeMs / stat.attempts
  const speedScore = clamp(1 - Math.max(0, avgMs / 1000 - timeTargetSec) / (timeTargetSec * 2.5))
  const independence = clamp(1 - stat.hintsUsed / Math.max(1, stat.attempts))
  const retention = stat.intervalDays >= 3 ? 1 : stat.intervalDays >= 1 ? 0.8 : 0.55
  return Math.round(
    clamp(accuracy * 52 + recentAccuracy * 18 + speedScore * 14 + independence * 8 + retention * 8),
  )
}

export function reviewIntervalDays(stat: ConceptStat, correct: boolean, hintsUsed: number, timeMs: number, targetSec = 20): number {
  if (!correct) return 0
  const recent = stat.recent.slice(-4).filter(Boolean).length
  if (hintsUsed > 0) return 1
  if (timeMs / 1000 > targetSec * 1.4) return 1
  if (recent >= 4 && stat.mastery >= 85) return 30
  if (recent >= 3 && stat.mastery >= 78) return 14
  if (recent >= 2 && stat.mastery >= 70) return 7
  return 3
}

export function adaptiveDifficulty(stat: ConceptStat | undefined, intensity: Intensity, mode: string): Difficulty {
  if (mode === 'exam' || mode === 'sprint') return 'medium'
  if (mode === 'precision' || mode === 'lightning') return 'hard'
  if (!stat || stat.attempts < 3) return intensity === 'challenge' ? 'hard' : intensity === 'relaxed' ? 'easy' : 'medium'
  const accuracy = stat.correct / stat.attempts
  const avgSec = stat.totalTimeMs / stat.attempts / 1000
  if (accuracy < 0.55) return 'easy'
  if (stat.mastery >= 82 && avgSec <= 15 && intensity !== 'relaxed') return 'hard'
  if (stat.mastery >= 60) return 'medium'
  return 'easy'
}

export function weakestConcepts(stats: Record<string, ConceptStat>, count = 3): ConceptStat[] {
  return Object.values(stats)
    .filter((stat) => stat.attempts >= 2)
    .sort((a, b) => a.mastery - b.mastery || b.mistakes - a.mistakes)
    .slice(0, count)
}

export function strongestConcepts(stats: Record<string, ConceptStat>, count = 3): ConceptStat[] {
  return Object.values(stats)
    .filter((stat) => stat.attempts >= 2)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, count)
}
