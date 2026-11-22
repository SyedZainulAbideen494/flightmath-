import type { Chapter, GeneratorSpec, Level } from '@/lib/types'

const spec = (
  family: string,
  params: Record<string, string | number | boolean> = {},
  concept = '',
  conceptLabel = '',
): GeneratorSpec => ({ family, params, concept: concept || undefined, conceptLabel: conceptLabel || undefined })

type LevelInput = {
  title: string
  specs: GeneratorSpec[]
  descriptor?: string
  kind?: Level['kind']
  count?: number
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildChapter(
  id: string,
  index: number,
  title: string,
  subtitle: string,
  icon: string,
  inputs: LevelInput[],
): Chapter {
  const levels: Level[] = inputs.map((input, i) => {
    const isLast = i === inputs.length - 1
    const kind: Level['kind'] = input.kind ?? (isLast ? (id === 'adapt' ? 'exam' : 'boss') : 'lesson')
    const count = input.count ?? (kind === 'boss' ? 15 : 8 + (i % 3))
    const concept = `${id}.${slug(input.title)}`
    return {
      id: `${id}-${i + 1}`,
      chapterId: id,
      index: i + 1,
      title: input.title,
      kind,
      specs: input.specs.map((s) => ({ ...s, concept: s.concept ?? concept, conceptLabel: s.conceptLabel ?? input.title })),
      questionCount: count,
      xp: kind === 'boss' ? 90 : 18 + i * 2,
      timeTargetSec: count * 20,
      descriptor: input.descriptor ?? (kind === 'boss' ? 'Chapter checkpoint' : 'Guided lesson'),
    }
  })
  return { id, index, title, subtitle, icon, levels }
}

export const chapters: Chapter[] = [
  buildChapter('foundations', 1, 'Mental Math Foundations', 'Build the engine. Speed starts with the basics.', 'calculator', [
    { title: 'Addition speed', specs: [spec('arithmetic', { op: 'add' })], descriptor: 'Add without counting on fingers' },
    { title: 'Subtraction speed', specs: [spec('arithmetic', { op: 'subtract' })], descriptor: 'Take away with confidence' },
    { title: 'Multiplication basics', specs: [spec('arithmetic', { op: 'multiply' })], descriptor: 'Fast single and two-digit products' },
    { title: 'Division basics', specs: [spec('arithmetic', { op: 'divide' })], descriptor: 'Exact division, no remainders' },
    { title: 'Multiplication tables under pressure', specs: [spec('tables')], descriptor: 'Recall tables at test speed', count: 10 },
    { title: 'Number decomposition', specs: [spec('decomposition')], descriptor: 'Split numbers to calculate faster' },
    { title: 'Two-digit mental arithmetic', specs: [spec('twoDigit')], descriptor: 'Handle larger values in your head' },
    {
      title: 'Mixed mental maths boss',
      specs: [
        spec('arithmetic', { op: 'add' }), spec('arithmetic', { op: 'subtract' }),
        spec('arithmetic', { op: 'multiply' }), spec('arithmetic', { op: 'divide' }),
        spec('tables'), spec('decomposition'), spec('twoDigit'),
      ],
      descriptor: 'Foundations checkpoint',
    },
  ]),

  buildChapter('multiplication', 2, 'Multiplication Tricks', 'Shortcuts that turn hard products into easy ones.', 'sparkles', [
    { title: 'Multiplying by 5', specs: [spec('mulShortcut', { multiplier: 5 })] },
    { title: 'Multiplying by 25', specs: [spec('mulShortcut', { multiplier: 25 })] },
    { title: 'Multiplying by 50', specs: [spec('mulShortcut', { multiplier: 50 })] },
    { title: 'Multiplying by 9 and 99', specs: [spec('mulShortcut', { multiplier: 9 }), spec('mulShortcut', { multiplier: 99 })] },
    { title: 'Multiplying by 11', specs: [spec('mulShortcut', { multiplier: 11 })] },
    { title: 'Multiplying numbers near 100', specs: [spec('mulShortcut', { multiplier: 'near100' })] },
    { title: 'Doubling and halving', specs: [spec('mulShortcut', { multiplier: 'doubleHalf' })] },
    { title: 'Square numbers', specs: [spec('mulShortcut', { multiplier: 'square' })] },
    { title: 'Squaring numbers ending in 5', specs: [spec('mulShortcut', { multiplier: 'square5' })] },
    {
      title: 'Multiplication mastery challenge',
      specs: [5, 25, 50, 9, 99, 11, 'near100', 'doubleHalf', 'square', 'square5'].map((multiplier) =>
        spec('mulShortcut', { multiplier }),
      ),
      descriptor: 'Multiplication checkpoint',
    },
  ]),

  buildChapter('percentages', 3, 'Percentages', 'Read the question, find the base, move fast.', 'percent', [
    { title: 'Find 10%', specs: [spec('percentageFind', { percent: 10 })] },
    { title: 'Find 5%', specs: [spec('percentageFind', { percent: 5 })] },
    { title: 'Find 1%', specs: [spec('percentageFind', { percent: 1 })] },
    { title: 'Find 20% and 25%', specs: [spec('percentageFind', { percent: 20 }), spec('percentageFind', { percent: 25 })] },
    { title: 'Find 50% and 75%', specs: [spec('percentageFind', { percent: 50 }), spec('percentageFind', { percent: 75 })] },
    { title: 'Find 15%', specs: [spec('percentageFind', { percent: 15 })] },
    { title: 'Find 35%', specs: [spec('percentageFind', { percent: 35 })] },
    { title: 'Percentage increase', specs: [spec('percentageChange', { direction: 'increase' })] },
    { title: 'Percentage decrease', specs: [spec('percentageChange', { direction: 'decrease' })] },
    { title: 'Reverse percentages', specs: [spec('percentageChange', { direction: 'reverse' })] },
    { title: 'Successive percentage changes', specs: [spec('percentageChange', { direction: 'successive' })] },
    {
      title: 'Percentage boss',
      specs: [
        spec('percentageFind', { percent: 15 }), spec('percentageFind', { percent: 35 }),
        spec('percentageChange', { direction: 'increase' }), spec('percentageChange', { direction: 'decrease' }),
        spec('percentageChange', { direction: 'reverse' }), spec('percentageChange', { direction: 'successive' }),
      ],
      descriptor: '15 mixed questions · 80% to pass',
    },
  ]),

  buildChapter('fractions', 4, 'Fractions and Decimals', 'Keep the pieces straight and the decimals honest.', 'fractions', [
    { title: 'Fraction fundamentals', specs: [spec('fractionOp', { op: 'fundamental' })] },
    { title: 'Simplifying fractions', specs: [spec('fractionOp', { op: 'simplify' })] },
    { title: 'Fraction addition', specs: [spec('fractionOp', { op: 'add' })] },
    { title: 'Fraction subtraction', specs: [spec('fractionOp', { op: 'subtract' })] },
    { title: 'Fraction multiplication', specs: [spec('fractionOp', { op: 'multiply' })] },
    { title: 'Fraction division', specs: [spec('fractionOp', { op: 'divide' })] },
    { title: 'Fraction-to-decimal conversion', specs: [spec('fractionOp', { op: 'toDecimal' })] },
    { title: 'Decimal calculations', specs: [spec('decimalCalc')] },
    { title: 'Fraction percentages', specs: [spec('fractionOp', { op: 'percent' })] },
    {
      title: 'Mixed fractions challenge',
      specs: ['simplify', 'add', 'subtract', 'multiply', 'divide', 'toDecimal', 'percent'].map((op) => spec('fractionOp', { op })),
      descriptor: 'Fractions checkpoint',
    },
  ]),

  buildChapter('ratio', 5, 'Ratio and Proportion', 'Share, scale and compare with precision.', 'scale', [
    { title: 'Understanding ratios', specs: [spec('ratioProblem', { kind: 'understand' })] },
    { title: 'Simplifying ratios', specs: [spec('ratioProblem', { kind: 'simplify' })] },
    { title: 'Divide an amount by a ratio', specs: [spec('ratioProblem', { kind: 'divide' })] },
    { title: 'Direct proportion', specs: [spec('ratioProblem', { kind: 'direct' })] },
    { title: 'Inverse proportion', specs: [spec('ratioProblem', { kind: 'inverse' })] },
    { title: 'Scale calculations', specs: [spec('ratioProblem', { kind: 'scale' })] },
    { title: 'Mixtures and quantities', specs: [spec('ratioProblem', { kind: 'mixtures' })] },
    {
      title: 'Ratio boss',
      specs: ['understand', 'simplify', 'divide', 'direct', 'inverse', 'scale', 'mixtures'].map((kind) =>
        spec('ratioProblem', { kind }),
      ),
    },
  ]),

  buildChapter('unitary', 6, 'Unitary Method', 'Find the value of one, then scale the answer.', 'units', [
    { title: 'Price per unit', specs: [spec('unitaryProblem', { kind: 'pricePerUnit' })] },
    { title: 'Quantity and cost', specs: [spec('unitaryProblem', { kind: 'quantityCost' })] },
    { title: 'Consumption', specs: [spec('unitaryProblem', { kind: 'consumption' })] },
    { title: 'Production rate', specs: [spec('unitaryProblem', { kind: 'production' })] },
    { title: 'Fuel calculations', specs: [spec('unitaryProblem', { kind: 'fuel' })] },
    { title: 'Time and work', specs: [spec('unitaryProblem', { kind: 'timeWork' })] },
    { title: 'Multiple-variable unitary problems', specs: [spec('unitaryProblem', { kind: 'multiVar' })] },
    {
      title: 'Unitary method mastery',
      specs: ['pricePerUnit', 'quantityCost', 'consumption', 'production', 'fuel', 'timeWork', 'multiVar'].map((kind) =>
        spec('unitaryProblem', { kind }),
      ),
    },
  ]),

  buildChapter('speed', 7, 'Speed, Distance and Time', 'The triangle every pilot lives by.', 'gauge', [
    { title: 'Speed formula', specs: [spec('speedProblem', { kind: 'speed' })] },
    { title: 'Distance formula', specs: [spec('speedProblem', { kind: 'distance' })] },
    { title: 'Time formula', specs: [spec('speedProblem', { kind: 'time' })] },
    { title: 'Rearranging formulas', specs: [spec('speedProblem', { kind: 'rearrange' })] },
    { title: 'Minutes and hours', specs: [spec('speedProblem', { kind: 'minutesHours' })] },
    { title: 'km/h to m/s', specs: [spec('speedProblem', { kind: 'kmhMs' })] },
    { title: 'm/s to km/h', specs: [spec('speedProblem', { kind: 'msKmh' })] },
    { title: 'Knots', specs: [spec('speedProblem', { kind: 'knots' })] },
    { title: 'Nautical miles', specs: [spec('speedProblem', { kind: 'nautical' })] },
    { title: 'Relative speed', specs: [spec('speedProblem', { kind: 'relative' })] },
    { title: 'Average speed', specs: [spec('speedProblem', { kind: 'average' })] },
    { title: 'Journey problems', specs: [spec('speedProblem', { kind: 'journey' })] },
    {
      title: 'Speed and time boss',
      specs: ['speed', 'distance', 'time', 'kmhMs', 'msKmh', 'knots', 'nautical', 'relative', 'average', 'journey'].map((kind) =>
        spec('speedProblem', { kind }),
      ),
      descriptor: 'Mixed speed checkpoint',
    },
  ]),

  buildChapter('averages', 8, 'Averages', 'Find the centre without losing the details.', 'chart', [
    { title: 'Basic average', specs: [spec('averageProblem', { kind: 'basic' })] },
    { title: 'Missing number', specs: [spec('averageProblem', { kind: 'missing' })] },
    { title: 'Combined averages', specs: [spec('averageProblem', { kind: 'combined' })] },
    { title: 'Weighted average basics', specs: [spec('averageProblem', { kind: 'weighted' })] },
    { title: 'Average speed', specs: [spec('averageProblem', { kind: 'speed' })] },
    { title: 'Average challenge', specs: ['basic', 'missing', 'combined', 'weighted', 'speed'].map((kind) => spec('averageProblem', { kind })) },
  ]),

  buildChapter('algebra', 9, 'Algebra', 'Find the unknown with a clean, reliable method.', 'brackets', [
    { title: 'One-step equations', specs: [spec('algebraProblem', { kind: 'oneStep' })] },
    { title: 'Two-step equations', specs: [spec('algebraProblem', { kind: 'twoStep' })] },
    { title: 'Brackets', specs: [spec('algebraProblem', { kind: 'brackets' })] },
    { title: 'Rearranging formulas', specs: [spec('algebraProblem', { kind: 'rearrange' })] },
    { title: 'Unknown values', specs: [spec('algebraProblem', { kind: 'unknown' })] },
    { title: 'Word problems', specs: [spec('algebraProblem', { kind: 'word' })] },
    { title: 'Algebra boss', specs: ['oneStep', 'twoStep', 'brackets', 'unknown', 'word'].map((kind) => spec('algebraProblem', { kind })) },
  ]),

  buildChapter('fuel-work', 10, 'Fuel, Rate and Work', 'Burn rates, output rates and shared effort.', 'fuel', [
    { title: 'Fuel consumption', specs: [spec('workProblem', { kind: 'fuelConsumption' })] },
    { title: 'Rate per hour', specs: [spec('workProblem', { kind: 'ratePerHour' })] },
    { title: 'Distance-based consumption', specs: [spec('workProblem', { kind: 'distanceConsumption' })] },
    { title: 'Remaining fuel', specs: [spec('workProblem', { kind: 'remainingFuel' })] },
    { title: 'Time and work', specs: [spec('workProblem', { kind: 'timeWork' })] },
    { title: 'Combined work rates', specs: [spec('workProblem', { kind: 'combinedWork' })] },
    {
      title: 'Rate boss',
      specs: ['fuelConsumption', 'ratePerHour', 'distanceConsumption', 'remainingFuel', 'timeWork', 'combinedWork'].map((kind) =>
        spec('workProblem', { kind }),
      ),
    },
  ]),

  buildChapter('patterns', 11, 'Number Patterns', 'Spot the rule before the numbers run out.', 'pattern', [
    { title: 'Arithmetic sequences', specs: [spec('sequenceProblem', { kind: 'arithmetic' })] },
    { title: 'Geometric sequences', specs: [spec('sequenceProblem', { kind: 'geometric' })] },
    { title: 'Missing terms', specs: [spec('sequenceProblem', { kind: 'missing' })] },
    { title: 'Differences', specs: [spec('sequenceProblem', { kind: 'differences' })] },
    { title: 'Square sequences', specs: [spec('sequenceProblem', { kind: 'square' })] },
    { title: 'Pattern recognition', specs: [spec('sequenceProblem', { kind: 'recognition' })] },
    {
      title: 'Sequence boss',
      specs: ['arithmetic', 'geometric', 'missing', 'differences', 'square', 'recognition'].map((kind) =>
        spec('sequenceProblem', { kind }),
      ),
    },
  ]),

  buildChapter('probability', 12, 'Probability', 'Count the outcomes, then count the favourable ones.', 'dice', [
    { title: 'Basic probability', specs: [spec('probabilityProblem', { kind: 'basic' })] },
    { title: 'Fractions of outcomes', specs: [spec('probabilityProblem', { kind: 'fractions' })] },
    { title: 'Dice', specs: [spec('probabilityProblem', { kind: 'dice' })] },
    { title: 'Coins', specs: [spec('probabilityProblem', { kind: 'coins' })] },
    { title: 'Cards', specs: [spec('probabilityProblem', { kind: 'cards' })] },
    { title: 'Multiple outcomes', specs: [spec('probabilityProblem', { kind: 'multiple' })] },
    {
      title: 'Probability challenge',
      specs: ['basic', 'fractions', 'dice', 'coins', 'cards', 'multiple'].map((kind) => spec('probabilityProblem', { kind })),
    },
  ]),

  buildChapter('geometry', 13, 'Geometry and Mensuration', 'Measure space, shape and surface.', 'shapes', [
    { title: 'Perimeter', specs: [spec('geometryProblem', { kind: 'perimeter' })] },
    { title: 'Rectangle area', specs: [spec('geometryProblem', { kind: 'rectArea' })] },
    { title: 'Triangle area', specs: [spec('geometryProblem', { kind: 'triangleArea' })] },
    { title: 'Circle circumference', specs: [spec('geometryProblem', { kind: 'circumference' })] },
    { title: 'Circle area', specs: [spec('geometryProblem', { kind: 'circleArea' })] },
    { title: 'Volume', specs: [spec('geometryProblem', { kind: 'volume' })] },
    { title: 'Surface area basics', specs: [spec('geometryProblem', { kind: 'surface' })] },
    {
      title: 'Geometry boss',
      specs: ['perimeter', 'rectArea', 'triangleArea', 'circumference', 'circleArea', 'volume', 'surface'].map((kind) =>
        spec('geometryProblem', { kind }),
      ),
    },
  ]),

  buildChapter('number-properties', 14, 'HCF, LCM and Number Properties', 'The structure behind every calculation.', 'grid', [
    { title: 'Factors', specs: [spec('numberProperty', { kind: 'factors' })] },
    { title: 'Multiples', specs: [spec('numberProperty', { kind: 'multiples' })] },
    { title: 'HCF', specs: [spec('numberProperty', { kind: 'hcf' })] },
    { title: 'LCM', specs: [spec('numberProperty', { kind: 'lcm' })] },
    { title: 'Divisibility', specs: [spec('numberProperty', { kind: 'divisibility' })] },
    { title: 'Remainders', specs: [spec('numberProperty', { kind: 'remainders' })] },
    {
      title: 'Number properties challenge',
      specs: ['factors', 'multiples', 'hcf', 'lcm', 'divisibility', 'remainders'].map((kind) => spec('numberProperty', { kind })),
    },
  ]),

  buildChapter('trigonometry', 15, 'Basic Trigonometry and Bearings', 'Angles, triangles and direction.', 'compass', [
    { title: 'Basic angles', specs: [spec('trigProblem', { kind: 'angles' })] },
    { title: 'Sine', specs: [spec('trigProblem', { kind: 'sine' })] },
    { title: 'Cosine', specs: [spec('trigProblem', { kind: 'cosine' })] },
    { title: 'Tangent', specs: [spec('trigProblem', { kind: 'tangent' })] },
    { title: 'Standard angle values', specs: [spec('trigProblem', { kind: 'standard' })] },
    { title: 'Right triangle problems', specs: [spec('trigProblem', { kind: 'rightTriangle' })] },
    { title: 'Basic bearings', specs: [spec('trigProblem', { kind: 'bearings' })] },
    { title: 'Direction and angle calculations', specs: [spec('trigProblem', { kind: 'direction' })] },
  ]),

  buildChapter('pilot-math', 16, 'Pilot Math', 'Realistic flight planning arithmetic. FlightMath practice material only.', 'plane', [
    { title: 'Ground speed calculations', specs: [spec('pilotProblem', { kind: 'groundSpeed' })] },
    { title: 'Distance and time', specs: [spec('pilotProblem', { kind: 'distanceTime' })] },
    { title: 'Fuel remaining', specs: [spec('pilotProblem', { kind: 'fuelRemaining' })] },
    { title: 'Fuel consumption', specs: [spec('pilotProblem', { kind: 'fuelBurn' })] },
    { title: 'Time to destination', specs: [spec('pilotProblem', { kind: 'timeToDest' })] },
    { title: 'Unit conversions', specs: [spec('pilotProblem', { kind: 'conversions' })] },
    { title: 'Simple altitude and rate calculations', specs: [spec('pilotProblem', { kind: 'altitude' })] },
    { title: 'Ratios', specs: [spec('pilotProblem', { kind: 'ratios' })] },
    { title: 'Average speed', specs: [spec('pilotProblem', { kind: 'averageSpeed' })] },
    { title: 'Flight planning arithmetic', specs: [spec('pilotProblem', { kind: 'planning' })] },
    { title: 'Mixed cockpit calculation problems', specs: ['groundSpeed', 'distanceTime', 'fuelRemaining', 'fuelBurn', 'timeToDest', 'conversions', 'altitude', 'averageSpeed', 'planning'].map((kind) => spec('pilotProblem', { kind })) },
  ]),

  buildChapter('adapt', 17, 'ADAPT Maths Preparation', 'Mixed numerical aptitude. FlightMath practice material — not official assessment content.', 'target', [
    { title: 'Basic numerical aptitude', specs: [spec('aptitudeProblem', { kind: 'basic' })] },
    { title: 'Mental arithmetic', specs: [spec('aptitudeProblem', { kind: 'mental' })] },
    { title: 'Speed calculations', specs: [spec('aptitudeProblem', { kind: 'speed' })] },
    { title: 'Ratio calculations', specs: [spec('aptitudeProblem', { kind: 'ratio' })] },
    { title: 'Percentages', specs: [spec('aptitudeProblem', { kind: 'percent' })] },
    { title: 'Unit conversions', specs: [spec('aptitudeProblem', { kind: 'units' })] },
    { title: 'Multi-step arithmetic', specs: [spec('aptitudeProblem', { kind: 'multiStep' })] },
    { title: 'Mixed timed challenges', specs: [spec('aptitudeProblem', { kind: 'mixedTimed' })] },
    { title: 'Final aptitude exam', specs: ['basic', 'mental', 'speed', 'ratio', 'percent', 'units', 'multiStep', 'mixedTimed'].map((kind) => spec('aptitudeProblem', { kind })), kind: 'exam', count: 20 },
  ]),
]

export const levels: Level[] = chapters.flatMap((chapter) => chapter.levels)
export const levelById: Record<string, Level> = Object.fromEntries(levels.map((level) => [level.id, level]))
export const chapterById: Record<string, Chapter> = Object.fromEntries(chapters.map((chapter) => [chapter.id, chapter]))

export function nextLevelId(levelId: string): string | null {
  const index = levels.findIndex((level) => level.id === levelId)
  return index >= 0 && index < levels.length - 1 ? levels[index + 1].id : null
}

export function firstLevelId(): string {
  return levels[0].id
}

export function levelsForChapter(chapterId: string): Level[] {
  return chapterById[chapterId]?.levels ?? []
}
