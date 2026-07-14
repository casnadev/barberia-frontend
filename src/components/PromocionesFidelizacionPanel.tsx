import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  CircleNotch, Plus, Trash, PencilSimple, X, Check,
  Lightning, CalendarDots, Confetti,
} from '@phosphor-icons/react'
import {
  fidelizacionService,
  type PromocionFidel,
  type GuardarPromocion,
} from '@/services/fidelizacionService'
import { ComboBox } from '@/components/ComboBox'
import { CalendarModal } from '@/pages/cliente/CalendarModal'
import { CalendarBlank } from '@phosphor-icons/react'

const DIAS = [
  { v: '', label: 'Todos los días' },
  { v: '0', label: 'Domingo' },
  { v: '1', label: 'Lunes' },
  { v: '2', label: 'Martes' },
  { v: '3', label: 'Miércoles' },
  { v: '4', label: 'Jueves' },
  { v: '5', label: 'Viernes' },
  { v: '6', label: 'Sábado' },
]
const nombreDia = (d?: number | null) =>
  d === null || d === undefined ? 'Todos los días' : (DIAS.find(x => x.v === String(d))?.label ?? '—')

const input =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500'

const VACIA: GuardarPromocion = {
  nombre: '', multiplicador: 2, diaSemana: null, fechaInicio: null, fechaFin: null, activo: true,
}

/** "2026-08-01" -> "1 ago" (sin desfase de zona horaria). */
const fechaCorta = (iso?: string | null) => {
  if (!iso) return null
  const m = iso.slice(0, 10)
  try {
    return new Date(`${m}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
  } catch { return m }
}

const rangoTexto = (p: PromocionFidel) => {
  const i = fechaCorta(p.fechaInicio); const f = fechaCorta(p.fechaFin)
  if (i && f) return `${i} – ${f}`
  if (i) return `desde ${i}`
  if (f) return `hasta ${f}`
  return 'sin límite de fechas'
}

/**
 * Promociones de puntos: multiplicadores programados por día de la semana y/o
 * rango de fechas (ej. "Martes doble puntaje", "Aniversario x3").
 *
 * Regla: a una venta se le aplica el multiplicador MÁS ALTO entre el base del
 * programa y las promos vigentes ese día (no se multiplican entre sí).
 */
export function PromocionesFidelizacionPanel({ multiplicadorBase = 1 }: { multiplicadorBase?: number }) {
  const [promos, setPromos] = useState<PromocionFidel[]>([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState<number | 'nueva' | null>(null)
  const [form, setForm] = useState<GuardarPromocion>({ ...VACIA })

  // T11 — qué calendario está abierto.
  const [cal, setCal] = useState<'inicio' | 'fin' | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = () =>
    fidelizacionService.getPromociones()
      .then(setPromos)
      .catch(() => toast.error('No se pudieron cargar las promociones'))
      .finally(() => setCargando(false))

  useEffect(() => { cargar() }, [])

  const abrirNueva = () => { setForm({ ...VACIA }); setEditando('nueva') }
  const abrirEditar = (p: PromocionFidel) => {
    setForm({
      nombre: p.nombre,
      multiplicador: p.multiplicador,
      diaSemana: p.diaSemana ?? null,
      fechaInicio: p.fechaInicio ? p.fechaInicio.slice(0, 10) : null,
      fechaFin: p.fechaFin ? p.fechaFin.slice(0, 10) : null,
      activo: p.activo,
    })
    setEditando(p.idPromocion)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { toast.error('Ponle un nombre a la promoción'); return }
    if (form.multiplicador < 1) { toast.error('El multiplicador debe ser 1 o mayor'); return }
    if (form.fechaInicio && form.fechaFin && form.fechaFin < form.fechaInicio) {
      toast.error('La fecha de fin no puede ser anterior a la de inicio'); return
    }
    setGuardando(true)
    try {
      const payload: GuardarPromocion = {
        ...form,
        nombre: form.nombre.trim(),
        diaSemana: form.diaSemana ?? null,
        fechaInicio: form.fechaInicio || null,
        fechaFin: form.fechaFin || null,
      }
      if (editando === 'nueva') await fidelizacionService.crearPromocion(payload)
      else if (typeof editando === 'number') await fidelizacionService.actualizarPromocion(editando, payload)
      toast.success(editando === 'nueva' ? 'Promoción creada' : 'Promoción actualizada')
      setEditando(null)
      await cargar()
    } catch {
      toast.error('No se pudo guardar la promoción')
    } finally { setGuardando(false) }
  }

  /** Activar/desactivar sin abrir el formulario. */
  const toggleActivo = async (p: PromocionFidel) => {
    const nuevo = !p.activo
    setPromos(list => list.map(x => x.idPromocion === p.idPromocion ? { ...x, activo: nuevo } : x))
    try {
      await fidelizacionService.actualizarPromocion(p.idPromocion, {
        nombre: p.nombre, multiplicador: p.multiplicador, diaSemana: p.diaSemana ?? null,
        fechaInicio: p.fechaInicio ?? null, fechaFin: p.fechaFin ?? null, activo: nuevo,
      })
      await cargar()   // refresca "vigenteHoy" desde el backend
    } catch {
      setPromos(list => list.map(x => x.idPromocion === p.idPromocion ? { ...x, activo: !nuevo } : x))
      toast.error('No se pudo cambiar el estado')
    }
  }

  const eliminar = async (p: PromocionFidel) => {
    if (!confirm(`¿Eliminar la promoción "${p.nombre}"?`)) return
    try {
      await fidelizacionService.eliminarPromocion(p.idPromocion)
      toast.success('Promoción eliminada')
      await cargar()
    } catch { toast.error('No se pudo eliminar') }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Confetti size={18} weight="duotone" className="text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Días de puntos extra</h3>
        </div>
        <button
          onClick={abrirNueva}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus size={15} weight="bold" /> Nueva
        </button>
      </div>

      <p className="mt-1 text-xs text-gray-500">
        Multiplica los puntos en días o fechas concretas (ej. “Martes doble puntaje”).
        Se aplica el multiplicador <strong>más alto</strong> entre el base
        {multiplicadorBase > 1 ? ` (x${multiplicadorBase})` : ''} y las promos vigentes — no se suman entre sí.
      </p>

      {cargando ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <CircleNotch size={22} className="animate-spin" />
        </div>
      ) : promos.length === 0 && editando === null ? (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-gray-700">No hay promociones programadas.</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-gray-500">
            Crea promociones para aumentar visitas en tus días de baja demanda
            (ej. “Martes doble puntaje”).
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {promos.map(p => (
            <div
              key={p.idPromocion}
              className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${
                p.vigenteHoy ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-100'
              }`}
            >
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-800">
                <Lightning size={13} weight="fill" /> x{p.multiplicador}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{p.nombre}</p>
                <p className="flex items-center gap-1 text-[11px] text-gray-500">
                  <CalendarDots size={12} /> {nombreDia(p.diaSemana)} · {rangoTexto(p)}
                </p>
              </div>

              {p.vigenteHoy && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  ACTIVA HOY
                </span>
              )}

              <label className="inline-flex cursor-pointer select-none items-center gap-1.5 text-xs text-gray-600">
                <input type="checkbox" checked={p.activo} onChange={() => toggleActivo(p)} className="rounded border-gray-300" />
                {p.activo ? 'Activa' : 'Pausada'}
              </label>

              <button onClick={() => abrirEditar(p)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Editar">
                <PencilSimple size={16} />
              </button>
              <button onClick={() => eliminar(p)} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600" title="Eliminar">
                <Trash size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario crear/editar */}
      {editando !== null && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">
              {editando === 'nueva' ? 'Nueva promoción' : 'Editar promoción'}
            </p>
            <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Nombre</label>
              <input
                className={input}
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Martes doble puntaje"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Multiplicador</label>
              <ComboBox value={String(form.multiplicador)} onChange={(v) => setForm({ ...form, multiplicador: Number(v) })} opciones={[{ valor: '2', etiqueta: 'x2 — Doble puntaje' }, { valor: '3', etiqueta: 'x3 — Triple puntaje' }, { valor: '4', etiqueta: 'x4' }, { valor: '5', etiqueta: 'x5' }]} inputClassName={input} />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Día de la semana</label>
              <ComboBox value={form.diaSemana === null || form.diaSemana === undefined ? '' : String(form.diaSemana)} onChange={(v) => setForm({ ...form, diaSemana: v === '' ? null : Number(v) })} opciones={DIAS.map((d) => ({ valor: String(d.v ?? ''), etiqueta: d.label }))} inputClassName={input} />
            </div>

            {/* T11 — Eran <input type="date">: en Android abren el picker del sistema,
                fuera del diseño. Ahora el mismo CalendarModal del flujo de reserva. */}
            <div>
              <label className="mb-1 block text-xs text-gray-500">Desde (opcional)</label>
              <button
                type="button"
                onClick={() => setCal('inicio')}
                className={`${input} flex items-center gap-2 text-left`}
              >
                <CalendarBlank size={15} className="shrink-0 text-gray-400" />
                <span className={form.fechaInicio ? '' : 'text-gray-400'}>
                  {form.fechaInicio || 'Sin fecha'}
                </span>
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Hasta (opcional)</label>
              <button
                type="button"
                onClick={() => setCal('fin')}
                className={`${input} flex items-center gap-2 text-left`}
              >
                <CalendarBlank size={15} className="shrink-0 text-gray-400" />
                <span className={form.fechaFin ? '' : 'text-gray-400'}>
                  {form.fechaFin || 'Sin fecha'}
                </span>
              </button>
            </div>

            <CalendarModal
              isOpen={cal !== null}
              selectedDate={(cal === 'inicio' ? form.fechaInicio : form.fechaFin) ?? ''}
              onSelectDate={(d) => {
                setForm({ ...form, [cal === 'inicio' ? 'fechaInicio' : 'fechaFin']: d })
                setCal(null)
              }}
              onClose={() => setCal(null)}
              allowPast
            />
          </div>

          <label className="mt-3 inline-flex cursor-pointer select-none items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox" checked={form.activo}
              onChange={e => setForm({ ...form, activo: e.target.checked })}
              className="rounded border-gray-300"
            />
            Activa
          </label>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setEditando(null)}
              className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={guardando}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {guardando ? <CircleNotch size={15} className="animate-spin" /> : <Check size={15} weight="bold" />}
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
