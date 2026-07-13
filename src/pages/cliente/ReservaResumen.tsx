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

      {/* Servicios con Profesional - ALINEADOS HORIZONTALMENTE */}
      {selectedServicios.length > 0 && (
        <div className={styles.sidebarSection}>
          <h3 className={styles.sidebarSectionTitle}>Servicios</h3>
          <div className="space-y-4">
            {selectedServicios.map((s) => (
              <div key={s.idServicio} className="space-y-1">
                {/* Fila 1: Nombre Servicio + Precio */}
                <div className="flex items-start justify-between gap-2">
                  <p className={styles.sidebarSectionValue}>{s.nombre}</p>
                  <p className={styles.sidebarSectionValue} style={{ whiteSpace: 'nowrap' }}>
                    S/ {s.precioBase.toFixed(2)}
                  </p>
                </div>
                
                {/* Fila 2: Duración + Profesional Mini */}
                <div className="flex items-center justify-between gap-2">
                  <p className={styles.sidebarSectionMeta}>
                    {s.duracionMinutos} min
                  </p>
                  {selectedTrabajador && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0 overflow-hidden">
                        {selectedTrabajador.urlFotoPerfil ? (
                          <img
                            src={buildImageUrl(selectedTrabajador.urlFotoPerfil)}
                            alt={selectedTrabajador.nombreCompleto}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; const p = e.currentTarget.parentElement; if (p) p.textContent = selectedTrabajador.nombreCompleto.charAt(0).toUpperCase() }}
                          />
                        ) : (
                          selectedTrabajador.nombreCompleto.charAt(0).toUpperCase()
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-700">
                        {selectedTrabajador.nombreCompleto.split(' ')[0]}
                      </p>
                    </div>
                  )}
                </div>
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
