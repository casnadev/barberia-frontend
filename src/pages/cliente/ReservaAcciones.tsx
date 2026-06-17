import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { X, Clock, MapPin, User, Star, Check, CalendarClock, Scissors } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { reservasService } from '@/services/reservasService' // ← endpoints reales
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
  idTrabajador: number
  idServicio: number
}

interface FormReprogramar {
  fechaNueva: string
  motivo: string
}

interface Slot {
  horaInicio: string
  horaFin: string
  etiqueta: string
}

type DoneType = 'confirmada' | 'cancelada' | 'reprogramada' | 'resena' | null

export function ReservaAcciones() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [loading, setLoading] = useState(true)
  const [calificacion, setCalificacion] = useState(0)
  const [resena, setResena] = useState('')
  const [showReprog, setShowReprog] = useState(false)
  const [formReprogramar, setFormReprogramar] = useState<FormReprogramar>({ fechaNueva: '', motivo: '' })
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotSel, setSlotSel] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState<DoneType>(null)

  // Fecha local (Perú) en formato YYYY-MM-DD, para el min del date picker
  const hoy = (() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  })()

  // Deep-link desde el correo: si la URL pide reprogramar, abrimos el form
  useEffect(() => {
    if (location.pathname.includes('/reprogramar/')) setShowReprog(true)
  }, [location.pathname])

  useEffect(() => { loadReserva() }, [token])

  // Al abrir el bloque de reprogramar, preselecciona una fecha y carga slots
  useEffect(() => {
    if (showReprog && reserva && !formReprogramar.fechaNueva) {
      const inicial = reserva.fecha >= hoy ? reserva.fecha : hoy
      setFormReprogramar((f) => ({ ...f, fechaNueva: inicial }))
      cargarSlots(inicial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReprog, reserva])

  const loadReserva = async () => {
    try {
      if (!token) { toast.error('Token inválido'); navigate('/'); return }
      const data = await reservasService.obtenerPorToken(token)
      setReserva({
        idReserva: data.idReserva,
        nombreCliente: data.nombreCliente,
        telefonoCliente: data.telefonoCliente,
        servicio: data.servicio,
        fecha: data.fecha,                     // "YYYY-MM-DD"
        hora: (data.hora || '').slice(0, 5),   // "HH:mm"
        profesional: data.profesional,
        sede: data.sede,
        estado: data.estado,
        idTrabajador: data.idTrabajador,
        idServicio: data.idServicio,
      })
    } catch {
      toast.error('No pudimos cargar la reserva. El enlace no es válido o expiró.')
    } finally { setLoading(false) }
  }

  // Carga los horarios libres del barbero para una fecha (mismo motor que el step 3)
  const cargarSlots = async (fecha: string) => {
    if (!reserva || !fecha) return
    setLoadingSlots(true); setSlotSel('')
    try {
      const data = await reservasService.getSlotsDisponibles(reserva.idTrabajador, fecha, reserva.idServicio)
      setSlots(Array.isArray(data) ? data : [])
    } catch {
      setSlots([])
    } finally { setLoadingSlots(false) }
  }

  // Cierre inteligente: intenta cerrar la pestaña; si no, vuelve atrás (Gmail) o a barber.pe
  const cerrar = () => {
    try { window.close() } catch { /* noop */ }
    setTimeout(() => {
      if (window.history.length > 1) window.history.back()
      else window.location.href = 'https://barber.pe'
    }, 150)
  }

  const handleConfirmar = async () => {
    if (!token) return
    setIsSubmitting(true)
    try {
      await reservasService.confirmarPorToken(token)
      setDone('confirmada')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Error al confirmar')
    } finally { setIsSubmitting(false) }
  }

  const handleCancelar = async () => {
    if (!token) return
    setIsSubmitting(true)
    try {
      await reservasService.cancelarPorToken(token)
      setDone('cancelada')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Error al cancelar')
    } finally { setIsSubmitting(false) }
  }

  const handleReprogramar = async () => {
    if (!token || !formReprogramar.fechaNueva || !slotSel) {
      toast.error('Elige una fecha y un horario disponible'); return
    }
    if (!reserva) return
    setIsSubmitting(true)
    try {
      // .NET espera TimeOnly en formato "HH:mm:ss" (no "HH:mm")
      const horaInicio = /^\d{2}:\d{2}$/.test(slotSel) ? `${slotSel}:00` : slotSel
      await reservasService.reprogramarPorToken(token, {
        idTrabajador: reserva.idTrabajador,
        fechaReserva: formReprogramar.fechaNueva,  // "YYYY-MM-DD"
        horaInicio,                                // "HH:mm:ss" (slot válido)
      })
      setDone('reprogramada')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Error al reprogramar')
    } finally { setIsSubmitting(false) }
  }

  // NOTA: la reseña por token aún no tiene endpoint anónimo en el backend.
  // Para que guarde de verdad hay que crear POST /api/Reservas/token/{token}/resena
  // y luego conectar reservasService.resenaPorToken aquí.
  const handleCalificar = async () => {
    if (calificacion === 0) { toast.error('Selecciona una calificación'); return }
    setIsSubmitting(true)
    try {
      // await reservasService.resenaPorToken(token, calificacion, resena)
      setDone('resena')
    } catch { toast.error('Error al guardar') } finally { setIsSubmitting(false) }
  }

  // Helpers de fecha/hora para el badge
  const partesFecha = (iso: string) => {
    const d = new Date(iso + 'T00:00:00')
    if (isNaN(d.getTime())) return { mes: '', dia: '', dow: '' }
    const mesRaw = d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')
    const dowRaw = d.toLocaleDateString('es-PE', { weekday: 'long' })
    return {
      mes: mesRaw.charAt(0).toUpperCase() + mesRaw.slice(1),
      dia: String(d.getDate()).padStart(2, '0'),
      dow: dowRaw.charAt(0).toUpperCase() + dowRaw.slice(1),
    }
  }
  const a12h = (hhmm: string) => {
    const [h, m] = (hhmm || '').split(':').map(Number)
    if (isNaN(h)) return hhmm
    const ap = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ap}`
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}><div className={styles.spinner} /><p>Cargando tu reserva…</p></div>
      </div>
    )
  }

  if (!reserva) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <p>No encontramos la reserva.</p>
          <button className={styles.btnGhost} onClick={cerrar}>Cerrar</button>
        </div>
      </div>
    )
  }

  // ── Pantalla de ÉXITO (tema negro) ──
  if (done) {
    const titulo = {
      confirmada: '¡Cita confirmada!',
      reprogramada: '¡Cita reprogramada!',
      cancelada: 'Tu cita fue cancelada',
      resena: '¡Gracias por tu reseña!',
    }[done]
    const subtitulo = {
      confirmada: 'Te esperamos. Ya puedes cerrar esta pestaña.',
      reprogramada: 'Tu cita quedó confirmada para la nueva fecha. ¡Te esperamos! Ya puedes cerrar esta pestaña.',
      cancelada: '¡Esperamos verte pronto! Cuando quieras, reserva de nuevo. 👋',
      resena: 'Tu opinión nos ayuda a mejorar. Ya puedes cerrar esta pestaña.',
    }[done]
    return (
      <div className={styles.success}>
        <div className={styles.successIcon}><Check size={54} strokeWidth={3} /></div>
        <h1 className={styles.successTitle}>{titulo}</h1>
        <p className={styles.successSub}>{subtitulo}</p>
        <div className={styles.successBtns}>
          <button className={styles.btnLight} onClick={cerrar}>Cerrar</button>
          <button className={styles.btnOutlineLight} onClick={() => { window.location.href = 'https://barber.pe' }}>Volver al inicio</button>
        </div>
      </div>
    )
  }

  const f = partesFecha(reserva.fecha)
  const esAtendida = reserva.estado === 'Atendida'
  const estadoClass = {
    Pendiente: styles.statusPend, Confirmada: styles.statusConf,
    Atendida: styles.statusDone, Cancelada: styles.statusCanc,
  }[reserva.estado]

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <span className={styles.brand}>
          <span className={styles.brandMark}><Scissors size={15} /></span>
          barber<span className={styles.brandPe}>.pe</span>
        </span>
        <button className={styles.closeBtn} aria-label="Cerrar" onClick={cerrar}><X size={18} /></button>
      </header>

      <main className={styles.wrap}>
        <motion.div className={styles.card} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className={styles.cardTop}>
            <div className={styles.badge}>
              <div className={styles.badgeMon}>{f.mes}</div>
              <div className={styles.badgeDay}>{f.dia}</div>
              <div className={styles.badgeDow}>{f.dow}</div>
            </div>
            <div className={styles.cardHead}>
              <div className={styles.service}>{reserva.servicio}</div>
              <div className={styles.timeRow}><Clock size={14} /> {a12h(reserva.hora)}</div>
            </div>
            <span className={`${styles.status} ${estadoClass}`}>{reserva.estado}</span>
          </div>

          <div className={styles.details}>
            <div className={styles.detailRow}>
              <span className={styles.detailIcon}><User size={16} /></span>
              <div><div className={styles.detailLabel}>Profesional</div><div className={styles.detailValue}>{reserva.profesional}</div></div>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailIcon}><MapPin size={16} /></span>
              <div><div className={styles.detailLabel}>Sede</div><div className={styles.detailValue}>{reserva.sede}</div></div>
            </div>
          </div>
        </motion.div>

        {esAtendida ? (
          <div className={styles.actions}>
            <div className={styles.block}>
              <div className={styles.blockTitle}>¿Cómo fue tu experiencia?</div>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className={`${styles.star} ${calificacion >= n ? styles.starOn : ''}`} onClick={() => setCalificacion(n)} aria-label={`${n} estrellas`}><Star size={28} /></button>
                ))}
              </div>
              <textarea className={styles.textarea} placeholder="Cuéntanos tu experiencia (opcional)…" value={resena} onChange={(e) => setResena(e.target.value)} rows={4} />
              <button className={styles.btnPrimary} onClick={handleCalificar} disabled={isSubmitting || calificacion === 0}>{isSubmitting ? 'Guardando…' : 'Enviar reseña'}</button>
            </div>
          </div>
        ) : (
          <div className={styles.actions}>
            <button className={styles.btnPrimary} onClick={handleConfirmar} disabled={isSubmitting}>
              <Check size={18} /> {isSubmitting ? 'Confirmando…' : 'Confirmar asistencia'}
            </button>

            {!showReprog ? (
              <button className={styles.btnGhost} onClick={() => setShowReprog(true)}><CalendarClock size={17} /> Reprogramar cita</button>
            ) : (
              <div className={styles.block}>
                <div className={styles.blockTitle}><CalendarClock size={17} /> Reprogramar cita</div>

                <input
                  type="date"
                  className={styles.input}
                  min={hoy}
                  value={formReprogramar.fechaNueva}
                  onChange={(e) => {
                    const v = e.target.value
                    setFormReprogramar({ ...formReprogramar, fechaNueva: v })
                    cargarSlots(v)
                  }}
                />

                {/* Horarios disponibles (mismo cálculo que el step 3 de reserva) */}
                {loadingSlots ? (
                  <p style={{ margin: '12px 2px', color: '#6b7280', fontSize: 14 }}>Buscando horarios disponibles…</p>
                ) : formReprogramar.fechaNueva && slots.length === 0 ? (
                  <p style={{ margin: '12px 2px', color: '#6b7280', fontSize: 14 }}>
                    No hay horarios disponibles ese día. Prueba con otra fecha.
                  </p>
                ) : slots.length > 0 ? (
                  <>
                    <div style={{ margin: '12px 2px 6px', color: '#6b7280', fontSize: 13, fontWeight: 600 }}>
                      Elige un horario:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))', gap: 8, marginBottom: 4 }}>
                      {slots.map((s) => (
                        <button
                          key={s.horaInicio}
                          type="button"
                          onClick={() => setSlotSel(s.horaInicio)}
                          style={{
                            padding: '10px 6px',
                            borderRadius: 10,
                            border: slotSel === s.horaInicio ? '1.5px solid #15110e' : '1.5px solid #e5e7eb',
                            background: slotSel === s.horaInicio ? '#15110e' : '#fff',
                            color: slotSel === s.horaInicio ? '#fff' : '#1f2937',
                            fontWeight: 600,
                            fontSize: 13.5,
                            cursor: 'pointer',
                            transition: 'all .15s',
                          }}
                        >
                          {a12h(s.etiqueta)}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                <textarea className={styles.textarea} placeholder="Motivo (opcional)" value={formReprogramar.motivo} onChange={(e) => setFormReprogramar({ ...formReprogramar, motivo: e.target.value })} rows={2} />
                <button className={styles.btnPrimary} onClick={handleReprogramar} disabled={isSubmitting || !slotSel}>
                  {isSubmitting ? 'Reprogramando…' : 'Confirmar nueva fecha'}
                </button>
              </div>
            )}

            <button className={styles.btnDanger} onClick={handleCancelar} disabled={isSubmitting}><X size={16} /> {isSubmitting ? 'Cancelando…' : 'Cancelar cita'}</button>
          </div>
        )}
      </main>
    </div>
  )
}
