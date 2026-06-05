import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { ClientesPage } from '@/pages/admin/ClientesPage'
import { ReservasPage } from '@/pages/admin/ReservasPage'
import { AgendaPage } from '@/pages/admin/AgendaPage'
import { SuperAdminDashboard } from '@/pages/SuperAdminDashboard'
import { ReservaClientePage } from '@/pages/cliente/ReservaClientePage'
import { ReservaAcciones } from '@/pages/cliente/ReservaAcciones'
import { PublicSedeDetailPage } from '@/pages/PublicSedeDetailPage'
import { NovedadesSedePage } from '@/pages/NovedadesSedePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ServiciosPage } from '@/pages/admin/ServiciosPage'
import { TrabajadoresPage } from '@/pages/admin/TrabajadoresPage'
import { PagosPage } from '@/pages/admin/PagosPage'
import { CierreCajaPage } from '@/pages/admin/CierreCaja'
import { ConfiguracionPage } from '@/pages/admin/ConfiguracionPage'
import { TenantGate } from '@/components/TenantGate' // ← NUEVO
import { TrabajadorMiAgenda } from '@/pages/trabajador/TrabajadorMiAgenda'
import { MiPerfilCliente } from '@/pages/cliente/MiPerfilCliente'
import { CompletarPerfilAdmin } from '@/pages/CompletarPerfilAdmin'
import { ConfirmHost } from '@/components/ConfirmDialog'
import LandingPage from '@/pages/LandingPage' // ← NUEVO (export default)

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

// ← NUEVO: hosts del dominio raíz donde se muestra la LANDING (no un microsite).
//   Ajusta a tu dominio real cuando lo tengas (p. ej. agrega 'barber.pe', 'www.barber.pe').
const ROOT_HOSTS = ['localhost', '127.0.0.1', 'barber.pe', 'www.barber.pe']

function getSubdominio(): string | null {
  const host = window.location.hostname
  if (ROOT_HOSTS.includes(host)) return null
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null // IP (LAN/dev) → sin subdominio
  const parts = host.split('.')
  if (parts.length >= 3) {
    const sub = parts[0]
    return sub === 'www' ? null : sub // elpatron.barber.pe → "elpatron"
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
      <ConfirmHost />
    </BrowserRouter>
  )
}