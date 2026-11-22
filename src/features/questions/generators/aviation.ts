import type { GeneratedQuestion, GeneratorSpec, QuestionOptions } from '@/lib/types'
import type { GenContext } from '../index'
import { buildQuestion, makeHints } from '../builders'
import type { QuestionSeed } from '../builders'
import { cleanNumber, fmt, gcd, hashString, int, mulberry32, pick, round } from '../random'

/** Public names for the generator contract; the repo calls these GeneratorSpec / QuestionOptions. */
export type QuestionSpec = GeneratorSpec
export type GenerateOptions = QuestionOptions & { seed?: number }

type AviationContext = GenContext & {
  conceptOverride?: string
  conceptLabelOverride?: string
  subtopicOverride?: string
}

const specKeyOf = (spec: GeneratorSpec): string => `${spec.family}:${JSON.stringify(spec.params ?? {})}`

/**
 * Generators can be called by the registry with a GenContext or directly with
 * a spec and options. Both paths use the same deterministic RNG rules.
 */
function contextFrom(input: QuestionSpec | GenContext, options: GenerateOptions): AviationContext {
  if (typeof (input as GenContext).rng === 'function') return input as GenContext
  const spec = input as QuestionSpec
  const variant = options.variant ?? 1
  const difficulty = options.difficulty ?? 'medium'
  const seed = options.seed ?? hashString(`${specKeyOf(spec)}|${variant}|${difficulty}`)
  return {
    rng: options.rng ?? mulberry32(seed),
    spec,
    difficulty,
    variant,
    levelId: options.levelId,
    chapterId: options.chapterId,
    conceptOverride: options.concept,
    conceptLabelOverride: options.conceptLabel,
    subtopicOverride: options.subtopic,
  }
}

type Rng = GenContext['rng']

type QuestionFields = Pick<
  QuestionSeed,
  | 'prompt'
  | 'type'
  | 'answer'
  | 'numericAnswer'
  | 'tolerance'
  | 'distractors'
  | 'answerUnit'
  | 'explanation'
  | 'steps'
  | 'hints'
  | 'shortcut'
  | 'timeTargetSec'
>

/** Shared ctx-derived fields keep every question attributed to its curriculum slot. */
function makeQuestion(ctx: AviationContext, family: string, kind: string, fields: QuestionFields): GeneratedQuestion {
  return buildQuestion({
    specKey: specKeyOf(ctx.spec),
    variant: ctx.variant,
    rng: ctx.rng,
    concept: ctx.conceptOverride ?? ctx.spec.concept ?? `${family}-${kind}`,
    conceptLabel: ctx.conceptLabelOverride ?? ctx.spec.conceptLabel ?? '',
    subtopic: ctx.subtopicOverride ?? kind,
    difficulty: ctx.difficulty,
    levelId: ctx.levelId,
    chapterId: ctx.chapterId,
    ...fields,
  })
}

/** Concise prefix that labels cockpit questions as practice-only material. */
const labelled = (text: string): string => `FlightMath practice — ${text}`
const practiceNote = ' FlightMath practice material.'

/** Rounded numeric answer with the tolerance convention for its decimal places. */
function numericResult(value: number, places: number): { answer: string; numericAnswer: number; tolerance: number } {
  const answer = cleanNumber(round(value, places))
  return { answer: String(answer), numericAnswer: answer, tolerance: places === 1 ? 0.06 : 0.011 }
}

function paramString(ctx: GenContext, key: string, fallback: string): string {
  const value = ctx.spec.params?.[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

/** Three unique, plausible wrong options that never match the correct estimate. */
function uniqueDistractors(correct: number, candidates: number[], rng: Rng): number[] {
  const seen = new Set<number>([correct])
  const out: number[] = []
  for (const candidate of candidates) {
    if (out.length === 3) break
    if (Number.isFinite(candidate) && candidate >= 0 && !seen.has(candidate)) {
      seen.add(candidate)
      out.push(candidate)
    }
  }
  let step = 1
  while (out.length < 3) {
    const candidate = correct + (rng() > 0.5 ? step : -step)
    if (candidate >= 0 && !seen.has(candidate)) {
      seen.add(candidate)
      out.push(candidate)
    }
    step += 1
  }
  return out
}

const pilotKinds = [
  'groundSpeed', 'distanceTime', 'fuelRemaining', 'fuelBurn', 'timeToDest',
  'conversions', 'altitude', 'ratios', 'averageSpeed', 'planning',
]
const aptitudeKinds = ['basic', 'mental', 'speed', 'ratio', 'percent', 'units', 'multiStep', 'mixedTimed']

function generatePilotA(ctx: GenContext, kind: string): GeneratedQuestion | null {
  const rng = ctx.rng
  const easy = ctx.difficulty === 'easy'
  const hard = ctx.difficulty === 'hard'

  if (kind === 'groundSpeed') {
    const airspeed = int(rng, easy ? 120 : hard ? 130 : 125, hard ? 185 : 180)
    const wind = int(rng, easy ? 8 : hard ? 15 : 10, hard ? 30 : 25)
    const tailwind = rng() > 0.5
    const gs = tailwind ? airspeed + wind : airspeed - wind
    const a = numericResult(gs, 0)
    const word = tailwind ? 'tailwind' : 'headwind'
    return makeQuestion(ctx, 'pilotProblem', kind, {
      prompt: labelled(`A light aircraft cruises at ${airspeed} kt airspeed with a ${wind} kt ${word}. What is its groundspeed?`),
      type: 'numeric',
      answer: a.answer,
      numericAnswer: a.numericAnswer,
      tolerance: a.tolerance,
      answerUnit: 'kt',
      explanation: `Groundspeed adjusts airspeed for the wind: ${tailwind ? 'add' : 'subtract'} ${wind} kt gives ${fmt(gs)} kt.${practiceNote}`,
      steps: [
        `Airspeed = ${airspeed} kt`,
        `${tailwind ? 'Tailwind adds' : 'Headwind subtracts'} ${wind} kt`,
        `Groundspeed = ${fmt(gs)} kt`,
      ],
      hints: makeHints(
        'Wind changes speed over the ground, not speed through the air.',
        'Decide first whether the wind helps or opposes the aircraft.',
        'Tailwind: airspeed + wind. Headwind: airspeed − wind.',
        `${airspeed} ${tailwind ? '+' : '−'} ${wind} = ${fmt(gs)} kt groundspeed.`,
      ),
      shortcut: 'Tailwind adds to airspeed; headwind subtracts.',
    })
  }

  if (kind === 'distanceTime') {
    const gs = pick(rng, [90, 100, 110, 120, 140, 150, 160, 180, 200])
    if (rng() > 0.5) {
      const hours = pick(rng, easy ? [0.5, 1, 1.5, 2] : hard ? [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] : [0.75, 1, 1.25, 1.5, 2])
      const distance = cleanNumber(round(gs * hours, 2))
      const minutes = cleanNumber(hours * 60)
      const a = numericResult(minutes, 0)
      return makeQuestion(ctx, 'pilotProblem', kind, {
        prompt: labelled(`A leg of ${fmt(distance)} nm is flown at ${gs} kt groundspeed. How many minutes does it take?`),
        type: 'numeric',
        answer: a.answer,
        numericAnswer: a.numericAnswer,
        tolerance: a.tolerance,
        answerUnit: 'min',
        explanation: `Time = distance ÷ speed = ${fmt(distance)} ÷ ${gs} = ${fmt(hours)} h = ${fmt(minutes)} min.${practiceNote}`,
        steps: [
          `Distance = ${fmt(distance)} nm, speed = ${gs} kt`,
          `Time = ${fmt(distance)} ÷ ${gs} = ${fmt(hours)} h`,
          `Convert hours to minutes: ${fmt(minutes)} min`,
        ],
        hints: makeHints(
          'Knots are nautical miles per hour, so time comes out in hours first.',
          'Use time = distance ÷ speed, then multiply by 60.',
          'With distance = speed × hours, the hours are already clean.',
          `${fmt(distance)} ÷ ${gs} = ${fmt(hours)} h, and ${fmt(hours)} × 60 = ${fmt(minutes)} min.`,
        ),
        shortcut: 'Minutes = distance ÷ groundspeed × 60.',
      })
    }
    const minutes = pick(rng, easy ? [30, 60, 90, 120] : hard ? [30, 45, 60, 75, 90, 120] : [45, 60, 90, 120])
    const distance = cleanNumber(round(gs * minutes / 60, 2))
    const a = numericResult(distance, 2)
    return makeQuestion(ctx, 'pilotProblem', kind, {
      prompt: labelled(`At ${gs} kt groundspeed, how far does an aircraft travel in ${minutes} minutes? Round to 2 decimals.`),
      type: 'numeric',
      answer: a.answer,
      numericAnswer: a.numericAnswer,
      tolerance: a.tolerance,
      answerUnit: 'nm',
      explanation: `Distance = speed × time = ${gs} × ${fmt(minutes / 60)} h = ${fmt(distance)} nm.${practiceNote}`,
      steps: [
        `Speed = ${gs} kt, time = ${minutes} min`,
        `Time in hours = ${fmt(minutes / 60)} h`,
        `Distance = ${gs} × ${fmt(minutes / 60)} = ${fmt(distance)} nm`,
      ],
      hints: makeHints(
        'Speeds in kt need time expressed in hours.',
        'Convert minutes to hours by dividing by 60.',
        'Distance = speed × time.',
        `${minutes} ÷ 60 = ${fmt(minutes / 60)} h; ${gs} × ${fmt(minutes / 60)} = ${fmt(distance)} nm.`,
      ),
      shortcut: 'Convert minutes to hours, then multiply by groundspeed.',
    })
  }

  if (kind === 'fuelRemaining') {
    const burn = int(rng, 20, 90)
    const hours = pick(rng, easy ? [0.5, 1, 1.5, 2] : hard ? [1, 1.5, 2, 2.5, 3] : [0.75, 1, 1.25, 1.5, 2, 2.5])
    const used = cleanNumber(round(burn * hours, 2))
    const start = Math.ceil(used) + int(rng, 20, 120)
    const remaining = cleanNumber(round(start - burn * hours, 1))
    const unit = pick(rng, ['kg', 'L'])
    if (rng() > 0.72) {
      const reserve = int(rng, 15, 35)
      const enough = remaining >= reserve
      return makeQuestion(ctx, 'pilotProblem', kind, {
        prompt: labelled(`Start with ${start} ${unit}, burn ${burn} ${unit}/h for ${fmt(hours)} h, and keep a ${reserve} ${unit} reserve. Will at least the reserve remain?`),
        type: 'boolean',
        answer: enough ? 'True' : 'False',
        explanation: `Burned ${fmt(used)} ${unit}, leaving ${fmt(remaining)} ${unit}. That ${enough ? 'meets' : 'falls short of'} the ${reserve} ${unit} reserve.${practiceNote}`,
        steps: [
          `Start = ${start} ${unit}`,
          `Burned = ${burn} × ${fmt(hours)} = ${fmt(used)} ${unit}`,
          `Remaining = ${fmt(remaining)} ${unit}; compare with ${reserve} ${unit}`,
        ],
        hints: makeHints(
          'Fuel used is burn rate multiplied by time.',
          'Subtract the burned fuel from the start, then compare with the reserve.',
          'Remaining = start − burn × hours.',
          `${start} − ${fmt(used)} = ${fmt(remaining)} ${unit}, which is ${enough ? 'at least' : 'less than'} ${reserve} ${unit}.`,
        ),
        shortcut: 'Start − burn × time = remaining; then compare with reserve.',
      })
    }
    const a = numericResult(remaining, 1)
    return makeQuestion(ctx, 'pilotProblem', kind, {
      prompt: labelled(`Starting with ${start} ${unit} and burning ${burn} ${unit}/h for ${fmt(hours)} h, how much ${unit} remains? Round to 1 decimal.`),
      type: 'numeric',
      answer: a.answer,
      numericAnswer: a.numericAnswer,
      tolerance: a.tolerance,
      answerUnit: unit,
      explanation: `Fuel used = ${burn} × ${fmt(hours)} = ${fmt(used)} ${unit}; remaining = ${start} − ${fmt(used)} = ${fmt(remaining)} ${unit}.${practiceNote}`,
      steps: [
        `Start = ${start} ${unit}`,
        `Burned = ${burn} × ${fmt(hours)} = ${fmt(used)} ${unit}`,
        `Remaining = ${fmt(remaining)} ${unit}`,
      ],
      hints: makeHints(
        'Work out how much fuel the leg consumes first.',
        'Multiply burn rate by hours, then subtract from the start.',
        'Remaining = start − burn × hours.',
        `${burn} × ${fmt(hours)} = ${fmt(used)}; ${start} − ${fmt(used)} = ${fmt(remaining)} ${unit}.`,
      ),
      shortcut: 'Subtract total burn from starting fuel.',
    })
  }

  if (kind === 'fuelBurn') {
    if (rng() > 0.5) {
      const burn = int(rng, 20, 90)
      const hours = pick(rng, [1, 1.5, 2, 2.5])
      const used = cleanNumber(round(burn * hours, 2))
      const unit = pick(rng, ['kg', 'L'])
      const a = numericResult(burn, 2)
      return makeQuestion(ctx, 'pilotProblem', kind, {
        prompt: labelled(`An aircraft uses ${fmt(used)} ${unit} over ${fmt(hours)} h. What is its burn rate in ${unit}/h? Round to 2 decimals.`),
        type: 'numeric',
        answer: a.answer,
        numericAnswer: a.numericAnswer,
        tolerance: a.tolerance,
        answerUnit: `${unit}/h`,
        explanation: `Burn rate = fuel used ÷ hours = ${used} ÷ ${fmt(hours)} = ${fmt(a.numericAnswer)} ${unit}/h.${practiceNote}`,
        steps: [
          `Fuel used = ${used} ${unit}`,
          `Time = ${fmt(hours)} h`,
          `Rate = ${used} ÷ ${fmt(hours)} = ${fmt(a.numericAnswer)} ${unit}/h`,
        ],
        hints: makeHints(
          'A burn rate is fuel per hour.',
          'Divide total fuel by the number of hours.',
          'Rate = used ÷ time.',
          `${used} ÷ ${fmt(hours)} = ${fmt(a.numericAnswer)} ${unit}/h.`,
        ),
        shortcut: 'Fuel used ÷ hours = burn rate.',
      })
    }
    const burn = int(rng, 20, 90)
    const gs = pick(rng, [100, 120, 140, 150, 160, 180, 200])
    const hours = pick(rng, [0.5, 0.75, 1, 1.25, 1.5, 2])
    const distance = cleanNumber(round(gs * hours, 2))
    const needed = cleanNumber(round(burn * hours, 2))
    const unit = pick(rng, ['kg', 'L'])
    const a = numericResult(needed, 2)
    return makeQuestion(ctx, 'pilotProblem', kind, {
      prompt: labelled(`A ${fmt(distance)} nm leg at ${gs} kt burns ${burn} ${unit}/h. How much ${unit} is needed? Round to 2 decimals.`),
      type: 'numeric',
      answer: a.answer,
      numericAnswer: a.numericAnswer,
      tolerance: a.tolerance,
      answerUnit: unit,
      explanation: `Time = ${fmt(distance)} ÷ ${gs} = ${fmt(hours)} h; fuel = ${burn} × ${fmt(hours)} = ${fmt(needed)} ${unit}.${practiceNote}`,
      steps: [
        `Time = ${fmt(distance)} ÷ ${gs} = ${fmt(hours)} h`,
        `Burn rate = ${burn} ${unit}/h`,
        `Fuel needed = ${burn} × ${fmt(hours)} = ${fmt(needed)} ${unit}`,
      ],
      hints: makeHints(
        'Find the flight time from the leg distance and groundspeed.',
        'Then multiply that time by the hourly burn rate.',
        'Fuel = burn rate × (distance ÷ groundspeed).',
        `${fmt(distance)} ÷ ${gs} = ${fmt(hours)} h; ${burn} × ${fmt(hours)} = ${fmt(needed)} ${unit}.`,
      ),
      shortcut: 'Fuel needed = burn rate × flight time.',
    })
  }

  return null
}

function generatePilotB(ctx: GenContext, kind: string): GeneratedQuestion | null {
  const rng = ctx.rng
  const hard = ctx.difficulty === 'hard'

  if (kind === 'timeToDest') {
    const distance = int(rng, 40, hard ? 350 : 300)
    const gs = int(rng, 90, 200)
    const minutes = cleanNumber(round(distance / gs * 60, 1))
    const a = numericResult(minutes, 1)
    return makeQuestion(ctx, 'pilotProblem', kind, {
      prompt: labelled(`With ${distance} nm to destination at ${gs} kt groundspeed, how many minutes remain? Round to 1 decimal.`),
      type: 'numeric',
      answer: a.answer,
      numericAnswer: a.numericAnswer,
      tolerance: a.tolerance,
      answerUnit: 'min',
      explanation: `Time = ${distance} ÷ ${gs} = ${fmt(distance / gs)} h = ${fmt(minutes)} min.${practiceNote}`,
      steps: [
        `Distance = ${distance} nm, speed = ${gs} kt`,
        `Hours = ${distance} ÷ ${gs} = ${fmt(distance / gs)} h`,
        `Minutes = ${fmt(minutes)} min`,
      ],
      hints: makeHints(
        'Time to go is remaining distance divided by groundspeed.',
        'Compute hours first, then convert to minutes.',
        'Minutes = distance ÷ groundspeed × 60.',
        `${distance} ÷ ${gs} × 60 = ${fmt(minutes)} min.`,
      ),
      shortcut: 'Divide distance by speed, then multiply by 60.',
    })
  }

  if (kind === 'conversions') {
    const variant = int(rng, 0, 3)
    if (variant === 0) {
      const nm = int(rng, 10, hard ? 240 : 200)
      const km = cleanNumber(round(nm * 1.852, 2))
      const a = numericResult(km, 2)
      return makeQuestion(ctx, 'pilotProblem', kind, {
        prompt: labelled(`Convert ${nm} nm to kilometres (1 nm = 1.852 km). Round to 2 decimals.`),
        type: 'numeric',
        answer: a.answer,
        numericAnswer: a.numericAnswer,
        tolerance: a.tolerance,
        answerUnit: 'km',
        explanation: `${nm} × 1.852 = ${fmt(km)} km.${practiceNote}`,
        steps: ['Use 1 nm = 1.852 km', `${nm} × 1.852`, `= ${fmt(km)} km`],
        hints: makeHints(
          'A nautical mile is longer than a land mile.',
          'Multiply the number of nautical miles by 1.852.',
          'nm × 1.852 = km.',
          `${nm} × 1.852 = ${fmt(km)} km.`,
        ),
        shortcut: 'Multiply nautical miles by 1.852 for kilometres.',
      })
    }
    if (variant === 1) {
      const feet = pick(rng, [1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000])
      const metres = cleanNumber(round(feet * 0.3048, 2))
      const a = numericResult(metres, 2)
      return makeQuestion(ctx, 'pilotProblem', kind, {
        prompt: labelled(`Convert ${feet} ft to metres (1 ft = 0.3048 m). Round to 2 decimals.`),
        type: 'numeric',
        answer: a.answer,
        numericAnswer: a.numericAnswer,
        tolerance: a.tolerance,
        answerUnit: 'm',
        explanation: `${feet} × 0.3048 = ${fmt(metres)} m.${practiceNote}`,
        steps: ['Use 1 ft = 0.3048 m', `${feet} × 0.3048`, `= ${fmt(metres)} m`],
        hints: makeHints(
          'A foot is a little under a third of a metre.',
          'Multiply feet by 0.3048.',
          'ft × 0.3048 = m.',
          `${feet} × 0.3048 = ${fmt(metres)} m.`,
        ),
        shortcut: 'Multiply feet by 0.3048 for metres.',
      })
    }
    if (variant === 2) {
      const nm = pick(rng, [40, 50, 100, 150, 200, 250])
      const km = cleanNumber(round(nm * 1.852, 2))
      const a = numericResult(nm, 0)
      return makeQuestion(ctx, 'pilotProblem', kind, {
        prompt: labelled(`Convert ${fmt(km)} km to nautical miles (1 nm = 1.852 km).`),
        type: 'numeric',
        answer: a.answer,
        numericAnswer: a.numericAnswer,
        tolerance: a.tolerance,
        answerUnit: 'nm',
        explanation: `${fmt(km)} ÷ 1.852 = ${fmt(nm)} nm.${practiceNote}`,
        steps: ['Use 1 nm = 1.852 km', `${fmt(km)} ÷ 1.852`, `= ${fmt(nm)} nm`],
        hints: makeHints(
          'Going from kilometres to nautical miles, the number gets smaller.',
          'Divide kilometres by 1.852.',
          'km ÷ 1.852 = nm.',
          `${fmt(km)} ÷ 1.852 = ${fmt(nm)} nm.`,
        ),
        shortcut: 'Divide kilometres by 1.852 for nautical miles.',
      })
    }
    return makeQuestion(ctx, 'pilotProblem', kind, {
      prompt: labelled('Which factor converts nautical miles to kilometres?'),
      type: 'mcq',
      answer: '1.852',
      distractors: ['1.609', '0.3048', '3.281'],
      explanation: `One nautical mile is exactly 1.852 km. 1.609 converts statute miles to km, 0.3048 converts feet to metres, and 3.281 converts metres to feet.${practiceNote}`,
      steps: [
        'Recall the definition of a nautical mile',
        '1 nm = 1.852 km',
        'The other factors convert different units',
      ],
      hints: makeHints(
        'A nautical mile is based on the Earth’s latitude grid.',
        'One nautical mile is 1852 metres.',
        'nm × 1.852 = km.',
        'The conversion factor from nautical miles to kilometres is 1.852.',
      ),
      shortcut: 'nm × 1.852 = km.',
    })
  }

  if (kind === 'altitude') {
    const rate = int(rng, 6, 24) * 50
    const minutes = int(rng, 2, hard ? 15 : 10)
    const variant = int(rng, 0, 2)
    if (variant === 0) {
      const gained = rate * minutes
      const a = numericResult(gained, 0)
      return makeQuestion(ctx, 'pilotProblem', kind, {
        prompt: labelled(`Climbing at ${rate} ft/min for ${minutes} minutes, how many feet of altitude are gained?`),
        type: 'numeric',
        answer: a.answer,
        numericAnswer: a.numericAnswer,
        tolerance: a.tolerance,
        answerUnit: 'ft',
        explanation: `Altitude gained = rate × time = ${rate} × ${minutes} = ${fmt(gained)} ft.${practiceNote}`,
        steps: [
          `Climb rate = ${rate} ft/min`,
          `Time = ${minutes} min`,
          `Gained = ${rate} × ${minutes} = ${fmt(gained)} ft`,
        ],
        hints: makeHints(
          'Climb rate is height gained each minute.',
          'Multiply the rate by the number of minutes.',
          'Feet = ft/min × minutes.',
          `${rate} × ${minutes} = ${fmt(gained)} ft.`,
        ),
        shortcut: 'Height gained = climb rate × minutes.',
      })
    }
    if (variant === 1) {
      const current = int(rng, 1000, 4000)
      const climbMinutes = int(rng, 2, hard ? 10 : 7)
      const target = current + rate * climbMinutes
      const a = numericResult(climbMinutes, 0)
      return makeQuestion(ctx, 'pilotProblem', kind, {
        prompt: labelled(`Climbing from ${current} ft to ${target} ft at ${rate} ft/min, how many minutes does it take?`),
        type: 'numeric',
        answer: a.answer,
        numericAnswer: a.numericAnswer,
        tolerance: a.tolerance,
        answerUnit: 'min',
        explanation: `Height to climb = ${target} − ${current} = ${rate * climbMinutes} ft; time = ${rate * climbMinutes} ÷ ${rate} = ${climbMinutes} min.${practiceNote}`,
        steps: [
          `Difference = ${target} − ${current} = ${rate * climbMinutes} ft`,
          `Climb rate = ${rate} ft/min`,
          `Time = ${rate * climbMinutes} ÷ ${rate} = ${climbMinutes} min`,
        ],
        hints: makeHints(
          'Find how many feet must be gained.',
          'Divide the height difference by the climb rate.',
          'Minutes = (target − current) ÷ ft/min.',
          `(${target} − ${current}) ÷ ${rate} = ${climbMinutes} min.`,
        ),
        shortcut: 'Time = altitude difference ÷ climb rate.',
      })
    }
    const current = int(rng, 1000, 4000)
    const target = current + rate * int(rng, 2, 8)
    const reaches = rate * minutes >= target - current
    return makeQuestion(ctx, 'pilotProblem', kind, {
      prompt: labelled(`From ${current} ft, climbing at ${rate} ft/min for ${minutes} minutes: will the aircraft reach ${target} ft?`),
      type: 'boolean',
      answer: reaches ? 'True' : 'False',
      explanation: `It gains ${fmt(rate * minutes)} ft, reaching ${fmt(current + rate * minutes)} ft, which is ${reaches ? 'at or above' : 'below'} ${target} ft.${practiceNote}`,
      steps: [
        `Rate = ${rate} ft/min, time = ${minutes} min`,
        `Gained = ${fmt(rate * minutes)} ft`,
        `New altitude = ${fmt(current + rate * minutes)} ft; compare with ${target} ft`,
      ],
      hints: makeHints(
        'Work out the height gained during the climb.',
        'Add the gained height to the starting altitude.',
        'New altitude = start + rate × minutes.',
        `${current} + ${rate} × ${minutes} = ${fmt(current + rate * minutes)} ft, so the target is ${reaches ? 'reached' : 'not reached'}.`,
      ),
      shortcut: 'Compare start + gain with the target altitude.',
    })
  }

  if (kind === 'ratios') {
    if (rng() > 0.5) {
      const factor = int(rng, 2, 9)
      const first = int(rng, 2, 9)
      let second = int(rng, 2, 9)
      if (second === first) second = second === 9 ? 8 : second + 1
      const a = factor * first
      const b = factor * second
      const g = gcd(a, b)
      const sa = a / g
      const sb = b / g
      return makeQuestion(ctx, 'pilotProblem', kind, {
        prompt: labelled(`Simplify the fuel-burn ratio ${a}:${b}.`),
        type: 'mcq',
        answer: `${sa}:${sb}`,
        distractors: [`${sb}:${sa}`, `${a}:${b}`, `${sa}:${sb + 1}`],
        explanation: `The GCD of ${a} and ${b} is ${g}, so ${a} ÷ ${g} = ${sa} and ${b} ÷ ${g} = ${sb}. Simplified ratio: ${sa}:${sb}.${practiceNote}`,
        steps: [
          `Ratio = ${a}:${b}`,
          `GCD(${a}, ${b}) = ${g}`,
          `Divide both parts by ${g} → ${sa}:${sb}`,
        ],
        hints: makeHints(
          'Look for a number that divides both parts exactly.',
          'Find the greatest common divisor of the two numbers.',
          'Divide each part by the GCD.',
          `${a} ÷ ${g} = ${sa} and ${b} ÷ ${g} = ${sb}, giving ${sa}:${sb}.`,
        ),
        shortcut: 'Divide both ratio parts by their GCD.',
      })
    }
    const p = int(rng, 2, 6)
    const q = int(rng, 2, 6)
    const unit = (p + q) * int(rng, 10, hard ? 60 : 40)
    const part = unit / (p + q)
    const larger = Math.max(p, q) * part
    const a = numericResult(larger, 0)
    return makeQuestion(ctx, 'pilotProblem', kind, {
      prompt: labelled(`Split ${unit} nm of flight legs in the ratio ${p}:${q}. How long is the larger leg?`),
      type: 'numeric',
      answer: a.answer,
      numericAnswer: a.numericAnswer,
      tolerance: a.tolerance,
      answerUnit: 'nm',
      explanation: `Total parts = ${p} + ${q} = ${p + q}, so one part = ${part} nm. Larger share = ${Math.max(p, q)} × ${part} = ${fmt(larger)} nm.${practiceNote}`,
      steps: [
        `Total parts = ${p} + ${q} = ${p + q}`,
        `One part = ${unit} ÷ ${p + q} = ${part} nm`,
        `Larger share = ${Math.max(p, q)} × ${part} = ${fmt(larger)} nm`,
      ],
      hints: makeHints(
        'Ratios are shares of a total number of parts.',
        'Add the parts, then divide the total by that count.',
        'One part = total ÷ sum of ratio numbers.',
        `${unit} ÷ ${p + q} = ${part}; ${Math.max(p, q)} × ${part} = ${fmt(larger)} nm.`,
      ),
      shortcut: 'Find one part, then scale to the larger share.',
    })
  }

  if (kind === 'averageSpeed') {
    if (rng() > 0.5) {
      const v1 = int(rng, 90, 180)
      const v2 = int(rng, 90, 180)
      const leg = pick(rng, [60, 80, 100, 120, 150])
      const avg = cleanNumber(round(2 * v1 * v2 / (v1 + v2), 2))
      const a = numericResult(avg, 2)
      return makeQuestion(ctx, 'pilotProblem', kind, {
        prompt: labelled(`A plane flies ${leg} nm out at ${v1} kt and ${leg} nm back at ${v2} kt. What is its average speed? Round to 2 decimals.`),
        type: 'numeric',
        answer: a.answer,
        numericAnswer: a.numericAnswer,
        tolerance: a.tolerance,
        answerUnit: 'kt',
        explanation: `Average speed = total distance ÷ total time = ${2 * leg} ÷ (${leg}/${v1} + ${leg}/${v2}) = ${fmt(avg)} kt.${practiceNote}`,
        steps: [
          `Total distance = ${2 * leg} nm`,
          `Total time = ${leg}/${v1} + ${leg}/${v2} h`,
          `Average speed = ${2 * leg} ÷ (${leg}/${v1} + ${leg}/${v2}) = ${fmt(avg)} kt`,
        ],
        hints: makeHints(
          'Average speed is not the mean of the two speeds.',
          'Use total distance divided by total time.',
          'For equal legs: average = 2 × v1 × v2 ÷ (v1 + v2).',
          `2 × ${v1} × ${v2} ÷ (${v1} + ${v2}) = ${fmt(avg)} kt.`,
        ),
        shortcut: 'Equal distances → harmonic mean: 2ab ÷ (a + b).',
      })
    }
    const d1 = int(rng, 60, 220)
    const d2 = int(rng, 60, hard ? 300 : 220)
    const h1 = pick(rng, [0.5, 1, 1.5, 2])
    const h2 = pick(rng, [0.5, 1, 1.5, 2])
    const avg = cleanNumber(round((d1 + d2) / (h1 + h2), 2))
    const a = numericResult(avg, 2)
    return makeQuestion(ctx, 'pilotProblem', kind, {
      prompt: labelled(`A trip covers ${d1} nm in ${fmt(h1)} h and ${d2} nm in ${fmt(h2)} h. What is the average speed? Round to 2 decimals.`),
      type: 'numeric',
      answer: a.answer,
      numericAnswer: a.numericAnswer,
      tolerance: a.tolerance,
      answerUnit: 'kt',
      explanation: `Average speed = (${d1} + ${d2}) ÷ (${fmt(h1)} + ${fmt(h2)}) = ${fmt(avg)} kt.${practiceNote}`,
      steps: [
        `Total distance = ${d1} + ${d2} = ${d1 + d2} nm`,
        `Total time = ${fmt(h1)} + ${fmt(h2)} = ${fmt(h1 + h2)} h`,
        `Average speed = ${d1 + d2} ÷ ${fmt(h1 + h2)} = ${fmt(avg)} kt`,
      ],
      hints: makeHints(
        'Combine the two legs before dividing.',
        'Add distances and add times separately.',
        'Average speed = total distance ÷ total time.',
        `(${d1} + ${d2}) ÷ (${fmt(h1)} + ${fmt(h2)}) = ${fmt(avg)} kt.`,
      ),
      shortcut: 'Total distance ÷ total time.',
    })
  }

  if (kind === 'planning') {
    const airspeed = int(rng, 120, 175)
    const wind = int(rng, 8, 25)
    const headwind = rng() > 0.5
    const gs = headwind ? airspeed - wind : airspeed + wind
    const hours = pick(rng, [0.75, 1, 1.25, 1.5, 1.75, 2])
    const distance = cleanNumber(round(gs * hours, 2))
    const burn = int(rng, 30, 80)
    const unit = pick(rng, ['kg', 'L'])
    const used = cleanNumber(round(burn * hours, 2))
    const start = Math.ceil(used) + int(rng, 30, 120)
    const remaining = cleanNumber(round(start - used, 2))
    const a = numericResult(remaining, 2)
    return makeQuestion(ctx, 'pilotProblem', kind, {
      prompt: labelled(`Plan: airspeed ${airspeed} kt, ${headwind ? 'headwind' : 'tailwind'} ${wind} kt, ${fmt(hours)} h leg, burn ${burn} ${unit}/h, start ${start} ${unit}. How much ${unit} remains? Round to 2 decimals.`),
      type: 'numeric',
      answer: a.answer,
      numericAnswer: a.numericAnswer,
      tolerance: a.tolerance,
      answerUnit: unit,
      explanation: `Groundspeed = ${fmt(gs)} kt, leg = ${fmt(distance)} nm, fuel used = ${burn} × ${fmt(hours)} = ${fmt(used)} ${unit}, so ${start} − ${fmt(used)} = ${fmt(remaining)} ${unit} remains.${practiceNote}`,
      steps: [
        `Groundspeed = ${airspeed} ${headwind ? '−' : '+'} ${wind} = ${fmt(gs)} kt`,
        `Leg distance = ${fmt(gs)} × ${fmt(hours)} = ${fmt(distance)} nm`,
        `Fuel used = ${burn} × ${fmt(hours)} = ${fmt(used)} ${unit}`,
        `Remaining = ${start} − ${fmt(used)} = ${fmt(remaining)} ${unit}`,
      ],
      hints: makeHints(
        'Work through wind, then time, then fuel.',
        'Find groundspeed before anything else.',
        'Groundspeed → time → burn × time → start − used.',
        `${airspeed} ${headwind ? '−' : '+'} ${wind} = ${fmt(gs)} kt; ${burn} × ${fmt(hours)} = ${fmt(used)}; ${start} − ${fmt(used)} = ${fmt(remaining)} ${unit}.`,
      ),
      shortcut: 'Adjust for wind, then subtract burn × time from start.',
    })
  }

  return null
}

function generateAptitudeA(ctx: GenContext, kind: string): GeneratedQuestion | null {
  const rng = ctx.rng
  const hard = ctx.difficulty === 'hard'

  if (kind === 'basic') {
    if (rng() > 0.5) {
      const a = int(rng, 130, hard ? 690 : 480)
      const b = int(rng, 80, hard ? 520 : 390)
      const c = int(rng, 40, hard ? 280 : 190)
      const total = a + b + c
      const result = numericResult(total, 0)
      return makeQuestion(ctx, 'aptitudeProblem', kind, {
        prompt: `Compute ${a} + ${b} + ${c}.`,
        type: 'numeric',
        answer: result.answer,
        numericAnswer: result.numericAnswer,
        tolerance: result.tolerance,
        explanation: `${a} + ${b} = ${a + b}; ${a + b} + ${c} = ${fmt(total)}.${practiceNote}`,
        steps: [`Add ${a} + ${b} = ${a + b}`, `Add ${c}`, `Total = ${fmt(total)}`],
        hints: makeHints(
          'Add two numbers at a time.',
          'Group the first two, then add the third.',
          'Look for pairs that make round hundreds.',
          `${a} + ${b} = ${a + b}, then + ${c} = ${fmt(total)}.`,
        ),
        shortcut: 'Group into friendly hundreds before adding.',
      })
    }
    const a = int(rng, 13, hard ? 59 : 42)
    const b = int(rng, 12, hard ? 39 : 27)
    const total = a * b
    const result = numericResult(total, 0)
    return makeQuestion(ctx, 'aptitudeProblem', kind, {
      prompt: `Compute ${a} × ${b}.`,
      type: 'numeric',
      answer: result.answer,
      numericAnswer: result.numericAnswer,
      tolerance: result.tolerance,
      explanation: `Split ${b} into tens and units: ${a} × ${b} = ${a * Math.floor(b / 10) * 10} + ${a * (b % 10)} = ${fmt(total)}.${practiceNote}`,
      steps: [
        `Tens part: ${a} × ${Math.floor(b / 10) * 10} = ${a * Math.floor(b / 10) * 10}`,
        `Units part: ${a} × ${b % 10} = ${a * (b % 10)}`,
        `Total = ${fmt(total)}`,
      ],
      hints: makeHints(
        'Break the smaller number into tens and units.',
        'Multiply by the tens part and the units part separately.',
        'Use the distributive law.',
        `${a} × ${Math.floor(b / 10) * 10} + ${a} × ${b % 10} = ${fmt(total)}.`,
      ),
      shortcut: 'Split one factor into tens + units.',
    })
  }

  if (kind === 'mental') {
    const n = int(rng, 24, hard ? 149 : 96)
    const near = pick(rng, [9, 11])
    const resultValue = near === 9 ? n * 9 : n * 11
    const result = numericResult(resultValue, 0)
    return makeQuestion(ctx, 'aptitudeProblem', kind, {
      prompt: `Compute ${n} × ${near} mentally.`,
      type: 'numeric',
      answer: result.answer,
      numericAnswer: result.numericAnswer,
      tolerance: result.tolerance,
      explanation: `${near} is one ${near === 9 ? 'less' : 'more'} than 10: ${n} × 10 = ${n * 10}, then ${near === 9 ? 'subtract' : 'add'} ${n} to get ${fmt(resultValue)}.${practiceNote}`,
      steps: [
        `Multiply by 10: ${n} × 10 = ${n * 10}`,
        `${near === 9 ? 'Subtract' : 'Add'} one ${n}`,
        `${n * 10} ${near === 9 ? '−' : '+'} ${n} = ${fmt(resultValue)}`,
      ],
      hints: makeHints(
        `${near} is very close to 10.`,
        `Compute ${n} × 10 first, then adjust.`,
        near === 9 ? '×9 = ×10 − one group.' : '×11 = ×10 + one group.',
        `${n * 10} ${near === 9 ? '−' : '+'} ${n} = ${fmt(resultValue)}.`,
      ),
      shortcut: near === 9 ? '×9 = ×10 − the number.' : '×11 = ×10 + the number.',
    })
  }

  if (kind === 'speed') {
    const speed = int(rng, 40, hard ? 160 : 120)
    const hours = pick(rng, [1.5, 2, 2.5, 3])
    const distance = speed * hours
    const result = numericResult(hours, 1)
    return makeQuestion(ctx, 'aptitudeProblem', kind, {
      prompt: `A vehicle covers ${distance} km at ${speed} km/h. How many hours does it take? Round to 1 decimal.`,
      type: 'numeric',
      answer: result.answer,
      numericAnswer: result.numericAnswer,
      tolerance: result.tolerance,
      answerUnit: 'h',
      explanation: `Time = distance ÷ speed = ${distance} ÷ ${speed} = ${fmt(hours)} h.${practiceNote}`,
      steps: [
        `Distance = ${distance} km`,
        `Speed = ${speed} km/h`,
        `Time = ${distance} ÷ ${speed} = ${fmt(hours)} h`,
      ],
      hints: makeHints(
        'Use the speed–distance–time triangle.',
        'Cover time in the triangle to get distance ÷ speed.',
        'Time = distance ÷ speed.',
        `${distance} ÷ ${speed} = ${fmt(hours)} h.`,
      ),
      shortcut: 'Time = distance ÷ speed.',
    })
  }

  if (kind === 'ratio') {
    const p = int(rng, 2, 7)
    const q = int(rng, 2, 7)
    const total = (p + q) * int(rng, 12, hard ? 70 : 50)
    const part = total / (p + q)
    const larger = Math.max(p, q) * part
    const result = numericResult(larger, 0)
    return makeQuestion(ctx, 'aptitudeProblem', kind, {
      prompt: `Divide ${total} in the ratio ${p}:${q}. What is the larger share?`,
      type: 'numeric',
      answer: result.answer,
      numericAnswer: result.numericAnswer,
      tolerance: result.tolerance,
      explanation: `Total parts = ${p} + ${q} = ${p + q}; one part = ${part}. Larger share = ${Math.max(p, q)} × ${part} = ${fmt(larger)}.${practiceNote}`,
      steps: [
        `Sum of ratio parts = ${p + q}`,
        `One part = ${total} ÷ ${p + q} = ${part}`,
        `Larger share = ${Math.max(p, q)} × ${part} = ${fmt(larger)}`,
      ],
      hints: makeHints(
        'Ratios are about equal-sized parts.',
        'Divide the total by the sum of the ratio numbers.',
        'One part = total ÷ (p + q).',
        `${total} ÷ ${p + q} = ${part}; ${Math.max(p, q)} × ${part} = ${fmt(larger)}.`,
      ),
      shortcut: 'Find one part, then multiply for the larger share.',
    })
  }

  return null
}

function generateAptitudeB(ctx: GenContext, kind: string): GeneratedQuestion | null {
  const rng = ctx.rng
  const hard = ctx.difficulty === 'hard'

  if (kind === 'percent') {
    const percent = pick(rng, hard ? [12, 15, 18, 24, 35, 45] : [10, 12, 15, 20, 25, 35])
    const base = int(rng, 8, hard ? 90 : 40) * 10
    const value = cleanNumber(round(base * percent / 100, 2))
    const result = numericResult(value, 2)
    return makeQuestion(ctx, 'aptitudeProblem', kind, {
      prompt: `Find ${percent}% of ${base}. Round to 2 decimals if needed.`,
      type: 'numeric',
      answer: result.answer,
      numericAnswer: result.numericAnswer,
      tolerance: result.tolerance,
      explanation: `${percent}% of ${base} = ${base} × ${fmt(percent / 100)} = ${fmt(value)}.${practiceNote}`,
      steps: [
        `Write ${percent}% as ${fmt(percent / 100)}`,
        `Multiply ${base} × ${fmt(percent / 100)}`,
        `Result = ${fmt(value)}`,
      ],
      hints: makeHints(
        'A percentage is a fraction out of 100.',
        'Convert the percent to a decimal, then multiply.',
        '10% is one tenth; build other percentages from it.',
        `${base} × ${fmt(percent / 100)} = ${fmt(value)}.`,
      ),
      shortcut: 'Convert percent to a decimal, then multiply.',
    })
  }

  if (kind === 'units') {
    if (rng() > 0.72) {
      return makeQuestion(ctx, 'aptitudeProblem', kind, {
        prompt: 'Which operation converts km/h to m/s?',
        type: 'mcq',
        answer: 'Divide by 3.6',
        distractors: ['Multiply by 3.6', 'Divide by 1000', 'Multiply by 3600'],
        explanation: `1 km/h = 1000 m ÷ 3600 s = 1 ÷ 3.6 m/s, so divide by 3.6.${practiceNote}`,
        steps: [
          '1 km = 1000 m',
          '1 h = 3600 s',
          '1000 ÷ 3600 = 1 ÷ 3.6, so divide by 3.6',
        ],
        hints: makeHints(
          'Convert kilometres to metres and hours to seconds.',
          '1000 m in 3600 s simplifies to 1 m per 3.6 s.',
          'km/h ÷ 3.6 = m/s.',
          'The correct operation is to divide by 3.6.',
        ),
        shortcut: 'km/h ÷ 3.6 = m/s.',
      })
    }
    const kmh = pick(rng, [36, 54, 72, 90, 108, 126, 144, 180])
    const ms = cleanNumber(kmh / 3.6)
    const result = numericResult(ms, 0)
    return makeQuestion(ctx, 'aptitudeProblem', kind, {
      prompt: `Convert ${kmh} km/h to m/s.`,
      type: 'numeric',
      answer: result.answer,
      numericAnswer: result.numericAnswer,
      tolerance: result.tolerance,
      answerUnit: 'm/s',
      explanation: `${kmh} ÷ 3.6 = ${fmt(ms)} m/s.${practiceNote}`,
      steps: ['Use km/h ÷ 3.6 = m/s', `${kmh} ÷ 3.6`, `= ${fmt(ms)} m/s`],
      hints: makeHints(
        'Metres per second is a smaller number than km/h.',
        'Divide the km/h value by 3.6.',
        'km/h ÷ 3.6 = m/s.',
        `${kmh} ÷ 3.6 = ${fmt(ms)} m/s.`,
      ),
      shortcut: 'Divide km/h by 3.6 for m/s.',
    })
  }

  if (kind === 'multiStep') {
    const a = int(rng, 12, hard ? 60 : 40)
    const b = int(rng, 6, 18)
    const c = int(rng, 4, 9)
    const d = int(rng, 5, 30)
    const inner = a + b
    const product = inner * c
    const total = product - d
    const result = numericResult(total, 0)
    return makeQuestion(ctx, 'aptitudeProblem', kind, {
      prompt: `Compute (${a} + ${b}) × ${c} − ${d}.`,
      type: 'numeric',
      answer: result.answer,
      numericAnswer: result.numericAnswer,
      tolerance: result.tolerance,
      explanation: `Brackets first: ${a} + ${b} = ${inner}; multiply: ${inner} × ${c} = ${product}; subtract: ${product} − ${d} = ${fmt(total)}.${practiceNote}`,
      steps: [
        `Brackets: ${a} + ${b} = ${inner}`,
        `Multiply: ${inner} × ${c} = ${product}`,
        `Subtract: ${product} − ${d} = ${fmt(total)}`,
      ],
      hints: makeHints(
        'Follow the order of operations.',
        'Do the bracket first, then multiply, then subtract.',
        'BODMAS: brackets → multiply → subtract.',
        `(${a} + ${b}) = ${inner}; × ${c} = ${product}; − ${d} = ${fmt(total)}.`,
      ),
      shortcut: 'Brackets first, then multiply, then subtract.',
    })
  }

  if (kind === 'mixedTimed') {
    const variant = int(rng, 0, 2)
    if (variant === 0) {
      const base = pick(rng, [200, 300, 400, hard ? 600 : 500])
      const percent = pick(rng, [10, 20, 25])
      const speed = pick(rng, [30, 40, 50, hard ? 60 : 45])
      const reduced = base * (1 - percent / 100)
      const hours = cleanNumber(round(reduced / speed, 2))
      const result = numericResult(hours, 2)
      return makeQuestion(ctx, 'aptitudeProblem', kind, {
        prompt: `A ${base} km route is shortened by ${percent}%, then flown at ${speed} km/h. How many hours does it take? Round to 2 decimals.`,
        type: 'numeric',
        answer: result.answer,
        numericAnswer: result.numericAnswer,
        tolerance: result.tolerance,
        answerUnit: 'h',
        timeTargetSec: 30,
        explanation: `Shortened route = ${base} × ${fmt(1 - percent / 100)} = ${fmt(reduced)} km; time = ${fmt(reduced)} ÷ ${speed} = ${fmt(hours)} h.${practiceNote}`,
        steps: [
          `Remaining fraction = 1 − ${fmt(percent / 100)} = ${fmt(1 - percent / 100)}`,
          `New distance = ${base} × ${fmt(1 - percent / 100)} = ${fmt(reduced)} km`,
          `Time = ${fmt(reduced)} ÷ ${speed} = ${fmt(hours)} h`,
        ],
        hints: makeHints(
          'Apply the percentage change before dividing by speed.',
          'Find the shortened route, then use time = distance ÷ speed.',
          'New distance = base × (1 − percent).',
          `${base} × ${fmt(1 - percent / 100)} = ${fmt(reduced)}; ${fmt(reduced)} ÷ ${speed} = ${fmt(hours)} h.`,
        ),
        shortcut: 'Scale the distance first, then divide by speed.',
      })
    }
    if (variant === 1) {
      const p = int(rng, 2, 6)
      const q = int(rng, 2, 6)
      const total = (p + q) * int(rng, 15, hard ? 80 : 50)
      const part = total / (p + q)
      const larger = Math.max(p, q) * part
      const increase = pick(rng, [10, 20, 25])
      const value = cleanNumber(round(larger * (1 + increase / 100), 2))
      const result = numericResult(value, 2)
      return makeQuestion(ctx, 'aptitudeProblem', kind, {
        prompt: `Divide ${total} in the ratio ${p}:${q}, then increase the larger share by ${increase}%. What is the new value? Round to 2 decimals.`,
        type: 'numeric',
        answer: result.answer,
        numericAnswer: result.numericAnswer,
        tolerance: result.tolerance,
        timeTargetSec: 30,
        explanation: `One part = ${part}; larger share = ${larger}; after a ${increase}% rise = ${larger} × ${fmt(1 + increase / 100)} = ${fmt(value)}.${practiceNote}`,
        steps: [
          `One part = ${total} ÷ ${p + q} = ${part}`,
          `Larger share = ${Math.max(p, q)} × ${part} = ${larger}`,
          `Increase by ${increase}%: ${larger} × ${fmt(1 + increase / 100)} = ${fmt(value)}`,
        ],
        hints: makeHints(
          'Split the total before applying the percentage.',
          'Find one ratio part, the larger share, then scale it.',
          'New value = larger share × (1 + percent).',
          `${larger} × ${fmt(1 + increase / 100)} = ${fmt(value)}.`,
        ),
        shortcut: 'Ratio share first, then percentage multiplier.',
      })
    }
    const kmh = pick(rng, [54, 72, 90, 108, 144, 180])
    const seconds = int(rng, 5, hard ? 40 : 20)
    const ms = cleanNumber(kmh / 3.6)
    const distance = cleanNumber(round(ms * seconds, 2))
    const result = numericResult(distance, 2)
    return makeQuestion(ctx, 'aptitudeProblem', kind, {
      prompt: `A vehicle travels at ${kmh} km/h for ${seconds} seconds. How many metres does it cover? Round to 2 decimals.`,
      type: 'numeric',
      answer: result.answer,
      numericAnswer: result.numericAnswer,
      tolerance: result.tolerance,
      answerUnit: 'm',
      timeTargetSec: 30,
      explanation: `${kmh} km/h = ${fmt(ms)} m/s; distance = ${fmt(ms)} × ${seconds} = ${fmt(distance)} m.${practiceNote}`,
      steps: [
        `Convert speed: ${kmh} ÷ 3.6 = ${fmt(ms)} m/s`,
        `Distance = speed × time`,
        `${fmt(ms)} × ${seconds} = ${fmt(distance)} m`,
      ],
      hints: makeHints(
        'The time is in seconds, so use metres per second.',
        'Convert km/h to m/s first.',
        'km/h ÷ 3.6 = m/s, then distance = speed × time.',
        `${kmh} ÷ 3.6 = ${fmt(ms)}; ${fmt(ms)} × ${seconds} = ${fmt(distance)} m.`,
      ),
      shortcut: 'Convert speed to m/s, then multiply by seconds.',
    })
  }

  return null
}

type ShortcutCase = {
  calculation: string
  question: string
  correct: string
  wrong: [string, string, string]
  why: string
  work: string
}

const multiplicationCases: ShortcutCase[] = [
  {
    calculation: '25 × 16',
    question: 'Which mental shortcut solves 25 × 16 fastest?',
    correct: 'Divide 16 by 4, then multiply by 100',
    wrong: ['Double 25 and add 16', 'Multiply 25 by 10, then add 6', 'Subtract 25 from 16, then double'],
    why: 'Since 25 = 100 ÷ 4, quartering the other number and shifting two places is instant.',
    work: '16 ÷ 4 = 4, then 4 × 100 = 400.',
  },
  {
    calculation: '15 × 24',
    question: 'Which mental shortcut solves 15 × 24 fastest?',
    correct: 'Multiply by 10, then add half of that',
    wrong: ['Multiply by 5, then double once', 'Double 15 and subtract 24', 'Add 15 to 24, then multiply by 2'],
    why: '15% of a number is one tenth plus one twentieth; for multiplication, 15 = 10 + 5.',
    work: '24 × 10 = 240, half is 120, so 240 + 120 = 360.',
  },
  {
    calculation: '9 × 43',
    question: 'Which mental shortcut solves 9 × 43 fastest?',
    correct: 'Multiply by 10, then subtract 43',
    wrong: ['Multiply by 9 tens and add 43', 'Double 43, then add 9', 'Subtract 9 from 43, then multiply by 10'],
    why: 'Nine is one less than ten, so multiply by 10 and remove one group.',
    work: '43 × 10 = 430, then 430 − 43 = 387.',
  },
  {
    calculation: '11 × 34',
    question: 'Which mental shortcut solves 11 × 34 fastest?',
    correct: 'Split 3 and 4, insert their sum between them',
    wrong: ['Multiply by 10, then subtract 34', 'Double 34 and add 11', 'Add 3 and 4, then multiply by 34'],
    why: 'For 11 × ab, write a, then a + b, then b.',
    work: '3 + 4 = 7, so the answer is 374.',
  },
]

const percentageCases: ShortcutCase[] = [
  {
    calculation: '15% of 240',
    question: 'Which mental shortcut solves 15% of 240 fastest?',
    correct: 'Find 10%, then add half of that',
    wrong: ['Find 5%, then double it', 'Divide 240 by 15', 'Find 20%, then subtract 1%'],
    why: '15% = 10% + 5%, and 5% is half of 10%.',
    work: '10% of 240 = 24, half is 12, so 24 + 12 = 36.',
  },
  {
    calculation: '25% of 84',
    question: 'Which mental shortcut solves 25% of 84 fastest?',
    correct: 'Divide 84 by 4',
    wrong: ['Divide 84 by 5', 'Find 10% and double it', 'Subtract 25 from 84'],
    why: '25% is exactly one quarter.',
    work: '84 ÷ 4 = 21.',
  },
  {
    calculation: '12.5% of 96',
    question: 'Which mental shortcut solves 12.5% of 96 fastest?',
    correct: 'Divide 96 by 8',
    wrong: ['Divide 96 by 12', 'Find 10% and add 2.5', 'Multiply 96 by 0.125 then add 1'],
    why: '12.5% is one eighth.',
    work: '96 ÷ 8 = 12.',
  },
]

const conversionCases: ShortcutCase[] = [
  {
    calculation: '72 km/h to m/s',
    question: 'Which mental shortcut converts 72 km/h to m/s fastest?',
    correct: 'Divide 72 by 3.6',
    wrong: ['Multiply 72 by 3.6', 'Divide 72 by 1000', 'Multiply 72 by 3600'],
    why: 'km/h and m/s differ by a factor of 3.6.',
    work: '72 ÷ 3.6 = 20 m/s.',
  },
  {
    calculation: '50 nm to km',
    question: 'Which mental shortcut converts 50 nm to km fastest?',
    correct: 'Multiply 50 by 1.852',
    wrong: ['Multiply 50 by 1.609', 'Divide 50 by 1.852', 'Multiply 50 by 0.3048'],
    why: 'One nautical mile is 1.852 km.',
    work: '50 × 1.852 = 92.6 km.',
  },
  {
    calculation: '2500 ft to metres',
    question: 'Which mental shortcut converts 2500 ft to metres fastest?',
    correct: 'Multiply 2500 by 0.3048',
    wrong: ['Multiply 2500 by 3.281', 'Divide 2500 by 0.3048', 'Multiply 2500 by 1.609'],
    why: 'One foot is 0.3048 m.',
    work: '2500 × 0.3048 = 762 m.',
  },
]

function generateShortcut(ctx: GenContext, topic: string): GeneratedQuestion {
  const rng = ctx.rng
  const cases = topic === 'multiplication' ? multiplicationCases : topic === 'percentage' ? percentageCases : conversionCases
  const chosen = pick(rng, cases)
  return makeQuestion(ctx, 'shortcutIdentify', topic, {
    prompt: `${chosen.question} Choose the technique, not the answer.`,
    type: 'mcq',
    answer: chosen.correct,
    distractors: [...chosen.wrong],
    explanation: `${chosen.why} ${chosen.work} ${chosen.calculation} is solved by "${chosen.correct}".${practiceNote}`,
    steps: [
      `Calculate: ${chosen.calculation}`,
      `Recognise the structure behind it`,
      `Apply: ${chosen.correct}`,
      `Check: ${chosen.work}`,
    ],
    hints: makeHints(
      `Look closely at the numbers in ${chosen.calculation}.`,
      'Ask which number is close to a round figure like 10, 100 or 1.',
      chosen.correct,
      `${chosen.why} ${chosen.work}`,
    ),
    shortcut: chosen.correct,
  })
}

type ErrorCase = {
  title: string
  correct: [string, string, string]
  wrong: [string, string, string]
  final: number
}

function buildErrorCase(rng: Rng, underlying: string): ErrorCase {
  if (underlying === 'mul9') {
    const n = int(rng, 23, 89)
    return {
      title: `${n} × 9`,
      correct: [
        `Multiply by 10: ${n} × 10 = ${n * 10}`,
        `Subtract one more ${n}: ${n * 10} − ${n} = ${n * 9}`,
        `So ${n} × 9 = ${n * 9}`,
      ],
      wrong: [
        `Multiply by 10: ${n} × 10 = ${n * 10 + 10}`,
        `Subtract one more ${n}: ${n * 10} − ${n} = ${n * 10 - n - 10}`,
        `So ${n} × 9 = ${n * 9 + 9}`,
      ],
      final: n * 9,
    }
  }
  if (underlying === 'pct15') {
    const base = 20 * int(rng, 6, 30)
    const tenth = base / 10
    const twentieth = base / 20
    const final = cleanNumber(round(base * 0.15, 2))
    return {
      title: `15% of ${base}`,
      correct: [
        `Find 10%: ${base} ÷ 10 = ${tenth}`,
        `Find 5%: ${base} ÷ 20 = ${twentieth}`,
        `Add them: ${tenth} + ${twentieth} = ${fmt(final)}`,
      ],
      wrong: [
        `Find 10%: ${base} ÷ 10 = ${tenth + 1}`,
        `Find 5%: ${base} ÷ 20 = ${twentieth + 2}`,
        `Add them: ${tenth} + ${twentieth} = ${fmt(final + 5)}`,
      ],
      final,
    }
  }
  if (underlying === 'pct25') {
    const base = 4 * int(rng, 8, 40)
    const quarter = base / 4
    return {
      title: `25% of ${base}`,
      correct: [
        '25% means one quarter, so divide by 4',
        `${base} ÷ 4 = ${quarter}`,
        `So 25% of ${base} is ${quarter}`,
      ],
      wrong: [
        '25% means one fifth, so divide by 5',
        `${base} ÷ 4 = ${quarter + 1}`,
        `So 25% of ${base} is ${quarter + 4}`,
      ],
      final: quarter,
    }
  }
  if (underlying === 'kmhMs') {
    const kmh = 18 * int(rng, 3, 12)
    const ms = cleanNumber(round(kmh / 3.6, 2))
    return {
      title: `${kmh} km/h to m/s`,
      correct: [
        'Conversion rule: divide km/h by 3.6',
        `${kmh} ÷ 3.6 = ${fmt(ms)} m/s`,
        `So ${kmh} km/h = ${fmt(ms)} m/s`,
      ],
      wrong: [
        'Conversion rule: multiply km/h by 3.6',
        `${kmh} ÷ 3.6 = ${fmt(ms + 2)} m/s`,
        `So ${kmh} km/h = ${fmt(ms + 5)} m/s`,
      ],
      final: ms,
    }
  }
  const n = 2 * int(rng, 12, 48)
  return {
    title: `${n} × 5`,
    correct: [
      `Halve ${n}: ${n} ÷ 2 = ${n / 2}`,
      `Multiply by 10: ${n / 2} × 10 = ${n * 5}`,
      `So ${n} × 5 = ${n * 5}`,
    ],
    wrong: [
      `Halve ${n}: ${n} ÷ 2 = ${n / 2 + 2}`,
      `Multiply by 5 instead: ${n / 2} × 5 = ${n * 5 / 2}`,
      `So ${n} × 5 = ${n * 5 + 5}`,
    ],
    final: n * 5,
  }
}

function generateFindError(ctx: GenContext, underlying: string): GeneratedQuestion {
  const rng = ctx.rng
  const scenario = buildErrorCase(rng, underlying)
  const wrongStep = int(rng, 1, 3)
  const worked: [string, string, string] = [...scenario.correct]
  worked[wrongStep - 1] = scenario.wrong[wrongStep - 1]
  const answer = `Step ${wrongStep}`
  return makeQuestion(ctx, 'findError', underlying, {
    prompt: `${scenario.title}: a student wrote these three steps. Which step contains the mistake?\n1. ${worked[0]}\n2. ${worked[1]}\n3. ${worked[2]}`,
    type: 'mcq',
    answer,
    distractors: ['Step 1', 'Step 2', 'Step 3', 'No mistake'].filter((option) => option !== answer),
    explanation: `${answer} is wrong. Correct calculation: ${scenario.correct.join(' ')} The answer is ${fmt(scenario.final)}.${practiceNote}`,
    steps: [`The mistake is in ${answer}: ${worked[wrongStep - 1]}`, ...scenario.correct],
    hints: makeHints(
      'Check each line against the rule for this calculation.',
      'Recompute the three lines independently.',
      'Only one line is wrong; the other two agree with each other.',
      `Correct steps: ${scenario.correct.join(' ')} The answer is ${fmt(scenario.final)}.`,
    ),
    shortcut: 'Verify each step against the rule before comparing answers.',
  })
}

function generateEstimation(ctx: GenContext): GeneratedQuestion {
  const rng = ctx.rng
  const variant = int(rng, 0, 2)

  if (variant === 0) {
    let a = int(rng, 2, 9) * 10 + int(rng, 1, 9)
    const b = int(rng, 1, 4) * 10 + int(rng, 1, 9)
    let roundA = round(a / 10, 0) * 10
    const roundB = round(b / 10, 0) * 10
    if (roundA * roundB === a * b) {
      a += 1
      roundA = round(a / 10, 0) * 10
    }
    const estimate = roundA * roundB
    const exact = a * b
    const distractors = uniqueDistractors(estimate, [
      exact, roundA * (roundB - 10), (roundA + 10) * roundB, roundA * b,
    ], rng)
    return makeQuestion(ctx, 'estimation', 'estimation', {
      prompt: `Estimate ${a} × ${b} by rounding each number to the nearest 10.`,
      type: 'mcq',
      answer: fmt(estimate),
      numericAnswer: estimate,
      distractors,
      explanation: `${a} ≈ ${roundA} and ${b} ≈ ${roundB}, so ${roundA} × ${roundB} = ${estimate}. The exact answer is ${fmt(exact)}, so the estimate is close because each factor moved by only a few units.${practiceNote}`,
      steps: [
        `Round ${a} to ${roundA}`,
        `Round ${b} to ${roundB}`,
        `Multiply ${roundA} × ${roundB} = ${estimate}`,
        `Exact answer: ${fmt(exact)}`,
      ],
      hints: makeHints(
        'Rounding first makes the multiplication easy.',
        'Round each factor to the nearest 10.',
        `${a} ≈ ${roundA}, ${b} ≈ ${roundB}.`,
        `${roundA} × ${roundB} = ${estimate}; exact answer is ${fmt(exact)}.`,
      ),
      shortcut: 'Round to tens, then multiply the round numbers.',
    })
  }

  if (variant === 1) {
    let a = int(rng, 12, 89) * 10 + int(rng, 1, 9)
    const b = int(rng, 12, 89) * 10 + int(rng, 1, 9)
    let roundA = round(a / 100, 0) * 100
    const roundB = round(b / 100, 0) * 100
    if (roundA + roundB === a + b) {
      a += 1
      roundA = round(a / 100, 0) * 100
    }
    const estimate = roundA + roundB
    const exact = a + b
    const distractors = uniqueDistractors(estimate, [
      exact, estimate - 100, estimate + 100, roundA + roundB - 200,
    ], rng)
    return makeQuestion(ctx, 'estimation', 'estimation', {
      prompt: `Estimate ${a} + ${b} by rounding each number to the nearest 100.`,
      type: 'mcq',
      answer: fmt(estimate),
      numericAnswer: estimate,
      distractors,
      explanation: `${a} ≈ ${roundA} and ${b} ≈ ${roundB}, giving ${estimate}. The exact answer is ${fmt(exact)}; the estimate is close because the rounding changes each addend by less than 50.${practiceNote}`,
      steps: [
        `Round ${a} to ${roundA}`,
        `Round ${b} to ${roundB}`,
        `Add ${roundA} + ${roundB} = ${estimate}`,
        `Exact answer: ${fmt(exact)}`,
      ],
      hints: makeHints(
        'Round before adding to keep it simple.',
        'Round each addend to the nearest 100.',
        `${a} ≈ ${roundA}, ${b} ≈ ${roundB}.`,
        `${roundA} + ${roundB} = ${estimate}; exact answer is ${fmt(exact)}.`,
      ),
      shortcut: 'Round to hundreds, then add the round numbers.',
    })
  }

  const percent = pick(rng, [10, 15, 20, 25])
  const base = int(rng, 11, 89) * 10 + int(rng, 1, 9)
  const roundBase = round(base / 100, 0) * 100
  const estimate = cleanNumber(roundBase * percent / 100)
  const exact = cleanNumber(round(base * percent / 100, 2))
  const distractors = uniqueDistractors(estimate, [
    exact, estimate + 10, estimate - 10, roundBase * percent / 100 + 5,
  ], rng)
  return makeQuestion(ctx, 'estimation', 'estimation', {
    prompt: `Estimate ${percent}% of ${base} by rounding ${base} to the nearest 100 first.`,
    type: 'mcq',
    answer: fmt(estimate),
    numericAnswer: estimate,
    distractors,
    explanation: `${base} ≈ ${roundBase}, and ${percent}% of ${roundBase} is ${fmt(estimate)}. The exact answer is ${fmt(exact)}, so the estimate is close because ${base} is near ${roundBase}.${practiceNote}`,
    steps: [
      `Round ${base} to ${roundBase}`,
      `Write ${percent}% as ${fmt(percent / 100)}`,
      `${roundBase} × ${fmt(percent / 100)} = ${fmt(estimate)}`,
      `Exact answer: ${fmt(exact)}`,
    ],
    hints: makeHints(
      'Round the base number before finding the percentage.',
      'A nearby multiple of 100 makes the percentage easy.',
      `${percent}% of ${roundBase} = ${fmt(estimate)}.`,
      `${base} ≈ ${roundBase}; ${roundBase} × ${fmt(percent / 100)} = ${fmt(estimate)}. Exact: ${fmt(exact)}.`,
    ),
    shortcut: 'Round the base to a hundred, then take the percentage.',
  })
}

const pilotAliases: Record<string, string> = {
  eta: 'timeToDest',
  wind: 'groundSpeed',
  speed: 'groundSpeed',
  distance: 'distanceTime',
  fuel: 'fuelBurn',
  climb: 'altitude',
}

function generatePilot(ctx: GenContext, kind: string): GeneratedQuestion {
  const requested = pilotAliases[kind] ?? kind
  const handled = pilotKinds.includes(requested) ? requested : 'groundSpeed'
  return generatePilotA(ctx, handled) ?? generatePilotB(ctx, handled) ?? generatePilotA(ctx, 'groundSpeed')!
}

function generateAptitude(ctx: GenContext, kind: string): GeneratedQuestion {
  const handled = aptitudeKinds.includes(kind) ? kind : 'basic'
  return generateAptitudeA(ctx, handled) ?? generateAptitudeB(ctx, handled) ?? generateAptitudeA(ctx, 'basic')!
}

/** Flight-planning, wind, fuel, conversion, altitude and ETA practice. */
export function pilotProblem(spec: QuestionSpec | GenContext, options: GenerateOptions = {}): GeneratedQuestion {
  const ctx = contextFrom(spec, options)
  return generatePilot(ctx, paramString(ctx, 'kind', 'groundSpeed'))
}

/** Timed numerical-reasoning practice with pilot-relevant contexts. */
export function aptitudeProblem(spec: QuestionSpec | GenContext, options: GenerateOptions = {}): GeneratedQuestion {
  const ctx = contextFrom(spec, options)
  return generateAptitude(ctx, paramString(ctx, 'kind', 'basic'))
}

/** Choose the fastest correct technique for a calculation. */
export function shortcutIdentify(spec: QuestionSpec | GenContext, options: GenerateOptions = {}): GeneratedQuestion {
  const ctx = contextFrom(spec, options)
  const topics = ['multiplication', 'percentage', 'conversion']
  const requested = paramString(ctx, 'topic', paramString(ctx, 'kind', ''))
  return generateShortcut(ctx, topics.includes(requested) ? requested : pick(ctx.rng, topics))
}

/** Locate the single incorrect line in a worked calculation. */
export function findError(spec: QuestionSpec | GenContext, options: GenerateOptions = {}): GeneratedQuestion {
  const ctx = contextFrom(spec, options)
  const variants = ['mul5', 'mul9', 'pct15', 'pct25', 'kmhMs']
  const requested = paramString(ctx, 'underlying', paramString(ctx, 'kind', ''))
  return generateFindError(ctx, variants.includes(requested) ? requested : pick(ctx.rng, variants))
}

/** Round-first mental estimates for cockpit-style quantities. */
export function estimation(spec: QuestionSpec | GenContext, options: GenerateOptions = {}): GeneratedQuestion {
  const ctx = contextFrom(spec, options)
  return generateEstimation(ctx)
}

/** Registry dispatcher kept so existing `generateAviation(ctx, family)` imports keep working. */
export function generateAviation(ctx: GenContext, family: string): GeneratedQuestion {
  switch (family) {
    case 'pilotProblem': return pilotProblem(ctx)
    case 'aptitudeProblem': return aptitudeProblem(ctx)
    case 'shortcutIdentify': return shortcutIdentify(ctx)
    case 'findError': return findError(ctx)
    case 'estimation': return estimation(ctx)
    default: return pilotProblem(ctx)
  }
}

