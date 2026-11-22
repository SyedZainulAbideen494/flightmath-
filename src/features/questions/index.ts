import type { Difficulty, GeneratedQuestion, GeneratorSpec, QuestionOptions } from '@/lib/types'
import { hashString, mulberry32, pick } from './random'
import type { RNG } from './random'
import { generateCore } from './generators/core'
import { generateFractions } from './generators/fractions'
import { generateApplied } from './generators/applied'
import { generateAdvanced } from './generators/advanced'
import { generateAviation } from './generators/aviation'

export interface GenContext {
  rng: RNG
  spec: GeneratorSpec
  difficulty: Difficulty
  variant: number
  levelId?: string
  chapterId?: string
}

export type GeneratorFn = (ctx: GenContext) => GeneratedQuestion

export const specKey = (spec: GeneratorSpec): string =>
  `${spec.family}:${JSON.stringify(spec.params ?? {})}`

const generators: Record<string, GeneratorFn> = {
  arithmetic: (ctx) => generateCore(ctx, 'arithmetic'),
  tables: (ctx) => generateCore(ctx, 'tables'),
  decomposition: (ctx) => generateCore(ctx, 'decomposition'),
  twoDigit: (ctx) => generateCore(ctx, 'twoDigit'),
  mulShortcut: (ctx) => generateCore(ctx, 'mulShortcut'),
  percentageFind: (ctx) => generateCore(ctx, 'percentageFind'),
  percentageChange: (ctx) => generateCore(ctx, 'percentageChange'),
  fractionOp: (ctx) => generateFractions(ctx, 'fractionOp'),
  decimalCalc: (ctx) => generateFractions(ctx, 'decimalCalc'),
  ratioProblem: (ctx) => generateApplied(ctx, 'ratioProblem'),
  unitaryProblem: (ctx) => generateApplied(ctx, 'unitaryProblem'),
  speedProblem: (ctx) => generateApplied(ctx, 'speedProblem'),
  averageProblem: (ctx) => generateApplied(ctx, 'averageProblem'),
  algebraProblem: (ctx) => generateApplied(ctx, 'algebraProblem'),
  workProblem: (ctx) => generateApplied(ctx, 'workProblem'),
  sequenceProblem: (ctx) => generateAdvanced(ctx, 'sequenceProblem'),
  probabilityProblem: (ctx) => generateAdvanced(ctx, 'probabilityProblem'),
  geometryProblem: (ctx) => generateAdvanced(ctx, 'geometryProblem'),
  numberProperty: (ctx) => generateAdvanced(ctx, 'numberProperty'),
  trigProblem: (ctx) => generateAdvanced(ctx, 'trigProblem'),
  pilotProblem: (ctx) => generateAviation(ctx, 'pilotProblem'),
  aptitudeProblem: (ctx) => generateAviation(ctx, 'aptitudeProblem'),
  shortcutIdentify: (ctx) => generateAviation(ctx, 'shortcutIdentify'),
  findError: (ctx) => generateAviation(ctx, 'findError'),
  estimation: (ctx) => generateAviation(ctx, 'estimation'),
}

export const generatorFamilies = Object.keys(generators)

export function generateQuestion(spec: GeneratorSpec, options: QuestionOptions = {}): GeneratedQuestion {
  const variant = options.variant ?? 1
  const seed = options.rng
    ? undefined
    : hashString(`${specKey(spec)}|${variant}|${options.difficulty ?? 'medium'}`)
  const rng = options.rng ?? mulberry32(seed!)
  const difficulty: Difficulty = options.difficulty ?? 'medium'
  const ctx: GenContext = {
    rng,
    spec,
    difficulty,
    variant,
    levelId: options.levelId,
    chapterId: options.chapterId,
  }
  const generator = generators[spec.family] ?? generators.arithmetic
  const question = generator(ctx)
  return {
    ...question,
    concept: options.concept ?? spec.concept ?? question.concept,
    conceptLabel: options.conceptLabel ?? spec.conceptLabel ?? question.conceptLabel,
    subtopic: options.subtopic ?? question.subtopic,
    levelId: options.levelId ?? question.levelId,
    chapterId: options.chapterId ?? question.chapterId,
    generatedAt: Date.now(),
  }
}

/** Generate a fresh variation of the same concept with different values. */
export function generateSimilar(question: GeneratedQuestion, spec: GeneratorSpec, options: QuestionOptions = {}): GeneratedQuestion {
  const baseVariant = question.variant + 1 + (hashString(question.id) % 97)
  let candidate = generateQuestion(spec, {
    ...options,
    variant: baseVariant,
    difficulty: options.difficulty ?? question.difficulty,
    concept: question.concept,
    conceptLabel: question.conceptLabel,
    subtopic: question.subtopic,
    levelId: question.levelId,
    chapterId: question.chapterId,
  })
  // A retry should present fresh numbers, not the exact same prompt again.
  for (let attempt = 1; attempt <= 6 && candidate.prompt === question.prompt; attempt += 1) {
    candidate = generateQuestion(spec, {
      ...options,
      variant: baseVariant + attempt,
      difficulty: options.difficulty ?? question.difficulty,
      concept: question.concept,
      conceptLabel: question.conceptLabel,
      subtopic: question.subtopic,
      levelId: question.levelId,
      chapterId: question.chapterId,
    })
  }
  return candidate
}

/** Pick one of a level's specs without repeating the exact previous spec. */
export function pickSpec(specs: GeneratorSpec[], rng: RNG, previous?: GeneratorSpec): GeneratorSpec {
  const candidates = specs.length > 1 && previous ? specs.filter((s) => specKey(s) !== specKey(previous)) : specs
  return pick(rng, candidates.length ? candidates : specs)
}
