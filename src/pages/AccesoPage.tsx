import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, Mail, Phone, Loader2, Eye, EyeOff, UserPlus, LogIn,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { setTenant, clearTenant } from '@/services/apiClient'

type Tipo = 'Cliente' | 'Profesional'
type Canal = 'Email' | 'WhatsApp'
type View = 'choose' | 'login' | 'password' | 'code' | 'finalize'

/**
 * Acceso unificado estilo Fresha (Opción B).
 *  choose   → elige Cliente/Profesional (Img 5).
 *  login    → correo o teléfono (toggle) + Continuar (Img 6 oscuro pro / Img 7 claro cliente).
 *             → acceso/iniciar decide: password (login) o codigo (activar/registrar).
 *  password → contraseña de retorno → /login.
 *  code     → ingresa el código (Img 1).
 *  finalize → datos + contraseña, solo si hace falta (Img 2) → crea/reclama y entra.
 */
export function AccesoPage() {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()

  const [view, setView] = useState<View>('choose')
  const [tipo, setTipo] = useState<Tipo>('Cliente')
  const [canal, setCanal] = useState<Canal>('Email')
  const [loading, setLoading] = useState(false)

  const [identificador, setIdentificador] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const [esNuevo, setEsNuevo] = useState(true)

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nombreNegocio, setNombreNegocio] = useState('')

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const dark = tipo === 'Profesional'
  const T = dark ? THEME_DARK : THEME_LIGHT

  // El "identificador" final según el canal (correo o teléfono con prefijo).
  const idValor = () =>
    canal === 'Email' ? identificador.trim().toLowerCase() : `+51${identificador.replace(/\D/g, '')}`

  // -------------------------------------------------------------- entrar
  const entrar = (token: string, user: any) => {
    setToken(token); setUser(user)
    if (user.rol === 'Cliente') { clearTenant(); navigate('/') }
    else { try { if (user.subdominio) setTenant(user.subdominio) } catch { /* sin sede aún */ } navigate('/dashboard') }
    toast.success('¡Listo! Sesión iniciada.')
  }

  // -------------------------------------------------------------- Google (GIS)
  const handleGoogleCredential = async (resp: { credential?: string }) => {
    if (!resp?.credential) return
    setLoading(true)
    try {
      const res = await authService.loginGoogle(resp.credential)
      if (res?.token && res.user) entrar(res.token, res.user as any)
      else toast.error('No se pudo iniciar sesión con Google.')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || 'No se pudo iniciar sesión con Google.')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!googleClientId || view !== 'login') return
    let cancelado = false
    const pintar = () => {
      const g = (window as any).google
      if (cancelado || !g?.accounts?.id || !googleBtnRef.current) return
      g.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCredential })
      googleBtnRef.current.innerHTML = ''
      g.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard', theme: dark ? 'filled_black' : 'outline', size: 'large',
        text: 'continue_with', shape: 'pill', logo_alignment: 'center', locale: 'es',
        width: Math.min(googleBtnRef.current.offsetWidth || 320, 400),
      })
    }
    const ID = 'google-gsi-script'
    if (!document.getElementById(ID)) {
      const sc = document.createElement('script')
      sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.defer = true; sc.id = ID
      document.head.appendChild(sc)
    }
    if ((window as any).google?.accounts?.id) { pintar(); return }
    const iv = setInterval(() => { if ((window as any).google?.accounts?.id) { clearInterval(iv); pintar() } }, 100)
    return () => { cancelado = true; clearInterval(iv) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dark, googleClientId])

  // -------------------------------------------------------------- login (acceso/iniciar)
  const continuar = async () => {
    if (!identificador.trim()) { toast.error(canal === 'Email' ? 'Ingresa tu correo.' : 'Ingresa tu teléfono.'); return }
    setLoading(true)
    try {
      const r = await authService.accesoIniciar(tipo, idValor())
      if (r?.accion === 'password') {
        setView('password')
      } else {
        setEsNuevo(!!r?.esNuevo)
        // precarga el contacto verificado en el formulario final
        if (canal === 'Email') setCorreo(idValor()); else setTelefono(idValor())
        setView('code')
        toast.success('Te enviamos un código de verificación.')
      }
    } catch (e: any) {
      toast.error(e?.message || 'No pudimos continuar. Revisa el dato.')
    } finally { setLoading(false) }
  }

  // -------------------------------------------------------------- password (retorno)
  const entrarConPassword = async () => {
    if (!password) { toast.error('Ingresa tu contraseña.'); return }
    setLoading(true)
    try {
      const res = await authService.login(idValor(), password)
      if (!res) { toast.error('Acceso o contraseña incorrectos.'); return }
      entrar(res.token, res.user)
    } catch (e: any) {
      toast.error(e?.message || 'Acceso o contraseña incorrectos.')
    } finally { setLoading(false) }
  }

  // -------------------------------------------------------------- código
  const continuarConCodigo = () => {
    if (codigo.length !== 6) { toast.error('Ingresa los 6 dígitos.'); return }
    setView('finalize')
  }

  // -------------------------------------------------------------- finalizar (crear/reclamar)
  const crearCuenta = async () => {
    if (!nombre.trim()) { toast.error('Ingresa tu nombre.'); return }
    if (tipo === 'Profesional' && !nombreNegocio.trim()) { toast.error('Ingresa el nombre de tu negocio.'); return }
    if (password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres.'); return }
    setLoading(true)
    try {
      const resp = await authService.signupCompletar({
        tipo, identificador: idValor(), codigo: codigo.trim(),
        nombre: nombre.trim(), apellido: apellido.trim() || undefined,
        correo: correo.trim() || undefined, telefono: telefono.trim() || undefined,
        nombreNegocio: tipo === 'Profesional' ? nombreNegocio.trim() : undefined,
        password,
      })
      if (!resp) { toast.error('No pudimos crear la cuenta.'); return }
      entrar(resp.token, resp.user)
    } catch (e: any) {
      toast.error(e?.message || 'No pudimos crear la cuenta. Revisa el código.')
    } finally { setLoading(false) }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-10 transition-colors ${view === 'choose' ? 'bg-gray-50' : T.page}`}>
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">

          {/* =============================================== SELECTOR (Img 5) */}
          {view === 'choose' && (
            <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={() => navigate('/')} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-6">
                <ArrowLeft className="w-4 h-4" /> Inicio
              </button>
              <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">Regístrate o inicia sesión</h1>

              <button onClick={() => { setTipo('Cliente'); setView('login') }}
                className="w-full flex items-center justify-between text-left border border-gray-200 rounded-2xl p-5 mb-4 hover:border-gray-400 hover:shadow-sm transition">
                <div>
                  <div className="font-semibold text-gray-900">Soy cliente</div>
                  <div className="text-sm text-gray-500">Reserva en barberías cerca de ti</div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>

              <button onClick={() => { setTipo('Profesional'); setView('login') }}
                className="w-full flex items-center justify-between text-left border border-gray-200 rounded-2xl p-5 hover:border-gray-400 hover:shadow-sm transition">
                <div>
                  <div className="font-semibold text-gray-900">Tengo un negocio</div>
                  <div className="text-sm text-gray-500">Gestiona tu barbería y hazla crecer</div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
            </motion.div>
          )}

          {/* =============================================== LOGIN (Img 6/7) */}
          {view === 'login' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back T={T} onClick={() => setView('choose')} />
              <h1 className={`text-2xl font-bold text-center mb-1 ${T.title}`}>
                {dark ? 'Barber.PE para profesionales' : 'Barber.PE para clientes'}
              </h1>
              <p className={`text-sm text-center mb-6 ${T.sub}`}>
                Crea una cuenta o inicia sesión {dark ? 'para gestionar tu negocio.' : 'para reservar y gestionar tus citas.'}
              </p>

              {/* Toggle Correo / WhatsApp */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={() => { setCanal('Email'); setIdentificador('') }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition ${canal === 'Email' ? T.toggleOn : T.toggleOff}`}>
                  <Mail className="w-4 h-4" /> Correo
                </button>
                <button onClick={() => { setCanal('WhatsApp'); setIdentificador('') }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition ${canal === 'WhatsApp' ? T.toggleOn : T.toggleOff}`}>
                  <Phone className="w-4 h-4" /> WhatsApp
                </button>
              </div>

              {canal === 'Email' ? (
                <input value={identificador} onChange={(e) => setIdentificador(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && continuar()}
                  placeholder="Introduce tu correo" autoCapitalize="none"
                  className={`w-full px-4 py-3 rounded-xl border mb-2 focus:outline-none focus:ring-2 transition ${T.input}`} />
              ) : (
                <div className="flex gap-2 mb-2">
                  <span className={`flex items-center px-3 rounded-xl border text-sm ${T.input}`}>+51</span>
                  <input value={identificador} onChange={(e) => setIdentificador(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    onKeyDown={(e) => e.key === 'Enter' && continuar()} inputMode="numeric"
                    placeholder="987654321"
                    className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition ${T.input}`} />
                </div>
              )}
              <p className={`text-xs mb-4 ${T.sub}`}>Te enviaremos un código de verificación.</p>

              <button onClick={continuar} disabled={loading}
                className={`w-full inline-flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition disabled:opacity-50 active:scale-[0.99] ${T.primary}`}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />} Continuar
              </button>

              {googleClientId && (
                <>
                  <div className="flex items-center gap-3 my-4">
                    <div className={`flex-1 border-t ${dark ? 'border-neutral-800' : 'border-gray-200'}`} />
                    <span className={`text-xs ${T.sub}`}>o</span>
                    <div className={`flex-1 border-t ${dark ? 'border-neutral-800' : 'border-gray-200'}`} />
                  </div>
                  <div ref={googleBtnRef} className="flex justify-center" />
                </>
              )}

              <button onClick={() => setTipo(dark ? 'Cliente' : 'Profesional')}
                className={`w-full text-sm py-3 transition ${T.ghost}`}>
                {dark ? '¿Eres cliente? Ir a clientes' : '¿Tienes un negocio? Ir a profesionales'}
              </button>
              {/* Social (Google) → se conecta reusando tu loginGoogle de LoginPage. */}
            </motion.div>
          )}

          {/* =============================================== PASSWORD (retorno) */}
          {view === 'password' && (
            <motion.div key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back T={T} onClick={() => setView('login')} />
              <h1 className={`text-2xl font-bold mb-1 ${T.title}`}>Ingresa tu contraseña</h1>
              <p className={`text-sm mb-5 ${T.sub}`}>
                Para <span className="font-semibold">{identificador}</span>.
              </p>
              <PassInput T={T} value={password} onChange={setPassword} onEnter={entrarConPassword} placeholder="Tu contraseña" />
              <button onClick={entrarConPassword} disabled={loading}
                className={`w-full inline-flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition disabled:opacity-50 mt-1 ${T.primary}`}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />} Entrar
              </button>
            </motion.div>
          )}

          {/* =============================================== CÓDIGO (Img 1) */}
          {view === 'code' && (
            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back T={T} onClick={() => setView('login')} />
              <h1 className={`text-2xl font-bold text-center mb-1 ${T.title}`}>Confirma tu código</h1>
              <p className={`text-sm text-center mb-6 ${T.sub}`}>Te enviamos un código a <span className="font-semibold">{idValor()}</span>.</p>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" placeholder="••••••"
                className={`w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3 rounded-xl border mb-4 focus:outline-none focus:ring-2 transition ${T.input}`} />
              <button onClick={continuarConCodigo} className={`w-full font-semibold py-3 rounded-xl transition ${T.primary}`}>Continuar</button>
              <button onClick={continuar} disabled={loading} className={`w-full text-sm py-3 transition ${T.ghost}`}>¿No te llegó? Reenviar código</button>
            </motion.div>
          )}

          {/* =============================================== FINALIZAR (Img 2) */}
          {view === 'finalize' && (
            <motion.div key="finalize" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back T={T} onClick={() => setView('code')} />
              <h1 className={`text-2xl font-bold text-center mb-1 ${T.title}`}>Finaliza tu registro</h1>
              <p className={`text-sm text-center mb-5 ${T.sub}`}>Necesitamos algunos datos más.</p>

              {tipo === 'Profesional' && (<><FieldLabel T={T}>Nombre del negocio</FieldLabel>
                <TInput T={T} value={nombreNegocio} onChange={setNombreNegocio} placeholder="Mi Barbería" /></>)}
              <FieldLabel T={T}>Nombre</FieldLabel>
              <TInput T={T} value={nombre} onChange={setNombre} placeholder="Tu nombre" />
              <FieldLabel T={T}>Apellido</FieldLabel>
              <TInput T={T} value={apellido} onChange={setApellido} placeholder="Tu apellido" />
              <FieldLabel T={T}>Correo</FieldLabel>
              <TInput T={T} value={correo} onChange={setCorreo} placeholder="tucorreo@gmail.com" readOnly={canal === 'Email'} />
              <FieldLabel T={T}>Teléfono</FieldLabel>
              <TInput T={T} value={telefono} onChange={setTelefono} placeholder="+51987654321" readOnly={canal === 'WhatsApp'} />
              <FieldLabel T={T}>Crea tu contraseña</FieldLabel>
              <PassInput T={T} value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />

              <button onClick={crearCuenta} disabled={loading}
                className={`w-full inline-flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition disabled:opacity-50 mt-2 ${T.primary}`}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />} Aceptar y crear cuenta
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────── temas
const THEME_LIGHT = {
  page: 'bg-gray-50', title: 'text-gray-900', sub: 'text-gray-500', label: 'text-gray-500',
  input: 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:bg-white',
  primary: 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-900/10',
  ghost: 'text-gray-400 hover:text-gray-700',
  toggleOn: 'bg-blue-50 border-blue-500 text-blue-700', toggleOff: 'bg-gray-50 border-gray-200 text-gray-500',
}
const THEME_DARK = {
  page: 'bg-neutral-950', title: 'text-white', sub: 'text-gray-400', label: 'text-gray-300',
  input: 'bg-neutral-900 border-neutral-700 text-white placeholder-gray-500 focus:ring-blue-500',
  primary: 'bg-white text-black hover:bg-gray-100',
  ghost: 'text-gray-400 hover:text-white',
  toggleOn: 'bg-neutral-800 border-blue-500 text-white', toggleOff: 'bg-neutral-900 border-neutral-700 text-gray-400',
}
type Theme = typeof THEME_LIGHT

// ─────────────────────────────────────────────────────────────── componentes
function Back({ T, onClick }: { T: Theme; onClick: () => void }) {
  return <button onClick={onClick} className={`inline-flex items-center gap-1 text-sm mb-4 transition ${T.ghost}`}><ArrowLeft className="w-4 h-4" /> Atrás</button>
}
function FieldLabel({ T, children }: { T: Theme; children: React.ReactNode }) {
  return <label className={`block text-xs font-medium mb-1.5 ${T.label}`}>{children}</label>
}
function TInput({ T, value, onChange, placeholder, readOnly }: { T: Theme; value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} autoCapitalize="none"
    className={`w-full px-4 py-3 rounded-xl border mb-4 focus:outline-none focus:ring-2 transition ${T.input} ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`} />
}
function PassInput({ T, value, onChange, placeholder, onEnter }: { T: Theme; value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative mb-4">
      <input value={value} onChange={(e) => onChange(e.target.value)} type={show ? 'text' : 'password'} placeholder={placeholder}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        className={`w-full px-4 py-3 pr-12 rounded-xl border focus:outline-none focus:ring-2 transition ${T.input}`} />
      <button type="button" onClick={() => setShow((s) => !s)} className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${T.ghost}`}>
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  )
}
