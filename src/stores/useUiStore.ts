import { create } from 'zustand'

export interface Toast {
  id: string
  title: string
  detail?: string
  tone: 'default' | 'success' | 'error' | 'gold'
}

interface UiState {
  toasts: Toast[]
  celebration: { title: string; detail: string; kind: 'achievement' | 'rank' | 'level' } | null
  commandOpen: boolean
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  showCelebration: (celebration: NonNullable<UiState['celebration']>) => void
  clearCelebration: () => void
  setCommandOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()((set) => ({
  toasts: [],
  celebration: null,
  commandOpen: false,
  pushToast: (toast) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id }] }))
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), 4200)
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  showCelebration: (celebration) => set({ celebration }),
  clearCelebration: () => set({ celebration: null }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}))
