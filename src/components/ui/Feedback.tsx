import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X, Trophy, Sparkles, Plane } from 'lucide-react'
import { useUiStore, type Toast } from '@/stores/useUiStore'
import { useMotionPref } from '@/hooks/useMotionPref'
import { playSound } from '@/hooks/useSound'
import { useAppStore } from '@/stores/useAppStore'

function ToastRow({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((s) => s.dismissToast)
  const tone = toast.tone === 'success' ? 'text-sage' : toast.tone === 'error' ? 'text-coral' : toast.tone === 'gold' ? 'text-gold' : 'text-accent'
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.97 }}
      className="glass-strong pointer-events-auto flex w-[min(360px,calc(100vw-32px))] items-start gap-3 rounded-tile px-4 py-3.5"
    >
      <span className={`mt-0.5 ${tone}`}>{toast.tone === 'error' ? <X size={17} /> : toast.tone === 'success' ? <Check size={17} /> : <Sparkles size={17} />}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{toast.title}</div>
        {toast.detail && <div className="mt-0.5 text-xs leading-relaxed text-muted">{toast.detail}</div>}
      </div>
      <button onClick={() => dismiss(toast.id)} className="text-faint transition-colors hover:text-ink" aria-label="Dismiss notification"><X size={15} /></button>
    </motion.div>
  )
}

export function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-[90] flex flex-col items-end gap-2 md:bottom-6">
      <AnimatePresence>{toasts.map((toast) => <ToastRow key={toast.id} toast={toast} />)}</AnimatePresence>
    </div>
  )
}

export function AnimatedNumber({ value, className, format }: { value: number; className?: string; format?: (value: number) => string }) {
  const [display, setDisplay] = useState(value)
  const reduced = useMotionPref()
  useEffect(() => {
    if (reduced) { setDisplay(value); return }
    const from = display
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 550)
      const eased = 1 - (1 - progress) ** 3
      setDisplay(from + (value - from) * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced])
  return <span className={className}>{format ? format(display) : Math.round(display).toLocaleString()}</span>
}

export function Celebration() {
  const celebration = useUiStore((s) => s.celebration)
  const clear = useUiStore((s) => s.clearCelebration)
  const reduced = useMotionPref()
  const sound = useAppStore((s) => s.settings.sound)
  useEffect(() => {
    if (celebration) playSound(celebration.kind === 'rank' ? 'rank' : 'achievement', sound)
  }, [celebration, sound])

  useEffect(() => {
    if (!celebration) return
    const timer = setTimeout(clear, 4200)
    return () => clearTimeout(timer)
  }, [celebration, clear])

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[95] grid place-items-center px-5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" />
          {!reduced && Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-gold/70"
              style={{ left: `${8 + (i * 6.4) % 84}%`, top: `${18 + (i * 13) % 60}%` }}
              initial={{ opacity: 0, y: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.9, 0], y: -70 - (i % 4) * 16, scale: 1 }}
              transition={{ duration: 1.5, delay: i * 0.04, ease: 'easeOut' }}
            />
          ))}
          <motion.div
            className="glass-strong relative w-full max-w-md rounded-panel px-8 py-9 text-center"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold">
              {celebration.kind === 'rank' ? <Trophy size={28} /> : celebration.kind === 'level' ? <Plane size={28} /> : <Sparkles size={28} />}
            </div>
            <div className="eyebrow mb-2 text-gold">{celebration.kind === 'rank' ? 'Rank unlocked' : celebration.kind === 'level' ? 'Checkpoint cleared' : 'Achievement unlocked'}</div>
            <h2 className="display text-3xl font-extrabold">{celebration.title}</h2>
            <p className="mt-3 text-sm text-muted">{celebration.detail}</p>
            <button onClick={clear} className="btn btn-accent mt-7">Continue</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
