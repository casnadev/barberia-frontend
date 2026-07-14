import { MapPin, User, Clock, Calendar as CalendarIcon } from '@phosphor-icons/react'
import { buildImageUrl } from '@/services/apiClient'
import styles from '@/styles/ReservaClientePage.module.css'
import { nombreParaMostrar } from '@/utils/nombreParaMostrar'

interface ReservaResumenProps {
  sede: any
  selectedServicios: any[]
  selectedTrabajador: any
  selectedFecha: string
  selectedHora: string
  totalPrecio: number
  totalDuration: number
  endTime: string
}

export function ReservaResumen({
  sede,
  selectedServicios,
  selectedTrabajador,
  selectedFecha,
  selectedHora,
  totalPrecio,
  totalDuration,
  endTime,
}: ReservaResumenProps) {
  const formatDurationText = (minutes: number): string => {
    if (minutes === 0) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) return `${mins} min`
    if (mins === 0) return `${hours} h`
    return `${hours} h y ${mins} min`
  }

  const formatDateLong = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00')
    const dayName = date.toLocaleDateString('es', { weekday: 'long' })
    const day = date.getDate()
    const month = date.toLocaleDateString('es', { month: 'long' })
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${day} de ${month}`
  }

  return (
    <div className={styles.sidebarCard}>
      {/* Barbería */}
      <div className={styles.sidebarSection}>
        <h3 className={styles.sidebarSectionTitle}>Barbería</h3>
        {/* T1 — decía "Miraflores". El cliente reserva en un NEGOCIO, no en un distrito. */}
        <p className={styles.sidebarSectionValue}>{nombreParaMostrar(sede as any) || 'Barber.PE'}</p>
        <p className={styles.sidebarSectionMeta}>
          <MapPin className="w-4 h-4" />
          {sede?.direccion || 'Lima, Perú'}
        </p>
      </div>

      {/* Fecha y Hora - ARRIBA, ANTES DE SERVICIOS */}
      {(selectedFecha || selectedHora) && (
        <div className={styles.sidebarSection}>
          <h3 className={styles.sidebarSectionTitle}>Reserva</h3>
          <div className="space-y-3">
            {/* Fecha */}
            {selectedFecha && (
              <div className="flex items-start gap-2">
                <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {formatDateLong(selectedFecha)}
                  </p>
                </div>
              </div>
            )}
            
            {/* Hora con duración calculada - TODO EN UNA LÍNEA */}
            {selectedHora && selectedServicios.length > 0 && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedHora}-{endTime} ({formatDurationText(totalDuration)})
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ T11 · SERVICIOS + PROFESIONAL EN LA MISMA LÍNEA ═══════════════════
          EL BUG: el bloque `avatar + primer nombre` estaba DENTRO del .map() de
          servicios. Con 4 servicios se pintaba 4 VECES... y siempre con el MISMO
          profesional, porque `selectedTrabajador` es uno solo para toda la reserva.
          Duplicación pura, y ruido visual que crecía con el carrito.

          AHORA: sale del bucle y sube a la cabecera, junto al título "Servicios".
          Se ve UNA vez, en la misma línea, tal como debe.

          El caso "Sin preferencias" (selectedTrabajador = null) también se pinta:
          antes simplemente no aparecía nada, y el cliente no sabía si había elegido
          profesional o no. */}
      {selectedServicios.length > 0 && (
        <div className={styles.sidebarSection}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className={styles.sidebarSectionTitle} style={{ margin: 0 }}>Servicios</h3>

            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-600 flex-shrink-0 overflow-hidden">
                {selectedTrabajador?.urlFotoPerfil ? (
                  <img
                    src={buildImageUrl(selectedTrabajador.urlFotoPerfil)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement
                      el.style.display = 'none'
                      const p = el.parentElement
                      if (p) p.textContent = (selectedTrabajador?.nombreCompleto ?? '?').charAt(0).toUpperCase()
                    }}
                  />
                ) : (
                  (selectedTrabajador?.nombreCompleto ?? 'S').charAt(0).toUpperCase()
                )}
              </div>
              <p className="text-xs font-medium text-gray-700 truncate">
                {selectedTrabajador
                  ? selectedTrabajador.nombreCompleto.split(' ')[0]
                  : 'Sin preferencia'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {selectedServicios.map((s) => (
              <div key={s.idServicio} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={styles.sidebarSectionValue}>{s.nombre}</p>
                  <p className={styles.sidebarSectionMeta}>{s.duracionMinutos} min</p>
                </div>
                <p className={styles.sidebarSectionValue} style={{ whiteSpace: 'nowrap' }}>
                  S/ {s.precioBase.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div
            className={styles.summaryTotal}
            style={{ margin: '1rem -1.75rem -1.75rem -1.75rem' }}
          >
            <span className={styles.summaryTotalLabel}>Total</span>
            <span className={styles.summaryTotalValue}>S/ {totalPrecio.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
