import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { AppShell } from './AppShell'
import { Onboarding } from './Onboarding'
import { Home } from '@/pages/Home'
import { Learn } from '@/pages/Learn'
import { LessonDetail } from '@/pages/LessonDetail'
import { SessionPage } from '@/pages/SessionPage'
import { Practice } from '@/pages/Practice'
import { TricksLab } from '@/pages/TricksLab'
import { TrickDetail } from '@/pages/TrickDetail'
import { Mistakes } from '@/pages/Mistakes'
import { Progress } from '@/pages/Progress'
import { Daily } from '@/pages/Daily'
import { Formulas } from '@/pages/Formulas'
import { Achievements } from '@/pages/Achievements'
import { Settings } from '@/pages/Settings'
import { NotFound } from '@/pages/NotFound'

function BootScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6">
      <div className="text-center">
        <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        <div className="font-display text-lg font-bold tracking-tight">FlightMath</div>
        <p className="mt-2 text-sm text-muted">Preparing your training cockpit…</p>
      </div>
    </div>
  )
}

export default function App() {
  const hydrated = useAppStore((s) => s.hydrated)
  const hydrate = useAppStore((s) => s.hydrate)
  const onboardingComplete = useAppStore((s) => s.profile.onboardingComplete)
  const settings = useAppStore((s) => s.settings)
  const location = useLocation()

  useEffect(() => { void hydrate() }, [hydrate])

  useEffect(() => {
    const apply = () => {
      const resolved = settings.theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : settings.theme
      document.documentElement.dataset.theme = settings.theme
      document.documentElement.dataset.themeResolved = resolved
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#191714' : '#F7F4EF')
    }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: light)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings.theme])

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(settings.reducedMotion)
  }, [settings.reducedMotion])

  if (!hydrated) return <BootScreen />

  if (!onboardingComplete && location.pathname !== '/onboarding') {
    return <Onboarding />
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/lesson/:levelId" element={<LessonDetail />} />
        <Route path="/session/:mode" element={<SessionPage />} />
        <Route path="/session/:mode/:id" element={<SessionPage />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/tricks" element={<TricksLab />} />
        <Route path="/tricks/:id" element={<TrickDetail />} />
        <Route path="/mistakes" element={<Mistakes />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/daily" element={<Daily />} />
        <Route path="/formulas" element={<Formulas />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  )
}
