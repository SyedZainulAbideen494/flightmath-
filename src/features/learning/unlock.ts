import { levels } from '@/data/curriculum/chapters'
import type { LevelStat } from '@/lib/types'

const done = new Set(['completed', 'perfected', 'mastered'])

export function isLevelUnlocked(levelId: string, levelStats: Record<string, LevelStat>): boolean {
  const index = levels.findIndex((level) => level.id === levelId)
  if (index <= 0) return true
  const previous = levels[index - 1]
  return done.has(levelStats[previous.id]?.status ?? 'available')
}

export function highestUnlockedIndex(levelStats: Record<string, LevelStat>): number {
  let highest = 0
  for (let i = 0; i < levels.length; i += 1) {
    if (isLevelUnlocked(levels[i].id, levelStats)) highest = i
  }
  return highest
}

export function unlockedLevels(levelStats: Record<string, LevelStat>) {
  return levels.filter((level) => isLevelUnlocked(level.id, levelStats))
}

export function recommendedLevel(levelStats: Record<string, LevelStat>): string {
  const next = levels.find((level) => !done.has(levelStats[level.id]?.status ?? 'available') && isLevelUnlocked(level.id, levelStats))
  return next?.id ?? levels[0].id
}

export function chapterProgress(chapterId: string, levelStats: Record<string, LevelStat>): number {
  const chapterLevels = levels.filter((level) => level.chapterId === chapterId)
  const completed = chapterLevels.filter((level) => done.has(levelStats[level.id]?.status ?? 'available')).length
  return chapterLevels.length ? (completed / chapterLevels.length) * 100 : 0
}
