import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Scissors, CalendarCheck, CalendarClock, Wallet, Users, Globe, Star,
  Check, X, ShieldCheck, ArrowRight, Plus, Menu, FileSpreadsheet, FileText,
} from 'lucide-react'
import { landingService, type SedeDestacada } from '@/services/landingService'
import { setTenant, buildImageUrl, apiClient } from '@/services/apiClient'
import styles from './Landing.module.css'

/* ════════════════════════════════════════════════════════════════════════
   CONFIGURACIÓN — ajustar antes de publicar
   ════════════════════════════════════════════════════════════════════════ */
const WHATSAPP = '51999888777'         // ← tu número real (51 + 9 dígitos)

// Respaldo si aún no existe GET /api/Sedes/publicas (ver LEEME). Con ese endpoint,
// el carrusel y los avatares muestran TODAS las sedes automáticamente.
const SEDES_FALLBACK = ['demo', 'barberhouse-sanisidro', 'sanisidro']

// Fotos de ambiente (Pexels, uso libre). RECOMENDADO: descárgalas y sírvelas desde
// tu propio dominio (ej. /img/...) para mejor velocidad y para no depender de Pexels.
const PHOTOS = {
  gallery: [
    { src: 'https://images.pexels.com/photos/7518728/pexels-photo-7518728.jpeg?auto=compress&cs=tinysrgb&w=1200', cap: 'Tu local', bg: '#1b2440' },
    { src: 'https://images.pexels.com/photos/2035227/pexels-photo-2035227.jpeg?auto=compress&cs=tinysrgb&w=1200', cap: 'Cada corte', bg: '#22184a' },
    { src: 'https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg?auto=compress&cs=tinysrgb&w=1200', cap: 'Tu equipo', bg: '#0e2a2a' },
  ],
  cta: 'https://images.pexels.com/photos/3998403/pexels-photo-3998403.jpeg?auto=compress&cs=tinysrgb&w=1600',
}

/* ── helpers ───────────────────────────────────────────────────────────── */
const waLink = (t: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t)}`
const iniciales = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
const AV_PAL = ['#2855F6', '#1E3FCC', '#5076F8', '#1b2440', '#2855F6']

const WaIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.2 1.1-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.3 0 .5l-.4.5-.3.3c-.1.1-.3.3-.1.5.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.8.9c.2.1.4.2.5.3.1.2.1.6-.1 1.1Z" />
  </svg>
)

const ease = [0.2, 0.7, 0.2, 1] as const
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, delay, ease }}>
      {children}
    </motion.div>
  )
}

/* Testimonios de MUESTRA — reemplázalos por reseñas reales antes de publicar.
   Publicar reseñas inventadas como reales es publicidad engañosa. */
const TESTIMONIOS = [
  { s: 5, q: 'Los recordatorios por WhatsApp nos bajaron los plantones casi a la mitad. El cliente confirma y ya no se olvida.', n: 'Andrés Quispe', r: 'Dueño · Barbería El Patrón' },
  { s: 5, q: 'Ahora el cliente reserva solo desde el link. Dejé de vivir pegado al WhatsApp respondiendo "¿hay hueco?".', n: 'Marco Ríos', r: 'Barbero · Fade Studio' },
  { s: 5, q: 'El cierre de caja al final del día es lo mejor. Sé cuánto entró y cuánto le toca a cada barbero.', n: 'Luis Paredes', r: 'Administrador · Don Barbas' },
  { s: 5, q: 'Manejo mis dos locales desde una sola cuenta. La agenda de cada sede por separado me ordenó todo.', n: 'Diego Salas', r: 'Dueño · Salas Barber Co.' },
  { s: 5, q: 'Lo configuramos en una tarde. Mis barberos lo usan desde el celular sin que les explique nada.', n: 'Renzo Cárdenas', r: 'Dueño · The Cut Lab' },
  { s: 5, q: 'Tener mi propia página de reservas con mi marca se ve mucho más profesional que un grupo de WhatsApp.', n: 'Kevin Torres', r: 'Barbero · Urban Barber' },
]

// Barras del mini-reporte (estáticas, demostrativas; fines de semana resaltados)
const REPORT_BARS = (() => {
  const baseByWd: Record<number, number> = { 0: 24, 1: 46, 2: 42, 3: 48, 4: 54, 5: 74, 6: 96 }
  const out: { h: number; we: boolean }[] = []
  for (let d = 1; d <= 26; d++) {
    const wd = new Date(2026, 5, d).getDay()
    const h = Math.max(8, Math.min(100, Math.round(baseByWd[wd] * (1 + (((d * 37) % 11) - 5) / 100))))
    out.push({ h, we: wd === 0 || wd === 6 })
  }
  return out
})()

/* ════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [ciclo, setCiclo] = useState<'mes' | 'anio'>('mes')
  const [faq, setFaq] = useState<number | null>(0)
  const [sedes, setSedes] = useState<SedeDestacada[]>([])
  const [lead, setLead] = useState({ nombre: '', barberia: '', telefono: '', correo: '', ciudad: '', barberos: 'Solo yo' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [err, setErr] = useState('')
  const [demoOpen, setDemoOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let alive = true
    landingService.getSedesPublicas(SEDES_FALLBACK).then((s) => { if (alive) setSedes(s) })
    return () => { alive = false }
  }, [])

  const irA = (id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const ejemplo = sedes[0] ?? null
  const verEjemplo = () => { if (!ejemplo) return; if (ejemplo.subdominio) setTenant(ejemplo.subdominio); navigate(`/sede/${ejemplo.idSede}`) }
  const verSede = (s: SedeDestacada) => { if (s.subdominio) setTenant(s.subdominio); navigate(`/sede/${s.idSede}`) }

  const enviarLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enviando) return
    setEnviando(true); setErr('')
    try {
      await apiClient.post('/api/leads', {
        nombre: lead.nombre, barberia: lead.barberia,
        telefono: lead.telefono, correo: lead.correo, ciudad: lead.ciudad, barberos: lead.barberos,
      })
      setEnviado(true)
    } catch {
      setErr('No se pudo enviar. Revisa tu conexión e intenta de nuevo.')
    } finally { setEnviando(false) }
  }

  const abrirDemo = () => { setEnviado(false); setErr(''); setDemoOpen(true) }

  useEffect(() => {
    if (!demoOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDemoOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [demoOpen])

  const proMes = ciclo === 'mes' ? 59 : 49
  const cadMes = ciclo === 'mes' ? 119 : 99

  const mqSedes = useMemo(() => {
    if (!sedes.length) return []
    const o = [...sedes]; while (o.length < 6) o.push(...sedes); return o
  }, [sedes])
  const avatars = sedes.slice(0, 5)

  const Si = () => <span className={styles.yes}><Check size={13} /></span>
  const No = () => <span className={styles.no}><X size={13} /></span>
  type Cell = { y?: boolean; n?: boolean; t?: string; mut?: boolean }
  const cell = (c: Cell, k: number) =>
    c.y ? <Si key={k} /> : c.n ? <No key={k} />
      : <span key={k} className={c.mut ? styles.mxTxtMut : styles.mxTxt}>{c.t}</span>

  const matrix: { f: string; cols: [Cell, Cell, Cell] }[] = [
    { f: 'Página de reservas propia', cols: [{ y: true }, { y: true }, { y: true }] },
    { f: 'Reservas online', cols: [{ t: 'Ilimitadas' }, { t: 'Ilimitadas' }, { t: 'Ilimitadas' }] },
    { f: 'Barberos', cols: [{ t: '1' }, { t: 'Ilimitados' }, { t: 'Ilimitados' }] },
    { f: 'Sedes', cols: [{ t: '1' }, { t: '1' }, { t: 'Ilimitadas' }] },
    { f: 'Recordatorios WhatsApp', cols: [{ t: '30/mes', mut: true }, { t: '1.000/mes' }, { t: '3.000/mes' }] },
    { f: 'Agenda por barbero', cols: [{ y: true }, { y: true }, { y: true }] },
    { f: 'Gestión de clientes', cols: [{ y: true }, { y: true }, { y: true }] },
    { f: 'Caja y reportes', cols: [{ n: true }, { y: true }, { y: true }] },
    { f: 'Gastos e inventario', cols: [{ n: true }, { y: true }, { y: true }] },
    { f: 'Comisiones por barbero', cols: [{ n: true }, { y: true }, { y: true }] },
    { f: 'Reseñas automáticas', cols: [{ n: true }, { y: true }, { y: true }] },
    { f: 'Dominio y marca propia', cols: [{ t: 'Básico', mut: true }, { y: true }, { y: true }] },
    { f: 'Panel de toda la cadena', cols: [{ n: true }, { n: true }, { y: true }] },
    { f: 'Roles y permisos por sede', cols: [{ n: true }, { n: true }, { y: true }] },
    { f: 'Soporte', cols: [{ t: 'Por WhatsApp', mut: true }, { t: 'Prioritario' }, { t: 'Prioritario + onboarding' }] },
  ]

  const nav = ['Funciones', 'Reportes', 'Precios', 'Preguntas']
  const navIds = ['funciones', 'reportes', 'precios', 'faq']

  return (
    <div className={styles.page}>
      <div className={styles.pole} />

      {/* NAV */}
      <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navIn}>
          <span className={styles.logo} onClick={() => irA('top')}><span className={styles.logoMark}><Scissors size={18} /></span>barber<span className={styles.pe}>.pe</span></span>
          <nav className={styles.navLinks}>{nav.map((n, i) => <a key={n} onClick={() => irA(navIds[i])}>{n}</a>)}</nav>
          <div className={styles.navCta}>
            <Link to="/login" className={styles.linkLogin}>Ingresar</Link>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={abrirDemo}>Prueba gratis</button>
            <button className={styles.hamb} aria-label="Menú" onClick={() => setMenuOpen((v) => !v)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
        </div>
        {menuOpen && (
          <div className={styles.mobileMenu}>
            {nav.map((n, i) => <a key={n} onClick={() => irA(navIds[i])}>{n}</a>)}
            <Link to="/login" className={`${styles.btn} ${styles.btnGhost}`}>Ingresar</Link>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={abrirDemo}>Prueba gratis</button>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className={styles.hero} id="top">
        <div className={styles.heroBg}><div className={styles.heroGrid} /></div>
        <div className={`${styles.wrap} ${styles.heroIn}`}>
          <div>
            <Reveal><span className={styles.pillBadge}>🇵🇪 Software para barberías, hecho en Perú</span></Reveal>
            <Reveal delay={0.05}><h1>La agenda inteligente para tu barbería</h1></Reveal>
            <Reveal delay={0.1}><p className={styles.heroSub}>Tu propia página de reservas, recordatorios por WhatsApp, agenda por barbero y caja — todo en una sola plataforma. En soles, <b>sin comisiones</b>, lista en minutos.</p></Reveal>
            <Reveal delay={0.15}>
              <div className={styles.heroCta}>
                <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`} onClick={abrirDemo}>Prueba gratis <ArrowRight size={18} /></button>
                {ejemplo
                  ? <button className={styles.btnLink} onClick={verEjemplo}>Ver una barbería de ejemplo <ArrowRight size={16} /></button>
                  : <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`} onClick={() => irA('funciones')}>Ver funciones</button>}
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className={styles.heroAside}>
                <span><i className={styles.ck}><Check size={12} /></i> Sin comisiones</span>
                <span><i className={styles.ck}><Check size={12} /></i> Sin permanencia</span>
                <span><i className={styles.ck}><Check size={12} /></i> Soporte por WhatsApp</span>
              </div>
            </Reveal>
            <Reveal delay={0.25}>
              <div className={styles.proof}>
                <div className={styles.avs}>
                  {(avatars.length ? avatars : [0, 1, 2, 3]).map((s: any, i) => {
                    const isSede = typeof s === 'object'
                    const ini = isSede ? iniciales(s.nombre || 'B') : ['AQ', 'MR', 'LP', 'DS'][i]
                    const logo = isSede && s.logoUrl ? buildImageUrl(s.logoUrl) : ''
                    return (
                      <span key={i} className={styles.a} style={{ background: AV_PAL[i % AV_PAL.length] }}>
                        {logo ? <img src={logo} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).replaceWith(document.createTextNode(ini)) }} /> : ini}
                      </span>
                    )
                  })}
                  {sedes.length > 5 && <span className={`${styles.a} ${styles.more}`}>+{sedes.length - 5}</span>}
                </div>
                <div className={styles.proofMeta}><div className={styles.st}>★★★★★</div><div className={styles.tx}>Barberías de Lima, Arequipa y más <b>ya reservan con barber.pe</b></div></div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15} className={styles.heroVisual}>
            <div className={styles.panel}>
              <div className={styles.panelBar}>
                <span className={styles.dot} style={{ background: '#FF5F57' }} /><span className={styles.dot} style={{ background: '#FEBC2E' }} /><span className={styles.dot} style={{ background: '#28C840' }} />
                <span className={styles.tab}>Panel · Hoy</span>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.panelHd}><span className={styles.h}>Agenda de hoy</span><span className={styles.s}>Vie 6 jun</span></div>
                <div className={styles.kpis}>
                  <div className={styles.kpi}><div className={styles.l}>Reservas</div><div className={`${styles.v} ${styles.tnum}`}>18</div><div className={`${styles.d} ${styles.up}`}>+12%</div></div>
                  <div className={styles.kpi}><div className={styles.l}>Ocupación</div><div className={`${styles.v} ${styles.tnum}`}>86%</div><div className={styles.d}>&nbsp;</div></div>
                  <div className={styles.kpi}><div className={styles.l}>Ingresos</div><div className={`${styles.v} ${styles.tnum}`}>S/1.240</div><div className={`${styles.d} ${styles.up}`}>hoy</div></div>
                </div>
                <div className={styles.agendaHd}>Próximas citas</div>
                {[['09:30', 'CR', 'Carlos Ramírez', 'Corte + barba', 'ok'], ['10:15', 'JM', 'José Medina', 'Corte clásico', 'ok'], ['11:00', 'LP', 'Luis Paredes', 'Perfilado de barba', 'wait']].map(([t, av, n, x, st]) => (
                  <div className={styles.row} key={t}>
                    <span className={styles.time}>{t}</span><span className={styles.av}>{av}</span>
                    <span className={styles.meta}><span className={styles.n}>{n}</span><span className={styles.x}>{x}</span></span>
                    <span className={`${styles.chip} ${st === 'ok' ? styles.chipOk : styles.chipWait}`}>{st === 'ok' ? 'Confirmado' : 'Por confirmar'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.miniPhone}>
              <div className={styles.scr}>
                <div className={styles.mpTop}><div className={styles.mpLogo}><Scissors size={17} /></div></div>
                <div className={styles.mpBody}>
                  <div className={styles.mpName}>Barbería El Patrón</div>
                  <div className={styles.mpMeta}>★★★★★ 4.9 · Reservar</div>
                  <div className={styles.mpSv}><span><div className={styles.nm}>Corte clásico</div><div className={styles.pr}>30 min · S/35</div></span><span className={styles.bk}>Reservar</span></div>
                  <div className={styles.mpSv}><span><div className={styles.nm}>Corte + barba</div><div className={styles.pr}>45 min · S/50</div></span><span className={styles.bk}>Reservar</span></div>
                </div>
              </div>
            </div>
            <div className={`${styles.floatChip} ${styles.fc1}`}><span className={styles.i}><Check size={15} /></span><div>Reserva confirmada<small>hace 2 min</small></div></div>
            <div className={`${styles.floatChip} ${styles.fc2}`}><span className={styles.i}><WaIcon size={15} /></span><div>Recordatorio enviado<small>WhatsApp ✓</small></div></div>
          </Reveal>
        </div>
      </section>

      {/* CARRUSEL DE SEDES */}
      <div className={styles.trust}>
        <div className={styles.wrap}>
          <span className={styles.lab} style={{ display: 'block', textAlign: 'center', marginBottom: 18 }}>
            {sedes.length ? 'Barberías que ya trabajan con barber.pe' : 'Pensado para barberías de todo el Perú'}
          </span>
        </div>
        {mqSedes.length ? (
          <div className={styles.marquee}>
            <div className={styles.mqTrack}>
              {[...mqSedes, ...mqSedes].map((s, i) => (
                <button className={styles.sedeChip} key={`${s.idSede}-${i}`} onClick={() => verSede(s)} title={`Ver ${s.nombre}`}>
                  <span className={styles.mk}>{s.logoUrl ? <img src={buildImageUrl(s.logoUrl)} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} /> : <Scissors size={18} />}</span>
                  <span><span className={styles.nm}>{s.nombre}</span><span className={styles.lo}>{s.ciudad || s.direccion || 'Perú'}</span></span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={`${styles.wrap} ${styles.trustIn}`}>
            {['Lima', 'Arequipa', 'Trujillo', 'Cusco', 'Piura', 'Chiclayo'].map((c) => <span className={styles.city} key={c}>{c}</span>)}
          </div>
        )}
      </div>

      {/* GALERÍA (fotos reales) */}
      <section className={styles.sec} id="galeria">
        <div className={styles.wrap}>
          <Reveal className={styles.head}><span className={styles.eyebrow}>El día a día</span><h2>Hecho para el ritmo de tu barbería</h2><p>Desde una silla hasta varias sedes — barber.pe se adapta a tu negocio.</p></Reveal>
          <div className={styles.gallery}>
            {PHOTOS.gallery.map((g, i) => (
              <Reveal className={styles.gphoto} key={i} delay={i * 0.06}>
                <img loading="lazy" src={g.src} alt={g.cap} onError={(e) => { const el = e.currentTarget as HTMLImageElement; el.style.display = 'none'; (el.parentElement as HTMLElement).style.background = g.bg }} />
                <span className={styles.gcap}>{g.cap}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FUNCIONES (bento) */}
      <section className={styles.sec} id="funciones">
        <div className={styles.wrap}>
          <Reveal className={styles.head}><span className={styles.eyebrow}>Funciones</span><h2>Todo en una sola plataforma</h2><p>Una sola herramienta para reservar, recordar, atender y cobrar. Sin cuadernos ni hojas de cálculo.</p></Reveal>
          <div className={styles.bento}>
            <Reveal className={`${styles.bCard} ${styles.bGreen} ${styles.spanTall}`}>
              <span className={styles.bIcon}><WaIcon size={21} /></span>
              <span className={styles.bEye}>WhatsApp en automático</span>
              <h3>Confirma y recuerda solo</h3>
              <p>El cliente recibe la confirmación al reservar y un recordatorio antes de la cita, con botones para confirmar o reprogramar.</p>
              <div className={styles.bChat}>
                <div className={`${styles.bubble} ${styles.bIn}`} style={{ margin: 0, maxWidth: '92%' }}>Te recordamos tu cita mañana 10:15 a.m. en El Patrón 💈</div>
                <div className={`${styles.bubble} ${styles.bOut}`} style={{ margin: '6px 0 0 auto' }}>Confirmar ✅</div>
              </div>
            </Reveal>
            <Reveal className={`${styles.bCard} ${styles.bPaper} ${styles.span3}`}>
              <span className={styles.bEye}>Menos sillas vacías</span>
              <h3>Menos plantones</h3>
              <p>Con recordatorios automáticos, menos clientes olvidan su cita.</p>
              <svg className={styles.spark} viewBox="0 0 260 60" preserveAspectRatio="none"><polyline points="0,14 40,18 80,16 120,26 160,30 200,42 260,50" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Reveal>
            <Reveal className={`${styles.bCard} ${styles.bBlue} ${styles.span3}`}>
              <span className={styles.bIcon}><Globe size={21} /></span><span className={styles.bEye}>Tu marca</span>
              <h3>Tu página de reservas propia</h3>
              <p>Un microsite con tu logo y color, en tu subdominio (tubarberia.barber.pe). Tu marca, no un marketplace.</p>
            </Reveal>
            <Reveal className={`${styles.bCard} ${styles.bAmber} ${styles.span2}`}>
              <span className={styles.bIcon}><Wallet size={21} /></span><span className={styles.bEye}>Caja del día</span>
              <h3 className={styles.tnum}>S/ 1.060</h3><p>Ventas y gastos por método de pago, claros al cierre.</p>
            </Reveal>
            <Reveal className={`${styles.bCard} ${styles.bPurple} ${styles.span2}`}>
              <span className={styles.bIcon}><Star size={21} /></span><span className={styles.bEye}>Reputación</span>
              <h3>Reseñas automáticas</h3><p>Pide la calificación por WhatsApp tras cada cita.</p>
            </Reveal>
            <Reveal className={`${styles.bCard} ${styles.bPaper} ${styles.span2}`}>
              <span className={styles.bIcon}><CalendarClock size={21} /></span><span className={styles.bEye}>Sin choques</span>
              <h3>Agenda por barbero</h3><p>Disponibilidad real por servicio y por cada barbero.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* EN ACCIÓN */}
      <section className={`${styles.sec} ${styles.paperBand}`} id="accion">
        <div className={styles.wrap}>
          <Reveal className={styles.headL}><span className={styles.eyebrow}>En acción</span><h2>Pensado para el día a día de la barbería</h2><p>Diseñado para que tú y tu equipo lo usen desde el celular, sin entrenamiento.</p></Reveal>
          <div className={styles.action}>
            <Reveal className={styles.actRow}>
              <div className={styles.actText}><span className={styles.actNum}>01</span><h3>Agenda y reservas en un solo lugar</h3><p>El cliente reserva desde tu link y la cita aparece al instante en la agenda del barbero. Reprogramar o cancelar es un toque.</p><button className={styles.btnLink} onClick={abrirDemo}>Quiero mi agenda <ArrowRight size={16} /></button></div>
              <div className={styles.actMedia}><div className={styles.uiHd}>Agenda · Hoy</div>
                {[['09:30', 'Corte + barba', 'con Andrés'], ['10:15', 'Corte clásico', 'con Marco'], ['11:00', 'Perfilado', 'con Andrés']].map(([t, s, b]) => (
                  <div className={styles.uiRow} key={t}><span className={styles.t}>{t}</span><span className={styles.b}>{s}<small>{b}</small></span><span className={`${styles.chip} ${styles.chipOk}`}>OK</span></div>
                ))}
              </div>
            </Reveal>
            <Reveal className={styles.actRow}>
              <div className={styles.actText}><span className={styles.actNum}>02</span><h3>Recordatorios automáticos por WhatsApp</h3><p>Menos plantones: el cliente recibe la confirmación al reservar y un recordatorio antes de la cita, con botones para responder.</p><button className={styles.btnLink} onClick={abrirDemo}>Activar recordatorios <ArrowRight size={16} /></button></div>
              <div className={styles.actMedia}><div className={styles.uiHd}>WhatsApp</div>
                <div className={`${styles.bubble} ${styles.bIn}`}>Hola Carlos 👋 Te recordamos tu cita mañana 10:15 a. m. en Barbería El Patrón.<span className={styles.qb}><span>Confirmar</span><span>Reprogramar</span></span></div>
                <div className={`${styles.bubble} ${styles.bOut}`}>Confirmar ✅</div>
                <div className={`${styles.bubble} ${styles.bIn}`}>¡Listo! Tu cita quedó confirmada. Te esperamos 💈</div>
              </div>
            </Reveal>
            <Reveal className={styles.actRow}>
              <div className={styles.actText}><span className={styles.actNum}>03</span><h3>Caja y reportes claros</h3><p>Registra cada venta y su método de pago. Al cierre sabes cuánto entró, por barbero y por servicio, sin sacar la calculadora.</p><button className={styles.btnLink} onClick={() => irA('reportes')}>Ver cómo funciona <ArrowRight size={16} /></button></div>
              <div className={styles.actMedia}><div className={styles.uiHd}>Cierre de caja · Hoy</div>
                <div className={styles.cashRow}><span>Cortes (12)</span><span className={styles.pos}>S/ 540</span></div>
                <div className={styles.cashRow}><span>Barba y perfilado (6)</span><span className={styles.pos}>S/ 300</span></div>
                <div className={styles.cashRow}><span>Productos (4)</span><span className={styles.pos}>S/ 220</span></div>
                <div className={styles.cashRow}><span>Total del día</span><span className={styles.neu}>S/ 1.060</span></div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* REPORTES */}
      <section className={styles.sec} id="reportes">
        <div className={styles.wrap}>
          <div className={styles.reportWrap}>
            <div>
              <Reveal><span className={styles.eyebrow}>Reportes y estadísticas</span></Reveal>
              <Reveal delay={0.05}><h2 style={{ fontSize: 'clamp(1.7rem,3.4vw,2.5rem)', margin: '8px 0 14px' }}>Sabe cuánto ganas, sin sacar la calculadora</h2></Reveal>
              <Reveal delay={0.1}><p style={{ color: 'var(--color-ink-2, #4b4b53)', fontSize: '1.05rem', marginBottom: 18 }}>Consulta por día o por rango, mira tus promedios en gráficos y descubre tu mejor día del mes. Cuando te pregunten "¿cuánto ganaste este mes?", lo respondes con un clic.</p></Reveal>
              <Reveal delay={0.12}>
                <ul className={styles.ctaList} style={{ marginBottom: 22 }}>
                  {['Ingresos por día, por servicio y por barbero', 'Mejor día de la semana y del mes, ticket promedio', 'Exporta a Excel y PDF con el logo de tu barbería'].map((t) => <li key={t}><i className={styles.ck}><Check size={12} /></i>{t}</li>)}
                </ul>
              </Reveal>
              <Reveal delay={0.15}><button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`} onClick={abrirDemo}>Quiero mis reportes <ArrowRight size={16} /></button></Reveal>
            </div>
            <Reveal delay={0.1} className={styles.reportPanel}>
              <div className={styles.rpTop}><div><div className={styles.rpTitle}>Reporte mensual</div><div className={styles.rpSub}>KiSha Barber Spa · Junio 2026</div></div><span className={styles.rpBadge}>1 clic</span></div>
              <div className={styles.rpBody}>
                <div className={styles.rpKpis}>
                  <div className={styles.rpKpi}><div className={styles.l}>Ingresos</div><div className={`${styles.v} ${styles.b} ${styles.tnum}`}>S/11.498</div></div>
                  <div className={styles.rpKpi}><div className={styles.l}>Citas</div><div className={`${styles.v} ${styles.tnum}`}>318</div></div>
                  <div className={styles.rpKpi}><div className={styles.l}>Ticket</div><div className={`${styles.v} ${styles.tnum}`}>S/36</div></div>
                  <div className={styles.rpKpi}><div className={styles.l}>Utilidad</div><div className={`${styles.v} ${styles.g} ${styles.tnum}`}>S/8.358</div></div>
                </div>
                <div className={styles.rpChartHd}>Ingresos por día</div>
                <div className={styles.rpChart}>
                  {REPORT_BARS.map((b, i) => <span key={i} className={`${styles.rpBar} ${b.we ? styles.we : ''}`} style={{ height: `${b.h}%` }} />)}
                </div>
              </div>
              <div className={styles.rpFoot}>
                <div className={styles.rpBest}>Mejor día: <b>Sáb 27 · S/707</b></div>
                <div className={styles.rpExport}><span className={`${styles.rpBtn} ${styles.x}`}><FileSpreadsheet size={15} /> Excel</span><span className={`${styles.rpBtn} ${styles.p}`}><FileText size={15} /> PDF</span></div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* RESEÑAS (carrusel) */}
      <section className={`${styles.sec} ${styles.paperBand}`} id="resenas">
        <div className={styles.wrap}>
          <Reveal className={styles.head}><span className={styles.eyebrow}>Reseñas</span><h2>Barberos que ya dejaron el cuaderno</h2><p>Lo que dicen quienes ya trabajan con barber.pe.</p></Reveal>
        </div>
        <div className={styles.marquee} style={{ ['--mq-dur' as any]: '52s' }}>
          <div className={styles.mqTrack}>
            {[...TESTIMONIOS, ...TESTIMONIOS].map((t, i) => (
              <div className={styles.tCard} key={i}>
                <div className={styles.tStars}>{'★'.repeat(t.s)}</div>
                <p className={styles.tQuote}>“{t.q}”</p>
                <div className={styles.tWho}><span className={styles.tAv}>{iniciales(t.n)}</span><div><div className={styles.tName}>{t.n}</div><div className={styles.tRole}>{t.r}</div></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIOS — matriz comparativa */}
      <section className={styles.sec} id="precios">
        <div className={styles.wrap}>
          <Reveal className={styles.head}><span className={styles.eyebrow}>Precios</span><h2>Compara los planes</h2><p>Claros, en soles, sin comisiones sobre tus cortes. Cambia o cancela cuando quieras.</p></Reveal>
          <Reveal className={styles.offer}><span className={styles.offerBand}><span className={styles.tag}>LANZAMIENTO</span> Barberías fundadoras: Pro a S/39/mes de por vida — primeras 100</span></Reveal>
          <Reveal className={styles.toggle}>
            <div className={styles.toggleIn}>
              <button className={ciclo === 'mes' ? styles.on : ''} onClick={() => setCiclo('mes')}>Mensual</button>
              <button className={ciclo === 'anio' ? styles.on : ''} onClick={() => setCiclo('anio')}>Anual <span className={styles.save}>2 meses gratis</span></button>
            </div>
          </Reveal>
          <Reveal className={styles.matrixWrap}>
            <table className={`${styles.matrix} ${styles.tnum}`}>
              <thead>
                <tr>
                  <th className={styles.colFn}></th>
                  <th><span className={styles.mxName}>Empieza · Gratis</span><span className={styles.mxPrice}>S/0</span> <span className={styles.mxPer}>/ siempre</span><button className={styles.mxBtn} onClick={abrirDemo}>Comenzar →</button></th>
                  <th className={styles.popHead}><span className={styles.popTag}>★ POPULAR</span><span className={styles.mxName}>Pro</span><span className={styles.mxPrice}>S/{proMes}</span> <span className={styles.mxPer}>/ mes</span><button className={styles.mxBtn} onClick={abrirDemo}>Comenzar →</button></th>
                  <th><span className={styles.mxName}>Cadena</span><span className={styles.mxPrice}>S/{cadMes}</span> <span className={styles.mxPer}>/ mes</span><a className={styles.mxBtn} href={waLink('Hola barber.pe 👋 Quiero el plan Cadena (multi-sede).')} target="_blank" rel="noopener noreferrer">Hablar con ventas →</a></th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((r, i) => (
                  <tr key={i}>
                    <th>{r.f}</th>
                    <td>{cell(r.cols[0], 0)}</td>
                    <td className={styles.pop}>{cell(r.cols[1], 1)}</td>
                    <td>{cell(r.cols[2], 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      {/* GARANTÍA */}
      <section className={styles.secTight}>
        <div className={styles.wrap}><Reveal className={styles.guarantee}><div className={styles.ic}><ShieldCheck size={26} /></div><h2>30 días de garantía</h2><p>Si en 30 días no te sirve, te devolvemos tu dinero. Sin permanencia: te bajas cuando quieras.</p></Reveal></div>
      </section>

      {/* SOLICITAR */}
      <section className={`${styles.sec} ${styles.paperBand}`} id="solicitar">
        <div className={styles.wrap}>
          <div className={styles.ctaGrid}>
            <Reveal className={styles.ctaCopy}>
              <span className={styles.eyebrow}>Empieza hoy</span><h2>Tu barbería online esta semana</h2>
              <p>Déjanos tus datos y te escribimos por WhatsApp para activar tu cuenta y configurar tu página contigo, gratis.</p>
              <ul className={styles.ctaList}>{['Activación guiada paso a paso', 'Migramos tu lista de clientes por ti', 'Sin tarjeta de crédito para empezar'].map((t) => <li key={t}><i className={styles.ck}><Check size={12} /></i>{t}</li>)}</ul>
            </Reveal>
            <Reveal className={styles.formCard} delay={0.08}>
              <h3>Solicitar acceso</h3>
              <p className={styles.fsub}>Te contactamos hoy mismo. Toma menos de 1 minuto.</p>
              <button onClick={abrirDemo} className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock} ${styles.btnLg}`} style={{ marginTop: 10 }}>Solicitar acceso</button>
              <p className={styles.formNote}>Sin tarjeta. Sin compromiso.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.sec} id="faq">
        <div className={styles.wrap}>
          <Reveal className={styles.head}><span className={styles.eyebrow}>Preguntas</span><h2>Preguntas frecuentes</h2></Reveal>
          <div className={styles.faq}>
            {[
              ['¿Mis clientes necesitan descargar una app?', 'No. Reservan desde tu link en el navegador y reciben todo por WhatsApp. Pueden confirmar, reprogramar o cancelar sin instalar nada.'],
              ['¿Puedo poner mi logo, mi color y mi marca?', 'Sí. Cada barbería vive en su propio subdominio (ej. tubarberia.barber.pe) con tu logo, color de marca y datos. Es tu página, no un marketplace.'],
              ['¿Cómo cobro? ¿Hay comisiones por cliente?', 'Registras tus ventas con su método de pago (efectivo, Yape, Plin) y cierras caja. barber.pe no te cobra comisión por cada cliente: pagas solo tu plan mensual.'],
              ['¿Cómo funcionan las comisiones de mis barberos?', 'Cada barbero tiene su agenda y sus comisiones se calculan solas según los servicios que atendió. Al cierre ves cuánto le toca a cada uno.'],
              ['¿Puedo ver cuánto gané y exportarlo?', 'Sí. Consultas por fecha o rango, ves gráficos y tu mejor día, y exportas el reporte a Excel o PDF con el logo de tu barbería en un clic.'],
              ['¿Puedo manejar varias sedes?', 'Sí. Con el plan Cadena administras todas tus sucursales desde una sola cuenta, cada una con su agenda, equipo y caja, y un panel consolidado.'],
              ['¿Migran mis clientes actuales?', 'Sí. Te ayudamos a importar tu lista de clientes para que arranques con tu historial, sin empezar de cero.'],
              ['¿Hay soporte en español?', 'Claro. Somos peruanos y te atendemos en español por WhatsApp.'],
            ].map(([q, a], i) => (
              <div className={`${styles.qa} ${faq === i ? styles.open : ''}`} key={i}>
                <button onClick={() => setFaq(faq === i ? null : i)}>{q}<span className={styles.arrow}><Plus size={20} /></span></button>
                <div className={styles.qaAns}><div><p>{a}</p></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL (con foto) */}
      <section className={styles.final}>
        <div className={styles.wrap}>
          <Reveal className={`${styles.finalCard} ${styles.finalPhoto}`}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${PHOTOS.cta})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
            <h2>Moderniza tu barbería con barber.pe</h2>
            <p>Reservas, WhatsApp, agenda y caja en un solo lugar. Gratis para empezar, listo en minutos.</p>
            <div className={styles.finalCta}><button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`} onClick={abrirDemo}>Prueba gratis <ArrowRight size={18} /></button><Link to="/login" className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}>Ya tengo cuenta</Link></div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footGrid}>
            <div><div className={styles.logo}><span className={styles.logoMark}><Scissors size={18} /></span>barber<span className={styles.pe}>.pe</span></div><p>El software para barberías y salones de belleza en Perú. Reservas, WhatsApp, caja y equipo en un solo lugar.</p></div>
            <div className={styles.footCol}><h5>Producto</h5><a onClick={() => irA('funciones')}>Funciones</a><a onClick={() => irA('reportes')}>Reportes</a><a onClick={() => irA('precios')}>Precios</a><Link to="/login">Ingresar</Link></div>
            <div className={styles.footCol}><h5>Empresa</h5><a onClick={() => irA('faq')}>Preguntas</a><a href={waLink('Hola barber.pe 👋')} target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="mailto:contacto@barber.pe">contacto@barber.pe</a></div>
            <div className={styles.footCol}><h5>Legal</h5><span className={styles.k}>Términos</span><span className={styles.k}>Privacidad</span></div>
          </div>
          <div className={styles.footBottom}><span>© {new Date().getFullYear()} barber.pe · Un producto de <b>Computer Solutions L&amp;E E.I.R.L.</b> · Hecho en Perú 🇵🇪</span><span>Reservas · WhatsApp · Caja · Reportes</span></div>
        </div>
      </footer>
      {demoOpen && (
        <div onClick={() => setDemoOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(17,24,39,.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
          <div className={styles.formCard} onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 460, marginTop: '6vh' }}>
            <button aria-label="Cerrar" onClick={() => setDemoOpen(false)} style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 9999, border: 'none', background: '#f3f4f6', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            {enviado ? (
              <div style={{ textAlign: 'center', padding: '14px 4px' }}>
                <div style={{ fontSize: 46, lineHeight: 1 }}>✅</div>
                <h3 style={{ marginTop: 10 }}>¡Solicitud enviada!</h3>
                <p className={styles.fsub}>Gracias{lead.nombre ? `, ${lead.nombre.split(' ')[0]}` : ''}. Te contactaremos muy pronto para activar tu barbería.</p>
                <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnBlock}`} style={{ marginTop: 12 }} onClick={() => setDemoOpen(false)}>Cerrar</button>
              </div>
            ) : (<>
              <h3>Solicitar acceso</h3><p className={styles.fsub}>Toma menos de 1 minuto. Te contactamos hoy mismo.</p>
              <form onSubmit={enviarLead}>
                <div className={styles.field}><label htmlFor="m-nombre">Tu nombre</label><input id="m-nombre" required placeholder="Ej. Carlos Ramírez" value={lead.nombre} onChange={(e) => setLead({ ...lead, nombre: e.target.value })} /></div>
                <div className={styles.field}><label htmlFor="m-barberia">Nombre de tu barbería</label><input id="m-barberia" required placeholder="Ej. Barbería El Patrón" value={lead.barberia} onChange={(e) => setLead({ ...lead, barberia: e.target.value })} /></div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}><label htmlFor="m-tel">Teléfono</label><input id="m-tel" required inputMode="tel" placeholder="9XX XXX XXX" value={lead.telefono} onChange={(e) => setLead({ ...lead, telefono: e.target.value })} /></div>
                  <div className={styles.field}><label htmlFor="m-ciudad">Distrito / ciudad</label><input id="m-ciudad" required placeholder="Ej. Surco, Lima" value={lead.ciudad} onChange={(e) => setLead({ ...lead, ciudad: e.target.value })} /></div>
                </div>
                <div className={styles.field}><label htmlFor="m-correo">Correo <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label><input id="m-correo" type="email" placeholder="tucorreo@ejemplo.com" value={lead.correo} onChange={(e) => setLead({ ...lead, correo: e.target.value })} /></div>
                <div className={styles.field}><label htmlFor="m-barberos">¿Cuántos barberos trabajan contigo?</label><select id="m-barberos" value={lead.barberos} onChange={(e) => setLead({ ...lead, barberos: e.target.value })}><option>Solo yo</option><option>2 a 3</option><option>4 a 6</option><option>Más de 6 / varias sedes</option></select></div>
                <button type="submit" disabled={enviando} className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock} ${styles.btnLg}`}>{enviando ? 'Enviando…' : 'Solicitar acceso'}</button>
                {err && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{err}</p>}
                <p className={styles.formNote}>Al enviar aceptas que te contactemos. Tus datos están seguros.</p>
              </form>
            </>)}
          </div>
        </div>
      )}
    </div>
  )
}
