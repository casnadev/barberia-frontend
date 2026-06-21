import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Mail, Phone, Loader2, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { setTenant, clearTenant } from '@/services/apiClient'

const LOGO = '/barber-logo-black.png'

type Tipo = 'Cliente' | 'Profesional'
type Canal = 'Email' | 'WhatsApp'
type View = 'choose' | 'login' | 'password' | 'code' | 'finalize'

/**
 * Acceso unificado estilo Fresha (Opción B). Tarjeta blanca siempre (para que el
 * logo negro luzca); el fondo cambia entre cliente (claro) y profesional (oscuro).
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
  const idValor = () => (canal === 'Email' ? identificador.trim().toLowerCase() : `+51${identificador.replace(/\D/g, '')}`)

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
        type: 'standard', theme: 'outline', size: 'large',
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
  }, [view, googleClientId])

  // -------------------------------------------------------------- login (acceso/iniciar)
  const continuar = async () => {
    if (!identificador.trim()) { toast.error(canal === 'Email' ? 'Ingresa tu correo.' : 'Ingresa tu teléfono.'); return }
    setLoading(true)
    try {
      const r = await authService.accesoIniciar(tipo, idValor())
      if (r?.accion === 'password') setView('password')
      else {
        setEsNuevo(!!r?.esNuevo)
        if (canal === 'Email') setCorreo(idValor()); else setTelefono(idValor())
        setView('code')
        toast.success('Te enviamos un código de verificación.')
      }
    } catch (e: any) { toast.error(e?.message || 'No pudimos continuar. Revisa el dato.') }
    finally { setLoading(false) }
  }

  const entrarConPassword = async () => {
    if (!password) { toast.error('Ingresa tu contraseña.'); return }
    setLoading(true)
    try {
      const res = await authService.login(idValor(), password)
      if (!res) { toast.error('Acceso o contraseña incorrectos.'); return }
      entrar(res.token, res.user)
    } catch (e: any) { toast.error(e?.message || 'Acceso o contraseña incorrectos.') }
    finally { setLoading(false) }
  }

  const continuarConCodigo = () => {
    if (codigo.length !== 6) { toast.error('Ingresa los 6 dígitos.'); return }
    setView('finalize')
  }

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
        nombreNegocio: tipo === 'Profesional' ? nombreNegocio.trim() : undefined, password,
      })
      if (!resp) { toast.error('No pudimos crear la cuenta.'); return }
      entrar(resp.token, resp.user)
    } catch (e: any) { toast.error(e?.message || 'No pudimos crear la cuenta. Revisa el código.') }
    finally { setLoading(false) }
  }

  // Fondo: claro para cliente; oscuro para profesional. La tarjeta siempre blanca.
  const pageBg = view === 'choose' ? 'bg-gray-50' : (dark ? 'bg-neutral-900' : 'bg-gray-50')

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-10 transition-colors ${pageBg}`}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-black/10 border border-gray-100 p-8">
        <AnimatePresence mode="wait">

          {/* ===================================================== SELECTOR */}
          {view === 'choose' && (
            <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={() => navigate('/')} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-5">
                <ArrowLeft className="w-4 h-4" /> Inicio
              </button>
              <img src={LOGO} alt="Barber.PE" className="h-9 mx-auto mb-7" />

              <button onClick={() => { setTipo('Cliente'); setView('login') }}
                className="w-full flex items-center justify-between text-left border border-gray-200 rounded-2xl p-5 mb-4 hover:border-gray-900 hover:shadow-md transition group">
                <div>
                  <div className="font-semibold text-gray-900">Soy cliente</div>
                  <div className="text-sm text-gray-500">Reserva 24/7 a cualquier hora</div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition" />
              </button>

              <button onClick={() => { setTipo('Profesional'); setView('login') }}
                className="w-full flex items-center justify-between text-left border border-gray-200 rounded-2xl p-5 hover:border-gray-900 hover:shadow-md transition group">
                <div>
                  <div className="font-semibold text-gray-900">Tengo un negocio</div>
                  <div className="text-sm text-gray-500">Gestiona tu barbería y hazla crecer</div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition" />
              </button>
            </motion.div>
          )}

          {/* ===================================================== LOGIN */}
          {view === 'login' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back onClick={() => setView('choose')} />
              <img src={LOGO} alt="Barber.PE" className="h-8 mx-auto mb-3" />
              <p className="text-sm text-center text-gray-500 mb-1 font-medium">
                {dark ? 'para profesionales' : 'para clientes'}
              </p>
              <p className="text-sm text-center text-gray-500 mb-6">
                Escoger el método de acceso
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Toggle active={canal === 'Email'} onClick={() => { setCanal('Email'); setIdentificador('') }}><Mail className="w-4 h-4" /> Correo</Toggle>
                <Toggle active={canal === 'WhatsApp'} onClick={() => { setCanal('WhatsApp'); setIdentificador('') }}><Phone className="w-4 h-4" /> WhatsApp</Toggle>
              </div>

              {canal === 'Email' ? (
                <Input value={identificador} onChange={setIdentificador} placeholder="Introduce tu correo" onEnter={continuar} />
              ) : (
                <div className="flex gap-2 mb-4">
                  <span className="flex items-center px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600">+51</span>
                  <input value={identificador} onChange={(e) => setIdentificador(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    onKeyDown={(e) => e.key === 'Enter' && continuar()} inputMode="numeric" placeholder="987654321"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
                </div>
              )}
              <p className="text-xs text-gray-400 -mt-2 mb-4">Te enviaremos un código de verificación.</p>

              <button onClick={continuar} disabled={loading} className={btnDark}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />} Continuar
              </button>

              {googleClientId && (
                <>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 border-t border-gray-200" /><span className="text-xs text-gray-400">o</span><div className="flex-1 border-t border-gray-200" />
                  </div>
                  <div ref={googleBtnRef} className="flex justify-center" />
                </>
              )}

              <button onClick={() => setTipo(dark ? 'Cliente' : 'Profesional')} className="w-full text-sm py-3 text-gray-400 hover:text-gray-700 transition">
                {dark ? '¿Eres cliente? Ir a clientes' : '¿Tienes un negocio? Ir a profesionales'}
              </button>
            </motion.div>
          )}

          {/* ===================================================== PASSWORD */}
          {view === 'password' && (
            <motion.div key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back onClick={() => setView('login')} />
              <img src={LOGO} alt="Barber.PE" className="h-8 mx-auto mb-5" />
              <h1 className="text-xl font-bold text-center text-gray-900 mb-1">Ingresa tu contraseña</h1>
              <p className="text-sm text-center text-gray-500 mb-5">{identificador}</p>
              <PassInput value={password} onChange={setPassword} onEnter={entrarConPassword} placeholder="Tu contraseña" />
              <button onClick={entrarConPassword} disabled={loading} className={btnPrimary + ' mt-1'}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />} Entrar
              </button>
            </motion.div>
          )}

          {/* ===================================================== CÓDIGO */}
          {view === 'code' && (
            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back onClick={() => setView('login')} />
              <img src={LOGO} alt="Barber.PE" className="h-8 mx-auto mb-5" />
              <h1 className="text-xl font-bold text-center text-gray-900 mb-1">Confirma tu código</h1>
              <p className="text-sm text-center text-gray-500 mb-6">Te enviamos un código a <span className="font-semibold">{idValor()}</span>.</p>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" placeholder="••••••"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
              <button onClick={continuarConCodigo} className={btnDark}>Continuar</button>
              <button onClick={continuar} disabled={loading} className="w-full text-sm py-3 text-gray-400 hover:text-gray-700 transition">¿No te llegó? Reenviar código</button>
            </motion.div>
          )}

          {/* ===================================================== FINALIZAR */}
          {view === 'finalize' && (
            <motion.div key="finalize" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back onClick={() => setView('code')} />
              <img src={LOGO} alt="Barber.PE" className="h-8 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-center text-gray-900 mb-1">Finaliza tu registro</h1>
              <p className="text-sm text-center text-gray-500 mb-5">Necesitamos algunos datos más.</p>

              {tipo === 'Profesional' && (<><Label>Nombre del negocio</Label><Input value={nombreNegocio} onChange={setNombreNegocio} placeholder="Mi Barbería" /></>)}
              <Label>Nombre</Label><Input value={nombre} onChange={setNombre} placeholder="Tu nombre" />
              <Label>Apellido</Label><Input value={apellido} onChange={setApellido} placeholder="Tu apellido" />
              <Label>Correo</Label><Input value={correo} onChange={setCorreo} placeholder="tucorreo@gmail.com" readOnly={canal === 'Email'} />
              <Label>Teléfono</Label><Input value={telefono} onChange={setTelefono} placeholder="+51987654321" readOnly={canal === 'WhatsApp'} />
              <Label>Crea tu contraseña</Label><PassInput value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />

              <button onClick={crearCuenta} disabled={loading} className={btnDark + ' mt-2'}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />} Aceptar y crear cuenta
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────── estilos + componentes
const btnDark = 'w-full inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 active:scale-[0.99] shadow-lg shadow-gray-900/10'
const btnPrimary = 'w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 active:scale-[0.99] shadow-lg shadow-blue-600/20'

function Back({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-4 transition"><ArrowLeft className="w-4 h-4" /> Atrás</button>
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>
}
function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition ${active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`}>
      {children}
    </button>
  )
}
function Input({ value, onChange, placeholder, readOnly, onEnter }: { value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean; onEnter?: () => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter() }}
    placeholder={placeholder} readOnly={readOnly} autoCapitalize="none"
    className={`w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition ${readOnly ? 'text-gray-500 cursor-not-allowed' : ''}`} />
}
function PassInput({ value, onChange, placeholder, onEnter }: { value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative mb-4">
      <input value={value} onChange={(e) => onChange(e.target.value)} type={show ? 'text' : 'password'} placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter() }}
        className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition">
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  )
}
