import { create } from 'zustand'
import { clearTenant } from '@/services/apiClient'
import { clearMisSedesCache } from '@/services/sedeTenantService'

export interface User {
  id: number
  correo: string
  rol: string
  nombreCompleto: string
  telefono?: string
  urlFotoPerfil?: string | null
  idEmpresa?: number
  idSede?: number
  debeCambiarPassword?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  setUser: (user) => {
    console.log('📝 Guardando usuario en store:', user?.nombreCompleto)
    set({ user })
    if (user) {
      try {
        localStorage.setItem('user', JSON.stringify(user))
      } catch (error) {
        console.error('Error guardando usuario:', error)
      }
    }
  },

  setToken: (token) => {
    console.log('🔑 Guardando token en store:', !!token)
    set({ token })
    if (token) {
      try {
        localStorage.setItem('token', token)
      } catch (error) {
        console.error('Error guardando token:', error)
      }
    }
  },

  logout: () => {
    console.log('🚪 Realizando logout...')
    set({ user: null, token: null })
    try {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      // Limpieza completa de sesión: tenant + sessionStorage, para que el
      // próximo admin NO herede nada de la sesión anterior.
      clearTenant()
      clearMisSedesCache()
      sessionStorage.clear()
    } catch (error) {
      console.error('Error en logout:', error)
    }
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// SINCRONIZACIÓN DE SESIÓN ENTRE PESTAÑAS
// El evento `storage` SOLO se dispara en las OTRAS pestañas del mismo origen
// (no en la que hizo el cambio). Si en una pestaña se cierra sesión (se borra el
// token), aquí lo reflejamos: limpiamos el estado en memoria y mandamos a /login.
// ─────────────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    // Otra pestaña cerró sesión (token eliminado).
    if (e.key === 'token' && e.newValue === null) {
      useAuthStore.setState({ user: null, token: null })
      try { clearTenant(); clearMisSedesCache(); sessionStorage.clear() } catch { /* ignore */ }
      const ruta = window.location.pathname
      const esPublica = ruta.startsWith('/login') || ruta.startsWith('/acceso') || ruta === '/'
      if (!esPublica) window.location.href = '/login'
    }
  })
}