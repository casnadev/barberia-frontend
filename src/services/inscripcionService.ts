import { apiClient } from './apiClient'
import type { NivelFidel, RecompensaFidel, MovimientoPuntos, RecompensaDisponible, ProximaRecompensa } from './fidelizacionService'

/**
 * ENTREGA 1 — Inscripción pública al programa de puntos.
 *
 * TODO ES ANÓNIMO: el cliente escanea el cartel del local con la cámara, sin app
 * y sin cuenta. Por eso la sede viaja en la RUTA, no en el header de tenant.
 *
 * Los DOS QR (no confundirlos):
 *   • QR del NEGOCIO  → cartel en el local, el MISMO para todos.
 *                       Apunta a /unirme/{idSede}. En cada escaneo abre la landing;
 *                       al enviarla se crea el Cliente REAL + su monedero.
 *   • QR del CLIENTE  → vive dentro de su monedero. Lo escanea el BARBERO en cada visita.
 */

export interface InscripcionInfo {
  idSede: number
  nombreNegocio: string
  logo?: string | null
  color?: string | null
  programaActivo: boolean
  solesPorPunto: number
  niveles: NivelFidel[]
  recompensas: RecompensaFidel[]
}

export interface InscripcionResultado {
  codigoQr: string
  /** true = ese teléfono ya estaba inscrito (no se duplica nada). */
  yaExistia: boolean
  urlMonedero: string
  /** Enlace "Guardar en Google Wallet". null mientras Wallet esté apagado (Entrega 2). */
  enlaceWallet?: string | null
}

export interface MonederoPublico {
  codigoQr: string
  nombreNegocio: string
  logo?: string | null
  color?: string | null
  nombreCliente?: string | null
  saldoPuntos: number
  puntosAcumHistorico: number
  nivelNombre?: string | null
  nivelColor?: string | null
  siguienteNivelNombre?: string | null
  puntosParaSiguienteNivel?: number | null
  proximaRecompensa?: ProximaRecompensa | null
  recompensas: RecompensaDisponible[]
  movimientos: MovimientoPuntos[]
  enlaceWallet?: string | null
}

/**
 * FASE 2 — Los tres casos del alta.
 * La seguridad es PROPORCIONAL AL RIESGO: solo se pide código cuando hay algo
 * que robar. El cliente nuevo entra en 30 segundos.
 */
export type CasoInscripcion =
  /** C — Nadie con ese teléfono ni ese correo. Sin OTP. */
  | 'Nuevo'
  /** A / T14 — Ese teléfono ya tiene ficha (con o sin tarjeta). OTP por WhatsApp. */
  | 'TelefonoExistente'
  /** B — Teléfono nuevo, pero ese correo ya reservó aquí. OTP por correo. */
  | 'CorreoExistente'

export interface EvaluacionInscripcion {
  caso: CasoInscripcion
  requiereOtp: boolean
  /** 'WhatsApp' | 'Email' | null */
  canalOtp?: string | null
  /** "•••••1931" / "pe•••@gmail.com" */
  destinoEnmascarado?: string | null
  /** true = ya tiene monedero aquí (es un RECLAMO de tarjeta, T14). */
  yaTieneTarjeta: boolean
  mensaje: string
}

/**
 * Desenvuelve la respuesta de la API.
 *
 * BUG QUE ESTO ARREGLA:
 *   antes era  `res?.data?.data ?? res?.data`
 *
 * Cuando el backend responde  { exito: true, data: null, mensaje: "..." }  —que es
 * lo que devuelve, por ejemplo, un cliente que TODAVÍA NO TIENE MONEDERO—, el
 * `??` veía `data === null` y caía al fallback… devolviendo EL SOBRE ENTERO.
 *
 * Así que `monedero` no era `null`: era `{ exito: true, data: null }`, que es
 * TRUTHY. El `if (!monedero)` no saltaba y la tarjeta se pintaba con todos los
 * campos vacíos: "Sin nivel", "· puntos disponibles", "Acumulado histórico: pts".
 *
 * Ahora se mira si el cuerpo TIENE la clave `data`. Si la tiene, se devuelve su
 * valor — aunque sea null. El fallback solo actúa con respuestas sin sobre.
 */
const unwrap = (res: any) => {
  const body = res?.data
  if (body && typeof body === 'object' && 'data' in body) return body.data
  return body
}

export const inscripcionService = {
  /** Datos públicos del programa de la sede (para pintar la landing de alta). */
  getInfo: async (idSede: number): Promise<InscripcionInfo | null> => {
    try {
      const d = unwrap(await apiClient.get(`/api/Inscripcion/${idSede}`))
      return d ?? null
    } catch { return null }
  },

  /**
   * Alta: nombre + celular (cumpleaños opcional).
   * Primero Cliente + Monedero; el botón de Google Wallet viene DESPUÉS.
   */
  inscribirse: async (
    idSede: number,
    datos: { nombreCompleto: string; telefono: string; correo?: string | null; fechaNacimiento?: string | null },
  ): Promise<InscripcionResultado> =>
    unwrap(await apiClient.post(`/api/Inscripcion/${idSede}`, {
      nombreCompleto: datos.nombreCompleto,
      telefono: datos.telefono,
      correo: datos.correo || null,
      fechaNacimiento: datos.fechaNacimiento || null,
    })),

  /**
   * PASO 1 — ¿En qué caso estoy? No crea nada y NO revela datos de nadie:
   * ni el nombre, ni los puntos. Eso llega DESPUÉS del código.
   */
  evaluar: async (
    idSede: number,
    datos: { nombreCompleto: string; telefono: string; correo?: string | null },
  ): Promise<EvaluacionInscripcion> =>
    unwrap(await apiClient.post(`/api/Inscripcion/${idSede}/evaluar`, {
      nombreCompleto: datos.nombreCompleto,
      telefono: datos.telefono,
      correo: datos.correo || null,
    })),

  /** PASO 2 — Que me manden el código (WhatsApp o correo, según el caso). */
  enviarOtp: async (
    idSede: number,
    datos: { telefono: string; correo?: string | null; caso: CasoInscripcion },
  ): Promise<void> => {
    await apiClient.post(`/api/Inscripcion/${idSede}/otp`, {
      telefono: datos.telefono,
      correo: datos.correo || null,
      caso: datos.caso,
    })
  },

  /**
   * PASO 3 — Validar el código y rematar.
   * Aquí vive T14: si ya tenía monedero, NO se crea otro — se emite el pase sobre
   * el que ya existía, con sus puntos intactos.
   */
  confirmar: async (
    idSede: number,
    datos: {
      nombreCompleto: string
      telefono: string
      correo?: string | null
      fechaNacimiento?: string | null
      caso: CasoInscripcion
      codigo: string
      /** Solo caso B: false = "esa reserva no es mía" → ficha nueva solo con teléfono. */
      vincularCorreo?: boolean
    },
  ): Promise<InscripcionResultado> =>
    unwrap(await apiClient.post(`/api/Inscripcion/${idSede}/confirmar`, {
      nombreCompleto: datos.nombreCompleto,
      telefono: datos.telefono,
      correo: datos.correo || null,
      fechaNacimiento: datos.fechaNacimiento || null,
      caso: datos.caso,
      codigo: datos.codigo,
      vincularCorreo: datos.vincularCorreo ?? true,
    })),

  /** Monedero web del cliente: funciona en cualquier teléfono, sin app y sin Wallet. */
  getMonedero: async (codigo: string): Promise<MonederoPublico | null> => {
    try {
      const d = unwrap(await apiClient.get(`/api/Inscripcion/monedero/${encodeURIComponent(codigo)}`))
      return d ?? null
    } catch { return null }
  },

  /**
   * T3 — El cliente corrige SU PROPIO nombre.
   *
   * Cierra el bug de identidad: quien reservó una vez como "Pepito XXX" arrastraba
   * ese nombre de por vida, porque el resolvedor solo pisaba el nombre si el anterior
   * era "basura". Esa regla protege al cliente del mostrador, pero no debe atraparlo
   * a él. El nombre es del cliente, no del negocio.
   *
   * Auth = posesión del código del QR, el mismo secreto que ya deja ver el saldo.
   */
  cambiarNombre: async (codigo: string, nombreCompleto: string): Promise<string> =>
    unwrap(
      await apiClient.put(
        `/api/Inscripcion/monedero/${encodeURIComponent(codigo)}/nombre`,
        { nombreCompleto },
      ),
    ),
}
