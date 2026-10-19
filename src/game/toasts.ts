import { create } from 'zustand'

export interface Toast { id: number; title: string; body?: string; tone?: 'mission' | 'info' | 'warn' }
interface ToastState { toasts: Toast[]; push: (t: Omit<Toast, 'id'>) => void; dismiss: (id: number) => void }
let nid = 1
export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = nid++
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] })
    setTimeout(() => get().dismiss(id), t.tone === 'mission' ? 5200 : 3200)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}))
export const toast = (title: string, body?: string, tone: Toast['tone'] = 'info') => useToasts.getState().push({ title, body, tone })
