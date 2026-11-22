import type { Chapter, Level } from '@/lib/types'
import { generateQuestion } from '@/features/questions'
import { displayAnswer } from '@/features/questions/validation'

const concepts: Record<string, string> = {
  arithmetic: 'Mental arithmetic is about choosing the easiest route through a calculation. Splitting numbers into tens and units turns one hard step into two simple ones.',
  tables: 'Instant recall of multiplication facts frees working memory for the rest of the problem.',
  decomposition: 'Decomposition means rewriting a number as a sum, then working with the parts. It is the foundation of fast mental arithmetic.',
  twoDigit: 'Two-digit calculations become manageable when you handle tens and units separately and recombine at the end.',
  mulShortcut: 'Many multiplication problems have a hidden shortcut. Recognising the multiplier first is faster than doing long multiplication.',
  percentageFind: 'A percentage is just a fraction of 100. Find a simple percentage of the number first, then scale it up or down.',
  percentageChange: 'Percentages describe change relative to a starting value. Always identify the base before calculating.',
  fractionOp: 'A fraction tells you how many equal parts you have. Keep the denominator consistent and simplify at the end.',
  decimalCalc: 'Decimals follow the same rules as whole numbers; only the position of the point changes.',
  ratioProblem: 'A ratio compares quantities. Find the value of one part, then scale it to the number of parts you need.',
  unitaryProblem: 'The unitary method finds the value of one unit first. Once you know one, you can find any quantity.',
  speedProblem: 'Speed, distance and time are locked together: speed = distance ÷ time. Identify which two you have and find the third.',
  averageProblem: 'An average spreads a total evenly across its parts. Total ÷ number of parts is the core idea.',
  algebraProblem: 'An equation is a balance. Whatever you do to one side, you do to the other, with the aim of isolating the unknown.',
  workProblem: 'Rates measure how much happens in one unit of time or distance. Multiply or divide the rate to scale the result.',
  sequenceProblem: 'A sequence follows a rule. Look at the difference or ratio between consecutive terms before projecting forward.',
  probabilityProblem: 'Probability compares favourable outcomes with all possible outcomes. Counting carefully is the whole trick.',
  geometryProblem: 'Mensuration uses a small set of formulas to measure length, area and volume. Identify the shape and the dimensions first.',
  numberProperty: 'Factors, multiples and remainders describe how numbers fit together. They make messy calculations much cleaner.',
  trigProblem: 'Trigonometry relates the sides and angles of right triangles. Bearings describe direction as a three-digit angle from north.',
  pilotProblem: 'Flight planning arithmetic is applied rate and conversion work. Keep units explicit and the calculation stays simple.',
  aptitudeProblem: 'Aptitude questions mix familiar ideas under time pressure. Recognising the type quickly is half the challenge.',
  shortcutIdentify: 'Choosing the right shortcut is a skill of its own. Look for numbers near 10, 100 or simple fractions.',
  findError: 'Spotting an error requires checking each step against the underlying rule, not just the final answer.',
  estimation: 'Estimation gives you a fast sanity check. Round numbers sensibly before calculating exactly.',
}

const why: Record<string, string> = {
  arithmetic: 'Cadet aptitude tests reward quick, accurate mental calculation more than written working.',
  tables: 'Table fluency prevents small calculations from consuming time you need for multi-step problems.',
  decomposition: 'It lets you calculate in your head without relying on column methods or a calculator.',
  twoDigit: 'Most aptitude values are two or three digits, so this skill transfers directly.',
  mulShortcut: 'Recognising a shortcut can turn a 30-second product into a 3-second one.',
  percentageFind: 'Percentages appear in every numerical aptitude test and in everyday aviation figures.',
  percentageChange: 'Fuel, prices and performance figures are frequently given as changes from a baseline.',
  fractionOp: 'Fractions underpin ratios, probabilities and unit conversions.',
  decimalCalc: 'Realistic data uses decimals; confidence with them prevents avoidable errors.',
  ratioProblem: 'Ratios appear in mixtures, scales, shares and fuel planning.',
  unitaryProblem: 'Finding one unit first is the most reliable route through cost, rate and consumption questions.',
  speedProblem: 'Speed, distance and time are among the most common cadet aptitude question types.',
  averageProblem: 'Averages summarise performance data and appear in multi-leg journey problems.',
  algebraProblem: 'Rearranging formulas is essential when the unknown is not already isolated.',
  workProblem: 'Fuel burn, production and shared tasks are all rate problems in disguise.',
  sequenceProblem: 'Pattern questions test logical speed as much as arithmetic.',
  probabilityProblem: 'Probability builds disciplined counting, which supports careful numerical reasoning.',
  geometryProblem: 'Basic mensuration appears in technical aptitude sections.',
  numberProperty: 'Divisibility and factors make mental division and simplification far quicker.',
  trigProblem: 'Angles and bearings are part of basic navigation and technical aptitude.',
  pilotProblem: 'These are FlightMath practice scenarios that mirror the arithmetic used in flight planning.',
  aptitudeProblem: 'Mixed practice trains recognition speed, which is what timed assessments measure.',
  shortcutIdentify: 'Selecting a method quickly reduces cognitive load during timed tests.',
  findError: 'Error checking catches the small slips that cost accuracy marks.',
  estimation: 'An estimate tells you immediately whether an exact answer is plausible.',
}

export interface LessonContent {
  concept: string
  why: string
  shortcut: string
  example: { prompt: string; steps: string[]; answer: string; explanation: string }
}

export function buildLessonContent(level: Level, chapter?: Chapter): LessonContent {
  const spec = level.specs[0]
  const sample = generateQuestion(spec, { difficulty: 'easy', variant: 7, levelId: level.id, chapterId: level.chapterId })
  const family = spec.family
  return {
    concept: concepts[family] ?? 'This level trains a focused mental maths skill through short, repeated practice.',
    why: chapter?.id === 'pilot-math'
      ? 'These are FlightMath practice scenarios, designed to make aviation arithmetic feel familiar.'
      : why[family] ?? 'This skill strengthens your numerical fluency and test-day confidence.',
    shortcut: sample.shortcut,
    example: {
      prompt: sample.prompt,
      steps: sample.steps,
      answer: displayAnswer(sample),
      explanation: sample.explanation,
    },
  }
}
