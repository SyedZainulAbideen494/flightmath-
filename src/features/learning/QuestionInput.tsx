import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { X, RotateCcw, Check } from 'lucide-react'
import type { GeneratedQuestion } from '@/lib/types'
import { shuffle, hashString, mulberry32 } from '@/features/questions/random'
import { Button } from '@/components/ui/Button'

interface QuestionInputProps {
  question: GeneratedQuestion
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  locked?: boolean
}

export function QuestionInput({ question, value, onChange, onSubmit, disabled, locked }: QuestionInputProps) {
  const [order, setOrder] = useState<number[]>([])
  const rights = useMemo(() => {
    if (!question.pairs) return []
    return shuffle(mulberry32(hashString(question.id)), question.pairs.map((pair) => pair.right))
  }, [question])

  useEffect(() => { setOrder([]) }, [question.id])

  if (question.type === 'numeric') {
    return (
      <div className="relative mx-auto w-full max-w-md">
        <input
          autoFocus
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label="Your numeric answer"
          className="num w-full rounded-tile border-2 border-line-strong bg-inset/80 px-6 py-5 pr-14 text-center text-3xl font-semibold outline-none transition-colors placeholder:text-faint focus:border-accent disabled:opacity-60"
          placeholder="0"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d.,\-/ ]/g, ''))}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onSubmit() } }}
          disabled={disabled || locked}
        />
        {value && !disabled && !locked && (
          <button onClick={() => onChange('')} aria-label="Clear answer" className="absolute right-4 top-1/2 -translate-y-1/2 text-faint hover:text-ink"><X size={18} /></button>
        )}
        {question.answerUnit && <div className="mt-2 text-center text-xs text-muted">Answer in {question.answerUnit}</div>}
      </div>
    )
  }

  if (question.type === 'mcq' || question.type === 'shortcut') {
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-2.5 sm:grid-cols-2">
        {(question.options ?? []).map((option, index) => {
          const selected = value === option
          const correct = locked && selected
          return (
            <button
              key={option}
              onClick={() => { onChange(option); if (!locked) setTimeout(onSubmit, 120) }}
              disabled={disabled || locked}
              className={clsx(
                'flex min-h-[58px] items-center gap-3 rounded-tile border px-4 py-3 text-left text-[0.9375rem] transition-all',
                selected ? 'border-accent bg-accent-soft text-ink' : 'border-line-strong text-muted hover:border-accent/60 hover:text-ink',
                correct && 'border-sage bg-sage/10',
                disabled && 'opacity-50',
              )}
            >
              <span className={clsx('num grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs', selected ? 'border-accent text-accent' : 'border-line-strong text-faint')}>
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </button>
          )
        })}
      </div>
    )
  }

  if (question.type === 'boolean') {
    return (
      <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
        {['True', 'False'].map((option) => (
          <button
            key={option}
            onClick={() => { onChange(option); if (!locked) setTimeout(onSubmit, 120) }}
            disabled={disabled || locked}
            className={clsx('btn btn-lg', value === option ? 'btn-accent' : 'btn-outline')}
          >
            {option}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'matching' && question.pairs) {
    const current = (() => { try { return JSON.parse(value || '[]') as string[] } catch { return [] } })()
    const update = (index: number, right: string) => {
      const next = [...current]
      next[index] = right
      onChange(JSON.stringify(next))
    }
    const complete = question.pairs.every((_, index) => Boolean(current[index]))
    return (
      <div className="mx-auto w-full max-w-2xl space-y-3">
        {question.pairs.map((pair, index) => (
          <div key={pair.left} className="flex items-center gap-3">
            <span className="num min-w-[90px] rounded-tile border border-line bg-inset/60 px-3 py-2.5 text-sm">{pair.left}</span>
            <span className="text-faint">→</span>
            <select
              aria-label={`Match ${pair.left}`}
              value={current[index] ?? ''}
              onChange={(event) => update(index, event.target.value)}
              disabled={disabled || locked}
              className="input-shell !py-2.5 text-sm"
            >
              <option value="">Choose…</option>
              {rights.map((right) => <option key={right} value={right}>{right}</option>)}
            </select>
          </div>
        ))}
        <Button full disabled={!complete || disabled || locked} onClick={onSubmit} variant="accent">Check matches</Button>
      </div>
    )
  }

  if (question.type === 'order' && question.orderItems) {
    const remaining = question.orderItems
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => !order.includes(index))
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex min-h-[64px] flex-wrap items-center gap-2 rounded-tile border border-dashed border-line-strong p-3">
          {order.length === 0 && <span className="text-sm text-faint">Tap the steps in the correct order…</span>}
          {order.map((index, position) => (
            <button key={index} onClick={() => setOrder((current) => current.filter((i) => i !== index))} disabled={locked} className="pill border-accent/50 bg-accent-soft text-accent">
              <span className="num text-faint">{position + 1}</span> {question.orderItems![index]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {remaining.map(({ item, index }) => (
            <button
              key={index}
              onClick={() => setOrder((current) => [...current, index])}
              disabled={disabled || locked}
              className="btn btn-outline btn-sm"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="accent" disabled={order.length !== question.orderItems.length || disabled || locked} onClick={() => { onChange(order.join('|')); onSubmit() }} icon={<Check size={15} />}>Check order</Button>
          <Button variant="ghost" onClick={() => { setOrder([]); onChange('') }} icon={<RotateCcw size={14} />}>Reset</Button>
        </div>
      </div>
    )
  }

  return null
}
