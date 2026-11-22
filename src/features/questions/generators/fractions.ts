import type { GenContext } from '../index'
import type { GeneratedQuestion } from '@/lib/types'
import { buildQuestion, makeHints } from '../builders'
import type { QuestionSeed } from '../builders'
import { cleanNumber, fmt, gcd, int, pick, round } from '../random'
import type { RNG } from '../random'

type Frac = { n: number; d: number }
type Dec = { text: string; value: number }

/** Reduce a fraction and keep the sign on the numerator. */
function makeFrac(n: number, d: number): Frac {
  if (d === 0) throw new Error('makeFrac: zero denominator')
  if (n === 0) return { n: 0, d: 1 }
  const divisor = gcd(n, d)
  let nn = n / divisor
  let dd = d / divisor
  if (dd < 0) {
    nn = -nn
    dd = -dd
  }
  return { n: nn, d: dd }
}

const fracText = (f: Frac): string => `${f.n}/${f.d}`
const fracValue = (f: Frac): number => f.n / f.d

/**
 * Build plausible wrong answers, comparing by numeric value so an equivalent
 * fraction can never appear as a second "correct" option.
 */
function fractionDistractors(correct: Frac, extras: readonly Frac[], rng: RNG): string[] {
  const out: string[] = []
  const seen = new Set<number>([cleanNumber(fracValue(correct))])

  const add = (raw: Frac): void => {
    if (raw.d === 0) return
    const f = makeFrac(raw.n, raw.d)
    const value = cleanNumber(fracValue(f))
    if (!Number.isFinite(value) || seen.has(value)) return
    seen.add(value)
    out.push(fracText(f))
  }

  for (const extra of extras) add(extra)

  const { n, d } = correct
  const nearMisses: Frac[] = [
    { n: n + 1, d },
    { n: n - 1, d },
    { n, d: d + 1 },
    { n: d, d: n },
    { n: -n, d },
    { n: n + d, d },
    { n: n + 2, d },
    { n, d: d + 2 },
    { n: 1, d: d + 1 },
  ]
  for (const candidate of nearMisses) {
    if (out.length >= 3) break
    add(candidate)
  }

  let guard = 0
  while (out.length < 3 && guard < 16) {
    add({ n: n + int(rng, -4, 4), d: d + int(rng, 1, 4) })
    guard += 1
  }
  return out.slice(0, 3)
}

/** Fields shared by every generated question in this group. */
function common(ctx: GenContext, subtopic: string) {
  return {
    specKey: `${ctx.spec.family}:${JSON.stringify(ctx.spec.params ?? {})}`,
    variant: ctx.variant,
    rng: ctx.rng,
    concept: ctx.spec.concept ?? 'fractions',
    conceptLabel: ctx.spec.conceptLabel ?? 'Fractions',
    subtopic,
    difficulty: ctx.difficulty,
    levelId: ctx.levelId,
    chapterId: ctx.chapterId,
  }
}

function fundamental(ctx: GenContext): GeneratedQuestion {
  const { rng } = ctx
  const low = ctx.difficulty === 'easy' ? 4 : ctx.difficulty === 'medium' ? 6 : 8
  const high = ctx.difficulty === 'easy' ? 8 : ctx.difficulty === 'medium' ? 14 : 24
  const d = int(rng, low, high)
  const n = int(rng, 1, d - 1)
  const f = makeFrac(n, d)
  const g = gcd(n, d)
  const answer = fracText(f)
  const prompt = pick(rng, [
    `A pizza is cut into ${d} equal slices and ${n} slices are eaten. What fraction of the pizza was eaten? Give your answer in simplest form.`,
    `A class has ${d} students and ${n} of them wear glasses. What fraction of the class wears glasses? Simplify your answer.`,
    `A bag contains ${d} marbles, ${n} of which are red. What fraction of the marbles are red? Give your answer in simplest form.`,
  ])
  const reduction = g === 1
    ? `${n} and ${d} share no common factor, so ${n}/${d} is already in lowest terms.`
    : `The greatest common factor of ${n} and ${d} is ${g}, so ${n}/${d} reduces to ${answer}.`
  const shortcut = 'part divided by whole, then cancel common factors'
  const seed: QuestionSeed = {
    ...common(ctx, 'fundamental'),
    prompt,
    type: 'mcq',
    answer,
    distractors: fractionDistractors(f, [
      { n: d, d: n },
      { n: d - n, d },
      { n: n + 1, d },
      { n, d: d + 1 },
      { n: n - 1, d },
    ], rng),
    explanation: `The part-to-whole ratio is ${n}/${d}. ${reduction}`,
    steps: [
      `Whole = ${d} equal parts; selected = ${n} parts.`,
      `Write the fraction as ${n}/${d}.`,
      g === 1 ? `Nothing cancels, so the answer is ${answer}.` : `Divide both numbers by ${g} to get ${answer}.`,
    ],
    hints: makeHints(
      'Which number describes the whole, and which describes the chosen parts?',
      'Put the chosen parts in the numerator and the total parts in the denominator, then reduce.',
      `${shortcut}.`,
      `There are ${n} chosen parts out of ${d}, so begin with ${n}/${d}; ${g === 1 ? 'it is already in lowest terms' : `divide top and bottom by ${g}`} to reach ${answer}.`,
    ),
    shortcut: `${shortcut}.`,
  }
  return buildQuestion(seed)
}

function simplify(ctx: GenContext): GeneratedQuestion {
  const { rng } = ctx
  const maxB = ctx.difficulty === 'easy' ? 6 : ctx.difficulty === 'medium' ? 12 : 14
  const maxK = ctx.difficulty === 'easy' ? 4 : ctx.difficulty === 'medium' ? 8 : 10
  const b = int(rng, 2, maxB)
  const a = int(rng, 1, ctx.difficulty === 'hard' ? 2 * b - 1 : b - 1)
  const reduced = makeFrac(a, b)
  const k = int(rng, 2, maxK)
  const n = reduced.n * k
  const d = reduced.d * k
  const answer = fracText(reduced)
  const shortcut = `divide top and bottom by the gcd (${k})`
  const seed: QuestionSeed = {
    ...common(ctx, 'simplify'),
    prompt: `Simplify ${n}/${d} to its lowest terms.`,
    type: 'mcq',
    answer,
    distractors: fractionDistractors(reduced, [
      { n, d },
      { n: reduced.n, d },
      { n, d: reduced.d },
      { n: reduced.d, d: reduced.n },
      { n: reduced.n + 1, d: reduced.d },
      { n: reduced.n, d: reduced.d + 1 },
    ], rng),
    explanation: `The greatest common divisor of ${n} and ${d} is ${k}. Dividing both by ${k} gives ${answer}.`,
    steps: [
      `Find gcd(${n}, ${d}) = ${k}.`,
      `Numerator: ${n} ÷ ${k} = ${reduced.n}.`,
      `Denominator: ${d} ÷ ${k} = ${reduced.d}.`,
      `Write the simplified fraction: ${answer}.`,
    ],
    hints: makeHints(
      'Look for a factor that divides both the numerator and the denominator.',
      'Find the greatest common divisor, then divide both parts by it.',
      `${shortcut}.`,
      `gcd(${n}, ${d}) = ${k}, so ${n}/${d} = ${reduced.n}/${reduced.d} = ${answer}.`,
    ),
    shortcut: `${shortcut}.`,
  }
  return buildQuestion(seed)
}

function addFractions(ctx: GenContext): GeneratedQuestion {
  const { rng } = ctx
  const denomMax = ctx.difficulty === 'easy' ? 6 : ctx.difficulty === 'medium' ? 10 : 16
  const d1 = int(rng, 2, denomMax)
  let d2 = d1
  if (ctx.difficulty === 'hard') {
    d2 = int(rng, 2, denomMax)
    for (let i = 0; i < 8 && (d2 === d1 || gcd(d1, d2) > 2); i += 1) d2 = int(rng, 2, denomMax)
  } else if (ctx.difficulty === 'medium' && rng() < 0.5) {
    d2 = d1 * int(rng, 2, 3)
  }
  const maxN1 = ctx.difficulty === 'hard' ? 2 * d1 : d1 - 1
  const maxN2 = ctx.difficulty === 'hard' ? 2 * d2 : d2 - 1
  const n1 = int(rng, 1, Math.max(1, maxN1))
  let n2 = int(rng, 1, Math.max(1, maxN2))

  const combine = (rawN2: number) => {
    const first = makeFrac(n1, d1)
    const second = makeFrac(rawN2, d2)
    const divisor = gcd(first.d, second.d)
    const commonDen = (first.d / divisor) * second.d
    const firstScaled = first.n * (commonDen / first.d)
    const secondScaled = second.n * (commonDen / second.d)
    const numerator = firstScaled + secondScaled
    return { first, second, commonDen, firstScaled, secondScaled, numerator, result: makeFrac(numerator, commonDen) }
  }

  let combined = combine(n2)
  let guard = 0
  while (combined.result.d === 1 && guard < 8) {
    n2 += 1
    combined = combine(n2)
    guard += 1
  }
  const { first, second, commonDen, firstScaled, secondScaled, numerator, result } = combined
  const answer = fracText(result)
  const extras: Frac[] = [
    { n: numerator, d: commonDen },
    { n: first.n + second.n, d: first.d + second.d },
    { n: Math.abs(firstScaled - secondScaled), d: commonDen },
    { n: first.n + second.n, d: first.d },
    { n: numerator - 1, d: commonDen },
  ]
  if (result.n !== 0) extras.push({ n: result.d, d: result.n })

  const shortcut = 'common denominator, add numerators, then simplify'
  const seed: QuestionSeed = {
    ...common(ctx, 'add'),
    prompt: `What is ${fracText(first)} + ${fracText(second)}? Give your answer in simplest form.`,
    type: 'mcq',
    answer,
    distractors: fractionDistractors(result, extras, rng),
    explanation: `Using the common denominator ${commonDen}, ${fracText(first)} + ${fracText(second)} = ${numerator}/${commonDen} = ${answer}.`,
    steps: [
      `Fractions: ${fracText(first)} and ${fracText(second)}.`,
      `Common denominator of ${first.d} and ${second.d} is ${commonDen}.`,
      `Scaled numerators: ${firstScaled} and ${secondScaled}.`,
      `Add: ${numerator}/${commonDen} = ${answer}.`,
    ],
    hints: makeHints(
      'Fractions need matching denominators before you can add them.',
      'Find the lowest common denominator, rescale both fractions, then add the numerators.',
      `${shortcut}.`,
      `The common denominator is ${commonDen}: ${fracText(first)} becomes ${firstScaled}/${commonDen} and ${fracText(second)} becomes ${secondScaled}/${commonDen}, giving ${numerator}/${commonDen} = ${answer}.`,
    ),
    shortcut: `${shortcut}.`,
  }
  return buildQuestion(seed)
}

function subtractFractions(ctx: GenContext): GeneratedQuestion {
  const { rng } = ctx
  const denomMax = ctx.difficulty === 'easy' ? 6 : ctx.difficulty === 'medium' ? 10 : 16
  let d1 = int(rng, 2, denomMax)
  let d2 = d1
  if (ctx.difficulty === 'hard') {
    d2 = int(rng, 2, denomMax)
    for (let i = 0; i < 8 && (d2 === d1 || gcd(d1, d2) > 2); i += 1) d2 = int(rng, 2, denomMax)
  } else if (ctx.difficulty === 'medium' && rng() < 0.5) {
    d2 = d1 * int(rng, 2, 3)
  }
  const maxN1 = ctx.difficulty === 'hard' ? 2 * d1 : d1 - 1
  const maxN2 = ctx.difficulty === 'hard' ? 2 * d2 : d2 - 1
  let n1 = int(rng, 1, Math.max(1, maxN1))
  let n2 = int(rng, 1, Math.max(1, maxN2))

  if (ctx.difficulty !== 'hard' && fracValue(makeFrac(n1, d1)) < fracValue(makeFrac(n2, d2))) {
    ;[n1, n2] = [n2, n1]
    ;[d1, d2] = [d2, d1]
  }
  let negative = false
  if (ctx.difficulty === 'hard' && rng() < 0.35 && fracValue(makeFrac(n1, d1)) > fracValue(makeFrac(n2, d2))) {
    ;[n1, n2] = [n2, n1]
    ;[d1, d2] = [d2, d1]
    negative = true
  }
  if (fracValue(makeFrac(n1, d1)) === fracValue(makeFrac(n2, d2))) n1 += 1

  const combine = (rawN1: number) => {
    const first = makeFrac(rawN1, d1)
    const second = makeFrac(n2, d2)
    const divisor = gcd(first.d, second.d)
    const commonDen = (first.d / divisor) * second.d
    const firstScaled = first.n * (commonDen / first.d)
    const secondScaled = second.n * (commonDen / second.d)
    const numerator = firstScaled - secondScaled
    return { first, second, commonDen, firstScaled, secondScaled, numerator, result: makeFrac(numerator, commonDen) }
  }

  let combined = combine(n1)
  let guard = 0
  while (combined.result.d === 1 && guard < 8) {
    n1 += 1
    combined = combine(n1)
    guard += 1
  }
  const { first, second, commonDen, firstScaled, secondScaled, numerator, result } = combined
  const answer = fracText(result)
  const extras: Frac[] = [
    { n: numerator, d: commonDen },
    { n: firstScaled + secondScaled, d: commonDen },
    { n: first.n - second.n, d: commonDen },
    { n: -result.n, d: result.d },
    { n: first.n + second.n, d: commonDen },
    { n: numerator + 1, d: commonDen },
  ]
  if (result.n !== 0) extras.push({ n: result.d, d: result.n })

  const shortcut = 'common denominator, subtract numerators, then simplify'
  const seed: QuestionSeed = {
    ...common(ctx, 'subtract'),
    prompt: `What is ${fracText(first)} - ${fracText(second)}? Give your answer in simplest form.`,
    type: 'mcq',
    answer,
    distractors: fractionDistractors(result, extras, rng),
    explanation: `With a common denominator of ${commonDen}, ${fracText(first)} - ${fracText(second)} = ${numerator}/${commonDen} = ${answer}.${negative ? ' The answer is negative because the second fraction is larger.' : ''}`,
    steps: [
      `Fractions: ${fracText(first)} and ${fracText(second)}.`,
      `Common denominator of ${first.d} and ${second.d} is ${commonDen}.`,
      `Scaled numerators: ${firstScaled} and ${secondScaled}.`,
      `Subtract: ${numerator}/${commonDen} = ${answer}.`,
    ],
    hints: makeHints(
      'You cannot subtract numerators until the denominators match.',
      'Rescale both fractions to the lowest common denominator, then subtract the numerators.',
      `${shortcut}.`,
      `The common denominator is ${commonDen}: ${fracText(first)} becomes ${firstScaled}/${commonDen} and ${fracText(second)} becomes ${secondScaled}/${commonDen}, so the difference is ${numerator}/${commonDen} = ${answer}.`,
    ),
    shortcut: `${shortcut}.`,
  }
  return buildQuestion(seed)
}

function multiplyFractions(ctx: GenContext): GeneratedQuestion {
  const { rng } = ctx
  const denomMax = ctx.difficulty === 'easy' ? 6 : ctx.difficulty === 'medium' ? 10 : 16
  const d1 = int(rng, 2, denomMax)
  const d2 = int(rng, 2, denomMax)
  const maxN1 = ctx.difficulty === 'hard' ? 2 * d1 : d1 - 1
  const maxN2 = ctx.difficulty === 'hard' ? 2 * d2 : d2 - 1
  const n1 = int(rng, 1, Math.max(1, maxN1))
  let n2 = int(rng, 1, Math.max(1, maxN2))

  const compute = (rawN2: number) => {
    const first = makeFrac(n1, d1)
    const second = makeFrac(rawN2, d2)
    const rawN = first.n * second.n
    const rawD = first.d * second.d
    return { first, second, rawN, rawD, result: makeFrac(rawN, rawD) }
  }

  let combined = compute(n2)
  let guard = 0
  while (combined.result.d === 1 && guard < 8) {
    n2 += 1
    combined = compute(n2)
    guard += 1
  }
  const { first, second, rawN, rawD, result } = combined
  const answer = fracText(result)
  const extras: Frac[] = [
    { n: rawN, d: rawD },
    { n: first.n + second.n, d: first.d + second.d },
    { n: rawN, d: first.d },
    { n: first.n, d: rawD },
    { n: first.n * second.d, d: first.d * second.n },
  ]
  if (result.n !== 0) extras.push({ n: result.d, d: result.n })

  const shortcut = 'multiply straight across, then cancel'
  const seed: QuestionSeed = {
    ...common(ctx, 'multiply'),
    prompt: `Multiply ${fracText(first)} × ${fracText(second)}. Give your answer in simplest form.`,
    type: 'mcq',
    answer,
    distractors: fractionDistractors(result, extras, rng),
    explanation: `Multiplying straight across gives ${rawN}/${rawD}, which reduces to ${answer}.`,
    steps: [
      `Fractions: ${fracText(first)} and ${fracText(second)}.`,
      `Numerators: ${first.n} × ${second.n} = ${rawN}.`,
      `Denominators: ${first.d} × ${second.d} = ${rawD}.`,
      `Reduce ${rawN}/${rawD} to ${answer}.`,
    ],
    hints: makeHints(
      'Multiplication does not need a common denominator.',
      'Multiply the numerators together and the denominators together, then reduce.',
      `${shortcut}.`,
      `${fracText(first)} × ${fracText(second)} = (${first.n} × ${second.n})/(${first.d} × ${second.d}) = ${rawN}/${rawD} = ${answer}.`,
    ),
    shortcut: `${shortcut}.`,
  }
  return buildQuestion(seed)
}

function divideFractions(ctx: GenContext): GeneratedQuestion {
  const { rng } = ctx
  const denomMax = ctx.difficulty === 'easy' ? 6 : ctx.difficulty === 'medium' ? 10 : 16
  const d1 = int(rng, 2, denomMax)
  const d2 = int(rng, 2, denomMax)
  const maxN1 = ctx.difficulty === 'hard' ? 2 * d1 : d1 - 1
  const maxN2 = ctx.difficulty === 'hard' ? 2 * d2 : d2 - 1
  const n1 = int(rng, 1, Math.max(1, maxN1))
  let n2 = int(rng, 1, Math.max(1, maxN2))

  const compute = (rawN2: number) => {
    const first = makeFrac(n1, d1)
    const second = makeFrac(rawN2, d2)
    const rawN = first.n * second.d
    const rawD = first.d * second.n
    return { first, second, rawN, rawD, result: makeFrac(rawN, rawD) }
  }

  let combined = compute(n2)
  let guard = 0
  while (combined.result.d === 1 && guard < 8) {
    n2 += 1
    combined = compute(n2)
    guard += 1
  }
  const { first, second, rawN, rawD, result } = combined
  const answer = fracText(result)
  const extras: Frac[] = [
    { n: rawN, d: rawD },
    { n: first.n * second.n, d: first.d * second.d },
    { n: second.n * first.d, d: second.d * first.n },
    { n: first.n * second.d, d: first.d },
    { n: first.n, d: first.d * second.n },
    { n: -result.n, d: result.d },
  ]

  const shortcut = 'flip the second fraction, then multiply'
  const seed: QuestionSeed = {
    ...common(ctx, 'divide'),
    prompt: `Divide ${fracText(first)} by ${fracText(second)}. Give your answer in simplest form.`,
    type: 'mcq',
    answer,
    distractors: fractionDistractors(result, extras, rng),
    explanation: `Flipping ${fracText(second)} gives ${second.d}/${second.n}, so the product is ${rawN}/${rawD} = ${answer}.`,
    steps: [
      `Fractions: ${fracText(first)} and ${fracText(second)}.`,
      `Flip the divisor: ${fracText(second)} becomes ${second.d}/${second.n}.`,
      `Multiply: (${first.n} × ${second.d})/(${first.d} × ${second.n}) = ${rawN}/${rawD}.`,
      `Reduce to ${answer}.`,
    ],
    hints: makeHints(
      'Division by a fraction is multiplication by its reciprocal.',
      'Flip the second fraction, change the sign to multiplication, then multiply across.',
      `${shortcut}.`,
      `${fracText(first)} ÷ ${fracText(second)} = ${fracText(first)} × ${second.d}/${second.n} = ${rawN}/${rawD} = ${answer}.`,
    ),
    shortcut: `${shortcut}.`,
  }
  return buildQuestion(seed)
}

function toDecimal(ctx: GenContext): GeneratedQuestion {
  const { rng } = ctx
  const denominators = ctx.difficulty === 'easy'
    ? [2, 4, 5, 10, 20]
    : ctx.difficulty === 'medium'
      ? [4, 5, 8, 10, 16, 20, 25, 32, 40, 50, 100]
      : [3, 6, 7, 8, 9, 11, 12, 16, 20, 25, 40]
  const d = pick(rng, denominators)
  const n = int(rng, 1, ctx.difficulty === 'hard' ? 2 * d - 1 : d - 1)
  const f = makeFrac(n, d)
  const exact = f.n / f.d
  const value = cleanNumber(round(exact, 2))
  const answer = fmt(value)
  const needsRounding = Math.abs(exact - value) > 1e-9
  const approx = exact.toFixed(3)
  const shortcut = 'a fraction is a division: numerator ÷ denominator'
  const seed: QuestionSeed = {
    ...common(ctx, 'toDecimal'),
    prompt: `Convert ${fracText(f)} to a decimal.${needsRounding ? ' Round your answer to 2 decimal places.' : ' Give your answer as a decimal.'}`,
    type: 'numeric',
    answer,
    numericAnswer: value,
    tolerance: 0.011,
    explanation: needsRounding
      ? `${f.n} ÷ ${f.d} = ${approx}…, which rounds to ${answer}.`
      : `${f.n} ÷ ${f.d} = ${answer} exactly.`,
    steps: [
      `A fraction means division: ${fracText(f)} = ${f.n} ÷ ${f.d}.`,
      needsRounding ? `The division gives about ${approx}.` : `The division gives exactly ${answer}.`,
      needsRounding ? `Round to 2 decimal places: ${answer}.` : `So the decimal is ${answer}.`,
    ],
    hints: makeHints(
      'Remember that the fraction bar means "divided by".',
      'Divide the numerator by the denominator and keep track of the decimal point.',
      `${shortcut}.`,
      `${fracText(f)} means ${f.n} ÷ ${f.d} = ${needsRounding ? `${approx}…, which rounds to ` : ''}${answer}.`,
    ),
    shortcut: `${shortcut}.`,
  }
  return buildQuestion(seed)
}

function toPercent(ctx: GenContext): GeneratedQuestion {
  const { rng } = ctx
  const denominators = ctx.difficulty === 'easy'
    ? [2, 4, 5, 10, 20, 25]
    : ctx.difficulty === 'medium'
      ? [4, 5, 8, 10, 16, 20, 25, 40, 50, 100]
      : [3, 6, 7, 8, 12, 16, 40]
  const d = pick(rng, denominators)
  const n = int(rng, 1, ctx.difficulty === 'hard' ? 2 * d - 1 : d - 1)
  const f = makeFrac(n, d)
  const exact = (f.n / f.d) * 100
  const value = cleanNumber(round(exact, 2))
  const answer = fmt(value)
  const needsRounding = Math.abs(exact - value) > 1e-9
  const approx = exact.toFixed(3)
  const displayExact = needsRounding ? `${approx}…` : fmt(exact)
  const shortcut = 'fraction × 100 gives the percent value'
  const seed: QuestionSeed = {
    ...common(ctx, 'percent'),
    prompt: `Convert ${fracText(f)} to a percentage. Give the percent value as a number (for example, 60 means 60%).${needsRounding ? ' Round to 2 decimal places.' : ''}`,
    type: 'numeric',
    answer,
    numericAnswer: value,
    tolerance: 0.011,
    answerUnit: '%',
    explanation: `${fracText(f)} × 100 = ${displayExact}, so the percent value is ${answer}.`,
    steps: [
      'To change a fraction into a percent, multiply by 100.',
      `${fracText(f)} × 100 = ${displayExact}.`,
      needsRounding ? `Rounded to 2 decimal places: ${answer}.` : `The percent value is ${answer}.`,
    ],
    hints: makeHints(
      'A percent is a number out of 100.',
      'Multiply the fraction by 100 and simplify the result.',
      `${shortcut}.`,
      `${fracText(f)} × 100 = ${displayExact}, so enter ${answer}${needsRounding ? ' after rounding to 2 decimals' : ''}.`,
    ),
    shortcut: `${shortcut}.`,
  }
  return buildQuestion(seed)
}

function decimalOperand(rng: RNG, places: number, maxWhole: number, minWhole = 0): Dec {
  const scale = 10 ** places
  const whole = int(rng, minWhole, maxWhole)
  const frac = int(rng, 0, scale - 1)
  const value = cleanNumber((whole * scale + frac) / scale)
  return { text: fmt(value), value }
}

function decimalCalc(ctx: GenContext): GeneratedQuestion {
  const { rng } = ctx
  const places = ctx.difficulty === 'easy' ? 1 : ctx.difficulty === 'medium' ? (rng() < 0.5 ? 1 : 2) : 2
  const maxWhole = ctx.difficulty === 'easy' ? 9 : ctx.difficulty === 'medium' ? 15 : 25
  const ops = ['add', 'subtract', 'multiply', 'divide'] as const
  type DecimalOp = (typeof ops)[number]
  const rawOp = ctx.spec.params?.op
  const op: DecimalOp = typeof rawOp === 'string' && (ops as readonly string[]).includes(rawOp)
    ? (rawOp as DecimalOp)
    : pick(rng, ops)

  let a = decimalOperand(rng, places, maxWhole)
  let b = decimalOperand(rng, places, maxWhole, 1)
  let firstValue = 0
  let firstLine = ''

  if (op === 'add') {
    firstValue = cleanNumber(round(a.value + b.value, 2))
    firstLine = `Add directly: ${a.text} + ${b.text} = ${fmt(firstValue)}.`
  } else if (op === 'subtract') {
    if (a.value < b.value) [a, b] = [b, a]
    firstValue = cleanNumber(round(a.value - b.value, 2))
    firstLine = `Subtract: ${a.text} - ${b.text} = ${fmt(firstValue)}.`
  } else if (op === 'multiply') {
    const raw = a.value * b.value
    firstValue = cleanNumber(round(raw, 2))
    firstLine = `Multiply across: ${a.text} × ${b.text} = ${fmt(cleanNumber(raw))}, which rounds to ${fmt(firstValue)}.`
  } else {
    const qPlaces = ctx.difficulty === 'hard' && rng() < 0.5 ? 1 : 0
    const qScale = 10 ** qPlaces
    const qInt = int(rng, 2, qPlaces === 1 ? 40 : 12)
    const quotient = cleanNumber(qInt / qScale)
    const dividend = cleanNumber(b.value * quotient)
    a = { text: fmt(dividend), value: dividend }
    firstValue = quotient
    firstLine = `Divide: ${a.text} ÷ ${b.text} = ${fmt(quotient)} because ${b.text} × ${fmt(quotient)} = ${a.text}.`
  }

  let expression = op === 'divide'
    ? `${a.text} ÷ ${b.text}`
    : op === 'multiply'
      ? `${a.text} × ${b.text}`
      : `${a.text} ${op === 'add' ? '+' : '-'} ${b.text}`
  let secondLine = ''
  let value = firstValue

  if (ctx.difficulty === 'hard' && rng() < 0.5) {
    const c = decimalOperand(rng, places, maxWhole)
    const plus = rng() < 0.5
    value = cleanNumber(round(plus ? firstValue + c.value : firstValue - c.value, 2))
    expression = `${expression} ${plus ? '+' : '-'} ${c.text}`
    secondLine = `Then ${plus ? 'add' : 'subtract'} ${c.text}: ${fmt(firstValue)} ${plus ? '+' : '-'} ${c.text} = ${fmt(value)}.`
  }

  const answer = fmt(value)
  const shortcut = 'track decimal places, then round at the end'
  const seed: QuestionSeed = {
    ...common(ctx, 'decimalCalc'),
    prompt: `Calculate ${expression}. Give your answer as a decimal, rounded to 2 decimal places if needed.`,
    type: 'numeric',
    answer,
    numericAnswer: value,
    tolerance: 0.011,
    explanation: `${firstLine}${secondLine ? ` ${secondLine}` : ''} So the answer is ${answer}.`,
    steps: [
      `Work through the expression: ${expression}.`,
      firstLine,
      ...(secondLine ? [secondLine] : []),
      `Final answer: ${answer}.`,
    ],
    hints: makeHints(
      'Treat the decimal point carefully and do one operation at a time.',
      'Line up decimals for add and subtract; count places for multiply; scale to a whole divisor for divide.',
      `${shortcut}.`,
      `${firstLine}${secondLine ? ` ${secondLine}` : ''} The final answer is ${answer}.`,
    ),
    shortcut: `${shortcut}.`,
  }
  return buildQuestion(seed)
}

export function generateFractions(ctx: GenContext, family: string): GeneratedQuestion {
  if (family === 'fractionOp') {
    const op = ctx.spec.params?.op
    switch (op) {
      case 'fundamental': return fundamental(ctx)
      case 'simplify': return simplify(ctx)
      case 'add': return addFractions(ctx)
      case 'subtract': return subtractFractions(ctx)
      case 'multiply': return multiplyFractions(ctx)
      case 'divide': return divideFractions(ctx)
      case 'toDecimal': return toDecimal(ctx)
      case 'percent': return toPercent(ctx)
      default:
        throw new Error(
          `generateFractions: unknown fractionOp op "${String(op)}" (expected fundamental, simplify, add, subtract, multiply, divide, toDecimal or percent)`,
        )
    }
  }
  if (family === 'decimalCalc') return decimalCalc(ctx)
  throw new Error(`generateFractions: unknown family "${family}" (expected fractionOp or decimalCalc)`)
}

