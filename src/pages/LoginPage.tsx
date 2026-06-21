import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft, Delete, ShieldCheck, KeyRound, Send, Loader2, LogIn,
  Eye, EyeOff, MailCheck, MessageCircle,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { pinAuthService } from '@/services/pinAuthService'
import { authService } from '@/services/authService'
import { setTenant, clearTenant } from '@/services/apiClient'
import { sedeTenantService } from '@/services/sedeTenantService'

type View = 'pin' | 'password' | 'enroll-id' | 'enroll-code' | 'recover-id' | 'recover-code' | 'sent' | 'recover-pass-id' | 'set-password'
function nombreDispositivoCorto(): string {
  const ua = navigator.userAgent
  const has = (s: string) => ua.includes(s)
  const navegador =
    has('Edg') ? 'Edge' :
      has('OPR') || has('Opera') ? 'Opera' :
        has('Chrome') ? 'Chrome' :
          has('Firefox') ? 'Firefox' :
            has('Safari') ? 'Safari' : 'Navegador'
  const so =
    has('Windows') ? 'Windows' :
      has('Android') ? 'Android' :
        has('iPhone') ? 'iPhone' :
          has('iPad') ? 'iPad' :
            has('Mac') ? 'Mac' :
              has('Linux') ? 'Linux' : 'dispositivo'
  return `${navegador} en ${so}`.slice(0, 120)
}
export function LoginPage() {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()

  const [view, setView] = useState<View>('password')
  const [loading, setLoading] = useState(false)
  const [flujo, setFlujo] = useState<'enroll' | 'recover' | 'password'>('recover')

  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [showPin, setShowPin] = useState(false)

  const [identificador, setIdentificador] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nuevoPin, setNuevoPin] = useState('')
  const [repitePin, setRepitePin] = useState('')

  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')

  // Google Sign-In. Si no hay VITE_GOOGLE_CLIENT_ID en el .env, el botón no
  // aparece (no rompe nada).
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const [nuevaPass, setNuevaPass] = useState('')
  const [repitePass, setRepitePass] = useState('')

  // ----------------------------------------------------------- routing
  const entrar = async (token: string, user: any, subdominio?: string) => {
    setToken(token); setUser(user)
    if (user.rol === 'SuperAdmin') clearTenant()
    else if (subdominio) setTenant(subdominio)
    else if (user.rol === 'Admin' || user.rol === 'Trabajador') {
      // Pre-resuelve el tenant para que "Mi panel" abra sin fricción. Si aún no
      // tiene sede (admin recién creado), no pasa nada: queda sin tenant.
      try {
        const sedes = await sedeTenantService.getMisSedes()
        if (sedes[0]?.subdominio) setTenant(sedes[0].subdominio)
      } catch { /* sin sede aun */ }
    }
    // TODOS los roles entran a la landing (barber.pe) ya logueados. Desde el
    // AccountMenu ("Mi panel") cada quien salta a su panel según su rol.
    navigate('/')
  }

  // ----------------------------------------------------------- PIN diario
  const submitPin = async (value: string) => {
    setLoading(true); setPinError('')
    const r = await pinAuthService.pinLogin(value)
    setLoading(false)
    if (r.ok && r.token && r.user) await entrar(r.token, r.user, r.subdominio)
    else if (r.codigo === 'DISPOSITIVO_NO_CONFIABLE') {
      setPin(''); setView('enroll-id')
      toast('Este dispositivo es nuevo. Verifiquemos que eres tú.')
    } else { setPin(''); setPinError(r.mensaje || 'PIN incorrecto.') }
  }

  // ----------------------------------------------------------- deep-link del correo
  // El botón del correo abre /login?acceso=enrolar|recuperar&id=<correo/tel>&code=<otp>
  // → caemos directo en "Crea tu PIN" (o "Cambiar PIN") con el contacto y el código
  // ya precargados. El usuario solo elige su PIN.
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const acceso = searchParams.get('acceso')
    if (!acceso) return
    const id = searchParams.get('id')
    const code = searchParams.get('code')
    if (id) setIdentificador(id)
    if (code) setCodigo(code)
    if (acceso === 'recuperar') setView('recover-code')
    else if (acceso === 'enrolar') setView('enroll-code')
    else if (acceso === 'password') { setFlujo('password'); setView('set-password') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (view === 'pin' && pin.length === 6 && !loading) submitPin(pin)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  const pressDigit = (d: string) => {
    if (loading || pin.length >= 6) return
    setPinError(''); setPin((p) => (p.length >= 6 ? p : p + d))
  }
  const backspace = () => setPin((p) => p.slice(0, -1))

  // ----------------------------------------------------------- enrolar
  const enviarCodigoEnrolar = async () => {
    if (!identificador.trim()) { toast.error('Ingresa tu correo o teléfono.'); return }
    setLoading(true)
    await pinAuthService.enrolarSolicitar(identificador.trim())
    setLoading(false)
    toast.success('Listo, revisa tu mensaje.')
    setFlujo('enroll'); setView('sent')
  }

  const crearPin = async () => {
    if (!identificador.trim()) { toast.error('Ingresa tu correo o teléfono.'); return }
    if (codigo.length !== 6) { toast.error('El código debe tener 6 dígitos.'); return }
    if (nuevoPin.length !== 6) { toast.error('El PIN debe tener 6 dígitos.'); return }
    if (nuevoPin !== repitePin) { toast.error('Los PIN no coinciden.'); return }
    setLoading(true)
    const r = await pinAuthService.enrolarConfirmar(identificador.trim(), codigo, nuevoPin, nombreDispositivoCorto())
    setLoading(false)
    if (r.ok && r.token && r.user) { toast.success('¡Listo, PIN creado!'); await entrar(r.token, r.user, r.subdominio) }
    else toast.error(r.mensaje || 'No se pudo crear el PIN. Revisa el código.')
  }

  // ----------------------------------------------------------- recuperar
  const enviarCodigoRecuperar = async () => {
    if (!identificador.trim()) { toast.error('Ingresa tu correo o teléfono.'); return }
    setLoading(true)
    await pinAuthService.recuperarSolicitar(identificador.trim())
    setLoading(false)
    toast.success('Listo, revisa tu mensaje.')
    setFlujo('recover'); setView('sent')
  }

  const cambiarPin = async () => {
    if (!identificador.trim()) { toast.error('Ingresa tu correo o teléfono.'); return }
    if (codigo.length !== 6) { toast.error('El código debe tener 6 dígitos.'); return }
    if (nuevoPin.length !== 6) { toast.error('El PIN debe tener 6 dígitos.'); return }
    if (nuevoPin !== repitePin) { toast.error('Los PIN no coinciden.'); return }
    setLoading(true)
    const r = await pinAuthService.recuperarConfirmar(identificador.trim(), codigo, nuevoPin)
    setLoading(false)
    if (r.ok) { toast.success('PIN actualizado. Ahora ingrésalo.'); limpiar(); setView('pin') }
    else toast.error(r.mensaje || 'No se pudo cambiar el PIN. Revisa el código.')
  }

  // ----------------------------------------------------------- crear/recuperar contraseña
  const enviarCodigoPassword = async () => {
    if (!identificador.trim()) { toast.error('Ingresa tu correo o teléfono.'); return }
    setLoading(true)
    await authService.solicitarPassword(identificador.trim())
    setLoading(false)
    // Respuesta uniforme: siempre confirmamos el envío (no revelamos si la cuenta existe).
    toast.success('Listo, revisa tu mensaje.')
    setFlujo('password'); setView('sent')
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
      toast.success('¡Contraseña lista! Ahora ingresa con ella.')
      setCorreo(identificador.trim())
      limpiar(); setView('password')
    } else toast.error(r.mensaje || 'No se pudo establecer la contraseña. Revisa el código.')
  }

  // ----------------------------------------------------------- tradicional
  const loginPassword = async () => {
    if (!correo.trim() || !password) { toast.error('Completa el acceso y la contraseña.'); return }
    setLoading(true)
    try {
      const res = await authService.login(correo.trim(), password)
      if (res?.token && res.user) await entrar(res.token, res.user as any)
      else toast.error('Acceso o contraseña incorrectos.')
    } catch { toast.error('Acceso o contraseña incorrectos.') }
    finally { setLoading(false) }
  }

  // ----------------------------------------------------------- Google
  const handleGoogleCredential = async (resp: { credential?: string }) => {
    if (!resp?.credential) return
    setLoading(true)
    try {
      const res = await authService.loginGoogle(resp.credential)
      if (res?.token && res.user) await entrar(res.token, res.user as any)
      else toast.error('No se pudo iniciar sesión con Google.')
    } catch (e: any) {
      const d = e?.response?.data
      toast.error(d?.mensaje || d?.detail || d?.message || 'No se pudo iniciar sesión con Google.')
    } finally { setLoading(false) }
  }

  // Carga GSI (si falta) y dibuja el botón cuando estamos en la vista password.
  // Espera (poll) a que window.google.accounts.id exista DE VERDAD antes de
  // pintar; así no falla aunque el script aún no haya terminado de cargar
  // (caso típico con React StrictMode en dev, que corre los efectos 2 veces).
  useEffect(() => {
    if (!googleClientId || view !== 'password') return
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

    // Asegura el script una sola vez.
    const ID = 'google-gsi-script'
    if (!document.getElementById(ID)) {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true; s.defer = true; s.id = ID
      document.head.appendChild(s)
    }

    // Si ya está listo, pinta; si no, espera hasta que la librería cargue.
    if ((window as any).google?.accounts?.id) {
      pintarBoton()
      return
    }
    const intervalo = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        clearInterval(intervalo)
        pintarBoton()
      }
    }, 100)

    return () => { cancelado = true; clearInterval(intervalo) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, googleClientId])

  const limpiar = () => { setCodigo(''); setNuevoPin(''); setRepitePin(''); setNuevaPass(''); setRepitePass('') }
  const irA = (v: View) => { setPinError(''); limpiar(); setView(v) }

  // ================================================================= UI
  return (
    <div className="min-h-screen flex bg-white">
      {/* ===================== PANEL IMAGEN (desktop) ===================== */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* foto de barbería */}
        <img src="/login-barberia.jpg" alt="Barbería profesional" className="absolute inset-0 w-full h-full object-cover" />
        {/* degradado para legibilidad del lema */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        {/* lema */}
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
        {/* Fondo móvil: imagen de barbería + overlay (en desktop la imagen vive en el panel izquierdo) */}
        <img src="/login-barberia.jpg" alt="" aria-hidden="true" className="lg:hidden absolute inset-0 w-full h-full object-cover" />
        <div className="lg:hidden absolute inset-0 bg-black/60" />

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl shadow-black/20 p-7 lg:bg-transparent lg:rounded-none lg:shadow-none lg:p-0">
          {/* Logo (solo móvil) */}
          <div className="lg:hidden text-center mb-7">
            <img src="/barber-logo-black.png" alt="Barber.PE" className="h-11 mx-auto" />
          </div>

          <AnimatePresence mode="wait">
            {/* ---------------- PIN DIARIO ---------------- */}
            {view === 'pin' && (
              <motion.div key="pin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="hidden lg:block mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Ingresa tu PIN</h2>
                  <p className="text-gray-400 text-sm mt-1">Usa tu PIN de 6 dígitos para continuar</p>
                </div>
                <p className="lg:hidden text-center text-gray-500 text-sm mb-5">Ingresa tu PIN</p>

                <div className="flex items-center justify-center lg:justify-start gap-3 mb-1">
                  {Array.from({ length: 6 }).map((_, i) =>
                    showPin ? (
                      <span key={i} className="w-3.5 h-5 flex items-center justify-center text-xl font-light leading-none text-blue-700">
                        {pin[i] ?? ''}
                      </span>
                    ) : (
                      <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${i < pin.length ? 'bg-blue-600 scale-110 shadow-sm shadow-blue-600/40' : 'bg-gray-200'}`} />
                    )
                  )}
                  <button type="button" onClick={() => setShowPin((s) => !s)}
                    className="ml-1 text-gray-400 hover:text-blue-600 active:scale-90 transition"
                    aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}>
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-center lg:text-left text-red-500 text-sm h-5 mb-3">{pinError}</p>

                {/* Teclado premium */}
                <div className="grid grid-cols-3 gap-3 max-w-[300px] mx-auto lg:mx-0">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                    <button key={d} onClick={() => pressDigit(d)} disabled={loading}
                      className="aspect-square rounded-2xl text-2xl font-light text-gray-700 bg-white border border-gray-100 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-600 active:text-white active:border-blue-600 active:scale-90 transition-all duration-150 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                      {d}
                    </button>
                  ))}
                  <div />
                  <button onClick={() => pressDigit('0')} disabled={loading}
                    className="aspect-square rounded-2xl text-2xl font-light text-gray-700 bg-white border border-gray-100 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-600 active:text-white active:border-blue-600 active:scale-90 transition-all duration-150 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    0
                  </button>
                  <button onClick={backspace} disabled={loading}
                    className="aspect-square rounded-2xl flex items-center justify-center text-gray-400 hover:bg-gray-100 active:scale-90 transition-all duration-150">
                    <Delete className="w-6 h-6" />
                  </button>
                </div>

                <div className="h-6 mt-3 flex justify-center lg:justify-start">
                  {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                </div>

                <div className="mt-3 space-y-2.5 text-center lg:text-left">
                  <button onClick={() => irA('recover-id')} className="block w-full lg:w-auto text-gray-400 text-sm hover:text-gray-600">
                    Olvidé mi PIN
                  </button>
                </div>
              </motion.div>
            )}

            {/* ---------------- ENROLAR: identificador ---------------- */}
            {view === 'enroll-id' && (
              <motion.div key="enroll-id" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Back onClick={() => irA('pin')} />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Es mi primera vez aquí</h2>
                <p className="text-sm text-gray-500 mb-6">Te enviaremos un código, tenemos que verificar que eres tú.</p>

                <Label>Correo o teléfono</Label>
                <Input value={identificador} onChange={setIdentificador} placeholder="tucorreo@gmail.com o 987654321" />

                <button onClick={enviarCodigoEnrolar} disabled={loading} className={btnPrimary + ' mt-2 mb-3'}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Enviarme el código
                </button>

              </motion.div>
            )}

            {/* ---------------- ENROLAR: acceso + código + PIN ---------------- */}
            {view === 'enroll-code' && (
              <motion.div key="enroll-code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Back onClick={() => irA('enroll-id')} />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Crea tu PIN</h2>
                <p className="text-sm text-gray-500 mb-5">Ingresa el código que recibiste y elige tu PIN.</p>

                <Label>Acceso (correo o teléfono)</Label>
                <Input value={identificador} onChange={setIdentificador} placeholder="Correo o teléfono" />
                <Label>Código (6 dígitos)</Label>
                <Digits value={codigo} onChange={setCodigo} />
                <Label>Nuevo PIN (6 dígitos)</Label>
                <Digits value={nuevoPin} onChange={setNuevoPin} secret />
                <Label>Repite tu PIN</Label>
                <Digits value={repitePin} onChange={setRepitePin} secret />

                <button onClick={crearPin} disabled={loading} className={btnPrimary + ' mt-2'}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />} Crear mi PIN
                </button>
                <button onClick={enviarCodigoEnrolar} className="w-full text-gray-400 text-sm py-2 hover:text-gray-600">
                  Reenviar código
                </button>
              </motion.div>
            )}

            {/* ---------------- RECUPERAR: identificador ---------------- */}
            {view === 'recover-id' && (
              <motion.div key="recover-id" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Back onClick={() => irA('pin')} />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Olvidé mi PIN</h2>
                <p className="text-sm text-gray-500 mb-6">Te enviaremos un código.</p>

                <Label>Correo o teléfono</Label>
                <Input value={identificador} onChange={setIdentificador} placeholder="Correo o teléfono" />

                <button onClick={enviarCodigoRecuperar} disabled={loading} className={btnPrimary + ' mt-2'}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Enviarme un código
                </button>
              </motion.div>
            )}

            {/* ---------------- RECUPERAR: código + PIN ---------------- */}
            {view === 'recover-code' && (
              <motion.div key="recover-code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Back onClick={() => irA('recover-id')} />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Nuevo PIN</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Código enviado a <span className="font-medium text-gray-700">{identificador}</span>
                </p>

                <Label>Código (6 dígitos)</Label>
                <Digits value={codigo} onChange={setCodigo} />
                <Label>Nuevo PIN (6 dígitos)</Label>
                <Digits value={nuevoPin} onChange={setNuevoPin} secret />
                <Label>Repite tu PIN</Label>
                <Digits value={repitePin} onChange={setRepitePin} secret />

                <button onClick={cambiarPin} disabled={loading} className={btnPrimary + ' mt-2'}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />} Cambiar mi PIN
                </button>
              </motion.div>
            )}

            {/* ---------------- ENVIADO: revisa tu correo / WhatsApp ---------------- */}
            {view === 'sent' && (
              <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {(() => {
                  const esCorreo = identificador.includes('@')
                  const canal = esCorreo ? 'correo' : 'WhatsApp'
                  const reenviar = flujo === 'enroll' ? enviarCodigoEnrolar
                    : flujo === 'password' ? enviarCodigoPassword : enviarCodigoRecuperar
                  const vistaManual: View = flujo === 'enroll' ? 'enroll-code'
                    : flujo === 'password' ? 'set-password' : 'recover-code'
                  const textoBoton = flujo === 'enroll' ? 'Activar mi acceso'
                    : flujo === 'password' ? 'Crear mi contraseña' : 'Restablecer mi PIN'
                  const vistaAtras: View = flujo === 'enroll' ? 'enroll-id'
                    : flujo === 'password' ? 'recover-pass-id' : 'recover-id'
                  return (
                    <>
                      <Back onClick={() => irA(vistaAtras)} />

                      <div className="flex justify-center lg:justify-start mb-5">
                        <div className="relative w-16 h-16 rounded-2xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
                          {esCorreo
                            ? <MailCheck className="w-8 h-8 text-blue-600" />
                            : <MessageCircle className="w-8 h-8 text-blue-600" />}
                          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center ring-2 ring-white shadow-sm">
                            <Send className="w-3 h-3 text-white" />
                          </span>
                        </div>
                      </div>

                      <h2 className="text-2xl font-bold text-gray-900 mb-1 text-center lg:text-left">
                        Revisa tu {canal}
                      </h2>
                      <p className="text-sm text-gray-500 mb-5 text-center lg:text-left">
                        Te enviamos un enlace a{' '}
                        <span className="font-semibold text-gray-700">{identificador || `tu ${canal}`}</span>.
                        Ábrelo y toca <span className="font-medium text-gray-700">“{textoBoton}”</span> para continuar.
                      </p>

                      <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4 mb-6 flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                        <p className="text-sm text-blue-900/80 leading-relaxed">
                          El enlace ya lleva tu código incluido. No necesitas copiar ni escribir nada — solo ábrelo.
                        </p>
                      </div>

                      <button onClick={reenviar} disabled={loading} className={btnPrimary}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        Reenviar enlace
                      </button>

                      <button onClick={() => irA(vistaManual)}
                        className="w-full text-gray-400 text-sm py-3 hover:text-gray-600 transition">
                        ¿No te llegó? Ingresar el código manualmente
                      </button>
                    </>
                  )
                })()}
              </motion.div>
            )}

            {/* ---------------- CONTRASEÑA: identificador ---------------- */}
            {view === 'recover-pass-id' && (
              <motion.div key="recover-pass-id" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Back onClick={() => irA('password')} />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Olvidé mi contraseña</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Te enviaremos un código.
                </p>

                <Label>Correo o teléfono</Label>
                <Input value={identificador} onChange={setIdentificador} placeholder="tucorreo@gmail.com o 987654321" />

                <button onClick={enviarCodigoPassword} disabled={loading} className={btnPrimary + ' mt-2'}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Enviarme el código
                </button>

              </motion.div>
            )}

            {/* ---------------- CONTRASEÑA: código + nueva contraseña ---------------- */}
            {view === 'set-password' && (
              <motion.div key="set-password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Back onClick={() => irA('recover-pass-id')} />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Tu contraseña</h2>
                <p className="text-sm text-gray-500 mb-5">Ingresa el código que recibiste y crea tu contraseña.</p>

                <Label>Acceso (correo o teléfono)</Label>
                <Input value={identificador} onChange={setIdentificador} placeholder="Correo o teléfono" />
                <Label>Código (6 dígitos)</Label>
                <Digits value={codigo} onChange={setCodigo} />
                <Label>Nueva contraseña</Label>
                <PassInput value={nuevaPass} onChange={setNuevaPass} placeholder="Mínimo 8 caracteres" />
                <Label>Repite tu contraseña</Label>
                <PassInput value={repitePass} onChange={setRepitePass} placeholder="Repite la contraseña" />

                <button onClick={establecerPassword} disabled={loading} className={btnPrimary + ' mt-2'}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />} Guardar contraseña
                </button>
                <button onClick={enviarCodigoPassword} className="w-full text-gray-400 text-sm py-2 hover:text-gray-600">
                  Reenviar código
                </button>
              </motion.div>
            )}

            {/* ---------------- INGRESO TRADICIONAL ---------------- */}
            {view === 'password' && (
              <motion.div key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="hidden lg:block mb-6">
                  <img src="/barber-logo-black.png" alt="Barber.PE" className="h-9 mb-2" />
                  <p className="text-gray-400 text-sm mt-1">Ingresa para gestionar tu barbería</p>
                </div>
                <p className="lg:hidden text-center text-gray-500 text-sm mb-5">Ingresa para gestionar tu barbería</p>

                <Label>Correo o teléfono</Label>
                <Input value={correo} onChange={setCorreo} placeholder="Correo o teléfono" />
                <Label>Contraseña</Label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••"
                  onKeyDown={(e) => e.key === 'Enter' && loginPassword()}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />

                <button onClick={loginPassword} disabled={loading} className={btnPrimary + ' mt-1'}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />} Entrar
                </button>
                <button onClick={() => irA('recover-pass-id')}
                  className="w-full text-gray-400 text-sm py-2 mt-1 hover:text-gray-600 transition">
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
                    {/* Botón oficial de Google (lo inyecta Identity Services) */}
                    <div ref={googleBtnRef} className="w-full flex justify-center" style={{ colorScheme: 'light' }} />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {view === 'pin' && (
            <button onClick={() => irA('password')}
              className="block w-full mt-7 text-xs text-blue-600 hover:text-blue-700 text-center lg:text-left font-bold tracking-wide uppercase transition">
              Ingreso Tradicional
            </button>
          )}
          {view === 'password' && (
            <button onClick={() => irA('pin')}
              className="block w-full mt-7 text-xs text-blue-600 hover:text-blue-700 text-center lg:text-left font-bold tracking-wide uppercase transition">
              Ingresar con PIN
            </button>
          )}
        </motion.div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- helpers UI */
const btnPrimary =
  'w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-600/20 active:scale-[0.99]'

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-4 transition">
      <ArrowLeft className="w-4 h-4" /> Atrás
    </button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoCapitalize="none"
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
  )
}

function PassInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative mb-4">
      <input value={value} onChange={(e) => onChange(e.target.value)} type={show ? 'text' : 'password'} placeholder={placeholder}
        className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
      <button type="button" onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 active:scale-90 transition"
        aria-label={show ? 'Ocultar' : 'Mostrar'}>
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  )
}

function Digits({ value, onChange, secret }: { value: string; onChange: (v: string) => void; secret?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative mb-4">
      <input value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric" type={secret && !show ? 'password' : 'text'}
        className={`w-full text-center text-2xl tracking-[0.4em] font-mono px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition ${secret ? 'pr-12' : ''}`} />
      {secret && (
        <button type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 active:scale-90 transition"
          aria-label={show ? 'Ocultar' : 'Mostrar'}>
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      )}
    </div>
  )
}
