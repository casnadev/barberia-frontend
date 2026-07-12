import { useEffect, useState } from 'react'
import { Warning as AlertTriangle } from '@phosphor-icons/react'
import { sedeTenantService, EstadoPublicacion } from '@/services/sedeTenantService'
import LocalesActivosModal from './LocalesActivosModal'

/**
 * Se muestra en el panel del Admin cuando la empresa tiene más locales públicos
 * que su límite de plan (downgrade/expiración): banner + modal para elegir cuáles
 * quedan activos. Si todo está en orden, no renderiza nada. (Bloque A · Tanda 3.)
 */
export default function AvisoLocalesActivos() {
  const [estado, setEstado] = useState<EstadoPublicacion | null>(null)
  const [modal, setModal] = useState(false)

  useEffect(() => {
    let cancelado = false
    sedeTenantService
      .getEstadoPublicacion()
      .then((e) => {
        if (cancelado) return
        setEstado(e)
        if (e.requiereEleccion) setModal(true) // auto-abre cuando hay que decidir
      })
      .catch(() => { /* silencioso: no bloquea el panel */ })
    return () => { cancelado = true }
  }, [])

  if (!estado || !estado.requiereEleccion) {
    // Aun así montamos el modal para permitir reabrirlo tras cerrar, si aplica.
    return estado ? (
      <LocalesActivosModal
        open={modal}
        onClose={() => setModal(false)}
        estadoInicial={estado}
        onGuardado={setEstado}
      />
    ) : null
  }

  return (
    <>
      <div className="mx-3 mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            Tienes {estado.publicasActuales} locales públicos y tu plan permite {estado.limite}.
          </p>
          <p className="text-xs text-amber-700">Elige cuáles quedan activos; el resto quedará en pausa (sin borrarse).</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold"
        >
          Elegir
        </button>
      </div>

      <LocalesActivosModal
        open={modal}
        onClose={() => setModal(false)}
        estadoInicial={estado}
        onGuardado={setEstado}
      />
    </>
  )
}
