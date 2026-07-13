import { apiClient } from './apiClient'

// El tenant (sede) viaja en el header X-Tenant-Subdomain (lo inyecta apiClient),
// así que ningún endpoint necesita idSede.

export interface NivelFidel {
  idNivel?: number
  nombre: string
  puntosMinimos: number
  orden: number
  color?: string
}

export interface RecompensaFidel {
  idRecompensa?: number
  nombre: string
  descripcion?: string
  /** Emoji corto: 🎁 💈 🥤 🎂 🎟 */
  icono?: string
  puntosRequeridos: number
  /** null/undefined = stock ILIMITADO (∞). 0 = agotada. */
  stock?: number | null
  activo: boolean

  /**
   * T7 — Hasta dónde llega la recompensa.
   *   'Empresa' → vale en CUALQUIER sede de la marca. Stock COMPARTIDO.
   *   'Sede'    → solo en esta sede. Stock INDEPENDIENTE.
   *
   * El stock sale solo del modelo: una recompensa de marca es UNA fila (un stock);
   * una de sede es una fila por sede (un stock cada una). Sin lógica extra.
   */
  alcance: AlcanceFidel
}

/** T7 — Alcance de una recompensa. */
export type AlcanceFidel = 'Empresa' | 'Sede'

export interface PromocionFidel {
  idPromocion: number
  nombre: string
  /** Multiplicador de puntos (>= 1). Ej. 2 = doble puntaje. */
  multiplicador: number
  /** 0=domingo … 6=sábado. null = cualquier día. */
  diaSemana?: number | null
  fechaInicio?: string | null
  fechaFin?: string | null
  activo: boolean
  /** Calculado por el backend: si aplica hoy (hora Perú). */
  vigenteHoy?: boolean
}

/** Payload para crear/editar una promo (sin id ni vigenteHoy). */
export type GuardarPromocion = Omit<PromocionFidel, 'idPromocion' | 'vigenteHoy'>

export interface ProgramaConfig {
  activo: boolean
  solesPorPunto: number
  /** Multiplicador permanente de la MARCA (1 = sin multiplicar). */
  multiplicadorBase: number
  puntosExpiranMeses?: number | null

  /**
   * T7 — TOPE DURO del multiplicador final. Red de seguridad: con tres capas
   * configurables (marca, sede, promo) es cuestión de tiempo que alguien acabe
   * en x12 sin darse cuenta. Default 5.
   */
  multiplicadorMaximo: number

  /**
   * T7 — Multiplicador PROPIO de la sede actual. null = hereda el de la marca.
   * Es un OVERRIDE, no un MAX: una sede puede BAJAR por debajo del de la marca.
   */
  multiplicadorSede?: number | null

  /** T7 — false = esta sede tiene la acumulación pausada (no pierde puntos). */
  sedeActiva: boolean

  niveles: NivelFidel[]
  recompensas: RecompensaFidel[]
  /** Solo lectura aquí: las promos tienen su propio CRUD. */
  promociones?: PromocionFidel[]

  // ── Marca (solo lectura). Alimenta la vista previa de la tarjeta y el cartel del QR. ──
  nombreNegocio?: string | null
  logoNegocio?: string | null
  colorNegocio?: string | null
  /** PNG derivado que consume Google Wallet. null = aún no generado. */
  walletLogoUrl?: string | null
  /** Id de la LoyaltyClass de esta barbería. null = Wallet aún no activado. */
  walletClassId?: string | null
  /** Ruta pública del QR de inscripción del local: /unirme/{idSede}. */
  urlInscripcion?: string | null
}

/** Lo que se ENVÍA al guardar (el backend ignora los campos de solo lectura). */
export type GuardarProgramaConfig = Pick<
  ProgramaConfig,
  | 'activo'
  | 'solesPorPunto'
  | 'multiplicadorBase'
  | 'puntosExpiranMeses'
  | 'multiplicadorMaximo'   // T7 — tope (marca)
  | 'multiplicadorSede'     // T7 — override (sede)
  | 'sedeActiva'            // T7 — pausa local
  | 'niveles'
  | 'recompensas'
>

export interface PreviewPuntos {
  programaActivo: boolean
  puntos: number
  /** El multiplicador FINAL, ya topado. */
  multiplicador: number
  promocionAplicada?: string | null

  // ── T7 · DESGLOSE (vista previa en vivo) ──
  // Se devuelve el cálculo entero, no solo el número final, para que el Admin VEA
  // de dónde sale su multiplicador: "marca x1 · sede x2 · promo x2 = x4".
  multiplicadorMarca?: number
  /** Base EFECTIVO: el de la sede si lo tiene, si no el de la marca. */
  multiplicadorSede?: number
  multiplicadorPromo?: number
  multiplicadorMaximo?: number
  /** true = el cálculo superó el tope y se recortó. Hay que avisarlo. */
  topado?: boolean
}

export interface MovimientosPagina {
  items: MovimientoPuntos[]
  pagina: number
  tamanoPagina: number
  total: number
  hayMas: boolean
}

export interface MovimientoPuntos {
  fecha: string
  tipo: string
  puntos: number
  saldoResultante: number
  motivo?: string
}

export interface ProximaRecompensa {
  nombre: string
  puntosRequeridos: number
  puntosFaltantes: number
}

export interface Monedero {
  idMonedero: number
  idCliente: number
  nombreCliente?: string
  saldoPuntos: number
  puntosAcumHistorico: number
  nivelNombre?: string
  nivelColor?: string
  codigoQr: string
  proximaRecompensa?: ProximaRecompensa | null
  movimientos?: MovimientoPuntos[]
}

export interface RecompensaDisponible {
  idRecompensa: number
  nombre: string
  descripcion?: string
  icono?: string
  puntosRequeridos: number
  canjeable: boolean
  puntosFaltantes: number
  /** null = ilimitado. 0 = agotada. */
  stock?: number | null

  /** T7 — 'Empresa' | 'Sede'. */
  alcance?: AlcanceFidel
  /** T7 — sede exclusiva ("Solo en San Isidro"). null = vale en toda la marca. */
  nombreSedeExclusiva?: string | null
}

/** Resultado de generar el PNG del logo que exige Google Wallet. */
export interface WalletLogo {
  ok: boolean
  walletLogoUrl?: string | null
  motivo?: string | null
}

/** Alguien se acaba de inscribir escaneando el cartel del local. */
export interface InscripcionReciente {
  idCliente: number
  nombreCliente?: string | null
  telefono: string
  fechaInscripcion: string
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

export const fidelizacionService = {
  // --- Configuración (Admin) ---
  getConfig: async (): Promise<ProgramaConfig> => {
    const d = unwrap(await apiClient.get('/api/Fidelizacion/config'))
    return {
      activo: !!d?.activo,
      solesPorPunto: Number(d?.solesPorPunto ?? 1),
      multiplicadorBase: Number(d?.multiplicadorBase ?? 1),
      puntosExpiranMeses: d?.puntosExpiranMeses ?? null,
      // T7
      multiplicadorMaximo: Number(d?.multiplicadorMaximo ?? 5),
      multiplicadorSede: d?.multiplicadorSede ?? null,
      sedeActiva: d?.sedeActiva !== false,
      niveles: Array.isArray(d?.niveles) ? d.niveles : [],
      // T7 — sin alcance explícito (datos previos a la migración) → 'Sede', que es el
      // default conservador: nadie regala una recompensa en tres locales por accidente.
      recompensas: Array.isArray(d?.recompensas)
        ? d.recompensas.map((r: any) => ({ ...r, alcance: r?.alcance === 'Empresa' ? 'Empresa' : 'Sede' }))
        : [],
      promociones: Array.isArray(d?.promociones) ? d.promociones : [],
      nombreNegocio: d?.nombreNegocio ?? null,
      logoNegocio: d?.logoNegocio ?? null,
      colorNegocio: d?.colorNegocio ?? null,
      walletLogoUrl: d?.walletLogoUrl ?? null,
      walletClassId: d?.walletClassId ?? null,
      urlInscripcion: d?.urlInscripcion ?? null,
    }
  },
  guardarConfig: async (cfg: GuardarProgramaConfig): Promise<void> => {
    await apiClient.put('/api/Fidelizacion/config', cfg)
  },

  /**
   * Genera el PNG cuadrado derivado del logo (Google Wallet exige PNG; el logo
   * que sube el Admin se guarda en WebP). El original NO se toca.
   * Devuelve ok=false + motivo si el negocio todavía no tiene logo.
   */
  regenerarLogoWallet: async (): Promise<WalletLogo> => {
    const d = unwrap(await apiClient.post('/api/Fidelizacion/wallet/logo', {}))
    return { ok: !!d?.ok, walletLogoUrl: d?.walletLogoUrl ?? null, motivo: d?.motivo ?? null }
  },

  /** Inscripciones por QR del local en los últimos N minutos (aviso del panel). */
  inscripcionesRecientes: async (minutos = 60): Promise<InscripcionReciente[]> => {
    try {
      const d = unwrap(await apiClient.get(`/api/Fidelizacion/inscripciones-recientes?minutos=${minutos}`))
      return Array.isArray(d) ? d : []
    } catch { return [] }   // el aviso jamás puede romper el panel
  },

  // --- Monedero del cliente ---
  getMonedero: async (idCliente: number): Promise<Monedero | null> => {
    const d = unwrap(await apiClient.get(`/api/Fidelizacion/cliente/${idCliente}`))
    return d ?? null
  },
  getRecompensas: async (idCliente: number): Promise<RecompensaDisponible[]> => {
    const d = unwrap(await apiClient.get(`/api/Fidelizacion/cliente/${idCliente}/recompensas`))
    return Array.isArray(d) ? d : []
  },
  getPorQr: async (codigo: string): Promise<Monedero | null> => {
    const d = unwrap(await apiClient.get(`/api/Fidelizacion/qr/${encodeURIComponent(codigo)}`))
    return d ?? null
  },
  canjear: async (idCliente: number, idRecompensa: number): Promise<Monedero> => {
    const d = unwrap(await apiClient.post('/api/Fidelizacion/canjear', { idCliente, idRecompensa }))
    return d
  },

  // --- Promociones (Admin) ---
  getPromociones: async (): Promise<PromocionFidel[]> => {
    const d = unwrap(await apiClient.get('/api/Fidelizacion/promociones'))
    return Array.isArray(d) ? d : []
  },
  crearPromocion: async (p: GuardarPromocion): Promise<PromocionFidel> =>
    unwrap(await apiClient.post('/api/Fidelizacion/promociones', p)),
  actualizarPromocion: async (id: number, p: GuardarPromocion): Promise<PromocionFidel> =>
    unwrap(await apiClient.put(`/api/Fidelizacion/promociones/${id}`, p)),
  eliminarPromocion: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/Fidelizacion/promociones/${id}`)
  },

  // --- Aviso de puntos antes de cerrar la venta ---
  preview: async (total: number): Promise<PreviewPuntos | null> => {
    try {
      const d = unwrap(await apiClient.post('/api/Fidelizacion/preview', { total }))
      return d ?? null
    } catch { return null }   // nunca romper el flujo de venta por el aviso
  },

  // --- Historial completo paginado ---
  getMovimientos: async (idCliente: number, pagina = 1, tamanoPagina = 20): Promise<MovimientosPagina> => {
    const d = unwrap(await apiClient.get(
      `/api/Fidelizacion/cliente/${idCliente}/movimientos?pagina=${pagina}&tamanoPagina=${tamanoPagina}`))
    return {
      items: Array.isArray(d?.items) ? d.items : [],
      pagina: Number(d?.pagina ?? pagina),
      tamanoPagina: Number(d?.tamanoPagina ?? tamanoPagina),
      total: Number(d?.total ?? 0),
      hayMas: !!d?.hayMas,
    }
  },
}
