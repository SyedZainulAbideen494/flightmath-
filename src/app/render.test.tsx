import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
import { Onboarding } from './Onboarding'

const routes = (
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
)

const paths = [
  '/',
  '/onboarding',
  '/learn?chapter=foundations',
  '/lesson/foundations-1',
  '/session/lesson/foundations-1',
  '/session/exam?count=10',
  '/session/quick?minutes=5',
  '/session/trick/multiply-by-5',
  '/practice?mode=weakness',
  '/tricks',
  '/tricks/multiply-by-5',
  '/mistakes',
  '/progress',
  '/daily',
  '/formulas',
  '/achievements',
  '/settings',
  '/this-route-does-not-exist',
]

describe('page rendering', () => {
  it('renders every route without throwing', () => {
    paths.forEach((path) => {
      const html = renderToString(<MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>)
      expect(html.length, path).toBeGreaterThan(120)
    })
  })

  it('renders the practice and tricks hubs with meaningful content', () => {
    const practice = renderToString(<MemoryRouter initialEntries={['/practice']}>{routes}</MemoryRouter>)
    expect(practice).toContain('Choose your')
    const tricks = renderToString(<MemoryRouter initialEntries={['/tricks']}>{routes}</MemoryRouter>)
    expect(tricks).toContain('Tricks Lab')
    expect(tricks).toContain('Multiply by 5')
  })
})
