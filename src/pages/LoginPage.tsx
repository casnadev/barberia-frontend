import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, ShieldCheck, Key as KeyRound, PaperPlaneRight as Send, CircleNotch as Loader2, SignIn as LogIn, Eye, EyeSlash as EyeOff, SealCheck as MailCheck, ChatCircle as MessageCircle } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { setTenant, clearTenant } from '@/services/apiClient'
import { clearMisSedesCache } from '@/services/sedeTenantService'
import { sedeTenantService } from '@/services/sedeTenantService'

// Vistas del login. Tras retirar PIN y login-OTP, el ingreso es:
//   - 'tradicional'    → correo/teléfono + contraseña  (+ botón Google)
//   - 'recover-pass-id'→ "Olvidé mi contraseña": pide el correo/teléfono
//   - 'sent'           → "revisa tu correo/WhatsApp" (el enlace lleva el código)
//   - 'set-password'   → ingresar código + nueva contraseña
type View = 'tradicional' | 'recover-pass-id' | 'set-password' | 'sent'

export function LoginPage() {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()

  const [view, setView] = useState<View>('tradicional')
  const [loading, setLoading] = useState(false)

  const [identificador, setIdentificador] = useState('')
  const [codigo, setCodigo] = useState('')

  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')

  const [nuevaPass, setNuevaPass] = useState('')
  const [repitePass, setRepitePass] = useState('')

  // Google Sign-In. Si no hay VITE_GOOGLE_CLIENT_ID en el .env, el botón no
  // aparece (no rompe nada).
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // ----------------------------------------------------------- routing
  const entrar = async (token: string, user: any, subdominio?: string) => {
    // Sesión nueva: descarta cualquier tenant/sedes de una cuenta anterior para
    // no arrastrar el 403 cross-tenant al cambiar de usuario.
    clearMisSedesCache()
    setToken(token); setUser(user)
    if (user.rol === 'SuperAdmin') clearTenant()
    else if (subdominio) setTenant(subdominio)
    else if (user.rol === 'Admin' || user.rol === 'Trabajador') {
      // Pre-resuelve el tenant para que "Mi panel" abra sin fricción. Si aún no
      // tiene sede (admin recién creado), no pasa nada: queda sin tenant.
      // Con timeout corto: en móvil lento NO debe colgar el login. Si tarda,
      // redirige igual y la sede se resuelve dentro del panel.
      clearTenant()   // arranca sin tenant → getMisSedes no viaja con sede ajena
      try {
        const sedes = await Promise.race([
          sedeTenantService.getMisSedesCached(),
          new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 4000)),
        ])
        if (sedes[0]?.subdominio) setTenant(sedes[0].subdominio)
      } catch { /* sin sede aun */ }
    }
    // Tras login exitoso, redirigir siempre al host canónico del panel.
    // Si el usuario inició sesión desde kisha.barber.pe/login (lo que ya no
    // debería pasar gracias a PanelGuard, pero por seguridad lo cubrimos aquí
    // también), lo mandamos a barber.pe/<ruta-de-panel> y no al micrositio.
    const panelHost = (import.meta.env.VITE_PANEL_HOST as string | undefined)?.trim() || ''
    const esSede = window.location.hostname.endsWith('.barber.pe') &&
      !['barber.pe', 'www.barber.pe', 'app.barber.pe', 'admin.barber.pe'].includes(window.location.hostname)
    const rutaPanel =
      user.rol === 'SuperAdmin' ? '/super-admin'
      : user.rol === 'Trabajador' ? '/mi-agenda'
      : user.rol === 'Admin' ? '/dashboard'
      : '/'
    if (panelHost && esSede && rutaPanel !== '/') {
      window.location.replace(`https://${panelHost}${rutaPanel}`)
    } else {
      navigate(rutaPanel)
    }
  }

  // ----------------------------------------------------------- deep-link del correo
  // El botón del correo abre /login?acceso=password&id=<correo/tel>&code=<otp>
  // → caemos directo en "Tu contraseña" con el contacto y el código precargados.
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const acceso = searchParams.get('acceso')
    if (acceso !== 'password') return
    const id = searchParams.get('id')
    const code = searchParams.get('code')
    if (id) setIdentificador(id)
    if (code) setCodigo(code)
    setView('set-password')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----------------------------------------------------------- crear/recuperar contraseña
  const enviarCodigoPassword = async () => {
    if (!identificador.trim()) { toast.error('Ingresa tu correo o teléfono.'); return }
    setLoading(true)
    const r = await authService.solicitarPassword(identificador.trim())
    setLoading(false)
    if (!r.ok) {
      // No registrado / inválido: se avisa y NO se avanza (no se envió ningún código).
      toast.error(r.mensaje || 'Parece que el número o correo no está registrado. Regístrate.')
      return
    }
    // Registrado: se envió el CÓDIGO (no un enlace). Vamos directo a ingresarlo.
    toast.success('Te enviamos un código de 6 dígitos. Ingrésalo aquí.')
    setView('set-password')
  }

  const establecerPassword = async () => {
    if (!identificador.trim()) { toast.error('Ingresa tu correo o teléfono.'); return }
    if (codigo.length !== 6) { toast.error('El código debe tener 6 dígitos.'); return }
    if (nuevaPass.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres.'); return }
    if (nuevaPass !== repitePass) { toast.error('Las contraseñas no coinciden.'); return }
    setLoading(true)
    const r = await authService.establecerPassword(identificador.trim(), codigo, nuevaPass)
    setLoading(false)
    if (r.ok) {
      // Auto-login: ya se verificó por OTP y acaba de crear su clave → entra directo.
      if (r.token && r.user) {
        toast.success('¡Listo! Tu contraseña quedó guardada.')
        await entrar(r.token, r.user, (r.user as any).subdominio)
      } else {
        // Respaldo por si no vino el token: lo mandamos al login normal.
        toast.success('¡Contraseña lista! Ahora ingresa con ella.')
        setCorreo(identificador.trim())
        limpiar(); setView('tradicional')
      }
    } else toast.error(r.mensaje || 'No se pudo establecer la contraseña. Revisa el código.')
  }

  // ----------------------------------------------------------- tradicional (correo + contraseña)
  const loginPassword = async () => {
    if (!correo.trim() || !password) { toast.error('Completa el acceso y la contraseña.'); return }
    setLoading(true)
    try {
      const res = await authService.login(correo.trim(), password)
      if (res?.token && res.user) {
        // El trabajador con contraseña temporal debe cambiarla en su primer
        // ingreso. El backend marca debeCambiarPassword; le enviamos el OTP y lo
        // mandamos a fijar su nueva contraseña.  (Flujo completo del trabajador
        // se afina en el siguiente incremento.)
        if (res.user.debeCambiarPassword) {
          const id = res.user.correo || correo.trim()
          setIdentificador(id)
          await authService.solicitarPassword(id)
          toast('Por seguridad, crea tu nueva contraseña. Te enviamos un código.')
          limpiar(); setView('set-password')
          return
        }
        await entrar(res.token, res.user as any, (res.user as any).subdominio)
      } else toast.error('Acceso o contraseña incorrectos.')
    } catch { toast.error('Acceso o contraseña incorrectos.') }
    finally { setLoading(false) }
  }

  // ----------------------------------------------------------- Google
  const handleGoogleCredential = async (resp: { credential?: string }) => {
    if (!resp?.credential) return
    setLoading(true)
    try {
      // En /login NO se crea cuenta: solo entra si ya existe (admin o trabajador).
      // Si no existe, el backend avisa y mandamos a registrarse.
      const res = await authService.loginGoogle(resp.credential, undefined, false)
      if (res && 'token' in res && res.token) await entrar(res.token, (res as any).user)
      else toast.error('No se pudo iniciar sesión con Google.')
    } catch (e: any) {
      const d = e?.response?.data
      const msg = d?.detail || d?.mensaje || d?.message || ''
      if (e?.response?.status === 404 || /no tienes una cuenta/i.test(msg)) {
        toast.error('Parece que no tienes una cuenta creada. Regístrate para continuar.')
        setTimeout(() => navigate('/acceso'), 1200)
      } else {
        toast.error(msg || 'No se pudo iniciar sesión con Google.')
      }
    } finally { setLoading(false) }
  }

  // Carga GSI (si falta) y dibuja el botón cuando estamos en la vista tradicional.
  useEffect(() => {
    if (!googleClientId || view !== 'tradicional') return
    let cancelado = false

    const pintarBoton = () => {
      const g = (window as any).google
      if (cancelado || !g?.accounts?.id || !googleBtnRef.current) return
      g.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCredential })
      googleBtnRef.current.innerHTML = ''
      g.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard', theme: 'outline', size: 'large',
        text: 'continue_with', shape: 'pill', logo_alignment: 'center',
        locale: 'es', width: Math.min(googleBtnRef.current.offsetWidth || 320, 400),
      })
    }

    const ID = 'google-gsi-script'
    if (!document.getElementById(ID)) {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true; s.defer = true; s.id = ID
      document.head.appendChild(s)
    }

    if ((window as any).google?.accounts?.id) { pintarBoton(); return }
    const intervalo = setInterval(() => {
      if ((window as any).google?.accounts?.id) { clearInterval(intervalo); pintarBoton() }
    }, 100)

    return () => { cancelado = true; clearInterval(intervalo) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, googleClientId])

  const limpiar = () => { setCodigo(''); setNuevaPass(''); setRepitePass('') }
  const irA = (v: View) => { limpiar(); setView(v) }

  // ================================================================= UI
  return (
    <div className="min-h-screen flex bg-white">
      {/* ===================== PANEL IMAGEN (desktop) ===================== */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img src="/login-barberia.jpg" alt="Barbería profesional" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-4xl font-bold leading-tight tracking-tight">
            Tu barbería,<br /><span className="text-blue-200">en orden.</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-4 text-white/85 text-lg max-w-sm">
            Reservas, agenda y caja en un solo lugar.
          </motion.p>
        </div>
      </div>

      {/* ===================== PANEL DE FORMULARIO ===================== */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <img src="/login-barberia.jpg" alt="" aria-hidden="true" className="lg:hidden absolute inset-0 w-full h-full object-cover" />
        <div className="lg:hidden absolute inset-0 bg-black/60" />

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl shadow-black/20 p-7 lg:bg-transparent lg:rounded-none lg:shadow-none lg:p-0">
          {/* Logo (solo móvil) */}
          <div className="lg:hidden text-center mb-7">
            <img src="/barber-logo-black.png" alt="Barber.PE" className="h-11 mx-auto" />
          </div>

          <AnimatePresence mode="wait">
            {/* ---------------- INGRESO TRADICIONAL (correo + contraseña + Google) ---------------- */}
            {view === 'tradicional' && (
              <motion.div key="tradicional" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="hidden lg:block mb-6">
                  <img src="/barber-logo-black.png" alt="Barber.PE" className="h-9 mb-2" />
                  <p className="text-gray-400 text-sm mt-1">Reserva y gestiona fácil, rápido!</p>
                </div>
                <p className="lg:hidden text-center text-gray-500 text-sm mb-5">Reserva y gestiona fácil, rápido!</p>

                <Label>Correo o teléfono</Label>
                <Input value={correo} onChange={setCorreo} />
                <Label>Contraseña</Label>
                <PassInput value={password} onChange={setPassword} onEnter={loginPassword} />

                <button onClick={loginPassword} disabled={loading} className={btnPrimary + ' mt-2'}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />} Entrar
                </button>
                <button onClick={() => irA('recover-pass-id')}
                  className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 transition">
                  Olvidé mi contraseña
                </button>
                <button onClick={() => navigate('/acceso')}
                  className="w-full text-blue-600 text-sm py-1 hover:text-blue-700 transition font-medium">
                  ¿No tienes cuenta? Regístrate
                </button>

                {googleClientId && (
                  <>
                    <div className="flex items-center gap-3 my-4">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-xs text-gray-400">o</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                    <div ref={googleBtnRef} className="w-full flex justify-center" style={{ colorScheme: 'light' }} />
                  </>
                )}
              </motion.div>
            )}

            {/* ---------------- OLVIDÉ MI CONTRASEÑA: identificador ---------------- */}
            {view === 'recover-pass-id' && (
              <motion.div key="recover-pass-id" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Back onClick={() => irA('tradicional')} />
                <p className="text-sm text-gray-500 mb-6">Te enviaremos un código para restablecer tu contraseña.</p>

                <label className="block text-sm font-bold text-blue-700 mb-2">Correo o teléfono</label>
                <Input value={identificador} onChange={setIdentificador} />

                <button onClick={enviarCodigoPassword} disabled={loading} className={btnPrimary + ' mt-2'}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Enviarme el código
                </button>
              </motion.div>
            )}

            {/* ---------------- ENVIADO: revisa tu correo / WhatsApp ---------------- */}
            {/* ---------------- CONTRASEÑA: código + nueva contraseña ---------------- */}
            {view === 'set-password' && (
              <motion.div key="set-password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Back onClick={() => irA('recover-pass-id')} />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Tu contraseña</h2>
                <p className="text-sm text-gray-500 mb-5">Ingresa el código que recibiste y crea tu contraseña.</p>

                <Label>Acceso (correo o teléfono)</Label>
                <Input value={identificador} onChange={setIdentificador} />
                <Label>Código (6 dígitos)</Label>
                <Digits value={codigo} onChange={setCodigo} />
                <Label>Nueva contraseña</Label>
                <PassInput value={nuevaPass} onChange={setNuevaPass} />
                <Label>Repite tu contraseña</Label>
                <PassInput value={repitePass} onChange={setRepitePass} />

                <button onClick={establecerPassword} disabled={loading} className={btnPrimary + ' mt-2'}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />} Guardar contraseña
                </button>
                <button onClick={enviarCodigoPassword} className="w-full text-gray-400 text-sm py-2 hover:text-gray-600">
                  Reenviar código
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- helpers UI */
const btnPrimary =
  'w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-600/25 active:scale-[0.99]'

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-4 transition">
      <ArrowLeft className="w-4 h-4" /> Atrás
    </button>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-500 mb-1.5">{children}</label>
}

function Input({ value, onChange, placeholder, onEnter }: { value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoCapitalize="none"
      onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter() }}
      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl mb-4 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" />
  )
}

function PassInput({ value, onChange, placeholder, onEnter }: { value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative mb-4">
      <input value={value} onChange={(e) => onChange(e.target.value)} type={show ? 'text' : 'password'} placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter() }}
        className="w-full px-4 py-3 pr-12 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" />
      <button type="button" onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 active:scale-90 transition"
        aria-label={show ? 'Ocultar' : 'Mostrar'}>
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  )
}

/** 6 casillas estilo OTP (mismo look que /acceso). */
function Digits({ value, onChange, secret }: { value: string; onChange: (v: string) => void; secret?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const chars = Array.from({ length: 6 }, (_, i) => value[i] ?? '')
  const setAt = (i: number, d: string) => {
    const arr = value.padEnd(6, ' ').split('')
    arr[i] = d || ' '
    onChange(arr.join('').replace(/ /g, '').slice(0, 6))
  }
  return (
    <div className="flex justify-center lg:justify-start gap-2 mb-4">
      {chars.map((c, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el }}
          value={secret && c ? '•' : c} inputMode="numeric" maxLength={1}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '')
            if (!digits) return
            if (digits.length === 1) { setAt(i, digits); if (i < 5) refs.current[i + 1]?.focus() }
            else { const merged = (value.slice(0, i) + digits).slice(0, 6); onChange(merged); refs.current[Math.min(merged.length, 5)]?.focus() }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') { e.preventDefault(); if (value[i]) setAt(i, ''); else if (i > 0) { refs.current[i - 1]?.focus(); setAt(i - 1, '') } }
          }}
          onFocus={(e) => e.currentTarget.select()}
          className="w-11 h-14 text-center text-2xl font-bold text-gray-900 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition" />
      ))}
    </div>
  )
}
