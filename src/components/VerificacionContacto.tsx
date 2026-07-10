import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react'
import { verificacionContactoService } from '@/services/verificacionContactoService'

type Canal = 'correo' | 'telefono'

/**
 * Fila de verificación de un contacto (correo o teléfono) con un check elegante.
 * - Verificado  -> badge verde "Verificado".
 * - Sin verificar y con valor -> botón "Verificar" que envía el código y pide confirmarlo.
 * - Sin valor -> aviso para agregarlo y guardar primero.
 * Tarea 2. El correo llega por email; el teléfono, por WhatsApp.
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
  const [fase, setFase] = useState<'idle' | 'enviado'>('idle')
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [ok, setOk] = useState(Boolean(verificado))

  const etiqueta = canal === 'correo' ? 'Correo' : 'Teléfono'
  const via = canal === 'correo' ? 'a tu correo' : 'por WhatsApp'
  const norm = (v?: string) => (v || '').trim().toLowerCase()
  const sinGuardar = Boolean(valor && valor.trim() && norm(valor) !== norm(guardado))

  if (ok) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold mt-1">
        <CheckCircle2 className="w-4 h-4" /> {etiqueta} verificado
      </div>
    )
  }

  if (!valor || !valor.trim()) {
    return (
      <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
        <ShieldAlert className="w-4 h-4" /> Agrega tu {etiqueta.toLowerCase()} y guarda para verificarlo.
      </div>
    )
  }

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
      setFase('enviado')
      toast.success(`Te enviamos un código ${via}.`)
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

  return (
    <div className="mt-1.5">
      {fase === 'idle' ? (
        <button
          type="button"
          onClick={enviar}
          disabled={cargando}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 hover:bg-amber-100 disabled:opacity-50"
        >
          {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          Verificar {etiqueta.toLowerCase()}
        </button>
      ) : (
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
      )}
    </div>
  )
}
