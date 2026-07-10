import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, ShieldAlert, Loader2, MailCheck } from 'lucide-react'
import { verificacionContactoService } from '@/services/verificacionContactoService'

type Canal = 'correo' | 'telefono'

/**
 * Fila de verificación de un contacto (correo o teléfono) con un check elegante.
 * El código OTP se genera SOLO al pulsar "Verificar" (nunca al guardar el perfil).
 * Tras enviarlo queda en modo "Verificación enviada" con opción de reenviar.
 * - Verificado        -> badge verde "Verificado".
 * - Con valor guardado -> botón "Verificar" -> input de código + confirmar/reenviar.
 * - Sin valor          -> aviso para agregarlo y guardar primero.
 * - Editado sin guardar -> aviso para guardar antes de verificar.
 * El correo llega por email; el teléfono, por WhatsApp. (Tareas 2 y ajustes.)
 */
export function VerificacionContacto({
  canal,
  valor,
  guardado,
  verificado,
  onVerificado,
}: {
  canal: Canal
  valor?: string
  /** Valor actualmente GUARDADO en el backend (lo que se verificará). */
  guardado?: string
  verificado?: boolean
  onVerificado?: () => void
}) {
  const [enviado, setEnviado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [ok, setOk] = useState(Boolean(verificado))

  const etiqueta = canal === 'correo' ? 'Correo' : 'Teléfono'
  const via = canal === 'correo' ? 'a tu correo' : 'a tu WhatsApp'
  const norm = (v?: string) => (v || '').trim().toLowerCase()
  const hayValor = Boolean(valor && valor.trim())
  const sinGuardar = hayValor && norm(valor) !== norm(guardado)

  // 1) Sin dato: nada que verificar (esto va ANTES del badge verde).
  if (!hayValor) {
    return (
      <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
        <ShieldAlert className="w-4 h-4" /> Agrega tu {etiqueta.toLowerCase()} y guarda para verificarlo.
      </div>
    )
  }

  // 2) Ya verificado.
  if (ok) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold mt-1">
        <CheckCircle2 className="w-4 h-4" /> {etiqueta} verificado
      </div>
    )
  }

  // 3) Editado pero no guardado: se verifica el dato guardado.
  if (sinGuardar) {
    return (
      <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
        <ShieldAlert className="w-4 h-4" /> Guarda los cambios para verificar tu {etiqueta.toLowerCase()}.
      </div>
    )
  }

  const enviar = async () => {
    setCargando(true)
    try {
      if (canal === 'correo') await verificacionContactoService.enviarCorreo()
      else await verificacionContactoService.enviarTelefono()
      setEnviado(true)
      toast.success('Verificación enviada')
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje || e?.response?.data?.message || 'No se pudo enviar el código.')
    } finally { setCargando(false) }
  }

  const confirmar = async () => {
    if (!codigo.trim()) return toast.error('Ingresa el código.')
    setCargando(true)
    try {
      if (canal === 'correo') await verificacionContactoService.confirmarCorreo(codigo.trim())
      else await verificacionContactoService.confirmarTelefono(codigo.trim())
      setOk(true)
      toast.success(`¡${etiqueta} verificado!`)
      onVerificado?.()
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje || e?.response?.data?.message || 'Código incorrecto o expirado.')
    } finally { setCargando(false) }
  }

  // 4a) Aún no se envió: botón Verificar.
  if (!enviado) {
    return (
      <div className="mt-1.5">
        <button
          type="button"
          onClick={enviar}
          disabled={cargando}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 hover:bg-amber-100 disabled:opacity-50"
        >
          {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          Verificar {etiqueta.toLowerCase()}
        </button>
      </div>
    )
  }

  // 4b) Enviado: mensaje persistente + input + confirmar/reenviar.
  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-medium">
        <MailCheck className="w-3.5 h-3.5" /> Verificación enviada {via}.
      </div>
      <div className="flex items-center gap-2">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          maxLength={8}
          placeholder="Código"
          className="w-24 rounded-lg border border-gray-200 px-2.5 py-1 text-sm"
        />
        <button
          type="button"
          onClick={confirmar}
          disabled={cargando}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-50"
        >
          {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Confirmar
        </button>
        <button type="button" onClick={enviar} disabled={cargando} className="text-xs text-gray-500 underline">
          Reenviar
        </button>
      </div>
      <p className="text-[11px] text-gray-400 leading-snug">
        ¿No te llegó? Revisa spam/WhatsApp y usa “Reenviar”. Si te pide esperar, es por seguridad: intenta de nuevo en unos segundos.
      </p>
    </div>
  )
}
