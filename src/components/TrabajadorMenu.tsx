import { motion, AnimatePresence } from 'framer-motion'
import {
  House, CalendarCheck, Clock, CurrencyDollar, Star,
  Receipt, Globe, X, ClockCounterClockwise, Gear, type Icon,
} from '@phosphor-icons/react'

export type TrabajadorTab = 'inicio' | 'agenda' | 'disponibilidad' | 'comisiones' | 'resenas' | 'configuracion'

type ActionId = 'venta' | 'reservar' | 'sitio' | 'historial'

type Tile =
  | { kind: 'tab'; key: TrabajadorTab; label: string; icon: Icon }
  | { kind: 'action'; id: ActionId; label: string; icon: Icon; tone: 'emerald' | 'blue' | 'slate' }

const SECCIONES: Tile[] = [
  { kind: 'tab', key: 'inicio', label: 'Inicio', icon: House },
  { kind: 'tab', key: 'agenda', label: 'Agenda', icon: CalendarCheck },
  { kind: 'tab', key: 'disponibilidad', label: 'Horario', icon: Clock },
  { kind: 'tab', key: 'comisiones', label: 'Comisiones', icon: CurrencyDollar },
  { kind: 'tab', key: 'resenas', label: 'Reseñas', icon: Star },
  { kind: 'tab', key: 'configuracion', label: 'Configuración', icon: Gear },
]

const ACCIONES: Tile[] = [
  { kind: 'action', id: 'venta', label: 'Venta rápida', icon: Receipt, tone: 'emerald' },
  { kind: 'action', id: 'historial', label: 'Historial', icon: ClockCounterClockwise, tone: 'slate' },
  { kind: 'action', id: 'sitio', label: 'Mi Sitio', icon: Globe, tone: 'slate' },
]

/**
 * Menú del panel del trabajador — mismo patrón que el menú del Admin:
 * un modal con grilla de opciones e íconos Phosphor. Sirve como navegación
 * única en desktop y móvil (antes en móvil no había navegación).
 */
export function TrabajadorMenu({
  open, onClose, tab, onTab, onVentaRapida, onReservar, onMiSitio, onHistorial, nombreSede,
}: {
  open: boolean
  onClose: () => void
  tab: TrabajadorTab
  onTab: (t: TrabajadorTab) => void
  onVentaRapida: () => void
  onReservar: () => void
  onMiSitio: () => void
  onHistorial: () => void
  nombreSede?: string
}) {
  const go = (t: TrabajadorTab) => { onTab(t); onClose() }
  const act = (id: ActionId) => {
    onClose()
    if (id === 'venta') onVentaRapida()
    else if (id === 'reservar') onReservar()
    else if (id === 'historial') onHistorial()
    else onMiSitio()
  }

  const toneCls: Record<string, string> = {
    emerald: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50',
    slate: 'text-slate-600 bg-slate-100',
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Menú</h3>
                <p className="text-xs text-gray-400">
                  {nombreSede ? `Sede activa · ${nombreSede}` : 'Todas las opciones'}
                </p>
              </div>
              <button onClick={onClose} aria-label="Cerrar"
                className="grid place-items-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Secciones */}
            <div className="px-4 pb-2 grid grid-cols-3 gap-2.5">
              {SECCIONES.map((t) => {
                if (t.kind !== 'tab') return null
                const active = tab === t.key
                const Ico = t.icon
                return (
                  <button key={t.key} onClick={() => go(t.key)}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition active:scale-95 ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    <Ico size={24} weight={active ? 'fill' : 'regular'} />
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Divisor */}
            <div className="mx-5 my-2 border-t border-gray-100" />

            {/* Acciones */}
            <div className="px-4 pb-6 grid grid-cols-3 gap-2.5">
              {ACCIONES.map((a) => {
                if (a.kind !== 'action') return null
                const Ico = a.icon
                return (
                  <button key={a.id} onClick={() => act(a.id)}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition active:scale-95">
                    <span className={`grid place-items-center w-9 h-9 rounded-xl ${toneCls[a.tone]}`}>
                      <Ico size={20} weight="duotone" />
                    </span>
                    <span className="text-xs font-medium">{a.label}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
