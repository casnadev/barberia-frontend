import { apiClient } from './apiClient'
import type { LoginUserData } from './authService'

/**
 * Servicio del login unificado por PIN + dispositivo confiable.
 * Endpoints backend (todos AllowAnonymous):
 *   POST /api/Auth/enrolar/solicitar
 *   POST /api/Auth/enrolar/confirmar
 *   POST /api/Auth/pin/login
 *   POST /api/Auth/pin/recuperar/solicitar
 *   POST /api/Auth/pin/recuperar/confirmar
 *
 * Ya NO se envía tipoIdentidad: el backend deduce el rol a partir del
 * correo/teléfono (prioridad Admin -> Trabajador -> Cliente).
 *
 * IMPORTANTE: la cookie de dispositivo (bp_device) viaja gracias a
 * withCredentials:true en apiClient. El JWT se guarda en el store.
 */

export interface PinResult {
  ok: boolean
  codigo?: string          // p.ej. "DISPOSITIVO_NO_CONFIABLE"
  mensaje?: string
  token?: string
  user?: LoginUserData
  subdominio?: string       // sede del usuario (si el backend la devuelve)
}

/** Mapea la respuesta del backend (ApiResponse<LoginResponse>) al shape del store. */
function mapLogin(raw: any): PinResult {
  const d = raw?.data ?? raw
  if (!d?.token) return { ok: false, mensaje: 'Respuesta inválida del servidor.' }
  return {
    ok: true,
    token: d.token,
    subdominio: d.subdominio,
    user: {
      id: d.idUsuarioOCliente ?? d.id,
      correo: d.correo ?? '',
      rol: d.rol ?? 'Usuario',
      nombreCompleto: d.nombreCompleto ?? '',
      telefono: d.telefono,
      idEmpresa: d.idEmpresa,
      idSede: d.idSede,
      debeCambiarPassword: d.debeCambiarPassword,
    },
  }
}

function errorResult(error: any): PinResult {
  const data = error?.response?.data
  return {
    ok: false,
    codigo: data?.codigo,
    mensaje: data?.mensaje || data?.message || 'No se pudo completar la operación.',
  }
}

export const pinAuthService = {
  /** Paso 1 del enrolamiento: envía OTP (email o WhatsApp segun el identificador). */
  enrolarSolicitar: async (identificador: string): Promise<PinResult> => {
    try {
      const r = await apiClient.post('/api/Auth/enrolar/solicitar', { identificador })
      return { ok: true, mensaje: r.data?.mensaje }
    } catch (e) {
      return errorResult(e)
    }
  },

  /** Paso 2 del enrolamiento: valida OTP, crea el PIN, enrola el dispositivo y loguea. */
  enrolarConfirmar: async (
    identificador: string,
    codigo: string,
    pin: string,
    nombreDispositivo?: string,
  ): Promise<PinResult> => {
    try {
      const r = await apiClient.post('/api/Auth/enrolar/confirmar', {
        identificador, codigo, pin, nombreDispositivo: nombreDispositivo?.slice(0, 120),

      })
      return mapLogin(r.data)
    } catch (e) {
      return errorResult(e)
    }
  },

  /** Login diario: la cookie de dispositivo identifica al usuario, el PIN autentica. */
  pinLogin: async (pin: string): Promise<PinResult> => {
    try {
      const r = await apiClient.post('/api/Auth/pin/login', { pin })
      return mapLogin(r.data)
    } catch (e) {
      return errorResult(e)   // si codigo === 'DISPOSITIVO_NO_CONFIABLE' -> hay que enrolar
    }
  },

  /** Olvide mi PIN - paso 1. */
  recuperarSolicitar: async (identificador: string): Promise<PinResult> => {
    try {
      const r = await apiClient.post('/api/Auth/pin/recuperar/solicitar', { identificador })
      return { ok: true, mensaje: r.data?.mensaje }
    } catch (e) {
      return errorResult(e)
    }
  },

  /** Olvide mi PIN - paso 2. */
  recuperarConfirmar: async (
    identificador: string,
    codigo: string,
    pinNuevo: string,
  ): Promise<PinResult> => {
    try {
      const r = await apiClient.post('/api/Auth/pin/recuperar/confirmar', {
        identificador, codigo, pinNuevo,
      })
      return { ok: true, mensaje: r.data?.mensaje }
    } catch (e) {
      return errorResult(e)
    }
  },
}