import { useState, useEffect, useTransition, useCallback, useContext, createContext, useRef, Suspense } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { X } from 'lucide-react'
import { House, Scissors, Users, Calendar, User, Clock, Gear, Wallet, Calculator, SealCheck, CreditCard, Globe, type Icon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { getActiveTenant } from '@/services/apiClient'
import { AdminHeader } from '@/components/AdminHeader'
import AvisoLocalesActivos from '@/components/AvisoLocalesActivos'
import { prefetchAdminPages } from '@/router/adminPages'
import { prefetchRouteData } from '@/lib/prefetch'
import s from '@/styles/AdminLayout.module.css'

/**
 * AdminShell — LAYOUT PERSISTENTE del panel admin.
 *
 * Se monta UNA sola vez (es el `element` de la ruta padre en App.tsx) y NO se
 * desmonta mientras el admin navega entre Dashboard, Clientes, Agenda, etc.
 * Las páginas se renderizan en el <Outlet/>; solo cambia el contenido, nunca
 * el riel lateral, el header (SedeSwitcher + AccountMenu), el footer móvil ni
 * el FAB de "Venta rápida". Eso elimina el parpadeo/reconstrucción visual.
 *
 * NAVEGACIÓN CON useTransition
 * ────────────────────────────
 * Los enlaces del riel y del footer NO navegan de forma síncrona: envuelven el
 * cambio de ruta en `startTransition`. Mientras el chunk/markup de la nueva
 * página se prepara, React MANTIENE la página anterior en pantalla en lugar de
 * mostrar el fallback de <Suspense>. Solo cuando la nueva está lista, hace el
 * swap. Durante ese lapso `isPending` es true y mostramos una barra de progreso
 * superior fina (estilo Vercel/Linear), sin sustituir el contenido.
 *
 * Con el prefetch de chunks, casi todas las navegaciones son instantáneas; la
 * transición actúa como red de seguridad para la primera visita a cada sección.
 */

type NavItem = { to: string; label: string; icon: Icon; end?: boolean }

/* Secciones del admin (orden del riel lateral en desktop) */
const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: House, end: true },
  { to: '/admin/servicios', label: 'Servicios', icon: Scissors },
  { to: '/admin/trabajadores', label: 'Equipo', icon: Users },
  { to: '/admin/agenda', label: 'Agenda', icon: Calendar },
  { to: '/admin/clientes', label: 'Clientes', icon: User },
  { to: '/admin/reservas', label: 'Reservas', icon: Clock },
  { to: '/admin/ventas', label: 'Ventas', icon: SealCheck },
  { to: '/admin/pagos', label: 'Pagos', icon: Wallet },
  { to: '/admin/caja', label: 'Caja', icon: Calculator },
  { to: '/admin/configuracion', label: 'Config', icon: Gear },
  { to: '/admin/mi-plan', label: 'Mi Plan', icon: CreditCard },
]

/* Menú móvil: las 11 secciones + "Mi Sitio" (se agrega en el render). */
const MENU_MOVIL = NAV

/** ¿La ruta `to` está activa respecto a la ubicación actual? */
function esActivo(to: string, pathname: string, end?: boolean) {
  return end ? pathname === to : pathname === to || pathname.startsWith(to + '/')
}

// ─────────────────────────────────────────────────────────────────────────────
// Contexto de navegación con transición. AdminShell provee `navTo`; los enlaces
// lo consumen. Se define a nivel de módulo para que <TNavLink> no se recree en
// cada render (evita remontajes innecesarios).
// ─────────────────────────────────────────────────────────────────────────────
const NavCtx = createContext<(to: string) => void>(() => {})

// Contexto de PREFETCH de datos: AdminShell provee la fn; los enlaces la disparan
// al hover/touch/focus para calentar la caché de la sección de destino.
const PrefetchCtx = createContext<(to: string) => void>(() => {})

type TNavLinkProps = {
  to: string
  end?: boolean
  className: (active: boolean) => string
  style?: React.CSSProperties
  children: React.ReactNode
}

/**
 * Enlace de navegación con transición. Es un <a> real (mantiene href para
 * accesibilidad, "abrir en pestaña nueva", hover de URL, etc.), pero en el clic
 * izquierdo simple intercepta y navega vía startTransition. Con modificadores
 * (Ctrl/Cmd/Shift/Alt) o clic medio deja que el navegador abra normalmente.
 */
function TNavLink({ to, end, className, style, children }: TNavLinkProps) {
  const location = useLocation()
  const navTo = useContext(NavCtx)
  const prefetch = useContext(PrefetchCtx)
  const warmed = useRef(false)
  const active = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(to + '/')

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navTo(to)
  }

  // Al primer hover/touch/focus calentamos los datos de la sección destino.
  // Solo una vez por enlace (prefetchQuery además respeta staleTime: barato).
  const onIntent = () => {
    if (warmed.current) return
    warmed.current = true
    prefetch(to)
  }

  return (
    <a
      href={to}
      onClick={onClick}
      onPointerEnter={onIntent}
      onTouchStart={onIntent}
      onFocus={onIntent}
      className={className(active)}
      style={style}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </a>
  )
}

/** Fallback discreto, confinado al área de contenido (no a pantalla completa). */
function ContentFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2855F6', borderRadius: '50%', animation: 'appspin .8s linear infinite' }} />
    </div>
  )
}

/** Barra de progreso superior (indeterminada). Solo se monta mientras isPending. */
function TopProgressBar() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 60,
        overflow: 'hidden', background: 'rgba(40,85,246,0.12)', pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%', width: '40%', borderRadius: 3,
          background: 'linear-gradient(90deg, #2855F6, #2092B4)',
          animation: 'adminNavProg 0.9s ease-in-out infinite',
        }}
      />
    </div>
  )
}

export function AdminShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Navegación no bloqueante: mantiene el contenido anterior hasta que el nuevo
  // está listo. Ignora navegar a la ruta en la que ya estamos.
  const navTo = useCallback(
    (to: string) => {
      if (to === location.pathname) return
      startTransition(() => navigate(to))
    },
    [navigate, location.pathname],
  )

  // Prefetch de datos de la sección destino (lo disparan los enlaces al hover/touch).
  const prefetch = useCallback((to: string) => prefetchRouteData(qc, to), [qc])

  // "Mi Sitio": abre el sitio público de la sede activa en otra pestaña.
  const goMiSitio = () => {
    setMenuOpen(false)
    const sub = getActiveTenant()
    const url = sub && window.location.hostname.endsWith('barber.pe') ? `https://${sub}.barber.pe` : '/'
    window.open(url, '_blank', 'noopener')
  }

  // Calienta los chunks de todas las páginas admin en cuanto el shell monta.
  useEffect(() => {
    prefetchAdminPages()
  }, [])

  return (
    <NavCtx.Provider value={navTo}>
      <PrefetchCtx.Provider value={prefetch}>
      {/* Keyframe local de la barra de progreso (evita tocar el CSS global). */}
      <style>{`@keyframes adminNavProg{0%{transform:translateX(-120%)}50%{transform:translateX(60%)}100%{transform:translateX(260%)}}`}</style>

      {isPending && <TopProgressBar />}

      <div className={s.shell}>
        {/* Riel lateral (desktop) — PERSISTENTE */}
        <aside className={s.rail}>
          <nav className={s.railNav}>
            {NAV.map((n) => {
              const active = esActivo(n.to, location.pathname, n.end)
              return (
                <TNavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={(a) => `${s.railItem} ${a ? s.railItemActive : ''}`}
                >
                  <n.icon size={22} weight={active ? 'fill' : 'regular'} />
                  <span className={s.railLabel}>{n.label}</span>
                </TNavLink>
              )
            })}
            <button type="button" className={s.railItem} onClick={goMiSitio} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Globe size={22} weight="regular" />
              <span className={s.railLabel}>Mi Sitio</span>
            </button>
          </nav>
        </aside>

        {/* Columna principal */}
        <div className={s.main}>
          {/* Header PERSISTENTE: SedeSwitcher + AccountMenu nunca se desmontan */}
          <AdminHeader onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
          <AvisoLocalesActivos />
          <main className={s.content}>
            {/* Solo el contenido (la página activa) se suspende/cambia */}
            <Suspense fallback={<ContentFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>

        {/* Modal del menú (mobile): 9 opciones, tiles de contorno con ícono + texto adentro */}
        {menuOpen && (
          <div className={s.menuOverlay} onClick={() => setMenuOpen(false)}>
            <div className={s.menuModal} onClick={(e) => e.stopPropagation()}>
              <div className={s.menuHead}>
                <div>
                  <div className={s.menuTitle}>Menú</div>
                  <div className={s.menuSub}>Todas las opciones</div>
                </div>
                <button type="button" aria-label="Cerrar" className={s.menuClose} onClick={() => setMenuOpen(false)}>
                  <X width={20} height={20} />
                </button>
              </div>
              <div className={s.menuGrid}>
                {MENU_MOVIL.map((n) => {
                  const active = esActivo(n.to, location.pathname, n.end)
                  return (
                    <button
                      key={n.to}
                      type="button"
                      className={`${s.menuTile} ${active ? s.menuTileActive : ''}`}
                      onClick={() => { setMenuOpen(false); navTo(n.to) }}
                    >
                      <n.icon size={24} weight={active ? 'fill' : 'regular'} />
                      <span className={s.menuTileLabel}>{n.label}</span>
                    </button>
                  )
                })}
                <button type="button" className={s.menuTile} onClick={goMiSitio}>
                  <Globe size={24} weight="regular" />
                  <span className={s.menuTileLabel}>Mi Sitio</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      </PrefetchCtx.Provider>
    </NavCtx.Provider>
  )
}
