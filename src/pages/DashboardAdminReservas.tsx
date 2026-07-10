import { useState, useEffect } from 'react'
import { Clock, User, Scissors, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ConfirmDialog'
import { citaYaEmpezo, MSG_CITA_NO_LLEGA } from '@/utils/fecha'
import styles from '@/styles/DashboardAdminReservas.module.css'

interface Reserva {
  idReserva: number
  cliente: string
  telefono: string
  servicio: string
  precio: number
  duracion: number
  barbero: string
  fecha: string
  hora: string
  sede: string
  estado: 'Pendiente' | 'Confirmada' | 'Atendida' | 'Cancelada' | 'NoShow'
  token?: string
}

interface ReservaDetalle extends Reserva {
  direccion: string
  idCliente: number
  idTrabajador: number
}

export function DashboardAdminReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'Pendiente' | 'Confirmada' | 'Atendida' | 'NoShow'>('todos')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [detalleReserva, setDetalleReserva] = useState<ReservaDetalle | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadReservas()
  }, [])

  const loadReservas = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/reservas/proximas-del-dia', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Error cargando reservas')

      const data = await res.json()
      setReservas(data)
    } catch (err) {
      toast.error('Error cargando reservas')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerDetalles = (reserva: Reserva) => {
    setDetalleReserva(reserva as ReservaDetalle)
    setModalAbierto(true)
  }

  const handleConfirmar = async (idReserva: number) => {
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/reservas/${idReserva}/confirmar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Error confirmando')

      toast.success('Reserva confirmada')
      loadReservas()
      setModalAbierto(false)
    } catch (err) {
      toast.error('Error al confirmar')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAtender = async (idReserva: number) => {
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/reservas/${idReserva}/atender`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Error marcando atendida')

      toast.success('Reserva marcada como atendida - Venta creada')
      loadReservas()
      setModalAbierto(false)
    } catch (err) {
      toast.error('Error al marcar como atendida')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNoShow = async (idReserva: number) => {
    if (!(await confirmDialog({
      title: 'Marcar como no-show',
      message: '¿Marcar esta reserva como no-show? Se registrará que el cliente no asistió.',
      confirmText: 'Sí, marcar',
      cancelText: 'Volver',
      tone: 'danger',
    }))) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/reservas/${idReserva}/no-show`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Error')

      toast.success('Marcado como no-show')
      loadReservas()
      setModalAbierto(false)
    } catch (err) {
      toast.error('Error al marcar no-show')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return styles.estadoPendiente
      case 'Confirmada':
        return styles.estadoConfirmada
      case 'Atendida':
        return styles.estadoAtendida
      case 'NoShow':
        return styles.estadoNoShow
      default:
        return styles.estadoCancelada
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return <AlertCircle className="w-4 h-4" />
      case 'Confirmada':
        return <CheckCircle className="w-4 h-4" />
      case 'Atendida':
        return <CheckCircle className="w-4 h-4" />
      case 'NoShow':
        return <XCircle className="w-4 h-4" />
      default:
        return <XCircle className="w-4 h-4" />
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'NoShow':
        return 'No Asistió'
      default:
        return estado
    }
  }

  const reservasFiltradas = filtroEstado === 'todos' 
    ? reservas 
    : reservas.filter(r => r.estado === filtroEstado)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Próximas Reservas</h1>
        <p className={styles.subtitulo}>
          {reservas.length} reservas hoy
        </p>
      </div>

      {/* FILTROS */}
      <div className={styles.filtros}>
        <button
          onClick={() => setFiltroEstado('todos')}
          className={`${styles.filtroBtn} ${filtroEstado === 'todos' ? styles.filtroActivo : ''}`}
        >
          Todas ({reservas.length})
        </button>
        <button
          onClick={() => setFiltroEstado('Pendiente')}
          className={`${styles.filtroBtn} ${filtroEstado === 'Pendiente' ? styles.filtroActivo : ''}`}
        >
          Pendiente ({reservas.filter(r => r.estado === 'Pendiente').length})
        </button>
        <button
          onClick={() => setFiltroEstado('Confirmada')}
          className={`${styles.filtroBtn} ${filtroEstado === 'Confirmada' ? styles.filtroActivo : ''}`}
        >
          Confirmada ({reservas.filter(r => r.estado === 'Confirmada').length})
        </button>
        <button
          onClick={() => setFiltroEstado('Atendida')}
          className={`${styles.filtroBtn} ${filtroEstado === 'Atendida' ? styles.filtroActivo : ''}`}
        >
          Atendida ({reservas.filter(r => r.estado === 'Atendida').length})
        </button>
      </div>

      {/* CONTENIDO */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Cargando reservas...</p>
        </div>
      ) : reservasFiltradas.length === 0 ? (
        <div className={styles.emptyState}>
          <Scissors className="w-12 h-12" />
          <p>No hay reservas {filtroEstado === 'todos' ? '' : `en estado ${filtroEstado}`}</p>
        </div>
      ) : (
        <div className={styles.tablaContainer}>
          <div className={styles.tablaDesktop}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Servicio</th>
                  <th>Barbero</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasFiltradas.map((reserva, idx) => (
                  <motion.tr
                    key={reserva.idReserva}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={styles.filaHover}
                  >
                    <td className={styles.hora}>
                      <Clock className="w-4 h-4" />
                      {reserva.hora}
                    </td>
                    <td className={styles.cliente}>
                      <User className="w-4 h-4" />
                      {reserva.cliente}
                    </td>
                    <td className={styles.servicio}>
                      <Scissors className="w-4 h-4" />
                      {reserva.servicio}
                    </td>
                    <td className={styles.barbero}>
                      {reserva.barbero}
                    </td>
                    <td>
                      <span className={`${styles.estado} ${getEstadoColor(reserva.estado)}`}>
                        {getEstadoIcon(reserva.estado)}
                        {getEstadoLabel(reserva.estado)}
                      </span>
                    </td>
                    <td className={styles.acciones}>
                      <button
                        onClick={() => handleVerDetalles(reserva)}
                        className={styles.btnDetalles}
                      >
                        Ver
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* VERSIÓN MOBILE */}
          <div className={styles.tablaMobile}>
            {reservasFiltradas.map((reserva, idx) => (
              <motion.div
                key={reserva.idReserva}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardHora}>
                    <Clock className="w-4 h-4" />
                    {reserva.hora}
                  </div>
                  <span className={`${styles.estado} ${getEstadoColor(reserva.estado)}`}>
                    {getEstadoLabel(reserva.estado)}
                  </span>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.item}>
                    <User className="w-4 h-4" />
                    <strong>{reserva.cliente}</strong>
                  </div>
                  <div className={styles.item}>
                    <Scissors className="w-4 h-4" />
                    <span>{reserva.servicio}</span>
                  </div>
                  <div className={styles.item}>
                    <span className={styles.barberoLabel}>Barbero: {reserva.barbero}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleVerDetalles(reserva)}
                  className={styles.btnDetalles}
                >
                  Ver Detalles
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES */}
      {modalAbierto && detalleReserva && (
        <div className={styles.modal}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={styles.modalContent}
          >
            <button
              onClick={() => setModalAbierto(false)}
              className={styles.closeBtn}
            >
              ✕
            </button>

            <h2>Detalles de Reserva</h2>

            <div className={styles.detalles}>
              <div className={styles.detalleItem}>
                <label>Cliente</label>
                <p>{detalleReserva.cliente}</p>
                <small>{detalleReserva.telefono}</small>
              </div>

              <div className={styles.detalleItem}>
                <label>Servicio</label>
                <p>{detalleReserva.servicio}</p>
                <small>S/ {detalleReserva.precio.toFixed(2)} • {detalleReserva.duracion} min</small>
              </div>

              <div className={styles.detalleItem}>
                <label>Barbero</label>
                <p>{detalleReserva.barbero}</p>
              </div>

              <div className={styles.detalleItem}>
                <label>Fecha y Hora</label>
                <p>{detalleReserva.fecha} a las {detalleReserva.hora}</p>
              </div>

              <div className={styles.detalleItem}>
                <label>Estado</label>
                <span className={`${styles.estadoGrande} ${getEstadoColor(detalleReserva.estado)}`}>
                  {getEstadoLabel(detalleReserva.estado)}
                </span>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className={styles.modalAcciones}>
              {detalleReserva.estado === 'Pendiente' && (
                <button
                  onClick={() => handleConfirmar(detalleReserva.idReserva)}
                  disabled={submitting}
                  className={styles.btnConfirmar}
                >
                  {submitting ? '⏳ Confirmando...' : '✓ Confirmar Reserva'}
                </button>
              )}

              {detalleReserva.estado === 'Confirmada' && (
                <>
                  <button
                    onClick={() => { if (!citaYaEmpezo(detalleReserva.fechaReserva, detalleReserva.horaInicio)) { toast.error(MSG_CITA_NO_LLEGA); return } handleAtender(detalleReserva.idReserva) }}
                    disabled={submitting}
                    className={styles.btnAtender}
                  >
                    {submitting ? '⏳...' : '✓ Marcar Atendida'}
                  </button>
                  <button
                    onClick={() => handleNoShow(detalleReserva.idReserva)}
                    disabled={submitting}
                    className={styles.btnNoShow}
                  >
                    {submitting ? '⏳...' : '✕ No Asistió'}
                  </button>
                </>
              )}

              <button
                onClick={() => setModalAbierto(false)}
                className={styles.btnCerrar}
              >
                Cerrar
              </button>
            </div>
          </motion.div>

          <div
            className={styles.modalOverlay}
            onClick={() => setModalAbierto(false)}
          />
        </div>
      )}
    </div>
  )
}
