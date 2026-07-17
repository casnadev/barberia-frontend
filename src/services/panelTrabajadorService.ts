import { apiClient } from './apiClient'

/* ---- tipos ---- */
export interface MisComisiones {
  idTrabajador: number
  nombreTrabajador?: string
  comisionesTotalCalculado: number
  comisionesTotalPagado: number
  comisionesTotalPendiente: number
  cantidadDetallesPendientes: number
}
export interface DisponibilidadDia { diaSemana: number; horaInicio: string; horaFin: string }
export interface DescansoTrabajador {
  idDescanso: number
  idTrabajador: number
  idSede: number
  fechaInicio: string
  fechaFin: string
  tipo: string
  motivo: string
  estaAprobado: boolean
  estado?: 'Pendiente' | 'Aprobada' | 'Rechazada'
  motivoRechazo?: string | null
  efecto?: 'Bloqueo' | 'Disponible'
  horaInicio?: string | null
  horaFin?: string | null
}
export interface CrearDescansoTrabajador {
  idTrabajador: number
  fechaInicio: string
  fechaFin: string
  tipo: string
  motivo: string
  efecto?: 'Bloqueo' | 'Disponible'
  horaInicio?: string | null
  horaFin?: string | null
}
export interface PagoTrabajador {
  idPago: number
  fechaPago: string
  montoPagado: number
  metodoPago: string
  observacion?: string | null
  rutaImagenEvidencia?: string | null
  nombreUsuarioRegistra?: string
}
export interface ResenaTrabajador {
  idCalificacion: number
  idReserva: number
  nombreCliente?: string | null
  puntuacion: number
  comentario?: string | null
  fechaCreacion: string
}
export interface MiPerfilTrabajador {
  idTrabajador: number
  idSede: number
  subdominio?: string
  /** Zona/distrito del local. */
  nombreSede?: string
  /** T1 — la MARCA. La identidad del negocio, no la sede. */
  nombreComercial?: string | null
  /** ≥2 → "Marca – Sede". 1 → solo la marca. */
  totalSedesPublicasMarca?: number
  nombreCompleto?: string
  correo?: string
  telefono?: string
  especialidad?: string
  experiencia?: string
  descripcion?: string
  urlFotoPerfil?: string
  porcentajeComision?: number
  generaLiquidaciones?: boolean
  frecuenciaPago?: string
  metodoPagoPreferido?: string
  tipoRemuneracion?: string
  montoPagoFijo?: number | null
  correoConfirmado?: boolean
  telefonoConfirmado?: boolean
}
export interface HorarioSede { diaSemana: number; horaInicio: string; horaFin: string; estaActivo: boolean }
export interface AtenderPayload { metodoPago?: string; numeroOperacion?: string; rutaImagenEvidencia?: string }

/**
 * Desenvuelve la respuesta de la API.
 *
 * Antes:  `res?.data?.data ?? res?.data`
 *
 * Cuando el backend responde { exito: true, data: null }, el `??` veía
 * `data === null` y caía al fallback… devolviendo EL SOBRE ENTERO. El llamador
 * recibía `{exito:true, data:null}` —que es TRUTHY— en vez de `null`, y pintaba
 * la pantalla con todos los campos vacíos.
 *
 * Ahora: si el cuerpo TIENE la clave `data`, se devuelve su valor aunque sea null.
 * El fallback solo actúa con respuestas sin sobre.
 */
const unwrap = (res: any) => {
  const body = res?.data
  if (body && typeof body === 'object' && 'data' in body) return body.data
  return body
}

export const panelTrabajadorService = {
  /** El trabajador da de baja su propia cuenta (soft-delete; libera correo/teléfono). */
  darmeDeBaja: async () => {
    const res = await apiClient.post('/api/Trabajadores/darme-de-baja', {})
    return res.data
  },
  /** Resumen de comisiones del propio trabajador. Devuelve también su idTrabajador. */
  getMisComisiones: async (): Promise<MisComisiones | null> => {
    try { return unwrap(await apiClient.get('/api/Pagos/mis-comisiones')) || null }
    catch (e: any) { console.error('getMisComisiones', e.response?.status); return null }
  },

  getDisponibilidad: async (idTrabajador: number): Promise<DisponibilidadDia[]> => {
    try { const d = unwrap(await apiClient.get(`/api/Trabajadores/${idTrabajador}/disponibilidad`)); return Array.isArray(d) ? d : [] }
    catch { return [] }
  },

  guardarDisponibilidad: async (idTrabajador: number, dias: DisponibilidadDia[]) => {
    const res = await apiClient.put(`/api/Trabajadores/${idTrabajador}/disponibilidad`, { dias })
    return unwrap(res)
  },

  getMisPagos: async (idTrabajador: number): Promise<PagoTrabajador[]> => {
    try { const d = unwrap(await apiClient.get(`/api/Pagos/trabajador/${idTrabajador}`)); return Array.isArray(d) ? d : [] }
    catch { return [] }
  },

  getMisResenas: async (idTrabajador: number): Promise<ResenaTrabajador[]> => {
    try { const d = unwrap(await apiClient.get(`/api/Clientes/calificaciones/trabajador/${idTrabajador}`)); return Array.isArray(d) ? d : [] }
    catch { return [] }
  },

  /** Marca atendida + (opcional) método de pago, nº operación y evidencia. */
  atender: async (idReserva: number, payload: AtenderPayload) => {
    const res = await apiClient.post(`/api/Reservas/${idReserva}/atender`, {
      metodoPago: payload.metodoPago || undefined,
      numeroOperacion: payload.numeroOperacion?.trim() || undefined,
      rutaImagenEvidencia: payload.rutaImagenEvidencia || undefined,
    })
    return unwrap(res)
  },

  /** Sube la imagen de evidencia y devuelve su URL pública. */
  subirEvidencia: async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('Archivo', file)
    const res = await apiClient.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    const data = unwrap(res)
    return data?.url || data?.Url || ''
  },

  getMiPerfil: async (): Promise<MiPerfilTrabajador | null> => {
    try { return unwrap(await apiClient.get('/api/Trabajadores/mi-perfil')) || null } catch { return null }
  },

  actualizarMiPerfil: async (body: { nombreCompleto?: string; correo?: string; telefono?: string; especialidad?: string; experiencia?: string; descripcion?: string; urlFotoPerfil?: string }) => {
    const res = await apiClient.put('/api/Trabajadores/mi-perfil', body)
    return unwrap(res)
  },

  /** Horarios de atención de la sede (para restringir la disponibilidad). */
  getHorariosSede: async (idSede: number): Promise<HorarioSede[]> => {
    try { const d = unwrap(await apiClient.get(`/api/Horarios/sede/${idSede}`)); return Array.isArray(d) ? d : [] }
    catch { return [] }
  },

  /** Reprograma una reserva (staff, por id). */
  reprogramar: async (idReserva: number, payload: { idTrabajador: number; fechaReserva: string; horaInicio: string }) => {
    const res = await apiClient.put(`/api/Reservas/${idReserva}/reprogramar`, payload)
    return unwrap(res)
  },

  /* ---- No disponibilidad / Descansos (DescansoTrabajador) ----
     El trabajador SOLICITA un descanso (queda pendiente de aprobación del admin).
     Solo los descansos aprobados bloquean reservas en la agenda. */
  getDescansos: async (idTrabajador: number): Promise<DescansoTrabajador[]> => {
    try { const d = unwrap(await apiClient.get(`/api/Descanos/trabajador/${idTrabajador}`)); return Array.isArray(d) ? d : [] }
    catch { return [] }
  },
  solicitarDescanso: async (idSede: number, body: CrearDescansoTrabajador): Promise<DescansoTrabajador | null> => {
    const res = await apiClient.post(`/api/Descanos/trabajador/${idSede}`, body)
    return unwrap(res)
  },
  eliminarDescanso: async (idDescanso: number) => {
    const res = await apiClient.delete(`/api/Descanos/${idDescanso}`)
    return unwrap(res)
  },
}