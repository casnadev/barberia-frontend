import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MailPlus, X, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { perfilService, type MiPerfil } from '@/services/perfilService'
import { verificacionCorreoService } from '@/services/verificacionCorreoService'

// Se oculta SOLO por la sesión actual (sessionStorage): vuelve en la próxima.
const SESSION_KEY = 'nudge_correo_off'

/**
 * Nudge de correo (Bloque 4). Tono BENEFICIO, no alarma: la cuenta ya es segura
 * con teléfono + contraseña. Aparece para quien no tenga el correo confirmado.
 * - Sin correo → campo para agregarlo (dispara verificación en el backend).
 * - Con correo sin confirmar → botón para reenviar el correo de verificación.
 * Minimizable ("Ahora no"), pero reaparece en la siguiente sesión.
 */
export function NudgeCorreo() {
  const [perfil, setPerfil] = useState<MiPerfil | null>(null)
  const [oculto, setOculto] = useState<boolean>(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const [correo, setCorreo] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vivo = true
    perfilService.getMiPerfil().then((p) => { if (vivo) setPerfil(p) }).catch(() => {})
    return () => { vivo = false }
  }, [])

  if (oculto || !perfil) return null
  if (perfil.correoConfirmado) return null

  const tieneCorreo = !!perfil.correo?.trim()

  const ocultar = () => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setOculto(true)
  }

  const agregarCorreo = async () => {
    const c = correo.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) {
      toast.error('Ingresa un correo válido.')
      return
    }
    try {
      setEnviando(true)
      // El backend, al detectar correo nuevo, dispara la verificación automáticamente.
      await perfilService.updateMiPerfil({ nombreCompleto: perfil.nombreCompleto, correo: c })
      toast.success('Te enviamos un correo para confirmarlo. Revisa tu bandeja.')
      setPerfil({ ...perfil, correo: c, correoConfirmado: false })
      setCorreo('')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo guardar el correo.')
    } finally {
      setEnviando(false)
    }
  }

  const reenviar = async () => {
    try {
      setEnviando(true)
      await verificacionCorreoService.reenviar()
      toast.success('Te reenviamos el correo de verificación.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo reenviar el correo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3.5"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {tieneCorreo ? 'Confirma tu correo' : 'Agrega y confirma tu correo'}
            </p>
            <p className="mt-0.5 text-sm text-gray-600">
              {tieneCorreo
                ? 'Confírmalo para no perderte avisos de tu plan y activar el ingreso también por correo.'
                : 'Así no te pierdes avisos de tu plan y activas el ingreso también por correo.'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {tieneCorreo ? (
                <button
                  onClick={reenviar}
                  disabled={enviando}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0E0E10] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                >
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                  {enviando ? 'Enviando…' : 'Reenviar correo de verificación'}
                </button>
              ) : (
                <>
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') agregarCorreo() }}
                    placeholder="tucorreo@ejemplo.com"
                    autoCapitalize="none"
                    className="min-w-[200px] flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    onClick={agregarCorreo}
                    disabled={enviando}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0E0E10] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                  >
                    {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                    {enviando ? 'Guardando…' : 'Agregar correo'}
                  </button>
                </>
              )}
              <button onClick={ocultar} className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition hover:text-gray-700">
                Ahora no
              </button>
            </div>
          </div>

          <button onClick={ocultar} aria-label="Cerrar" className="text-gray-400 transition hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
