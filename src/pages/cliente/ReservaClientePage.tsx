import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar, X, Plus, Clock, MapPin, User, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { sedesService } from '@/services/sedesService'
import { reservasService } from '@/services/reservasService'
import { clientesService } from '@/services/clientesService'
import { mensajeError } from '@/utils/apiError'
import { buildImageUrl } from '@/services/apiClient'
import { confirmDialog } from '@/components/ConfirmDialog'
import { NegocioNoDisponible } from '@/components/NegocioNoDisponible'
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
  telefono: string
  correo: string
  tipoContacto: 'whatsapp' | 'email'
}

export function ReservaClientePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  // A dónde volver al cerrar: según el rol logueado; anónimo → landing.
  const volverA =
    user?.rol === 'Trabajador' ? '/mi-agenda'
      : (user?.rol === 'Admin' || user?.rol === 'SuperAdmin') ? '/admin/agenda'
        : '/'


  const [step, setStep] = useState(1)
  const [selectedServicios, setSelectedServicios] = useState<Servicio[]>([])
  const [selectedTrabajador, setSelectedTrabajador] = useState<Trabajador | null>(null)
  // Cuando se entra desde el modal de un trabajador en la landing (?trabajador=ID)
  // queda preseleccionado y se SALTA el paso "Elige tu Profesional".
  const [trabajadorBloqueado, setTrabajadorBloqueado] = useState(false)
  const [selectedFecha, setSelectedFecha] = useState<string>('')
  const [selectedHora, setSelectedHora] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    telefono: '',
    correo: '',
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

  // Bloqueo por inasistencias: si el backend rechaza con 403 "bloqueada",
  // mostramos un modal para que el cliente pueda solicitar el desbloqueo.
  const [bloqueoMsg, setBloqueoMsg] = useState<string | null>(null)
  const [solTel, setSolTel] = useState('')
  const [solMotivo, setSolMotivo] = useState('')
  const [enviandoSol, setEnviandoSol] = useState(false)
  const [solEnviada, setSolEnviada] = useState(false)

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
      telefono: user.telefono || prev.telefono,
      correo: user.correo || prev.correo,
      // Canal por defecto: correo si lo tiene, si no WhatsApp.
      tipoContacto: user.correo ? 'email' : (user.telefono ? 'whatsapp' : prev.tipoContacto),
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

      // Preselección de trabajador desde ?trabajador=<id> (viene del modal de la landing)
      const preTrabId = Number(new URLSearchParams(window.location.search).get('trabajador'))
      let bloqueado = false
      if (preTrabId) {
        const preT = (trabData || []).find((t) => t.idTrabajador === preTrabId)
        if (preT) {
          setSelectedTrabajador(preT)
          setTrabajadorBloqueado(true)
          bloqueado = true
        }
      }

      // Preselección desde ?servicio=<id>
      const preId = Number(new URLSearchParams(window.location.search).get('servicio'))
      if (preId) {
        const pre = (servData || []).find((x) => (x.idServicio || x.id) === preId)
        if (pre) {
          setSelectedServicios([pre])
          // Si además ya hay trabajador bloqueado, saltamos directo a Fecha/Hora.
          setStep(bloqueado ? 3 : 2)
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
    const contactoActual = (formData.tipoContacto === 'whatsapp' ? formData.telefono : formData.correo).trim()
    if (!selectedTrabajador || !selectedFecha || !selectedHora || !contactoActual || !formData.nombre.trim()) {
      toast.error('Por favor completa todos los campos')
      return
    }

    try {
      setIsSubmitting(true)

      const idServicios = selectedServicios
        .map((s) => s.idServicio ?? s.id ?? 0)
        .filter((x) => x > 0)

      const reservaData = {
        idTrabajador: selectedTrabajador.idTrabajador, // 0 = máxima disponibilidad
        idServicios,
        nombreCliente: formData.nombre.trim(),
        telefonoCliente: formData.tipoContacto === 'whatsapp'
          ? (formData.telefono.trim() || undefined)
          : undefined,
        correoCliente: formData.tipoContacto === 'whatsapp'
          ? undefined
          : (formData.correo.trim() || undefined),
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
      const status = error?.response?.status
      const detail = error?.response?.data?.detail || ''
      if (status === 403 && /bloquead/i.test(detail)) {
        // Cuenta bloqueada por inasistencias → ofrecer solicitar desbloqueo.
        setBloqueoMsg(detail)
        setSolTel((formData.tipoContacto === 'whatsapp' ? formData.telefono : formData.correo).trim())
        setSolMotivo('')
        setSolEnviada(false)
      } else {
        toast.error(mensajeError(error, 'No se pudo crear la reserva'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const enviarSolicitudDesbloqueo = async () => {
    const tel = solTel.trim()
    const motivo = solMotivo.trim()
    const okContacto = tel.includes('@') ? /\S+@\S+\.\S+/.test(tel) : tel.replace(/\D/g, '').length >= 6
    if (!okContacto) { toast.error('Ingresa tu teléfono o correo'); return }
    if (motivo.length < 5) { toast.error('Cuéntanos brevemente el motivo (mínimo 5 caracteres)'); return }
    try {
      setEnviandoSol(true)
      await clientesService.solicitarDesbloqueo(tel, motivo)
      setSolEnviada(true)
      toast.success('Solicitud enviada')
    } catch (e) {
      toast.error(mensajeError(e, 'No se pudo enviar la solicitud'))
    } finally {
      setEnviandoSol(false)
    }
  }

  const totalPrecio = selectedServicios.reduce((sum, s) => sum + s.precioBase, 0)
  const nextDays = getNextDays()
  const desktopWeekDays = getDesktopWeekDays()

  const handleBack = () => {
    if (step === 3 && trabajadorBloqueado) {
      setStep(1)
    } else if (step > 1) {
      setStep(step - 1)
    } else {
      navigate(volverA)
    }
  }

  const handleClose = async () => {
    const hayProgreso = step > 1 || selectedServicios.length > 0 || !!selectedTrabajador || !!selectedFecha || !!selectedHora || !!formData.telefono || !!formData.correo
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

  // ── Pantalla de ÉXITO (full-screen, oscuro · "reserva realizada, falta confirmar") ──
  if (exito) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100, color: '#fff',
        background: 'linear-gradient(165deg, #1c1c1e 0%, #0a0a0b 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, textAlign: 'center',
      }}>
        <style>{`
          @keyframes bpPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
          @keyframes bpFade{to{opacity:1;transform:translateY(0)}}
        `}</style>

        <div style={{
          width: 120, height: 120, borderRadius: 999, background: 'rgba(255,255,255,.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bpPop .5s ease-out',
        }}>
          <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 24, opacity: 0, transform: 'translateY(8px)', animation: 'bpFade .4s .5s forwards' }}>
          ¡Reserva realizada!
        </h1>
        <p style={{ fontSize: 15, maxWidth: 360, lineHeight: 1.5, color: 'rgba(255,255,255,.92)', opacity: 0, transform: 'translateY(8px)', animation: 'bpFade .4s .65s forwards' }}>
          Revisa tu {exito.canal} y confirma tu cita.
        </p>

        <div style={{ marginTop: 20, width: '100%', maxWidth: 360, background: 'rgba(255,255,255,.14)', borderRadius: 16, padding: '14px 18px', textAlign: 'left', opacity: 0, animation: 'bpFade .4s .8s forwards' }}>
          <p style={{ fontWeight: 700, fontSize: 16 }}>{exito.servicios}</p>
          <p style={{ fontSize: 14, marginTop: 4, color: 'rgba(255,255,255,.9)', textTransform: 'capitalize' }}>📅 {exito.fecha} · 🕐 {exito.hora}</p>
          {exito.sede && <p style={{ fontSize: 14, marginTop: 2, color: 'rgba(255,255,255,.9)' }}>📍 {exito.sede}</p>}
        </div>

        <div style={{ marginTop: 28, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10, opacity: 0, animation: 'bpFade .4s .95s forwards' }}>
          <button onClick={() => navigate(volverA)} style={{ background: 'rgba(255,255,255,.18)', color: '#fff', border: '1px solid rgba(255,255,255,.4)', borderRadius: 999, padding: '13px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  const brandStyle = { ['--brand' as any]: ((sede as any)?.colorPrimarioHex || '#2855F6') } as React.CSSProperties

  // Gating Tanda 3: si el local no existe / está pausado / dejó de ser público, el
  // backend responde 404 → sede queda null → mostramos "no disponible" en vez de un
  // formulario vacío que no llevaría a ninguna reserva válida.
  if (!sede) {
    return <NegocioNoDisponible mensaje="Por el momento este local no está disponible para reservas." />
  }

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
          <h1 className={styles.title}>Reservar cita</h1>
          {((sede as any)?.nombreComercial || (sede as any)?.nombre) && (
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
              {((sede as any)?.totalSedesPublicasMarca ?? 1) >= 2
                ? `${(sede as any).nombreComercial} – ${(sede as any).nombre}`
                : ((sede as any)?.nombreComercial || (sede as any)?.nombre)}
            </p>
          )}
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
                  <h2 className={styles.sectionTitle}>Selecciona un servicio</h2>
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
                        <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0 overflow-hidden">
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
                      <label className={styles.contactLabel}>Tu nombre</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className={styles.contactInput}
                      />
                    </div>

                    <label className={styles.contactPrompt}>¿A dónde enviaremos tu confirmación?</label>
                    <div className={styles.contactTypeSelector}>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipoContacto: 'whatsapp' })}
                        className={`${styles.contactTypeButton} ${formData.tipoContacto === 'whatsapp' ? styles.contactTypeButtonActive : ''}`}
                        aria-label="Confirmar por WhatsApp"
                        title="WhatsApp"
                      >
                        {formData.tipoContacto === 'whatsapp' && (
                          <span className={styles.contactCheck}><Check className="w-3.5 h-3.5" strokeWidth={3} /></span>
                        )}
                        <span className={styles.contactIconChip}>
                          <svg viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </span>
                        <span>WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipoContacto: 'email' })}
                        className={`${styles.contactTypeButton} ${formData.tipoContacto === 'email' ? styles.contactTypeButtonActive : ''}`}
                        aria-label="Confirmar por correo"
                        title="Correo electrónico"
                      >
                        {formData.tipoContacto === 'email' && (
                          <span className={styles.contactCheck}><Check className="w-3.5 h-3.5" strokeWidth={3} /></span>
                        )}
                        <span className={styles.contactIconChip}>
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="4.5" width="20" height="15" rx="2.5" fill="#EA4335" />
                            <path d="M3.5 7 12 12.5 20.5 7" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span>Email</span>
                      </button>
                    </div>

                    <div className={styles.contactInputGroup}>
                      <label className={styles.contactLabel}>
                        {formData.tipoContacto === 'whatsapp' ? 'Número de WhatsApp' : 'Correo electrónico'}
                      </label>
                      <input
                        type={formData.tipoContacto === 'whatsapp' ? 'tel' : 'email'}
                        value={formData.tipoContacto === 'whatsapp' ? formData.telefono : formData.correo}
                        onChange={(e) => setFormData({
                          ...formData,
                          [formData.tipoContacto === 'whatsapp' ? 'telefono' : 'correo']: e.target.value,
                        })}
                        className={styles.contactInput}
                      />
                    </div>
                  </div>

                  <div className={styles.infoMessages}>
                    <div className={styles.infoMessage}>
                      <p className={styles.infoMessageText}>
                        Te enviaremos un enlace de confirmación, necesitamos saber que eres tú para continuar.
                      </p>
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
                setStep(trabajadorBloqueado ? 3 : 2)
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
              (step === 4 && (!(formData.tipoContacto === 'whatsapp' ? formData.telefono.trim() : formData.correo.trim()) || !formData.nombre.trim())) ||
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

      {bloqueoMsg && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}
          onClick={() => !enviandoSol && setBloqueoMsg(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 16px 50px rgba(0,0,0,.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {solEnviada ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111' }}>Solicitud enviada</h3>
                <p style={{ margin: '0 0 18px', fontSize: 14, color: '#6b7280' }}>
                  La barbería revisará tu solicitud y reactivará tu cuenta si corresponde. Te avisarán por tu medio de contacto.
                </p>
                <button
                  onClick={() => setBloqueoMsg(null)}
                  style={{ padding: '11px 18px', borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' }}
                >
                  Entendido
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 34, marginBottom: 6 }}>🚫</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111' }}>Cuenta bloqueada</h3>
                <p style={{ margin: '0 0 16px', fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>{bloqueoMsg}</p>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Tu teléfono</label>
                <input
                  value={solTel}
                  onChange={(e) => setSolTel(e.target.value)}
                  inputMode="tel"
                  style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
                />

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Motivo de tu solicitud</label>
                <textarea
                  value={solMotivo}
                  onChange={(e) => setSolMotivo(e.target.value)}
                  rows={3}
                  maxLength={300}
                  style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button
                    onClick={() => setBloqueoMsg(null)}
                    disabled={enviandoSol}
                    style={{ flex: 1, padding: '11px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={enviarSolicitudDesbloqueo}
                    disabled={enviandoSol}
                    style={{ flex: 1, padding: '11px 16px', borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 700, cursor: enviandoSol ? 'default' : 'pointer', opacity: enviandoSol ? .7 : 1 }}
                  >
                    {enviandoSol ? 'Enviando…' : 'Solicitar desbloqueo'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
