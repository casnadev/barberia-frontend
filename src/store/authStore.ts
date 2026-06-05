import { create } from 'zustand'
import { clearTenant } from '@/services/apiClient'

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
      sessionStorage.clear()
    } catch (error) {
      console.error('Error en logout:', error)
    }
  },
}))