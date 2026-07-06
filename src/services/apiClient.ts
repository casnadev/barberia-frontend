import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.100.25:55692'

// Clave donde se persiste el subdominio del tenant activo.
const TENANT_KEY = 'tenant_subdomain'

// LINK ÚNICO: sede fijada por la portada de marca para quedarse en el mismo dominio
// del negocio (kisha.barber.pe) sin redirigir al subdominio de la sede. Runtime-only;
// se re-establece en cada carga desde la URL (/:sedeSlug). null por defecto = sin efecto.
let tenantOverride: string | null = null
export const setTenantOverride = (sub: string | null): void => {
  tenantOverride = sub && sub.trim() ? sub.trim().toLowerCase() : null
}
/** Sede fijada por el link único (o null). Las páginas públicas la priorizan
 *  sobre el subdominio del host, porque en el dominio de marca el host es la
 *  MARCA (kisha), no la sede. */
export const getTenantOverride = (): string | null => tenantOverride

const esLocalOLan = (host: string): boolean =>
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host.startsWith('192.168.') ||
  host.startsWith('10.') ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(host)

// Hostnames del PANEL: NO son subdominios de una sede. En estos, el tenant
// NO debe salir del host; se usa el que guardó setTenant (la sede activa del
// admin). Sin esto, en app.barber.pe el tenant se resolvía a "app" y rompía
// (TenantGate entraba en bucle de recarga).
const HOSTS_RESERVADOS = new Set(['www', 'app', 'admin', 'api', 'panel'])

// Intenta deducir el subdominio real desde el hostname (producción):
// nader.barber.pe -> "nader". Devuelve null en localhost/IP LAN, en hosts
// reservados del panel (app/admin/...) o cuando no hay un subdominio real.
const subdominioDesdeHost = (): string | null => {
  const host = window.location.hostname
  if (esLocalOLan(host)) return null
  const parts = host.split('.')
  if (parts.length < 3) return null
  const first = (parts[0] || '').toLowerCase()
  if (!first || HOSTS_RESERVADOS.has(first)) return null
  return first
}

/**
 * Subdominio indicado EXPLÍCITAMENTE en la URL por query param `?s=`.
 *
 * En producción cada sede vive en su propio subdominio
 * (sede-chongo.barber.pe), pero en desarrollo (localhost) no hay subdominios
 * reales, así que el microsite se abre con `/?s=<subdominio>`. Este valor es
 * la FUENTE DE VERDAD de la pestaña actual: cuando está presente debe ganarle
 * a cualquier cosa que haya quedado en localStorage (que es por origen y se
 * comparte entre pestañas, por eso un admin con la sede "demo" guardada hacía
 * que "Ver sitio" de otra sede leyera el tenant equivocado).
 *
 * Importante: NO se persiste en localStorage. Solo manda dentro de la pestaña
 * que lleva el `?s=`, de modo que la pestaña del panel del admin (sin `?s=`)
 * conserva intacto su propio tenant.
 */
export const tenantDesdeUrl = (): string | null => {
  try {
    const s = new URLSearchParams(window.location.search).get('s')
    if (s && s.trim()) return s.trim().toLowerCase()
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Subdominio del tenant ACTIVO. Orden de prioridad:
 *  1. ?s=<subdominio> en la URL         (microsite explícito; manda en su pestaña)
 *  2. subdominio real del hostname       (producción: nader.barber.pe)
 *  3. localStorage[tenant_subdomain]     (explícito; setTenant — sesión del panel)
 *  4. VITE_TENANT                        (.env, p.ej. dev local)
 *  5. 'demo'                             (último recurso)
 */
export const getActiveTenant = (): string => {
  // 1. ?s= en la URL (microsite explícito) — igual que antes
  const fromUrl = tenantDesdeUrl()
  if (fromUrl) return fromUrl

  // 1.b LINK ÚNICO: sede elegida en la portada de marca, quedándose en el MISMO
  //     dominio del negocio (sin redirigir). Se fija con setTenantOverride y por
  //     defecto es null → no altera ningún flujo existente.
  if (tenantOverride) return tenantOverride

  // 2. NUEVO: con sesión de admin, la sede elegida en el panel
  //    gana sobre el subdominio del host. Esto permite cambiar de
  //    sede sin importar en qué subdominio esté abierto el panel.
  const token = localStorage.getItem('token')
  const elegida = localStorage.getItem(TENANT_KEY)
  if (token && elegida && elegida.trim()) return elegida.trim().toLowerCase()

  // 3. Subdominio real del host (microsite público) — igual que antes
  const fromHost = subdominioDesdeHost()
  if (fromHost) return fromHost.toLowerCase()

  // 4. localStorage / 5. .env / 6. 'demo' — igual que antes
  try {
    const stored = localStorage.getItem(TENANT_KEY)
    if (stored && stored.trim()) return stored.trim().toLowerCase()
  } catch { /* ignore */ }
  const fromEnv = import.meta.env.VITE_TENANT
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim().toLowerCase()
  return 'demo'
}
/** Fija (y persiste) el subdominio del tenant activo. */
export const setTenant = (subdominio: string): void => {
  try {
    localStorage.setItem(TENANT_KEY, subdominio.trim().toLowerCase())
  } catch {
    /* ignore */
  }
}

/** Limpia el tenant persistido (p.ej. en logout). */
export const clearTenant = (): void => {
  try {
    localStorage.removeItem(TENANT_KEY)
  } catch {
    /* ignore */
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
})

apiClient.interceptors.request.use((config: any) => {
  if (!config.headers) {
    config.headers = {}
  }

  const token = localStorage.getItem('token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }

  // El tenant se RESUELVE EN CADA REQUEST (no se captura una sola vez al cargar
  // el módulo), de modo que si cambia (setTenant) aplica sin recargar.
  const tenant = getActiveTenant()
  config.headers['X-Tenant-Subdomain'] = tenant

  return config
})

// Comprime/convierte imágenes ANTES de subirlas (un solo punto para TODOS los
// uploads). HEIC de iPhone → JPEG, y fotos pesadas → ~0.7MB, así no fallan en
// datos móviles. Carga perezosa: el compresor (src/services/comprimirImagen)
// solo se descarga cuando de verdad subes una imagen.
apiClient.interceptors.request.use(async (config: any) => {
  const url: string = config.url || ''
  const data: any = config.data
  if (/upload/i.test(url) && typeof FormData !== 'undefined' && data instanceof FormData) {
    const esImagen = (f: File) => /^image\//i.test(f.type) || /\.(heic|heif)$/i.test(f.name)

    // Recolectamos con forEach (evita problemas de iteración en algunos tsconfig).
    const entradas: Array<[string, FormDataEntryValue]> = []
    data.forEach((v: FormDataEntryValue, k: string) => entradas.push([k, v]))

    if (entradas.some(([, v]) => v instanceof File && esImagen(v as File))) {
      const { comprimirImagen } = await import('@/services/comprimirImagen')
      const nueva = new FormData()
      for (const [k, v] of entradas) {
        if (v instanceof File && esImagen(v)) {
          nueva.append(k, await comprimirImagen(v))
        } else {
          nueva.append(k, v as any)
        }
      }
      config.data = nueva
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ Error:', error.message, error.response?.status, error.response?.data)
    const url: string = error.config?.url || ''
    const esAuth = /\/api\/auth\//i.test(url) || /\/api\/otp\//i.test(url)
    if (error.response?.status === 401 && !esAuth) {
      // Visitante PÚBLICO sin sesión: si no hay token, un 401 suelto (p.ej. una
      // llamada pública que devolvió 401 por error) NO debe mandarlo al login ni
      // recargar la página. Dejamos que la llamada falle en silencio y la vista
      // pública siga su curso con sus propios fallback (horarios/reseñas vacíos).
      const teniaSesion = !!localStorage.getItem('token')
      if (!teniaSesion) {
        return Promise.reject(error)
      }

      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // Redirigir al login en el host canónico del panel (si está definido) para
      // evitar que el 401 mande al login del subdominio de sede equivocado.
      const panelHost = (import.meta as any).env?.VITE_PANEL_HOST?.trim() || ''
      const esSede = window.location.hostname.endsWith('.barber.pe') &&
        !['barber.pe', 'www.barber.pe', 'app.barber.pe', 'admin.barber.pe'].includes(window.location.hostname)
      if (panelHost && esSede) {
        window.location.replace(`https://${panelHost}/login`)
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

/**
 * Construye la URL completa de una imagen a partir de una ruta.
 * - Absoluta (http/https) o data:/blob: -> se devuelve tal cual.
 * - Relativa (/uploads/...) -> se le antepone API_BASE_URL.
 */
export const buildImageUrl = (ruta?: string | null): string => {
  if (!ruta) return ''
  if (
    ruta.startsWith('http://') ||
    ruta.startsWith('https://') ||
    ruta.startsWith('data:') ||
    ruta.startsWith('blob:')
  ) {
    return ruta
  }
  return `${API_BASE_URL}${ruta.startsWith('/') ? '' : '/'}${ruta}`
}

export { API_BASE_URL }

/**
 * URL canónica del micrositio público de una sede.
 *  - Producción (host *.barber.pe): subdominio propio → https://<sub>.barber.pe
 *  - Dev/local (sin subdominios reales): se usa el query param ?s=<sub>
 * Mismo criterio que el "Ver sitio" del panel; centralizado aquí para reusar.
 */
export const urlMicrositio = (subdominio: string): string =>
  window.location.hostname.endsWith('barber.pe')
    ? `https://${subdominio}.barber.pe`
    : `/?s=${encodeURIComponent(subdominio)}`