import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Scissors, ArrowLeft, Delete, ShieldCheck, KeyRound, Send, Loader2, LogIn,
  CalendarCheck, Users, Wallet, Eye, EyeOff,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { pinAuthService } from '@/services/pinAuthService'
import { authService } from '@/services/authService'
import { setTenant, clearTenant } from '@/services/apiClient'
import { sedeTenantService } from '@/services/sedeTenantService'

type View = 'pin' | 'password' | 'enroll-id' | 'enroll-code' | 'recover-id' | 'recover-code'
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

  const [view, setView] = useState<View>('pin')
  const [loading, setLoading] = useState(false)

  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [showPin, setShowPin] = useState(false)

  const [identificador, setIdentificador] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nuevoPin, setNuevoPin] = useState('')
  const [repitePin, setRepitePin] = useState('')

  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')

  // ----------------------------------------------------------- routing
  const entrar = async (token: string, user: any, subdominio?: string) => {
    setToken(token); setUser(user)
    if (user.rol === 'SuperAdmin') clearTenant()
    else if (subdominio) setTenant(subdominio)
    else {
      try {
        const sedes = await sedeTenantService.getMisSedes()
        if (sedes[0]?.subdominio) setTenant(sedes[0].subdominio)
      } catch { /* sin sede aun */ }
    }
    const rutas: Record<string, string> = {
      SuperAdmin: '/super-admin', Admin: '/dashboard', Trabajador: '/mi-agenda', Cliente: '/mi-perfil',
    }
    navigate(rutas[user.rol] ?? '/dashboard')
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
    toast.success('Si tu cuenta existe, te enviamos un código.')
    setView('enroll-code')
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
    toast.success('Si tu cuenta existe, te enviamos un código.')
    setView('recover-code')
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

  const limpiar = () => { setCodigo(''); setNuevoPin(''); setRepitePin('') }
  const irA = (v: View) => { setPinError(''); limpiar(); setView(v) }

  // ================================================================= UI
  return (
    <div className="min-h-screen flex bg-white">
      {/* ===================== PANEL DE MARCA (desktop) ===================== */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white p-12 flex-col justify-between">
        {/* blobs decorativos */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-10%] right-[-5%] w-[28rem] h-[28rem] bg-cyan-300/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 right-1/4 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl" />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center ring-1 ring-white/20">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Barber.PE</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Tu barbería,<br /><span className="text-blue-200">en orden.</span>
          </h2>
          <p className="mt-4 text-blue-100/80 text-lg max-w-sm">
            Reservas, agenda, caja y tu equipo — todo en un solo lugar.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: CalendarCheck, t: 'Reservas y agenda online' },
              { icon: Users, t: 'Tu equipo y sus comisiones' },
              { icon: Wallet, t: 'Caja, pagos y reportes' },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-blue-50/90">{f.t}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="relative z-10 text-xs text-blue-200/60">© {new Date().getFullYear()} Barber.PE · Hecho en Perú</div>
      </div>

      {/* ===================== PANEL DE FORMULARIO ===================== */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* glow sutil de fondo (solo móvil, para que no se vea vacío) */}
        <div className="lg:hidden pointer-events-none absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-50 to-transparent" />

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm">
          {/* Logo (solo móvil) */}
          <div className="lg:hidden text-center mb-7">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Scissors className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Barber.PE</h1>
          </div>

          <AnimatePresence mode="wait">
            {/* ---------------- PIN DIARIO ---------------- */}
            {view === 'pin' && (
              <motion.div key="pin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="hidden lg:block mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h2>
                  <p className="text-gray-400 text-sm mt-1">Ingresa tu PIN para continuar</p>
                </div>
                <p className="lg:hidden text-center text-gray-500 text-sm mb-5">Ingresa tu PIN</p>

                <div className="flex items-center justify-center lg:justify-start gap-3 mb-1">
                  {Array.from({ length: 6 }).map((_, i) =>
                    showPin ? (
                      <span key={i} className="w-3.5 h-5 flex items-center justify-center text-xl font-light leading-none text-blue-700">
                        {pin[i] ?? ''}
                      </span>
                    ) : (
                      <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        i < pin.length ? 'bg-blue-600 scale-110 shadow-sm shadow-blue-600/40' : 'bg-gray-200'}`} />
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
                  {['1','2','3','4','5','6','7','8','9'].map((d) => (
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
                  <button onClick={() => irA('enroll-id')} className="block w-full lg:w-auto text-blue-600 font-semibold text-sm hover:underline">
                    Es mi primera vez aquí →
                  </button>
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
                <button onClick={() => irA('enroll-code')} className="w-full text-blue-600 font-medium py-2 text-sm hover:underline">
                  Ya tengo un código
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
                <p className="text-sm text-gray-500 mb-6">Te enviaremos un código para crear uno nuevo.</p>

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

            {/* ---------------- INGRESO TRADICIONAL ---------------- */}
            {view === 'password' && (
              <motion.div key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Back onClick={() => irA('pin')} />
                <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-blue-600" /> Acceso al sistema
                </h2>
                <p className="text-sm text-gray-500 mb-5">Ingreso con contraseña.</p>

                <Label>Correo o teléfono</Label>
                <Input value={correo} onChange={setCorreo} placeholder="Correo o teléfono" />
                <Label>Contraseña</Label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••"
                  onKeyDown={(e) => e.key === 'Enter' && loginPassword()}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />

                <button onClick={loginPassword} disabled={loading} className={btnPrimary + ' mt-1'}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />} Entrar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {view === 'pin' && (
            <button onClick={() => irA('password')}
              className="block w-full mt-7 text-xs text-gray-400 hover:text-blue-600 text-center lg:text-left font-semibold tracking-wide uppercase transition">
              Ingreso Tradicional
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
