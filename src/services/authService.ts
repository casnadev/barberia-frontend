import { apiClient } from './apiClient'

export interface LoginUserData {
  id: number
  correo: string
  rol: string
  nombreCompleto: string
  telefono?: string
  idEmpresa?: number
  idSede?: number
  debeCambiarPassword?: boolean
}

export interface LoginResponse {
  token: string
  tipoToken: string
  expiraUtc: string
  refreshToken?: string
  user: LoginUserData
}

export const authService = {
  /**
   * Login - Obtener token y usuario
   */
  login: async (email: string, password: string): Promise<LoginResponse | null> => {
    try {
      console.log('🔐 Iniciando login...', email)
      
      const response = await apiClient.post('/api/Auth/login', {
        Correo: email,
        Password: password,
      })

      console.log('✅ Login response:', response.data)

      // Parsear respuesta
      const responseData = response.data.data || response.data
      
      if (!responseData.token) {
        console.error('❌ No token en respuesta')
        return null
      }

      const loginData: LoginResponse = {
  token: responseData.token,
  tipoToken: responseData.tipoToken || 'Bearer',
  expiraUtc: responseData.expiraUtc,
  refreshToken: responseData.refreshToken,
  user: {
    id: responseData.idUsuarioOCliente || responseData.id || responseData.user?.id,
    correo: responseData.correo || email,
    rol: responseData.rol || 'Usuario',
    nombreCompleto: responseData.nombreCompleto || '',
    telefono: responseData.telefono,
    idEmpresa: responseData.idEmpresa,
    idSede: responseData.idSede,
    debeCambiarPassword: responseData.debeCambiarPassword,
  }
}

      console.log('✅ Login exitoso:', loginData)
      return loginData
    } catch (error: any) {
      console.error('❌ Error en login:', error.response?.data || error.message)
      return null
    }
  },

  /**
   * Obtener token del localStorage
   */
  getStoredToken: (): string | null => {
    try {
      const token = localStorage.getItem('token')
      console.log('🔑 Token recuperado del storage:', !!token)
      return token
    } catch (error) {
      console.error('❌ Error leyendo token:', error)
      return null
    }
  },

  /**
   * Obtener usuario del localStorage
   */
  getStoredUser: (): LoginUserData | null => {
    try {
      const userJson = localStorage.getItem('user')
      if (!userJson) {
        console.log('⚠️ No hay usuario en storage')
        return null
      }
      const user = JSON.parse(userJson) as LoginUserData
      console.log('👤 Usuario recuperado del storage:', user.nombreCompleto)
      return user
    } catch (error) {
      console.error('❌ Error leyendo usuario:', error)
      return null
    }
  },

  /**
   * Guardar token en localStorage
   */
  saveToken: (token: string): void => {
    try {
      localStorage.setItem('token', token)
      console.log('✅ Token guardado en storage')
    } catch (error) {
      console.error('❌ Error guardando token:', error)
    }
  },

  /**
   * Guardar usuario en localStorage
   */
  saveUser: (user: LoginUserData): void => {
    try {
      localStorage.setItem('user', JSON.stringify(user))
      console.log('✅ Usuario guardado en storage')
    } catch (error) {
      console.error('❌ Error guardando usuario:', error)
    }
  },

  /**
   * Logout - Limpiar localStorage
   */
  logout: (): void => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      console.log('✅ Logout completado')
    } catch (error) {
      console.error('❌ Error en logout:', error)
    }
  },

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated: (): boolean => {
    const token = authService.getStoredToken()
    return !!token
  }
}