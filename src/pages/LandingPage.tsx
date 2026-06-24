import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Scissors, CalendarClock, Wallet, Globe, Star, BarChart3,
  Check, X, ShieldCheck, ArrowRight, ArrowLeft, Plus, Minus, Menu,
  Heart, Mail, Phone, Instagram, Facebook, Youtube, MapPin,
} from 'lucide-react'
import { landingService, type SedeDestacada } from '@/services/landingService'
import { planesService, type PlanPublico } from '@/services/planesService'
import { resenasPublicasService, type ResenaDestacada } from '@/services/resenasPublicasService'
import { setTenant, buildImageUrl, apiClient, urlMicrositio } from '@/services/apiClient'
import { useAuthStore } from '@/store/authStore'
import { useFavoritosStore } from '@/store/favoritosStore'
import { AccountMenu } from '@/components/AccountMenu'
import styles from './Landing.module.css'

/* ════════════════════════════════════════════════════════════════════════
   CONFIGURACIÓN — ajustar antes de publicar
   ════════════════════════════════════════════════════════════════════════ */
const WHATSAPP = '51999888777' // ← número real (51 + 9 dígitos) para "Agendar reunión"

/* ── helpers ───────────────────────────────────────────────────────────── */
const waLink = (t: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t)}`
const iniciales = (n: string) =>
  n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
const soles = (n: number) => `S/${Number.isInteger(n) ? n : n.toFixed(2)}`

const WaIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.2 1.1-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.3 0 .5l-.4.5-.3.3c-.1.1-.3.3-.1.5.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.8.9c.2.1.4.2.5.3.1.2.1.6-.1 1.1Z" />
  </svg>
)

const ease = [0.2, 0.7, 0.2, 1] as const
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay, ease }}>
      {children}
    </motion.div>
  )
}

/* Ventajas de la plataforma (contenido estático del producto). */
const VENTAJAS = [
  { icon: <WaIcon size={20} />, t: 'Reservas por WhatsApp 24/7', d: 'Tus clientes reservan, confirman y reprograman solos desde un link. Tú dejas de vivir respondiendo "¿hay hueco?".', tone: 'green' },
  { icon: <CalendarClock size={20} />, t: 'Agenda por barbero', d: 'Cada barbero ve su propia agenda. Sin choques de horario ni citas pisadas.', tone: 'blue' },
  { icon: <Wallet size={20} />, t: 'Caja y comisiones claras', d: 'Registra ventas por método de pago y al cierre sabes cuánto entró y cuánto le toca a cada barbero.', tone: 'amber' },
  { icon: <BarChart3 size={20} />, t: 'Reportes en un clic', d: 'Mira tu mejor día, tu ticket promedio y exporta a Excel o PDF con tu logo.', tone: 'purple' },
  { icon: <Globe size={20} />, t: 'Tu página, tu marca', d: 'Un sitio de reservas con tu logo y color en tu propio subdominio. Tu marca, no un marketplace.', tone: 'paper' },
]

/* FAQ — preguntas del wireframe + respuestas reales del producto. */
const FAQS: [string, string][] = [
  ['¿Mis clientes necesitan descargar una app?', 'No. Reservan desde tu link en el navegador y reciben todo por WhatsApp. Pueden confirmar, reprogramar o cancelar sin instalar nada.'],
  ['¿Puedo poner mi logo, mi color y mi marca?', 'Sí. Cada barbería vive en su propio subdominio (ej. tubarberia.barber.pe) con tu logo, color de marca y datos. Es tu página, no un marketplace.'],
  ['¿Cómo funcionan las comisiones de mis barberos?', 'Cada barbero tiene su agenda y sus comisiones se calculan solas según los servicios que atendió. Al cierre de caja ves cuánto le toca a cada uno.'],
  ['¿Puedo ver cuánto gané y exportarlo?', 'Sí. Consultas por fecha o rango, ves gráficos y tu mejor día, y exportas el reporte a Excel o PDF con el logo de tu barbería en un clic.'],
]

/* Señales de confianza bajo los precios (contenido estático). */
const BADGES = [
  { icon: <Check size={18} />, t: 'Empieza gratis hoy', d: 'Días de prueba sin tarjeta' },
  { icon: <X size={18} />, t: 'Sin contratos', d: 'Cancela cuando quieras' },
  { icon: <WaIcon size={16} />, t: 'Soporte humano', d: 'Te ayudamos por WhatsApp' },
  { icon: <ShieldCheck size={18} />, t: 'Seguridad garantizada', d: 'Tus datos siempre respaldados' },
]

/* ════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const favs = useFavoritosStore(s => s.favs)
  const toggleFav = useFavoritosStore(s => s.toggle)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [faq, setFaq] = useState<number | null>(0)

  const [sedes, setSedes] = useState<SedeDestacada[]>([])
  const [planes, setPlanes] = useState<PlanPublico[]>([])
  const [resenas, setResenas] = useState<ResenaDestacada[]>([])

  const [lead, setLead] = useState({ negocio: '', duenio: '', tipoContacto: 'correo' as 'correo' | 'whatsapp', contacto: '' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [err, setErr] = useState('')
  const [demoOpen, setDemoOpen] = useState(false)

  const sedesRail = useRef<HTMLDivElement>(null)
  const resenasRail = useRef<HTMLDivElement>(null)
  const planesRail = useRef<HTMLDivElement>(null)

  /* ── efectos ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let alive = true
    landingService.getSedesPublicas().then((s) => { if (alive) setSedes(s) })
    planesService.getPublicos().then((p) => { if (alive) setPlanes(p) })
    resenasPublicasService.getDestacadas(12).then((r) => { if (alive) setResenas(r) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!demoOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDemoOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [demoOpen])

  /* ── acciones ─────────────────────────────────────────────────────── */
  const irA = (id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const verSede = (s: SedeDestacada) => {
    if (!s.subdominio) { navigate(`/sede/${s.idSede}`); return }   // sin subdominio: fallback path
    const url = urlMicrositio(s.subdominio)
    if (url.startsWith('http')) {
      window.location.href = url                                    // prod: carga al subdominio canónico
    } else {
      setTenant(s.subdominio)                                       // dev: ?s= manda en esta pestaña
      navigate(`/sede/${s.idSede}${url.slice(1)}`)
    }
  }
  const abrirDemo = () => navigate('/acceso')   // ahora entran solos: al acceso unificado
  const scrollRail = (ref: React.RefObject<HTMLDivElement>, dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * Math.min(ref.current.clientWidth * 0.8, 520), behavior: 'smooth' })

  const enviarLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enviando) return
    setEnviando(true); setErr('')
    try {
      await apiClient.post('/api/leads', {
        negocio: lead.negocio,
        duenio: lead.duenio || null,
        correo: lead.tipoContacto === 'correo' ? lead.contacto : null,
        telefono: lead.tipoContacto === 'whatsapp' ? lead.contacto : null,
      })
      setEnviado(true)
    } catch {
      setErr('No se pudo enviar. Revisa tu conexión e intenta de nuevo.')
    } finally { setEnviando(false) }
  }

  /* ── datos derivados ──────────────────────────────────────────────── */
  // Planes de pago para las tarjetas; el plan gratis (si existe) define el CTA.
  const planGratis = planes.find((p) => p.esGratis)
  const tarjetas = planes
  const ctaPrueba = planGratis ? 'Probar gratis' : 'Empezar gratis'
  const avatars = sedes.slice(0, 5)

  const navLinks: [string, string][] = [['Características', 'ventajas'], ['Planes/Precios', 'precios'], ['Contacto', 'contacto']]

  return (
    <div className={styles.page}>
      {/* ══════════ NAV ══════════ */}
      <header className={`${styles.nav} ${scrolled ? styles.navOn : ''}`}>
        <div className={styles.navIn}>
          <span className={styles.logo} onClick={() => irA('top')}>
            <img src="/barber-logo.png" alt="Barber.PE" className={styles.logoImg} />
          </span>
          <nav className={styles.navLinks}>
            {navLinks.map(([n, id]) => <a key={id} onClick={() => irA(id)}>{n}</a>)}
          </nav>
          <div className={styles.navCta}>
            {user ? (
              <AccountMenu variant="plain" />
            ) : (
              <>
                <Link to="/login" className={styles.linkLogin}>Iniciar sesión</Link>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={abrirDemo}>Registrarse</button>
              </>
            )}
            {!user && (
              <button className={styles.hamb} aria-label="Menú" onClick={() => setMenuOpen((v) => !v)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
            )}
          </div>
        </div>
        {menuOpen && !user && (
          <div className={styles.mobileMenu}>
            {navLinks.map(([n, id]) => <a key={id} onClick={() => irA(id)}>{n}</a>)}
            <Link to="/login" className={`${styles.btn} ${styles.btnGhost}`}>Iniciar sesión</Link>
          </div>
        )}
      </header>

      {/* ══════════ HERO ══════════ */}
      <section className={styles.hero} id="top">
        <div className={styles.heroBg} />
        <div className={`${styles.wrap} ${styles.heroIn}`}>
          <div className={styles.heroCopy}>
            {user && (
              <nav className={styles.heroNav}>
                {navLinks.map(([n, id]) => <a key={id} onClick={() => irA(id)}>{n}</a>)}
              </nav>
            )}
            <Reveal><span className={styles.pill}>🇵🇪 Software para barberías · hecho en Perú</span></Reveal>
            <Reveal delay={0.05}>
              <h1>Más clientes en tu barbería <span className={styles.hl}>automatizando las citas por WhatsApp</span></h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className={styles.heroSub}>Tus clientes reservan, confirman y reprograman solos las 24 horas. Tú recibes la cita en tu agenda sin mover un dedo — en soles y sin comisiones.</p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className={styles.heroCta}>
                <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`} onClick={abrirDemo}>Inicia tu prueba GRATIS <ArrowRight size={18} /></button>
              </div>
            </Reveal>
            <Reveal delay={0.2}><p className={styles.heroNote}>No requiere tarjeta de crédito.</p></Reveal>

            <Reveal delay={0.25}>
              <div className={styles.proof}>
                <div className={styles.avs}>
                  {(avatars.length ? avatars : [0, 1, 2, 3]).map((s: any, i) => {
                    const isSede = typeof s === 'object'
                    const ini = isSede ? iniciales(s.nombre || 'B') : ['AQ', 'MR', 'LP', 'DS'][i]
                    const logo = isSede && s.logoUrl ? buildImageUrl(s.logoUrl) : ''
                    return (
                      <span key={i} className={styles.av}>
                        {logo ? <img src={logo} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).replaceWith(document.createTextNode(ini)) }} /> : ini}
                      </span>
                    )
                  })}
                  {sedes.length > 5 && <span className={`${styles.av} ${styles.avMore}`}>+{sedes.length - 5}</span>}
                </div>
                <div className={styles.proofTxt}>
                  <span className={styles.stars}>★★★★★</span>
                  <span>{sedes.length ? <><b>{sedes.length} barberías</b> ya reservan con barber.pe</> : 'Barberías de todo el Perú ya reservan con barber.pe'}</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Panel "Beneficios · Sistema de citas" */}
          <Reveal delay={0.15} className={styles.heroVisual}>
            <div className={styles.panel}>
              <div className={styles.panelTop}>
                <span className={styles.panelEye}>Beneficios</span>
                <span className={styles.panelTitle}>Sistema de citas</span>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.kpis}>
                  <div className={styles.kpi}><span className={styles.l}>Reservas hoy</span><span className={styles.v}>18</span><span className={styles.up}>+12%</span></div>
                  <div className={styles.kpi}><span className={styles.l}>Ocupación</span><span className={styles.v}>86%</span></div>
                  <div className={styles.kpi}><span className={styles.l}>Ingresos</span><span className={styles.v}>S/1.240</span></div>
                </div>
                <div className={styles.agendaHd}>Próximas citas</div>
                {([['09:30', 'Carlos Ramírez', 'Corte + barba', true], ['10:15', 'José Medina', 'Corte clásico', true], ['11:00', 'Luis Paredes', 'Perfilado', false]] as const).map(([t, n, x, ok]) => (
                  <div className={styles.row} key={t}>
                    <span className={styles.time}>{t}</span>
                    <span className={styles.rowMeta}><b>{n}</b><small>{x}</small></span>
                    <span className={`${styles.chip} ${ok ? styles.chipOk : styles.chipWait}`}>{ok ? 'Confirmado' : 'Por confirmar'}</span>
                  </div>
                ))}
                <div className={styles.waNote}><span className={styles.waDot}><WaIcon size={13} /></span> Recordatorio enviado por WhatsApp ✓</div>
              </div>
            </div>
            <div className={`${styles.floatChip} ${styles.fc1}`}><span className={styles.fci}><Check size={14} /></span><div>Reserva confirmada<small>hace 2 min</small></div></div>
          </Reveal>
        </div>
      </section>

      {/* ══════════ YA CONFÍAN EN NOSOTROS ══════════ */}
      <section className={styles.sec} id="confian">
        <div className={styles.wrap}>
          <div className={styles.railHead}>
            <div>
              <h2 className={styles.h2}>Ya confían en nosotros</h2>
              <p className={styles.sub}>Algunas barberías que ya usan barber.pe como su sistema de citas.</p>
            </div>
            {sedes.length > 3 && (
              <div className={styles.railNav}>
                <button aria-label="Anterior" onClick={() => scrollRail(sedesRail, -1)}><ArrowLeft size={18} /></button>
                <button aria-label="Siguiente" onClick={() => scrollRail(sedesRail, 1)}><ArrowRight size={18} /></button>
              </div>
            )}
          </div>
        </div>
        <div className={styles.rail} ref={sedesRail}>
          <div className={styles.railPad} />
          {sedes.map((s) => (
            <button className={styles.sedeCard} key={s.idSede} onClick={() => verSede(s)} title={`Ver ${s.nombre}`}>
              <div className={styles.sedeCover} style={s.portadaUrl ? { backgroundImage: `url(${buildImageUrl(s.portadaUrl)})` } : undefined}>
                <span
                  className={styles.heart}
                  role="button"
                  aria-label={favs[s.idSede] ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  onClick={(e) => { e.stopPropagation(); toggleFav({ idSede: s.idSede, nombre: s.nombre, subdominio: s.subdominio, logoUrl: s.logoUrl, direccion: s.direccion }) }}
                >
                  <Heart size={15} fill={favs[s.idSede] ? 'currentColor' : 'none'} />
                </span>
                {!s.portadaUrl && <Scissors size={26} className={styles.sedeCoverIcon} />}
              </div>
              <div className={styles.sedeInfo}>
                <span className={styles.sedeLogo}>
                  {s.logoUrl ? <img src={buildImageUrl(s.logoUrl)} alt="" onError={(e) => { const el = e.currentTarget as HTMLImageElement; el.style.display = 'none'; const cont = el.parentElement; if (cont && !cont.dataset.fb) { cont.dataset.fb = '1'; cont.appendChild(document.createTextNode(iniciales(s.nombre))) } }} /> : iniciales(s.nombre)}
                </span>
                <div className={styles.sedeText}>
                  <span className={styles.sedeName}>{s.nombre} <ShieldCheck size={14} className={styles.verified} /></span>
                  <span className={styles.sedeLoc}><MapPin size={12} /> {s.direccion || s.ciudad || 'Perú'}</span>
                </div>
              </div>
            </button>
          ))}
          {!sedes.length && [0, 1, 2, 3].map((i) => (
            <div className={`${styles.sedeCard} ${styles.sedeSkeleton}`} key={i}><div className={styles.sedeCover} /><div className={styles.sedeInfo}><span className={styles.sedeLogo} /><div className={styles.sedeText}><span className={styles.skLine} /><span className={`${styles.skLine} ${styles.skShort}`} /></div></div></div>
          ))}
          <div className={styles.railPad} />
        </div>
      </section>

      {/* ══════════ VENTAJAS (bento) ══════════ */}
      <section className={`${styles.sec} ${styles.soft}`} id="ventajas">
        <div className={styles.wrap}>
          <Reveal><span className={styles.eyebrow}>Ventajas de usar BARBER.PE</span></Reveal>
          <Reveal delay={0.05}><h2 className={styles.h2}>Olvídate de usar cuadernos</h2></Reveal>
          <Reveal delay={0.1}><p className={styles.sub}>Una sola herramienta para reservar, recordar, atender y cobrar.</p></Reveal>
          <div className={styles.bento}>
            {VENTAJAS.map((v, i) => (
              <Reveal key={v.t} delay={i * 0.05} className={`${styles.vCard} ${styles[`v_${v.tone}`]} ${i === 0 ? styles.vWide : ''}`}>
                <span className={styles.vIcon}>{v.icon}</span>
                <h3>{v.t}</h3>
                <p>{v.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ RESEÑAS ══════════ */}
      {resenas.length > 0 && (
        <section className={styles.sec} id="resenas">
          <div className={styles.wrap}>
            <div className={styles.railHead}>
              <div>
                <span className={styles.eyebrow}>RESEÑAS</span>
                <h2 className={styles.h2}>Qué dicen los que ya usan barber.pe</h2>
              </div>
              {resenas.length > 3 && (
                <div className={styles.railNav}>
                  <button aria-label="Anterior" onClick={() => scrollRail(resenasRail, -1)}><ArrowLeft size={18} /></button>
                  <button aria-label="Siguiente" onClick={() => scrollRail(resenasRail, 1)}><ArrowRight size={18} /></button>
                </div>
              )}
            </div>
          </div>
          <div className={styles.rail} ref={resenasRail}>
            <div className={styles.railPad} />
            {resenas.map((r) => {
              const p = Math.max(1, Math.min(5, r.puntuacion))
              return (
                <div className={styles.rCard} key={r.idCalificacion}>
                  <div className={styles.rStars}>{'★'.repeat(p)}<span className={styles.rStarsOff}>{'★'.repeat(5 - p)}</span></div>
                  <p className={styles.rQuote}>“{r.comentario}”</p>
                  <div className={styles.rWho}>
                    <span className={styles.rAv}>{iniciales(r.nombreCliente || r.nombreSede)}</span>
                    <div>
                      <span className={styles.rName}>{r.nombreCliente || 'Cliente de barber.pe'}</span>
                      <span className={styles.rRole}>{[r.nombreSede, r.ciudadSede].filter(Boolean).join(' · ')}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div className={styles.railPad} />
          </div>
        </section>
      )}

      {/* ══════════ PLANES Y PRECIOS ══════════ */}
      <section className={`${styles.sec} ${styles.soft}`} id="precios">
        <div className={styles.wrap}>
          <Reveal><span className={styles.eyebrow}>Planes y precios</span></Reveal>
          <div className={styles.priceHead}>
            <Reveal delay={0.05}>
              <h2 className={styles.h2}>Precio fijo al mes. <span className={styles.muted}>Justo y sin sorpresas.</span></h2>
            </Reveal>
            <div className={styles.priceHeadRight}><span className={styles.country}>🇵🇪 Perú</span>{tarjetas.length > 3 && (<div className={styles.railNav}><button aria-label="Anterior" onClick={() => scrollRail(planesRail, -1)}><ArrowLeft size={18} /></button><button aria-label="Siguiente" onClick={() => scrollRail(planesRail, 1)}><ArrowRight size={18} /></button></div>)}</div>
          </div>

          <div className={styles.plansRail} ref={planesRail}>
            {tarjetas.map((p) => (
              <Reveal key={p.idPlan} className={`${styles.plan} ${p.popular ? styles.planPop : ''}`}>
                {p.esGratis ? <span className={styles.freeBadge}><Star size={13} /> 14 días gratis</span> : (p.popular && <span className={styles.popBadge}><Star size={13} /> Más popular</span>)}
                <span className={styles.planName}>{p.nombre}</span>
                <div className={styles.planPrice}>
                  <span className={styles.amount}>{p.esGratis ? 'Gratis' : soles(p.precioMensualPEN)}</span>
                  {!p.esGratis && <span className={styles.per}>/mes</span>}
                </div>
                {p.descripcion && <p className={styles.planTag}>{p.descripcion.split('·')[0].trim()}</p>}
                <button className={`${styles.btn} ${p.popular || p.esGratis ? styles.btnPrimary : styles.btnGhost} ${styles.btnBlock}`} onClick={abrirDemo}>{p.esGratis ? 'Empezar gratis' : ctaPrueba}</button>
                <ul className={styles.planList}>
                  {p.caracteristicas.map((c, i) => (
                    <li key={i}><i className={styles.ck}><Check size={12} /></i>{c}</li>
                  ))}
                </ul>
              </Reveal>
            ))}
            {!tarjetas.length && [0, 1, 2].map((i) => <div className={`${styles.plan} ${styles.planSkeleton}`} key={i} />)}
          </div>

          {/* Señales de confianza */}
          <div className={styles.badges}>
            {BADGES.map((b) => (
              <div className={styles.badge} key={b.t}>
                <span className={styles.badgeIc}>{b.icon}</span>
                <div><b>{b.t}</b><small>{b.d}</small></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section className={styles.sec} id="faq">
        <div className={styles.wrap}>
          <div className={styles.faqGrid}>
            <div className={styles.faqIntro}>
              <span className={styles.eyebrow}>Preguntas y respuestas (FAQs)</span>
              <h2 className={styles.h2}>Todo lo que necesitas saber, lo puedes encontrar aquí.</h2>
              <p className={styles.sub}>Si necesitas más información, no dudes en contactarnos.</p>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => irA('contacto')}>Contáctanos <ArrowRight size={16} /></button>
            </div>
            <div className={styles.faqList}>
              {FAQS.map(([q, a], i) => (
                <div className={`${styles.qa} ${faq === i ? styles.qaOpen : ''}`} key={i}>
                  <button onClick={() => setFaq(faq === i ? null : i)}>
                    <span className={styles.qaNum}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={styles.qaQ}>{q}</span>
                    <span className={styles.qaIcon}>{faq === i ? <Minus size={18} /> : <Plus size={18} />}</span>
                  </button>
                  <div className={styles.qaAns}><div><p>{a}</p></div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ CTA FINAL (banda oscura) ══════════ */}
      <section className={styles.ctaBand} id="contacto">
        <div className={styles.wrap}>
          <Reveal className={styles.ctaInner}>
            <h2>Lleva tu barbería a un siguiente <span className={styles.hl}>NIVEL</span> usando nuestro software.</h2>
            <p>No necesitas tarjeta de crédito ni instalar nada. Si usas otro sistema, te ayudamos con la migración completamente GRATIS.</p>
            <div className={styles.ctaBtns}>
              <button className={`${styles.btn} ${styles.btnLight} ${styles.btnLg}`} onClick={abrirDemo}>Empieza ahora gratis</button>
              
            </div>
            <p className={styles.ctaFine}>Empieza hoy, tienes 30 días de garantía.</p>
          </Reveal>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footTop}>
            <div className={styles.footBrand}>
              <span className={styles.logo}><img src="/barber-logo.png" alt="Barber.PE" className={styles.logoImg} /></span>
              <p>Automatiza tus reservas en WhatsApp, sin complicaciones.</p>
              <div className={styles.social}>
                <a href="#" aria-label="Facebook"><Facebook size={18} /></a>
                <a href="#" aria-label="Instagram"><Instagram size={18} /></a>
                <a href="#" aria-label="YouTube"><Youtube size={18} /></a>
              </div>
            </div>
            <nav className={styles.footLinks}>
              <Link to="/terminos">Términos y condiciones</Link>
              <Link to="/privacidad">Política de privacidad</Link>
              <Link to="/libro-reclamaciones">Libro de reclamaciones</Link>
              <a onClick={() => irA('contacto')}>Contacto</a>
            </nav>
          </div>
          <div className={styles.footBottom}>
            <span>© {new Date().getFullYear()} Barber.pe — Todos los derechos reservados.</span>
            <span>Computer Solutions L&amp;E E.I.R.L.</span>
          </div>
        </div>
      </footer>

      {/* ══════════ MODAL SOLICITAR ACCESO ══════════ */}
      {demoOpen && (
        <div className={styles.modalBg} onClick={() => setDemoOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button aria-label="Cerrar" className={styles.modalX} onClick={() => setDemoOpen(false)}><X size={18} /></button>
            {enviado ? (
              <div className={styles.modalDone}>
                <div className={styles.doneIc}><Check size={30} /></div>
                <h3>¡Solicitud enviada!</h3>
                <p>Gracias{lead.duenio ? `, ${lead.duenio.split(' ')[0]}` : ''}. Te contactaremos muy pronto para activar tu barbería.</p>
                <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnBlock}`} onClick={() => setDemoOpen(false)}>Cerrar</button>
              </div>
            ) : (
              <>
                <h3>Inicia tu prueba gratis</h3>
                <p className={styles.modalSub}>Toma menos de 1 minuto. Empieza a Gestionar tu Negocio!</p>
                <form onSubmit={enviarLead}>
                  <div className={styles.field}>
                    <label htmlFor="m-negocio">Nombre del negocio</label>
                    <input id="m-negocio" required placeholder="Ej. Barbería El Patrón" value={lead.negocio} onChange={(e) => setLead({ ...lead, negocio: e.target.value })} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="m-duenio">Nombre del dueño <span className={styles.opt}>(opcional)</span></label>
                    <input id="m-duenio" placeholder="Tu nombre" value={lead.duenio} onChange={(e) => setLead({ ...lead, duenio: e.target.value })} />
                  </div>
                  <div className={styles.field}>
                    <label>¿Cómo te contactamos?</label>
                    <div className={styles.seg}>
                      <button type="button" className={lead.tipoContacto === 'correo' ? styles.segOn : ''} onClick={() => setLead({ ...lead, tipoContacto: 'correo', contacto: '' })}><Mail size={15} /> Correo</button>
                      <button type="button" className={lead.tipoContacto === 'whatsapp' ? styles.segOn : ''} onClick={() => setLead({ ...lead, tipoContacto: 'whatsapp', contacto: '' })}><Phone size={15} /> WhatsApp</button>
                    </div>
                  </div>
                  <div className={styles.field}>
                    {lead.tipoContacto === 'correo'
                      ? <input type="email" required placeholder="tucorreo@ejemplo.com" value={lead.contacto} onChange={(e) => setLead({ ...lead, contacto: e.target.value })} />
                      : <input inputMode="tel" required placeholder="9XX XXX XXX" value={lead.contacto} onChange={(e) => setLead({ ...lead, contacto: e.target.value })} />}
                  </div>
                  <button type="submit" disabled={enviando} className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock} ${styles.btnLg}`}>{enviando ? 'Enviando…' : 'Solicitar acceso'}</button>
                  {err && <p className={styles.modalErr}>{err}</p>}
                  <p className={styles.modalNote}>Te enviaremos un código de acceso, tenemos que verificar que eres tú.</p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
