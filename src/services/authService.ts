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
  subdominio?: string
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
      subdominio: responseData.subdominio ?? undefined,
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
  loginGoogle: async (
    credential: string,
    tipo?: 'Cliente' | 'Profesional',
    crearSiNoExiste = true,
  ): Promise<LoginResponse | { necesitaCompletarProfesional: true; correo?: string; nombreCompleto?: string } | null> => {
    const response = await apiClient.post('/api/Auth/google', {
      Credential: credential, Tipo: tipo, CrearSiNoExiste: crearSiNoExiste,
    })
    const d = response.data.data || response.data
    if (d?.necesitaCompletarProfesional) {
      return { necesitaCompletarProfesional: true, correo: d.correo, nombreCompleto: d.nombreCompleto }
    }
    return mapLoginResponse(d)
  },

  /** Completa el registro PROFESIONAL iniciado con Google (negocio + contraseña). */
  googleCompletarProfesional: async (payload: {
    credential: string; nombreNegocio: string; nombre?: string; apellido?: string; password: string
    departamento?: string; distrito?: string
    aceptaTerminos?: boolean; versionTerminos?: string   // Tarea 5
  }): Promise<LoginResponse | null> => {
    const r = await apiClient.post('/api/Auth/google/completar-profesional', {
      Credential: payload.credential,
      NombreNegocio: payload.nombreNegocio,
      Nombre: payload.nombre,
      Apellido: payload.apellido,
      Password: payload.password,
      Departamento: payload.departamento,
      Distrito: payload.distrito,
      AceptaTerminos: payload.aceptaTerminos,
      VersionTerminos: payload.versionTerminos,
    })
    return mapLoginResponse(r.data.data || r.data)
  },

  /** Pre-chequeo de /acceso: ¿el correo/teléfono ya está registrado? (no manda OTP). */
  accesoVerificar: async (
    tipo: string,
    identificador: string,
  ): Promise<{ yaRegistrado: boolean; canal: string; mensaje?: string }> => {
    const r = await apiClient.post('/api/Auth/acceso/verificar', { Tipo: tipo, Identificador: identificador })
    return r.data.data || r.data
  },

  /** Opción B (acceso unificado): mete correo/teléfono → el backend decide si pedir contraseña o ya mandó un código. */
  accesoIniciar: async (
    tipo: string,
    identificador: string,
  ): Promise<{ accion: string; esNuevo: boolean; canal: string } | null> => {
    try {
      const r = await apiClient.post('/api/Auth/acceso/iniciar', { Tipo: tipo, Identificador: identificador })
      return r.data.data || r.data
    } catch (error: any) {
      throw new Error(apiError(error, 'No pudimos continuar. Revisa el dato.'))
    }
  },

  /** Auto-registro paso 1: pide el código. Si el contacto ya existe, relanza el error ("ya está en uso"). */
  signupSolicitar: async (tipo: string, identificador: string): Promise<void> => {
    try {
      await apiClient.post('/api/Auth/signup/solicitar', { Tipo: tipo, Identificador: identificador })
    } catch (error: any) {
      throw new Error(apiError(error, 'No pudimos enviar el código.'))
    }
  },

  /** Auto-registro paso 2: crea la cuenta + contraseña y devuelve la sesión (igual que login). */
  signupCompletar: async (payload: {
    tipo: string; identificador: string; codigo: string; nombre?: string
    apellido?: string; correo?: string; telefono?: string; nombreNegocio?: string; password?: string
    departamento?: string; distrito?: string
    codigoReferido?: string
    aceptaTerminos?: boolean; versionTerminos?: string   // Tarea 5
  }): Promise<LoginResponse | null> => {
    try {
      const response = await apiClient.post('/api/Auth/signup/completar', {
        Tipo: payload.tipo, Identificador: payload.identificador, Codigo: payload.codigo,
        Nombre: payload.nombre, Apellido: payload.apellido, Correo: payload.correo,
        Telefono: payload.telefono, NombreNegocio: payload.nombreNegocio, Password: payload.password,
        Departamento: payload.departamento, Distrito: payload.distrito,
        CodigoReferido: payload.codigoReferido,
        AceptaTerminos: payload.aceptaTerminos,
        VersionTerminos: payload.versionTerminos,
      })
      const responseData = response.data.data || response.data
      return mapLoginResponse(responseData)
    } catch (error: any) {
      throw new Error(apiError(error, 'No pudimos crear la cuenta.'))
    }
  },

  /**
   * SSO cross-subdominio: recupera la sesión SIN pedir credenciales.
   */
  bootstrapSession: async (): Promise<LoginResponse | null> => {
    try {
      const response = await apiClient.post('/api/Auth/refresh', {})
      const responseData = response.data.data || response.data

      const loginData = mapLoginResponse(responseData)
      if (!loginData) return null

      localStorage.setItem('token', loginData.token)
      localStorage.setItem('user', JSON.stringify(loginData.user))
      console.log('🔁 Sesión restaurada por SSO:', loginData.user.nombreCompleto)
      return loginData
    } catch {
      return null
    }
  },

  /** Crear / recuperar contraseña por OTP - paso 1: envía el enlace (correo o WhatsApp). */
  solicitarPassword: async (identificador: string): Promise<{ ok: boolean; mensaje?: string }> => {
    try {
      const r = await apiClient.post('/api/Auth/password/solicitar', { identificador })
      return { ok: true, mensaje: r.data?.mensaje }
    } catch (error: any) {
      return { ok: false, mensaje: apiError(error, 'No se pudo enviar el código.') }
    }
  },

  /** Crear / recuperar contraseña por OTP - paso 2: valida el código y fija la contraseña. */
  establecerPassword: async (
    identificador: string,
    codigo: string,
    passwordNueva: string,
  ): Promise<{ ok: boolean; mensaje?: string; token?: string; user?: any }> => {
    try {
      const r = await apiClient.post('/api/Auth/password/establecer', {
        identificador, codigo, passwordNueva,
      })
      // El backend ahora devuelve la sesión (auto-login): mapeamos token + user.
      const data = r.data?.data || r.data
      const login = mapLoginResponse(data, identificador)
      return { ok: true, mensaje: r.data?.mensaje, token: login?.token, user: login?.user }
    } catch (error: any) {
      return { ok: false, mensaje: apiError(error, 'No se pudo establecer la contraseña.') }
    }
  },

  /** Cambia la contraseña del usuario logueado (requiere la contraseña actual). */
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

  /** Ingreso tradicional: envía OTP al correo para confirmarlo al activar. */
  accesoEnviarOtp: async (correo: string): Promise<{ ok: boolean; mensaje?: string }> => {
    try {
      const r = await apiClient.post('/api/Auth/acceso/enviar-otp', { correo })
      return { ok: true, mensaje: r.data?.mensaje }
    } catch (error: any) {
      return { ok: false, mensaje: apiError(error, 'No se pudo enviar el código.') }
    }
  },

  /** Ingreso tradicional: activar (inline si el correo ya está confirmado; con codigo si no). */
  accesoActivar: async (
    correo: string,
    passwordNueva: string,
    codigo?: string,
  ): Promise<{ ok: boolean; mensaje?: string }> => {
    try {
      const r = await apiClient.post('/api/Auth/acceso/activar', { correo, passwordNueva, codigo })
      return { ok: true, mensaje: r.data?.mensaje }
    } catch (error: any) {
      return { ok: false, mensaje: apiError(error, 'No se pudo activar el ingreso tradicional.') }
    }
  },

  /** Ingreso tradicional: desactivar (conserva correo y contraseña). */
  accesoDesactivar: async (): Promise<{ ok: boolean; mensaje?: string }> => {
    try {
      const r = await apiClient.post('/api/Auth/acceso/desactivar', {})
      return { ok: true, mensaje: r.data?.mensaje }
    } catch (error: any) {
      return { ok: false, mensaje: apiError(error, 'No se pudo desactivar.') }
    }
  },

  /** Ingreso tradicional: reactivar con el correo y contraseña ya guardados. */
  accesoReactivar: async (): Promise<{ ok: boolean; mensaje?: string }> => {
    try {
      const r = await apiClient.post('/api/Auth/acceso/reactivar', {})
      return { ok: true, mensaje: r.data?.mensaje }
    } catch (error: any) {
      return { ok: false, mensaje: apiError(error, 'No se pudo reactivar.') }
    }
  },

  /** Obtener token del localStorage */
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

  /** Obtener usuario del localStorage */
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

  /** Guardar token en localStorage */
  saveToken: (token: string): void => {
    try {
      localStorage.setItem('token', token)
      console.log('✅ Token guardado en storage')
    } catch (error) {
      console.error('❌ Error guardando token:', error)
    }
  },

  /** Guardar usuario en localStorage */
  saveUser: (user: LoginUserData): void => {
    try {
      localStorage.setItem('user', JSON.stringify(user))
      console.log('✅ Usuario guardado en storage')
    } catch (error) {
      console.error('❌ Error guardando usuario:', error)
    }
  },

  /** Logout REAL: revoca sesión en BD + borra cookie bp_rt + limpia local. */
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

  /** Verificar si el usuario está autenticado */
  isAuthenticated: (): boolean => {
    const token = authService.getStoredToken()
    return !!token
  },
}