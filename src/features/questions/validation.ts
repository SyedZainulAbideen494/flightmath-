import type { GeneratedQuestion } from '@/lib/types'

export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u00a0,\s]/g, '')
    .replace(/₹|rs\.?|₹|km\/h|kmh|knots?|kt|kg|litres?|liters?|l\b|%|°/g, '')
}

export function parseNumeric(raw: string): number | null {
  const cleaned = raw.trim().replace(/,/g, '').replace(/^\+/g, '')
  if (!cleaned) return null
  // Accept simple fractions such as 3/4.
  const fraction = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  if (fraction) {
    const denominator = Number(fraction[2])
    return denominator === 0 ? null : Number(fraction[1]) / denominator
  }
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

export function validateAnswer(question: GeneratedQuestion, rawInput: string): boolean {
  const raw = String(rawInput ?? '')
  if (question.type === 'numeric') {
    const value = parseNumeric(raw)
    if (value === null || question.numericAnswer === undefined) return false
    const tolerance = question.tolerance ?? (Number.isInteger(question.numericAnswer) ? 1e-6 : 0.011)
    return Math.abs(value - question.numericAnswer) <= tolerance
  }
  if (question.type === 'boolean') {
    const value = normalizeText(raw)
    const yes = ['true', 'yes', 'y', '1', 'correct']
    const no = ['false', 'no', 'n', '0', 'incorrect']
    const expected = normalizeText(question.answer)
    if (yes.includes(expected)) return yes.includes(value)
    if (no.includes(expected)) return no.includes(value)
    return value === expected
  }
  if (question.type === 'matching') {
    try {
      const parsed = JSON.parse(raw)
      return JSON.stringify(parsed) === question.answer
    } catch {
      return false
    }
  }
  if (question.type === 'order') {
    return raw.split('|').join('|') === question.answer
  }
  return normalizeText(raw) === normalizeText(question.answer)
}

export function displayAnswer(question: GeneratedQuestion): string {
  if (question.type === 'mcq' || question.type === 'shortcut') return question.answer
  if (question.type === 'boolean') return /^(true|yes)/i.test(question.answer) ? 'True' : 'False'
  if (question.type === 'matching') {
    try {
      return (JSON.parse(question.answer) as string[]).join(' · ')
    } catch {
      return question.answer
    }
  }
  if (question.type === 'order') return question.answer.split('|').join(' → ')
  return `${question.numericAnswer ?? question.answer}${question.answerUnit ? ` ${question.answerUnit}` : ''}`
}
