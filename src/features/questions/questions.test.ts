import { describe, expect, it } from 'vitest'
import type { Difficulty, GeneratedQuestion, GeneratorSpec } from '@/lib/types'
import { chapters } from '@/data/curriculum/chapters'
import { tricks } from '@/data/tricks/tricks'
import { generatorFamilies, generateQuestion, generateSimilar, specKey } from './index'
import { mulberry32 } from './random'
import { displayAnswer, normalizeText, parseNumeric, validateAnswer } from './validation'

const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

const spec = (family: string, params: GeneratorSpec['params'] = {}): GeneratorSpec => ({
  family,
  params,
  concept: `test.${family}`,
  conceptLabel: `Test · ${family}`,
})

const kinds: Record<string, string[]> = {
  sequenceProblem: ['arithmetic', 'geometric', 'missing', 'differences', 'square', 'recognition'],
  probabilityProblem: ['basic', 'fractions', 'dice', 'coins', 'cards', 'multiple', 'challenge'],
  geometryProblem: ['perimeter', 'rectArea', 'triangleArea', 'circumference', 'circleArea', 'volume', 'surface', 'boss'],
  numberProperty: ['factors', 'multiples', 'hcf', 'lcm', 'divisibility', 'remainders', 'challenge'],
  trigProblem: ['angles', 'sine', 'cosine', 'tangent', 'standard', 'rightTriangle', 'bearings', 'direction'],
  ratioProblem: ['understand', 'simplify', 'divide', 'direct', 'inverse', 'scale', 'mixtures'],
  unitaryProblem: ['pricePerUnit', 'quantityCost', 'consumption', 'production', 'fuel', 'timeWork', 'multiVar'],
  speedProblem: ['speed', 'distance', 'time', 'kmhMs', 'msKmh', 'knots', 'nautical', 'relative', 'average', 'journey', 'rearrange', 'minutesHours'],
  averageProblem: ['basic', 'missing', 'combined', 'weighted', 'speed'],
  algebraProblem: ['oneStep', 'twoStep', 'brackets', 'unknown', 'word', 'rearrange'],
  workProblem: ['fuelConsumption', 'ratePerHour', 'distanceConsumption', 'remainingFuel', 'timeWork', 'combinedWork'],
  pilotProblem: ['groundSpeed', 'distanceTime', 'fuelRemaining', 'fuelBurn', 'timeToDest', 'conversions', 'altitude', 'ratios', 'averageSpeed', 'planning'],
  aptitudeProblem: ['basic', 'mental', 'speed', 'ratio', 'percent', 'units', 'multiStep', 'mixedTimed'],
}

const templateSpecs: GeneratorSpec[] = [
  ...['add', 'subtract', 'multiply', 'divide'].map((op) => spec('arithmetic', { op })),
  spec('tables'), spec('decomposition'), spec('twoDigit'),
  ...[5, 25, 50, 9, 99, 11, 'near100', 'doubleHalf'].map((multiplier) => spec('mulShortcut', { multiplier })),
  ...[5, 10, 15, 20, 25, 30, 40, 60, 75].map((percent) => spec('percentageFind', { percent })),
  ...['increase', 'decrease'].map((direction) => spec('percentageChange', { direction })),
  ...['fundamental', 'simplify', 'add', 'subtract', 'multiply', 'divide', 'toDecimal', 'percent'].map((op) => spec('fractionOp', { op })),
  ...['add', 'subtract', 'multiply', 'divide'].map((op) => spec('decimalCalc', { op })),
  ...Object.entries(kinds).flatMap(([family, familyKinds]) => familyKinds.map((kind) => spec(family, { kind }))),
  ...['multiplication', 'percentage', 'conversion'].map((topic) => spec('shortcutIdentify', { topic })),
  ...['mul5', 'mul9', 'pct15', 'pct25', 'kmhMs'].map((underlying) => spec('findError', { underlying })),
  spec('estimation'),
  ...chapters.flatMap((chapter) => chapter.levels.flatMap((level) => level.specs)),
  ...tricks.map((trick) => trick.spec),
]

function expectValidQuestion(question: GeneratedQuestion): void {
  expect(question.id.length).toBeGreaterThan(0)
  expect(question.specKey.length).toBeGreaterThan(0)
  expect(question.prompt.trim().length).toBeGreaterThan(4)
  expect(['numeric', 'mcq', 'boolean', 'matching', 'order', 'shortcut']).toContain(question.type)
  expect(question.answer.trim().length).toBeGreaterThan(0)
  expect(question.concept.trim().length).toBeGreaterThan(0)
  expect(question.conceptLabel.trim().length).toBeGreaterThan(0)
  expect(question.subtopic.trim().length).toBeGreaterThan(0)
  expect(question.explanation.trim().length).toBeGreaterThan(10)
  expect(question.steps.length, `${question.specKey} · ${question.prompt}`).toBeGreaterThanOrEqual(2)
  expect(question.steps.every((step) => step.trim().length > 0)).toBe(true)
  expect(question.hints).toHaveLength(4)
  expect(question.hints.every((hint) => hint.trim().length > 4)).toBe(true)
  expect(question.shortcut.trim().length).toBeGreaterThan(2)
  expect(question.timeTargetSec).toBeGreaterThan(0)
  expect(question.difficulty).toMatch(/^(easy|medium|hard)$/)
  expect(question.variant).toBeGreaterThan(0)

  const text = [question.prompt, question.answer, ...question.steps, ...question.hints].join(' ')
  expect(text).not.toMatch(/NaN|undefined|\[object Object\]|Infinity/)

  if (question.type === 'numeric') {
    expect(Number.isFinite(question.numericAnswer)).toBe(true)
    expect(question.numericAnswer).not.toBeUndefined()
  }
  if (question.type === 'mcq' || question.type === 'shortcut') {
    expect(question.options).toBeDefined()
    expect(question.options!.length).toBeGreaterThanOrEqual(3)
    expect(question.options!.length).toBeLessThanOrEqual(4)
    expect(new Set(question.options!.map(normalizeText)).size).toBe(question.options!.length)
    expect(question.options!.some((option) => normalizeText(option) === normalizeText(question.answer))).toBe(true)
  }
  if (question.type === 'matching') {
    expect(question.pairs?.length).toBeGreaterThan(0)
  }
  if (question.type === 'order') {
    expect(question.orderItems?.length).toBeGreaterThan(1)
  }
}

describe('question engine', () => {
  it('registers every curriculum and shortcut family', () => {
    const usedFamilies = new Set(templateSpecs.map((item) => item.family))
    expect([...usedFamilies].every((family) => generatorFamilies.includes(family))).toBe(true)
  })

  it('generates structurally valid questions for every curriculum spec and difficulty', () => {
    let count = 0
    chapters.forEach((chapter) => {
      chapter.levels.forEach((level) => {
        level.specs.forEach((item) => {
          difficulties.forEach((difficulty) => {
            ;[1, 5, 9].forEach((variant) => {
              const question = generateQuestion(item, {
                rng: mulberry32(count * 7919 + 17),
                difficulty,
                variant,
                levelId: level.id,
                chapterId: chapter.id,
              })
              expectValidQuestion(question)
              count += 1
            })
          })
        })
      })
    })
    expect(count).toBeGreaterThan(500)
  })

  it('generates structurally valid questions for every template and shortcut kind', () => {
    templateSpecs.forEach((item, index) => {
      difficulties.forEach((difficulty) => {
        const question = generateQuestion(item, {
          rng: mulberry32(index * 104729 + 31),
          difficulty,
          variant: 7,
        })
        expectValidQuestion(question)
      })
    })
  })

  it('accepts its own answer and rejects an invalid answer', () => {
    templateSpecs.slice(0, 120).forEach((item, index) => {
      const question = generateQuestion(item, { rng: mulberry32(index * 31337 + 3), difficulty: 'medium', variant: 3 })
      expect(validateAnswer(question, question.answer)).toBe(true)
      if (question.type === 'numeric') {
        expect(validateAnswer(question, 'not-a-number')).toBe(false)
        expect(validateAnswer(question, String((question.numericAnswer ?? 0) + 100))).toBe(false)
      } else {
        expect(validateAnswer(question, 'zzz-definitely-wrong-zzz')).toBe(false)
      }
      expect(displayAnswer(question).trim().length).toBeGreaterThan(0)
    })
  })

  it('normalises answer text, units and simple fractions', () => {
    expect(normalizeText('  1, 234 kg  ')).toBe('1234')
    expect(parseNumeric('1,250')).toBe(1250)
    expect(parseNumeric('3/4')).toBe(0.75)
    expect(parseNumeric('nope')).toBeNull()
  })

  it('is deterministic for a fixed seed', () => {
    templateSpecs.slice(0, 80).forEach((item, index) => {
      const options = { rng: mulberry32(index + 500), difficulty: 'medium' as Difficulty, variant: 4 }
      const first = generateQuestion(item, options)
      const second = generateQuestion(item, { ...options, rng: mulberry32(index + 500) })
      expect(second.prompt).toBe(first.prompt)
      expect(second.answer).toBe(first.answer)
      expect(second.options).toEqual(first.options)
      expect(second.steps).toEqual(first.steps)
    })
  })

  it('creates a varied similar question for retries', () => {
    let different = 0
    const samples = 40
    for (let i = 0; i < samples; i += 1) {
      const item = templateSpecs[i % templateSpecs.length]
      const original = generateQuestion(item, { rng: mulberry32(i * 97 + 11), difficulty: 'medium', variant: 2 })
      const similar = generateSimilar(original, item, { rng: mulberry32(i * 131 + 29), difficulty: 'medium' })
      expectValidQuestion(similar)
      expect(similar.concept).toBe(original.concept)
      if (similar.prompt !== original.prompt || similar.answer !== original.answer) different += 1
    }
    expect(different).toBeGreaterThanOrEqual(samples - 1)
  })

  it('keeps question ids and spec keys stable for identical generated content', () => {
    const item = spec('arithmetic', { op: 'add' })
    const first = generateQuestion(item, { rng: mulberry32(42), variant: 3 })
    expect(specKey(item)).toBe('arithmetic:{"op":"add"}')
    expect(first.specKey).toBe(specKey(item))
  })
})
