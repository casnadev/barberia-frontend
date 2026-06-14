import { create } from 'zustand'

/** Estado global mínimo para abrir/cerrar el modal de "Ayuda y soporte"
 *  desde cualquier lugar (menú de cuenta, pestaña "Más", etc.). */
interface SoporteState {
  open: boolean
  abrir: () => void
  cerrar: () => void
}

export const useSoporteStore = create<SoporteState>((set) => ({
  open: false,
  abrir: () => set({ open: true }),
  cerrar: () => set({ open: false }),
}))