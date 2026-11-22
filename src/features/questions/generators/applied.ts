import type { GenContext } from '../index'
import type { GeneratedQuestion, GeneratorSpec, QuestionOptions } from '@/lib/types'
import { buildQuestion, makeHints } from '../builders'
import type { QuestionSeed } from '../builders'
import { cleanNumber, fmt, gcd, hashString, int, lcm, mulberry32, pick, round } from '../random'
import type { RNG } from '../random'

type SeedData = Pick<QuestionSeed, 'prompt' | 'type' | 'answer' | 'explanation' | 'steps' | 'hints' | 'shortcut'> &
  Partial<Pick<QuestionSeed, 'numericAnswer' | 'tolerance' | 'distractors' | 'answerUnit' | 'timeTargetSec'>>

function finish(ctx: GenContext, family: string, kind: string, data: SeedData): GeneratedQuestion {
  return buildQuestion({
    specKey: `${ctx.spec.family}:${JSON.stringify(ctx.spec.params ?? {})}`,
    variant: ctx.variant,
    rng: ctx.rng,
    concept: ctx.spec.concept ?? `${family}-${kind}`,
    conceptLabel: ctx.spec.conceptLabel ?? '',
    subtopic: kind,
    difficulty: ctx.difficulty,
    levelId: ctx.levelId,
    chapterId: ctx.chapterId,
    ...data,
  })
}

function mag(ctx: GenContext, easy: number, medium: number, hard: number): number {
  return ctx.difficulty === 'easy' ? easy : ctx.difficulty === 'medium' ? medium : hard
}

function num(value: number): Pick<QuestionSeed, 'answer' | 'numericAnswer' | 'tolerance'> {
  const v = cleanNumber(value)
  return { answer: fmt(v), numericAnswer: v, tolerance: Number.isInteger(v) ? undefined : 0.011 }
}

function wrongOptions(correct: string, candidates: (string | number)[]): string[] {
  const seen = new Set<string>([correct.toLowerCase()])
  const result: string[] = []
  for (const candidate of candidates) {
    const text = typeof candidate === 'number' ? fmt(candidate) : candidate
    const key = text.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(text)
    }
  }
  return result
}

function coprimePair(ctx: GenContext, min: number, max: number): [number, number] {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const a = int(ctx.rng, min, max)
    const b = int(ctx.rng, min, max)
    if (a !== b && gcd(a, b) === 1) return [a, b]
  }
  return [min, min + 1]
}

interface EqualLeg {
  s1: number
  s2: number
  distance: number
  t1: number
  t2: number
  average: number
}

function hoursWord(n: number): string {
  return n === 1 ? 'hour' : 'hours'
}

function traveller(speed: number): string {
  return speed >= 250 ? 'An aircraft' : 'A vehicle'
}

/**
 * Equal distances out and back. Speeds are h·k·x and h·k·y with x, y coprime;
 * h is (x + y) or half of it, which guarantees a whole-number harmonic mean.
 */
function equalLeg(ctx: GenContext): EqualLeg {
  const [x, y] = pick(ctx.rng, [[2, 3], [2, 5], [3, 4], [3, 5]])
  const sum = x + y
  const h = sum % 2 === 0 ? sum / 2 : sum
  const k = int(ctx.rng, mag(ctx, 3, 6, 12), mag(ctx, 6, 12, 24))
  const s1 = h * k * x
  const s2 = h * k * y
  const distance = lcm(s1, s2)
  const t1 = distance / s1
  const t2 = distance / s2
  return { s1, s2, distance, t1, t2, average: (2 * distance) / (t1 + t2) }
}

function ratio(ctx: GenContext, kind: string): GeneratedQuestion {
  const build = (data: SeedData) => finish(ctx, 'ratioProblem', kind, data)
  switch (kind) {
    case 'understand': {
      const factor = int(ctx.rng, mag(ctx, 1, 2, 3), mag(ctx, 3, 5, 8))
      const [a, b] = coprimePair(ctx, 2, mag(ctx, 5, 7, 9))
      const red = factor * a
      const blue = factor * b
      const correct = `${a}:${b}`
      return build({
        prompt: `A flight club has ${red} red and ${blue} blue model aircraft. Which ratio compares red aircraft to blue aircraft in simplest form?`,
        type: 'mcq',
        answer: correct,
        distractors: wrongOptions(correct, [`${b}:${a}`, `${a}:${a + b}`, `${a + b}:${b}`, `${red}:${blue}`]),
        explanation: `Red : blue is ${red}:${blue}; dividing both counts by ${gcd(red, blue)} gives ${correct}.`,
        steps: [
          `Write red : blue = ${red}:${blue}.`,
          `Divide both counts by their common factor ${gcd(red, blue)}.`,
          `The simplest part-to-part ratio is ${correct}.`,
        ],
        hints: makeHints(
          'Compare red to blue, in that exact order.',
          `Find the common factor of ${red} and ${blue}, then divide both counts.`,
          'Cancel the same factor from both parts of a part-to-part ratio.',
          `Red : blue = ${red}:${blue}; the common factor is ${gcd(red, blue)}, so the ratio is ${correct}.`,
        ),
        shortcut: 'Cancel the common factor from both parts of a part-to-part ratio.',
      })
    }
    case 'simplify': {
      const factor = int(ctx.rng, mag(ctx, 2, 3, 4), mag(ctx, 5, 9, 12))
      if (ctx.difficulty === 'hard' && ctx.rng() < 0.5) {
        let a = 2
        let b = 3
        let c = 5
        for (let attempt = 0; attempt < 32; attempt += 1) {
          const x = int(ctx.rng, 2, 9)
          const y = int(ctx.rng, 2, 9)
          const z = int(ctx.rng, 2, 9)
          if (gcd(gcd(x, y), z) === 1 && new Set([x, y, z]).size === 3) {
            a = x
            b = y
            c = z
            break
          }
        }
        const correct = `${a}:${b}:${c}`
        return build({
          prompt: `Simplify the ratio ${factor * a}:${factor * b}:${factor * c} to its lowest terms.`,
          type: 'mcq',
          answer: correct,
          distractors: wrongOptions(correct, [
            `${factor * a}:${factor * b}:${factor * c}`,
            `${c}:${b}:${a}`,
            `${a}:${factor * b}:${c}`,
            `${a + b}:${b}:${c}`,
          ]),
          explanation: `The common factor of all three parts is ${factor}. Dividing each part by it gives ${correct}.`,
          steps: [
            `Find the common factor: ${factor}.`,
            `Divide ${factor * a}, ${factor * b} and ${factor * c} by ${factor}.`,
            `The lowest-term ratio is ${correct}.`,
          ],
          hints: makeHints(
            'Look for one factor common to all three parts.',
            `Divide each of the three parts by ${factor}.`,
            'Divide every part, not just one of them.',
            `gcd(${factor * a}, ${factor * b}, ${factor * c}) = ${factor}, so the ratio simplifies to ${correct}.`,
          ),
          shortcut: 'Divide every part of a ratio by the greatest common factor.',
        })
      }
      const [a, b] = coprimePair(ctx, 2, mag(ctx, 6, 9, 12))
      const x = factor * a
      const y = factor * b
      const correct = `${a}:${b}`
      return build({
        prompt: `Simplify the ratio ${x}:${y} to its lowest terms.`,
        type: 'mcq',
        answer: correct,
        distractors: wrongOptions(correct, [`${b}:${a}`, `${x}:${y}`, `${a}:${y}`, `${x}:${b}`, `${a + b}:${b}`]),
        explanation: `The greatest common factor of ${x} and ${y} is ${factor}. Dividing both parts by it gives ${correct}.`,
        steps: [
          `Find gcd(${x}, ${y}) = ${factor}.`,
          `Divide both parts by ${factor}.`,
          `The simplified ratio is ${correct}.`,
        ],
        hints: makeHints(
          'Both numbers share a common factor.',
          `Divide ${x} and ${y} by ${factor}.`,
          'A ratio is simplest when its parts are coprime.',
          `gcd(${x}, ${y}) = ${factor}, so ${x}:${y} = ${correct}.`,
        ),
        shortcut: 'Divide both parts of a ratio by their greatest common factor.',
      })
    }
    case 'divide': {
      const [a, b] = coprimePair(ctx, 2, mag(ctx, 5, 8, 12))
      const onePart = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 7, 18, 36))
      const total = onePart * (a + b)
      const unit = pick(ctx.rng, ['kg', 'litres', '₹'])
      const amount = unit === '₹' ? `₹${total}` : `${total} ${unit}`
      const difference = ctx.difficulty !== 'easy' && ctx.rng() < 0.4
      const answer = difference ? onePart * Math.abs(a - b) : onePart * a
      const prompt = difference
        ? `A total of ${amount} is shared in the ratio ${a}:${b}. How many more ${unit === '₹' ? 'rupees' : unit} does the first party get than the second?`
        : `A total of ${amount} is shared in the ratio ${a}:${b}. How much does the first party receive?`
      const finalStep = difference
        ? `Difference = ${onePart} × |${a} − ${b}| = ${answer}.`
        : `First share = ${onePart} × ${a} = ${answer}.`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: unit,
        explanation: `The ${a + b} parts total ${amount}, so one part is ${total}/${a + b} = ${onePart}. ${finalStep}`,
        steps: [
          `Add the parts: ${a} + ${b} = ${a + b}.`,
          `One part = ${total}/${a + b} = ${onePart}.`,
          finalStep,
        ],
        hints: makeHints(
          'Add the ratio parts before sharing.',
          `One part is ${total} divided by ${a + b}.`,
          'Find one part, then scale it by the required number of parts.',
          `Total parts = ${a + b}; one part = ${onePart}; ${finalStep}`,
        ),
        shortcut: 'One share = total ÷ (sum of ratio parts), then multiply.',
      })
    }
    case 'direct': {
      const item = pick(ctx.rng, [['notebook', 'notebooks'], ['kg of rice', 'kg of rice'], ['litre of fuel', 'litres of fuel']] as const)
      const [one, many] = item
      const each = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 9, 25, 60))
      const n1 = int(ctx.rng, 2, mag(ctx, 5, 8, 12))
      let n2 = int(ctx.rng, 3, mag(ctx, 7, 12, 20))
      if (n2 === n1) n2 += 1
      const cost1 = each * n1
      const cost2 = each * n2
      const reverse = ctx.difficulty !== 'easy' && ctx.rng() < 0.4
      const answer = reverse ? n2 : cost2
      const prompt = reverse
        ? `If ${n1} ${many} cost ₹${cost1}, how many ${many} can be bought for ₹${cost2}?`
        : `If ${n1} ${many} cost ₹${cost1}, what do ${n2} ${many} cost?`
      const finalStep = reverse
        ? `Number affordable = ${cost2}/${each} = ${n2}.`
        : `Cost of ${n2} ${many} = ${n2} × ${each} = ${cost2}.`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: reverse ? many : '₹',
        explanation: `One ${one} costs ${cost1}/${n1} = ₹${each}. ${finalStep}`,
        steps: [
          `Cost of one ${one} = ${cost1}/${n1} = ${each}.`,
          reverse ? `Divide the money by the unit cost: ${cost2}/${each}.` : `Multiply the unit cost by ${n2}.`,
          finalStep,
        ],
        hints: makeHints(
          'Find the cost of a single item first.',
          `Divide ${cost1} by ${n1} to get the unit cost.`,
          'Direct proportion: more items cost proportionally more.',
          `Unit cost = ₹${each}; ${finalStep}`,
        ),
        shortcut: 'Unitary method: find the value of one, then scale.',
      })
    }
    case 'inverse': {
      const [a, b] = coprimePair(ctx, 2, mag(ctx, 4, 6, 8))
      const baseTime = int(ctx.rng, mag(ctx, 4, 8, 12), mag(ctx, 12, 24, 40))
      const teams1 = a * b
      const teams2 = pick(ctx.rng, [a, b])
      const answer = baseTime * (teams1 / teams2)
      return build({
        prompt: `If ${teams1} technicians complete a job in ${baseTime} hours, how many hours will ${teams2} technicians need at the same rate?`,
        type: 'numeric',
        ...num(answer),
        answerUnit: 'hours',
        explanation: `Total work is ${teams1} × ${baseTime} = ${teams1 * baseTime} technician-hours. Divided among ${teams2} technicians, that is ${answer} hours.`,
        steps: [
          `Total work = ${teams1} × ${baseTime} = ${teams1 * baseTime} technician-hours.`,
          `With ${teams2} technicians, divide by ${teams2}.`,
          `Time = ${teams1 * baseTime}/${teams2} = ${answer} hours.`,
        ],
        hints: makeHints(
          'Fewer workers means more time, not less.',
          `Keep the total work ${teams1 * baseTime} technician-hours constant.`,
          'Inverse proportion: workers × time stays fixed.',
          `${teams1} × ${baseTime} = ${teams2} × time, so time = ${answer} hours.`,
        ),
        shortcut: 'Inverse proportion: multiply the pairs equal — W₁ × T₁ = W₂ × T₂.',
      })
    }
    case 'scale': {
      const perCm = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 10, 30, 80))
      const refCm = int(ctx.rng, 2, mag(ctx, 3, 5, 6))
      const refKm = refCm * perCm
      const mapCm = int(ctx.rng, 3, mag(ctx, 12, 25, 60))
      const reverse = ctx.difficulty !== 'easy' && ctx.rng() < 0.5
      const answer = reverse ? mapCm : mapCm * perCm
      const prompt = reverse
        ? `A map uses a scale of ${refCm} cm to ${refKm} km. Two towns are ${mapCm * perCm} km apart in reality. How far apart are they on the map, in cm?`
        : `A map uses a scale of ${refCm} cm to ${refKm} km. Two towns are ${mapCm} cm apart on the map. What is the real distance in km?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: reverse ? 'cm' : 'km',
        explanation: `One map centimetre represents ${refKm}/${refCm} = ${perCm} km, so ${reverse ? `${mapCm * perCm} km is ${mapCm} cm` : `${mapCm} cm is ${mapCm * perCm} km`}.`,
        steps: [
          `Find the scale per cm: ${refKm}/${refCm} = ${perCm} km.`,
          reverse ? `Divide the real distance by ${perCm}.` : `Multiply the map distance by ${perCm}.`,
          reverse ? `Map distance = ${answer} cm.` : `Real distance = ${answer} km.`,
        ],
        hints: makeHints(
          'First work out what one centimetre represents.',
          `${refCm} cm = ${refKm} km, so 1 cm = ${perCm} km.`,
          'Scale questions are unitary: find one unit, then scale.',
          `1 cm = ${perCm} km; the answer is ${answer} ${reverse ? 'cm' : 'km'}.`,
        ),
        shortcut: 'Reduce the scale to “1 cm = … km”, then multiply or divide.',
      })
    }
    case 'mixtures': {
      const [x, y] = coprimePair(ctx, 1, mag(ctx, 6, 9, 12))
      const first = Math.max(x, y)
      const second = Math.min(x, y)
      const batches = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 8, 20, 50))
      const total = batches * (first + second)
      const ingredient = pick(ctx.rng, ['petrol', 'red paint', 'cement'])
      const other = ingredient === 'petrol' ? 'oil' : ingredient === 'red paint' ? 'white paint' : 'sand'
      const difference = ctx.difficulty === 'hard' && ctx.rng() < 0.5
      const answer = difference ? batches * (first - second) : batches * first
      const prompt = difference
        ? `A ${ingredient} and ${other} blend is mixed in the ratio ${first}:${second}. If ${total} litres are made, how many more litres of ${ingredient} than ${other} are used?`
        : `A ${ingredient} and ${other} blend is mixed in the ratio ${first}:${second}. If ${total} litres are made, how many litres of ${ingredient} are used?`
      const finalStep = difference
        ? `Difference = ${batches} × (${first} − ${second}) = ${answer} litres.`
        : `${ingredient} = ${batches} × ${first} = ${answer} litres.`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: 'litres',
        explanation: `There are ${first + second} parts in ${total} litres, so one part is ${batches} litres. ${finalStep}`,
        steps: [
          `Add the parts: ${first} + ${second} = ${first + second}.`,
          `One part = ${total}/${first + second} = ${batches} litres.`,
          finalStep,
        ],
        hints: makeHints(
          'Split the blend into equal ratio parts.',
          `One part is ${total} ÷ ${first + second} litres.`,
          'Amount = (parts required) × (value of one part).',
          `One part = ${batches} litres; ${finalStep}`,
        ),
        shortcut: 'Find one ratio part, then multiply by the parts you need.',
      })
    }
    default:
      throw new Error(`Unknown kind "${kind}" for family ratioProblem`)
  }
}

function unitary(ctx: GenContext, kind: string): GeneratedQuestion {
  const build = (data: SeedData) => finish(ctx, 'unitaryProblem', kind, data)
  switch (kind) {
    case 'pricePerUnit': {
      const item = pick(ctx.rng, [['notebook', 'notebooks'], ['kg of rice', 'kg of rice'], ['litre of milk', 'litres of milk']] as const)
      const [one, many] = item
      const each = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 9, 25, 60))
      const n = int(ctx.rng, 2, mag(ctx, 6, 10, 15))
      const total = each * n
      const askMore = ctx.difficulty !== 'easy' && ctx.rng() < 0.5
      let more = int(ctx.rng, 2, mag(ctx, 6, 12, 20))
      if (more === n) more += 1
      const answer = askMore ? each * more : each
      const prompt = askMore
        ? `${n} ${many} cost ₹${total}. What do ${more} ${many} cost?`
        : `${n} ${many} cost ₹${total}. What is the cost of one ${one}?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: '₹',
        explanation: `One ${one} costs ${total}/${n} = ₹${each}. ${askMore ? `${more} cost ${more} × ${each} = ₹${answer}.` : `The unit price is ₹${answer}.`}`,
        steps: [
          `Total cost = ₹${total} for ${n} ${many}.`,
          `Unit cost = ${total}/${n} = ₹${each}.`,
          askMore ? `Cost of ${more} = ${more} × ${each} = ₹${answer}.` : `One ${one} costs ₹${answer}.`,
        ],
        hints: makeHints(
          'Start by pricing a single item.',
          `Divide ${total} by ${n}.`,
          'Unitary method: find one, then multiply.',
          `Unit cost = ₹${each}, so the answer is ₹${answer}.`,
        ),
        shortcut: 'Value of one = total ÷ number of units.',
      })
    }
    case 'quantityCost': {
      const item = pick(ctx.rng, [['pen', 'pens'], ['notebook', 'notebooks'], ['ticket', 'tickets']] as const)
      const [one, many] = item
      const each = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 9, 30, 60))
      const n1 = int(ctx.rng, 2, mag(ctx, 5, 8, 12))
      let n2 = int(ctx.rng, 2, mag(ctx, 6, 10, 20))
      if (n2 === n1) n2 += 1
      const cost1 = each * n1
      const cost2 = each * n2
      const askCount = ctx.difficulty !== 'easy' && ctx.rng() < 0.5
      const answer = askCount ? n2 : cost2
      const prompt = askCount
        ? `If ${n1} ${many} cost ₹${cost1}, how many ${many} can be bought for ₹${cost2}?`
        : `If ${n1} ${many} cost ₹${cost1}, what is the cost of ${n2} ${many}?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: askCount ? many : '₹',
        explanation: `One ${one} costs ${cost1}/${n1} = ₹${each}. ${askCount ? `${cost2}/${each} = ${n2} ${many}.` : `${n2} × ${each} = ₹${cost2}.`}`,
        steps: [
          `Unit cost = ${cost1}/${n1} = ₹${each}.`,
          askCount ? `Divide the budget by the unit cost.` : `Multiply the unit cost by ${n2}.`,
          askCount ? `You can buy ${answer} ${many}.` : `Total cost = ₹${answer}.`,
        ],
        hints: makeHints(
          'Work out the price of one item first.',
          `Divide ₹${cost1} by ${n1}.`,
          'Then either multiply up or divide the budget.',
          `One ${one} = ₹${each}; the answer is ${answer}.`,
        ),
        shortcut: 'Unit cost first; then scale up or down.',
      })
    }
    case 'consumption': {
      const resource = pick(ctx.rng, ['litres of water', 'units of electricity', 'kg of grain'])
      const rate = int(ctx.rng, mag(ctx, 2, 5, 8), mag(ctx, 10, 20, 40))
      const h1 = int(ctx.rng, 2, mag(ctx, 4, 8, 12))
      let h2 = int(ctx.rng, 2, mag(ctx, 6, 12, 24))
      if (h2 === h1) h2 += 1
      const used1 = rate * h1
      const used2 = rate * h2
      const reverse = ctx.difficulty !== 'easy' && ctx.rng() < 0.4
      const answer = reverse ? h2 : used2
      const prompt = reverse
        ? `A machine uses ${used1} ${resource} in ${h1} hours. How many hours does it take to use ${used2} ${resource}?`
        : `A machine uses ${used1} ${resource} in ${h1} hours. How many ${resource} will it use in ${h2} hours?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: reverse ? 'hours' : resource,
        explanation: `Consumption is ${used1}/${h1} = ${rate} ${resource} per hour. ${reverse ? `${used2}/${rate} = ${h2} hours.` : `${h2} × ${rate} = ${used2} ${resource}.`}`,
        steps: [
          `Rate = ${used1}/${h1} = ${rate} per hour.`,
          reverse ? `Divide the amount by the hourly rate.` : `Multiply the rate by ${h2} hours.`,
          reverse ? `Time = ${answer} hours.` : `Consumption = ${answer} ${resource}.`,
        ],
        hints: makeHints(
          'Find the amount used in one hour.',
          `${used1} ÷ ${h1} gives the hourly rate.`,
          'Consumption per hour × hours = total used.',
          `Hourly rate = ${rate}; the answer is ${answer}.`,
        ),
        shortcut: 'Find the per-hour rate, then scale to the new time.',
      })
    }
    case 'production': {
      const item = pick(ctx.rng, [['part', 'parts'], ['widget', 'widgets'], ['packet', 'packets']] as const)
      const [one, many] = item
      const rate = int(ctx.rng, mag(ctx, 3, 8, 15), mag(ctx, 12, 40, 120))
      const h1 = int(ctx.rng, 2, mag(ctx, 4, 8, 12))
      let h2 = int(ctx.rng, 2, mag(ctx, 6, 12, 24))
      if (h2 === h1) h2 += 1
      const out1 = rate * h1
      const out2 = rate * h2
      const reverse = ctx.difficulty !== 'easy' && ctx.rng() < 0.4
      const answer = reverse ? h2 : out2
      const prompt = reverse
        ? `A machine makes ${out1} ${many} in ${h1} hours. How many hours are needed to make ${out2} ${many}?`
        : `A machine makes ${out1} ${many} in ${h1} hours. How many ${many} will it make in ${h2} hours?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: reverse ? 'hours' : many,
        explanation: `Output rate is ${out1}/${h1} = ${rate} ${many} per hour. ${reverse ? `${out2}/${rate} = ${h2} hours.` : `${h2} × ${rate} = ${out2} ${many}.`}`,
        steps: [
          `Rate = ${out1}/${h1} = ${rate} ${one}s per hour.`,
          reverse ? `Divide the target output by the rate.` : `Multiply the rate by ${h2} hours.`,
          reverse ? `Time = ${answer} hours.` : `Output = ${answer} ${many}.`,
        ],
        hints: makeHints(
          'Find how many are made in one hour.',
          `Divide ${out1} by ${h1}.`,
          'Rate × time = output.',
          `Hourly rate = ${rate}; the answer is ${answer}.`,
        ),
        shortcut: 'Find the one-hour rate, then scale.',
      })
    }
    case 'fuel': {
      const per100 = int(ctx.rng, mag(ctx, 4, 6, 8), mag(ctx, 10, 18, 30))
      const m1 = int(ctx.rng, 2, mag(ctx, 4, 8, 12))
      let m2 = int(ctx.rng, 2, mag(ctx, 6, 12, 24))
      if (m2 === m1) m2 += 1
      const fuel1 = per100 * m1
      const fuel2 = per100 * m2
      const reverse = ctx.difficulty !== 'easy' && ctx.rng() < 0.4
      const answer = reverse ? 100 * m2 : fuel2
      const prompt = reverse
        ? `A car uses ${fuel1} litres over ${100 * m1} km. How far can it travel on ${fuel2} litres at the same rate?`
        : `A car uses ${fuel1} litres over ${100 * m1} km. How many litres will it use over ${100 * m2} km at the same rate?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: reverse ? 'km' : 'litres',
        explanation: `The car burns ${fuel1}/${m1} = ${per100} litres per 100 km. ${reverse ? `${m2} hundred km = ${answer} km.` : `${m2} × ${per100} = ${answer} litres.`}`,
        steps: [
          `Fuel per 100 km = ${fuel1}/${m1} = ${per100} litres.`,
          reverse ? `Each 100 km costs ${per100} litres.` : `There are ${m2} blocks of 100 km.`,
          reverse ? `Distance = ${answer} km.` : `Fuel needed = ${answer} litres.`,
        ],
        hints: makeHints(
          'Normalise the fuel use to 100 km.',
          `${fuel1} ÷ ${m1} gives litres per 100 km.`,
          'Keep the 100 km block as your unit.',
          `Fuel per 100 km = ${per100} litres; the answer is ${answer}.`,
        ),
        shortcut: 'Find litres per 100 km, then scale the number of 100 km blocks.',
      })
    }
    case 'timeWork': {
      const [a, b] = coprimePair(ctx, 2, mag(ctx, 4, 6, 8))
      const perPerson = int(ctx.rng, mag(ctx, 3, 6, 10), mag(ctx, 10, 20, 40))
      const people1 = a * b
      const people2 = pick(ctx.rng, [a, b])
      const answer = perPerson * (people1 / people2)
      return build({
        prompt: `If ${people1} workers finish a job in ${perPerson} days, how many days will ${people2} workers need at the same rate?`,
        type: 'numeric',
        ...num(answer),
        answerUnit: 'days',
        explanation: `The job needs ${people1} × ${perPerson} = ${people1 * perPerson} worker-days. With ${people2} workers it takes ${answer} days.`,
        steps: [
          `Total effort = ${people1} × ${perPerson} = ${people1 * perPerson} worker-days.`,
          `Divide by ${people2} workers.`,
          `Days needed = ${answer}.`,
        ],
        hints: makeHints(
          'Fewer workers need more days.',
          `Total work is ${people1 * perPerson} worker-days.`,
          'Workers × days stays constant for the same job.',
          `${people1} × ${perPerson} = ${people2} × days, so days = ${answer}.`,
        ),
        shortcut: 'Inverse proportion: W₁ × D₁ = W₂ × D₂.',
      })
    }
    case 'multiVar': {
      const rate = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 10, 25, 60))
      const machines1 = int(ctx.rng, 2, mag(ctx, 4, 6, 8))
      const hours1 = int(ctx.rng, 2, mag(ctx, 4, 6, 8))
      const out1 = rate * machines1 * hours1
      const machines2 = int(ctx.rng, mag(ctx, 3, 5, 8), mag(ctx, 8, 12, 20))
      const hours2 = int(ctx.rng, mag(ctx, 3, 5, 8), mag(ctx, 8, 12, 20))
      const out2 = rate * machines2 * hours2
      const askRate = ctx.difficulty === 'hard' && ctx.rng() < 0.3
      const answer = askRate ? rate : out2
      const prompt = askRate
        ? `${machines1} machines make ${out1} parts in ${hours1} hours. How many parts does one machine make per hour?`
        : `${machines1} machines make ${out1} parts in ${hours1} hours. At the same rate, how many parts will ${machines2} machines make in ${hours2} hours?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: 'parts',
        explanation: `One machine-hour produces ${out1}/(${machines1} × ${hours1}) = ${rate} parts. ${askRate ? `That is the one-machine hourly rate.` : `Then ${rate} × ${machines2} × ${hours2} = ${out2} parts.`}`,
        steps: [
          `Total machine-hours = ${machines1} × ${hours1} = ${machines1 * hours1}.`,
          `Output per machine-hour = ${out1}/${machines1 * hours1} = ${rate}.`,
          askRate ? `The rate is ${answer} parts per machine-hour.` : `New output = ${rate} × ${machines2} × ${hours2} = ${answer} parts.`,
        ],
        hints: makeHints(
          'This problem has two variables: machines and hours.',
          `Divide the output by ${machines1} × ${hours1} machine-hours.`,
          'Always reduce to output per machine per hour.',
          `One machine-hour = ${rate} parts; the answer is ${answer}.`,
        ),
        shortcut: 'Find output per machine-hour, then multiply both new variables.',
      })
    }
    default:
      throw new Error(`Unknown kind "${kind}" for family unitaryProblem`)
  }
}

function speed(ctx: GenContext, kind: string): GeneratedQuestion {
  const build = (data: SeedData) => finish(ctx, 'speedProblem', kind, data)
  switch (kind) {
    case 'speed': {
      const s = int(ctx.rng, mag(ctx, 20, 60, 200), mag(ctx, 80, 180, 900))
      const t = int(ctx.rng, 1, mag(ctx, 5, 8, 12))
      const d = s * t
      return build({
        prompt: `${traveller(s)} covers ${d} km in ${t} ${hoursWord(t)}. What is its average speed in km/h?`,
        type: 'numeric',
        ...num(s),
        answerUnit: 'km/h',
        explanation: `Speed = distance ÷ time = ${d}/${t} = ${s} km/h.`,
        steps: [`Distance = ${d} km, time = ${t} ${hoursWord(t)}.`, `Speed = distance ÷ time.`, `${d}/${t} = ${s} km/h.`],
        hints: makeHints(
          'Speed is distance divided by time.',
          `Divide ${d} km by ${t} ${hoursWord(t)}.`,
          'In the speed triangle, cover S to see D ÷ T.',
          `${d} ÷ ${t} = ${s} km/h.`,
        ),
        shortcut: 'Speed = distance ÷ time.',
      })
    }
    case 'distance': {
      const s = int(ctx.rng, mag(ctx, 20, 80, 300), mag(ctx, 100, 250, 900))
      const t = int(ctx.rng, 1, mag(ctx, 6, 9, 15))
      const d = s * t
      return build({
        prompt: `${traveller(s)} travels at ${s} km/h for ${t} ${hoursWord(t)}. How far does it travel, in km?`,
        type: 'numeric',
        ...num(d),
        answerUnit: 'km',
        explanation: `Distance = speed × time = ${s} × ${t} = ${d} km.`,
        steps: [`Speed = ${s} km/h, time = ${t} ${hoursWord(t)}.`, `Distance = speed × time.`, `${s} × ${t} = ${d} km.`],
        hints: makeHints(
          'Multiply speed by time.',
          `${s} × ${t} gives the distance.`,
          'In the speed triangle, cover D to see S × T.',
          `${s} × ${t} = ${d} km.`,
        ),
        shortcut: 'Distance = speed × time.',
      })
    }
    case 'time': {
      const s = int(ctx.rng, mag(ctx, 20, 80, 300), mag(ctx, 100, 250, 900))
      const t = int(ctx.rng, 1, mag(ctx, 6, 9, 15))
      const d = s * t
      return build({
        prompt: `${traveller(s)} travels ${d} km at a steady ${s} km/h. How many hours does the journey take?`,
        type: 'numeric',
        ...num(t),
        answerUnit: 'hours',
        explanation: `Time = distance ÷ speed = ${d}/${s} = ${t} ${hoursWord(t)}.`,
        steps: [`Distance = ${d} km, speed = ${s} km/h.`, `Time = distance ÷ speed.`, `${d}/${s} = ${t} ${hoursWord(t)}.`],
        hints: makeHints(
          'Time is distance divided by speed.',
          `Divide ${d} by ${s}.`,
          'In the speed triangle, cover T to see D ÷ S.',
          `${d} ÷ ${s} = ${t} ${hoursWord(t)}.`,
        ),
        shortcut: 'Time = distance ÷ speed.',
      })
    }
    case 'rearrange': {
      const variant = pick(ctx.rng, ['speed', 'time'])
      const formula = 'd = s × t'
      let target = 's'
      let correct = 's = d ÷ t'
      let wrong: string[] = []
      if (variant === 'time') {
        target = 't'
        correct = 't = d ÷ s'
        wrong = ['t = d × s', 't = s ÷ d', 't = d − s', 't = d + s']
      } else {
        wrong = ['s = d × t', 's = t ÷ d', 's = d − t', 's = d + t']
      }
      return build({
        prompt: `Starting from ${formula}, which rearrangement makes ${target} the subject?`,
        type: 'mcq',
        answer: correct,
        distractors: wrongOptions(correct, wrong),
        explanation: `Use inverse operations: to isolate ${target}, undo each operation around it. The correct rearrangement is ${correct}.`,
        steps: [
          `Start with ${formula}.`,
          `Apply the inverse operation to isolate ${target}.`,
          `The subject form is ${correct}.`,
        ],
        hints: makeHints(
          'Undo what is being done to the target letter.',
          `Use the inverse of multiplication: division.`,
          'Cover the target in the D–S–T triangle to read the formula.',
          `Rearranging ${formula} for ${target} gives ${correct}.`,
        ),
        shortcut: 'D–S–T triangle: cover the unknown to see its formula.',
      })
    }
    case 'minutesHours': {
      const minutes = pick(ctx.rng, [30, 45, 60, 90, 120, 150, 180, 240])
      const g = gcd(minutes, 60)
      const numerator = minutes / g
      const denominator = 60 / g
      const unitMin = mag(ctx, 10, 20, 40)
      const unitMax = Math.max(unitMin, mag(ctx, 20, 40, 100))
      const unit = int(ctx.rng, unitMin, unitMax)
      const s = denominator * unit
      const d = numerator * unit
      const hours = cleanNumber(minutes / 60)
      if (ctx.rng() < 0.2) {
        const claim = ctx.rng() < 0.5 ? hours : cleanNumber(minutes / 100)
        const isTrue = claim === hours
        return build({
          prompt: `True or false: ${minutes} minutes is ${fmt(claim)} hours?`,
          type: 'boolean',
          answer: isTrue ? 'True' : 'False',
          explanation: `${minutes} minutes = ${minutes}/60 = ${fmt(hours)} hours, so the statement is ${isTrue ? 'true' : 'false'}.`,
          steps: [
            'There are 60 minutes in one hour.',
            `${minutes}/60 = ${fmt(hours)} hours.`,
            `The claim is ${isTrue ? 'true' : 'false'}.`,
          ],
          hints: makeHints(
            'Minutes are not hundredths of an hour.',
            `Divide the minutes by 60.`,
            '60 minutes = 1 hour, so 30 minutes = 0.5 hours.',
            `${minutes} ÷ 60 = ${fmt(hours)} hours; the statement is ${isTrue ? 'true' : 'false'}.`,
          ),
          shortcut: 'Divide minutes by 60 to convert to hours.',
        })
      }
      const askSpeed = ctx.difficulty === 'hard' && ctx.rng() < 0.4
      const answer = askSpeed ? s : d
      const prompt = askSpeed
        ? `${traveller(s)} covers ${d} km in ${minutes} minutes. What is its speed in km/h?`
        : `${traveller(s)} travels at ${s} km/h for ${minutes} minutes. How far does it travel, in km?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: askSpeed ? 'km/h' : 'km',
        explanation: `${minutes} minutes = ${fmt(hours)} hours. ${askSpeed ? `${d}/${fmt(hours)} = ${s} km/h.` : `${s} × ${fmt(hours)} = ${d} km.`}`,
        steps: [
          `Convert time: ${minutes} minutes = ${minutes}/60 = ${fmt(hours)} hours.`,
          askSpeed ? `Speed = distance ÷ time.` : `Distance = speed × time.`,
          askSpeed ? `${d}/${fmt(hours)} = ${answer} km/h.` : `${s} × ${fmt(hours)} = ${answer} km.`,
        ],
        hints: makeHints(
          'Convert the minutes into hours before using the formula.',
          `${minutes} ÷ 60 = ${fmt(hours)} hours.`,
          'Keep time in hours when speed is in km/h.',
          `Time = ${fmt(hours)} hours, so the answer is ${answer}.`,
        ),
        shortcut: 'Minutes ÷ 60 = hours; then use the speed triangle.',
      })
    }
    case 'kmhMs': {
      const k = int(ctx.rng, mag(ctx, 4, 8, 15), mag(ctx, 12, 30, 60))
      const kmh = 9 * k
      const ms = round(kmh / 3.6, 2)
      return build({
        prompt: `Convert ${kmh} km/h to m/s.`,
        type: 'numeric',
        ...num(ms),
        answerUnit: 'm/s',
        explanation: `1 km/h = 1000/3600 = 1/3.6 m/s, so ${kmh}/3.6 = ${fmt(ms)} m/s.`,
        steps: ['1 km/h = 1000 m / 3600 s = 1/3.6 m/s.', `Divide ${kmh} by 3.6.`, `${kmh}/3.6 = ${fmt(ms)} m/s.`],
        hints: makeHints(
          'km/h is a larger number than m/s for the same speed.',
          'Divide the km/h value by 3.6.',
          'km/h ÷ 3.6 = m/s.',
          `${kmh} ÷ 3.6 = ${fmt(ms)} m/s.`,
        ),
        shortcut: 'km/h ÷ 3.6 = m/s.',
      })
    }
    case 'msKmh': {
      const ms = int(ctx.rng, mag(ctx, 5, 8, 15), mag(ctx, 20, 40, 80))
      const kmh = round(ms * 3.6, 2)
      return build({
        prompt: `Convert ${ms} m/s to km/h.`,
        type: 'numeric',
        ...num(kmh),
        answerUnit: 'km/h',
        explanation: `1 m/s = 3.6 km/h, so ${ms} × 3.6 = ${fmt(kmh)} km/h.`,
        steps: ['1 m/s = 3.6 km/h.', `Multiply ${ms} by 3.6.`, `${ms} × 3.6 = ${fmt(kmh)} km/h.`],
        hints: makeHints(
          'km/h is a bigger number than m/s for the same speed.',
          'Multiply the m/s value by 3.6.',
          'm/s × 3.6 = km/h.',
          `${ms} × 3.6 = ${fmt(kmh)} km/h.`,
        ),
        shortcut: 'm/s × 3.6 = km/h.',
      })
    }
    case 'knots': {
      const knots = int(ctx.rng, mag(ctx, 10, 50, 150), mag(ctx, 80, 250, 600))
      const kmh = round(knots * 1.852, 2)
      return build({
        prompt: `An aircraft is flying at ${knots} knots. Convert this to km/h (1 knot = 1.852 km/h).`,
        type: 'numeric',
        ...num(kmh),
        answerUnit: 'km/h',
        explanation: `Multiply knots by 1.852: ${knots} × 1.852 = ${fmt(kmh)} km/h.`,
        steps: ['Use 1 knot = 1.852 km/h.', `Multiply ${knots} by 1.852.`, `Speed = ${fmt(kmh)} km/h.`],
        hints: makeHints(
          'A knot is a speed of one nautical mile per hour.',
          'Multiply the knots by 1.852.',
          'knots × 1.852 = km/h.',
          `${knots} × 1.852 = ${fmt(kmh)} km/h.`,
        ),
        shortcut: 'knots × 1.852 = km/h.',
      })
    }
    case 'nautical': {
      const knots = int(ctx.rng, mag(ctx, 60, 150, 250), mag(ctx, 180, 400, 700))
      const hours = int(ctx.rng, 1, mag(ctx, 4, 6, 10))
      const nm = knots * hours
      const reverse = ctx.difficulty !== 'easy' && ctx.rng() < 0.4
      const answer = reverse ? hours : nm
      const prompt = reverse
        ? `An aircraft flies ${nm} nautical miles at ${knots} knots. How many hours does it take?`
        : `An aircraft flies at ${knots} knots for ${hours} ${hoursWord(hours)}. How many nautical miles does it cover?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: reverse ? 'hours' : 'nm',
        explanation: `One knot is one nautical mile per hour, so distance = ${knots} × ${hours} = ${nm} nm.`,
        steps: [
          '1 knot = 1 nautical mile per hour.',
          reverse ? `Time = distance ÷ speed = ${nm}/${knots}.` : `Distance = speed × time = ${knots} × ${hours}.`,
          reverse ? `Time = ${answer} hours.` : `Distance = ${answer} nm.`,
        ],
        hints: makeHints(
          'Knots are nautical miles per hour.',
          reverse ? `Divide ${nm} by ${knots}.` : `Multiply ${knots} by ${hours}.`,
          'nm = knots × hours.',
          `nm = ${knots} × ${hours} = ${nm}; the answer is ${answer}.`,
        ),
        shortcut: 'Nautical miles = knots × hours.',
      })
    }
    case 'relative': {
      let s1 = int(ctx.rng, mag(ctx, 40, 80, 200), mag(ctx, 100, 250, 600))
      let s2 = int(ctx.rng, mag(ctx, 40, 80, 200), mag(ctx, 100, 250, 600))
      if (s2 === s1) s2 += 10
      const sameDirection = ctx.difficulty === 'hard' && ctx.rng() < 0.5
      const closing = sameDirection ? Math.abs(s1 - s2) : s1 + s2
      if (ctx.difficulty === 'easy') {
        return build({
          prompt: `Two aircraft fly toward each other at ${s1} km/h and ${s2} km/h. What is their combined closing speed in km/h?`,
          type: 'numeric',
          ...num(s1 + s2),
          answerUnit: 'km/h',
          explanation: `Toward each other, speeds add: ${s1} + ${s2} = ${s1 + s2} km/h.`,
          steps: ['Both aircraft are closing the gap.', `Add the two speeds.`, `${s1} + ${s2} = ${s1 + s2} km/h.`],
          hints: makeHints(
            'Both aircraft reduce the gap between them.',
            'Add their speeds.',
            'Toward each other: relative speed = sum.',
            `${s1} + ${s2} = ${s1 + s2} km/h.`,
          ),
          shortcut: 'Opposite directions: add speeds. Same direction: subtract.',
        })
      }
      const t = int(ctx.rng, 1, mag(ctx, 3, 5, 8))
      const d = closing * t
      const fast = Math.max(s1, s2)
      const slow = Math.min(s1, s2)
      const prompt = sameDirection
        ? `A faster aircraft at ${fast} km/h chases a slower one at ${slow} km/h, starting ${d} km apart. How many hours until it catches up?`
        : `Two aircraft ${d} km apart fly toward each other at ${s1} km/h and ${s2} km/h. How many hours until they meet?`
      return build({
        prompt,
        type: 'numeric',
        ...num(t),
        answerUnit: 'hours',
        explanation: `${sameDirection ? `Closing speed = ${fast} − ${slow} = ${closing} km/h.` : `Closing speed = ${s1} + ${s2} = ${closing} km/h.`} Time = ${d}/${closing} = ${t} ${hoursWord(t)}.`,
        steps: [
          sameDirection ? `Subtract the speeds: ${fast} − ${slow} = ${closing} km/h.` : `Add the speeds: ${s1} + ${s2} = ${closing} km/h.`,
          `Time = gap ÷ closing speed = ${d}/${closing}.`,
          `They meet after ${t} ${hoursWord(t)}.`,
        ],
        hints: makeHints(
          sameDirection ? 'Only the difference in speeds closes the gap.' : 'Both speeds close the gap together.',
          sameDirection ? 'Subtract the slower speed from the faster.' : 'Add the two speeds.',
          'Time = distance ÷ relative speed.',
          `Relative speed = ${closing} km/h, so time = ${d}/${closing} = ${t} ${hoursWord(t)}.`,
        ),
        shortcut: 'Opposite: add. Same: subtract. Then time = gap ÷ relative speed.',
      })
    }
    case 'average': {
      const { s1, s2, distance, t1, t2, average } = equalLeg(ctx)
      return build({
        prompt: `${traveller(Math.min(s1, s2))} travels ${distance} km out at ${s1} km/h and ${distance} km back at ${s2} km/h. What is its average speed for the round trip, in km/h?`,
        type: 'numeric',
        ...num(average),
        answerUnit: 'km/h',
        explanation: `Total distance = ${2 * distance} km; total time = ${t1} + ${t2} = ${t1 + t2} hours. Average speed = ${2 * distance}/${t1 + t2} = ${average} km/h — not the plain mean of the two speeds.`,
        steps: [
          `Two equal legs give total distance ${2 * distance} km.`,
          `Leg times: ${distance}/${s1} = ${t1} h and ${distance}/${s2} = ${t2} h.`,
          `Average speed = ${2 * distance}/${t1 + t2} = ${average} km/h.`,
        ],
        hints: makeHints(
          'Average speed is total distance over total time.',
          `Find each leg's time before dividing.`,
          'For equal distances, average speed is the harmonic mean.',
          `Total ${2 * distance} km ÷ ${t1 + t2} h = ${average} km/h.`,
        ),
        shortcut: 'Average speed = total distance ÷ total time, never the mean of speeds.',
      })
    }
    case 'journey': {
      const s1 = int(ctx.rng, mag(ctx, 40, 80, 200), mag(ctx, 100, 250, 600))
      const s2 = int(ctx.rng, mag(ctx, 40, 80, 200), mag(ctx, 100, 250, 600))
      const t1 = int(ctx.rng, 1, mag(ctx, 3, 5, 8))
      const t2 = int(ctx.rng, 1, mag(ctx, 3, 5, 8))
      const d1 = s1 * t1
      const d2 = s2 * t2
      const totalDistance = d1 + d2
      if (ctx.difficulty === 'easy') {
        return build({
          prompt: `${traveller(Math.min(s1, s2))} travels ${t1} ${hoursWord(t1)} at ${s1} km/h, then ${t2} ${hoursWord(t2)} at ${s2} km/h. How far does it travel in total, in km?`,
          type: 'numeric',
          ...num(totalDistance),
          answerUnit: 'km',
          explanation: `Leg distances are ${s1} × ${t1} = ${d1} km and ${s2} × ${t2} = ${d2} km. Total = ${totalDistance} km.`,
          steps: [
            `First leg = ${s1} × ${t1} = ${d1} km.`,
            `Second leg = ${s2} × ${t2} = ${d2} km.`,
            `Total distance = ${d1} + ${d2} = ${totalDistance} km.`,
          ],
          hints: makeHints(
            'Work out each leg separately.',
            `Use distance = speed × time for both legs.`,
            'Add the two leg distances.',
            `${d1} + ${d2} = ${totalDistance} km.`,
          ),
          shortcut: 'Total distance = sum of (speed × time) for each leg.',
        })
      }
      if (ctx.difficulty === 'medium') {
        const answer = t1 + 1 + t2
        return build({
          prompt: `${traveller(Math.min(s1, s2))} travels ${t1} ${hoursWord(t1)} at ${s1} km/h, stops for 60 minutes, then travels ${t2} ${hoursWord(t2)} at ${s2} km/h. What is the total journey time in hours?`,
          type: 'numeric',
          ...num(answer),
          answerUnit: 'hours',
          explanation: `Flying time is ${t1} + ${t2} = ${t1 + t2} hours and the 60-minute stop is 1 hour, so the journey takes ${answer} hours.`,
          steps: [
            `Flying time = ${t1} + ${t2} = ${t1 + t2} hours.`,
            '60 minutes = 1 hour.',
            `Total time = ${t1 + t2} + 1 = ${answer} hours.`,
          ],
          hints: makeHints(
            'Remember to include the stop.',
            'Convert 60 minutes to 1 hour.',
            'Add all time blocks together.',
            `${t1} + ${t2} + 1 = ${answer} hours.`,
          ),
          shortcut: 'Total time = flying time + stop time.',
        })
      }
      const totalTime = cleanNumber(t1 + t2 + 0.5)
      const answer = round(totalDistance / totalTime, 2)
      return build({
        prompt: `${traveller(Math.min(s1, s2))} travels ${t1} ${hoursWord(t1)} at ${s1} km/h, stops for 30 minutes, then travels ${t2} ${hoursWord(t2)} at ${s2} km/h. What is its average speed for the whole journey, in km/h? Round to 2 decimal places.`,
        type: 'numeric',
        ...num(answer),
        answerUnit: 'km/h',
        explanation: `Total distance = ${d1} + ${d2} = ${totalDistance} km. Total time = ${t1} + ${t2} + 0.5 = ${fmt(totalTime)} h. Average speed = ${totalDistance}/${fmt(totalTime)} ≈ ${fmt(answer)} km/h.`,
        steps: [
          `Leg distances: ${d1} km and ${d2} km; total ${totalDistance} km.`,
          `Total time = ${t1} + ${t2} + 0.5 = ${fmt(totalTime)} hours.`,
          `Average = ${totalDistance}/${fmt(totalTime)} ≈ ${fmt(answer)} km/h.`,
        ],
        hints: makeHints(
          'The stop counts as journey time even though no distance is covered.',
          `Convert 30 minutes to 0.5 hours.`,
          'Average speed = total distance ÷ total journey time.',
          `${totalDistance} ÷ ${fmt(totalTime)} ≈ ${fmt(answer)} km/h.`,
        ),
        shortcut: 'Include stops in total time before dividing distance by time.',
      })
    }
    default:
      throw new Error(`Unknown kind "${kind}" for family speedProblem`)
  }
}

function averages(ctx: GenContext, kind: string): GeneratedQuestion {
  const build = (data: SeedData) => finish(ctx, 'averageProblem', kind, data)
  switch (kind) {
    case 'basic': {
      const count = mag(ctx, 3, 4, 5)
      const spread = mag(ctx, 1, 2, 4)
      const mean = int(ctx.rng, mag(ctx, 8, 20, 50), mag(ctx, 25, 80, 250))
      const offsets = count === 3 ? [-1, 0, 1] : count === 4 ? [-2, -1, 1, 2] : [-2, -1, 0, 1, 2]
      const values = offsets.map((offset) => mean + offset * spread)
      const written = values.join(', ')
      if (ctx.rng() < 0.2) {
        const claim = ctx.rng() < 0.5 ? mean : mean + spread
        const isTrue = claim === mean
        return build({
          prompt: `True or false: the average of ${written} is ${claim}?`,
          type: 'boolean',
          answer: isTrue ? 'True' : 'False',
          explanation: `The values add to ${count * mean}, and ${count * mean}/${count} = ${mean}, so the claim is ${isTrue ? 'true' : 'false'}.`,
          steps: [
            `Add the ${count} values: ${count * mean}.`,
            `Divide by ${count}: ${count * mean}/${count} = ${mean}.`,
            `The claim is ${isTrue ? 'true' : 'false'}.`,
          ],
          hints: makeHints(
            'Check the mean by adding then dividing.',
            `There are ${count} numbers.`,
            'Symmetric deviations around a value make that value the mean.',
            `Average = ${mean}, so the statement is ${isTrue ? 'true' : 'false'}.`,
          ),
          shortcut: 'Mean = sum of values ÷ number of values.',
        })
      }
      return build({
        prompt: `Find the average of ${written}.`,
        type: 'numeric',
        ...num(mean),
        explanation: `The ${count} values add to ${count * mean}; dividing by ${count} gives ${mean}.`,
        steps: [`Add the values: ${written}.`, `Sum = ${count * mean}.`, `Average = ${count * mean}/${count} = ${mean}.`],
        hints: makeHints(
          'Add all the values first.',
          `There are ${count} values to divide by.`,
          'Spot values paired evenly around a centre.',
          `Sum = ${count * mean}; average = ${mean}.`,
        ),
        shortcut: 'Average = total ÷ count.',
      })
    }
    case 'missing': {
      const count = mag(ctx, 3, 4, 5)
      const spread = mag(ctx, 2, 5, 12)
      const mean = int(ctx.rng, mag(ctx, 10, 30, 60), mag(ctx, 30, 90, 200))
      const known: number[] = []
      for (let i = 0; i < count - 1; i += 1) {
        known.push(mean + int(ctx.rng, -spread, spread))
      }
      const sumKnown = known.reduce((a, b) => a + b, 0)
      const answer = count * mean - sumKnown
      const word = ['', 'one', 'two', 'three', 'four', 'five'][count - 1]
      return build({
        prompt: `A set of ${count} numbers has an average of ${mean}. ${word.charAt(0).toUpperCase() + word.slice(1)} of them are ${known.join(', ')}. What is the remaining number?`,
        type: 'numeric',
        ...num(answer),
        explanation: `All ${count} numbers total ${count} × ${mean} = ${count * mean}. The known numbers total ${sumKnown}, so the missing value is ${count * mean} − ${sumKnown} = ${answer}.`,
        steps: [
          `Total of all ${count} numbers = ${count} × ${mean} = ${count * mean}.`,
          `Known numbers sum to ${sumKnown}.`,
          `Missing number = ${count * mean} − ${sumKnown} = ${answer}.`,
        ],
        hints: makeHints(
          'Use the average to find the grand total.',
          `Total = ${count} × ${mean}.`,
          'Missing = grand total − known total.',
          `${count * mean} − ${sumKnown} = ${answer}.`,
        ),
        shortcut: 'Missing value = (average × count) − sum of the others.',
      })
    }
    case 'combined': {
      const maxN = mag(ctx, 5, 8, 12)
      const n1 = int(ctx.rng, 2, maxN)
      const n2 = int(ctx.rng, 2, maxN)
      const fraction = int(ctx.rng, 1, mag(ctx, 2, 3, 4))
      const common = gcd(n1, n2)
      const d1 = (n2 / common) * fraction
      const d2 = (n1 / common) * fraction
      const mean = Math.max(int(ctx.rng, mag(ctx, 12, 35, 70), mag(ctx, 30, 90, 200)), d1 + 5)
      const a1 = mean - d1
      const a2 = mean + d2
      return build({
        prompt: `One group of ${n1} crates has an average mass of ${a1} kg, and another group of ${n2} crates has an average mass of ${a2} kg. What is the average mass of all ${n1 + n2} crates combined, in kg?`,
        type: 'numeric',
        ...num(mean),
        answerUnit: 'kg',
        explanation: `Group totals are ${n1} × ${a1} = ${n1 * a1} kg and ${n2} × ${a2} = ${n2 * a2} kg. Combined average = (${n1 * a1} + ${n2 * a2})/${n1 + n2} = ${mean} kg.`,
        steps: [
          `First group total = ${n1} × ${a1} = ${n1 * a1} kg.`,
          `Second group total = ${n2} × ${a2} = ${n2 * a2} kg.`,
          `Combined average = ${n1 * a1 + n2 * a2}/${n1 + n2} = ${mean} kg.`,
        ],
        hints: makeHints(
          'Do not just average the two group averages.',
          `Convert each average into a group total first.`,
          'Combined average = total mass ÷ total crates.',
          `(${n1 * a1} + ${n2 * a2})/${n1 + n2} = ${mean} kg.`,
        ),
        shortcut: 'Weight each group average by its count before dividing.',
      })
    }
    case 'weighted': {
      const maxW = mag(ctx, 3, 5, 6)
      const w1 = int(ctx.rng, 1, maxW)
      let w2 = int(ctx.rng, 1, maxW)
      if (w2 === w1) w2 += 1
      const fraction = int(ctx.rng, 1, mag(ctx, 2, 2, 3))
      const common = gcd(w1, w2)
      const d1 = (w2 / common) * fraction
      const d2 = (w1 / common) * fraction
      const mean = int(ctx.rng, mag(ctx, 40, 50, 55), mag(ctx, 80, 90, 75))
      const s1 = mean - d1
      const s2 = mean + d2
      return build({
        prompt: `A pilot scores ${s1} on the written test (weight ${w1}) and ${s2} on the simulator test (weight ${w2}). What is the weighted average score?`,
        type: 'numeric',
        ...num(mean),
        explanation: `Weighted sum = ${w1} × ${s1} + ${w2} × ${s2} = ${w1 * s1 + w2 * s2}. Dividing by total weight ${w1 + w2} gives ${mean}.`,
        steps: [
          `Weighted contributions: ${w1} × ${s1} = ${w1 * s1} and ${w2} × ${s2} = ${w2 * s2}.`,
          `Weighted sum = ${w1 * s1 + w2 * s2}; total weight = ${w1 + w2}.`,
          `Weighted average = ${w1 * s1 + w2 * s2}/${w1 + w2} = ${mean}.`,
        ],
        hints: makeHints(
          'The two scores do not count equally.',
          'Multiply each score by its weight before adding.',
          'Weighted average = weighted sum ÷ sum of weights.',
          `(${w1 * s1} + ${w2 * s2})/${w1 + w2} = ${mean}.`,
        ),
        shortcut: 'Multiply by weights, add, then divide by the total weight.',
      })
    }
    case 'speed': {
      const { s1, s2, distance, t1, t2, average } = equalLeg(ctx)
      return build({
        prompt: `${traveller(Math.min(s1, s2))} travels ${distance} km at ${s1} km/h and returns the same ${distance} km at ${s2} km/h. What is the average speed for the whole trip, in km/h?`,
        type: 'numeric',
        ...num(average),
        answerUnit: 'km/h',
        explanation: `Total distance is ${2 * distance} km and total time is ${t1} + ${t2} = ${t1 + t2} h, so the average speed is ${2 * distance}/${t1 + t2} = ${average} km/h.`,
        steps: [
          `Outbound time = ${distance}/${s1} = ${t1} h; return time = ${distance}/${s2} = ${t2} h.`,
          `Total distance = ${2 * distance} km; total time = ${t1 + t2} h.`,
          `Average speed = ${2 * distance}/${t1 + t2} = ${average} km/h.`,
        ],
        hints: makeHints(
          'The average of the speeds is not the average speed.',
          `Find the time for each leg.`,
          'Equal distances call for the harmonic mean of speeds.',
          `${2 * distance} km ÷ ${t1 + t2} h = ${average} km/h.`,
        ),
        shortcut: 'Average speed = total distance ÷ total time, not (s₁ + s₂)/2.',
      })
    }
    default:
      throw new Error(`Unknown kind "${kind}" for family averageProblem`)
  }
}

function algebra(ctx: GenContext, kind: string): GeneratedQuestion {
  const build = (data: SeedData) => finish(ctx, 'algebraProblem', kind, data)
  switch (kind) {
    case 'oneStep': {
      const op = pick(ctx.rng, ['add', 'subtract', 'multiply', 'divide'])
      let x = 0
      let equation = ''
      let inverse = ''
      if (op === 'add') {
        x = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 12, 40, 150))
        const a = int(ctx.rng, 1, mag(ctx, 9, 20, 50))
        equation = `x + ${a} = ${x + a}`
        inverse = `Subtract ${a} from both sides.`
      } else if (op === 'subtract') {
        x = int(ctx.rng, mag(ctx, 3, 6, 12), mag(ctx, 15, 45, 160))
        const a = int(ctx.rng, 1, Math.min(x - 1, mag(ctx, 9, 20, 50)))
        equation = `x − ${a} = ${x - a}`
        inverse = `Add ${a} to both sides.`
      } else if (op === 'multiply') {
        x = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 12, 40, 150))
        const a = int(ctx.rng, 2, mag(ctx, 6, 10, 20))
        equation = `${a}x = ${a * x}`
        inverse = `Divide both sides by ${a}.`
      } else {
        const a = int(ctx.rng, 2, mag(ctx, 6, 10, 20))
        const quotient = int(ctx.rng, 1, mag(ctx, 9, 20, 50))
        x = a * quotient
        equation = `x ÷ ${a} = ${quotient}`
        inverse = `Multiply both sides by ${a}.`
      }
      if (ctx.rng() < 0.2) {
        const claim = ctx.rng() < 0.5 ? x : x + pick(ctx.rng, [-1, 1, 2])
        const isTrue = claim === x
        return build({
          prompt: `True or false: x = ${claim} is the solution to ${equation}?`,
          type: 'boolean',
          answer: isTrue ? 'True' : 'False',
          explanation: `${inverse} This gives x = ${x}, so the statement is ${isTrue ? 'true' : 'false'}.`,
          steps: [`Start with ${equation}.`, inverse, `x = ${x}, so the claim is ${isTrue ? 'true' : 'false'}.`],
          hints: makeHints(
            'Use the inverse operation to isolate x.',
            inverse,
            'Whatever you do to one side, do to the other.',
            `Solving ${equation} gives x = ${x}; the claim is ${isTrue ? 'true' : 'false'}.`,
          ),
          shortcut: 'Undo the single operation attached to x.',
        })
      }
      return build({
        prompt: `Solve for x: ${equation}`,
        type: 'numeric',
        ...num(x),
        explanation: `${inverse} Therefore x = ${x}. Check: substituting x = ${x} satisfies ${equation}.`,
        steps: [`Start with ${equation}.`, inverse, `x = ${x}; substitute back to check.`],
        hints: makeHints(
          'One operation stands between x and the answer.',
          inverse,
          'Apply the inverse operation to both sides.',
          `${equation} → ${inverse} → x = ${x}.`,
        ),
        shortcut: 'Isolate x with the single inverse operation.',
      })
    }
    case 'twoStep': {
      const a = int(ctx.rng, 2, mag(ctx, 9, 15, 30))
      const x = int(ctx.rng, mag(ctx, 2, 4, 8), mag(ctx, 10, 30, 100))
      const b = int(ctx.rng, 1, mag(ctx, 8, 20, 60))
      const subtract = ctx.rng() < 0.5
      const c = subtract ? a * x - b : a * x + b
      const equation = subtract ? `${a}x − ${b} = ${c}` : `${a}x + ${b} = ${c}`
      const first = subtract ? `Add ${b} to both sides: ${a}x = ${c + b}.` : `Subtract ${b} from both sides: ${a}x = ${c - b}.`
      return build({
        prompt: `Solve for x: ${equation}`,
        type: 'numeric',
        ...num(x),
        explanation: `${first} Then divide by ${a} to get x = ${x}.`,
        steps: [`Start with ${equation}.`, first, `Divide by ${a}: x = ${x}.`],
        hints: makeHints(
          'Deal with the constant before the coefficient.',
          first,
          'Reverse the order of operations.',
          `${equation} → ${a}x = ${a * x} → x = ${x}.`,
        ),
        shortcut: 'Remove the constant first, then divide by the coefficient.',
      })
    }
    case 'brackets': {
      const a = int(ctx.rng, 2, mag(ctx, 6, 9, 15))
      const x = int(ctx.rng, mag(ctx, 2, 4, 8), mag(ctx, 10, 30, 100))
      const b = int(ctx.rng, 2, mag(ctx, 6, 10, 20))
      const extra = ctx.difficulty === 'easy' ? 0 : int(ctx.rng, 1, mag(ctx, 2, 10, 30))
      const c = a * (x + b)
      const equation = extra === 0 ? `${a}(x + ${b}) = ${c}` : `${a}(x + ${b}) + ${extra} = ${c + extra}`
      return build({
        prompt: `Solve for x: ${equation}`,
        type: 'numeric',
        ...num(x),
        explanation: extra === 0
          ? `Divide by ${a}: x + ${b} = ${x + b}. Subtract ${b} to get x = ${x}.`
          : `Subtract ${extra}: ${a}(x + ${b}) = ${c}. Divide by ${a}: x + ${b} = ${x + b}. So x = ${x}.`,
        steps: [
          `Start with ${equation}.`,
          extra === 0 ? `Divide both sides by ${a}.` : `First subtract ${extra}, then divide by ${a}.`,
          `x + ${b} = ${x + b}, so x = ${x}.`,
        ],
        hints: makeHints(
          'Undo operations from the outside in.',
          extra === 0 ? `Divide by ${a} first.` : `Remove the +${extra} before dividing by ${a}.`,
          'Expand last; divide first is usually faster.',
          `${equation} → x + ${b} = ${x + b} → x = ${x}.`,
        ),
        shortcut: 'Remove outside terms first, then divide, then subtract inside the brackets.',
      })
    }
    case 'rearrange': {
      const variant = pick(ctx.rng, ['linear', 'force', 'area'])
      let formula = 'y = mx + c'
      let target = 'x'
      let correct = 'x = (y − c) ÷ m'
      let wrong: string[] = []
      if (variant === 'force') {
        formula = 'F = ma'
        target = 'a'
        correct = 'a = F ÷ m'
        wrong = ['a = F × m', 'a = m ÷ F', 'a = F − m', 'a = F + m']
      } else if (variant === 'area') {
        formula = 'A = lw'
        target = 'l'
        correct = 'l = A ÷ w'
        wrong = ['l = A × w', 'l = w ÷ A', 'l = A − w', 'l = A + w']
      } else {
        wrong = ['x = (y + c) ÷ m', 'x = y ÷ m − c', 'x = m(y − c)', 'x = (y − c) × m']
      }
      return build({
        prompt: `Make ${target} the subject of the formula ${formula}. Which rearrangement is correct?`,
        type: 'mcq',
        answer: correct,
        distractors: wrongOptions(correct, wrong),
        explanation: `Use inverse operations in reverse order. Rearranging ${formula} for ${target} gives ${correct}.`,
        steps: [
          `Write the original formula: ${formula}.`,
          `Undo each operation around ${target}.`,
          `The rearranged formula is ${correct}.`,
        ],
        hints: makeHints(
          'Isolate the target letter using inverse operations.',
          'Work in the reverse order of operations.',
          'Divide by what multiplies the target, after moving additions.',
          `${formula} rearranged for ${target} is ${correct}.`,
        ),
        shortcut: 'Reverse the operations to make the chosen letter the subject.',
      })
    }
    case 'unknown': {
      const style = pick(ctx.rng, ['equation', 'perimeter'])
      if (style === 'perimeter') {
        const width = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 12, 40, 120))
        const length = int(ctx.rng, mag(ctx, 3, 6, 12), mag(ctx, 15, 50, 150))
        const perimeter = 2 * (length + width)
        return build({
          prompt: `A rectangle has a perimeter of ${perimeter} cm and a length of ${length} cm. What is its width in cm?`,
          type: 'numeric',
          ...num(width),
          answerUnit: 'cm',
          explanation: `Perimeter = 2(length + width), so length + width = ${perimeter}/2 = ${length + width} cm. Width = ${length + width} − ${length} = ${width} cm.`,
          steps: [
            `Use P = 2(l + w) with P = ${perimeter}.`,
            `l + w = ${perimeter}/2 = ${length + width} cm.`,
            `w = ${length + width} − ${length} = ${width} cm.`,
          ],
          hints: makeHints(
            'The perimeter is two lengths plus two widths.',
            `Halve ${perimeter} first.`,
            'Half the perimeter is one length plus one width.',
            `Half of ${perimeter} is ${length + width}; width = ${width} cm.`,
          ),
          shortcut: 'Half the perimeter, then subtract the known length.',
        })
      }
      const coefficientA = int(ctx.rng, 2, mag(ctx, 6, 10, 20))
      const coefficientB = coefficientA + int(ctx.rng, 1, mag(ctx, 4, 8, 15))
      const x = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 12, 40, 120))
      const c = (coefficientB - coefficientA) * x
      return build({
        prompt: `Solve for x: ${coefficientA}x = ${coefficientB}x − ${c}`,
        type: 'numeric',
        ...num(x),
        explanation: `Subtract ${coefficientA}x from both sides and add ${c}: (${coefficientB} − ${coefficientA})x = ${c}. So x = ${c}/${coefficientB - coefficientA} = ${x}.`,
        steps: [
          `Collect x terms: ${coefficientA}x − ${coefficientB}x = −${c}.`,
          `This gives ${coefficientB - coefficientA}x = ${c}.`,
          `x = ${c}/${coefficientB - coefficientA} = ${x}.`,
        ],
        hints: makeHints(
          'Get all the x terms onto one side.',
          `The x coefficient becomes ${coefficientB} − ${coefficientA} = ${coefficientB - coefficientA}.`,
          'Collect like terms before dividing.',
          `${coefficientB - coefficientA}x = ${c}, so x = ${x}.`,
        ),
        shortcut: 'Collect like terms, then divide by the coefficient of x.',
      })
    }
    case 'word': {
      const style = pick(ctx.rng, ['doubleAdd', 'timesMinus'])
      if (style === 'doubleAdd') {
        const x = int(ctx.rng, mag(ctx, 2, 5, 10), mag(ctx, 12, 40, 120))
        const b = int(ctx.rng, 1, mag(ctx, 9, 20, 50))
        const result = 2 * x + b
        return build({
          prompt: `When a number is doubled and ${b} is added, the result is ${result}. Find the number.`,
          type: 'numeric',
          ...num(x),
          explanation: `Let the number be n. Then 2n + ${b} = ${result}, so 2n = ${2 * x} and n = ${x}.`,
          steps: [
            `Write the equation: 2n + ${b} = ${result}.`,
            `Subtract ${b}: 2n = ${2 * x}.`,
            `Divide by 2: n = ${x}.`,
          ],
          hints: makeHints(
            'Turn the sentence into an equation.',
            'Subtract the added number before dividing.',
            'Work backwards from the result.',
            `2n = ${result} − ${b} = ${2 * x}, so n = ${x}.`,
          ),
          shortcut: 'Reverse the described operations in opposite order.',
        })
      }
      const b = int(ctx.rng, 1, mag(ctx, 9, 20, 50))
      const d = int(ctx.rng, 1, mag(ctx, 9, 20, 50))
      const x = b + d
      return build({
        prompt: `Three times a number minus ${b} equals twice the number plus ${d}. Find the number.`,
        type: 'numeric',
        ...num(x),
        explanation: `Let the number be n: 3n − ${b} = 2n + ${d}. Subtract 2n and add ${b} to get n = ${b} + ${d} = ${x}.`,
        steps: [
          `Write 3n − ${b} = 2n + ${d}.`,
          `Subtract 2n: n − ${b} = ${d}.`,
          `Add ${b}: n = ${x}.`,
        ],
        hints: makeHints(
          'Both sides contain the unknown.',
          'Move the 2n term to the left.',
          'Collect x terms on one side and constants on the other.',
          `n = ${d} + ${b} = ${x}.`,
        ),
        shortcut: 'Collect unknown terms on one side, constants on the other.',
      })
    }
    default:
      throw new Error(`Unknown kind "${kind}" for family algebraProblem`)
  }
}

function work(ctx: GenContext, kind: string): GeneratedQuestion {
  const build = (data: SeedData) => finish(ctx, 'workProblem', kind, data)
  switch (kind) {
    case 'fuelConsumption': {
      const rate = int(ctx.rng, mag(ctx, 2, 4, 8), mag(ctx, 10, 25, 60))
      const hours = int(ctx.rng, mag(ctx, 2, 3, 4), mag(ctx, 8, 15, 30))
      const used = rate * hours
      const reverse = ctx.difficulty !== 'easy' && ctx.rng() < 0.4
      const answer = reverse ? hours : used
      const prompt = reverse
        ? `A generator burns ${rate} litres of fuel per hour. How many hours can it run on ${used} litres?`
        : `A generator burns ${rate} litres of fuel per hour. How many litres will it burn in ${hours} hours?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: reverse ? 'hours' : 'litres',
        explanation: `At ${rate} litres per hour, ${hours} hours uses ${rate} × ${hours} = ${used} litres.`,
        steps: [
          `Burn rate = ${rate} litres/hour.`,
          reverse ? `Divide fuel by the rate: ${used}/${rate}.` : `Multiply rate by time: ${rate} × ${hours}.`,
          reverse ? `Running time = ${answer} hours.` : `Fuel used = ${answer} litres.`,
        ],
        hints: makeHints(
          'The burn rate is per hour.',
          reverse ? `Divide ${used} by ${rate}.` : `Multiply ${rate} by ${hours}.`,
          'Fuel = rate × time.',
          `Rate × time = ${rate} × ${hours} = ${used}; answer = ${answer}.`,
        ),
        shortcut: 'Fuel used = burn rate × hours.',
      })
    }
    case 'ratePerHour': {
      const rate = int(ctx.rng, mag(ctx, 3, 5, 10), mag(ctx, 20, 60, 150))
      const hours = int(ctx.rng, 2, mag(ctx, 6, 10, 16))
      const output = rate * hours
      const more = int(ctx.rng, 2, mag(ctx, 6, 12, 20))
      const reverse = ctx.difficulty !== 'easy' && ctx.rng() < 0.4
      const answer = reverse ? rate * more : rate
      const prompt = reverse
        ? `A machine produces ${output} units in ${hours} hours. At that rate, how many units will it produce in ${more} hours?`
        : `A machine produces ${output} units in ${hours} hours. What is its output rate in units per hour?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: 'units',
        explanation: `Rate = ${output}/${hours} = ${rate} units per hour. ${reverse ? `In ${more} hours it makes ${rate} × ${more} = ${answer} units.` : `The rate is ${answer} units/hour.`}`,
        steps: [
          `Output = ${output} units in ${hours} hours.`,
          `Rate = ${output}/${hours} = ${rate} units/hour.`,
          reverse ? `New output = ${rate} × ${more} = ${answer} units.` : `Rate = ${answer} units/hour.`,
        ],
        hints: makeHints(
          'Find output for one hour.',
          `Divide ${output} by ${hours}.`,
          'Rate = output ÷ time.',
          `Rate = ${rate} units/hour; the answer is ${answer}.`,
        ),
        shortcut: 'Rate = total output ÷ total hours.',
      })
    }
    case 'distanceConsumption': {
      const kmPerLitre = int(ctx.rng, mag(ctx, 5, 8, 12), mag(ctx, 20, 40, 80))
      const litres = int(ctx.rng, mag(ctx, 2, 3, 4), mag(ctx, 8, 15, 30))
      const distance = kmPerLitre * litres
      const reverse = ctx.difficulty !== 'easy' && ctx.rng() < 0.4
      const answer = reverse ? kmPerLitre : litres
      const prompt = reverse
        ? `A vehicle uses ${litres} litres to travel ${distance} km. What is its fuel efficiency in km per litre?`
        : `A vehicle travels ${kmPerLitre} km per litre. How many litres are needed for ${distance} km?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: reverse ? 'km/litre' : 'litres',
        explanation: `Fuel efficiency is ${distance}/${litres} = ${kmPerLitre} km per litre, so ${distance} km needs ${distance}/${kmPerLitre} = ${litres} litres.`,
        steps: [
          `Distance per litre = ${distance}/${litres} = ${kmPerLitre} km.`,
          reverse ? `That ratio is the efficiency.` : `Divide ${distance} km by ${kmPerLitre} km/litre.`,
          reverse ? `Efficiency = ${answer} km/litre.` : `Fuel needed = ${answer} litres.`,
        ],
        hints: makeHints(
          'Connect litres and kilometres with a per-litre rate.',
          `${distance} ÷ ${litres} gives km per litre.`,
          'Litres = distance ÷ (km per litre).',
          `One litre covers ${kmPerLitre} km; the answer is ${answer}.`,
        ),
        shortcut: 'km per litre = distance ÷ litres; litres = distance ÷ km-per-litre.',
      })
    }
    case 'remainingFuel': {
      const rate = int(ctx.rng, mag(ctx, 3, 5, 8), mag(ctx, 12, 30, 60))
      const hours = int(ctx.rng, mag(ctx, 2, 3, 4), mag(ctx, 8, 15, 25))
      const leg1 = rate * hours
      const twoLegs = ctx.difficulty === 'hard' && ctx.rng() < 0.5
      const rate2 = twoLegs ? int(ctx.rng, 5, 30) : 0
      const hours2 = twoLegs ? int(ctx.rng, 2, 8) : 0
      const leg2 = rate2 * hours2
      const remaining = int(ctx.rng, mag(ctx, 5, 10, 20), mag(ctx, 40, 150, 400))
      const initial = leg1 + leg2 + remaining
      const prompt = twoLegs
        ? `A tank starts with ${initial} litres. The engine burns ${rate} litres/hour for ${hours} hours, then ${rate2} litres/hour for ${hours2} hours. How much fuel remains?`
        : `A tank starts with ${initial} litres. The engine burns ${rate} litres/hour for ${hours} hours. How much fuel remains?`
      const used = leg1 + leg2
      return build({
        prompt,
        type: 'numeric',
        ...num(remaining),
        answerUnit: 'litres',
        explanation: `Fuel burned = ${leg1}${twoLegs ? ` + ${leg2}` : ''} = ${used} litres. Remaining = ${initial} − ${used} = ${remaining} litres.`,
        steps: [
          `First leg burn = ${rate} × ${hours} = ${leg1} litres.`,
          twoLegs ? `Second leg burn = ${rate2} × ${hours2} = ${leg2} litres.` : `Total burned = ${leg1} litres.`,
          `${initial} − ${used} = ${remaining} litres remaining.`,
        ],
        hints: makeHints(
          'Work out the total fuel burned first.',
          twoLegs ? 'Burn each leg separately and add them.' : `Multiply ${rate} by ${hours}.`,
          'Remaining = starting fuel − fuel burned.',
          `Burned = ${used} litres; ${initial} − ${used} = ${remaining} litres.`,
        ),
        shortcut: 'Remaining fuel = initial − (rate × time) for each leg.',
      })
    }
    case 'timeWork': {
      const daysPerJob = int(ctx.rng, mag(ctx, 2, 3, 4), mag(ctx, 8, 15, 30))
      const jobs = int(ctx.rng, mag(ctx, 2, 3, 4), mag(ctx, 5, 10, 20))
      const total = daysPerJob * jobs
      const reverse = ctx.difficulty !== 'easy' && ctx.rng() < 0.4
      const answer = reverse ? total : daysPerJob
      const prompt = reverse
        ? `A worker needs ${daysPerJob} days to finish one job. How many days are needed for ${jobs} identical jobs?`
        : `A worker completes ${jobs} identical jobs in ${total} days. How many days does one job take?`
      return build({
        prompt,
        type: 'numeric',
        ...num(answer),
        answerUnit: 'days',
        explanation: `Time per job is ${total}/${jobs} = ${daysPerJob} days, so ${jobs} jobs take ${jobs} × ${daysPerJob} = ${total} days.`,
        steps: [
          reverse ? `One job takes ${daysPerJob} days.` : `Total time = ${total} days for ${jobs} jobs.`,
          reverse ? `Multiply by ${jobs} jobs.` : `Divide ${total} by ${jobs}.`,
          reverse ? `Total = ${answer} days.` : `One job = ${answer} days.`,
        ],
        hints: makeHints(
          'Keep the time for one job as your unit.',
          reverse ? `Multiply ${daysPerJob} by ${jobs}.` : `Divide ${total} by ${jobs}.`,
          'Direct proportion: more identical jobs take proportionally longer.',
          `One job = ${daysPerJob} days; the answer is ${answer} days.`,
        ),
        shortcut: 'Find the time for one job, then scale.',
      })
    }
    case 'combinedWork': {
      if (ctx.difficulty === 'hard') {
        const whole = int(ctx.rng, 6, mag(ctx, 10, 18, 30))
        const triple = pick(ctx.rng, [[2, 3, 6], [3, 3, 3], [2, 4, 4]])
        const [p, q, r] = triple
        const t1 = whole * p
        const t2 = whole * q
        const t3 = whole * r
        return build({
          prompt: `Worker A finishes a job in ${t1} days, B in ${t2} days and C in ${t3} days. Working together, how many whole days do they need for one job?`,
          type: 'numeric',
          ...num(whole),
          answerUnit: 'days',
          explanation: `Daily rates are 1/${t1}, 1/${t2} and 1/${t3}. Their sum is 1/${whole} of a job per day, so they finish in ${whole} days.`,
          steps: [
            `Write the rates: 1/${t1} + 1/${t2} + 1/${t3}.`,
            `The sum equals 1/${whole} of the job per day.`,
            `Time for one job = ${whole} days.`,
          ],
          hints: makeHints(
            'Add work rates, not times.',
            'Each worker finishes 1/(their days) of the job per day.',
            'Reciprocal of the combined rate is the time.',
            `1/${t1} + 1/${t2} + 1/${t3} = 1/${whole}, so the answer is ${whole} days.`,
          ),
          shortcut: 'Add fractional rates, then take the reciprocal.',
        })
      }
      const p = int(ctx.rng, 1, mag(ctx, 2, 3, 3))
      const q = int(ctx.rng, p + 1, mag(ctx, 4, 5, 6))
      const k = int(ctx.rng, 1, mag(ctx, 2, 3, 4))
      const whole = k * p * q
      const t1 = (p + q) * k * p
      const t2 = (p + q) * k * q
      return build({
        prompt: `Worker A finishes a job in ${t1} days and B in ${t2} days. Working together, how many whole days do they need for one job?`,
        type: 'numeric',
        ...num(whole),
        answerUnit: 'days',
        explanation: `Daily rates: 1/${t1} + 1/${t2} = (${q} + ${p})/(${t1} common) = 1/${whole}. They finish the job in ${whole} days.`,
        steps: [
          `Rates are 1/${t1} and 1/${t2} of the job per day.`,
          `Add them: 1/${t1} + 1/${t2} = 1/${whole}.`,
          `Combined time = ${whole} days.`,
        ],
        hints: makeHints(
          'Add fractions of a job done per day.',
          `Use a common denominator for 1/${t1} and 1/${t2}.`,
          'Combined rate is in jobs/day; invert it for days/job.',
          `1/${t1} + 1/${t2} = 1/${whole}, so the answer is ${whole} days.`,
        ),
        shortcut: 'Combined rate = sum of individual rates; time = 1 ÷ rate.',
      })
    }
    default:
      throw new Error(`Unknown kind "${kind}" for family workProblem`)
  }
}

type AppliedFamily =
  | 'ratioProblem'
  | 'unitaryProblem'
  | 'speedProblem'
  | 'averageProblem'
  | 'algebraProblem'
  | 'workProblem'

/** Options for the stand-alone applied generators; `seed` fixes the RNG when supplied. */
export interface AppliedOptions extends QuestionOptions {
  seed?: number | string
}

const kindsByFamily: Record<AppliedFamily, readonly string[]> = {
  ratioProblem: ['understand', 'simplify', 'divide', 'direct', 'inverse', 'scale', 'mixtures'],
  unitaryProblem: ['pricePerUnit', 'quantityCost', 'consumption', 'production', 'fuel', 'timeWork', 'multiVar'],
  speedProblem: [
    'speed', 'distance', 'time', 'rearrange', 'minutesHours', 'kmhMs', 'msKmh',
    'knots', 'nautical', 'relative', 'average', 'journey',
  ],
  averageProblem: ['basic', 'missing', 'combined', 'weighted', 'speed'],
  algebraProblem: ['oneStep', 'twoStep', 'brackets', 'rearrange', 'unknown', 'word'],
  workProblem: ['fuelConsumption', 'ratePerHour', 'distanceConsumption', 'remainingFuel', 'timeWork', 'combinedWork'],
}

function isAppliedFamily(family: string): family is AppliedFamily {
  return Object.prototype.hasOwnProperty.call(kindsByFamily, family)
}

function resolveKind(family: AppliedFamily, rng: RNG, raw: unknown): string {
  const kinds = kindsByFamily[family]
  const kind = raw === undefined ? '' : String(raw)
  return kinds.includes(kind) ? kind : pick(rng, kinds)
}

function contextFor(spec: GeneratorSpec, options: AppliedOptions, family: AppliedFamily): GenContext {
  const variant = options.variant ?? 1
  const difficulty = options.difficulty ?? 'medium'
  const params = spec.params ?? {}
  const specKey = `${family}:${JSON.stringify(params)}`
  let rng: RNG
  if (options.seed !== undefined) {
    rng = mulberry32(typeof options.seed === 'number' ? options.seed : hashString(options.seed))
  } else if (options.rng) {
    rng = options.rng
  } else {
    rng = mulberry32(hashString(`${specKey}|${variant}|${difficulty}`))
  }
  return {
    rng,
    spec: { ...spec, family, params: { ...params, kind: resolveKind(family, rng, params.kind) } },
    difficulty,
    variant,
    levelId: options.levelId,
    chapterId: options.chapterId,
  }
}

function buildStandalone(spec: GeneratorSpec, options: AppliedOptions, family: AppliedFamily): GeneratedQuestion {
  const question = generateApplied(contextFor(spec, options, family), family)
  return {
    ...question,
    concept: options.concept ?? spec.concept ?? question.concept,
    conceptLabel: options.conceptLabel ?? spec.conceptLabel ?? question.conceptLabel,
    subtopic: options.subtopic ?? question.subtopic,
    levelId: options.levelId ?? question.levelId,
    chapterId: options.chapterId ?? question.chapterId,
  }
}

export function ratioProblem(spec: GeneratorSpec, options: AppliedOptions = {}): GeneratedQuestion {
  return buildStandalone(spec, options, 'ratioProblem')
}

export function unitaryProblem(spec: GeneratorSpec, options: AppliedOptions = {}): GeneratedQuestion {
  return buildStandalone(spec, options, 'unitaryProblem')
}

export function speedProblem(spec: GeneratorSpec, options: AppliedOptions = {}): GeneratedQuestion {
  return buildStandalone(spec, options, 'speedProblem')
}

export function averageProblem(spec: GeneratorSpec, options: AppliedOptions = {}): GeneratedQuestion {
  return buildStandalone(spec, options, 'averageProblem')
}

export function algebraProblem(spec: GeneratorSpec, options: AppliedOptions = {}): GeneratedQuestion {
  return buildStandalone(spec, options, 'algebraProblem')
}

export function workProblem(spec: GeneratorSpec, options: AppliedOptions = {}): GeneratedQuestion {
  return buildStandalone(spec, options, 'workProblem')
}

export function generateApplied(ctx: GenContext, family: string): GeneratedQuestion {
  if (!isAppliedFamily(family)) throw new Error(`Unknown applied question family: ${family}`)
  const kind = resolveKind(family, ctx.rng, ctx.spec.params?.kind)
  const normalized: GenContext = {
    ...ctx,
    spec: { ...ctx.spec, params: { ...(ctx.spec.params ?? {}), kind } },
  }
  switch (family) {
    case 'ratioProblem':
      return ratio(normalized, kind)
    case 'unitaryProblem':
      return unitary(normalized, kind)
    case 'speedProblem':
      return speed(normalized, kind)
    case 'averageProblem':
      return averages(normalized, kind)
    case 'algebraProblem':
      return algebra(normalized, kind)
    case 'workProblem':
      return work(normalized, kind)
  }
}
