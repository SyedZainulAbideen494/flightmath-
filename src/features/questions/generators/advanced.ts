import type { GenContext } from '../index'
import type { GeneratedQuestion } from '@/lib/types'
import { buildQuestion, makeHints } from '../builders'
import type { QuestionSeed } from '../builders'
import { int, pick, gcd, lcm, fmt, cleanNumber, round } from '../random'

type Draft = Omit<QuestionSeed, 'specKey' | 'variant' | 'rng' | 'concept' | 'conceptLabel' | 'subtopic' | 'difficulty'>
type KindHandler = (ctx: GenContext, family: string) => GeneratedQuestion
type Hints = [string, string, string, string]

function levelValue(ctx: GenContext, easy: number, medium: number, hard: number): number {
  return ctx.difficulty === 'easy' ? easy : ctx.difficulty === 'medium' ? medium : hard
}

function finish(ctx: GenContext, family: string, draft: Draft): GeneratedQuestion {
  const kind = String(ctx.spec.params?.kind ?? 'mixed')
  return buildQuestion({
    ...draft,
    specKey: `${family}:${JSON.stringify(ctx.spec.params ?? {})}`,
    variant: ctx.variant,
    rng: ctx.rng,
    concept: ctx.spec.concept ?? `${family}-${kind}`,
    conceptLabel: ctx.spec.conceptLabel ?? '',
    subtopic: kind,
    difficulty: ctx.difficulty,
    levelId: ctx.levelId,
    chapterId: ctx.chapterId,
  })
}

function numericDraft(
  prompt: string,
  value: number,
  explanation: string,
  steps: string[],
  hints: Hints,
  shortcut: string,
  answerUnit?: string,
  tolerance?: number,
): Draft {
  const answer = cleanNumber(value)
  return {
    prompt,
    type: 'numeric',
    answer: String(answer),
    numericAnswer: answer,
    tolerance,
    answerUnit,
    explanation,
    steps,
    hints,
    shortcut,
  }
}

function mcqDraft(
  prompt: string,
  answer: string,
  distractors: string[],
  explanation: string,
  steps: string[],
  hints: Hints,
  shortcut: string,
): Draft {
  return { prompt, type: 'mcq', answer, distractors, explanation, steps, hints, shortcut }
}

function boolDraft(
  prompt: string,
  value: boolean,
  explanation: string,
  steps: string[],
  hints: Hints,
  shortcut: string,
): Draft {
  return {
    prompt,
    type: 'boolean',
    answer: value ? 'Yes' : 'No',
    explanation,
    steps,
    hints,
    shortcut,
  }
}

function textDistractors(correct: string, candidates: string[]): string[] {
  const out: string[] = []
  for (const candidate of candidates) {
    if (candidate !== correct && !out.includes(candidate)) out.push(candidate)
    if (out.length === 3) break
  }
  const fallback = ['0', '1', '1/2', '1/3', '2/3', '1/4', '3/4', 'Cannot determine']
  for (const extra of fallback) {
    if (out.length >= 3) break
    if (extra !== correct && !out.includes(extra)) out.push(extra)
  }
  return out
}

function fractionText(numerator: number, denominator: number): string {
  const divisor = gcd(numerator, denominator)
  return `${numerator / divisor}/${denominator / divisor}`
}

function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const suffix = n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'
  return `${n}${suffix}`
}

function bearing(degrees: number): string {
  const normalized = ((Math.round(degrees) % 360) + 360) % 360
  return String(normalized).padStart(3, '0')
}

// ---------------------------------------------------------------------------
// sequenceProblem
// ---------------------------------------------------------------------------

function sequenceArithmetic(ctx: GenContext, family: string): GeneratedQuestion {
  const a = int(ctx.rng, levelValue(ctx, 2, 3, 5), levelValue(ctx, 9, 18, 32))
  const d = int(ctx.rng, levelValue(ctx, 2, 3, 4), levelValue(ctx, 5, 9, 13))
  const n = int(ctx.rng, levelValue(ctx, 5, 7, 10), levelValue(ctx, 7, 12, 18))
  const answer = a + (n - 1) * d
  const short = 'Tₙ = a + (n − 1)d'
  return finish(
    ctx,
    family,
    numericDraft(
      `An arithmetic sequence starts at ${a} and increases by ${d} each step. What is its ${ordinal(n)} term?`,
      answer,
      `Starting at ${a}, adding ${d} exactly ${n - 1} times gives ${answer}. The nth-term formula gives the same result.`,
      [
        `First term a = ${a}, common difference d = ${d}.`,
        `Use Tₙ = a + (n − 1)d with n = ${n}.`,
        `Tₙ = ${a} + ${n - 1} × ${d} = ${answer}.`,
      ],
      makeHints(
        'Write out the first few terms and watch the jump between them.',
        'Find the first term and the constant difference, then use the nth-term formula.',
        short,
        `Here a = ${a} and d = ${d}, so T_${n} = ${a} + ${n - 1} × ${d} = ${answer}.`,
      ),
      short,
    ),
  )
}

function sequenceGeometric(ctx: GenContext, family: string): GeneratedQuestion {
  const a = int(ctx.rng, 1, levelValue(ctx, 4, 6, 8))
  const r = int(ctx.rng, 2, levelValue(ctx, 3, 4, 5))
  const n = int(ctx.rng, levelValue(ctx, 4, 5, 6), levelValue(ctx, 5, 8, 10))
  const power = n - 1
  const answer = a * r ** power
  const short = 'Tₙ = a × r^(n − 1)'
  return finish(
    ctx,
    family,
    numericDraft(
      `A geometric sequence starts at ${a} and each term is multiplied by ${r}. What is its ${ordinal(n)} term?`,
      answer,
      `The multiplier is applied ${power} times after the first term, so Tₙ = ${a} × ${r}^${power} = ${answer}.`,
      [
        `First term a = ${a}, common ratio r = ${r}.`,
        `Use Tₙ = a × r^(n − 1) with n = ${n}.`,
        `Tₙ = ${a} × ${r}^${power} = ${answer}.`,
      ],
      makeHints(
        'Divide a term by the previous one to find the multiplier.',
        'Geometric sequences multiply by the same ratio at every step.',
        short,
        `With a = ${a} and r = ${r}, the ${ordinal(n)} term is ${a} × ${r}^${power} = ${answer}.`,
      ),
      short,
    ),
  )
}

function sequenceMissing(ctx: GenContext, family: string): GeneratedQuestion {
  const geometric = ctx.rng() < 0.5
  const length = geometric ? 5 : 6
  const missing = int(ctx.rng, 1, length - 2)
  const a = geometric ? int(ctx.rng, 1, 4) : int(ctx.rng, levelValue(ctx, 2, 3, 4), levelValue(ctx, 8, 14, 22))
  const step = geometric ? int(ctx.rng, 2, 3) : int(ctx.rng, levelValue(ctx, 2, 3, 4), levelValue(ctx, 5, 8, 12))
  const terms: number[] = []
  for (let i = 0; i < length; i += 1) terms.push(geometric ? a * step ** i : a + i * step)
  const answer = terms[missing]
  const shown = terms.map((term, i) => (i === missing ? '?' : String(term))).join(', ')
  const operator = geometric ? '×' : '+'
  const short = geometric ? 'Multiply by the common ratio' : 'Add the common difference'
  return finish(
    ctx,
    family,
    numericDraft(
      `Find the missing term in this sequence: ${shown}. What number replaces the question mark?`,
      answer,
      `The step is ${operator} ${step} each time, so the missing value is ${terms[missing - 1]} ${operator} ${step} = ${answer}.`,
      [
        `Compare neighbours: ${terms[0]} and ${terms[1]} show a step of ${operator} ${step}.`,
        `The missing term is in position ${missing + 1}, after ${terms[missing - 1]}.`,
        `${terms[missing - 1]} ${operator} ${step} = ${answer}.`,
      ],
      makeHints(
        'Look at the two terms before the gap to identify the step.',
        geometric ? 'Check whether each term is a fixed multiple of the last.' : 'Check whether the same number is added each time.',
        short,
        `The rule is ${operator} ${step}, and the term before the gap is ${terms[missing - 1]}, so the missing term is ${answer}.`,
      ),
      short,
    ),
  )
}

function sequenceDifferences(ctx: GenContext, family: string): GeneratedQuestion {
  const a = int(ctx.rng, levelValue(ctx, 2, 3, 5), levelValue(ctx, 8, 15, 25))
  const d = int(ctx.rng, levelValue(ctx, 2, 3, 4), levelValue(ctx, 5, 8, 12))
  const k = int(ctx.rng, levelValue(ctx, 1, 2, 2), levelValue(ctx, 2, 4, 6))
  const terms: number[] = [a]
  const diffs: number[] = []
  let current = a
  let step = d
  for (let i = 0; i < 4; i += 1) {
    diffs.push(step)
    current += step
    terms.push(current)
    step += k
  }
  const answer = current + step
  const short = 'Extend the difference pattern, then add'
  return finish(
    ctx,
    family,
    numericDraft(
      `The differences between these terms grow by ${k} each step: ${terms.join(', ')}. What is the next term?`,
      answer,
      `The differences are ${diffs.join(', ')} and ${step}. Adding the next difference to ${current} gives ${answer}.`,
      [
        `Differences so far: ${diffs.join(', ')}.`,
        `Each grows by ${k}, so the next difference is ${step}.`,
        `Next term = ${current} + ${step} = ${answer}.`,
      ],
      makeHints(
        'Write the differences between neighbouring terms underneath the sequence.',
        'The differences themselves form a simple arithmetic sequence.',
        short,
        `The next difference is ${diffs[diffs.length - 1]} + ${k} = ${step}, so the next term is ${current} + ${step} = ${answer}.`,
      ),
      short,
    ),
  )
}

function sequenceSquare(ctx: GenContext, family: string): GeneratedQuestion {
  const c = int(ctx.rng, levelValue(ctx, 0, 1, -8), levelValue(ctx, 6, 15, 24))
  const m = int(ctx.rng, levelValue(ctx, 6, 7, 9), levelValue(ctx, 9, 13, 18))
  const answer = m * m + c
  const rule = c >= 0 ? `n² + ${c}` : `n² − ${Math.abs(c)}`
  const short = 'Square n, then apply the offset'
  return finish(
    ctx,
    family,
    numericDraft(
      `A sequence uses the rule term = ${rule}. For example, the first three terms are ${1 + c}, ${4 + c} and ${9 + c}. What is the term when n = ${m}?`,
      answer,
      `Substitute n = ${m} into ${rule}: ${m}² = ${m * m}, then adjust by ${c} to get ${answer}.`,
      [
        `The rule is term = ${rule}.`,
        `For n = ${m}, m² = ${m * m}.`,
        `${m * m} ${c >= 0 ? '+' : '−'} ${Math.abs(c)} = ${answer}.`,
      ],
      makeHints(
        'The sequence is built from the square numbers 1, 4, 9, 16, ...',
        'Find the term by squaring the position, then applying the fixed offset.',
        short,
        `Squaring ${m} gives ${m * m}; applying the offset gives ${answer}.`,
      ),
      short,
    ),
  )
}

function sequenceRecognition(ctx: GenContext, family: string): GeneratedQuestion {
  const geometric = ctx.rng() < 0.5
  const step = int(ctx.rng, 2, levelValue(ctx, 4, 6, 9))
  const a = int(ctx.rng, 2, 9)
  const terms: number[] = []
  for (let i = 0; i < 5; i += 1) terms.push(geometric ? a * step ** i : a + i * step)
  const correct = geometric ? `Multiply by ${step} each time` : `Add ${step} each time`
  const distractors = textDistractors(correct, [
    geometric ? `Add ${step} each time` : `Multiply by ${step} each time`,
    geometric ? `Multiply by ${step + 1} each time` : `Add ${step + 1} each time`,
    geometric ? `Multiply by ${Math.max(2, step - 1)} each time` : `Add ${Math.max(1, step - 1)} each time`,
    `Add ${step * 2} each time`,
    'Square the position each time',
  ])
  const short = geometric ? 'Divide neighbours to spot a ratio' : 'Subtract neighbours to spot a difference'
  return finish(
    ctx,
    family,
    mcqDraft(
      `Which rule generates the sequence ${terms.join(', ')}, ...?`,
      correct,
      distractors,
      geometric
        ? `Each term is ${step} times the previous one, so the rule is "multiply by ${step}".`
        : `Each term is ${step} more than the previous one, so the rule is "add ${step}".`,
      [
        `Compare the first terms: ${terms[0]}, ${terms[1]}, ${terms[2]}.`,
        geometric ? `${terms[1]} ÷ ${terms[0]} = ${step} every time.` : `${terms[1]} − ${terms[0]} = ${step} every time.`,
        `So the generating rule is: ${correct}.`,
      ],
      makeHints(
        'Look at what changes from one term to the next.',
        geometric ? 'Try dividing consecutive terms.' : 'Try subtracting consecutive terms.',
        short,
        `The pattern is ${correct}, which reproduces ${terms.join(', ')}.`,
      ),
      short,
    ),
  )
}

// ---------------------------------------------------------------------------
// probabilityProblem
// ---------------------------------------------------------------------------

function probabilityBasic(ctx: GenContext, family: string): GeneratedQuestion {
  const total = int(ctx.rng, levelValue(ctx, 6, 10, 16), levelValue(ctx, 12, 24, 44))
  const red = int(ctx.rng, 1, total - 1)
  const blue = total - red
  const answer = fractionText(red, total)
  const distractors = textDistractors(answer, [
    fractionText(red, blue),
    fractionText(blue, total),
    fractionText(blue, red),
    fractionText(red + 1, total + 1),
    fmt(red / total),
  ])
  const short = 'P(event) = favourable ÷ total, then simplify'
  return finish(
    ctx,
    family,
    mcqDraft(
      `A bag contains ${red} red and ${blue} blue counters. One counter is picked at random. What is the probability that it is red? Give a simplified fraction.`,
      answer,
      distractors,
      `There are ${total} counters in total and ${red} are red, so P(red) = ${red}/${total} = ${answer}.`,
      [
        `Total counters = ${red} + ${blue} = ${total}.`,
        `Favourable counters = ${red}.`,
        `P(red) = ${red}/${total} = ${answer}.`,
      ],
      makeHints(
        'Count every counter in the bag first.',
        'Probability equals favourable outcomes divided by all outcomes.',
        short,
        `There are ${total} counters, ${red} of them red, so the probability is ${red}/${total} = ${answer}.`,
      ),
      short,
    ),
  )
}

function probabilityFractions(ctx: GenContext, family: string): GeneratedQuestion {
  const sectors = int(ctx.rng, levelValue(ctx, 4, 8, 12), levelValue(ctx, 8, 16, 28))
  const shaded = int(ctx.rng, 1, sectors - 1)
  const unshaded = sectors - shaded
  const answer = fractionText(shaded, sectors)
  const distractors = textDistractors(answer, [
    fractionText(shaded, unshaded),
    fractionText(unshaded, sectors),
    fractionText(unshaded, shaded),
    fractionText(shaded + 1, sectors + 1),
    fmt(shaded / sectors),
  ])
  const short = 'Shaded sectors ÷ all sectors, reduced'
  return finish(
    ctx,
    family,
    mcqDraft(
      `A spinner has ${sectors} equal sectors, of which ${shaded} are shaded. What is the probability that one spin lands on a shaded sector? Give a simplified fraction.`,
      answer,
      distractors,
      `Each sector is equally likely, so the probability is ${shaded}/${sectors} = ${answer}.`,
      [
        `All equally likely outcomes = ${sectors} sectors.`,
        `Favourable outcomes = ${shaded} shaded sectors.`,
        `P(shaded) = ${shaded}/${sectors} = ${answer}.`,
      ],
      makeHints(
        'Every equal sector has the same chance of being landed on.',
        'Write favourable sectors over total sectors.',
        short,
        `With ${shaded} shaded sectors out of ${sectors}, the probability is ${shaded}/${sectors} = ${answer}.`,
      ),
      short,
    ),
  )
}

function probabilityDice(ctx: GenContext, family: string): GeneratedQuestion {
  const twoDice = ctx.difficulty === 'hard' && ctx.rng() < 0.5
  let fav: number
  let total: number
  let eventText: string
  if (twoDice) {
    const event = pick(ctx.rng, [
      { text: 'a total of 7', count: 6 },
      { text: 'a total of 8', count: 5 },
      { text: 'doubles', count: 6 },
      { text: 'a total greater than 10', count: 3 },
    ])
    fav = event.count
    total = 36
    eventText = event.text
  } else {
    const event = pick(ctx.rng, [
      { text: 'an even number', count: 3 },
      { text: 'an odd number', count: 3 },
      { text: 'a number greater than 4', count: 2 },
      { text: 'a number less than 3', count: 2 },
      { text: 'a multiple of 3', count: 2 },
      { text: 'a prime number', count: 3 },
    ])
    fav = event.count
    total = 6
    eventText = event.text
  }
  const answer = fractionText(fav, total)
  const distractors = textDistractors(answer, [
    fractionText(total - fav, total),
    fractionText(fav, total + 2),
    fractionText(fav + 1, total),
    fractionText(fav, Math.max(2, total - 2)),
    fmt(fav / total),
  ])
  const short = 'Count favourable outcomes over 6ⁿ outcomes'
  return finish(
    ctx,
    family,
    mcqDraft(
      `${twoDice ? 'Two fair six-sided dice are rolled' : 'A fair six-sided die is rolled'}. What is the probability of getting ${eventText}? Give a simplified fraction.`,
      answer,
      distractors,
      `There are ${total} equally likely outcomes and ${fav} are favourable, so the probability is ${fav}/${total} = ${answer}.`,
      [
        `Total equally likely outcomes = ${total}.`,
        `Favourable outcomes for ${eventText} = ${fav}.`,
        `P = ${fav}/${total} = ${answer}.`,
      ],
      makeHints(
        twoDice ? 'List the ordered pairs of dice results.' : 'List the numbers on a standard die.',
        'Count the outcomes that match the event, then divide by the total.',
        short,
        `The event ${eventText} occurs in ${fav} of ${total} outcomes, giving ${answer}.`,
      ),
      short,
    ),
  )
}

function probabilityCoins(ctx: GenContext, family: string): GeneratedQuestion {
  const coins = ctx.difficulty === 'easy' ? 1 : ctx.difficulty === 'medium' ? 2 : 3
  const events =
    coins === 1
      ? [
          { text: 'heads', count: 1 },
          { text: 'tails', count: 1 },
        ]
      : coins === 2
        ? [
            { text: 'exactly one head', count: 2 },
            { text: 'two heads', count: 1 },
            { text: 'at least one head', count: 3 },
            { text: 'two tails', count: 1 },
          ]
        : [
            { text: 'exactly two heads', count: 3 },
            { text: 'exactly one head', count: 3 },
            { text: 'three heads', count: 1 },
            { text: 'at least one head', count: 7 },
          ]
  const event = pick(ctx.rng, events)
  const total = 2 ** coins
  const answer = fractionText(event.count, total)
  const distractors = textDistractors(answer, [
    fractionText(total - event.count, total),
    fractionText(event.count, total * 2),
    fractionText(event.count + 1, total + 2),
    fractionText(1, total),
    fmt(event.count / total),
  ])
  const short = 'List 2ⁿ outcomes and count matches'
  return finish(
    ctx,
    family,
    mcqDraft(
      `${coins} fair coin${coins === 1 ? '' : 's'} ${coins === 1 ? 'is' : 'are'} tossed. What is the probability of getting ${event.text}? Give a simplified fraction.`,
      answer,
      distractors,
      `There are ${total} equally likely outcomes and ${event.count} match ${event.text}, so the probability is ${answer}.`,
      [
        `Number of outcomes = 2^${coins} = ${total}.`,
        `Outcomes matching ${event.text} = ${event.count}.`,
        `P = ${event.count}/${total} = ${answer}.`,
      ],
      makeHints(
        `Write out the possible head/tail sequences for ${coins} coin${coins === 1 ? '' : 's'}.`,
        'Count the sequences that satisfy the event and divide by all sequences.',
        short,
        `${event.count} of the ${total} outcomes give ${event.text}, so the probability is ${answer}.`,
      ),
      short,
    ),
  )
}

function probabilityCards(ctx: GenContext, family: string): GeneratedQuestion {
  const events = [
    { text: 'a heart', fav: 13 },
    { text: 'a red card', fav: 26 },
    { text: 'an ace', fav: 4 },
    { text: 'a face card (J, Q or K)', fav: 12 },
    { text: 'a black queen', fav: 2 },
    { text: 'a card that is not a club', fav: 39 },
  ]
  const pool = ctx.difficulty === 'easy' ? events.slice(0, 3) : ctx.difficulty === 'medium' ? events.slice(0, 5) : events
  const event = pick(ctx.rng, pool)
  const answer = fractionText(event.fav, 52)
  const distractors = textDistractors(answer, [
    `${event.fav}/52`,
    fractionText(52 - event.fav, 52),
    fractionText(event.fav + 1, 52),
    fractionText(event.fav, 26),
    fmt(event.fav / 52),
  ])
  const short = 'Favourable cards ÷ 52, then simplify'
  return finish(
    ctx,
    family,
    mcqDraft(
      `One card is drawn from a standard 52-card deck. What is the probability of drawing ${event.text}? Give a simplified fraction.`,
      answer,
      distractors,
      `There are ${event.fav} favourable cards out of 52, so P = ${event.fav}/52 = ${answer}.`,
      [
        'A standard deck has 52 cards.',
        `Favourable cards for ${event.text} = ${event.fav}.`,
        `P = ${event.fav}/52 = ${answer}.`,
      ],
      makeHints(
        'Recall the composition of a standard 52-card deck.',
        'Count the favourable cards and place that over 52.',
        short,
        `${event.fav} favourable cards out of 52 gives ${event.fav}/52, which simplifies to ${answer}.`,
      ),
      short,
    ),
  )
}

function probabilityMultiple(ctx: GenContext, family: string): GeneratedQuestion {
  const target = int(ctx.rng, levelValue(ctx, 3, 2, 1), levelValue(ctx, 5, 5, 4))
  const side = pick(ctx.rng, ['heads', 'tails'])
  const favourable = 6 - target
  const answer = fractionText(favourable, 12)
  const distractors = textDistractors(answer, [
    fractionText(favourable, 6),
    '1/2',
    fractionText(favourable + 1, 12),
    fractionText(12 - favourable, 12),
    fmt(favourable / 12),
  ])
  const short = 'Independent events: multiply the probabilities'
  return finish(
    ctx,
    family,
    mcqDraft(
      `A fair six-sided die is rolled and a fair coin is tossed. What is the probability of rolling a number greater than ${target} and getting ${side}? Give a simplified fraction.`,
      answer,
      distractors,
      `P(die > ${target}) = ${favourable}/6 and P(${side}) = 1/2, so the combined probability is ${favourable}/12 = ${answer}.`,
      [
        `Numbers greater than ${target} on a die: ${favourable} of 6.`,
        `P(${side}) = 1/2, and the events are independent.`,
        `${favourable}/6 × 1/2 = ${favourable}/12 = ${answer}.`,
      ],
      makeHints(
        'Treat the die roll and the coin toss separately.',
        'For independent events, multiply the two probabilities.',
        short,
        `The die part is ${favourable}/6, the coin part is 1/2, and their product simplifies to ${answer}.`,
      ),
      short,
    ),
  )
}

function probabilityChallenge(ctx: GenContext, family: string): GeneratedQuestion {
  const red = int(ctx.rng, levelValue(ctx, 3, 4, 5), levelValue(ctx, 6, 10, 16))
  const blue = int(ctx.rng, 1, levelValue(ctx, 4, 7, 12))
  const green = int(ctx.rng, 1, levelValue(ctx, 4, 7, 12))
  const total = red + blue + green
  const numerator = red * (red - 1)
  const denominator = total * (total - 1)
  const answer = fractionText(numerator, denominator)
  const distractors = textDistractors(answer, [
    fractionText(red, total),
    fractionText(red - 1, total - 1),
    fractionText(numerator + 1, denominator),
    fractionText(red, total - 1),
    fmt(numerator / denominator),
  ])
  const short = 'Multiply without-replacement probabilities'
  return finish(
    ctx,
    family,
    mcqDraft(
      `A bag has ${red} red, ${blue} blue and ${green} green balls. Two balls are drawn without replacement. What is the probability that both are red? Give a simplified fraction.`,
      answer,
      distractors,
      `P(first red) = ${red}/${total} and P(second red) = ${red - 1}/${total - 1}, so P(both red) = ${numerator}/${denominator} = ${answer}.`,
      [
        `Total balls = ${red} + ${blue} + ${green} = ${total}.`,
        `P(first red) = ${red}/${total}; P(second red) = ${red - 1}/${total - 1}.`,
        `Product = ${numerator}/${denominator} = ${answer}.`,
      ],
      makeHints(
        'The second probability changes because the first ball is not replaced.',
        'Multiply the probability of each draw.',
        short,
        `The two probabilities are ${red}/${total} and ${red - 1}/${total - 1}; their product simplifies to ${answer}.`,
      ),
      short,
    ),
  )
}

// ---------------------------------------------------------------------------
// geometryProblem
// ---------------------------------------------------------------------------

function geometryPerimeter(ctx: GenContext, family: string): GeneratedQuestion {
  const length = int(ctx.rng, levelValue(ctx, 3, 5, 8), levelValue(ctx, 12, 24, 48))
  const width = int(ctx.rng, levelValue(ctx, 2, 4, 6), levelValue(ctx, 9, 18, 36))
  const answer = 2 * (length + width)
  const short = 'P = 2(l + w)'
  return finish(
    ctx,
    family,
    numericDraft(
      `A rectangle is ${length} cm long and ${width} cm wide. What is its perimeter, in cm?`,
      answer,
      `Adding the length and width and doubling gives 2 × (${length} + ${width}) = ${answer} cm.`,
      [
        `Perimeter of a rectangle = 2(length + width).`,
        `length + width = ${length} + ${width} = ${length + width} cm.`,
        `Perimeter = 2 × ${length + width} = ${answer} cm.`,
      ],
      makeHints(
        'A rectangle has two long sides and two short sides.',
        'Add one length and one width, then double.',
        short,
        `2 × (${length} + ${width}) = 2 × ${length + width} = ${answer} cm.`,
      ),
      short,
      'cm',
    ),
  )
}

function geometryRectArea(ctx: GenContext, family: string): GeneratedQuestion {
  const length = int(ctx.rng, levelValue(ctx, 3, 6, 9), levelValue(ctx, 12, 26, 50))
  const width = int(ctx.rng, levelValue(ctx, 2, 4, 7), levelValue(ctx, 10, 20, 40))
  const answer = length * width
  const short = 'A = length × width'
  return finish(
    ctx,
    family,
    numericDraft(
      `A rectangle is ${length} cm long and ${width} cm wide. What is its area, in cm²?`,
      answer,
      `Area = length × width = ${length} × ${width} = ${answer} cm².`,
      [
        `Area of a rectangle = length × width.`,
        `Substitute the dimensions: ${length} cm × ${width} cm.`,
        `Area = ${answer} cm².`,
      ],
      makeHints(
        'Area measures the space inside the rectangle.',
        'Multiply the two side lengths together.',
        short,
        `${length} × ${width} = ${answer}, so the area is ${answer} cm².`,
      ),
      short,
      'cm²',
    ),
  )
}

function geometryTriangleArea(ctx: GenContext, family: string): GeneratedQuestion {
  const base = int(ctx.rng, levelValue(ctx, 4, 6, 8), levelValue(ctx, 14, 26, 44))
  let height = int(ctx.rng, levelValue(ctx, 3, 5, 7), levelValue(ctx, 12, 24, 40))
  if (ctx.difficulty === 'easy' && (base * height) % 2 !== 0) height += 1
  const answer = cleanNumber((base * height) / 2)
  const short = 'A = ½ × base × height'
  return finish(
    ctx,
    family,
    numericDraft(
      `A triangle has a base of ${base} cm and a perpendicular height of ${height} cm. What is its area, in cm²?`,
      answer,
      `Area = ½ × base × height = ½ × ${base} × ${height} = ${fmt(answer)} cm².`,
      [
        `Area of a triangle = ½ × base × height.`,
        `base × height = ${base} × ${height} = ${base * height}.`,
        `Half of that is ${fmt(answer)} cm².`,
      ],
      makeHints(
        'The height must be perpendicular to the base.',
        'Multiply base by height, then halve the result.',
        short,
        `½ × ${base} × ${height} = ${base * height} ÷ 2 = ${fmt(answer)} cm².`,
      ),
      short,
      'cm²',
    ),
  )
}

function circleDimensions(ctx: GenContext, easyMin: number, easyMax: number): { text: string; radius: number } {
  if (ctx.difficulty !== 'easy' && ctx.rng() < 0.5) {
    const diameter = 2 * int(ctx.rng, easyMin, easyMax)
    return { text: `a diameter of ${diameter} cm`, radius: diameter / 2 }
  }
  const radius = int(ctx.rng, easyMin, easyMax)
  return { text: `a radius of ${radius} cm`, radius }
}

function geometryCircumference(ctx: GenContext, family: string): GeneratedQuestion {
  const shape = circleDimensions(ctx, levelValue(ctx, 2, 4, 7), levelValue(ctx, 10, 20, 40))
  const raw = 2 * 3.14 * shape.radius
  const answer = round(raw, 1)
  const short = 'C = 2πr'
  return finish(
    ctx,
    family,
    numericDraft(
      `A circle has ${shape.text}. Find its circumference, in cm. Use π = 3.14. Round your answer to 1 decimal place.`,
      answer,
      `Circumference = 2πr = 2 × 3.14 × ${shape.radius} = ${fmt(raw)}, which rounds to ${fmt(answer)} cm.`,
      [
        `Circumference = 2πr with r = ${shape.radius} cm.`,
        `2 × 3.14 × ${shape.radius} = ${fmt(raw)}.`,
        `Rounded to 1 decimal place: ${fmt(answer)} cm.`,
      ],
      makeHints(
        'The circumference is the distance around the circle.',
        'Use C = 2πr, and halve a diameter first if one is given.',
        short,
        `With r = ${shape.radius} cm, C = 2 × 3.14 × ${shape.radius} = ${fmt(raw)} cm, which rounds to ${fmt(answer)} cm.`,
      ),
      short,
      'cm',
      0.06,
    ),
  )
}

function geometryCircleArea(ctx: GenContext, family: string): GeneratedQuestion {
  const shape = circleDimensions(ctx, levelValue(ctx, 2, 4, 6), levelValue(ctx, 9, 18, 32))
  const raw = 3.14 * shape.radius * shape.radius
  const answer = round(raw, 1)
  const short = 'A = πr²'
  return finish(
    ctx,
    family,
    numericDraft(
      `A circle has ${shape.text}. Find its area, in cm². Use π = 3.14. Round your answer to 1 decimal place.`,
      answer,
      `Area = πr² = 3.14 × ${shape.radius}² = ${fmt(raw)}, which rounds to ${fmt(answer)} cm².`,
      [
        `Area of a circle = πr² with r = ${shape.radius} cm.`,
        `3.14 × ${shape.radius}² = ${fmt(raw)}.`,
        `Rounded to 1 decimal place: ${fmt(answer)} cm².`,
      ],
      makeHints(
        'Area measures the space inside the circle.',
        'Square the radius first, then multiply by 3.14.',
        short,
        `With r = ${shape.radius} cm, A = 3.14 × ${shape.radius}² = ${fmt(raw)} cm², which rounds to ${fmt(answer)} cm².`,
      ),
      short,
      'cm²',
      0.06,
    ),
  )
}

function geometryVolume(ctx: GenContext, family: string): GeneratedQuestion {
  const length = int(ctx.rng, levelValue(ctx, 3, 5, 8), levelValue(ctx, 14, 26, 44))
  const width = int(ctx.rng, levelValue(ctx, 2, 4, 6), levelValue(ctx, 12, 22, 38))
  const height = int(ctx.rng, levelValue(ctx, 2, 3, 5), levelValue(ctx, 10, 18, 32))
  const answer = length * width * height
  const short = 'V = l × w × h'
  return finish(
    ctx,
    family,
    numericDraft(
      `A cuboid measures ${length} cm by ${width} cm by ${height} cm. What is its volume, in cm³?`,
      answer,
      `Volume = length × width × height = ${length} × ${width} × ${height} = ${answer} cm³.`,
      [
        `Volume of a cuboid = l × w × h.`,
        `${length} × ${width} = ${length * width}.`,
        `${length * width} × ${height} = ${answer} cm³.`,
      ],
      makeHints(
        'A cuboid is a box with three dimensions.',
        'Multiply length, width and height together.',
        short,
        `${length} × ${width} × ${height} = ${answer}, so the volume is ${answer} cm³.`,
      ),
      short,
      'cm³',
    ),
  )
}

function geometrySurface(ctx: GenContext, family: string): GeneratedQuestion {
  const length = int(ctx.rng, levelValue(ctx, 3, 5, 7), levelValue(ctx, 12, 20, 34))
  const width = int(ctx.rng, levelValue(ctx, 2, 4, 6), levelValue(ctx, 10, 16, 28))
  const height = int(ctx.rng, levelValue(ctx, 2, 3, 5), levelValue(ctx, 8, 14, 24))
  const answer = 2 * (length * width + length * height + width * height)
  const short = 'SA = 2(lw + lh + wh)'
  return finish(
    ctx,
    family,
    numericDraft(
      `A cuboid measures ${length} cm by ${width} cm by ${height} cm. What is its total surface area, in cm²?`,
      answer,
      `Surface area = 2(lw + lh + wh) = 2(${length * width} + ${length * height} + ${width * height}) = ${answer} cm².`,
      [
        `Surface area = 2(lw + lh + wh).`,
        `lw + lh + wh = ${length * width} + ${length * height} + ${width * height} = ${answer / 2}.`,
        `Doubling gives ${answer} cm².`,
      ],
      makeHints(
        'A cuboid has three different pairs of identical faces.',
        'Find the three face areas, add them, then double.',
        short,
        `The three face areas are ${length * width}, ${length * height} and ${width * height} cm², so the total is ${answer} cm².`,
      ),
      short,
      'cm²',
    ),
  )
}

function geometryBoss(ctx: GenContext, family: string): GeneratedQuestion {
  const length = int(ctx.rng, levelValue(ctx, 8, 12, 18), levelValue(ctx, 16, 30, 50))
  const width = int(ctx.rng, levelValue(ctx, 6, 9, 14), levelValue(ctx, 12, 24, 40))
  const side = int(ctx.rng, 1, Math.min(length, width) - 1)
  const rectangleArea = length * width
  const squareArea = side * side
  const answer = rectangleArea - squareArea
  const short = 'Outer area − cut-out area'
  return finish(
    ctx,
    family,
    numericDraft(
      `A rectangle measures ${length} cm by ${width} cm. A square of side ${side} cm is cut out of it. What is the remaining area, in cm²?`,
      answer,
      `The rectangle has area ${rectangleArea} cm² and the removed square ${squareArea} cm², leaving ${answer} cm².`,
      [
        `Rectangle area = ${length} × ${width} = ${rectangleArea} cm².`,
        `Square removed = ${side}² = ${squareArea} cm².`,
        `Remaining area = ${rectangleArea} − ${squareArea} = ${answer} cm².`,
      ],
      makeHints(
        'Find the area of the whole rectangle before the cut.',
        'Subtract the area of the square from the rectangle.',
        short,
        `${rectangleArea} − ${squareArea} = ${answer}, so ${answer} cm² remains.`,
      ),
      short,
      'cm²',
    ),
  )
}

// ---------------------------------------------------------------------------
// numberProperty
// ---------------------------------------------------------------------------

function numberFactors(ctx: GenContext, family: string): GeneratedQuestion {
  const n = int(ctx.rng, levelValue(ctx, 8, 20, 48), levelValue(ctx, 30, 90, 220))
  const pairs: string[] = []
  let count = 0
  for (let i = 1; i * i <= n; i += 1) {
    if (n % i !== 0) continue
    const other = n / i
    pairs.push(other === i ? `${i}²` : `${i} × ${other}`)
    count += other === i ? 1 : 2
  }
  const answer = count
  const short = 'Count factor pairs, doubling non-squares'
  return finish(
    ctx,
    family,
    numericDraft(
      `How many positive factors does ${n} have?`,
      answer,
      `The factor pairs are ${pairs.join(', ')}, giving ${answer} distinct positive factors.`,
      [
        `List factor pairs of ${n}: ${pairs.join(', ')}.`,
        'Each pair gives two factors, unless it is a repeated square root.',
        `Total number of factors = ${answer}.`,
      ],
      makeHints(
        'Start at 1 and work up to the square root of the number.',
        'Every factor below the square root has a partner above it.',
        short,
        `Counting the pairs ${pairs.join(', ')} gives ${answer} factors of ${n}.`,
      ),
      short,
    ),
  )
}

function numberMultiples(ctx: GenContext, family: string): GeneratedQuestion {
  const multiple = int(ctx.rng, levelValue(ctx, 2, 3, 4), levelValue(ctx, 7, 12, 20))
  const limit = int(ctx.rng, levelValue(ctx, 20, 50, 100), levelValue(ctx, 60, 200, 600))
  const answer = Math.floor(limit / multiple)
  const short = 'Count = floor(limit ÷ multiple)'
  return finish(
    ctx,
    family,
    numericDraft(
      `How many multiples of ${multiple} are there from 1 to ${limit} inclusive?`,
      answer,
      `The largest multiple of ${multiple} not exceeding ${limit} is ${answer * multiple}, so there are ${answer} multiples.`,
      [
        `Multiples begin ${multiple}, ${2 * multiple}, ${3 * multiple}, ...`,
        `Largest one ≤ ${limit} is ${answer * multiple}.`,
        `Count = ⌊${limit} ÷ ${multiple}⌋ = ${answer}.`,
      ],
      makeHints(
        'Think of the multiples as an equally spaced list.',
        'Divide the limit by the multiple and ignore the remainder.',
        short,
        `${limit} ÷ ${multiple} = ${fmt(limit / multiple)}, so there are ${answer} whole multiples.`,
      ),
      short,
    ),
  )
}

function coprimePair(ctx: GenContext): { x: number; y: number } {
  const x = int(ctx.rng, 2, levelValue(ctx, 5, 9, 15))
  let y = int(ctx.rng, 2, levelValue(ctx, 5, 9, 15))
  if (gcd(x, y) !== 1) y = x === 2 ? 3 : x % 2 === 0 ? x - 1 : x + 1
  return { x, y }
}

function numberHcf(ctx: GenContext, family: string): GeneratedQuestion {
  const g = int(ctx.rng, levelValue(ctx, 2, 3, 4), levelValue(ctx, 8, 15, 28))
  const { x, y } = coprimePair(ctx)
  const a = g * x
  const b = g * y
  const answer = g
  const short = 'Strip out the shared prime factors'
  return finish(
    ctx,
    family,
    numericDraft(
      `What is the highest common factor (HCF) of ${a} and ${b}?`,
      answer,
      `${a} = ${g} × ${x} and ${b} = ${g} × ${y}. Since ${x} and ${y} are coprime, the HCF is ${answer}.`,
      [
        `Write ${a} = ${g} × ${x} and ${b} = ${g} × ${y}.`,
        `gcd(${x}, ${y}) = 1, so no larger factor is shared.`,
        `HCF = ${answer}.`,
      ],
      makeHints(
        'Look for the largest number that divides both values.',
        'Factor each number and keep only the common factors.',
        short,
        `${g} is common to both, and the remaining parts ${x} and ${y} share nothing, so the HCF is ${answer}.`,
      ),
      short,
    ),
  )
}

function numberLcm(ctx: GenContext, family: string): GeneratedQuestion {
  const g = int(ctx.rng, levelValue(ctx, 2, 3, 4), levelValue(ctx, 6, 12, 22))
  const { x, y } = coprimePair(ctx)
  const a = g * x
  const b = g * y
  const divisor = gcd(a, b)
  const answer = lcm(a, b)
  const short = 'LCM = a × b ÷ HCF'
  return finish(
    ctx,
    family,
    numericDraft(
      `What is the lowest common multiple (LCM) of ${a} and ${b}?`,
      answer,
      `LCM = (${a} × ${b}) ÷ HCF = ${a * b} ÷ ${divisor} = ${answer}.`,
      [
        `Use LCM(a, b) = a × b ÷ gcd(a, b).`,
        `gcd(${a}, ${b}) = ${divisor}, and a × b = ${a * b}.`,
        `LCM = ${a * b} ÷ ${divisor} = ${answer}.`,
      ],
      makeHints(
        'List the first few multiples of the larger number.',
        'Alternatively use the product-over-HCF rule.',
        short,
        `The HCF is ${divisor}, so the LCM is ${a * b} ÷ ${divisor} = ${answer}.`,
      ),
      short,
    ),
  )
}

function numberDivisibility(ctx: GenContext, family: string): GeneratedQuestion {
  const divisors = [2, 3, 4, 5, 6, 8, 9, 10, 11]
  const divisor = pick(ctx.rng, ctx.difficulty === 'easy' ? divisors.slice(0, 5) : divisors)
  const quotient = int(ctx.rng, levelValue(ctx, 3, 8, 15), levelValue(ctx, 20, 80, 250))
  const exact = ctx.rng() < 0.5
  const remainder = exact ? 0 : int(ctx.rng, 1, divisor - 1)
  const n = divisor * quotient + remainder
  const yes = remainder === 0
  const short = 'Divide and check the remainder'
  return finish(
    ctx,
    family,
    boolDraft(
      `Is ${n} divisible by ${divisor}? Answer Yes or No.`,
      yes,
      `${divisor} × ${quotient} = ${divisor * quotient}, leaving a remainder of ${remainder}, so the answer is ${yes ? 'Yes' : 'No'}.`,
      [
        `Divide ${n} by ${divisor}.`,
        `${divisor} × ${quotient} = ${divisor * quotient}, remainder ${remainder}.`,
        `A remainder of ${remainder} gives the answer ${yes ? 'Yes' : 'No'}.`,
      ],
      makeHints(
        'Divisibility means the division leaves no remainder.',
        'Find the nearest multiple of the divisor below the number.',
        short,
        `${divisor} × ${quotient} = ${divisor * quotient}, so ${n} has remainder ${remainder} and the answer is ${yes ? 'Yes' : 'No'}.`,
      ),
      short,
    ),
  )
}

function numberRemainders(ctx: GenContext, family: string): GeneratedQuestion {
  const divisor = int(ctx.rng, levelValue(ctx, 3, 5, 7), levelValue(ctx, 11, 25, 60))
  const quotient = int(ctx.rng, levelValue(ctx, 4, 10, 20), levelValue(ctx, 30, 120, 400))
  const answer = int(ctx.rng, 1, divisor - 1)
  const n = divisor * quotient + answer
  const short = 'Subtract the largest exact multiple'
  return finish(
    ctx,
    family,
    numericDraft(
      `What is the remainder when ${n} is divided by ${divisor}?`,
      answer,
      `${divisor} × ${quotient} = ${divisor * quotient}, and ${n} − ${divisor * quotient} = ${answer}.`,
      [
        `Find the largest multiple of ${divisor} below ${n}.`,
        `${divisor} × ${quotient} = ${divisor * quotient}.`,
        `${n} − ${divisor * quotient} = ${answer}.`,
      ],
      makeHints(
        'The remainder is always smaller than the divisor.',
        'Subtract a suitable multiple of the divisor, then stop.',
        short,
        `Since ${divisor} × ${quotient} = ${divisor * quotient}, the leftover is ${n} − ${divisor * quotient} = ${answer}.`,
      ),
      short,
    ),
  )
}

function numberChallenge(ctx: GenContext, family: string): GeneratedQuestion {
  const g = int(ctx.rng, levelValue(ctx, 2, 3, 4), levelValue(ctx, 8, 14, 24))
  const { x, y } = coprimePair(ctx)
  const a = g * x
  const b = g * y
  const multiple = lcm(a, b)
  const product = g * multiple
  const short = 'a × b = HCF × LCM'
  return finish(
    ctx,
    family,
    numericDraft(
      `Two numbers have an HCF of ${g} and an LCM of ${multiple}. One number is ${a}. What is the other number?`,
      b,
      `For two numbers, a × b = HCF × LCM, so b = (${g} × ${multiple}) ÷ ${a} = ${fmt(product / a)} = ${b}.`,
      [
        `Use the identity a × b = HCF × LCM.`,
        `So b = (${g} × ${multiple}) ÷ ${a}.`,
        `b = ${fmt(product / a)} = ${b}.`,
      ],
      makeHints(
        'There is a fixed relationship between two numbers, their HCF and their LCM.',
        'Multiply the HCF by the LCM, then divide by the known number.',
        short,
        `${g} × ${multiple} = ${product}, and ${product} ÷ ${a} = ${b}.`,
      ),
      short,
    ),
  )
}

// ---------------------------------------------------------------------------
// trigProblem
// ---------------------------------------------------------------------------

function trigAngles(ctx: GenContext, family: string): GeneratedQuestion {
  const modes = ctx.difficulty === 'easy' ? ['straight', 'triangle'] : ['straight', 'triangle', 'point', 'vertical']
  const mode = pick(ctx.rng, modes)
  let prompt: string
  let answer: number
  let steps: string[]
  let walkthrough: string
  if (mode === 'straight') {
    const a = int(ctx.rng, 20, 160)
    answer = 180 - a
    prompt = `Two angles lie on a straight line. One angle is ${a}°. What is the other angle, in degrees?`
    steps = [`Angles on a straight line add to 180°.`, `Other angle = 180° − ${a}°.`, `Other angle = ${answer}°.`]
    walkthrough = `Angles on a straight line total 180°, so the missing angle is 180° − ${a}° = ${answer}°.`
  } else if (mode === 'triangle') {
    const a = int(ctx.rng, 20, 80)
    const b = int(ctx.rng, 20, 180 - a - 20)
    answer = 180 - a - b
    prompt = `A triangle has two angles of ${a}° and ${b}°. What is the third angle, in degrees?`
    steps = [`Angles in a triangle add to 180°.`, `${a}° + ${b}° = ${a + b}°.`, `Third angle = 180° − ${a + b}° = ${answer}°.`]
    walkthrough = `The two given angles total ${a + b}°, so the third angle is 180° − ${a + b}° = ${answer}°.`
  } else if (mode === 'point') {
    const a = int(ctx.rng, 20, 120)
    const b = int(ctx.rng, 20, 120)
    answer = 360 - a - b
    prompt = `Three angles meet at a point. Two of them are ${a}° and ${b}°. What is the third angle, in degrees?`
    steps = [`Angles around a point add to 360°.`, `${a}° + ${b}° = ${a + b}°.`, `Third angle = 360° − ${a + b}° = ${answer}°.`]
    walkthrough = `Angles around a point total 360°, so the unknown angle is 360° − ${a + b}° = ${answer}°.`
  } else {
    const a = int(ctx.rng, 10, 170)
    answer = a
    prompt = `Two lines cross. One angle at the crossing is ${a}°. What is the vertically opposite angle, in degrees?`
    steps = ['Vertically opposite angles are equal.', `The given angle is ${a}°.`, `The opposite angle is ${answer}°.`]
    walkthrough = `Vertically opposite angles are equal, so the opposite angle is also ${answer}°.`
  }
  const short = mode === 'point' ? 'Angles at a point sum to 360°' : mode === 'triangle' ? 'Angles in a triangle sum to 180°' : 'Use the straight-line or opposite-angle rule'
  return finish(
    ctx,
    family,
    numericDraft(
      prompt,
      answer,
      walkthrough,
      steps,
      makeHints(
        'Identify which angle rule applies to this diagram.',
        'Recall the fixed total for this configuration of angles.',
        short,
        walkthrough,
      ),
      short,
      '°',
    ),
  )
}

function trigRatio(ctx: GenContext, family: string, kind: 'sine' | 'cosine' | 'tangent'): GeneratedQuestion {
  const triples: [number, number, number][] = [
    [3, 4, 5],
    [5, 12, 13],
    [6, 8, 10],
    [8, 15, 17],
    [9, 12, 15],
  ]
  const [legA, legB, hypotenuse] = pick(ctx.rng, triples)
  const opposite = ctx.rng() < 0.5 ? legA : legB
  const adjacent = opposite === legA ? legB : legA
  const name = kind === 'sine' ? 'sin' : kind === 'cosine' ? 'cos' : 'tan'
  const rule = kind === 'sine' ? 'opposite ÷ hypotenuse' : kind === 'cosine' ? 'adjacent ÷ hypotenuse' : 'opposite ÷ adjacent'
  const numerator = kind === 'sine' ? opposite : kind === 'cosine' ? adjacent : opposite
  const denominator = kind === 'tangent' ? adjacent : hypotenuse
  const answer = fractionText(numerator, denominator)
  const distractors = textDistractors(answer, [
    fractionText(opposite, hypotenuse),
    fractionText(adjacent, hypotenuse),
    fractionText(opposite, adjacent),
    fractionText(adjacent, opposite),
    fractionText(hypotenuse, opposite),
  ])
  const short = `SOH-CAH-TOA: ${name} = ${rule}`
  return finish(
    ctx,
    family,
    mcqDraft(
      `In a right triangle, the side opposite angle θ is ${opposite} cm, the adjacent leg is ${adjacent} cm and the hypotenuse is ${hypotenuse} cm. What is ${name}(θ)? Give a simplified fraction.`,
      answer,
      distractors,
      `${name}(θ) = ${rule} = ${numerator}/${denominator} = ${answer}.`,
      [
        `For this angle, ${name} = ${rule}.`,
        `Substitute the sides: ${numerator}/${denominator}.`,
        `Simplify to ${answer}.`,
      ],
      makeHints(
        `Label the side opposite θ and the side next to θ.`,
        'Use SOH-CAH-TOA to choose the correct pair of sides.',
        short,
        `Using ${rule} gives ${numerator}/${denominator}, which simplifies to ${answer}.`,
      ),
      short,
    ),
  )
}

function trigStandard(ctx: GenContext, family: string): GeneratedQuestion {
  const tables: Record<string, Record<number, string>> = {
    sine: { 0: '0', 30: '1/2', 45: '√2/2', 60: '√3/2', 90: '1' },
    cosine: { 0: '1', 30: '√3/2', 45: '√2/2', 60: '1/2', 90: '0' },
    tangent: { 0: '0', 30: '1/√3', 45: '1', 60: '√3', 90: 'not defined' },
  }
  const names: Record<string, string> = { sine: 'sin', cosine: 'cos', tangent: 'tan' }
  const fn = pick(ctx.rng, ['sine', 'cosine', 'tangent'])
  const angles = ctx.difficulty === 'easy' ? [0, 30, 45, 60, 90] : [30, 45, 60]
  const availableAngles = fn === 'tangent' ? angles.filter((value) => value !== 90) : angles
  const angle = pick(ctx.rng, availableAngles)
  const table = tables[fn]
  const answer = table[angle]
  const distractors = textDistractors(
    answer,
    Object.values(table).filter((value) => value !== answer),
  )
  const name = names[fn]
  const short = 'Recall the exact-value table for 0°, 30°, 45°, 60°, 90°'
  return finish(
    ctx,
    family,
    mcqDraft(
      `What is the exact value of ${name} ${angle}°? Choose the correct option.`,
      answer,
      distractors,
      `From the standard angle table, ${name} ${angle}° = ${answer}.`,
      [
        `Use the exact-value table for ${name}.`,
        `Look up ${angle}° in that table.`,
        `${name} ${angle}° = ${answer}.`,
      ],
      makeHints(
        'Standard angles have exact values you can memorise.',
        'Sketch the 30-60-90 or 45-45-90 triangle if unsure.',
        short,
        `The standard table gives ${name} ${angle}° = ${answer}.`,
      ),
      short,
    ),
  )
}

function trigRightTriangle(ctx: GenContext, family: string): GeneratedQuestion {
  const triples: [number, number, number][] = [
    [3, 4, 5],
    [5, 12, 13],
    [6, 8, 10],
    [8, 15, 17],
    [9, 12, 15],
  ]
  const [a, b, c] = pick(ctx.rng, triples)
  const findHypotenuse = ctx.difficulty !== 'hard' || ctx.rng() < 0.5
  const answer = findHypotenuse ? c : Math.sqrt(c * c - a * a)
  const short = 'c² = a² + b²'
  const prompt = findHypotenuse
    ? `A right triangle has legs of ${a} cm and ${b} cm. What is the length of its hypotenuse, in cm?`
    : `A right triangle has a hypotenuse of ${c} cm and one leg of ${a} cm. What is the length of the other leg, in cm?`
  const steps = findHypotenuse
    ? [
        `Pythagoras: c² = a² + b².`,
        `c² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}.`,
        `c = √${c * c} = ${answer} cm.`,
      ]
    : [
        `Pythagoras: b² = c² − a².`,
        `b² = ${c}² − ${a}² = ${c * c} − ${a * a} = ${b * b}.`,
        `b = √${b * b} = ${answer} cm.`,
      ]
  const walkthrough = findHypotenuse
    ? `The hypotenuse squared is ${a * a} + ${b * b} = ${c * c}, so the hypotenuse is ${answer} cm.`
    : `The unknown leg squared is ${c * c} − ${a * a} = ${b * b}, so the leg is ${answer} cm.`
  return finish(
    ctx,
    family,
    numericDraft(prompt, answer, walkthrough, steps, makeHints('Identify the right angle and the two known sides.', 'Use Pythagoras, rearranging if a leg is missing.', short, walkthrough), short, 'cm'),
  )
}

function trigBearings(ctx: GenContext, family: string): GeneratedQuestion {
  const step = levelValue(ctx, 15, 10, 5)
  const initial = int(ctx.rng, 0, Math.floor(359 / step)) * step
  const reciprocal = (initial + 180) % 360
  const answer = bearing(reciprocal)
  const distractors = textDistractors(answer, [
    bearing(360 - initial),
    bearing(initial - 180),
    bearing(180 - initial),
    bearing(initial + 90),
    bearing(initial),
  ])
  const short = 'Reciprocal bearing = (bearing + 180) mod 360'
  return finish(
    ctx,
    family,
    mcqDraft(
      `An aircraft flies from A to B on a bearing of ${bearing(initial)}°. What bearing does it fly from B back to A? Give a 3-digit bearing.`,
      answer,
      distractors,
      `Add 180° and reduce modulo 360: (${bearing(initial)}° + 180°) mod 360° = ${bearing(reciprocal)}°.`,
      [
        'A reciprocal bearing points in exactly the opposite direction.',
        `Add 180°: ${initial}° + 180° = ${initial + 180}°.`,
        `Reduce modulo 360° and write as ${answer}.`,
      ],
      makeHints(
        'The return journey reverses the direction of travel.',
        'Add 180° to the original bearing.',
        short,
        `(${initial}° + 180°) mod 360° = ${reciprocal}°, written as the 3-digit bearing ${answer}.`,
      ),
      short,
    ),
  )
}

function trigDirection(ctx: GenContext, family: string): GeneratedQuestion {
  const step = levelValue(ctx, 30, 15, 5)
  const from = int(ctx.rng, 0, Math.floor(359 / step)) * step
  const turn = int(ctx.rng, levelValue(ctx, 2, 4, 6), levelValue(ctx, 8, 14, 26)) * step
  const to = (from + turn) % 360
  const answer = turn
  const short = 'Clockwise turn = (new − old + 360) mod 360'
  return finish(
    ctx,
    family,
    numericDraft(
      `An aircraft is heading on a bearing of ${bearing(from)}°. It turns clockwise to a heading of ${bearing(to)}°. Through how many degrees does it turn?`,
      answer,
      `The clockwise change is (${bearing(to)}° − ${bearing(from)}° + 360°) mod 360° = ${answer}°.`,
      [
        `Clockwise turn = (new − old + 360) mod 360.`,
        `= (${to} − ${from} + 360) mod 360.`,
        `= ${answer}°.`,
      ],
      makeHints(
        'Bearings are measured clockwise from north.',
        'Subtract the starting bearing from the finishing bearing.',
        short,
        `From ${bearing(from)}° to ${bearing(to)}° clockwise is ${answer}°.`,
      ),
      short,
      '°',
    ),
  )
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const handlers: Record<string, Record<string, KindHandler>> = {
  sequenceProblem: {
    arithmetic: sequenceArithmetic,
    geometric: sequenceGeometric,
    missing: sequenceMissing,
    differences: sequenceDifferences,
    square: sequenceSquare,
    recognition: sequenceRecognition,
  },
  probabilityProblem: {
    basic: probabilityBasic,
    fractions: probabilityFractions,
    dice: probabilityDice,
    coins: probabilityCoins,
    cards: probabilityCards,
    multiple: probabilityMultiple,
    challenge: probabilityChallenge,
  },
  geometryProblem: {
    perimeter: geometryPerimeter,
    rectArea: geometryRectArea,
    triangleArea: geometryTriangleArea,
    circumference: geometryCircumference,
    circleArea: geometryCircleArea,
    volume: geometryVolume,
    surface: geometrySurface,
    boss: geometryBoss,
  },
  numberProperty: {
    factors: numberFactors,
    multiples: numberMultiples,
    hcf: numberHcf,
    lcm: numberLcm,
    divisibility: numberDivisibility,
    remainders: numberRemainders,
    challenge: numberChallenge,
  },
  trigProblem: {
    angles: trigAngles,
    sine: (ctx, family) => trigRatio(ctx, family, 'sine'),
    cosine: (ctx, family) => trigRatio(ctx, family, 'cosine'),
    tangent: (ctx, family) => trigRatio(ctx, family, 'tangent'),
    standard: trigStandard,
    rightTriangle: trigRightTriangle,
    bearings: trigBearings,
    direction: trigDirection,
  },
}

export function generateAdvanced(ctx: GenContext, family: string): GeneratedQuestion {
  const familyHandlers = handlers[family]
  if (!familyHandlers) throw new Error(`Unknown question family: ${family}`)
  const kind = String(ctx.spec.params?.kind ?? '')
  const handler = familyHandlers[kind]
  if (!handler) throw new Error(`Unknown kind "${kind}" for family "${family}"`)
  return handler(ctx, family)
}
