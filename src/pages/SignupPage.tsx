import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Send, Loader2, UserPlus, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { setTenant, clearTenant } from '@/services/apiClient'

type Tipo = 'Cliente' | 'Profesional'
type Step = 'choose' | 'code' | 'form'

/**
 * Auto-registro estilo Fresha (cualquiera se da de alta solo).
 *  1) choose  → elige Profesional/Cliente + correo o teléfono → manda el código.
 *  2) code    → ingresa el código de verificación que recibió.
 *  3) form    → completa sus datos + contraseña → crea la cuenta y entra logueado.
 *
 * Cuentas separadas: si el correo/teléfono ya existe, el backend responde
 * "ya está en uso" y se muestra el aviso en el paso 1.
 */
export function SignupPage() {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()

  const [step, setStep] = useState<Step>('choose')
  const [loading, setLoading] = useState(false)

  const [tipo, setTipo] = useState<Tipo>('Cliente')
  const [identificador, setIdentificador] = useState('')
  const [codigo, setCodigo] = useState('')

  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [password, setPassword] = useState('')

  const esEmail = identificador.includes('@')

  // ---------------------------------------------------------------- paso 1
  const solicitarCodigo = async () => {
    if (!identificador.trim()) {
      toast.error('Ingresa tu correo o teléfono.')
      return
    }
    setLoading(true)
    try {
      await authService.signupSolicitar(tipo, identificador.trim())
      // Precarga el contacto verificado en el formulario final.
      if (esEmail) setCorreo(identificador.trim().toLowerCase())
      else setTelefono(identificador.trim())
      setStep('code')
      toast.success('Te enviamos un código de verificación.')
    } catch (e: any) {
      // El backend manda "El correo/teléfono ya está en uso..." si ya existe.
      toast.error(e?.message || 'No pudimos enviar el código. Revisa el dato e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------- paso 2
  const continuarConCodigo = () => {
    if (codigo.length !== 6) {
      toast.error('Ingresa los 6 dígitos del código.')
      return
    }
    setStep('form')
  }

  // ---------------------------------------------------------------- paso 3
  const crearCuenta = async () => {
    if (!nombre.trim()) { toast.error('Ingresa tu nombre.'); return }
    if (tipo === 'Profesional' && !nombreNegocio.trim()) {
      toast.error('Ingresa el nombre de tu negocio.'); return
    }
    if (password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres.'); return }

    setLoading(true)
    try {
      const resp = await authService.signupCompletar({
        tipo,
        identificador: identificador.trim(),
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        apellido: apellido.trim() || undefined,
        correo: correo.trim() || undefined,
        telefono: telefono.trim() || undefined,
        nombreNegocio: tipo === 'Profesional' ? nombreNegocio.trim() : undefined,
        password,
      })
      if (!resp) { toast.error('No pudimos crear la cuenta. Intenta de nuevo.'); return }
      entrar(resp.token, resp.user)
    } catch (e: any) {
      toast.error(e?.message || 'No pudimos crear la cuenta. Revisa el código e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Sesión + redirección por rol (mismo criterio que LoginPage).
  const entrar = (token: string, user: any) => {
    setToken(token)
    setUser(user)
    if (user.rol === 'Cliente') {
      clearTenant()
      navigate('/')
    } else {
      // Profesional/Admin recién creado: aún sin sede, va a completar/dashboard.
      try { if (user.subdominio) setTenant(user.subdominio) } catch { /* sin sede aún */ }
      navigate('/dashboard')
    }
    toast.success('¡Cuenta creada! Bienvenido.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8">
        <AnimatePresence mode="wait">

          {/* ---------------------------------------------------- PASO 1 */}
          {step === 'choose' && (
            <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Crea tu cuenta</h1>
              <p className="text-sm text-gray-500 mb-6">Regístrate para reservar o gestionar tu negocio.</p>

              <Label>Quiero registrarme como</Label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as Tipo)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition appearance-none">
                <option value="Cliente">Cliente — para reservar citas</option>
                <option value="Profesional">Profesional — tengo un negocio</option>
              </select>

              <Label>Correo o teléfono</Label>
              <Input
                value={identificador}
                onChange={setIdentificador}
                placeholder="tucorreo@gmail.com o 987654321"
                onEnter={solicitarCodigo}
              />
              <p className="text-xs text-gray-400 -mt-2 mb-4">Te enviaremos un código de verificación.</p>

              <button onClick={solicitarCodigo} disabled={loading} className={btnPrimary}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Continuar
              </button>

              <button onClick={() => navigate('/login')}
                className="w-full text-gray-400 text-sm py-3 hover:text-gray-600 transition">
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            </motion.div>
          )}

          {/* ---------------------------------------------------- PASO 2 */}
          {step === 'code' && (
            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back onClick={() => setStep('choose')} />
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Confirma tu código</h1>
              <p className="text-sm text-gray-500 mb-5">
                Te enviamos un código a <span className="font-semibold text-gray-700">{identificador}</span>.
              </p>

              <Digits value={codigo} onChange={setCodigo} />

              <button onClick={continuarConCodigo} disabled={loading} className={btnPrimary + ' mt-1'}>
                Continuar
              </button>

              <button onClick={solicitarCodigo} disabled={loading}
                className="w-full text-gray-400 text-sm py-3 hover:text-gray-600 transition">
                ¿No te llegó? Reenviar código
              </button>
            </motion.div>
          )}

          {/* ---------------------------------------------------- PASO 3 */}
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Back onClick={() => setStep('code')} />
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Finaliza tu registro</h1>
              <p className="text-sm text-gray-500 mb-5">Necesitamos algunos datos más.</p>

              {tipo === 'Profesional' && (
                <>
                  <Label>Nombre del negocio</Label>
                  <Input value={nombreNegocio} onChange={setNombreNegocio} placeholder="Mi Barbería" />
                </>
              )}

              <Label>Nombre</Label>
              <Input value={nombre} onChange={setNombre} placeholder="Tu nombre" />

              <Label>Apellido</Label>
              <Input value={apellido} onChange={setApellido} placeholder="Tu apellido" />

              <Label>Correo</Label>
              <Input
                value={correo}
                onChange={setCorreo}
                placeholder="tucorreo@gmail.com"
                readOnly={esEmail}
              />

              <Label>Teléfono</Label>
              <Input
                value={telefono}
                onChange={setTelefono}
                placeholder="987654321"
                readOnly={!esEmail}
              />

              <Label>Crea tu contraseña</Label>
              <PassInput value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />

              <button onClick={crearCuenta} disabled={loading} className={btnPrimary + ' mt-2'}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />} Crear cuenta
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Componentes visuales (mismo estilo que LoginPage)
// ─────────────────────────────────────────────────────────────────────────
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

function Input({
  value, onChange, placeholder, readOnly, onEnter,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean; onEnter?: () => void
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter() }}
      placeholder={placeholder}
      readOnly={readOnly}
      autoCapitalize="none"
      className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition ${readOnly ? 'text-gray-500 cursor-not-allowed' : ''}`} />
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

function Digits({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-4">
      <input value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        className="w-full text-center text-2xl tracking-[0.4em] font-mono px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
    </div>
  )
}
