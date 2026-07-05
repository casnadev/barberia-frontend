import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { TenantGate } from '@/components/TenantGate'
import { SedeActivaGate } from '@/components/Sedeactivagate'
import { ConfirmHost } from '@/components/ConfirmDialog'
import { AdminShell } from '@/components/AdminShell'
// Páginas del panel admin: lazy + prefetch centralizados (fuente única de verdad).
import {
  DashboardPage,
  ClientesPage,
  ServiciosPage,
  TrabajadoresPage,
  ReservasPage,
  AgendaPage,
  PagosPage,
  VentasPage,
  CierreCajaPage,
  ConfiguracionPage,
  MiPlanPage,
} from '@/router/adminPages'

// --- Resto de páginas con carga diferida (code-splitting) ---
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const AccesoPage = lazy(() => import('@/pages/AccesoPage').then(m => ({ default: m.AccesoPage })))
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })))
const ReservaClientePage = lazy(() => import('@/pages/cliente/ReservaClientePage').then(m => ({ default: m.ReservaClientePage })))
const ReservaAcciones = lazy(() => import('@/pages/cliente/ReservaAcciones').then(m => ({ default: m.ReservaAcciones })))
const PublicSedeDetailPage = lazy(() => import('@/pages/PublicSedeDetailPage').then(m => ({ default: m.PublicSedeDetailPage })))
const MarcaPortadaPage = lazy(() => import('@/pages/MarcaPortadaPage').then(m => ({ default: m.MarcaPortadaPage })))
const NovedadesSedePage = lazy(() => import('@/pages/NovedadesSedePage').then(m => ({ default: m.NovedadesSedePage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))
const TerminosPage = lazy(() => import('@/pages/legal/TerminosPage'))
const PrivacidadPage = lazy(() => import('@/pages/legal/PrivacidadPage'))
const LibroReclamacionesPage = lazy(() => import('@/pages/legal/LibroReclamacionesPage'))
const TrabajadorMiAgenda = lazy(() => import('@/pages/trabajador/TrabajadorMiAgenda').then(m => ({ default: m.TrabajadorMiAgenda })))
const CompletarPerfilAdmin = lazy(() => import('@/pages/CompletarPerfilAdmin').then(m => ({ default: m.CompletarPerfilAdmin })))
const VerificarCorreoPage = lazy(() => import('@/pages/VerificarCorreoPage').then(m => ({ default: m.VerificarCorreoPage })))
const LandingPage = lazy(() => import('@/pages/LandingPage'))

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE HOSTS
// ─────────────────────────────────────────────────────────────────────────────

// Host canónico del panel. Define VITE_PANEL_HOST=barber.pe en .env.production.
// Cuando está definido, CUALQUIER ruta de panel abierta desde un subdominio de
// sede (kisha.barber.pe/login, urban.barber.pe/dashboard, etc.) es redirigida
// aquí. La cookie SSO (.barber.pe) restaura la sesión sin pedir login de nuevo.
const PANEL_HOST = (import.meta.env.VITE_PANEL_HOST as string | undefined)?.trim() || ''

// Hosts que son el panel raíz (no micrositios de sede).
const ROOT_HOSTS = new Set(['localhost', '127.0.0.1', 'barber.pe', 'www.barber.pe', 'app.barber.pe', 'admin.barber.pe'])

// Etiquetas de subdominio reservadas para el panel (no son sedes).
const SUBS_RESERVADOS = new Set(['www', 'app', 'admin', 'api', 'panel'])

// Rutas que pertenecen al panel. Si se accede desde un subdominio de sede
// serán redirigidas al PANEL_HOST. Las rutas públicas (/, /reservar, /novedades,
// /confirmar/:token, etc.) NO están aquí y se muestran en el subdominio.
const RUTAS_PANEL = [
  '/login',
  '/dashboard',
  '/completar-perfil',
  '/super-admin',
  '/mi-agenda',
  '/admin/',
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Devuelve el subdominio de sede si el host actual es uno (ej. "kisha"). Null si es el panel raíz o IP. */
function getSubdominio(): string | null {
  const host = window.location.hostname
  if (ROOT_HOSTS.has(host)) return null
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null // IP LAN/dev
  const parts = host.split('.')
  if (parts.length >= 3) {
    const sub = parts[0]
    return SUBS_RESERVADOS.has(sub.toLowerCase()) ? null : sub
  }
  return null
}

/** ¿La ruta actual pertenece al panel (no al micrositio público)? */
function esRutaDePanel(): boolean {
  const path = window.location.pathname
  return RUTAS_PANEL.some(r => path === r || path.startsWith(r))
}

/**
 * Redirige al PANEL_HOST si:
 *  - PANEL_HOST está definido en el env
 *  - El host actual es un subdominio de sede (kisha.barber.pe)
 *  - La ruta actual es de panel (/login, /dashboard, /admin/*, etc.)
 *
 * Preserva pathname + search + hash para que el usuario llegue exactamente
 * a donde quería ir (ej. kisha.barber.pe/admin/agenda → barber.pe/admin/agenda).
 * Devuelve true si va a redirigir (para que el caller haga return null).
 */
function redirigirSiEsSubdominioPanel(): boolean {
  if (!PANEL_HOST) return false
  if (!window.location.hostname.endsWith('.barber.pe')) return false // no aplica fuera de producción
  if (getSubdominio() === null) return false // ya estamos en el host canónico
  if (!esRutaDePanel()) return false // ruta pública → no redirigir

  const destino = `https://${PANEL_HOST}${window.location.pathname}${window.location.search}${window.location.hash}`
  window.location.replace(destino)
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: PanelGuard
// Se monta UNA sola vez en la raíz del árbol y maneja la redirección global
// ANTES de que ninguna ruta de panel intente renderizar.
// ─────────────────────────────────────────────────────────────────────────────
function PanelGuard({ children }: { children: React.ReactNode }) {
  if (redirigirSiEsSubdominioPanel()) {
    // Spinner mínimo mientras el browser ejecuta el replace
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2855F6', borderRadius: '50%', animation: 'appspin .8s linear infinite' }} />
      </div>
    )
  }
  return <>{children}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: ProtectedRoute (para rutas STANDALONE: super-admin, completar-perfil,
// mi-agenda). Las rutas del panel admin usan <AdminProtected/> (ver abajo).
// ─────────────────────────────────────────────────────────────────────────────
function ProtectedRoute({ children, requiredRole, skipTenant }: any) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" />

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowedRoles.includes(user.rol) && user.rol !== 'SuperAdmin') {
      return <Navigate to="/login" />
    }
  }

  if (user.rol === 'Admin' && !skipTenant) {
    return <TenantGate>{children}</TenantGate>
  }

  return <>{children}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: AdminProtected (layout route para TODO el panel admin)
//
// Es el `element` de la ruta padre del grupo admin. Se monta UNA sola vez y
// envuelve al <AdminShell/> + páginas mediante <Outlet/>. Por eso:
//   • La validación de auth/rol ocurre una vez (no por página).
//   • TenantGate se ejecuta UNA sola vez por sesión (no parpadea en cada nav).
//   • El SedeActivaGate/shell no se reconstruyen al navegar.
//
// Mantiene exactamente la misma política que antes:
//   - Sin sesión → /login
//   - Rol distinto de Admin/SuperAdmin → /login
//   - TenantGate solo para Admin (el SuperAdmin no tiene tenant de empresa).
// ─────────────────────────────────────────────────────────────────────────────
function AdminProtected() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.rol !== 'Admin' && user.rol !== 'SuperAdmin') return <Navigate to="/login" replace />

  // El contenido del grupo admin se renderiza vía <Outlet/>.
  if (user.rol === 'Admin') {
    return (
      <TenantGate>
        <Outlet />
      </TenantGate>
    )
  }
  return <Outlet />
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE TENANT / SLUG (para el micrositio público)
// ─────────────────────────────────────────────────────────────────────────────
function getTenantSlug(): string | null {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('s')
    if (fromQuery && fromQuery.trim()) return fromQuery.trim()
  } catch { /* noop */ }
  return getSubdominio()
}

function HomeRoute() {
  const slug = getTenantSlug()
  return slug ? <TenantHome slug={slug} /> : <LandingPage />
}

/**
 * En un host de sede resuelve QUÉ mostrar:
 *  - si el slug corresponde a una MARCA (slug del nombre comercial) con locales
 *    públicos → portada de marca (lista de locales);
 *  - si no (es el subdominio de un local, ej. kisha-miraflores) → micrositio.
 * (Bloque A, Tanda 2.)
 */
function TenantHome({ slug }: { slug: string }) {
  const [modo, setModo] = useState<'cargando' | 'marca' | 'sede'>('cargando')
  useEffect(() => {
    let cancelado = false
    import('@/services/marcaService').then(({ marcaService }) =>
      marcaService.getPortada(slug).then((m) => {
        if (cancelado) return
        // Portada SOLO si hay 2+ Sedes públicas Y el slug NO es el subdominio de una
        // Sede concreta. Si entras por el link de una Sede (su subdominio coincide con
        // el slug), vas directo al micrositio — nunca a la portada. (Candado de routing.)
        const esLinkDeSede = !!m && m.sedes.some((x) => x.subdominio === slug)
        setModo(m && m.sedes.length >= 2 && !esLinkDeSede ? 'marca' : 'sede')
      }),
    )
    return () => { cancelado = true }
  }, [slug])

  if (modo === 'cargando') return <RouteFallback />
  return modo === 'marca' ? <MarcaPortadaPage slug={slug} /> : <PublicSedeDetailPage />
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK DE RUTA (solo para rutas PÚBLICAS lazy: landing, micrositio, etc.)
// El panel admin tiene su propio fallback de área de contenido en <AdminShell/>.
// ─────────────────────────────────────────────────────────────────────────────
function RouteFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1220' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#2092B4', borderRadius: '50%', animation: 'appspin .8s linear infinite' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────────────────
export function App() {
  const { setUser, setToken } = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    let cancelado = false

    const token = authService.getStoredToken()
    const user = authService.getStoredUser()

    if (token && user) {
      setToken(token)
      setUser(user)
      setIsInitialized(true)
      return
    }

    setIsInitialized(true)

    authService.bootstrapSession()
      .then((restaurada) => {
        if (restaurada && !cancelado) {
          setToken(restaurada.token)
          setUser(restaurada.user as any)
        }
      })
      .catch(() => { /* anónimo */ })

    return () => { cancelado = true }
  }, [setUser, setToken])

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      {/*
        PanelGuard envuelve TODO el árbol de rutas.
        Si detecta que estamos en un subdominio de sede (kisha.barber.pe)
        Y la ruta es de panel (/login, /dashboard, /admin/*, etc.)
        redirige inmediatamente a barber.pe/<misma-ruta>.
        Aplica a TODOS los admins y trabajadores, sin importar qué sede sea.
      */}
      <PanelGuard>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* LOGIN — ruta de panel, redirigida por PanelGuard si viene de subdominio */}
            <Route path="/login" element={<LoginPage />} />

            {/* HOME: landing en dominio raíz, micrositio en subdominio */}
            <Route path="/" element={<HomeRoute />} />

            {/* LANDING PÚBLICA - SEDE POR ID (legacy) */}
            <Route path="/sede/:idSede" element={<PublicSedeDetailPage />} />

            {/* PORTADA DE MARCA - lista los locales de una marca (Bloque A, Tanda 2) */}
            <Route path="/marca/:slugMarca" element={<MarcaPortadaPage />} />

            {/* NOVEDADES PÚBLICAS */}
            <Route path="/novedades" element={<NovedadesSedePage />} />

            {/* PÁGINAS LEGALES */}
            <Route path="/terminos" element={<TerminosPage />} />
            <Route path="/privacidad" element={<PrivacidadPage />} />
            <Route path="/libro-reclamaciones" element={<LibroReclamacionesPage />} />

            {/* RESERVAR PÚBLICA */}
            <Route path="/reservar/:idSede" element={<ReservaClientePage />} />
            <Route path="/acceso" element={<AccesoPage />} />
            <Route path="/reservar-publica" element={<ReservaClientePage />} />

            {/* SUPER ADMIN (standalone, sin shell admin) */}
            <Route path="/super-admin" element={
              <ProtectedRoute requiredRole="SuperAdmin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />

            {/* COMPLETAR PERFIL (standalone, skipTenant, sin shell admin) */}
            <Route path="/completar-perfil" element={
              <ProtectedRoute requiredRole="Admin" skipTenant>
                <CompletarPerfilAdmin />
              </ProtectedRoute>
            } />

            {/* ───────────────────────────────────────────────────────────────
                PANEL ADMIN — LAYOUT PERSISTENTE (rutas anidadas con <Outlet/>)

                AdminProtected: auth + rol + TenantGate (una sola vez).
                AdminShell:     sidebar + header + footer + FAB persistentes.
                Las páginas solo cambian dentro del <Outlet/> → sin parpadeo.

                Las rutas hijas usan paths RELATIVOS (sin "/" inicial). Como el
                padre no tiene `path`, se resuelven contra "/", produciendo las
                MISMAS URLs de siempre: /dashboard, /admin/clientes, etc.
            ─────────────────────────────────────────────────────────────── */}
            <Route element={<AdminProtected />}>
              <Route element={<AdminShell />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="admin/servicios" element={<ServiciosPage />} />
                <Route path="admin/trabajadores" element={<TrabajadoresPage />} />
                <Route path="admin/agenda" element={<AgendaPage />} />
                <Route path="admin/clientes" element={<ClientesPage />} />
                <Route path="admin/reservas" element={<ReservasPage />} />
                <Route path="admin/ventas" element={<VentasPage />} />
                <Route path="admin/pagos" element={<PagosPage />} />
                <Route path="admin/caja" element={<CierreCajaPage />} />
                <Route path="admin/configuracion" element={<ConfiguracionPage />} />
                <Route path="admin/mi-plan" element={<MiPlanPage />} />
              </Route>
            </Route>

            {/* TRABAJADOR (standalone) */}
            <Route path="/mi-agenda" element={
              <ProtectedRoute requiredRole="Trabajador">
                <SedeActivaGate><TrabajadorMiAgenda /></SedeActivaGate>
              </ProtectedRoute>
            } />

            {/* RUTAS PÚBLICAS - ACCIONES DE RESERVA */}
            <Route path="/reserva/:token" element={<ReservaAcciones />} />
            <Route path="/confirmar/:token" element={<ReservaAcciones />} />
            <Route path="/cancelar/:token" element={<ReservaAcciones />} />
            <Route path="/reprogramar/:token" element={<ReservaAcciones />} />
            <Route path="/calificar/:token" element={<ReservaAcciones />} />
            <Route path="/resena/:token" element={<ReservaAcciones />} />

            {/* Verificación de correo (Bloque 4) */}
            <Route path="/verificar-correo/:token" element={<VerificarCorreoPage />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </PanelGuard>
      <ConfirmHost />
    </BrowserRouter>
  )
}
