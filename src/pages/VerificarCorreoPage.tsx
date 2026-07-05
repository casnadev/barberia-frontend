import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { verificacionCorreoService } from '@/services/verificacionCorreoService'
import { useAuthStore } from '@/store/authStore'

type Estado = 'cargando' | 'ok' | 'error'

export function VerificarCorreoPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const logueado = useAuthStore((s) => !!s.token)

  const [estado, setEstado] = useState<Estado>('cargando')
  const [nombre, setNombre] = useState<string>('')
  const [mensaje, setMensaje] = useState<string>('')
  const [reenviando, setReenviando] = useState(false)
  const yaCorrio = useRef(false)

  useEffect(() => {
    if (yaCorrio.current) return
    yaCorrio.current = true
    ;(async () => {
      if (!token) {
        setEstado('error')
        setMensaje('El enlace no es válido.')
        return
      }
      try {
        const r = await verificacionCorreoService.confirmar(token)
        setNombre(r.nombre || '')
        setEstado('ok')
      } catch (err: any) {
        setEstado('error')
        setMensaje(err?.response?.data?.message || 'El enlace no es válido o ya venció.')
      }
    })()
  }, [token])

  const reenviar = async () => {
    if (!logueado) {
      toast.info('Inicia sesión en tu panel y reenvía el correo desde ahí.')
      return
    }
    try {
      setReenviando(true)
      await verificacionCorreoService.reenviar()
      toast.success('Te enviamos un nuevo correo de verificación.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo reenviar el correo.')
    } finally {
      setReenviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] flex flex-col">
      {/* Banner de marca */}
      <div className="bg-[#0E0E10] px-6 py-5">
        <div className="max-w-xl mx-auto flex items-baseline gap-[2px] text-white text-2xl font-extrabold tracking-tight">
          <span>barber</span>
          <span className="w-[9px] h-[9px] rounded-full bg-[#2E6BF0] inline-block self-end mb-[6px] mx-[3px]" />
          <span>pe</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 text-center"
        >
          {estado === 'cargando' && (
            <>
              <Loader2 className="w-12 h-12 text-gray-400 mx-auto animate-spin" />
              <h1 className="mt-5 text-xl font-semibold text-gray-900">Confirmando tu correo…</h1>
              <p className="mt-2 text-sm text-gray-500">Un momento por favor.</p>
            </>
          )}

          {estado === 'ok' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-green-600" />
              </div>
              <h1 className="mt-5 text-xl font-semibold text-gray-900">¡Correo confirmado!</h1>
              <p className="mt-2 text-sm text-gray-600">
                {nombre ? `Listo, ${nombre}. ` : 'Listo. '}
                Tu correo quedó verificado y ya puedes ingresar también con contraseña.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-[#0E0E10] text-white font-semibold text-sm py-3 rounded-xl hover:bg-black transition"
              >
                <MailCheck className="w-4 h-4" /> Ir a mi panel
              </button>
            </>
          )}

          {estado === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                <XCircle className="w-9 h-9 text-red-500" />
              </div>
              <h1 className="mt-5 text-xl font-semibold text-gray-900">No pudimos confirmar tu correo</h1>
              <p className="mt-2 text-sm text-gray-600">{mensaje}</p>
              <button
                onClick={reenviar}
                disabled={reenviando}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-[#0E0E10] text-white font-semibold text-sm py-3 rounded-xl hover:bg-black transition disabled:opacity-60"
              >
                {reenviando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {reenviando ? 'Enviando…' : 'Reenviar correo de verificación'}
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Ir a mi panel
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
