import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, MessageSquare, User, Scissors, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import styles from '@/styles/Calificaciones.module.css'

interface ReservaData {
  idReserva: number
  cliente: string
  servicio: string
  barbero: string
  fecha: string
  precio: number
}

export function CalificacionesClientePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [reserva, setReserva] = useState<ReservaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comentario, setComentario] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    loadReserva()
  }, [token])

  const loadReserva = async () => {
    try {
      if (!token) {
        setError('Token inválido')
        setLoading(false)
        return
      }

      const res = await fetch(`/api/reservas/obtener-por-token?token=${token}`)

      if (!res.ok) {
        setError('Reserva no encontrada')
        setLoading(false)
        return
      }

      const data = await res.json()
      setReserva(data)
    } catch (err) {
      setError('Error cargando reserva')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEnviar = async () => {
    if (rating === 0) {
      toast.error('Por favor selecciona una calificación')
      return
    }

    if (!token) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/reservas/${reserva?.idReserva}/calificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          calificacion: rating,
          comentario
        })
      })

      if (!res.ok) throw new Error('Error enviando calificación')

      setEnviado(true)
      toast.success('¡Gracias por tu calificación!')

      setTimeout(() => {
        navigate('/')
      }, 3000)
    } catch (err) {
      toast.error('Error al enviar calificación')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.errorContainer}
        >
          <p className={styles.errorText}>{error}</p>
          <button onClick={() => navigate('/')} className={styles.btnVolver}>
            Volver al inicio
          </button>
        </motion.div>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className={styles.container}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={styles.successContainer}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5 }}
          >
            <CheckCircle className={styles.successIcon} />
          </motion.div>

          <h1>¡Gracias por tu Calificación!</h1>
          <p>Tu opinión nos ayuda a mejorar nuestro servicio</p>

          <div className={styles.calificacionResumen}>
            <div className={styles.estrellas}>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 ${
                    i < rating ? styles.filled : styles.empty
                  }`}
                />
              ))}
            </div>
            <p className={styles.puntuacion}>{rating} / 5 estrellas</p>
          </div>

          {comentario && (
            <div className={styles.comentarioResumen}>
              <p className={styles.comentarioText}>"{comentario}"</p>
            </div>
          )}

          <p className={styles.redireccion}>
            Redirigiendo en 3 segundos...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.card}
      >
        <h1 className={styles.title}>¿Cómo fue tu experiencia?</h1>

        {reserva && (
          <div className={styles.reservaInfo}>
            <div className={styles.infoItem}>
              <User className="w-5 h-5" />
              <div>
                <p className={styles.infoLabel}>Barbero</p>
                <p className={styles.infoValue}>{reserva.barbero}</p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Scissors className="w-5 h-5" />
              <div>
                <p className={styles.infoLabel}>Servicio</p>
                <p className={styles.infoValue}>{reserva.servicio}</p>
              </div>
            </div>
          </div>
        )}

        <div className={styles.ratingSection}>
          <p className={styles.ratingLabel}>Califica tu servicio</p>
          <div className={styles.estrellas}>
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className={styles.starButton}
              >
                <Star
                  className={`w-12 h-12 ${
                    star <= (hoveredRating || rating)
                      ? styles.starFilled
                      : styles.starEmpty
                  }`}
                />
              </motion.button>
            ))}
          </div>
          {rating > 0 && (
            <p className={styles.ratingText}>
              {rating === 1 && 'Necesita mejorar'}
              {rating === 2 && 'Podría ser mejor'}
              {rating === 3 && 'Muy bien'}
              {rating === 4 && 'Excelente'}
              {rating === 5 && '¡Perfecto!'}
            </p>
          )}
        </div>

        <div className={styles.comentarioSection}>
          <label className={styles.comentarioLabel}>
            <MessageSquare className="w-5 h-5" />
            Cuéntanos más (opcional)
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className={styles.textarea}
            rows={4}
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleEnviar}
          disabled={submitting || rating === 0}
          className={styles.btnEnviar}
        >
          {submitting ? '⏳ Enviando...' : '✓ Enviar Calificación'}
        </motion.button>

        <p className={styles.nota}>
          Tu calificación será visible en el perfil del barbero
        </p>
      </motion.div>
    </div>
  )
}
