import { create } from 'zustand'

/**
 * Favoritos de barberías unificados para toda la app (landing, micrositio de
 * sede y panel del cliente). Persisten en este dispositivo (localStorage) bajo
 * una sola clave, para que el corazón se vea igual en todas partes.
 *
 * NOTA: hoy es por dispositivo. Para sincronizar por cuenta entre dispositivos
 * haría falta una tabla + endpoints de favoritos en el backend (pendiente).
 */
export interface SedeFavLite {
  idSede: number
  nombre: string
  subdominio?: string
  logoUrl?: string
  direccion?: string
}

const LS_KEY = 'bp_favoritos'

const cargar = (): Record<number, SedeFavLite> => {
  try { const v = localStorage.getItem(LS_KEY); return v ? (JSON.parse(v) as Record<number, SedeFavLite>) : {} } catch { return {} }
}
const guardar = (m: Record<number, SedeFavLite>) => { try { localStorage.setItem(LS_KEY, JSON.stringify(m)) } catch { /* noop */ } }

interface FavState {
  favs: Record<number, SedeFavLite>
  esFavorito: (idSede?: number) => boolean
  lista: () => SedeFavLite[]
  /** Alterna el favorito y devuelve el nuevo estado (true = quedó favorito). */
  toggle: (sede: SedeFavLite) => boolean
}

export const useFavoritosStore = create<FavState>((set, get) => ({
  favs: cargar(),
  esFavorito: (idSede) => (idSede != null ? !!get().favs[idSede] : false),
  lista: () => Object.values(get().favs),
  toggle: (sede) => {
    const favs = { ...get().favs }
    let nowFav: boolean
    if (favs[sede.idSede]) { delete favs[sede.idSede]; nowFav = false }
    else { favs[sede.idSede] = sede; nowFav = true }
    guardar(favs)
    set({ favs })
    return nowFav
  },
}))