import { apiClient } from './apiClient'

export interface SedeDeMarca {
  idSede: number
  nombreComercial: string
  /** Slug canónico de la marca (raíz pública). Espejo de MarcaPublica.slugMarca. */
  slugMarca?: string
  /** Slug de la sede (= distrito). Para navegar a /{slug} sin salir del dominio. */
  slug?: string
  nombre: string
  subdominio: string
  direccion?: string
  distrito?: string
  departamento?: string
  urlLogo?: string
  urlBanner?: string
  colorPrimarioHex?: string
  descripcionCorta?: string
}

export interface MarcaPublica {
  nombreComercial: string
  slugMarca: string
  sedes: SedeDeMarca[]
}

export const marcaService = {
  /** Portada de una marca por su slug: nombre + locales públicos. Null si no existe. */
  getPortada: async (slugMarca: string): Promise<MarcaPublica | null> => {
    try {
      const res = await apiClient.get(`/api/marca/${encodeURIComponent(slugMarca)}/sedes`)
      const d = res.data?.data ?? res.data
      return d || null
    } catch {
      return null
    }
  },
}
