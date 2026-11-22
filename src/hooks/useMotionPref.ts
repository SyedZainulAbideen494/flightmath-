import { useReducedMotion } from 'framer-motion'
import { useAppStore } from '@/stores/useAppStore'

export function useMotionPref(): boolean {
  const systemReduced = useReducedMotion()
  const setting = useAppStore((s) => s.settings.reducedMotion)
  return Boolean(systemReduced || setting)
}
