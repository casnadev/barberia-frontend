import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, UserPlus, LogIn, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { setTenant, clearTenant } from '@/services/apiClient'

const LOGO = '/barber-logo-black.png'

type Tipo = 'Cliente' | 'Profesional'
type View = 'choose' | 'login' | 'password' | 'code' | 'finalize'

/**
 * Acceso unificado. Un solo campo "Correo o Teléfono" (el backend autodetecta el
 * canal). Cliente: OTP/Google directo (sin formulario). Profesional: OTP/Google →
 * formulario final (negocio + contraseña).
 */
export function AccesoPage() {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()

  const [view, setView] = useState<View>('choose')
  const [tipo, setTipo] = useState<Tipo>('Cliente')
  const [loading, setLoading] = useState(false)

  const [identificador, setIdentificador] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [correoVerificado, setCorreoVerificado] = useState('')

  // Si la finalización viene de Google guardamos el credential y completamos por ahí.
  const [googleCredential, setGoogleCredential] = useState<string | null>(null)

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const dark = tipo === 'Profesional'
  const esEmail = identificador.includes('@')
  const soloDigitos = identificador.replace(/\D/g, '').slice(-9)
  const idValor = () => (esEmail ? identificador.trim().toLowerCase() : soloDigitos)
  const displayId = esEmail ? identificador.trim().toLowerCase() : `+51 ${soloDigitos}`

  // -------------------------------------------------------------- entrar
  const entrar = (token: string, user: any) => {
    setToken(token); setUser(user)
    if (user.rol === 'Cliente') clearTenant()
    else { try { if (user.subdominio) setTenant(user.subdominio) } catch { /* sin sede aún */ } }
    navigate('/')
    toast.success('¡Listo! Sesión iniciada.')
  }

  // -------------------------------------------------------------- Google (GIS)
  const handleGoogleCredential = async (resp: { credential?: string }) => {
    if (!resp?.credential) return
    setLoading(true)
    try {
      // En /acceso siempre creamos si no existe (es registro).
      const res = await authService.loginGoogle(resp.credential, tipo, true)
      if (res && 'necesitaCompletarProfesional' in res && res.necesitaCompletarProfesional) {
        // Profesional nuevo por Google → formulario final (negocio + contraseña).
        setGoogleCredential(resp.credential)
        setCorreoVerificado(res.correo || '')
        if (res.nombreCompleto) setNombre(res.nombreCompleto)
        setView('finalize')
        return
      }
      if (res && 'token' in res && res.token) entrar(res.token, (res as any).user)
      else toast.error('No se pudo continuar con Google.')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.mensaje || e?.message || 'No se pudo continuar con Google.')
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
  }, [view, googleClientId, tipo])

  // -------------------------------------------------------------- login (acceso/iniciar)
  const continuar = async () => {
    if (!identificador.trim()) { toast.error('Ingresa tu correo o teléfono.'); return }
    if (!esEmail && soloDigitos.length !== 9) { toast.error('El teléfono debe tener 9 dígitos.'); return }
    setAviso(null)
    setLoading(true)
    try {
      // Pre-chequeo: ¿ya está registrado? Si sí, NO mandamos OTP; avisamos ahí mismo.
      const chk = await authService.accesoVerificar(tipo, idValor())
      if (chk?.yaRegistrado) {
        setAviso(chk.mensaje || 'Este dato ya está registrado, inicia sesión.')
        return
      }
      const r = await authService.accesoIniciar(tipo, idValor())
      if (r?.accion === 'password') setView('password')
      else {
        setCorreoVerificado(idValor())
        setCodigo('')
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

  // Cliente: crea directo (sin formulario). Profesional: pasa al formulario final.
  const continuarConCodigo = async () => {
    if (codigo.length !== 6) { toast.error('Ingresa los 6 dígitos.'); return }
    if (tipo === 'Profesional') { setGoogleCredential(null); setView('finalize'); return }
    setLoading(true)
    try {
      const resp = await authService.signupCompletar({
        tipo: 'Cliente', identificador: idValor(), codigo: codigo.trim(),
      })
      if (!resp) { toast.error('No pudimos crear tu cuenta.'); return }
      entrar(resp.token, resp.user)
    } catch (e: any) { toast.error(e?.message || 'Código incorrecto o vencido.') }
    finally { setLoading(false) }
  }

  // Finaliza el registro PROFESIONAL (sea por OTP o por Google).
  const crearNegocio = async () => {
    if (!nombreNegocio.trim()) { toast.error('Ingresa el nombre de tu negocio.'); return }
    if (!nombre.trim()) { toast.error('Ingresa tu nombre.'); return }
    if (password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres.'); return }
    setLoading(true)
    try {
      let resp
      if (googleCredential) {
        resp = await authService.googleCompletarProfesional({
          credential: googleCredential, nombreNegocio: nombreNegocio.trim(),
          nombre: nombre.trim(), password,
        })
      } else {
        resp = await authService.signupCompletar({
          tipo: 'Profesional', identificador: idValor(), codigo: codigo.trim(),
          nombre: nombre.trim(), nombreNegocio: nombreNegocio.trim(),
          correo: esEmail ? idValor() : undefined,
          telefono: !esEmail ? idValor() : undefined,
          password,
        })
      }
      if (!resp) { toast.error('No pudimos crear la cuenta.'); return }
      entrar(resp.token, resp.user)
    } catch (e: any) { toast.error(e?.message || 'No pudimos crear la cuenta.') }
    finally { setLoading(false) }
  }

  const pageBg = dark ? 'bg-neutral-900' : 'bg-gradient-to-b from-blue-50 to-gray-50'

  return (
    <div className="min-h-screen flex">
      {/* Banner lateral — SOLO desktop. En mobile la tarjeta queda igual que antes. */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img src="/login-barberia.jpg" alt="Barbería profesional" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Tu barbería,<br /><span className="text-blue-200">en orden.</span>
          </h2>
          <p className="mt-4 text-white/85 text-lg max-w-sm">Reservas, agenda y caja en un solo lugar.</p>
        </div>
      </div>

      {/* Panel del formulario: blanco en desktop, mismo fondo que antes en mobile */}
      <div className={`flex-1 flex items-center justify-center px-4 py-10 transition-colors lg:bg-none lg:bg-white ${pageBg}`}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 p-8 lg:max-w-sm lg:border-0 lg:shadow-none lg:rounded-none lg:p-0">
          <AnimatePresence mode="wait">

          {/* ===================================================== SELECTOR */}
          {view === 'choose' && (
            <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={() => navigate('/')} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-5">
                <ArrowLeft className="w-4 h-4" /> Inicio
              </button>
              <img src={LOGO} alt="Barber.PE" className="h-9 mx-auto mb-7" />

              <button onClick={() => { setTipo('Cliente'); setView('login') }}
                className="w-full flex items-center justify-between text-left border-2 border-gray-100 rounded-2xl p-5 mb-4 hover:border-blue-500 hover:shadow-md transition group">
                <div>
                  <div className="font-semibold text-gray-900">Soy cliente</div>
                  <div className="text-sm text-gray-500">Reserva 24/7 a cualquier hora</div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition" />
              </button>

              <button onClick={() => { setTipo('Profesional'); setView('login') }}
                className="w-full flex items-center justify-between text-left border-2 border-gray-100 rounded-2xl p-5 hover:border-blue-500 hover:shadow-md transition group">
                <div>
                  <div className="font-semibold text-gray-900">Tengo un negocio</div>
                  <div className="text-sm text-gray-500">Gestiona tu barbería y hazla crecer</div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition" />
              </button>
            </motion.div>
          )}

          {/* ===================================================== LOGIN */}
          {view === 'login' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back onClick={() => setView('choose')} />
              <img src={LOGO} alt="Barber.PE" className="h-8 mx-auto mb-2" />
              <p className="text-sm text-center text-gray-400 mb-7 font-medium">
                {dark ? 'para profesionales' : 'para clientes'}
              </p>

              <label className="block text-sm font-bold text-blue-700 mb-2">Correo o Teléfono</label>
              <input
                value={identificador}
                onChange={(e) => { setIdentificador(e.target.value); if (aviso) setAviso(null) }}
                onKeyDown={(e) => e.key === 'Enter' && continuar()}
                placeholder="tucorreo@gmail.com o 9XXXXXXXX"
                autoCapitalize="none" autoComplete="username"
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
              />
              <p className="text-xs text-gray-400 mt-2 mb-5">Te enviaremos un código de verificación.</p>

              {aviso && (
                <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  <p className="text-sm text-amber-800">{aviso}</p>
                  <button onClick={() => navigate('/login')}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800 transition">
                    <LogIn className="w-4 h-4" /> Iniciar sesión
                  </button>
                </div>
              )}

              <button onClick={continuar} disabled={loading} className={btnPrimary}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />} Continuar
              </button>

              {googleClientId && (
                <>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 border-t border-gray-200" /><span className="text-xs text-gray-400">o</span><div className="flex-1 border-t border-gray-200" />
                  </div>
                  <div ref={googleBtnRef} className="flex justify-center" />
                </>
              )}

              <button onClick={() => setTipo(dark ? 'Cliente' : 'Profesional')} className="w-full text-sm py-4 text-gray-400 hover:text-blue-700 transition">
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
              <p className="text-sm text-center text-gray-500 mb-5">{displayId}</p>
              <PassInput value={password} onChange={setPassword} onEnter={entrarConPassword} placeholder="Tu contraseña" />
              <button onClick={entrarConPassword} disabled={loading} className={btnPrimary + ' mt-1'}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />} Entrar
              </button>
            </motion.div>
          )}

          {/* ===================================================== CÓDIGO (PRO) */}
          {view === 'code' && (
            <motion.div key="code" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Back onClick={() => setView('login')} />
              <div className="flex flex-col items-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 ring-8 ring-blue-50/40">
                  <ShieldCheck className="w-7 h-7 text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Confirma tu código</h1>
                <p className="text-sm text-gray-500 text-center mt-1">
                  Enviamos un código de 6 dígitos a<br /><span className="font-semibold text-gray-700">{displayId}</span>
                </p>
              </div>

              <OtpBoxes value={codigo} onChange={setCodigo} />

              <button onClick={continuarConCodigo} disabled={loading || codigo.length !== 6} className={btnPrimary}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />} Continuar
              </button>
              <button onClick={continuar} disabled={loading} className="w-full text-sm py-4 text-gray-400 hover:text-blue-700 transition">
                ¿No te llegó? Reenviar código
              </button>
            </motion.div>
          )}

          {/* ===================================================== FINALIZAR (solo Profesional) */}
          {view === 'finalize' && (
            <motion.div key="finalize" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back onClick={() => setView(googleCredential ? 'login' : 'code')} />
              <img src={LOGO} alt="Barber.PE" className="h-8 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-center text-gray-900 mb-1">Finaliza tu registro</h1>
              <p className="text-sm text-center text-gray-500 mb-5">Necesitamos algunos datos más.</p>

              <Label>Nombre del negocio</Label>
              <Input value={nombreNegocio} onChange={setNombreNegocio} placeholder="Mi Barbería" />

              <Label>Tu nombre</Label>
              <Input value={nombre} onChange={setNombre} placeholder="Nombre y apellido" />

              <Label>Correo verificado</Label>
              <Input value={correoVerificado || (esEmail ? idValor() : displayId)} onChange={() => {}} readOnly />

              <Label>Crea tu contraseña</Label>
              <PassInput value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />

              <button onClick={crearNegocio} disabled={loading} className={btnPrimary + ' mt-1'}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />} Aceptar y crear cuenta
              </button>
            </motion.div>
          )}

        </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────── estilos + componentes
const btnPrimary = 'w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 active:scale-[0.99] shadow-lg shadow-blue-600/25'

function Back({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-4 transition"><ArrowLeft className="w-4 h-4" /> Atrás</button>
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-500 mb-1.5">{children}</label>
}
function Input({ value, onChange, placeholder, readOnly, onEnter }: { value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean; onEnter?: () => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter() }}
    placeholder={placeholder} readOnly={readOnly} autoCapitalize="none"
    className={`w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white mb-4 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition ${readOnly ? 'text-gray-500 bg-gray-50 cursor-not-allowed' : ''}`} />
}
function PassInput({ value, onChange, placeholder, onEnter }: { value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative mb-4">
      <input value={value} onChange={(e) => onChange(e.target.value)} type={show ? 'text' : 'password'} placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter() }}
        className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition">
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  )
}

/** 6 casillas estilo OTP, con auto-avance, borrado y pegado. */
function OtpBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const chars = Array.from({ length: 6 }, (_, i) => value[i] ?? '')

  const setAt = (i: number, d: string) => {
    const arr = value.padEnd(6, ' ').split('')
    arr[i] = d || ' '
    onChange(arr.join('').replace(/ /g, '').slice(0, 6))
  }

  const onChangeBox = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return
    if (digits.length === 1) {
      setAt(i, digits)
      if (i < 5) refs.current[i + 1]?.focus()
    } else {
      const merged = (value.slice(0, i) + digits).slice(0, 6)
      onChange(merged)
      refs.current[Math.min(merged.length, 5)]?.focus()
    }
  }

  const onKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[i]) setAt(i, '')
      else if (i > 0) { refs.current[i - 1]?.focus(); setAt(i - 1, '') }
    }
  }

  return (
    <div className="flex justify-center gap-2 mb-6">
      {chars.map((c, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el }}
          value={c} inputMode="numeric" maxLength={1}
          onChange={(e) => onChangeBox(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.currentTarget.select()}
          className="w-11 h-14 text-center text-2xl font-bold text-gray-900 rounded-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition" />
      ))}
    </div>
  )
}
