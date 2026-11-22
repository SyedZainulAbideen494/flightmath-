import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { navItems } from './navigation'
import { useUiStore } from '@/stores/useUiStore'
import { chapters } from '@/data/curriculum/chapters'

export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen)
  const setOpen = useUiStore((s) => s.setCommandOpen)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const results = useMemo(() => {
    const pages = navItems.map((item) => ({ label: item.label, detail: 'Navigate', to: item.to }))
    const chapterPages = chapters.map((chapter) => ({ label: chapter.title, detail: `Chapter ${chapter.index} · Learning path`, to: `/learn?chapter=${chapter.id}` }))
    const all = [...pages, ...chapterPages]
    if (!query.trim()) return all.slice(0, 8)
    const needle = query.toLowerCase()
    return all.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(needle)).slice(0, 8)
  }, [query])

  useEffect(() => setActive(0), [query])

  const go = (to: string) => {
    setOpen(false)
    setQuery('')
    navigate(to)
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Command menu">
      <div className="relative mb-3">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(results.length - 1, i + 1)) }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
            if (event.key === 'Enter' && results[active]) go(results[active].to)
          }}
          placeholder="Search pages and chapters…"
          className="input-shell !pl-11"
          aria-label="Search commands"
        />
      </div>
      <div className="max-h-[46vh] space-y-1 overflow-y-auto">
        {results.length ? results.map((item, index) => (
          <button
            key={`${item.to}-${item.label}`}
            onClick={() => go(item.to)}
            onMouseEnter={() => setActive(index)}
            className={`flex w-full items-center justify-between rounded-tile px-4 py-3 text-left text-sm transition-colors ${index === active ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'}`}
          >
            <span>{item.label}<span className="ml-2 text-xs text-faint">{item.detail}</span></span>
            {index === active && <CornerDownLeft size={14} />}
          </button>
        )) : <p className="px-4 py-6 text-sm text-muted">No matches. Try a chapter or page name.</p>}
      </div>
    </Modal>
  )
}
