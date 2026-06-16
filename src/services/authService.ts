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
  urlFotoPerfil?: string | null
}

export interface LoginResponse {
  token: string
  tipoToken: string
  expiraUtc: string
  refreshToken?: string
  user: LoginUserData
}

/** Extrae el mensaje de error más útil de una respuesta de la API. */
function apiError(error: any, fallback: string): string {
  const d = error?.response?.data
  if (!d) return fallback
  if (typeof d === 'string') return d
  if (d.detail) return d.detail
  if (d.errors && typeof d.errors === 'object') {
    const first = (Object.values(d.errors).flat() as string[])[0]
    if (first) return String(first)
  }
  return d.mensaje || d.message || d.title || fallback
}

/** Mapea la respuesta cruda del backend (login/refresh) al shape LoginResponse del front. */
function mapLoginResponse(responseData: any, correoFallback = ''): LoginResponse | null {
  if (!responseData?.token) return null
  return {
    token: responseData.token,
    tipoToken: responseData.tipoToken || 'Bearer',
    expiraUtc: responseData.expiraUtc,
    refreshToken: responseData.refreshToken,
    user: {
      id: responseData.idUsuarioOCliente || responseData.id || responseData.user?.id,
      correo: responseData.correo || correoFallback,
      rol: responseData.rol || 'Usuario',
      nombreCompleto: responseData.nombreCompleto || '',
      telefono: responseData.telefono,
      idEmpresa: responseData.idEmpresa,
      idSede: responseData.idSede,
      debeCambiarPassword: responseData.debeCambiarPassword,
      urlFotoPerfil: responseData.urlFotoPerfil ?? undefined,
    },
  }
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

      const loginData = mapLoginResponse(responseData, email)
      if (!loginData) {
        console.error('❌ No token en respuesta')
        return null
      }

      console.log('✅ Login exitoso:', loginData)
      return loginData
    } catch (error: any) {
      console.error('❌ Error en login:', error.response?.data || error.message)
      return null
    }
  },

  /**
   * Login con Google. Recibe el ID token (credential) que entrega Google
   * Identity Services en el front y lo manda al backend, que lo valida y
   * devuelve la MISMA sesión que el login normal (token + cookie bp_rt).
   * A diferencia de `login`, NO traga el error: lo relanza para que la página
   * pueda mostrar el mensaje del backend (p.ej. "no hay cuenta con ese correo").
   */
  loginGoogle: async (credential: string): Promise<LoginResponse | null> => {
    const response = await apiClient.post('/api/Auth/google', { Credential: credential })
    const responseData = response.data.data || response.data
    return mapLoginResponse(responseData)
  },

  /**
   * SSO cross-subdominio: recupera la sesión SIN pedir credenciales.
   *
   * El login deja un refresh token en una cookie httpOnly `bp_rt` con
   * Domain=.barber.pe, que el navegador envía a barber.pe, app.barber.pe y a
   * cualquier <sede>.barber.pe. Al abrir un subdominio nuevo, el localStorage
   * de ESE origin está vacío, así que llamamos a /refresh con body vacío: el
   * backend lee la cookie compartida y, si es válida, devuelve un nuevo par
   * de tokens. Así el usuario aparece logueado en cualquier subdominio.
   *
   * Devuelve la sesión restaurada (y la persiste en este origin) o null si no
   * hay sesión activa (entonces el usuario navega como anónimo, sin romper nada).
   */
  bootstrapSession: async (): Promise<LoginResponse | null> => {
    try {
      // body {} → fuerza a que el backend resuelva el refresh desde la cookie.
      const response = await apiClient.post('/api/Auth/refresh', {})
      const responseData = response.data.data || response.data

      const loginData = mapLoginResponse(responseData)
      if (!loginData) return null

      // Persistir en este origin para que apiClient adjunte el Bearer en las
      // siguientes peticiones, igual que tras un login normal.
      localStorage.setItem('token', loginData.token)
      localStorage.setItem('user', JSON.stringify(loginData.user))
      console.log('🔁 Sesión restaurada por SSO:', loginData.user.nombreCompleto)
      return loginData
    } catch {
      // 401/SIN_SESION → no hay sesión en este navegador: anónimo. Sin ruido.
      return null
    }
  },

  /**
   * Crear / recuperar contraseña por OTP - paso 1: envía el enlace (correo o WhatsApp).
   * Respuesta uniforme: el backend siempre responde ok (no revela si la cuenta existe).
   */
  solicitarPassword: async (identificador: string): Promise<{ ok: boolean; mensaje?: string }> => {
    try {
      const r = await apiClient.post('/api/Auth/password/solicitar', { identificador })
      return { ok: true, mensaje: r.data?.mensaje }
    } catch (error: any) {
      return { ok: false, mensaje: apiError(error, 'No se pudo enviar el enlace.') }
    }
  },

  /**
   * Crear / recuperar contraseña por OTP - paso 2: valida el código y fija la contraseña.
   */
  establecerPassword: async (
    identificador: string,
    codigo: string,
    passwordNueva: string,
  ): Promise<{ ok: boolean; mensaje?: string }> => {
    try {
      const r = await apiClient.post('/api/Auth/password/establecer', {
        identificador, codigo, passwordNueva,
      })
      return { ok: true, mensaje: r.data?.mensaje }
    } catch (error: any) {
      return { ok: false, mensaje: apiError(error, 'No se pudo establecer la contraseña.') }
    }
  },

  /**
   * Cambia la contraseña del usuario logueado (requiere la contraseña actual).
   * Para crear una por primera vez sin tenerla, usar solicitarPassword (enlace OTP).
   */
  cambiarPassword: async (
    passwordActual: string,
    passwordNueva: string,
  ): Promise<{ ok: boolean; mensaje?: string }> => {
    try {
      const r = await apiClient.post('/api/Auth/cambiar-password', {
        passwordActual, passwordNueva,
      })
      return { ok: true, mensaje: r.data?.mensaje }
    } catch (error: any) {
      return { ok: false, mensaje: apiError(error, 'No se pudo cambiar la contraseña.') }
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
   * Logout REAL. Llama al backend para (1) revocar la sesión en BD y (2) borrar
   * la cookie httpOnly compartida `bp_rt` (Domain=.barber.pe). Sin esto, la
   * cookie sobrevive al "logout" local y el SSO (bootstrapSession) vuelve a
   * loguear al usuario al recargar o al manipular la URL. `withCredentials` ya
   * está activo en apiClient, así que la cookie viaja sola. Aunque la red falle,
   * limpiamos el estado local igual.
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/api/Auth/logout', {})
    } catch {
      /* sin red: igual limpiamos local abajo */
    }
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