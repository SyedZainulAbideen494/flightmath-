import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Compass, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Ui'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <section className="glass-panel mx-auto mt-10 max-w-2xl rounded-panel px-6 py-16 text-center sm:px-12">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-accent/40 bg-accent-soft text-accent"><Compass size={30} /></div>
      <Eyebrow className="mt-8">Off the flight plan</Eyebrow>
      <h1 className="display mt-4 text-[clamp(2.6rem,7vw,4.4rem)] font-bold">404</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
        This route isn&apos;t on the FlightMath chart. Head back to the cockpit and pick a new heading.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="amber" onClick={() => navigate('/')} icon={<MapPin size={16} />}>Back to cockpit</Button>
        <Button onClick={() => navigate('/learn')} icon={<ArrowLeft size={16} />}>Learning path</Button>
      </div>
    </section>
  )
}
