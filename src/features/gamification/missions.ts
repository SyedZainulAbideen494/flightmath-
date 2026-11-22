import type { AppData, MissionItem, MissionState } from '@/lib/types'
import { hashString } from '../questions/random'
import { todayKey } from '@/lib/defaults'

interface MissionDefinition {
  id: string
  title: string
  target: number
  xp: number
  link: string
}

const pool: MissionDefinition[] = [
  { id: 'lesson', title: 'Complete one lesson', target: 1, xp: 25, link: '/learn' },
  { id: 'correct', title: 'Get 15 correct answers', target: 15, xp: 30, link: '/practice' },
  { id: 'weakness', title: 'Practise your weakest topic', target: 5, xp: 30, link: '/practice?mode=weakness' },
  { id: 'shortcut', title: 'Use a shortcut successfully', target: 3, xp: 20, link: '/tricks' },
  { id: 'timed', title: 'Complete a timed challenge', target: 1, xp: 25, link: '/practice?mode=sprint' },
  { id: 'review', title: 'Review mistakes', target: 3, xp: 25, link: '/mistakes' },
]

export function missionsForDate(date = todayKey()): MissionState {
  const seed = hashString(`flightmath-missions-${date}`)
  const first = seed % pool.length
  const second = (first + 1 + (Math.floor(seed / 7) % (pool.length - 1))) % pool.length
  const third = (second + 1 + (Math.floor(seed / 31) % (pool.length - 2))) % pool.length
  const ids = new Set([first, second, third])
  return {
    date,
    items: Array.from(ids).map((index) => ({
      ...pool[index],
      progress: 0,
      done: false,
    })),
  }
}

function todayAttempts(data: AppData) {
  const key = todayKey()
  return data.attempts.filter((attempt) => todayKey(new Date(attempt.at)) === key)
}

function todaySessions(data: AppData) {
  const key = todayKey()
  return data.sessions.filter((session) => todayKey(new Date(session.endedAt)) === key)
}

export function computeMissionProgress(data: AppData): MissionItem[] {
  const attempts = todayAttempts(data)
  const sessions = todaySessions(data)
  const correct = attempts.filter((a) => a.correct)
  const lessonCount = sessions.filter((s) => s.mode === 'lesson').length
  const timed = sessions.filter((s) => ['sprint', 'lightning', 'exam', 'boss', 'survival'].includes(s.mode)).length
  const reviewed = attempts.filter((a) => a.retryFor).length
  const shortcut = attempts.filter((a) => a.correct && a.concept.includes('shortcut')).length
  const weakest = Object.entries(
    attempts.reduce<Record<string, number>>((acc, a) => {
      acc[a.concept] = (acc[a.concept] ?? 0) + (a.correct ? 1 : -1)
      return acc
    }, {}),
  ).sort((a, b) => a[1] - b[1])[0]?.[0]
  const weaknessCorrect = weakest ? correct.filter((a) => a.concept === weakest).length : 0

  return data.missions.items.map((item) => {
    let progress = item.progress
    if (item.id === 'lesson') progress = lessonCount
    if (item.id === 'correct') progress = correct.length
    if (item.id === 'weakness') progress = weaknessCorrect
    if (item.id === 'shortcut') progress = shortcut
    if (item.id === 'timed') progress = timed
    if (item.id === 'review') progress = reviewed
    return { ...item, progress: Math.min(item.target, progress), done: progress >= item.target }
  })
}

export function ensureMissions(data: AppData): AppData {
  const key = todayKey()
  if (data.missions.date === key && data.missions.items.length) return data
  return { ...data, missions: missionsForDate(key) }
}
