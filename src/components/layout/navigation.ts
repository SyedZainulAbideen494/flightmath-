import {
  Home, Map, Zap, Lightbulb, RotateCcw, BarChart3, CalendarDays, Sigma, Settings2, Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  primary: boolean
}

export const navItems: NavItem[] = [
  { label: 'Home', to: '/', icon: Home, primary: true },
  { label: 'Learn', to: '/learn', icon: Map, primary: true },
  { label: 'Practice', to: '/practice', icon: Zap, primary: true },
  { label: 'Tricks Lab', to: '/tricks', icon: Lightbulb, primary: false },
  { label: 'Mistake Bank', to: '/mistakes', icon: RotateCcw, primary: true },
  { label: 'Progress', to: '/progress', icon: BarChart3, primary: true },
  { label: 'Daily', to: '/daily', icon: CalendarDays, primary: false },
  { label: 'Formulas', to: '/formulas', icon: Sigma, primary: false },
  { label: 'Achievements', to: '/achievements', icon: Trophy, primary: false },
  { label: 'Settings', to: '/settings', icon: Settings2, primary: false },
]

export const primaryNav = navItems.filter((item) => item.primary)
export const moreNav = navItems.filter((item) => !item.primary)
