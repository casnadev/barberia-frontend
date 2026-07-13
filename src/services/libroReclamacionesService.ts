import { apiClient } from './apiClient'

/**
 * T8 — LIBRO DE RECLAMACIONES **DEL NEGOCIO**.
 *
 * El proveedor frente a Indecopi es la barbería, no barber.pe. Antes, este formulario
 * posteaba a `/api/libro-reclamaciones` (un endpoint que NO EXISTÍA), caía a un
 * `mailto:` hardcodeado al correo de barber.pe, y la hoja llevaba impresa la razón
 * social y el RUC de barber.pe. Ahora la hoja es del negocio y le llega al negocio.
 */

const unwrap = (res: any) => res?.data?.data ?? res?.data

/** Datos del proveedor (la barbería) para la cabecera de la hoja. */
export interface ProveedorReclamacion {
  idSede: number
  /** Nombre que el cliente reconoce ("Shanell Salón – Miraflores"). */
  nombreVisible: string
  /** Razón social. Es lo que exige la ley, no el nombre comercial. */
  razonSocial: string
  ruc?: string | null
  direccion?: string | null
  correoContacto?: string | null
  telefonoContacto?: string | null
  /**
   * false = al negocio le falta razón social o RUC.
   *
   * Sin proveedor plenamente identificado, la hoja NO VALE. En ese caso hay que
   * avisar, no dejar que la persona rellene un documento inválido creyendo que ha
   * reclamado. Mentirle sobre eso es peor que no tener formulario.
   */
  datosCompletos: boolean
}

export interface CrearHoja {
  nombre: string
  tipoDoc: string
  numDoc: string
  domicilio?: string
  telefono?: string
  correo: string
  esMenorDeEdad: boolean
  tutorNombre?: string
  /** 'Reclamo' (el servicio) | 'Queja' (la atención). No son lo mismo. */
  tipo: 'Reclamo' | 'Queja'
  bien: 'Producto' | 'Servicio'
  monto?: number | null
  descripcion: string
  detalle: string
  pedido?: string
}

export interface HojaCreada {
  numero: string
  fechaLimiteRespuesta: string
  razonSocial: string
  ruc?: string | null
}

/** Una hoja en la bandeja del negocio. */
export interface HojaReclamacion {
  idHoja: number
  numero: string
  tipo: string
  bien: string
  estado: 'Pendiente' | 'Respondida'
  fechaCreacion: string
  fechaLimiteRespuesta: string
  consumidorNombre: string
  consumidorCorreo: string
  consumidorTelefono?: string | null
  consumidorDoc: string
  monto?: number | null
  descripcion: string
  detalle: string
  pedido?: string | null
  respuesta?: string | null
  fechaRespuesta?: string | null
}

export const libroReclamacionesService = {
  // ── Público (el consumidor) ──
  getProveedor: (idSede: number): Promise<ProveedorReclamacion> =>
    apiClient.get(`/api/LibroReclamaciones/sede/${idSede}`).then(unwrap),

  registrar: (idSede: number, datos: CrearHoja): Promise<HojaCreada> =>
    apiClient.post(`/api/LibroReclamaciones/sede/${idSede}`, datos).then(unwrap),

  // ── El negocio (su bandeja) ──
  listar: (estado?: string): Promise<HojaReclamacion[]> =>
    apiClient
      .get('/api/LibroReclamaciones', { params: estado ? { estado } : undefined })
      .then((r) => unwrap(r) ?? []),

  responder: (idHoja: number, respuesta: string): Promise<void> =>
    apiClient.put(`/api/LibroReclamaciones/${idHoja}/responder`, { respuesta }).then(() => undefined),
}
