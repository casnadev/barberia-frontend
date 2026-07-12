import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CircleNotch as Loader2, MapPin, Warning as AlertTriangle } from '@phosphor-icons/react'
import SeccionSheet from './SeccionSheet'
import { sedeTenantService, EstadoPublicacion } from '@/services/sedeTenantService'

/**
 * "Elige qué locales quedan activos": aparece cuando la empresa tiene más locales
 * públicos que su límite de plan (downgrade/expiración). El dueño marca cuáles
 * quedan públicos; el resto pasa a no-público (NegocioPausado) sin borrar datos.
 * (Bloque A · Tanda 3.)
 */
export default function LocalesActivosModal({
  open,
  onClose,
  estadoInicial,
  onGuardado,
}: {
  open: boolean
  onClose: () => void
  estadoInicial: EstadoPublicacion
  onGuardado?: (e: EstadoPublicacion) => void
}) {
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    setSel(new Set(estadoInicial.sedes.filter((s) => s.esPublica).map((s) => s.idSede)))
  }, [open, estadoInicial])

  const limite = estadoInicial.limite
  const excede = limite != null && sel.size > limite
  const toggle = (id: number) => {
    setSel((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const guardar = async () => {
    if (excede) { toast.error(`Elige como máximo ${limite} local(es).`); return }
    setGuardando(true)
    try {
      const nuevo = await sedeTenantService.definirPublicas([...sel])
      toast.success('Locales activos actualizados ✓')
      onGuardado?.(nuevo)
      onClose()
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.response?.data?.mensaje || e?.response?.data?.message
      toast.error(msg || 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <SeccionSheet
      open={open}
      onClose={onClose}
      titulo="Elige qué locales quedan activos"
      subtitulo={
        limite != null
          ? `Tu plan permite ${limite} local(es) público(s). Los no elegidos quedarán en pausa (sin borrarse).`
          : 'Elige qué locales quedan públicos.'
      }
      footer={
        <button
          onClick={guardar}
          disabled={guardando || excede}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Guardar ({sel.size}{limite != null ? `/${limite}` : ''})
        </button>
      }
    >
      <div className="space-y-2">
        {excede && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Seleccionaste {sel.size}. Deja como máximo {limite}.</span>
          </div>
        )}
        {estadoInicial.sedes.map((s) => {
          const activo = sel.has(s.idSede)
          return (
            <button
              key={s.idSede}
              onClick={() => toggle(s.idSede)}
              className={`w-full text-left flex items-center gap-3 rounded-xl border p-3 transition ${
                activo ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${activo ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                <MapPin className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-gray-900 truncate">{s.nombre}</span>
                <span className="block text-xs text-gray-500 truncate">{s.subdominio}</span>
              </span>
              <input
                type="checkbox"
                checked={activo}
                readOnly
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
              />
            </button>
          )
        })}
      </div>
    </SeccionSheet>
  )
}
