import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, LogIn, UserPlus, Settings, ExternalLink, LifeBuoy, KeyRound, CreditCard } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { urlMarca, buildImageUrl } from '@/services/apiClient'
import { sedeTenantService } from '@/services/sedeTenantService'
import { miCuentaService } from '@/services/miCuentaService'
import { perfilService } from '@/services/perfilService'
import { panelTrabajadorService } from '@/services/panelTrabajadorService'
import { MiPerfilAdminModal } from '@/components/MiPerfilAdminModal'   // ← NUEVO
import { AccesoModal } from '@/components/AccesoModal'
import { SoporteModal } from '@/components/SoporteModal'
import { useSoporteStore } from '@/store/soporteStore'
import s from '@/styles/AccountMenu.module.css'

/* Ruta del panel según el rol. */
const PANEL_POR_ROL: Record<string, string> = {
  SuperAdmin: '/super-admin',
  Admin: '/dashboard',
  Trabajador: '/mi-agenda',
}

const PanelIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
)


// Devuelve la URL canónica del panel para rutas como /login, /acceso.
// Si VITE_PANEL_HOST está definido y estamos en un subdominio de sede,
// usa https://barber.pe/<ruta>. En dev o en el host canónico, usa navigate() normal.
function panelUrl(path: string): string | null {
  const panelHost = (import.meta.env.VITE_PANEL_HOST as string | undefined)?.trim() || ''
  if (!panelHost) return null
  const canonical = ['barber.pe', 'www.barber.pe', 'app.barber.pe', 'admin.barber.pe', 'localhost', '127.0.0.1']
  if (canonical.includes(window.location.hostname)) return null
  if (!window.location.hostname.endsWith('.barber.pe')) return null
  return `https://${panelHost}${path}`
}

export function AccountMenu({ variant = 'floating', siteLink = false, onMiPerfil, onAcceso, navLinks }: { variant?: 'floating' | 'plain'; siteLink?: boolean; onMiPerfil?: () => void; onAcceso?: () => void; navLinks?: { label: string; onClick: () => void }[] }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  // ← NUEVO: modal de "Mi perfil" propio del menú. Se usa SOLO como respaldo
  //   cuando el padre no pasa `onMiPerfil` (ej. el micrositio público). En el
  //   dashboard, AdminHeader sigue pasando su propio onMiPerfil y este queda en false.
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [accesoOpen, setAccesoOpen] = useState(false)
  // Slug de marca (raíz pública) para "Ver sitio" de admin/trabajador. Los Cliente
  // no lo necesitan (su "Ver sitio" abre el marketplace barber.pe).
  const [marcaSlug, setMarcaSlug] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user || user.rol === 'Cliente') return
    let cancel = false
    sedeTenantService.getMisSedes()
      .then((ss) => { if (!cancel) setMarcaSlug(ss[0]?.slugMarca || '') })
      .catch(() => { /* silencioso */ })
    return () => { cancel = true }
  }, [user])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [open])

  // Resuelve la foto de perfil según el rol y la guarda en la sesión, para que
  // el avatar del header la muestre SIEMPRE que haya sesión (no solo en el
  // cliente). Solo se intenta una vez: undefined = aún no resuelto; null = sin
  // foto; string = ruta. Así el avatar refleja la foto de admin/trabajador/cliente.
  useEffect(() => {
    if (!user || user.urlFotoPerfil !== undefined) return
    let cancel = false
    ;(async () => {
      let foto: string | null = null
      try {
        if (user.rol === 'Cliente') foto = (await miCuentaService.getMiPerfil(user.id))?.urlFotoPerfil ?? null
        else if (user.rol === 'Trabajador') foto = (await panelTrabajadorService.getMiPerfil())?.urlFotoPerfil ?? null
        else if (user.rol === 'Admin') foto = (await perfilService.getMiPerfil())?.urlFotoPerfil ?? null
      } catch { foto = null }
      const u = useAuthStore.getState().user
      if (!cancel && u) useAuthStore.getState().setUser({ ...u, urlFotoPerfil: foto })
    })()
    return () => { cancel = true }
  }, [user?.id, user?.rol, user?.urlFotoPerfil])

  const go = (path: string) => { setOpen(false); navigate(path) }
  const onLogout = async () => {
    setOpen(false)
    // 1) Backend: revoca la sesión y borra la cookie SSO `bp_rt`. Sin esto, el
    //    logout es solo cosmético y el SSO te vuelve a loguear al recargar.
    await authService.logout()
    // 2) Limpia el estado local (store + localStorage + tenant + sessionStorage).
    logout()
    // 3) Si estamos en un subdominio de sede, volver al host canónico del panel
    //    para que el login de Google y el SSO funcionen correctamente.
    const logoutUrl = panelUrl('/login')
    if (logoutUrl) {
      window.location.replace(logoutUrl)
    } else {
      navigate('/')
    }
  }

  // ← NUEVO: "Mi perfil" robusto. Si el padre pasó onMiPerfil (dashboard), se usa
  //   ese (comportamiento de siempre). Si no (micrositio público), abrimos el
  //   modal montado aquí mismo, así "Mi perfil" funciona en cualquier subdominio.
  const abrirMiPerfil = () => {
    setOpen(false)
    if (onMiPerfil) onMiPerfil()
    else setPerfilOpen(true)
  }

  const abrirAcceso = () => {
    setOpen(false)
    if (onAcceso) onAcceso()
    else setAccesoOpen(true)
  }

  // "Ver sitio": para Cliente abre el sitio principal (barber.pe, el marketplace
  // de barberías). Para los demás roles, abre la landing de la SEDE ACTIVA.
  const abrirSitio = () => {
    setOpen(false)
    if (user?.rol === 'Cliente') {
      window.open(window.location.hostname.endsWith('barber.pe') ? 'https://barber.pe' : '/', '_blank', 'noopener')
      return
    }
    // No-Cliente (admin/trabajador): "Ver sitio" abre SIEMPRE la RAÍZ DE MARCA
    // (negocio.barber.pe), no el subdominio de la sede activa.
    window.open(marcaSlug ? urlMarca(marcaSlug) : '/', '_blank', 'noopener')
  }
  const abrirSoporte = () => { setOpen(false); useSoporteStore.getState().abrir() }


  return (
    <div className={s.root} ref={ref}>
      <button
        className={`${s.avatar} ${variant === 'plain' ? s.avatarPlain : s.avatarFloating} ${user ? s.avatarUser : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Cuenta"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user?.urlFotoPerfil
          ? <img src={buildImageUrl(user.urlFotoPerfil)} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          : <User width={20} height={20} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={s.dropdown}
            initial={{ opacity: 0, y: -8, scale: .98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: .98 }}
            transition={{ duration: .15 }}
          >
            <div className={s.menuInner}>
              {user ? (
                <>
                  <div className={s.head}>
                    <div className={s.avatarLg} style={{ overflow: 'hidden' }}>
                      {user.urlFotoPerfil
                        ? <img src={buildImageUrl(user.urlFotoPerfil)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <User width={22} height={22} />}
                    </div>
                    <div className={s.who}>
                      <p className={s.name}>{user.nombreCompleto}</p>
                      <p className={s.rol}>{user.rol}</p>
                    </div>
                  </div>
                  <div className={s.sep} />
                  {navLinks && navLinks.length > 0 && (
                    <div className={s.mobileNav}>
                      {navLinks.map((l) => (
                        <button key={l.label} className={s.item} onClick={() => { setOpen(false); l.onClick() }}>
                          {l.label}
                        </button>
                      ))}
                      <div className={s.sep} />
                    </div>
                  )}
                  <button className={s.item} onClick={() => go(PANEL_POR_ROL[user.rol] || '/')}>
                    <PanelIcon className={s.itemIcon} /> Mi panel
                  </button>
                  {user.rol === 'Admin' && (
                    <button className={s.item} onClick={abrirMiPerfil}>
                      <User className={s.itemIcon} width={18} height={18} /> Mi perfil
                    </button>
                  )}
                  <button className={s.item} onClick={abrirAcceso}>
                    <KeyRound className={s.itemIcon} width={18} height={18} /> Acceso
                  </button>
                  {user.rol === 'Trabajador' && (
                    <button className={s.item} onClick={() => go('/mi-agenda?config=1')}>
                      <Settings className={s.itemIcon} width={18} height={18} /> Configuración
                    </button>
                  )}
                  {user.rol === 'Admin' && (
                    <button className={s.item} onClick={abrirSoporte}>
                      <LifeBuoy className={s.itemIcon} width={18} height={18} /> Ayuda y soporte
                    </button>
                  )}
                  <div className={s.sep} />
                  <button className={`${s.item} ${s.danger}`} onClick={onLogout}>
                    <LogOut className={s.itemIcon} width={18} height={18} /> Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <p className={s.guestHint}>Inicia sesión para gestionar tus citas y tu cuenta.</p>
                  <button className={s.item} onClick={() => { setOpen(false); const u = panelUrl('/login'); u ? window.location.assign(u) : navigate('/login') }}>
                    <LogIn className={s.itemIcon} width={18} height={18} /> Iniciar sesión
                  </button>
                  <button className={`${s.item} ${s.primary}`} onClick={() => { setOpen(false); const u = panelUrl('/acceso'); u ? window.location.assign(u) : navigate('/acceso') }}>
                    <UserPlus className={s.itemIcon} width={18} height={18} /> Crear cuenta
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ← NUEVO: modal de "Mi perfil" como respaldo (micrositio). Solo Admin lo
          puede abrir; en el dashboard queda en false porque allí se usa onMiPerfil. */}
      {user?.rol === 'Admin' && (
        <MiPerfilAdminModal open={perfilOpen} onClose={() => setPerfilOpen(false)} />
      )}
      {user && (
        <AccesoModal open={accesoOpen} onClose={() => setAccesoOpen(false)} />
      )}

      {/* Modal de soporte (controlado por store). */}
      {user && <SoporteModal />}
    </div>
  )
}
