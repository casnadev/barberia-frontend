import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Star, Clock, MapPin, User, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { reservasService } from '@/services/reservasService'
import styles from '@/styles/ReservaAcciones.module.css'

interface Reserva {
  idReserva: number
  nombreCliente: string
  telefonoCliente: string
  servicio: string
  fecha: string
  hora: string
  profesional: string
  sede: string
  estado: 'Pendiente' | 'Confirmada' | 'Atendida' | 'Cancelada'
}

interface FormReprogramar {
  fechaNueva: string
  horaNueva: string
  motivo: string
}

type TabType = 'detalles' | 'acciones' | 'resena'

export function ReservaAcciones() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('detalles')
  const [calificacion, setCalificacion] = useState(0)
  const [resena, setResena] = useState('')
  const [formReprogramar, setFormReprogramar] = useState<FormReprogramar>({
    fechaNueva: '',
    horaNueva: '',
    motivo: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 🎯 Detectar acción desde la URL
  useEffect(() => {
    const path = location.pathname
    
    if (path.includes('/confirmar/')) {
      setActiveTab('acciones')
      setTimeout(() => {
        const confirmBtn = document.querySelector('[data-action="confirmar"]')
        confirmBtn?.scrollIntoView({ behavior: 'smooth' })
      }, 500)
    } else if (path.includes('/cancelar/')) {
      setActiveTab('acciones')
      setTimeout(() => {
        const cancelBtn = document.querySelector('[data-action="cancelar"]')
        cancelBtn?.scrollIntoView({ behavior: 'smooth' })
      }, 500)
    } else if (path.includes('/reprogramar/')) {
      setActiveTab('acciones')
      setTimeout(() => {
        const reprogramarBtn = document.querySelector('[data-action="reprogramar"]')
        reprogramarBtn?.scrollIntoView({ behavior: 'smooth' })
      }, 500)
    } else if (path.includes('/calificar/') || path.includes('/resena/')) {
      setActiveTab('resena')
    }
  }, [location.pathname])

  useEffect(() => {
    loadReserva()
  }, [token])

  const loadReserva = async () => {
    try {
      if (!token) {
        toast.error('Token inválido')
        navigate('/')
        return
      }
      // TODO: Descomentar cuando tengas el endpoint
      // const data = await reservasService.obtenerPorToken(token)
      // setReserva(data)
      
      // Simulación temporal:
      setReserva({
        idReserva: 1,
        nombreCliente: 'Juan Pérez',
        telefonoCliente: '943811931',
        servicio: 'Corte + Barba',
        fecha: '2026-05-26',
        hora: '14:00',
        profesional: 'Rambo Barber',
        sede: 'Sede Central',
        estado: 'Pendiente'
      })
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error cargando reserva')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmar = async () => {
    if (!token) return
    setIsSubmitting(true)
    try {
      // TODO: Descomentar cuando tengas el endpoint
      // await reservasService.confirmarPorToken(token)
      toast.success('✅ Cita confirmada')
      setTimeout(() => navigate('/'), 2000)
    } catch (error) {
      toast.error('Error al confirmar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelar = async () => {
    if (!token) return
    setIsSubmitting(true)
    try {
      // TODO: Descomentar cuando tengas el endpoint
      // await reservasService.cancelarPorToken(token)
      toast.success('❌ Cita cancelada')
      setTimeout(() => navigate('/'), 2000)
    } catch (error) {
      toast.error('Error al cancelar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReprogramar = async () => {
    if (!token || !formReprogramar.fechaNueva || !formReprogramar.horaNueva) {
      toast.error('Completa fecha y hora')
      return
    }
    setIsSubmitting(true)
    try {
      // TODO: Descomentar cuando tengas el endpoint
      // await reservasService.reprogramarPorToken(token, formReprogramar)
      toast.success('🔄 Cita reprogramada')
      setTimeout(() => navigate('/'), 2000)
    } catch (error) {
      toast.error('Error al reprogramar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCalificar = async () => {
    if (calificacion === 0) {
      toast.error('Selecciona una calificación')
      return
    }
    setIsSubmitting(true)
    try {
      // TODO: Descomentar cuando tengas el endpoint
      // await reservasService.calificarPorToken(token, calificacion)
      toast.success('⭐ Gracias por tu calificación')
      setCalificacion(0)
      setActiveTab('resena')
    } catch (error) {
      toast.error('Error al calificar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDejarResena = async () => {
    if (!resena.trim()) {
      toast.error('Escribe una reseña')
      return
    }
    setIsSubmitting(true)
    try {
      // TODO: Descomentar cuando tengas el endpoint
      // await reservasService.resenaP orToken(token, resena)
      toast.success('💬 Reseña publicada')
      setTimeout(() => navigate('/'), 2000)
    } catch (error) {
      toast.error('Error al guardar reseña')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Cargando reserva...</p>
        </div>
      </div>
    )
  }

  if (!reserva) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p>❌ No se encontró la reserva</p>
          <button className={styles.primaryButton} onClick={() => navigate('/')}>
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header Flotante */}
      <header className={styles.floatingHeader}>
        <button 
          className={styles.headerButton} 
          onClick={() => navigate('/')}
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className={styles.headerTitle}>Tu Reserva</h1>
        <div style={{ width: '2.5rem' }}></div>
      </header>

      {/* Contenido */}
      <div className={styles.content}>
        {/* Tarjeta Detalles */}
        <motion.div 
          className={styles.detailsCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.reservaHeader}>
            <h2 className={styles.servicioNombre}>{reserva.servicio}</h2>
            <span className={`${styles.badge} ${styles[`badge${reserva.estado}`]}`}>
              {reserva.estado}
            </span>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <Calendar size={18} className={styles.icon} />
              <div>
                <p className={styles.label}>Fecha</p>
                <p className={styles.value}>{reserva.fecha}</p>
              </div>
            </div>

            <div className={styles.detailItem}>
              <Clock size={18} className={styles.icon} />
              <div>
                <p className={styles.label}>Hora</p>
                <p className={styles.value}>{reserva.hora}</p>
              </div>
            </div>

            <div className={styles.detailItem}>
              <User size={18} className={styles.icon} />
              <div>
                <p className={styles.label}>Profesional</p>
                <p className={styles.value}>{reserva.profesional}</p>
              </div>
            </div>

            <div className={styles.detailItem}>
              <MapPin size={18} className={styles.icon} />
              <div>
                <p className={styles.label}>Sede</p>
                <p className={styles.value}>{reserva.sede}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs de Acciones */}
        <div className={styles.tabsContainer}>
          {reserva.estado === 'Atendida' ? (
            <>
              <button 
                className={`${styles.tab} ${activeTab === 'resena' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('resena')}
              >
                <Star size={16} /> Calificar & Reseña
              </button>
            </>
          ) : (
            <>
              <button 
                className={`${styles.tab} ${activeTab === 'detalles' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('detalles')}
              >
                Detalles
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'acciones' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('acciones')}
              >
                Acciones
              </button>
            </>
          )}
        </div>

        {/* Contenido Tabs */}
        {activeTab === 'acciones' && (
          <motion.div 
            className={styles.actionsContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Confirmar */}
            <div className={styles.actionCard} data-action="confirmar">
              <h3>✅ Confirmar Cita</h3>
              <p>Confirma que asistirás a la cita programada</p>
              <button 
                className={styles.primaryButton}
                onClick={handleConfirmar}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>

            {/* Reprogramar */}
            <div className={styles.actionCard} data-action="reprogramar">
              <h3>🔄 Reprogramar Cita</h3>
              <p>Cambia la fecha y hora de tu cita</p>
              <input 
                type="date"
                className={styles.input}
                value={formReprogramar.fechaNueva}
                onChange={(e) => setFormReprogramar({...formReprogramar, fechaNueva: e.target.value})}
              />
              <input 
                type="time"
                className={styles.input}
                value={formReprogramar.horaNueva}
                onChange={(e) => setFormReprogramar({...formReprogramar, horaNueva: e.target.value})}
              />
              <textarea 
                className={styles.textarea}
                placeholder="Motivo (opcional)"
                value={formReprogramar.motivo}
                onChange={(e) => setFormReprogramar({...formReprogramar, motivo: e.target.value})}
              />
              <button 
                className={styles.primaryButton}
                onClick={handleReprogramar}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Reprogramando...' : 'Reprogramar'}
              </button>
            </div>

            {/* Cancelar */}
            <div className={styles.actionCard} data-action="cancelar">
              <h3>❌ Cancelar Cita</h3>
              <p>Cancela tu cita (no podrás deshacer esta acción)</p>
              <button 
                className={styles.dangerButton}
                onClick={handleCancelar}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Cancelando...' : 'Cancelar Cita'}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'resena' && (
          <motion.div 
            className={styles.resenaContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Calificación */}
            <div className={styles.ratingCard}>
              <h3>⭐ ¿Cómo fue tu experiencia?</h3>
              <div className={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`${styles.star} ${calificacion >= star ? styles.starFilled : ''}`}
                    onClick={() => setCalificacion(star)}
                  >
                    <Star size={32} />
                  </button>
                ))}
              </div>
              <button 
                className={styles.primaryButton}
                onClick={handleCalificar}
                disabled={isSubmitting || calificacion === 0}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Calificación'}
              </button>
            </div>

            {/* Reseña */}
            <div className={styles.reviewCard}>
              <h3>💬 Cuéntanos tu experiencia</h3>
              <textarea 
                className={styles.textarea}
                placeholder="Escribe tu reseña aquí... (mínimo 10 caracteres)"
                value={resena}
                onChange={(e) => setResena(e.target.value)}
                rows={6}
              />
              <button 
                className={styles.primaryButton}
                onClick={handleDejarResena}
                disabled={isSubmitting || resena.length < 10}
              >
                {isSubmitting ? 'Publicando...' : 'Publicar Reseña'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}