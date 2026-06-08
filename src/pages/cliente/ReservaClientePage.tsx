import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar, X, Plus, Clock, MapPin, User, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { sedesService } from '@/services/sedesService'
import { reservasService } from '@/services/reservasService'
import { buildImageUrl } from '@/services/apiClient'
import { confirmDialog } from '@/components/ConfirmDialog'
import { useAuthStore } from '@/store/authStore'
import { CalendarModal } from './CalendarModal'
import { ReservaResumen } from './ReservaResumen'
import { getActiveTenant } from '@/services/apiClient'

import { DateTimeModal, BarberCard, ServiceCard } from '@/components'
import styles from '@/styles/ReservaClientePage.module.css'

interface Trabajador {
  idTrabajador: number
  nombreCompleto: string
  telefono: string
  especialidad?: string
  experiencia?: number
  porcentajeComision?: number
  urlFotoPerfil?: string
}

interface Servicio {
  idServicio?: number
  id?: number
  nombre: string
  descripcionCorta?: string
  precioBase: number
  duracionMinutos: number
  estado: number
}

interface FormData {
  nombre: string
  contacto: string
  tipoContacto: 'whatsapp' | 'email'
}

export function ReservaClientePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  // A dónde volver al cerrar: cliente logueado → su dashboard; anónimo → landing.
  const volverA =
    user?.rol === 'Cliente' ? '/mi-perfil'
      : user?.rol === 'Trabajador' ? '/mi-agenda'
        : (user?.rol === 'Admin' || user?.rol === 'SuperAdmin') ? '/admin/agenda'
          : '/'


  const [step, setStep] = useState(1)
  const [selectedServicios, setSelectedServicios] = useState<Servicio[]>([])
  const [selectedTrabajador, setSelectedTrabajador] = useState<Trabajador | null>(null)
  const [selectedFecha, setSelectedFecha] = useState<string>('')
  const [selectedHora, setSelectedHora] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    contacto: '',
    tipoContacto: 'whatsapp',
  })
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([])
  const [sede, setSede] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showDateTimeModal, setShowDateTimeModal] = useState(false)
  const [currentWeekStart, setCurrentWeekStart] = useState(0)
  const [autoFocused, setAutoFocused] = useState(false)
  const [exito, setExito] = useState<null | { servicios: string; fecha: string; hora: string; sede: string; canal: string }>(null)

  // Vibración + sonido corto y agradable al confirmar (sin necesidad de archivos).
  const celebrar = () => {
    try { (navigator as any).vibrate?.([12, 50, 24]) } catch { /* noop */ }
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext)
      if (!AC) return
      const ctx = new AC()
      const now = ctx.currentTime
        ;[659.25, 987.77].forEach((f, i) => {           // E5 → B5, dos notas cortas
          const o = ctx.createOscillator(); const g = ctx.createGain()
          o.type = 'sine'; o.frequency.value = f
          o.connect(g); g.connect(ctx.destination)
          const t = now + i * 0.12
          g.gain.setValueAtTime(0, t)
          g.gain.linearRampToValueAtTime(0.18, t + 0.02)
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
          o.start(t); o.stop(t + 0.3)
        })
      setTimeout(() => { try { ctx.close() } catch { /* noop */ } }, 900)
    } catch { /* noop */ }
  }

  const fmtFechaExito = (iso: string) => {
    try { return new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }) }
    catch { return iso }
  }

  const sinPreferencias: Trabajador = {
    idTrabajador: 0,
    nombreCompleto: 'Sin preferencias',
    telefono: '',
    especialidad: 'Máxima disponibilidad',
    experiencia: 0,
  }

  // ✅ AUTO-FOCUS: Set today's date when entering Step 3
  useEffect(() => {
    if (step === 3 && !autoFocused && selectedTrabajador) {
      const today = new Date()
      const todayFormatted = formatDateForAPI(today)
      setSelectedFecha(todayFormatted)
      setAutoFocused(true)
    }
  }, [step, autoFocused, selectedTrabajador])

  // ✅ Load availability when date changes
  useEffect(() => {
    if (step === 3 && selectedTrabajador && selectedFecha) {
      loadDisponibilidad()
    }
  }, [selectedTrabajador, selectedFecha, selectedServicios, step])

  useEffect(() => {
    loadInitialData()
  }, [])
  // Pre-llena nombre y contacto si el usuario ya está logueado (editable).
  // Admin/Trabajador/Cliente: sus datos aparecen ya escritos en los campos.
  useEffect(() => {
    if (!user) return
    setFormData((prev) => ({
      ...prev,
      nombre: user.nombreCompleto || prev.nombre,
      ...(user.correo
        ? { tipoContacto: 'email' as const, contacto: user.correo }
        : user.telefono
          ? { tipoContacto: 'whatsapp' as const, contacto: user.telefono }
          : {}),
    }))
  }, [user])
  const loadInitialData = async () => {
    try {
      const sParam = new URLSearchParams(window.location.search).get('s')
      const host = window.location.hostname
      const subdominio = sParam
        ? sParam
        : (host === 'localhost' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.'))
          ? getActiveTenant()
          : host.split('.')[0]

      const [trabData, servData, sedeData] = await Promise.all([
        sedesService.getTrabajadoresPublicos(subdominio).catch(() => []),
        sedesService.getServiciosPublicos(subdominio).catch(() => []),
        sedesService.getSedePublica(subdominio).catch(() => null),
      ])
      setTrabajadores(trabData || [])
      setServicios(servData || [])
      setSede(sedeData)

      // Preselección desde ?servicio=<id>
      const preId = Number(new URLSearchParams(window.location.search).get('servicio'))
      if (preId) {
        const pre = (servData || []).find((x) => (x.idServicio || x.id) === preId)
        if (pre) {
          setSelectedServicios([pre])
          setStep(2)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getDayName = (date: Date) => {
    const names = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
    return names[date.getDay()]
  }

  const loadDisponibilidad = async () => {
    if (!selectedTrabajador || !selectedFecha) return
    try {
      const idServicios = selectedServicios
        .map((s) => s.idServicio ?? s.id ?? 0)
        .filter((x) => x > 0)
      const data = await reservasService.getSlotsDisponibles(
        selectedTrabajador.idTrabajador, // 0 = máxima disponibilidad (slots combinados)
        selectedFecha,
        idServicios
      )
      generateHoras(data)
    } catch (error) {
      console.error('Error cargando disponibilidad:', error)
      setHorasDisponibles([])
    }
  }

  const generateHoras = (disp: any[] | undefined) => {
    try {
      if (disp && Array.isArray(disp) && disp.length > 0) {
        if (disp[0]?.etiqueta) {
          const horas = disp.map((d: any) => d.etiqueta)
          setHorasDisponibles(horas)
          return
        }
      }
    } catch (error) {
      console.error('Error generando horas:', error)
    }
    setHorasDisponibles([])
  }

  const getNextDays = () => {
    const days = []
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      days.push(date)
    }
    return days
  }

  const getDesktopWeekDays = () => {
    const allDays = getNextDays()
    return allDays.slice(currentWeekStart, currentWeekStart + 8)
  }

  // ✅ Calculate total duration from all selected services
  const calculateTotalDuration = (): number => {
    return selectedServicios.reduce((sum, s) => sum + s.duracionMinutos, 0)
  }

  // ✅ Calculate end time from start time + total duration
  const calculateEndTime = (): string => {
    if (!selectedHora || selectedServicios.length === 0) return ''

    const [hours, minutes] = selectedHora.split(':').map(Number)
    const totalMinutes = calculateTotalDuration()

    let newHours = hours
    let newMinutes = minutes + totalMinutes

    if (newMinutes >= 60) {
      newHours += Math.floor(newMinutes / 60)
      newMinutes = newMinutes % 60
    }

    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
  }

  const handleSelectServicio = (servicio: Servicio) => {
    if (selectedServicios.find(s => s.idServicio === servicio.idServicio)) {
      setSelectedServicios(selectedServicios.filter(s => s.idServicio !== servicio.idServicio))
    } else {
      setSelectedServicios([...selectedServicios, servicio])
    }
  }

  const handleSelectTrabajador = (trab: Trabajador) => {
    if (selectedTrabajador?.idTrabajador === trab.idTrabajador) {
      setSelectedTrabajador(null)
    } else {
      setSelectedTrabajador(trab)
      setAutoFocused(false) // Reset auto-focus when changing professional
    }
  }

  const handleConfirmReserva = async () => {
    if (!selectedTrabajador || !selectedFecha || !selectedHora || !formData.contacto || !formData.nombre.trim()) {
      toast.error('Por favor completa todos los campos')
      return
    }

    try {
      setIsSubmitting(true)

      const idServicios = selectedServicios
        .map((s) => s.idServicio ?? s.id ?? 0)
        .filter((x) => x > 0)

      const reservaData = {
        idTrabajador: selectedTrabajador.idTrabajador, // 0 = máxima disponibilidad (auto-asigna)
        idServicios,
        nombreCliente: formData.nombre.trim(),
        telefonoCliente: formData.tipoContacto === 'whatsapp' ? formData.contacto : undefined,
        correoCliente: formData.tipoContacto === 'email' ? formData.contacto : undefined,
        canalConfirmacion: formData.tipoContacto === 'whatsapp' ? 'WhatsApp' : 'Email',
        fechaReserva: selectedFecha,
        horaInicio: selectedHora + ':00',
      }

      console.log('📤 Enviando reserva:', JSON.stringify(reservaData, null, 2))

      const resultado = await reservasService.createReserva(reservaData)
      console.log('✅ Reserva creada:', resultado)

      setExito({
        servicios: selectedServicios.map(s => s.nombre).join(', '),
        fecha: fmtFechaExito(selectedFecha),
        hora: (selectedHora || '').slice(0, 5),
        sede: (sede as any)?.nombre || (sede as any)?.nombreComercial || '',
        canal: formData.tipoContacto === 'whatsapp' ? 'WhatsApp' : 'Email',
      })
      celebrar()
    } catch (error: any) {
      console.error('❌ ERROR al crear reserva:', error.response?.data || error.message)
      toast.error(error.response?.data?.title || 'Error al crear reserva')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalPrecio = selectedServicios.reduce((sum, s) => sum + s.precioBase, 0)
  const nextDays = getNextDays()
  const desktopWeekDays = getDesktopWeekDays()

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    } else {
      navigate(volverA)
    }
  }

  const handleClose = async () => {
    const hayProgreso = step > 1 || selectedServicios.length > 0 || !!selectedTrabajador || !!selectedFecha || !!selectedHora || !!formData.contacto
    if (hayProgreso && !(await confirmDialog({
      title: 'Descartar cita',
      message: 'Se perderán los datos ingresados. ¿Deseas descartar la cita?',
      confirmText: 'Descartar',
      cancelText: 'Seguir aquí',
      tone: 'danger',
    }))) return
    navigate(volverA)
  }

  const handlePreviousWeek = () => {
    if (currentWeekStart > 0) {
      setCurrentWeekStart(currentWeekStart - 7)
      setSelectedFecha('')
      setSelectedHora('')
    }
  }

  const handleNextWeek = () => {
    if (currentWeekStart + 8 < nextDays.length) {
      setCurrentWeekStart(currentWeekStart + 7)
      setSelectedFecha('')
      setSelectedHora('')
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
      </div>
    )
  }

  // ── Pantalla de ÉXITO (full-screen, estilo Yape/Fresha) ──────────────────────
  if (exito) {
    const brand = (sede as any)?.colorPrimarioHex || '#2855F6'
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100, color: '#fff',
        background: `linear-gradient(160deg, ${brand}, ${brand}cc)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, textAlign: 'center',
      }}>
        <style>{`
          @keyframes bpPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
          @keyframes bpDraw{to{stroke-dashoffset:0}}
          @keyframes bpFade{to{opacity:1;transform:translateY(0)}}
        `}</style>

        <div style={{
          width: 120, height: 120, borderRadius: 999, background: 'rgba(255,255,255,.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bpPop .5s ease-out',
        }}>
          <svg width="74" height="74" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="24" fill="none" stroke="#fff" strokeWidth="3" strokeOpacity=".5" />
            <path d="M14 27 l8 8 l16 -18" fill="none" stroke="#fff" strokeWidth="4"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ strokeDasharray: 48, strokeDashoffset: 48, animation: 'bpDraw .5s .35s ease-out forwards' }} />
          </svg>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 24, opacity: 0, transform: 'translateY(8px)', animation: 'bpFade .4s .5s forwards' }}>
          ¡Reserva confirmada!
        </h1>
        <p style={{ fontSize: 15, maxWidth: 340, lineHeight: 1.5, color: 'rgba(255,255,255,.92)', opacity: 0, transform: 'translateY(8px)', animation: 'bpFade .4s .65s forwards' }}>
          Te enviaremos los detalles por {exito.canal}.
        </p>

        <div style={{ marginTop: 20, width: '100%', maxWidth: 360, background: 'rgba(255,255,255,.14)', borderRadius: 16, padding: '14px 18px', textAlign: 'left', opacity: 0, animation: 'bpFade .4s .8s forwards' }}>
          <p style={{ fontWeight: 700, fontSize: 16 }}>{exito.servicios}</p>
          <p style={{ fontSize: 14, marginTop: 4, color: 'rgba(255,255,255,.9)', textTransform: 'capitalize' }}>📅 {exito.fecha} · 🕐 {exito.hora}</p>
          {exito.sede && <p style={{ fontSize: 14, marginTop: 2, color: 'rgba(255,255,255,.9)' }}>📍 {exito.sede}</p>}
        </div>

        <div style={{ marginTop: 28, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10, opacity: 0, animation: 'bpFade .4s .95s forwards' }}>
          {user?.rol === 'Cliente' && (
            <button onClick={() => navigate('/mi-perfil')} style={{ background: '#fff', color: brand, border: 'none', borderRadius: 999, padding: '13px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              Ver mis citas
            </button>
          )}
          <button onClick={() => navigate(volverA)} style={{ background: 'rgba(255,255,255,.18)', color: '#fff', border: '1px solid rgba(255,255,255,.4)', borderRadius: 999, padding: '13px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  const brandStyle = { ['--brand' as any]: ((sede as any)?.colorPrimarioHex || '#2855F6') } as React.CSSProperties

  return (
    <div className={styles.container} style={brandStyle}>
      {/* HEADER FLOTANTE */}
      <div className={styles.floatingHeader}>
        <div className={styles.headerInner}>
          <button onClick={handleBack} className={styles.headerButton}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={handleClose} className={styles.headerButton}>
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className={styles.mainContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Reservar Cita</h1>
          <div className={styles.progressBar}>
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`${styles.progressStep} ${s <= step ? styles.progressStepActive : ''
                  }`}
              />
            ))}
          </div>
        </div>

        {/* GRID LAYOUT: Content + Sidebar */}
        <div className={styles.gridLayout}>
          {/* CONTENT AREA */}
          <div className={styles.contentArea}>
            <div className={styles.contentWrapper}>
              {/* STEP 1 - PREMIUM SERVICE CARD COMPONENT */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.stepContent}>
                  <h2 className={styles.sectionTitle}>Selecciona un Servicio</h2>
                  <div className="space-y-3">
                    {servicios.map((servicio) => (
                      <ServiceCard
                        key={servicio.idServicio || servicio.id}
                        id={servicio.idServicio || servicio.id || 0}
                        title={servicio.nombre}
                        duration={`${servicio.duracionMinutos} min`}
                        description={servicio.descripcionCorta || 'Servicio premium de calidad'}
                        price={servicio.precioBase}
                        currency="PEN"
                        isSelected={!!selectedServicios.find(s => s.idServicio === servicio.idServicio)}
                        onSelect={() => handleSelectServicio(servicio)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 2 - PREMIUM BARBER CARD COMPONENT */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.stepContent}>
                  <h2 className={styles.sectionTitle}>Elige tu Profesional</h2>
                  <div className="space-y-3">
                    {/* SIN PREFERENCIAS */}
                    <BarberCard
                      id={sinPreferencias.idTrabajador}
                      name={sinPreferencias.nombreCompleto}
                      role={sinPreferencias.especialidad || 'Profesional'}
                      isSelected={selectedTrabajador?.idTrabajador === sinPreferencias.idTrabajador}
                      onSelect={() => handleSelectTrabajador(sinPreferencias)}
                    />

                    {/* OTROS TRABAJADORES */}
                    {trabajadores.map((trab) => (
                      <BarberCard
                        key={trab.idTrabajador}
                        id={trab.idTrabajador}
                        name={trab.nombreCompleto}
                        role={trab.especialidad || 'Especialista'}
                        avatar={buildImageUrl(trab.urlFotoPerfil)}
                        isSelected={selectedTrabajador?.idTrabajador === trab.idTrabajador}
                        onSelect={() => handleSelectTrabajador(trab)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 3 - FECHA Y HORA */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.stepContent}>
                  <h2 className={styles.sectionTitle}>Selecciona Fecha y Hora</h2>

                  {/* ✅ PROFESSIONAL HEADER - Mini avatar + name + calendar button */}
                  {selectedTrabajador && (
                    <div className="flex items-center justify-between mb-6 px-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                          {selectedTrabajador.nombreCompleto.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">
                          {selectedTrabajador.nombreCompleto.split(' ')[0]}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowCalendar(true)}
                        className={styles.calendarButton}
                      >
                        <Calendar className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* FECHAS - DESKTOP (8 días + flechas) */}
                  <div className={styles.dateSelectorDesktop}>
                    <div className={styles.desktopWeekNav}>
                      <button
                        onClick={handlePreviousWeek}
                        disabled={currentWeekStart === 0}
                        className={styles.weekNavButton}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className={styles.desktopDateGrid}>
                        {desktopWeekDays.map((date, idx) => (
                          <motion.button
                            key={idx}
                            onClick={() => {
                              setSelectedFecha(formatDateForAPI(date))
                              setSelectedHora('')
                            }}
                            whileHover={{ scale: 1.05 }}
                            className={`${styles.dateButton} ${selectedFecha === formatDateForAPI(date) ? styles.dateButtonSelected : ''
                              }`}
                          >
                            <div className="text-xs font-bold uppercase">{getDayName(date)}</div>
                            <div className="text-lg font-bold">{date.getDate()}</div>
                            <div className="text-xs opacity-75">
                              {date.toLocaleString('es', { month: 'short' })}
                            </div>
                          </motion.button>
                        ))}
                      </div>

                      <button
                        onClick={handleNextWeek}
                        disabled={currentWeekStart + 8 >= nextDays.length}
                        className={styles.weekNavButton}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* FECHAS - MÓVIL (Carrusel 30 días) */}
                  <div className={styles.dateSelectorMobile}>
                    <div className={styles.carouselWrapper}>
                      <div className={styles.dateScroller}>
                        {nextDays.map((date, idx) => (
                          <motion.button
                            key={idx}
                            onClick={() => {
                              setSelectedFecha(formatDateForAPI(date))
                              setSelectedHora('')
                            }}
                            whileHover={{ scale: 1.05 }}
                            className={`${styles.dateButton} ${selectedFecha === formatDateForAPI(date) ? styles.dateButtonSelected : ''
                              }`}
                          >
                            <div className="text-xs font-bold uppercase">{getDayName(date)}</div>
                            <div className="text-sm font-bold">{date.getDate()}</div>
                            <div className="text-xs opacity-75">
                              {date.toLocaleString('es', { month: 'short' })}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* HORARIOS - LISTA VERTICAL */}
                  <div className={styles.dateSelector}>
                    <h3 className={styles.dateSelectorTitle}>Elige una Hora</h3>
                    {!selectedFecha ? (
                      <div className={styles.emptyState}>
                        <p className={styles.emptyStateText}>
                          Selecciona una fecha para ver horarios disponibles
                        </p>
                      </div>
                    ) : horasDisponibles.length === 0 ? (
                      <div className={styles.emptyState}>
                        <p className={styles.emptyStateText}>
                          No hay horarios disponibles para esta fecha
                        </p>
                      </div>
                    ) : (
                      <div className={styles.verticalHourList}>
                        {horasDisponibles.map((hora) => (
                          <motion.button
                            key={hora}
                            onClick={() => setSelectedHora(hora)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`${styles.verticalHourButton} ${selectedHora === hora ? styles.verticalHourButtonSelected : ''
                              }`}
                          >
                            <span>{hora}</span>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.stepContent}>
                  <h2 className={styles.sectionTitle}>Confirmación</h2>

                  <div className={styles.contactSection}>
                    <div className={styles.contactInputGroup}>
                      <label className={styles.contactLabel}>Nombre</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Tu nombre"
                        className={styles.contactInput}
                      />
                    </div>

                    <div className={styles.contactTypeSelector}>
                      <button
                        onClick={() => setFormData({ ...formData, tipoContacto: 'whatsapp', contacto: '' })}
                        className={`${styles.contactTypeButton} ${formData.tipoContacto === 'whatsapp' ? styles.contactTypeButtonActive : ''}`}
                      >
                        {formData.tipoContacto === 'whatsapp' && <Check className="w-4 h-4" />}
                        <span className={styles.contactTypeIcon}>💬</span>
                        <span>WhatsApp</span>
                      </button>
                      <button
                        onClick={() => setFormData({ ...formData, tipoContacto: 'email', contacto: '' })}
                        className={`${styles.contactTypeButton} ${formData.tipoContacto === 'email' ? styles.contactTypeButtonActive : ''}`}
                      >
                        {formData.tipoContacto === 'email' && <Check className="w-4 h-4" />}
                        <span className={styles.contactTypeIcon}>📧</span>
                        <span>Email</span>
                      </button>
                    </div>

                    <div className={styles.contactInputGroup}>
                      <label className={styles.contactLabel}>
                        {formData.tipoContacto === 'whatsapp' ? 'Número WhatsApp' : 'Correo Electrónico'}
                      </label>
                      <input
                        type={formData.tipoContacto === 'whatsapp' ? 'tel' : 'email'}
                        value={formData.contacto}
                        onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                        placeholder={formData.tipoContacto === 'whatsapp' ? 'Ej: 960935527' : 'tu@email.com'}
                        className={styles.contactInput}
                      />
                    </div>
                  </div>

                  <div className={styles.infoMessages}>
                    <div className={styles.infoMessage}>
                      <p className={styles.infoMessageText}>Te enviaremos un enlace de confirmación</p>
                    </div>
                    <div className={styles.infoMessage}>
                      <p className={styles.infoMessageText}>Necesitamos saber que eres tú para continuar</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* SIDEBAR AREA - Desktop only, STICKY */}
          <div className={`${styles.sidebar} ${styles.sidebarArea}`}>
            <ReservaResumen
              sede={sede}
              selectedServicios={selectedServicios}
              selectedTrabajador={selectedTrabajador}
              selectedFecha={selectedFecha}
              selectedHora={selectedHora}
              totalPrecio={totalPrecio}
              totalDuration={calculateTotalDuration()}
              endTime={calculateEndTime()}
            />
          </div>
        </div>
      </div>

      {/* FOOTER FLOTANTE */}
      <div className={styles.floatingFooter}>
        <div className={styles.footerContent}>
          <div className={styles.footerInfo}>
            <span className={styles.footerLabel}>
              {selectedServicios.length} artículo{selectedServicios.length > 1 ? 's' : ''}
            </span>
            <span className={styles.footerPrice}>S/ {totalPrecio.toFixed(2)}</span>
          </div>

          <button
            onClick={() => {
              if (step === 1) {
                setStep(2)
              } else if (step === 2) {
                setStep(3)
              } else if (step === 3) {
                setStep(4)
              } else if (step === 4) {
                handleConfirmReserva()
              }
            }}
            disabled={
              (step === 1 && selectedServicios.length === 0) ||
              (step === 2 && !selectedTrabajador) ||
              (step === 3 && (!selectedFecha || !selectedHora)) ||
              (step === 4 && (!formData.contacto || !formData.nombre.trim())) ||
              isSubmitting
            }
            className={styles.floatingButton}
          >
            {step === 4 ? (isSubmitting ? 'Confirmando...' : 'Confirmar') : 'Continuar'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modern Date/Time Modal */}
      <DateTimeModal
        isOpen={showDateTimeModal}
        selectedDate={selectedFecha}
        selectedTime={selectedHora}
        selectedProfessional={selectedTrabajador ? {
          id: selectedTrabajador.idTrabajador,
          name: selectedTrabajador.nombreCompleto,
        } : null}
        onSelectDate={(date) => {
          setSelectedFecha(date)
          setSelectedHora('')
        }}
        onSelectTime={setSelectedHora}
        onClose={() => setShowDateTimeModal(false)}
        availableTimes={horasDisponibles}
      />

      {/* Legacy Calendar Modal (kept as backup) */}
      <CalendarModal
        isOpen={showCalendar}
        selectedDate={selectedFecha}
        onSelectDate={setSelectedFecha}
        onClose={() => setShowCalendar(false)}
      />
    </div>
  )
}
