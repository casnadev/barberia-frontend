import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, LogIn, UserPlus, Settings, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getActiveTenant, buildImageUrl } from '@/services/apiClient'
import { miCuentaService } from '@/services/miCuentaService'
import { perfilService } from '@/services/perfilService'
import { panelTrabajadorService } from '@/services/panelTrabajadorService'
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

export function AccountMenu({ variant = 'floating', siteLink = false, onMiPerfil }: { variant?: 'floating' | 'plain'; siteLink?: boolean; onMiPerfil?: () => void }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
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
  const onLogout = () => { setOpen(false); logout(); navigate('/') }

  // "Ver sitio": abre la landing de la SEDE ACTIVA (la del dropdown).
  // Capturamos el subdominio AQUÍ (en el panel, donde es correcto) y lo
  // pasamos explícito por ?s=, para no depender de cómo la pestaña nueva
  // relea el tenant (que es lo que caía en "demo"/principal).
  const abrirSitio = () => {
    setOpen(false)
    const sub = getActiveTenant()
    window.open(sub ? (window.location.hostname.endsWith('barber.pe') ? `https://${sub}.barber.pe` : `/?s=${encodeURIComponent(sub)}`) : '/', '_blank', 'noopener')
  }

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
          ? <img src={buildImageUrl(user.urlFotoPerfil)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
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
                    <button className={s.item} onClick={() => { setOpen(false); onMiPerfil?.() }}>
                      <User className={s.itemIcon} width={18} height={18} /> Mi perfil
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
    </div>
  )
}
