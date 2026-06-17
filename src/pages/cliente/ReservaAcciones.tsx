import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { X, Clock, MapPin, User, Star, Check, CalendarClock, Scissors, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { setTenant } from '@/services/apiClient'
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
  logoSede?: string
  subdominio?: string
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
  const [fechaReprog, setFechaReprog] = useState('')
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

  useEffect(() => { loadReserva() }, [token])

  // Deep-link desde el correo (/reprogramar/): abre el modal si la cita lo permite
  useEffect(() => {
    if (
      location.pathname.includes('/reprogramar/') &&
      reserva &&
      (reserva.estado === 'Pendiente' || reserva.estado === 'Confirmada')
    ) {
      abrirReprog()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, reserva])

  const loadReserva = async () => {
    try {
      if (!token) { toast.error('Token inválido'); navigate('/'); return }
      const data = await reservasService.obtenerPorToken(token)
      if (data.subdominio) setTenant(data.subdominio)   // ← slots usan la sede correcta
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
        logoSede: data.urlLogo,
        subdominio: data.subdominio,
      })
    } catch {
      toast.error('No pudimos cargar la reserva. El enlace no es válido o expiró.')
    } finally { setLoading(false) }
  }

  // Abre el modal de reprogramar: preselecciona fecha y carga horarios
  const abrirReprog = () => {
    if (!reserva) return
    const inicial = reserva.fecha >= hoy ? reserva.fecha : hoy
    setFechaReprog(inicial)
    setSlotSel('')
    setShowReprog(true)
    cargarSlots(inicial)
  }

  const cerrarReprog = () => {
    setShowReprog(false)
    setSlotSel('')
    setSlots([])
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
    window.location.href = reserva?.subdominio
      ? `https://${reserva.subdominio}.barber.pe`
      : 'https://barber.pe'
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
    if (!token || !fechaReprog || !slotSel) {
      toast.error('Elige una fecha y un horario disponible'); return
    }
    if (!reserva) return
    setIsSubmitting(true)
    try {
      // .NET espera TimeOnly en formato "HH:mm:ss" (no "HH:mm")
      const horaInicio = /^\d{2}:\d{2}$/.test(slotSel) ? `${slotSel}:00` : slotSel
      await reservasService.reprogramarPorToken(token, {
        idTrabajador: reserva.idTrabajador,
        fechaReserva: fechaReprog,  // "YYYY-MM-DD"
        horaInicio,                 // "HH:mm:ss"
      })
      // Refleja la nueva fecha/hora en la tarjeta y cierra el modal
      setReserva((r) => (r ? { ...r, fecha: fechaReprog, hora: horaInicio.slice(0, 5), estado: 'Confirmada' } : r))
      cerrarReprog()
      setDone('reprogramada')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Error al reprogramar')
    } finally { setIsSubmitting(false) }
  }

  const handleCalificar = async () => {
    if (!token) return
    if (calificacion === 0) { toast.error('Selecciona una calificación'); return }
    setIsSubmitting(true)
    try {
      await reservasService.resenaPorToken(token, calificacion, resena)
      setDone('resena')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.message || 'Error al guardar la reseña')
    } finally { setIsSubmitting(false) }
  }

  // Helpers de fecha/hora
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
          <button className={styles.btnLight} onClick={cerrar}>Visitar sitio</button>
        </div>
      </div>
    )
  }

  const f = partesFecha(reserva.fecha)
  const esAtendida = reserva.estado === 'Atendida'
  const esCancelada = reserva.estado === 'Cancelada'
  const estadoClass = {
    Pendiente: styles.statusPend, Confirmada: styles.statusConf,
    Atendida: styles.statusDone, Cancelada: styles.statusCanc,
  }[reserva.estado]

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        {reserva.logoSede ? (
          <img
            src={reserva.logoSede}
            alt={reserva.sede}
            style={{ height: 28, maxWidth: 150, objectFit: 'contain' }}
          />
        ) : (
          <span className={styles.brand}>
            <span className={styles.brandMark}><Scissors size={15} /></span>
            {reserva.sede}
          </span>
        )}
        
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

        {/* ── ACCIONES SEGÚN ESTADO ── */}
        {esAtendida ? (
          // Atendida → reseña
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
        ) : esCancelada ? (
          // Cancelada → sin acciones, invitación a reservar de nuevo
          <div className={styles.actions}>
            <p style={{ margin: '2px 0 14px', color: '#6b7280', fontSize: 14.5, textAlign: 'center', lineHeight: 1.5 }}>
              Esta cita está cancelada. ¡Esperamos verte pronto! Cuando quieras, reserva de nuevo.
            </p>
            <button className={styles.btnPrimary} onClick={() => navigate('/reservar-publica')}>
              <RotateCcw size={17} /> Reservar de nuevo
            </button>
          </div>
        ) : (
          // Pendiente o Confirmada → acciones disponibles
          <div className={styles.actions}>
            {reserva.estado === 'Pendiente' ? (
              <button className={styles.btnPrimary} onClick={handleConfirmar} disabled={isSubmitting}>
                <Check size={18} /> {isSubmitting ? 'Confirmando…' : 'Confirmar asistencia'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0 4px', color: '#16a34a', fontWeight: 600, fontSize: 14.5 }}>
                <Check size={18} /> Ya confirmaste tu asistencia
              </div>
            )}

            <button className={styles.btnGhost} onClick={abrirReprog}>
              <CalendarClock size={17} /> Reprogramar cita
            </button>

            <button className={styles.btnDanger} onClick={handleCancelar} disabled={isSubmitting}>
              <X size={16} /> {isSubmitting ? 'Cancelando…' : 'Cancelar cita'}
            </button>
          </div>
        )}
      </main>

      {/* ── MODAL REPROGRAMAR ── */}
      {showReprog && (reserva.estado === 'Pendiente' || reserva.estado === 'Confirmada') && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) cerrarReprog() }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,14,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 430, maxHeight: '88vh', overflowY: 'auto', padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 17, color: '#15110e' }}>
                <CalendarClock size={19} /> Reprogramar cita
              </div>
              <button onClick={cerrarReprog} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ margin: '6px 0 16px', color: '#6b7280', fontSize: 13.5 }}>Elige una nueva fecha y un horario disponible.</p>

            <input
              type="date"
              className={styles.input}
              min={hoy}
              value={fechaReprog}
              onChange={(e) => { const v = e.target.value; setFechaReprog(v); cargarSlots(v) }}
              style={{ width: '100%' }}
            />

            {/* Horarios disponibles (mismo cálculo que el step 3) */}
            {loadingSlots ? (
              <p style={{ margin: '16px 2px', color: '#6b7280', fontSize: 14 }}>Buscando horarios disponibles…</p>
            ) : fechaReprog && slots.length === 0 ? (
              <p style={{ margin: '16px 2px', color: '#6b7280', fontSize: 14 }}>
                No hay horarios disponibles ese día. Prueba con otra fecha.
              </p>
            ) : slots.length > 0 ? (
              <>
                <div style={{ margin: '16px 2px 8px', color: '#6b7280', fontSize: 13, fontWeight: 600 }}>Elige un horario:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {slots.map((s) => (
                    <button
                      key={s.horaInicio}
                      type="button"
                      onClick={() => setSlotSel(s.horaInicio)}
                      style={{
                        padding: '11px 6px',
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

            <button
              className={styles.btnPrimary}
              onClick={handleReprogramar}
              disabled={isSubmitting || !slotSel}
              style={{ marginTop: 18, width: '100%' }}
            >
              {isSubmitting ? 'Reprogramando…' : 'Confirmar nueva fecha'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
