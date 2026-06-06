import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'        // ← + lazy, Suspense
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { TenantGate } from '@/components/TenantGate' // ← NUEVO (se queda eager)
import { ConfirmHost } from '@/components/ConfirmDialog' // ← se queda eager

// --- Páginas con carga diferida (code-splitting): cada una baja al entrar a su ruta ---
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ClientesPage = lazy(() => import('@/pages/admin/ClientesPage').then(m => ({ default: m.ClientesPage })))
const ReservasPage = lazy(() => import('@/pages/admin/ReservasPage').then(m => ({ default: m.ReservasPage })))
const AgendaPage = lazy(() => import('@/pages/admin/AgendaPage').then(m => ({ default: m.AgendaPage })))
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })))
const ReservaClientePage = lazy(() => import('@/pages/cliente/ReservaClientePage').then(m => ({ default: m.ReservaClientePage })))
const ReservaAcciones = lazy(() => import('@/pages/cliente/ReservaAcciones').then(m => ({ default: m.ReservaAcciones })))
const PublicSedeDetailPage = lazy(() => import('@/pages/PublicSedeDetailPage').then(m => ({ default: m.PublicSedeDetailPage })))
const NovedadesSedePage = lazy(() => import('@/pages/NovedadesSedePage').then(m => ({ default: m.NovedadesSedePage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))
const ServiciosPage = lazy(() => import('@/pages/admin/ServiciosPage').then(m => ({ default: m.ServiciosPage })))
const TrabajadoresPage = lazy(() => import('@/pages/admin/TrabajadoresPage').then(m => ({ default: m.TrabajadoresPage })))
const PagosPage = lazy(() => import('@/pages/admin/PagosPage').then(m => ({ default: m.PagosPage })))
const CierreCajaPage = lazy(() => import('@/pages/admin/CierreCaja').then(m => ({ default: m.CierreCajaPage })))
const ConfiguracionPage = lazy(() => import('@/pages/admin/ConfiguracionPage').then(m => ({ default: m.ConfiguracionPage })))
const TrabajadorMiAgenda = lazy(() => import('@/pages/trabajador/TrabajadorMiAgenda').then(m => ({ default: m.TrabajadorMiAgenda })))
const MiPerfilCliente = lazy(() => import('@/pages/cliente/MiPerfilCliente').then(m => ({ default: m.MiPerfilCliente })))
const CompletarPerfilAdmin = lazy(() => import('@/pages/CompletarPerfilAdmin').then(m => ({ default: m.CompletarPerfilAdmin })))
const LandingPage = lazy(() => import('@/pages/LandingPage')) // ← NUEVO (export default)

// Fallback mientras baja el chunk de cada página (mismo spinner del index.html)
function RouteFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1220' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#2092B4', borderRadius: '50%', animation: 'appspin .8s linear infinite' }} />
    </div>
  )
}

function ProtectedRoute({ children, requiredRole, skipTenant }: any) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" />

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowedRoles.includes(user.rol) && user.rol !== 'SuperAdmin') {
      return <Navigate to="/login" />
    }
  }

  // ← NUEVO: el Admin opera sobre una sede concreta (multi-sede).
  // TenantGate fija/valida el tenant y muestra el selector de sede.
  // skipTenant: pantallas que NO requieren sede (ej. completar perfil del primer login).
  if (user.rol === 'Admin' && !skipTenant) {
    return <TenantGate>{children}</TenantGate>
  }

  return <>{children}</>
}

// ← NUEVO: hosts del dominio raíz / panel donde se muestra la LANDING (no un microsite).
const ROOT_HOSTS = ['localhost', '127.0.0.1', 'barber.pe', 'www.barber.pe', 'app.barber.pe', 'admin.barber.pe']
// Etiquetas de subdominio reservadas para el panel (no son sedes).
const SUBS_RESERVADOS = ['www', 'app', 'admin', 'api', 'panel']

function getSubdominio(): string | null {
  const host = window.location.hostname
  if (ROOT_HOSTS.includes(host)) return null
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null // IP (LAN/dev) → sin subdominio
  const parts = host.split('.')
  if (parts.length >= 3) {
    const sub = parts[0]
    return SUBS_RESERVADOS.includes(sub.toLowerCase()) ? null : sub // elpatron.barber.pe → "elpatron"
  }
  return null
}

// Slug del tenant: prioriza ?s= (el "Ver sitio" del panel lo pasa explícito),
// y si no, el subdominio del host. Así, al abrir /?s=<sede> en el dominio raíz
// o IP, igual se muestra el microsite de la sede elegida (no la landing genérica).
function getTenantSlug(): string | null {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('s')
    if (fromQuery && fromQuery.trim()) return fromQuery.trim()
  } catch { /* noop */ }
  return getSubdominio()
}

// En el dominio raíz (sin sede) muestra la landing; con sede (?s= o subdominio),
// el microsite de la sede.
function HomeRoute() {
  return getTenantSlug() ? <PublicSedeDetailPage /> : <LandingPage />
}

export function App() {
  const { setUser, setToken } = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    try {
      console.log('🚀 Inicializando autenticación...')

      const token = authService.getStoredToken()
      const user = authService.getStoredUser()

      console.log('🔍 Token encontrado:', !!token)
      console.log('🔍 Usuario encontrado:', !!user)

      if (token && user) {
        console.log('✅ Restaurando sesión:', user.nombreCompleto)
        setToken(token)
        setUser(user)
      } else {
        console.log('⚠️ No hay sesión guardada')
      }
    } catch (error) {
      console.error('❌ Error inicializando auth:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setIsInitialized(true)
    }
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
      <Suspense fallback={<RouteFallback />}>            {/* ← envuelve las rutas */}
      <Routes>
        {/* LOGIN */}
        <Route path="/login" element={<LoginPage />} />

        {/* HOME: landing en el dominio raíz, microsite en subdominio ← CAMBIO */}
        <Route path="/" element={<HomeRoute />} />

        {/* LANDING PÚBLICA - SEDE POR ID (legacy) */}
        <Route path="/sede/:idSede" element={<PublicSedeDetailPage />} />

        {/* NOVEDADES PÚBLICAS (flyer + comentarios) */}
        <Route path="/novedades" element={<NovedadesSedePage />} />

        {/* RESERVAR PÚBLICA */}
        <Route path="/reservar/:idSede" element={<ReservaClientePage />} />
        <Route path="/reservar-publica" element={<ReservaClientePage />} />

        {/* SUPER ADMIN */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute requiredRole="SuperAdmin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="Admin">
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* ADMIN — completar / editar perfil (sin TenantGate: puede no tener sede aún) */}
        <Route
          path="/completar-perfil"
          element={
            <ProtectedRoute requiredRole="Admin" skipTenant>
              <CompletarPerfilAdmin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/clientes"
          element={
            <ProtectedRoute requiredRole="Admin">
              <ClientesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/servicios"
          element={
            <ProtectedRoute requiredRole="Admin">
              <ServiciosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/trabajadores"
          element={
            <ProtectedRoute requiredRole="Admin">
              <TrabajadoresPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pagos"
          element={
            <ProtectedRoute requiredRole="Admin">
              <PagosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/caja"
          element={
            <ProtectedRoute requiredRole="Admin">
              <CierreCajaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/configuracion"
          element={
            <ProtectedRoute requiredRole="Admin">
              <ConfiguracionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reservas"
          element={
            <ProtectedRoute requiredRole="Admin">
              <ReservasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/agenda"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AgendaPage />
            </ProtectedRoute>
          }
        />

        {/* TRABAJADOR */}
        <Route path="/mi-agenda" element={
          <ProtectedRoute requiredRole="Trabajador"><TrabajadorMiAgenda /></ProtectedRoute>
        } />

        {/* CLIENTE - PERFIL */}
        <Route path="/mi-perfil" element={
          <ProtectedRoute requiredRole="Cliente"><MiPerfilCliente /></ProtectedRoute>
        } />

        {/* CLIENTE LOGUEADO */}
        <Route
          path="/reservar"
          element={
            <ProtectedRoute requiredRole="Cliente">
              <ReservaClientePage />
            </ProtectedRoute>
          }
        />

        {/* RUTAS PÚBLICAS - ACCIONES DE RESERVA */}
        <Route path="/reserva/:token" element={<ReservaAcciones />} />
        <Route path="/confirmar/:token" element={<ReservaAcciones />} />
        <Route path="/cancelar/:token" element={<ReservaAcciones />} />
        <Route path="/reprogramar/:token" element={<ReservaAcciones />} />
        <Route path="/calificar/:token" element={<ReservaAcciones />} />
        <Route path="/resena/:token" element={<ReservaAcciones />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>                                         {/* ← cierra Suspense */}
      <ConfirmHost />
    </BrowserRouter>
  )
}
