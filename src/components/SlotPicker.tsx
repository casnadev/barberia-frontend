import { useEffect, useMemo, useState } from 'react'
import { CaretLeft as ChevronLeft, CaretRight as ChevronRight, Clock } from '@phosphor-icons/react'
import { reservasService } from '@/services/reservasService'

interface SlotPickerProps {
  idTrabajador: number
  idServicio?: number
  fecha: string                       // "YYYY-MM-DD"
  hora: string                        // "HH:mm:ss" o ""
  onSelectFecha: (fecha: string) => void
  onSelectHora: (hora: string) => void
  dias?: number                       // cuántos días mostrar en el strip (def. 21)
}

const WD = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Selector de fecha (strip horizontal) + horas disponibles, con el mismo look
 * del flujo "Reservar Cita". Reutilizable en reservar y reprogramar.
 */
export function SlotPicker({ idTrabajador, idServicio, fecha, hora, onSelectFecha, onSelectHora, dias = 21 }: SlotPickerProps) {
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fechas = useMemo(() => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    return Array.from({ length: dias }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return d
    })
  }, [dias])

  useEffect(() => {
    if (!fecha || !idTrabajador) { setSlots([]); return }
    setLoading(true)
    reservasService.getSlotsDisponibles(idTrabajador, fecha, idServicio)
      .then(s => setSlots(Array.isArray(s) ? s : []))
      .finally(() => setLoading(false))
  }, [fecha, idTrabajador, idServicio])

  const scroll = (dir: number) => {
    const el = document.getElementById('sp-strip')
    el?.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  return (
    <div>
      {/* Strip de fechas */}
      <div className="flex items-center gap-2">
        <button onClick={() => scroll(-1)} className="shrink-0 w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div id="sp-strip" className="flex gap-2 overflow-x-auto scrollbar-none py-1" style={{ scrollbarWidth: 'none' }}>
          {fechas.map((d) => {
            const val = iso(d)
            const sel = val === fecha
            return (
              <button key={val} onClick={() => { onSelectFecha(val); onSelectHora('') }}
                className={`shrink-0 w-16 rounded-2xl border py-2 text-center transition ${sel ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'}`}>
                <div className={`text-[10px] font-semibold ${sel ? 'text-blue-100' : 'text-gray-400'}`}>{WD[d.getDay()]}</div>
                <div className="text-lg font-bold leading-tight">{d.getDate()}</div>
                <div className={`text-[10px] ${sel ? 'text-blue-100' : 'text-gray-400'}`}>{MES[d.getMonth()]}</div>
              </button>
            )
          })}
        </div>
        <button onClick={() => scroll(1)} className="shrink-0 w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Horas */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-600" /> Elige una hora</h4>
        {!fecha ? (
          <p className="text-sm text-gray-400">Elige una fecha para ver horarios.</p>
        ) : loading ? (
          <div className="text-sm text-gray-400 py-4 text-center">Cargando horarios…</div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Sin horarios disponibles ese día.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {slots.map((s, i) => {
              const sel = s.horaInicio === hora
              return (
                <button key={i} onClick={() => onSelectHora(s.horaInicio)}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition ${sel ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'}`}>
                  {s.etiqueta || (s.horaInicio || '').slice(0, 5)}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
