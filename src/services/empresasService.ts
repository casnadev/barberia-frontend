import { apiClient } from './apiClient'

export interface Empresa {
  id: number
  razonSocial: string
  nombreComercial: string
  ruc: string
  correoContacto: string
  telefonoContacto: string
  totalSedes?: number
  /** Color de marca de la empresa (acento visual en el panel). */
  colorPrimarioHex?: string | null
  /** Subdominio de la sede pública principal (para "Ver sitio"). */
  subdominioPrincipal?: string | null
  /** Fecha de alta (creación de la empresa). ISO. */
  fechaCreacion?: string
  /** Override manual del límite de sedes (SuperAdmin). Null = usar el plan. */
  limiteSedesOverride?: number | null
  planActual?: string
  fechaFinPlan?: string
  /** True si la empresa está pausada (sin sedes activas). El público no la ve. */
  pausada?: boolean
  /** Dueño incrustado por el backend (evita pedir admins uno por uno). */
  owner?: Admin | null
}

export interface Admin {
  id: number
  correo?: string
  telefono?: string
  nombreCompleto: string
  rol: string
  estado?: boolean
  metodoLogin?: string        // 'OTP' (PIN) | 'Password'
  debeCambiarPassword?: boolean
}

/**
 * Alta de Admin "estilo Fresha": se crea con correo O teléfono (al menos uno),
 * SIN contraseña → el Admin entra por OTP/PIN. El nombre es opcional
 * (si se omite, el backend usa el nombre del negocio como pre-asignado).
 */
export interface CreateAdminDTO {
  nombreCompleto?: string
  correo?: string
  telefono?: string
  password?: string                 // opcional; normalmente vacío
  forzarCambioPassword?: boolean
}

export type CanalAcceso = 'Email' | 'WhatsApp'

export interface CreateSedeDTO {
  idEmpresa: number
  nombre: string
  subdominio: string
  slug: string
  direccion: string
  departamento: string
  provincia: string
  distrito: string
  latitud: number
  longitud: number
  telefono: string
  whatsappContacto: string
  correoContacto: string
  urlLogo?: string
  urlBanner?: string
  colorPrimarioHex?: string
  descripcionCorta?: string
  zonaHoraria?: string
  moneda?: string
  /** Si es true, al crear la sede el backend da de alta al dueño como trabajador. */
  crearTrabajadorDueno?: boolean
}

export interface SedeAdmin {
  idSede: number
  idEmpresa: number
  nombre: string
  subdominio?: string
  slug?: string
  direccion?: string
  departamento?: string
  provincia?: string
  distrito?: string
  telefono?: string
  whatsappContacto?: string
  correoContacto?: string
  urlLogo?: string
  urlBanner?: string
  colorPrimarioHex?: string
  descripcionCorta?: string
  estado?: boolean
  esPublica?: boolean
}

export interface UpdateSedeDTO {
  nombre?: string
  direccion?: string
  departamento?: string
  provincia?: string
  distrito?: string
  latitud?: number
  longitud?: number
  telefono?: string
  whatsappContacto?: string
  correoContacto?: string
  urlLogo?: string
  urlBanner?: string
  colorPrimarioHex?: string
  descripcionCorta?: string
  estado?: boolean
  esPublica?: boolean
}

export interface Plan {
  idPlan: number
  nombre: string
  descripcion?: string
  precioMensualPEN: number
  limiteSedes: number
  limiteTrabajadores: number
  permiteWhatsApp: boolean
  permiteReportes: boolean
}

/**
 * Quita del payload los campos vacíos ('') o nulos antes de enviarlos.
 * El backend valida formato (EmailAddress, RUC, etc.) y un string vacío NO
 * pasa esas validaciones (daba 400). Omitiéndolos llegan como null y se aceptan.
 * Conserva 0, false y demás valores válidos.
 */
const limpiar = <T extends Record<string, any>>(o: T): Record<string, any> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null))

export const empresasService = {
  // ===== Empresas =====
  getEmpresas: async (): Promise<Empresa[]> => {
    const res = await apiClient.get('/api/superadmin/empresas')
    const data = res.data.data || []
    return data.map((e: any) => ({
      ...e,
      id: e.id ?? e.idEmpresa,
      // El dueño viene incrustado; normalizamos su id igual que en getAdminsEmpresa.
      owner: e.owner ? { ...e.owner, id: e.owner.id ?? e.owner.idUsuario } : null,
    }))
  },

  createEmpresa: async (data: {
    razonSocial: string
    nombreComercial: string
    ruc: string
    correoContacto: string
    telefonoContacto: string
  }): Promise<Empresa> => {
    const res = await apiClient.post('/api/superadmin/empresas', limpiar(data))
    const e = res.data.data
    return { ...e, id: e.id ?? e.idEmpresa }
  },

  /**
   * Elimina una empresa. Si está vacía (0 sedes y 0 usuarios) la purga;
   * si tiene datos la archiva (soft-delete en cascada). El backend decide.
   * Devuelve el ApiResponse para mostrar su mensaje.
   */
  deleteEmpresa: async (idEmpresa: number) => {
    const res = await apiClient.delete(`/api/superadmin/empresas/${idEmpresa}`)
    return res.data
  },

  // ===== Admin (dueño) =====
  getAdminsEmpresa: async (idEmpresa: number): Promise<Admin[]> => {
    const res = await apiClient.get(`/api/superadmin/empresas/${idEmpresa}/admin`)
    const data = res.data.data || []
    return data.map((a: any) => ({ ...a, id: a.id ?? a.idUsuario }))
  },

  createAdminEmpresa: async (idEmpresa: number, data: CreateAdminDTO): Promise<Admin> => {
    const res = await apiClient.post(`/api/superadmin/empresas/${idEmpresa}/admin`, limpiar(data))
    const a = res.data.data
    return { ...a, id: a.id ?? a.idUsuario }
  },

  /** Envía el código de acceso (OTP) al Admin por correo o WhatsApp para que cree su PIN. */
  darAcceso: async (idUsuario: number, canal: CanalAcceso) => {
    const res = await apiClient.post(`/api/superadmin/usuarios/${idUsuario}/dar-acceso`, { canal })
    return res.data
  },

  setUsuarioEstado: async (idUsuario: number, activo: boolean) => {
    const res = await apiClient.patch(`/api/superadmin/usuarios/${idUsuario}/estado`, { activo })
    return res.data
  },

  /** Pausa/reactiva la barbería: apaga/prende TODAS sus sedes (no toca el login del dueño). */
  setEmpresaEstado: async (idEmpresa: number, activa: boolean) => {
    const res = await apiClient.patch(`/api/superadmin/empresas/${idEmpresa}/estado`, { activo: activa })
    return res.data
  },

  /**
   * Override del límite de sedes de una empresa ("a gusto" del SuperAdmin).
   * limite = número (tope), 0 (ninguna), -1 (ilimitado) o null (limpiar → usar el plan).
   */
  setLimiteSedesOverride: async (idEmpresa: number, limite: number | null) => {
    const res = await apiClient.put(`/api/superadmin/empresas/${idEmpresa}/limite-sedes`, {
      limiteSedesOverride: limite,
    })
    return res.data
  },

  resetPasswordAdmin: async (idUsuario: number, nuevaPassword: string) => {
    const res = await apiClient.post(`/api/superadmin/usuarios/${idUsuario}/reset-password`, {
      nuevaPassword,
    })
    return res.data.data ?? res.data
  },

  // ===== Sedes =====
  createSede: async (data: CreateSedeDTO) => {
    const res = await apiClient.post('/api/Sedes', limpiar(data))
    return res.data.data
  },

  getSedes: async (idEmpresa?: number): Promise<SedeAdmin[]> => {
    const res = await apiClient.get('/api/Sedes', { params: idEmpresa ? { idEmpresa } : {} })
    const data = res.data.data ?? res.data
    return Array.isArray(data) ? data : []
  },

  getSede: async (idSede: number): Promise<SedeAdmin> => {
    const res = await apiClient.get(`/api/Sedes/${idSede}`)
    return res.data.data ?? res.data
  },

  updateSede: async (idSede: number, data: UpdateSedeDTO): Promise<SedeAdmin> => {
    const res = await apiClient.put(`/api/Sedes/${idSede}`, limpiar(data))
    return res.data.data ?? res.data
  },

  deleteSede: async (idSede: number) => {
    const res = await apiClient.delete(`/api/Sedes/${idSede}`)
    return res.data
  },

  /**
   * Cambia el SLUG público de una sede (negocio.barber.pe/{slug}). Solo SuperAdmin.
   * NO toca el subdominio interno. Rompe los enlaces/QR con el slug anterior.
   */
  cambiarSlugSede: async (idSede: number, slug: string) => {
    const res = await apiClient.patch(`/api/superadmin/sedes/${idSede}/slug`, { slug })
    return res.data.data ?? res.data
  },

  // ===== Planes / Suscripción =====
  getPlanes: async (): Promise<Plan[]> => {
    const res = await apiClient.get('/api/superadmin/planes')
    return res.data.data || []
  },

  /** Asigna/renueva el plan. El backend lo deja en estado Activa de inmediato. */
  asignarSuscripcion: async (idEmpresa: number, idPlan: number, fechaFin?: string | null) => {
    const res = await apiClient.post(`/api/superadmin/empresas/${idEmpresa}/suscripcion`, {
      idPlan,
      fechaFin: fechaFin ?? null,
    })
    return res.data.data ?? res.data
  },
}