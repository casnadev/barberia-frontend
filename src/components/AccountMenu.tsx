import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, LogIn, UserPlus, Settings, ExternalLink, LifeBuoy, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { getActiveTenant, buildImageUrl } from '@/services/apiClient'
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
  Cliente: '/mi-perfil',
}

const PanelIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
)

export function AccountMenu({ variant = 'floating', siteLink = false, onMiPerfil, onAcceso }: { variant?: 'floating' | 'plain'; siteLink?: boolean; onMiPerfil?: () => void; onAcceso?: () => void }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  // ← NUEVO: modal de "Mi perfil" propio del menú. Se usa SOLO como respaldo
  //   cuando el padre no pasa `onMiPerfil` (ej. el micrositio público). En el
  //   dashboard, AdminHeader sigue pasando su propio onMiPerfil y este queda en false.
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [accesoOpen, setAccesoOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
    navigate('/')
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

  // "Ver sitio": abre la landing de la SEDE ACTIVA (la del dropdown).
  // Capturamos el subdominio AQUÍ (en el panel, donde es correcto) y lo
  // pasamos explícito por ?s=, para no depender de cómo la pestaña nueva
  // relea el tenant (que es lo que caía en "demo"/principal).
  const abrirSitio = () => {
    setOpen(false)
    const sub = getActiveTenant()
    window.open(sub ? (window.location.hostname.endsWith('barber.pe') ? `https://${sub}.barber.pe` : `/?s=${encodeURIComponent(sub)}`) : '/', '_blank', 'noopener')
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
                  <button className={s.item} onClick={() => go(PANEL_POR_ROL[user.rol] || '/')}>
                    <PanelIcon className={s.itemIcon} /> Mi panel
                  </button>
                  {user.rol === 'Admin' && (
                    <button className={s.item} onClick={abrirMiPerfil}>
                      <User className={s.itemIcon} width={18} height={18} /> Mi perfil
                    </button>
                  )}
                  {user.rol === 'Admin' && (
                    <button className={s.item} onClick={abrirAcceso}>
                      <KeyRound className={s.itemIcon} width={18} height={18} /> Acceso
                    </button>
                  )}
                  {user.rol === 'Admin' && (
                    <button className={s.item} onClick={() => go('/admin/configuracion')}>
                      <Settings className={s.itemIcon} width={18} height={18} /> Configuración
                    </button>
                  )}
                  {user.rol === 'Cliente' && (
                    <button className={s.item} onClick={() => go('/mi-perfil?config=1')}>
                      <Settings className={s.itemIcon} width={18} height={18} /> Configuración
                    </button>
                  )}
                  {user.rol === 'Trabajador' && (
                    <button className={s.item} onClick={() => go('/mi-agenda?config=1')}>
                      <Settings className={s.itemIcon} width={18} height={18} /> Configuración
                    </button>
                  )}
                  <button className={s.item} onClick={abrirSoporte}>
                    <LifeBuoy className={s.itemIcon} width={18} height={18} /> Ayuda y soporte
                  </button>
                  {siteLink && (
                    <button className={s.item} onClick={abrirSitio}>
                      <ExternalLink className={s.itemIcon} width={18} height={18} /> Ver sitio
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
                  <button className={s.item} onClick={() => go('/login')}>
                    <LogIn className={s.itemIcon} width={18} height={18} /> Iniciar sesión
                  </button>
                  <button className={`${s.item} ${s.primary}`} onClick={() => go('/login')}>
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
        <>
          <MiPerfilAdminModal open={perfilOpen} onClose={() => setPerfilOpen(false)} />
          <AccesoModal open={accesoOpen} onClose={() => setAccesoOpen(false)} />
        </>
      )}

      {/* Modal de soporte (controlado por store). */}
      {user && <SoporteModal />}
    </div>
  )
}
