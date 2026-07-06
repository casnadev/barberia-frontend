import { useState, useEffect, useTransition, useCallback, useContext, createContext, useRef, Suspense } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Home, Scissors, Users, Calendar, User, Clock, Settings, Wallet, Calculator, BadgeCheck, DollarSign, CreditCard, Menu, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { AdminHeader } from '@/components/AdminHeader'
import AvisoLocalesActivos from '@/components/AvisoLocalesActivos'
import { CobrarVentaModal } from '@/components/CobrarVentaModal'
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

type NavItem = { to: string; label: string; icon: typeof Home; color: string; end?: boolean }

/* Secciones del admin (orden del riel lateral en desktop) */
const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: Home, color: '#2563EB', end: true },
  { to: '/admin/servicios', label: 'Servicios', icon: Scissors, color: '#7C3AED' },
  { to: '/admin/trabajadores', label: 'Equipo', icon: Users, color: '#4F46E5' },
  { to: '/admin/agenda', label: 'Agenda', icon: Calendar, color: '#0EA5E9' },
  { to: '/admin/clientes', label: 'Clientes', icon: User, color: '#14B8A6' },
  { to: '/admin/reservas', label: 'Reservas', icon: Clock, color: '#16A34A' },
  { to: '/admin/ventas', label: 'Ventas', icon: BadgeCheck, color: '#F97316' },
  { to: '/admin/pagos', label: 'Pagos', icon: Wallet, color: '#F59E0B' },
  { to: '/admin/caja', label: 'Caja', icon: Calculator, color: '#E11D48' },
  { to: '/admin/configuracion', label: 'Config', icon: Settings, color: '#64748B' },
  { to: '/admin/mi-plan', label: 'Mi Plan', icon: CreditCard, color: '#D946EF' },
]

/* Menú móvil: las 9 operativas (Config y Mi Plan viven en el Account Menu). */
const MENU_MOVIL = NAV.filter((n) => n.to !== '/admin/configuracion' && n.to !== '/admin/mi-plan')

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
  const [cobrar, setCobrar] = useState(false)
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
            {NAV.map((n) => (
              <TNavLink
                key={n.to}
                to={n.to}
                end={n.end}
                style={{ '--ic': n.color } as React.CSSProperties}
                className={(active) => `${s.railItem} ${active ? s.railItemActive : ''}`}
              >
                <n.icon width={20} height={20} />
                <span className={s.railLabel}>{n.label}</span>
              </TNavLink>
            ))}
          </nav>
        </aside>

        {/* Columna principal */}
        <div className={s.main}>
          {/* Header PERSISTENTE: SedeSwitcher + AccountMenu nunca se desmontan */}
          <AdminHeader />
          <AvisoLocalesActivos />
          <main className={s.content}>
            {/* Solo el contenido (la página activa) se suspende/cambia */}
            <Suspense fallback={<ContentFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>

        {/* Footer (mobile): un solo botón "Menú" que abre el modal — PERSISTENTE */}
        <nav className={s.bottomBar}>
          <button type="button" className={s.menuBtn} onClick={() => setMenuOpen(true)}>
            <Menu width={20} height={20} /> Menú
          </button>
        </nav>

        {/* Modal del menú (mobile): 9 opciones en cuadrícula de color, centrado */}
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
                {MENU_MOVIL.map((n) => (
                  <button
                    key={n.to}
                    type="button"
                    className={s.menuTile}
                    onClick={() => { setMenuOpen(false); navTo(n.to) }}
                  >
                    <span className={s.menuTileIcon} style={{ background: n.color }}>
                      <n.icon width={25} height={25} />
                    </span>
                    <span className={s.menuTileLabel}>{n.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Venta rápida (walk-in) — FAB en móvil, botón en desktop. PERSISTENTE. */}
        <button
          onClick={() => setCobrar(true)}
          aria-label="Venta rápida"
          className="fixed right-4 md:right-6 bottom-[calc(88px+env(safe-area-inset-bottom))] md:bottom-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full md:rounded-2xl shadow-xl shadow-emerald-600/40 active:scale-95 transition flex items-center justify-center gap-2 w-14 h-14 md:w-auto md:h-auto md:px-5 md:py-3"
        >
          <DollarSign className="w-6 h-6 md:w-5 md:h-5" />
          <span className="hidden md:inline font-semibold">Venta rápida</span>
        </button>

        {cobrar && <CobrarVentaModal mode="admin" onClose={() => setCobrar(false)} onDone={() => setCobrar(false)} />}
      </div>
      </PrefetchCtx.Provider>
    </NavCtx.Provider>
  )
}
