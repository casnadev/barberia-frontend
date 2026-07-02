import { apiClient } from './apiClient'

export interface MiSede {
  idSede: number
  idEmpresa: number
  /** Nombre comercial de la marca (Empresa), para componer "Marca – Local". */
  nombreComercial?: string
  nombre: string
  subdominio: string
  estado?: boolean
  esPublica?: boolean
}

/** Capacidad de sedes de la empresa del admin logueado (para el botón + upsell). */
export interface CapacidadSedes {
  sedesActuales: number
  /** null = ilimitado. */
  limite: number | null
  puedeAgregar: boolean
}

/** Payload para que el propio Admin agregue un local. Subdominio/slug los pone el backend. */
export interface CrearLocalPayload {
  nombre: string
  departamento?: string
  provincia?: string
  distrito?: string
  direccion?: string
  latitud?: number
  longitud?: number
  /** Sede origen desde la que clonar. Null = catálogo por defecto. */
  idSedeOrigen?: number | null
  copiarServicios?: boolean
  copiarCategorias?: boolean
  copiarHorarios?: boolean
}

export interface SedeCreada {
  idSede: number
  nombre: string
  subdominio: string
  slug: string
}

export interface SedePublicacionItem {
  idSede: number
  nombre: string
  subdominio: string
  distrito?: string
  esPublica: boolean
}

export interface EstadoPublicacion {
  /** null = ilimitado. */
  limite: number | null
  publicasActuales: number
  totalSedes: number
  /** True si hay más públicas que el límite: el dueño debe elegir cuáles quedan. */
  requiereEleccion: boolean
  sedes: SedePublicacionItem[]
}

export const sedeTenantService = {
  /** Sedes de la empresa del admin logueado (resueltas por el JWT, sin tenant). */
  getMisSedes: async (): Promise<MiSede[]> => {
    const res = await apiClient.get('/api/Sedes/mias')
    const data = res.data.data ?? res.data
    return Array.isArray(data) ? data : []
  },

  /** Capacidad de sedes (cuántas hay, límite efectivo y si puede agregar otra). */
  getCapacidad: async (): Promise<CapacidadSedes> => {
    const res = await apiClient.get('/api/Sedes/capacidad')
    const d = res.data.data ?? res.data
    return {
      sedesActuales: Number(d?.sedesActuales ?? 0),
      limite: d?.limite == null ? null : Number(d.limite),
      puedeAgregar: !!d?.puedeAgregar,
    }
  },

  /** El propio Admin agrega un local a su empresa (self-service). */
  crearLocal: async (payload: CrearLocalPayload): Promise<SedeCreada> => {
    const res = await apiClient.post('/api/Sedes/agregar', {
      idEmpresa: 0, // el backend lo fuerza al de tu JWT; se manda por el [Required] del DTO
      nombre: payload.nombre,
      departamento: payload.departamento,
      provincia: payload.provincia,
      distrito: payload.distrito,
      direccion: payload.direccion,
      latitud: payload.latitud,
      longitud: payload.longitud,
      idSedeOrigen: payload.idSedeOrigen ?? null,
      copiarServicios: payload.copiarServicios ?? true,
      copiarCategorias: payload.copiarCategorias ?? true,
      copiarHorarios: payload.copiarHorarios ?? false,
    })
    const d = res.data.data ?? res.data
    return d as SedeCreada
  },

  /** Estado de publicación (soft-lock por downgrade): límite, públicas y si debe elegir. */
  getEstadoPublicacion: async (): Promise<EstadoPublicacion> => {
    const res = await apiClient.get('/api/Sedes/estado-publicacion')
    const d = res.data.data ?? res.data
    return {
      limite: d?.limite == null ? null : Number(d.limite),
      publicasActuales: Number(d?.publicasActuales ?? 0),
      totalSedes: Number(d?.totalSedes ?? 0),
      requiereEleccion: !!d?.requiereEleccion,
      sedes: Array.isArray(d?.sedes) ? d.sedes : [],
    }
  },

  /** Define qué locales quedan públicos (el resto pasa a no-público). */
  definirPublicas: async (idsPublicas: number[]): Promise<EstadoPublicacion> => {
    const res = await apiClient.put('/api/Sedes/publicas', { idsPublicas })
    const d = res.data.data ?? res.data
    return {
      limite: d?.limite == null ? null : Number(d.limite),
      publicasActuales: Number(d?.publicasActuales ?? 0),
      totalSedes: Number(d?.totalSedes ?? 0),
      requiereEleccion: !!d?.requiereEleccion,
      sedes: Array.isArray(d?.sedes) ? d.sedes : [],
    }
  },
}
