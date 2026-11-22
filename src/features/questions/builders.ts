import type { Difficulty, GeneratedQuestion, QuestionType } from '@/lib/types'
import { fmt, hashString, pick, shuffle } from './random'
import type { RNG } from './random'

export interface QuestionSeed {
  specKey: string
  variant: number
  rng: RNG
  prompt: string
  type: QuestionType
  answer: string
  numericAnswer?: number
  tolerance?: number
  options?: (string | number)[]
  distractors?: (string | number)[]
  pairs?: { left: string; right: string }[]
  orderItems?: string[]
  answerUnit?: string
  concept: string
  conceptLabel: string
  subtopic: string
  difficulty: Difficulty
  explanation: string
  steps: string[]
  hints: [string, string, string, string]
  shortcut: string
  timeTargetSec?: number
  levelId?: string
  chapterId?: string
}

const timeFor = (difficulty: Difficulty) =>
  difficulty === 'easy' ? 12 : difficulty === 'medium' ? 20 : 30

function dedupeOptions(values: (string | number)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const text = typeof value === 'number' ? fmt(value) : value
    const key = text.toLowerCase().replace(/[\s,]/g, '')
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out
}

function fillerDistractors(correct: number, rng: RNG): number[] {
  const offsets = [1, 2, 3, 5, 10, 11, 20, 25, 100]
  return shuffle(rng, offsets)
    .map((offset) => (rng() > 0.5 ? correct + offset : Math.max(0, correct - offset)))
    .filter((value) => value !== correct)
}

export function buildQuestion(seed: QuestionSeed): GeneratedQuestion {
  const target = seed.timeTargetSec ?? timeFor(seed.difficulty)
  let options: string[] | undefined
  let answer = seed.answer

  if (seed.type === 'mcq' || seed.type === 'shortcut') {
    const correct = typeof seed.answer === 'number' ? fmt(seed.answer) : seed.answer
    const raw = dedupeOptions([correct, ...(seed.distractors ?? [])])
    const numericCorrect = Number(correct)
    if (raw.length < 4 && Number.isFinite(numericCorrect)) {
      raw.push(...dedupeOptions(fillerDistractors(numericCorrect, seed.rng)))
    }
    while (raw.length < 3) raw.push(pick(seed.rng, ['None of these', 'Cannot determine', 'Try again']))
    options = shuffle(seed.rng, raw).slice(0, 4)
    if (!options.includes(correct)) options[0] = correct
    // Keep the correct answer unique even after a forced replacement.
    options = dedupeOptions(options)
    if (!options.includes(correct)) options.unshift(correct)
    answer = correct
  }

  if (seed.type === 'matching') {
    answer = JSON.stringify(seed.pairs?.map((pair) => pair.right) ?? [])
  }

  if (seed.type === 'order') {
    answer = (seed.orderItems ?? []).join('|')
  }

  const prompt = seed.prompt
  const id = `q-${seed.specKey}-${seed.variant}-${hashString(prompt + answer).toString(36)}`

  return {
    id,
    specKey: seed.specKey,
    variant: seed.variant,
    prompt,
    type: seed.type,
    answer,
    numericAnswer: seed.numericAnswer,
    tolerance: seed.tolerance,
    options,
    pairs: seed.pairs,
    orderItems: seed.orderItems,
    answerUnit: seed.answerUnit,
    chapterId: seed.chapterId,
    levelId: seed.levelId,
    concept: seed.concept,
    conceptLabel: seed.conceptLabel,
    subtopic: seed.subtopic,
    difficulty: seed.difficulty,
    explanation: seed.explanation,
    steps: seed.steps,
    hints: seed.hints,
    shortcut: seed.shortcut,
    timeTargetSec: target,
    generatedAt: 0,
  }
}

/** Build progressive hints from a compact definition. The walkthrough is already a full sentence. */
export function makeHints(
  nudge: string,
  strategy: string,
  shortcut: string,
  walkthrough: string,
): [string, string, string, string] {
  return [nudge, strategy, shortcut, walkthrough]
}
