import type { GeneratedQuestion, QuestionType } from '@/lib/types'
import { buildQuestion, makeHints } from '../builders'
import type { QuestionSeed } from '../builders'
import type { GenContext } from '../index'
import { cleanNumber, fmt, gcd, int, pick, round } from '../random'

const keyOf = (ctx: GenContext) => `${ctx.spec.family}:${JSON.stringify(ctx.spec.params ?? {})}`

function seed(ctx: GenContext, subtopic: string, extra: Partial<QuestionSeed> & Pick<QuestionSeed, 'prompt' | 'answer' | 'type' | 'explanation' | 'steps' | 'hints' | 'shortcut'>): QuestionSeed {
  return {
    specKey: keyOf(ctx),
    variant: ctx.variant,
    rng: ctx.rng,
    concept: ctx.spec.concept ?? ctx.spec.family,
    conceptLabel: ctx.spec.conceptLabel ?? 'Mental maths',
    subtopic,
    difficulty: ctx.difficulty,
    ...extra,
  }
}

function numeric(ctx: GenContext, subtopic: string, value: number, extra: Omit<QuestionSeed, 'specKey' | 'variant' | 'rng' | 'concept' | 'conceptLabel' | 'subtopic' | 'difficulty' | 'type' | 'answer' | 'numericAnswer'> & { type?: QuestionType }): GeneratedQuestion {
  const answer = cleanNumber(value)
  return buildQuestion(seed(ctx, subtopic, {
    ...extra,
    type: extra.type ?? (ctx.variant % 4 === 0 ? 'mcq' : 'numeric'),
    answer: fmt(answer),
    numericAnswer: answer,
  }))
}

function walkthrough(steps: string[]): string {
  return steps.join(' ')
}

function arithmetic(ctx: GenContext): GeneratedQuestion {
  const op = String(ctx.spec.params?.op ?? 'add')
  const d = ctx.difficulty
  const rng = ctx.rng

  if (op === 'add') {
    const a = d === 'easy' ? int(rng, 12, 89) : d === 'medium' ? int(rng, 104, 899) : int(rng, 1100, 8999)
    const b = d === 'easy' ? int(rng, 11, 49) : d === 'medium' ? int(rng, 28, 199) : int(rng, 150, 999)
    const answer = a + b
    const tens = Math.floor(b / 10) * 10
    const units = b - tens
    const steps = [`Start at ${a}.`, `Add ${tens} to get ${a + tens}.`, `Add ${units} to get ${answer}.`]
    return numeric(ctx, 'addition', answer, {
      prompt: `What is ${a} + ${b}?`,
      explanation: `Split ${b} into ${tens} and ${units}: ${a} + ${tens} + ${units} = ${answer}.`,
      steps,
      distractors: [answer + 10, answer - 10, answer + 1, answer - 1],
      hints: makeHints('The operation is addition — you are combining two numbers.', 'Break the second number into tens and units, then add in two steps.', 'Adding tens first keeps the units simple and avoids carrying errors.', walkthrough(steps)),
      shortcut: 'Split the second number into tens and units before adding.',
    })
  }

  if (op === 'subtract') {
    const a = d === 'easy' ? int(rng, 35, 99) : d === 'medium' ? int(rng, 210, 999) : int(rng, 1200, 9999)
    const b = d === 'easy' ? int(rng, 11, Math.min(49, a - 1)) : d === 'medium' ? int(rng, 40, Math.min(199, a - 1)) : int(rng, 150, Math.min(999, a - 1))
    const answer = a - b
    const tens = Math.floor(b / 10) * 10
    const units = b - tens
    const steps = [`Start at ${a}.`, `Subtract ${tens}: ${a - tens}.`, `Subtract ${units}: ${answer}.`]
    return numeric(ctx, 'subtraction', answer, {
      prompt: `What is ${a} − ${b}?`,
      explanation: `Subtracting ${tens} then ${units} is easier than borrowing all at once.`,
      steps,
      distractors: [answer + 10, answer - 10, answer + 1, answer - 1],
      hints: makeHints('This is subtraction — take the second number away from the first.', 'Remove the tens first, then the units.', 'Counting back in two friendly chunks is faster than column subtraction.', walkthrough(steps)),
      shortcut: 'Subtract tens first, then units.',
    })
  }

  if (op === 'multiply') {
    const a = d === 'easy' ? int(rng, 2, 9) : d === 'medium' ? int(rng, 11, 29) : int(rng, 21, 99)
    const b = d === 'easy' ? int(rng, 11, 49) : d === 'medium' ? int(rng, 11, 29) : int(rng, 11, 39)
    const answer = a * b
    const tens = Math.floor(b / 10) * 10
    const units = b - tens
    const steps = [`Split ${b} into ${tens} + ${units}.`, `${a} × ${tens} = ${a * tens}.`, `${a} × ${units} = ${a * units}.`, `Add them: ${answer}.`]
    return numeric(ctx, 'multiplication', answer, {
      prompt: `What is ${a} × ${b}?`,
      explanation: `Use the distributive rule: ${a} × ${tens} + ${a} × ${units} = ${answer}.`,
      steps,
      distractors: [answer + a, answer - a, answer + tens, answer - units],
      hints: makeHints('Multiplication is repeated addition — break one factor apart.', `Split ${b} into tens and units and multiply each part by ${a}.`, 'The distributive rule turns a hard product into two easy ones.', walkthrough(steps)),
      shortcut: 'Split one factor into tens and units, multiply, then add.',
    })
  }

  // divide
  const divisor = d === 'easy' ? int(rng, 2, 12) : d === 'medium' ? int(rng, 2, 12) : int(rng, 11, 45)
  const quotient = d === 'easy' ? int(rng, 2, 12) : d === 'medium' ? int(rng, 11, 49) : int(rng, 11, 39)
  const dividend = divisor * quotient
  const steps = [`Ask: ${divisor} × what = ${dividend}?`, `${divisor} × ${quotient} = ${dividend}.`, `So the quotient is ${quotient}.`]
  return numeric(ctx, 'division', quotient, {
    prompt: `What is ${dividend} ÷ ${divisor}?`,
    explanation: `Division asks which number multiplied by ${divisor} gives ${dividend}. That number is ${quotient}.`,
    steps,
    distractors: [quotient + 1, quotient - 1, quotient * 2, Math.max(1, Math.floor(quotient / 2))],
    hints: makeHints('Think of division as the reverse of multiplication.', `Find the number that makes ${divisor} × ? = ${dividend}.`, 'Estimate with a round multiple, then adjust.', walkthrough(steps)),
    shortcut: 'Ask "what times the divisor gives the dividend?"',
  })
}

function tables(ctx: GenContext): GeneratedQuestion {
  const n = ctx.difficulty === 'easy' ? int(ctx.rng, 2, 9) : int(ctx.rng, 6, 12)
  const m = ctx.difficulty === 'hard' ? int(ctx.rng, 11, 19) : int(ctx.rng, 2, 12)
  const answer = n * m
  const steps = [`Recall the ${n} times table.`, `${n} × ${m} = ${answer}.`]
  return numeric(ctx, 'tables', answer, {
    prompt: `${n} × ${m} = ?`,
    explanation: `Instant recall of the ${n} times table gives ${answer}.`,
    steps,
    distractors: [answer + n, answer - n, answer + m, answer - m],
    hints: makeHints('This is a direct table fact.', `Skip-count by ${n}, ${m} times.`, `Use a nearby known fact: ${n} × 10 = ${n * 10}, then adjust.`, walkthrough(steps)),
    shortcut: 'Recall the table fact, or build it from ×10.',
  })
}

function decomposition(ctx: GenContext): GeneratedQuestion {
  const useMultiply = ctx.variant % 2 === 0
  const rng = ctx.rng
  if (useMultiply) {
    const a = ctx.difficulty === 'easy' ? int(rng, 12, 49) : int(rng, 32, 99)
    const b = ctx.difficulty === 'hard' ? int(rng, 4, 9) : int(rng, 3, 6)
    const tens = Math.floor(a / 10) * 10
    const units = a - tens
    const answer = a * b
    const steps = [`Split ${a} into ${tens} + ${units}.`, `${tens} × ${b} = ${tens * b}.`, `${units} × ${b} = ${units * b}.`, `Total ${answer}.`]
    return numeric(ctx, 'decomposition', answer, {
      prompt: `Use decomposition: ${a} × ${b} = ?`,
      explanation: `Breaking ${a} into ${tens} + ${units} makes the multiplication mental.`,
      steps,
      distractors: [answer + b, answer - b, tens * b + units, answer + tens],
      hints: makeHints('Split one number into friendly parts.', `Write ${a} as ${tens} + ${units}.`, 'Multiply each part separately, then add the partial products.', walkthrough(steps)),
      shortcut: 'Split into tens and units, multiply each, then add.',
    })
  }
  const a = int(rng, 20, 89)
  const b = int(rng, 11, 49)
  const tens = Math.floor(b / 10) * 10
  const units = b - tens
  const answer = a + b
  const steps = [`Write ${b} as ${tens} + ${units}.`, `${a} + ${tens} = ${a + tens}.`, `Add ${units}: ${answer}.`]
  return numeric(ctx, 'decomposition', answer, {
    prompt: `Break the second number apart: ${a} + ${b} = ?`,
    explanation: `Decomposition turns ${a} + ${b} into two easier additions.`,
    steps,
    distractors: [answer + 10, answer - 10, answer + 1, answer - 1],
    hints: makeHints('You can change a number into a sum without changing the answer.', `Split ${b} into tens and units.`, 'Adding tens first is usually easiest.', walkthrough(steps)),
    shortcut: 'Split, add in chunks, recombine.',
  })
}

function twoDigit(ctx: GenContext): GeneratedQuestion {
  const rng = ctx.rng
  const op = pick(rng, ['add', 'subtract', 'multiply'] as const)
  const a = int(rng, 24, 89)
  const b = op === 'subtract' ? int(rng, 11, a - 1) : int(rng, 12, 49)
  if (op === 'add') {
    const answer = a + b
    const steps = [`${a} + ${Math.floor(b / 10) * 10} = ${a + Math.floor(b / 10) * 10}.`, `Add ${b % 10}: ${answer}.`]
    return numeric(ctx, 'two-digit', answer, {
      prompt: `What is ${a} + ${b}?`,
      explanation: `Add the tens of ${b} first, then its units.`,
      steps,
      distractors: [answer + 10, answer - 10, answer + 2, answer - 2],
      hints: makeHints('Both numbers are two-digit; work in chunks.', 'Add tens first, then units.', 'Keep the running total round wherever possible.', walkthrough(steps)),
      shortcut: 'Add tens, then units.',
    })
  }
  if (op === 'subtract') {
    const answer = a - b
    const steps = [`${a} − ${Math.floor(b / 10) * 10} = ${a - Math.floor(b / 10) * 10}.`, `Subtract ${b % 10}: ${answer}.`]
    return numeric(ctx, 'two-digit', answer, {
      prompt: `What is ${a} − ${b}?`,
      explanation: `Take away the tens of ${b}, then the units.`,
      steps,
      distractors: [answer + 10, answer - 10, answer + 1, answer - 1],
      hints: makeHints('Work with the larger number first.', 'Subtract tens before units.', 'Round and adjust if the units need borrowing.', walkthrough(steps)),
      shortcut: 'Subtract tens, then units.',
    })
  }
  const answer = a * b
  const tens = Math.floor(b / 10) * 10
  const units = b - tens
  const steps = [`${a} × ${tens} = ${a * tens}.`, `${a} × ${units} = ${a * units}.`, `${a * tens} + ${a * units} = ${answer}.`]
  return numeric(ctx, 'two-digit', answer, {
    prompt: `What is ${a} × ${b}?`,
    explanation: `Split ${b} into ${tens} + ${units} and add the partial products.`,
    steps,
    distractors: [answer + a, answer - a, answer + tens, answer * 2],
    hints: makeHints('Two-digit multiplication can be split into two easy parts.', `Split ${b} into ${tens} + ${units}.`, 'Distribute and add.', walkthrough(steps)),
    shortcut: 'Use partial products.',
  })
}

function mulShortcut(ctx: GenContext): GeneratedQuestion {
  const multiplier = ctx.spec.params?.multiplier ?? 5
  const d = ctx.difficulty
  const rng = ctx.rng
  const n = d === 'easy' ? int(rng, 10, 99) : d === 'medium' ? int(rng, 40, 499) : int(rng, 300, 1499)

  if (multiplier === 5 || multiplier === '5') {
    const answer = n * 5
    const steps = [`${n} × 10 = ${n * 10}.`, `Halve it: ${n * 10} ÷ 2 = ${answer}.`]
    return numeric(ctx, 'multiply-by-5', answer, {
      prompt: `What is ${n} × 5?`,
      explanation: 'Multiplying by 5 is the same as multiplying by 10 and halving.',
      steps,
      distractors: [answer * 2, answer / 2, answer + 5, n * 4],
      hints: makeHints('Five is half of ten.', `First find ${n} × 10.`, 'Multiply by 10, then divide by 2.', walkthrough(steps)),
      shortcut: '×10 then ÷2.',
    })
  }
  if (multiplier === 25 || multiplier === '25') {
    const answer = n * 25
    const steps = [`${n} × 100 = ${n * 100}.`, `Divide by 4: ${answer}.`]
    return numeric(ctx, 'multiply-by-25', answer, {
      prompt: `What is ${n} × 25?`,
      explanation: '25 is one quarter of 100, so multiply by 100 and divide by 4.',
      steps,
      distractors: [answer * 2, answer / 2, n * 100, n * 5],
      hints: makeHints('Think of 25 as a quarter of 100.', `Find ${n} × 100 first.`, 'Quarter the result by halving twice.', walkthrough(steps)),
      shortcut: '×100 then ÷4.',
    })
  }
  if (multiplier === 50 || multiplier === '50') {
    const answer = n * 50
    const steps = [`${n} × 100 = ${n * 100}.`, `Halve it: ${answer}.`]
    return numeric(ctx, 'multiply-by-50', answer, {
      prompt: `What is ${n} × 50?`,
      explanation: '50 is half of 100: append two zeros, then halve.',
      steps,
      distractors: [answer * 2, answer / 2, n * 5, n * 100],
      hints: makeHints('Fifty is half of a hundred.', `Start with ${n} × 100.`, 'Halve the result.', walkthrough(steps)),
      shortcut: '×100 then halve.',
    })
  }
  if (multiplier === 9 || multiplier === '9') {
    const answer = n * 9
    const steps = [`${n} × 10 = ${n * 10}.`, `Subtract one more ${n}: ${n * 10} − ${n} = ${answer}.`]
    return numeric(ctx, 'multiply-by-9', answer, {
      prompt: `What is ${n} × 9?`,
      explanation: 'Nine is one less than ten, so multiply by 10 and subtract the original number.',
      steps,
      distractors: [answer + n, answer - n, n * 10, n * 8],
      hints: makeHints('Nine is close to ten.', `Find ${n} × 10.`, 'Subtract one copy of the original number.', walkthrough(steps)),
      shortcut: '×10 then subtract the number.',
    })
  }
  if (multiplier === 99 || multiplier === '99') {
    const value = d === 'easy' ? int(rng, 11, 99) : int(rng, 100, 999)
    const answer = value * 99
    const steps = [`${value} × 100 = ${value * 100}.`, `Subtract ${value}: ${answer}.`]
    return numeric(ctx, 'multiply-by-99', answer, {
      prompt: `What is ${value} × 99?`,
      explanation: 'Use 100 − 1 as the multiplier.',
      steps,
      distractors: [answer + value, answer - value, value * 100, value * 98],
      hints: makeHints('99 is just under 100.', `Start from ${value} × 100.`, 'Take away one copy of the original number.', walkthrough(steps)),
      shortcut: '×100 then subtract the number.',
    })
  }
  if (multiplier === 11 || multiplier === '11') {
    const value = d === 'easy' ? int(rng, 11, 54) : int(rng, 55, 99)
    const answer = value * 11
    const a = Math.floor(value / 10)
    const b = value % 10
    const sum = a + b
    const digitRule = sum < 10
      ? `Write ${a}, then ${sum}, then ${b}: ${answer}.`
      : `a + b = ${sum}; write ${a + 1}, ${sum - 10}, ${b}: ${answer}.`
    const steps = [`${value} × 10 = ${value * 10}.`, `Add ${value}: ${answer}.`, digitRule]
    return numeric(ctx, 'multiply-by-11', answer, {
      prompt: `What is ${value} × 11?`,
      explanation: `The two-digit shortcut: ${digitRule}`,
      steps,
      distractors: [answer + value, answer - value, value * 10, a * 100 + sum * 10 + b],
      hints: makeHints('Eleven is ten plus one.', `Multiply by 10 then add ${value}.`, 'For two digits: split the digits, add them, and put the sum in the middle with carrying.', walkthrough(steps)),
      shortcut: 'Split digits, add, place the sum in the middle.',
    })
  }
  if (multiplier === 'near100') {
    const deficitA = int(rng, 2, d === 'easy' ? 6 : 14)
    const deficitB = int(rng, 2, d === 'easy' ? 6 : 14)
    const a = 100 - deficitA
    const b = 100 - deficitB
    const answer = a * b
    const steps = [`Deficits from 100 are ${deficitA} and ${deficitB}.`, `Cross-subtract: ${a} − ${deficitB} = ${a - deficitB}.`, `Multiply deficits: ${deficitA} × ${deficitB} = ${deficitA * deficitB}.`, `Combine: ${a - deficitB} hundred + ${deficitA * deficitB} = ${answer}.`]
    return numeric(ctx, 'near-100', answer, {
      prompt: `What is ${a} × ${b}?`,
      explanation: 'For numbers near 100, cross-subtract and append the product of the deficits.',
      steps,
      distractors: [answer + 100, answer - 100, (a - deficitB) * 100, deficitA * deficitB],
      hints: makeHints('Both numbers are close to 100.', `Find how far each is from 100: ${deficitA} and ${deficitB}.`, 'Cross-subtract for the hundreds, multiply the deficits for the last two digits.', walkthrough(steps)),
      shortcut: 'Cross-subtract, then multiply deficits.',
    })
  }
  if (multiplier === 'doubleHalf') {
    let a = pick(rng, [25, 50, 75, 125, 250])
    let b = int(rng, 4, d === 'easy' ? 16 : 64) * 2
    const original = `${a} × ${b}`
    const steps: string[] = []
    while (b % 2 === 0 && steps.length < 5) {
      steps.push(`${a} × ${b} = ${a * 2} × ${b / 2}`)
      a *= 2
      b /= 2
    }
    const answer = a * b
    steps.push(`Final product: ${answer}.`)
    return numeric(ctx, 'doubling-halving', answer, {
      prompt: `Simplify and solve: ${original} = ?`,
      explanation: 'Doubling one factor and halving the other keeps the product the same.',
      steps,
      distractors: [answer * 2, answer / 2, answer + a, answer - a],
      hints: makeHints('You can move a factor of 2 between the two numbers.', 'Double the smaller number and halve the larger one.', 'Repeat until the multiplication is easy.', walkthrough(steps)),
      shortcut: 'Double one side, halve the other.',
    })
  }
  if (multiplier === 'square') {
    const value = d === 'easy' ? int(rng, 11, 30) : d === 'medium' ? int(rng, 31, 60) : int(rng, 61, 99)
    const base = Math.round(value / 10) * 10
    const diff = value - base
    const answer = value * value
    const steps = [`Nearest ten is ${base}, difference ${diff}.`, `${base} × ${2 * value - base} = ${base * (2 * value - base)}.`, `Add ${diff}² = ${diff * diff}: ${answer}.`]
    return numeric(ctx, 'squares', answer, {
      prompt: `What is ${value}²?`,
      explanation: `Use the base method: ${base} × ${2 * value - base} + ${diff * diff} = ${answer}.`,
      steps,
      distractors: [answer - value, answer + value, (value - 1) * (value + 1), value * 2],
      hints: makeHints('Squaring means multiplying a number by itself.', `Use the nearest ten, ${base}.`, 'Move the difference to the other factor, then add the square of the difference.', walkthrough(steps)),
      shortcut: 'Use a base of 10 and adjust.',
    })
  }
  // square5
  const a = d === 'easy' ? int(rng, 1, 9) : d === 'medium' ? int(rng, 10, 29) : int(rng, 30, 79)
  const value = a * 10 + 5
  const answer = value * value
  const steps = [`Leading part is ${a}.`, `${a} × ${a + 1} = ${a * (a + 1)}.`, `Append 25: ${answer}.`]
  return numeric(ctx, 'square-ending-5', answer, {
    prompt: `What is ${value}²?`,
    explanation: 'For a number ending in 5, multiply the leading part by one more than itself, then append 25.',
    steps,
    distractors: [answer - 100, answer + 100, a * a * 100 + 25, value * 10],
    hints: makeHints('The number ends in 5.', `Take the leading part ${a}.`, 'Multiply it by the next integer and write 25 at the end.', walkthrough(steps)),
    shortcut: 'a × (a + 1), then append 25.',
  })
}

function baseFor(percent: number): number {
  return 100 / gcd(percent, 100)
}

function percentageFind(ctx: GenContext): GeneratedQuestion {
  const percent = Number(ctx.spec.params?.percent ?? 10)
  const d = ctx.difficulty
  const base = baseFor(percent) * int(ctx.rng, d === 'easy' ? 2 : d === 'medium' ? 8 : 25, d === 'easy' ? 18 : d === 'medium' ? 60 : 180)
  const answer = cleanNumber((base * percent) / 100)
  const ten = base / 10
  const five = ten / 2
  let steps: string[]
  let hint: string
  switch (percent) {
    case 10:
      steps = [`10% means one tenth.`, `${base} ÷ 10 = ${answer}.`]
      hint = 'Move the decimal one place left.'
      break
    case 5:
      steps = [`10% of ${base} = ${ten}.`, `5% is half of that: ${answer}.`]
      hint = 'Find 10% first, then halve it.'
      break
    case 1:
      steps = [`1% means one hundredth.`, `${base} ÷ 100 = ${answer}.`]
      hint = 'Move the decimal two places left.'
      break
    case 20:
      steps = [`10% of ${base} = ${ten}.`, `20% is double that: ${answer}.`]
      hint = 'Find 10% and double it.'
      break
    case 25:
      steps = [`25% is one quarter.`, `${base} ÷ 4 = ${answer}.`]
      hint = 'Divide by four.'
      break
    case 50:
      steps = [`50% is one half.`, `${base} ÷ 2 = ${answer}.`]
      hint = 'Halve the number.'
      break
    case 75:
      steps = [`50% of ${base} = ${base / 2}.`, `25% of ${base} = ${base / 4}.`, `Together: ${answer}.`]
      hint = 'Use 50% + 25%.'
      break
    case 15:
      steps = [`10% of ${base} = ${ten}.`, `5% of ${base} = ${five}.`, `10% + 5% = ${answer}.`]
      hint = 'Break 15% into 10% + 5%.'
      break
    case 35:
      steps = [`10% of ${base} = ${ten}.`, `30% = 3 × ${ten} = ${3 * ten}.`, `5% = ${five}.`, `30% + 5% = ${answer}.`]
      hint = 'Break 35% into 30% + 5%.'
      break
    default:
      steps = [`Write ${percent}% as ${percent}/100.`, `${base} × ${percent} ÷ 100 = ${answer}.`]
      hint = 'Convert the percentage to a fraction.'
  }
  return numeric(ctx, `percent-${percent}`, answer, {
    prompt: `What is ${percent}% of ${base}?`,
    explanation: `${hint} ${answer}.`,
    steps,
    distractors: [answer * 2, round(answer / 2, 2), answer + ten, Math.max(1, answer - ten)],
    hints: makeHints(`You need ${percent}% of ${base}.`, `Find a simple component percentage of ${base} first.`, hint, walkthrough(steps)),
    shortcut: hint,
  })
}

function percentageChange(ctx: GenContext): GeneratedQuestion {
  const direction = String(ctx.spec.params?.direction ?? 'increase')
  const rng = ctx.rng
  const d = ctx.difficulty

  if (direction === 'increase' || direction === 'decrease') {
    const percent = pick(rng, [10, 15, 20, 25, 50])
    const base = baseFor(percent) * int(rng, d === 'easy' ? 3 : d === 'medium' ? 10 : 30, d === 'easy' ? 15 : d === 'medium' ? 50 : 160)
    const change = (base * percent) / 100
    const answer = direction === 'increase' ? base + change : base - change
    const steps = [`${percent}% of ${base} = ${change}.`, direction === 'increase' ? `Add it: ${base} + ${change} = ${answer}.` : `Subtract it: ${base} − ${change} = ${answer}.`]
    return numeric(ctx, `percent-${direction}`, answer, {
      prompt: direction === 'increase'
        ? `Increase ${base} by ${percent}%.`
        : `Decrease ${base} by ${percent}%.`,
      explanation: `Find ${percent}% of the original, then ${direction} it.`,
      steps,
      distractors: [change, base + (direction === 'increase' ? -change : change), answer + base / 10, answer - 1],
      hints: makeHints('The percentage is of the original amount.', `First work out ${percent}% of ${base}.`, 'Use a simple percentage shortcut, then add or subtract.', walkthrough(steps)),
      shortcut: 'Find the percentage of the base, then add or subtract it.',
    })
  }

  if (direction === 'successive') {
    const p = pick(rng, [10, 20, 25, 50])
    const q = pick(rng, [10, 20, 25, 50])
    const signP = rng() > 0.35 ? 1 : -1
    const signQ = rng() > 0.35 ? 1 : -1
    const base = 200 * int(rng, d === 'easy' ? 2 : 5, d === 'easy' ? 8 : 30)
    const multiplier = (1 + (signP * p) / 100) * (1 + (signQ * q) / 100)
    const answer = round(base * multiplier, 2)
    const changeP = round((base * p) / 100, 2)
    const mid = round(base + signP * changeP, 2)
    const changeQ = round((mid * q) / 100, 2)
    const steps = [
      `${signP > 0 ? 'Increase' : 'Decrease'} by ${p}%: ${signP > 0 ? '+' : '−'}${changeP} → ${mid}.`,
      `${signQ > 0 ? 'Increase' : 'Decrease'} by ${q}%: ${signQ > 0 ? '+' : '−'}${changeQ} → ${answer}.`,
    ]
    return numeric(ctx, 'percent-successive', answer, {
      prompt: `A value of ${base} is ${signP > 0 ? 'increased' : 'decreased'} by ${p}%, then ${signQ > 0 ? 'increased' : 'decreased'} by ${q}%. What is the final value?`,
      explanation: 'Successive changes compound: the second percentage applies to the new value, not the original.',
      steps,
      distractors: [round(base + (signP * base * p) / 100 + (signQ * base * q) / 100, 2), round(base * (1 + ((signP * p + signQ * q) / 100)), 2), answer + p, answer - q],
      hints: makeHints('The second change applies to the changed value.', 'Work out each change in order.', 'Use multipliers: ×(1 ± p/100) then ×(1 ± q/100).', walkthrough(steps)),
      shortcut: 'Multiply by both change factors in order.',
    })
  }

  // reverse
  const percent = pick(rng, [10, 20, 25, 50])
  const original = baseFor(percent) * int(rng, d === 'easy' ? 3 : 8, d === 'easy' ? 18 : 70)
  const final = original + (original * percent) / 100
  const multiplier = 1 + percent / 100
  const steps = [`After the increase: original × ${fmt(multiplier)} = ${final}.`, `So original = ${final} ÷ ${fmt(multiplier)} = ${original}.`]
  return numeric(ctx, 'percent-reverse', original, {
    prompt: `A price after a ${percent}% increase is ${final}. What was the original price?`,
    explanation: `The final amount is ${fmt(multiplier)} times the original, so divide by ${fmt(multiplier)}.`,
    steps,
    distractors: [final - (final * percent) / 100, final / 2, original * 2, original + percent],
    hints: makeHints('The percentage was applied to the original, not the final value.', 'Write final = original × multiplier.', 'Divide by the multiplier to reverse the change.', walkthrough(steps)),
    shortcut: 'Divide by (1 + rate).',
  })
}

export function generateCore(ctx: GenContext, family: string): GeneratedQuestion {
  switch (family) {
    case 'arithmetic': return arithmetic(ctx)
    case 'tables': return tables(ctx)
    case 'decomposition': return decomposition(ctx)
    case 'twoDigit': return twoDigit(ctx)
    case 'mulShortcut': return mulShortcut(ctx)
    case 'percentageFind': return percentageFind(ctx)
    case 'percentageChange': return percentageChange(ctx)
    default: throw new Error(`Unknown core generator: ${family}`)
  }
}
