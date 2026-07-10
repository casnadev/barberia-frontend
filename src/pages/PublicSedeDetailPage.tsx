import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  MapPin, Navigation, Phone, Clock, Star, ChevronRight, ChevronLeft, Scissors,
  Heart, Forward, X, ChevronDown, Instagram, Facebook, Globe, Youtube,
  Gift,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { sedesService } from '@/services/sedesService'
import { nombreParaMostrar } from '@/utils/nombreParaMostrar'
import { apiClient, getActiveTenant, getTenantOverride, urlSedeCanonica } from '@/services/apiClient'
import { useFavoritosStore } from '@/store/favoritosStore'
import { novedadesService } from '@/services/novedadesService'
import { AccountMenu } from '@/components/AccountMenu'
import Monograma, { iniciales } from '@/components/Monograma'
import styles from '@/styles/PublicSedeDetail.module.css'

// Rutas de imágenes (uploads relativos → URL absoluta del API)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.100.25:55692'
const img = (u?: string | null) => {
  if (!u || u === 'string') return ''
  return /^(https?:|data:|blob:)/.test(u) ? u : `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`
}

const DIAS: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves',
  5: 'Viernes', 6: 'Sábado', 7: 'Domingo', 0: 'Domingo',
}
const hhmm = (t?: string) => (t || '').slice(0, 5)
// Formato 12 horas con am/pm para mostrar al cliente (ej. "8:00 pm").
const h12 = (t?: string) => {
  const s = hhmm(t)
  if (!s || !s.includes(':')) return ''
  const [hStr, m] = s.split(':')
  let h = parseInt(hStr, 10)
  if (Number.isNaN(h)) return ''
  const ap = h >= 12 ? 'pm' : 'am'
  h = h % 12; if (h === 0) h = 12
  return `${h}:${m} ${ap}`
}

// Íconos que lucide-react no cubre (o cubre desactualizado): inline.
type IcoProps = { className?: string; width?: number | string; height?: number | string }
const TikTokIcon = ({ className, width = 16, height = 16 }: IcoProps) => (
  <svg viewBox="0 0 24 24" width={width} height={height} className={className} fill="currentColor" aria-hidden="true">
    <path d="M16.5 3c.3 2 1.7 3.6 3.5 3.9v2.6c-1.3 0-2.6-.4-3.6-1.1v6.1c0 3.1-2.5 5.5-5.6 5.5S5.2 17.6 5.2 14.5 7.7 9 10.8 9c.3 0 .6 0 .9.1v2.7c-.3-.1-.6-.2-.9-.2-1.5 0-2.6 1.2-2.6 2.6s1.2 2.6 2.6 2.6 2.6-1.2 2.6-2.6V3h3.1z" />
  </svg>
)
// Logo actual de X (el pájaro de Twitter quedó obsoleto).
const XIcon = ({ className, width = 16, height = 16 }: IcoProps) => (
  <svg viewBox="0 0 24 24" width={width} height={height} className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)
const WhatsAppIcon = ({ className, width = 16, height = 16 }: IcoProps) => (
  <svg viewBox="0 0 24 24" width={width} height={height} className={className} fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.12.1-1.81-.11-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.11 1-2.4.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.42-.07.65.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.72 1.18 1.54 1.91 1.06.94 1.95 1.24 2.23 1.38.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.6-.14.24.09 1.55.73 1.81.86.26.13.44.2.5.31.06.11.06.64-.18 1.32z" />
  </svg>
)
// Mapa tipo→ícono: pinta TODAS las redes configuradas, no solo algunas.
const ICONO_RED: Record<string, any> = {
  instagram: Instagram, insta: Instagram,
  facebook: Facebook, face: Facebook,
  tiktok: TikTokIcon, tik: TikTokIcon,
  youtube: Youtube, you: Youtube,
  whatsapp: WhatsAppIcon, whats: WhatsAppIcon,
  twitter: XIcon, x: XIcon,
  web: Globe, sitio: Globe,
}
const iconoDeRed = (tipo: string) => {
  const t = (tipo || '').toLowerCase().trim()
  for (const clave in ICONO_RED) if (t.includes(clave)) return ICONO_RED[clave]
  return Globe
}

// ─────────────────────────── Modal de trabajador ───────────────────────────
function ModalShell({ onClose, children }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={styles.modalOverlay} onClick={onClose}>
      <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {children}
      </motion.div>
    </motion.div>
  )
}

function TrabajadorModal({ trabajador, brand, onReservar, onClose }: any) {
  if (!trabajador) return null
  return (
    <ModalShell onClose={onClose}>
      <div className={styles.modalCover}>
        {trabajador.urlFotoPerfil
          ? <img className={styles.modalCoverImg} src={img(trabajador.urlFotoPerfil)} alt={trabajador.nombreCompleto} />
          : <div className={styles.modalCoverFb}><Monograma fill texto={trabajador.nombreCompleto} style={{ fontSize: 44 }} /></div>}
        {trabajador.esDestacado && <span className={styles.modalBadge} style={{ background: brand }}>Destacado</span>}
        <button className={styles.modalClose} onClick={onClose} aria-label="Cerrar"><X width={18} height={18} /></button>
      </div>
      <div className={styles.modalBody}>
        <h2 className={styles.modalTitle}>{trabajador.nombreCompleto}</h2>
        <p className={styles.modalSpec} style={{ color: brand }}>{trabajador.especialidad || 'Barbero'}</p>
        {trabajador.experiencia && <span className={styles.modalChip}>{trabajador.experiencia}</span>}
        {trabajador.descripcion && <p className={styles.modalDesc}>{trabajador.descripcion}</p>}
        <button className={styles.modalCta} style={{ background: brand }} onClick={onReservar}>Reservar ahora</button>
      </div>
    </ModalShell>
  )
}

function ServicioModal({ servicio, brand, onReservar, onClose }: any) {
  if (!servicio) return null
  return (
    <ModalShell onClose={onClose}>
      <div className={styles.modalCover}>
        {img(servicio.urlImagen)
          ? <img className={styles.modalCoverImg} src={img(servicio.urlImagen)} alt={servicio.nombre} />
          : <div className={styles.modalCoverFb} style={{ background: brand, color: '#fff' }}><Scissors width={40} height={40} /></div>}
        {servicio.esDestacado && <span className={styles.modalBadge} style={{ background: brand }}>Destacado</span>}
        <button className={styles.modalClose} onClick={onClose} aria-label="Cerrar"><X width={18} height={18} /></button>
      </div>
      <div className={styles.modalBody}>
        <h2 className={styles.modalTitle}>{servicio.nombre}</h2>
        <div className={styles.modalMeta}>
          <span className={styles.modalMetaItem}><Clock width={15} height={15} /> {servicio.duracionMinutos || 30} min</span>
          <span className={styles.modalPrice} style={{ color: brand }}>S/ {(servicio.precioBase || 0).toFixed(2)}</span>
        </div>
        {servicio.descripcionCorta && <p className={styles.modalDesc}>{servicio.descripcionCorta}</p>}
        <button className={styles.modalCta} style={{ background: brand }} onClick={onReservar}>Reservar ahora</button>
      </div>
    </ModalShell>
  )
}

export function PublicSedeDetailPage() {
  const navigate = useNavigate()
  const { idSede: idSedeParam } = useParams<{ idSede: string }>()
  const [sede, setSede] = useState<any>(null)
  const [servicios, setServicios] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [trabajadorSel, setTrabajadorSel] = useState<any>(null)
  const [servicioSel, setServicioSel] = useState<any>(null)
  const [expandirHorarios, setExpandirHorarios] = useState(false)
  const [verTodosServicios, setVerTodosServicios] = useState(false)
  const [verTodasFotos, setVerTodasFotos] = useState(false)
  const [horarios, setHorarios] = useState<any[]>([])
  const [resenas, setResenas] = useState<{ promedio: number; total: number; items: any[] }>({ promedio: 0, total: 0, items: [] })
  const [novedades, setNovedades] = useState<any[]>([])

  // UI
  const [scrolled, setScrolled] = useState(false)
  const [activeTab, setActiveTab] = useState('servicios')
  const [heroIdx, setHeroIdx] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)

  // Refs de secciones (scroll-spy + tabs)
  const refServicios = useRef<HTMLElement>(null)
  const refCats = useRef<HTMLDivElement>(null) // fila de categorías (scroll horizontal en desktop)
  const refGaleria = useRef<HTMLElement>(null)
  const refEquipo = useRef<HTMLElement>(null)
  const refResenas = useRef<HTMLElement>(null)
  const refUbicacion = useRef<HTMLElement>(null)
  const refAcerca = useRef<HTMLElement>(null)
  const refHorarios = useRef<HTMLElement>(null)
  const heroTrackRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadData() }, [idSedeParam])

  // Novedades públicas de la sede (flyer del landing).
  useEffect(() => {
    if (!sede?.idSede) return
    novedadesService.publicasPorSede(sede.idSede)
      .then(setNovedades)
      .catch(() => setNovedades([]))
  }, [sede?.idSede])

  // Carrusel automático del hero móvil (lee la cantidad de slides del DOM).
  useEffect(() => {
    const id = setInterval(() => {
      const el = heroTrackRef.current
      if (!el || el.clientWidth === 0) return
      const count = Math.round(el.scrollWidth / el.clientWidth)
      if (count <= 1) return
      const cur = Math.round(el.scrollLeft / el.clientWidth)
      const next = (cur + 1) % count
      el.scrollTo({ left: next * el.clientWidth, behavior: next === 0 ? 'auto' : 'smooth' })
    }, 4000)
    return () => clearInterval(id)
  }, [])

  // SEO dinámico por tenant
  useEffect(() => {
    if (!sede) return
    // Título con keywords para SEO local: "Marca – Sede — Barbería en <zona> | Reserva online".
    const visible = nombreParaMostrar(sede as any) || sede.nombre || 'Barbería'
    const zona = (sede.distrito || sede.nombre || '').trim()
    const titulo = zona
      ? `${visible} — Barbería en ${zona} | Reserva online`
      : `${visible} — Reserva tu cita online`
    const desc = sede.descripcionCorta
      || `Reserva tu cita en ${visible}${zona ? ` (${zona})` : ''} de forma online, fácil y rápido. Confirmaciones automáticas.`
    const ogImg = img(sede.urlBanner || sede.urlLogo || '')
    document.title = titulo
    const upsert = (attr: 'name' | 'property', key: string, content?: string) => {
      if (!content) return
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    // Canonical hacia la URL CANÓNICA DE MARCA (negocio.barber.pe, o /{slug} si 2+
    // sedes). Nunca el subdominio de sede. Evita contenido duplicado.
    const cUrl = sede.slugMarca
      ? urlSedeCanonica({
          slugMarca: sede.slugMarca,
          slugSede: sede.slug,
          subdominio: sede.subdominio,
          esMultisede: (sede.totalSedesPublicasMarca ?? 1) >= 2,
        })
      : ''
    const canonicalUrl = cUrl.startsWith('http') ? cUrl : window.location.href.split('?')[0]
    let canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canon) { canon = document.createElement('link'); canon.setAttribute('rel', 'canonical'); document.head.appendChild(canon) }
    canon.setAttribute('href', canonicalUrl)
    upsert('name', 'description', desc)
    upsert('property', 'og:title', titulo)
    upsert('property', 'og:description', desc)
    upsert('property', 'og:type', 'website')
    upsert('property', 'og:url', window.location.href)
    if (ogImg) upsert('property', 'og:image', ogImg)
    upsert('name', 'twitter:card', ogImg ? 'summary_large_image' : 'summary')
    upsert('name', 'twitter:title', titulo)
    upsert('name', 'twitter:description', desc)
    if (ogImg) upsert('name', 'twitter:image', ogImg)
  }, [sede])

  // ── Datos estructurados JSON-LD (HairSalon) para resultados enriquecidos de
  //    Google: nombre, dirección, geo, teléfono, horarios y reseñas. Toda la
  //    data ya existe; solo la exponemos en el formato que Google entiende.
  useEffect(() => {
    if (!sede) return
    const visible = nombreParaMostrar(sede as any) || sede.nombre
    const DIAS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const horariosLd = (horarios || [])
      .filter((h: any) => h?.estaActivo && h?.horaInicio && h?.horaFin)
      .map((h: any) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: DIAS[(h.diaSemana === 7 ? 0 : h.diaSemana) as number] || undefined,
        opens: String(h.horaInicio).slice(0, 5),
        closes: String(h.horaFin).slice(0, 5),
      }))
      .filter((h: any) => h.dayOfWeek)

    const ld: any = {
      '@context': 'https://schema.org',
      '@type': 'HairSalon',
      name: visible,
      url: (() => {
        const u = sede.slugMarca
          ? urlSedeCanonica({
              slugMarca: sede.slugMarca,
              slugSede: sede.slug,
              subdominio: sede.subdominio,
              esMultisede: (sede.totalSedesPublicasMarca ?? 1) >= 2,
            })
          : ''
        return u.startsWith('http') ? u : window.location.href.split('?')[0]
      })(),
      image: img(sede.urlBanner || sede.urlLogo || '') || undefined,
      logo: img(sede.urlLogo || '') || undefined,
      telephone: sede.telefono || undefined,
      priceRange: '$$',
      currenciesAccepted: 'PEN',
      address: {
        '@type': 'PostalAddress',
        streetAddress: sede.direccion || undefined,
        addressLocality: sede.distrito || sede.nombre || undefined,
        addressRegion: sede.departamento || 'Lima',
        addressCountry: 'PE',
      },
    }
    if (sede.latitud && sede.longitud) {
      ld.geo = { '@type': 'GeoCoordinates', latitude: sede.latitud, longitude: sede.longitud }
    }
    if (horariosLd.length) ld.openingHoursSpecification = horariosLd
    if (resenas.total > 0) {
      ld.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Number(resenas.promedio.toFixed(1)),
        reviewCount: resenas.total,
      }
    }

    let el = document.getElementById('ld-hairsalon') as HTMLScriptElement | null
    if (!el) {
      el = document.createElement('script')
      el.id = 'ld-hairsalon'
      el.type = 'application/ld+json'
      document.head.appendChild(el)
    }
    el.textContent = JSON.stringify(ld)
  }, [sede, horarios, resenas])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Subdominio efectivo de la sede a mostrar.
      // - Microsite real (sede.barber.pe): el subdominio del host.
      // - Landing → /sede/:id en el dominio raíz o en local: NO hay subdominio
      //   en el host, pero al pulsar la tarjeta la landing ya hizo
      //   setTenant(sede.subdominio); por eso getActiveTenant() lo devuelve.
      const hostname = window.location.hostname
      const sParam = new URLSearchParams(window.location.search).get('s')
      const esLocalOLan =
        hostname === 'localhost' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      const subHost = !esLocalOLan && hostname.split('.').length >= 3 ? hostname.split('.')[0] : ''
      // Prioridad: ?s= → override del link único → subdominio real del host → tenant activo.
      const subdominio = sParam || getTenantOverride() || subHost || getActiveTenant()

      const [sedeData, serviciosData, trabajadoresData] = await Promise.all([
        sedesService.getSedePublica(subdominio),
        sedesService.getServiciosPublicos(subdominio),
        sedesService.getTrabajadoresPublicos(subdominio),
      ])
      if (!sedeData) throw new Error('No se encontró información de la barbería')
      setSede(sedeData)
      setServicios(serviciosData || [])
      // Oculta del landing público las fichas marcadas como no visibles
      // (p.ej. la ficha-Admin del dueño que no atiende en esta sede).
      setTrabajadores((trabajadoresData || []).filter(
        (t: any) => t?.visibleEnLandingPublico !== false))

      // La página YA se puede mostrar con lo esencial (sede + servicios + equipo).
      // Quitamos el skeleton aquí, sin esperar a horarios ni reseñas: así el
      // usuario ve el contenido apenas llegan los 3 datos clave en vez de
      // esperar 2 viajes extra al servidor (que está en Hetzner, lejos de Perú).
      setLoading(false)

      // Secundarios: se cargan EN PARALELO entre sí y SIN bloquear el render.
      // Cada uno entra solo cuando llega; ambos tienen fallback visual propio
      // (el badge de horario y la sección de reseñas se ocultan si vienen vacíos).
      apiClient.get(`/api/Horarios/sede/${sedeData.idSede}`)
        .then((hRes) => {
          const hData = hRes.data?.data ?? hRes.data
          setHorarios(Array.isArray(hData) ? hData : [])
        })
        .catch(() => setHorarios([]))

      apiClient.get(`/api/Resenas/sede/${sedeData.idSede}`)
        .then((rRes) => {
          const rData = rRes.data?.data ?? rRes.data
          setResenas({
            promedio: rData?.promedio ?? 0,
            total: rData?.total ?? 0,
            items: Array.isArray(rData?.items) ? rData.items : [],
          })
        })
        .catch(() => setResenas({ promedio: 0, total: 0, items: [] }))
    } catch (err: any) {
      // La pantalla completa "Establecimiento no disponible" ya comunica el estado;
      // no mostramos además un toast rojo (era ruido redundante).
      setError(err.message || 'Error cargando información')
      setLoading(false)
    }
  }

  // Scroll-spy + nav on-scroll
  useEffect(() => {
    const secs: [string, React.RefObject<HTMLElement>][] = [
      ['servicios', refServicios], ['galeria', refGaleria],
      ['equipo', refEquipo], ['resenas', refResenas], ['horarios', refHorarios], ['acerca', refAcerca], ['ubicacion', refUbicacion],
    ]
    const onScroll = () => {
      setScrolled(window.scrollY > 360)
      let current = 'servicios'
      for (const [key, ref] of secs) {
        const el = ref.current
        if (el && el.getBoundingClientRect().top <= 160) current = key
      }
      setActiveTab(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Categorías en desktop: arrastrar con el mouse (clic sostenido) + rueda → carrusel.
  useEffect(() => {
    const el = refCats.current
    if (!el) return

    // Rueda vertical del mouse → desplazamiento horizontal.
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return            // nada que desplazar
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return    // trackpad: ya es horizontal
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }

    // Arrastrar con clic sostenido (como deslizar con el dedo en mobile).
    let isDown = false
    let startX = 0
    let startScroll = 0
    let moved = 0

    const onDown = (e: MouseEvent) => {
      isDown = true
      moved = 0
      startX = e.pageX
      startScroll = el.scrollLeft
      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'
      e.preventDefault() // evita selección de texto / foco que interrumpe el arrastre
    }
    const onMove = (e: MouseEvent) => {
      if (!isDown) return
      const dx = e.pageX - startX
      moved = Math.max(moved, Math.abs(dx))
      el.scrollLeft = startScroll - dx
    }
    const stop = () => {
      if (!isDown) return
      isDown = false
      el.style.cursor = ''
      el.style.userSelect = ''
    }
    // Si hubo arrastre, evita que el clic final seleccione una categoría sin querer.
    const onClickCapture = (e: MouseEvent) => {
      if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0 }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', stop)
    el.addEventListener('mouseleave', stop)
    el.addEventListener('click', onClickCapture, true)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', stop)
      el.removeEventListener('mouseleave', stop)
      el.removeEventListener('click', onClickCapture, true)
    }
  }, [servicios])

  const handleReservar = () => navigate('/reservar-publica')
  const handleNovedades = () => navigate('/novedades')
  const handleShare = async () => {
    const url = window.location.href
    const mensaje = '¡Hola! Encontré un excelente establecimiento en Barber.pe y quiero que le des un vistazo!'
    // 1) Share nativo (móvil / contexto seguro)
    if (navigator.share) {
      try { await navigator.share({ title: sede?.nombre, text: mensaje, url }) } catch { /* cancelado */ }
      return
    }
    // 2) Copiar al portapapeles (con fallback para http/LAN sin contexto seguro)
    let copiado = false
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(`${mensaje} ${url}`); copiado = true }
    } catch { /* sigue al fallback */ }
    if (!copiado) {
      try {
        const ta = document.createElement('textarea')
        ta.value = `${mensaje} ${url}`
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.focus(); ta.select()
        copiado = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { /* noop */ }
    }
    toast.success(copiado ? 'Link copiado al portapapeles' : url)
  }

  // Favoritos unificados: mismo store que la landing y el panel del cliente,
  // para que el corazón se vea igual en todas partes (persiste en el dispositivo).
  const favs = useFavoritosStore((st) => st.favs)
  const toggleFav = useFavoritosStore((st) => st.toggle)
  const isFavorite = sede ? !!favs[sede.idSede] : false
  const toggleFavorite = () => {
    if (!sede) return
    toggleFav({ idSede: sede.idSede, nombre: sede.nombre, subdominio: sede.subdominio, logoUrl: (sede as any).urlLogo, direccion: sede.direccion })
  }
  // El corazón de favoritos se habilita SOLO cuando la sede ya tiene al menos una
  // reseña (el Admin no lo nota, pero así evitamos favoritos de negocios sin historial).
  const puedeFavorito = (resenas?.total ?? 0) >= 1
  const scrollTo = (ref: React.RefObject<HTMLElement>) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className={styles.skel}>
        <div className={styles.skelHero} />
        <div className={styles.skelBody}>
          <div className={styles.skelLine} style={{ width: '50%', height: 28 }} />
          <div className={styles.skelLine} style={{ width: '30%' }} />
          <div style={{ height: 24 }} />
          <div className={styles.skelCard} />
          <div className={styles.skelCard} />
          <div className={styles.skelCard} />
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error || !sede) {
    return (
      <div className={styles.errorWrap}>
        <div
          className={styles.errorCard}
          style={{ textAlign: 'center', maxWidth: 440, padding: '40px 32px' }}
        >
          <img
            src="/barber-logo-black.png"
            alt="Barber.pe"
            style={{ width: 84, height: 84, objectFit: 'contain', margin: '0 auto 20px', display: 'block', opacity: 0.95 }}
          />
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, color: '#111827' }}>
            Establecimiento no disponible
          </h1>
          <p style={{ color: '#4b5563', marginBottom: 8, lineHeight: 1.5 }}>
            Por el momento este establecimiento no está disponible.
          </p>
          <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 22 }}>
            Gracias por tu visita.
          </p>
          <a
            href="https://barber.pe"
            className={styles.errorBtn}
            style={{ display: 'inline-block', textDecoration: 'none' }}
          >
            Ir a Barber.pe
          </a>
        </div>
      </div>
    )
  }

  const brand = sede?.colorPrimarioHex || '#2855F6'
  // Nombre visible unificado (Marca – Sede). Fuente única: utils/nombreParaMostrar.
  const displayName = nombreParaMostrar(sede as any)
  // Teléfono para el botón de llamada (tel:). Normalizamos a E.164: 9 dígitos → +51.
  // En móvil abre el marcador con el número puesto; en desktop lo pasa al handler
  // del sistema. Si no hay teléfono, el botón no se muestra.
  //
  // FUENTE ÚNICA: SOLO sede.telefono. El backend lo devuelve en null cuando el toggle
  // "Mostrar teléfono en mi landing" está apagado, así que ese toggle es lo ÚNICO que
  // decide si aparece. NO se cae a whatsappContacto ni al teléfono del negocio: esos
  // no tienen nada que ver con la landing de la sede (antes el fallback a WhatsApp
  // re-mostraba el número y hacía que el toggle pareciera no funcionar).
  const telDigits = (sede?.telefono || '').replace(/\D/g, '')
  const telE164 = telDigits ? (telDigits.length === 9 ? `+51${telDigits}` : `+${telDigits}`) : ''
  // Número legible para el chip mobile (ej. "943 811 931").
  const telVisible = telDigits.length === 9
    ? telDigits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
    : (sede?.telefono || telDigits)
  const tieneCoords = sede?.latitud != null && sede?.longitud != null && Number(sede.latitud) !== 0 && Number(sede.longitud) !== 0

  // Categorías (campo correcto: nombreCategoria)
  const categorias = [...new Set(servicios.map((s) => s.nombreCategoria).filter(Boolean))] as string[]
  const serviciosFiltrados = filtroCategoria === 'todos' ? servicios : servicios.filter((s) => s.nombreCategoria === filtroCategoria)

  // Galería
  const galeria: string[] = (Array.isArray(sede?.imagenes) ? sede.imagenes : []).map((im: any) => img(im.urlImagen)).filter(Boolean)
  // Banner por defecto: si la sede aún no subió portada ni galería, usamos el
  // logo de Barber.pe (asset del front, ruta absoluta /barber-logo.png) para que
  // la landing nunca se vea vacía y se pueda confirmar/compartir desde el alta.
  const heroImgs = galeria.length
    ? galeria
    : [sede?.urlBanner ? img(sede.urlBanner) : '/barber-logo.png']

  // Redes (se pintan TODAS dinámicamente en el pie, ver ICONO_RED / iconoDeRed)
  const redes: any[] = Array.isArray(sede?.redesSociales) ? sede.redesSociales : []

  // Estado abierto/cerrado hoy
  const hoy = new Date().getDay() // 0=Dom..6=Sab
  const diaHoy = hoy === 0 ? 7 : hoy
  const ahora = hhmm(new Date().toTimeString())
  const rangosHoy = horarios.filter((h) => h.estaActivo && (h.diaSemana === diaHoy || (diaHoy === 7 && h.diaSemana === 0)))
  const abiertoAhora = rangosHoy.some((r) => ahora >= hhmm(r.horaInicio) && ahora <= hhmm(r.horaFin))

  // Badge de estado (verde "Atendiendo" / rojo "Cerrado") según horario del Admin.
  const estadoCls = horarios.length === 0 ? styles.estadoNone : (abiertoAhora ? styles.estadoOpen : styles.estadoClosed)
  const estadoTxt = horarios.length === 0 ? 'Horario no disponible' : (abiertoAhora ? 'Atendiendo' : 'Cerrado')
  // Hora de cierre de hoy (último horaFin de los rangos activos de hoy).
  const cierreHoy = rangosHoy.length ? hhmm([...rangosHoy.map((r) => r.horaFin)].sort().slice(-1)[0]) : ''
  // Hora de apertura de hoy (primer horaInicio).
  const aperturaHoy = rangosHoy.length ? hhmm([...rangosHoy.map((r) => r.horaInicio)].sort()[0]) : ''

  // Próxima apertura (para "Cerrado · abre …").
  const horariosDia = (d: number) => horarios.filter((h) => h.estaActivo && (h.diaSemana === d || (d === 7 && h.diaSemana === 0)))
  let proximaApertura = ''
  if (!abiertoAhora && horarios.length > 0) {
    // ¿Abre más tarde HOY?
    const hoyFuturo = rangosHoy.map((r) => hhmm(r.horaInicio)).filter((h) => h > ahora).sort()
    if (hoyFuturo.length) {
      proximaApertura = `hoy ${h12(hoyFuturo[0])}`
    } else {
      for (let i = 1; i <= 7; i++) {
        let d = diaHoy + i; if (d > 7) d -= 7
        const r = horariosDia(d)
        if (r.length) {
          const h = [...r.map((x) => hhmm(x.horaInicio))].sort()[0]
          proximaApertura = `${i === 1 ? 'mañana' : DIAS[d]} ${h12(h)}`
          break
        }
      }
    }
  }

  // Estado con texto (estilo Fresha): verde "Abierto hasta las HH:MM" / rojo "Cerrado · abre …".
  const estadoOpen = horarios.length > 0 && abiertoAhora
  const estadoWord = horarios.length === 0 ? 'Horario no disponible' : (abiertoAhora ? 'Abierto' : 'Cerrado')
  const estadoSub = horarios.length === 0
    ? ''
    : (abiertoAhora
        ? (aperturaHoy && cierreHoy ? `${h12(aperturaHoy)} – ${h12(cierreHoy)}` : (cierreHoy ? `hasta las ${h12(cierreHoy)}` : ''))
        : (proximaApertura ? `· abre ${proximaApertura}` : ''))


  const mapsHref = `https://maps.google.com/?q=${tieneCoords ? `${sede.latitud},${sede.longitud}` : encodeURIComponent(sede.direccion || sede.nombre)}`
  const ubicacion = [sede?.distrito, sede?.direccion].filter(Boolean).join(', ')
  const osmSrc = tieneCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(sede.longitud) - 0.006}%2C${Number(sede.latitud) - 0.0035}%2C${Number(sede.longitud) + 0.006}%2C${Number(sede.latitud) + 0.0035}&layer=mapnik&marker=${sede.latitud}%2C${sede.longitud}`
    : ''

  // Tabs disponibles
  const tabs = [
    { key: 'servicios', label: 'Servicios', ref: refServicios, show: true },
    { key: 'galeria', label: 'Portfolio', ref: refGaleria, show: galeria.length > 0 },
    { key: 'equipo', label: 'Equipo', ref: refEquipo, show: trabajadores.length > 0 },
    { key: 'resenas', label: 'Reseñas', ref: refResenas, show: resenas.items.length > 0 },
    { key: 'horarios', label: 'Horarios', ref: refHorarios, show: horarios.length > 0 },
    { key: 'acerca', label: 'Acerca de', ref: refAcerca, show: !!sede?.descripcionCorta },
    { key: 'ubicacion', label: 'Ubicación', ref: refUbicacion, show: !!ubicacion || tieneCoords },
  ].filter((t) => t.show)

  const Estrellas = ({ n, size = 16 }: { n: number; size?: number }) => (
    <span className={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} width={size} height={size} className={i <= Math.round(n) ? styles.starOn : styles.starOff} />
      ))}
    </span>
  )

  return (
    <div className={styles.page} style={{ ['--brand' as any]: brand }}>
      {/* ───────── HEADER MOBILE (aparece al hacer scroll) ───────── */}
      <AnimatePresence>
        {scrolled && (
          <motion.header className={styles.mHeader} initial={{ y: -64 }} animate={{ y: 0 }} exit={{ y: -64 }}>
            <div className={styles.mHeaderBar}>
              <span className={styles.mHeaderTitle} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {sede.urlLogo && (
                  <img src={img(sede.urlLogo)} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
              </span>
              <div className={styles.mHeaderIcons}>
                {puedeFavorito && (
                  <button className={styles.plainBtn} onClick={toggleFavorite} aria-label="Favorito">
                    <Heart width={20} height={20} color={isFavorite ? '#ef4444' : undefined} fill={isFavorite ? '#ef4444' : 'none'} />
                  </button>
                )}
                <button className={styles.plainBtn} onClick={handleShare} aria-label="Compartir"><Forward width={20} height={20} /></button>
                <AccountMenu variant="plain" />
              </div>
            </div>
            <div className={styles.mTabs}>
              {tabs.map((t) => (
                <button key={t.key} className={`${styles.mTab} ${activeTab === t.key ? styles.mTabActive : ''}`} onClick={() => scrollTo(t.ref)}>
                  {t.label}
                  {activeTab === t.key && <motion.span layoutId="mtab" className={styles.tabUnderline} />}
                </button>
              ))}
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ───────── NAV DESKTOP (on-scroll) ───────── */}
      <AnimatePresence>
        {scrolled && (
          <motion.nav className={styles.dNav} initial={{ y: -60 }} animate={{ y: 0 }} exit={{ y: -60 }}>
            <div className={styles.dNavInner}>
              <span className={styles.dNavBrand} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {sede.urlLogo && (
                  <img src={img(sede.urlLogo)} alt="" style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'cover' }} />
                )}
                {displayName}
              </span>
              {tabs.map((t) => (
                <button key={t.key} className={`${styles.dTab} ${activeTab === t.key ? styles.dTabActive : ''}`} onClick={() => scrollTo(t.ref)}>
                  {t.label}
                  {activeTab === t.key && <span className={styles.dTabUnderline} />}
                </button>
              ))}
              <div className={styles.dNavCta}>
                <AccountMenu variant="plain" />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ───────── HERO MOBILE (carrusel) ───────── */}
      <div className={styles.mHero}>
        <div ref={heroTrackRef} className={styles.mHeroTrack} onScroll={(e) => {
          const el = e.currentTarget
          setHeroIdx(Math.round(el.scrollLeft / el.clientWidth))
        }}>
          {heroImgs.length ? heroImgs.map((src, i) => (
            <button key={i} className={styles.mHeroSlide} onClick={() => setLightbox(i)}>
              <img src={src} alt={`${sede.nombre} ${i + 1}`} />
            </button>
          )) : (
            <div className={styles.mHeroEmpty}><Monograma fill texto={sede.nombre} color={brand} /></div>
          )}
        </div>
        <div className={styles.heroControls}>
          <span aria-hidden />
          <div className={styles.heroRight}>
            {puedeFavorito && (
              <button className={styles.heroFloatBtn} onClick={toggleFavorite} aria-label="Favorito">
                <Heart width={20} height={20} color={isFavorite ? '#ef4444' : undefined} fill={isFavorite ? '#ef4444' : 'none'} />
              </button>
            )}
            <button className={styles.heroFloatBtn} onClick={handleShare} aria-label="Compartir"><Forward width={20} height={20} /></button>
            <AccountMenu variant="floating" />
          </div>
        </div>
        {heroImgs.length > 1 && (
          <>
            <div className={styles.counter}>{heroIdx + 1} / {heroImgs.length}</div>
            <div className={styles.dots}>
              {heroImgs.map((_, i) => <span key={i} className={`${styles.dotNav} ${i === heroIdx ? styles.dotNavActive : ''}`} />)}
            </div>
          </>
        )}
        {sede.urlLogo && <img className={styles.heroLogo} src={img(sede.urlLogo)} alt={sede.nombre} />}
      </div>

      {/* ───────── CONTENEDOR ───────── */}
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          {(() => {
            const multi = (sede.totalSedesPublicasMarca ?? 1) >= 2
            const titulo = multi
              ? `${sede.nombreComercial} – ${sede.nombre}`
              : (sede.nombreComercial || sede.nombre)
            return multi
              ? `Inicio • Barberías • ${sede.departamento || 'Perú'} • ${sede.distrito || sede.nombre} • ${titulo}`
              : `Inicio • Barberías • ${sede.departamento || 'Perú'} • ${titulo}`
          })()}
        </div>

        {/* TÍTULO + ACCIONES (arriba, estilo Fresha) */}
        <div className={styles.head}>
          <div className={styles.headMain}>
            {/* Fila título: en DESKTOP se antepone el logo (LOGO — Marca – Distrito);
                en mobile el logo va en el hero y titleRow es transparente. */}
            <div className={styles.titleRow}>
              {sede.urlLogo && (
                <img className={styles.headLogo} src={img(sede.urlLogo)} alt={sede.nombre} />
              )}
              <h1 className={styles.title}>
                {(sede.totalSedesPublicasMarca ?? 1) >= 2
                  ? `${sede.nombreComercial} – ${sede.nombre}`
                  : (sede.nombreComercial || sede.nombre)}
              </h1>
            </div>
            <div className={styles.metaRow}>
              {resenas.total > 0 ? (
                <span className={styles.ratingWrap}>
                  <Estrellas n={resenas.promedio} size={16} />
                  <span className={styles.ratingVal}>{resenas.promedio.toFixed(1)}</span>
                  <span className={styles.ratingCount}>({resenas.total})</span>
                </span>
              ) : (
                <span className={styles.noRating}><Star width={16} height={16} className={styles.starOff} /> Aún sin reseñas</span>
              )}
              <span className={styles.metaSep}>·</span>
              <span className={styles.estadoLine}>
                <Clock width={15} height={15} className={horarios.length === 0 ? styles.estadoNone : (estadoOpen ? styles.openTxt : styles.closedTxt)} />
                <span className={horarios.length === 0 ? styles.estadoNone : (estadoOpen ? styles.openTxt : styles.closedTxt)}>{estadoWord}</span>
                {estadoSub && <span className={styles.estadoSub}>{estadoSub}</span>}
              </span>
              {ubicacion && (
                <a className={styles.addrInline} href={mapsHref} target="_blank" rel="noreferrer"><MapPin width={15} height={15} /> {ubicacion}</a>
              )}
              {telE164 && (
                <a href={`tel:${telE164}`} className={styles.addrInline} style={{ color: brand, fontWeight: 600 }} aria-label="Llamar por teléfono">
                  <Phone width={15} height={15} /> Llamar
                </a>
              )}
            </div>
            {/* Fila mobile: dirección (trunca) + teléfono (número, no se comprime).
                TODO el layout vive en el CSS (.addrPillRow/.addrPillAddr/.addrPillTel),
                sin estilos inline: así el @media desktop puede ocultar la fila con
                .addrPillRow{display:none} sin que un inline lo anule. */}
            <div className={styles.addrPillRow}>
              {ubicacion && (
                <a className={`${styles.addrPill} ${styles.addrPillAddr}`} href={mapsHref} target="_blank" rel="noreferrer">
                  <MapPin width={16} height={16} /> <span>{ubicacion}</span>
                </a>
              )}
              {telE164 && (
                <a href={`tel:${telE164}`} className={`${styles.addrPill} ${styles.addrPillTel}`} style={{ color: brand, fontWeight: 600 }} aria-label={`Llamar al ${telE164}`}>
                  <Phone width={16} height={16} /> {telVisible}
                </a>
              )}
            </div>
          </div>
          <div className={styles.headActions}>
            {novedades.length > 0 && (
              <button className={styles.novedadesBtn} style={{ background: brand }} onClick={handleNovedades}>
                <Gift width={16} height={16} /> Promociones
              </button>
            )}
            {puedeFavorito && (
              <button className={styles.iconBtn} onClick={toggleFavorite} aria-label="Favorito">
                <Heart width={18} height={18} color={isFavorite ? '#ef4444' : undefined} fill={isFavorite ? '#ef4444' : 'none'} />
              </button>
            )}
            <button className={styles.iconBtn} onClick={handleShare} aria-label="Compartir"><Forward width={18} height={18} /></button>
            <AccountMenu variant="plain" />
          </div>
        </div>

        {/* HERO DESKTOP (1 grande + 2 minis) */}
        <div className={styles.dHero}>
          {heroImgs.length ? (
            <>
              <button className={`${styles.dHeroBig} ${heroImgs.length === 1 ? styles.dHeroBigSolo : ''}`} onClick={() => setLightbox(0)}>
                <img src={heroImgs[0]} alt={sede.nombre} />
              </button>
              {heroImgs[1] && (
                <button className={`${styles.dHeroMini} ${styles.dHeroMiniTR}`} onClick={() => setLightbox(1)}>
                  <img src={heroImgs[1]} alt={`${sede.nombre} 2`} />
                </button>
              )}
              {heroImgs[2] && (
                <button className={`${styles.dHeroMini} ${styles.dHeroMiniBR}`} onClick={() => setLightbox(2)}>
                  <img src={heroImgs[2]} alt={`${sede.nombre} 3`} />
                  {heroImgs.length > 3 && <span className={styles.miniBadge}>+{heroImgs.length - 3}</span>}
                </button>
              )}
            </>
          ) : (
            <div className={`${styles.dHeroBig} ${styles.dHeroBigSolo}`}>
              <Monograma fill texto={sede.nombre} color={brand} />
            </div>
          )}
          {galeria.length > 0 && (
            <button className={styles.verTodas} onClick={() => setLightbox(0)}>Ver todas las fotos</button>
          )}
        </div>

        <div className={styles.grid}>
          {/* ───────── COLUMNA PRINCIPAL ───────── */}
          <div className={styles.main}>
            {/* SERVICIOS */}
            <section ref={refServicios} className={styles.section}>
              <div className={styles.servHead}>
                <h2 className={styles.h2}>Servicios</h2>
                {novedades.length > 0 && (
                  <button className={styles.novedadesBtnMobile} style={{ background: brand }} onClick={handleNovedades}>
                    <Gift width={15} height={15} /> Promociones
                  </button>
                )}
              </div>
              {categorias.length > 0 && (
                <div className={styles.cats} ref={refCats}>
                  <button className={`${styles.cat} ${filtroCategoria === 'todos' ? styles.catActive : ''}`} onClick={() => setFiltroCategoria('todos')}>Todos</button>
                  {categorias.map((c) => (
                    <button key={c} className={`${styles.cat} ${filtroCategoria === c ? styles.catActive : ''}`} onClick={() => setFiltroCategoria(c)}>{c}</button>
                  ))}
                </div>
              )}
              {serviciosFiltrados.length === 0 ? (
                <div className={styles.empty}>No hay servicios disponibles</div>
              ) : (
                <div className={styles.servList}>
                  {(verTodosServicios ? serviciosFiltrados : serviciosFiltrados.slice(0, 5)).map((s, idx) => (
                    <motion.div key={s.idServicio || idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className={styles.servCard} style={{ cursor: 'pointer' }} onClick={() => setServicioSel(s)}>
                      <div className={styles.servLeft}>
                        {img(s.urlImagen)
                          ? <img className={styles.servImg} src={img(s.urlImagen)} alt={s.nombre} />
                          : <div className={styles.servImgFb} style={{ background: brand }}>{iniciales(s.nombre)}</div>}
                        <div style={{ minWidth: 0 }}>
                          <div className={styles.servTitleRow}>
                            <span className={styles.servTitle}>{s.nombre}</span>
                            {s.esDestacado && <span className={styles.topBadge}>Destacado</span>}
                          </div>
                          {s.descripcionCorta && <p className={styles.servDesc}>{s.descripcionCorta}</p>}
                          <div className={styles.servMeta}>
                            <span className={styles.servMetaItem}><Clock width={14} height={14} /> {s.duracionMinutos || 30} min</span>
                            <span className={styles.servPrice}>S/ {(s.precioBase || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <button className={styles.reservarBtn} onClick={(e) => { e.stopPropagation(); navigate(`/reservar-publica?servicio=${s.idServicio || s.id}`) }}>Reservar</button>
                    </motion.div>
                  ))}
                </div>
              )}
              {serviciosFiltrados.length > 5 && (
                <button className={styles.verTodo} onClick={() => setVerTodosServicios((v) => !v)}>
                  {verTodosServicios ? 'Ver menos' : `Ver todo (${serviciosFiltrados.length})`}
                </button>
              )}
            </section>

            {/* PORTFOLIO */}
            {galeria.length > 0 && (
              <section ref={refGaleria} className={`${styles.section} ${styles.sectionGap}`}>
                <div className={styles.pfHead}>
                  <h2 className={styles.h2}>Portfolio</h2>
                  <span className={styles.pfCount}>{galeria.length}</span>
                </div>
                <div className={styles.pfWrap}>
                  <div className={styles.pf}>
                    {galeria.slice(0, 5).map((src, idx, arr) => {
                      const esUltima = idx === arr.length - 1
                      const restantes = galeria.length - arr.length
                      return (
                        <button
                          key={idx}
                          className={`${styles.pfCell} ${idx === 0 ? styles.pfBig : ''}`}
                          onClick={() => setLightbox(idx)}
                          aria-label={`Foto ${idx + 1}`}
                        >
                          <img src={src} alt={`Foto ${idx + 1}`} loading="lazy" />
                          {esUltima && restantes > 0 && <span className={styles.pfMore}>+{restantes}</span>}
                        </button>
                      )
                    })}
                  </div>
                  <button className={styles.pfVerTodas} onClick={() => setLightbox(0)}>Ver todas las fotos</button>
                </div>
              </section>
            )}

            {/* EQUIPO */}
            {trabajadores.length > 0 && (
              <section ref={refEquipo} className={`${styles.section} ${styles.sectionGap}`}>
                <h2 className={styles.h2}>Equipo</h2>
                <div className={styles.teamGrid}>
                  {trabajadores.map((t, idx) => (
                    <button key={t.idTrabajador || idx} className={styles.teamItem} onClick={() => setTrabajadorSel(t)}>
                      <div className={styles.teamPhoto}>
                        {t.urlFotoPerfil ? <img src={img(t.urlFotoPerfil)} alt={t.nombreCompleto} /> : <Monograma fill texto={t.nombreCompleto} style={{ fontSize: 30 }} />}
                        {t.esDestacado && <span className={styles.teamBadge} style={{ background: brand }}>Destacado</span>}
                      </div>
                      <div className={styles.teamName}>{t.nombreCompleto}</div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* RESEÑAS */}
            {resenas.items.length > 0 && (
              <section ref={refResenas} className={`${styles.section} ${styles.sectionGap}`}>
                <div className={styles.h2Row}>
                  <h2 className={styles.h2}>Reseñas</h2>
                  <span className={styles.ratingWrap}><Star width={16} height={16} className={styles.starOn} /> <span className={styles.ratingVal}>{resenas.promedio.toFixed(1)}</span> <span className={styles.ratingCount}>({resenas.total})</span></span>
                </div>
                <div className={styles.reviewGrid}>
                  {resenas.items.map((r, idx) => (
                    <div key={r.idCalificacion || idx} className={styles.reviewCard}>
                      <div className={styles.reviewHead}>
                        <span className={styles.reviewName}>{r.nombreCliente || 'Cliente'}</span>
                        <Estrellas n={r.puntuacion} size={14} />
                      </div>
                      {r.comentario && <p className={styles.reviewText}>{r.comentario}</p>}
                      <div className={styles.reviewMeta}>
                        <span>{r.nombreTrabajador ? `con ${r.nombreTrabajador}` : ''}</span>
                        <span>{r.fecha ? new Date(r.fecha).toLocaleDateString('es-PE') : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* HORARIOS */}
            {horarios.length > 0 && (
              <section ref={refHorarios} className={`${styles.section} ${styles.sectionGap}`}>
                <h2 className={styles.h2}>Horarios de atención</h2>
                <div className={styles.horList}>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                    const rangos = horariosDia(d)
                    const abierto = rangos.length > 0
                    return (
                      <div key={d} className={`${styles.horItem} ${d === diaHoy ? styles.horItemHoy : ''}`}>
                        <span className={styles.horDia}>
                          <span className={`${styles.horDot} ${abierto ? styles.horDotOn : styles.horDotOff}`} />
                          {DIAS[d]}
                        </span>
                        <span className={styles.horHoras}>
                          {abierto ? rangos.map((r) => `${h12(r.horaInicio)} - ${h12(r.horaFin)}`).join(', ') : 'Cerrado'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ACERCA DE */}
            {sede?.descripcionCorta && (
              <section ref={refAcerca} className={`${styles.section} ${styles.sectionGap}`}>
                <h2 className={styles.h2}>Acerca de</h2>
                <p style={{ whiteSpace: 'pre-line', lineHeight: 1.6, color: '#374151', maxWidth: 720 }}>{sede.descripcionCorta}</p>
              </section>
            )}

            {/* UBICACIÓN */}
            {(ubicacion || tieneCoords) && (
              <section ref={refUbicacion} className={`${styles.section} ${styles.sectionGap}`}>
                <h2 className={styles.h2}>Ubicación</h2>
                {tieneCoords ? (
                  <>
                    <div className={styles.mapWrap}>
                      <iframe title="Ubicación" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={osmSrc} />
                    </div>
                    <p className={styles.mapCredit}>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></p>
                  </>
                ) : (
                  <div className={styles.mapEmpty}>{ubicacion}</div>
                )}
                <a className={styles.comoLlegar} style={{ background: brand }} href={mapsHref} target="_blank" rel="noreferrer"><Navigation width={16} height={16} /> Cómo llegar</a>
              </section>
            )}

            {/* FOOTER */}
            <footer className={styles.footer}>
              <div className={styles.footRow}>
                <div className={styles.footBrand}>
                  {sede.urlLogo ? <img className={styles.footLogo} src={img(sede.urlLogo)} alt={sede.nombre} /> : <div className={styles.footLogoFb} style={{ background: brand }}><Scissors width={20} height={20} /></div>}
                  <div>
                    <div className={styles.footName}>{displayName}</div>
                    {ubicacion && <div className={styles.footSub}>{ubicacion}</div>}
                  </div>
                </div>
                {redes.some((r) => r?.url) && (
                  <div className={styles.socials}>
                    {redes
                      .filter((r) => r?.url)
                      .map((r, i) => {
                        const Ico = iconoDeRed(r.tipo)
                        const t = (r.tipo || '').toLowerCase()
                        let href = String(r.url)
                        if (t.includes('whats')) {
                          const d = href.replace(/\D/g, '')
                          const num = d.length === 9 ? '51' + d : d // Perú: 9 dígitos → +51
                          const msg = encodeURIComponent(`Hola ${displayName}, quisiera más información para hacer una reserva`)
                          href = `https://wa.me/${num}?text=${msg}`
                        }
                        return (
                          <a key={r.idRedSocial ?? i} className={styles.social} href={href} target="_blank" rel="noreferrer" aria-label={r.tipo || 'Red social'}>
                            <Ico width={16} height={16} />
                          </a>
                        )
                      })}
                  </div>
                )}
              </div>
              <p className={styles.copy}>© {new Date().getFullYear()} {displayName}. Reservas con <a className={styles.copyLink} href="https://barber.pe" target="_blank" rel="noreferrer">barber.pe</a>.</p>
            </footer>
          </div>

          {/* ───────── CARD STICKY (aside desktop) ───────── */}
          <aside className={styles.aside}>
            <div className={`${styles.card} ${!scrolled ? styles.cardCompact : ''}`}>
              {!scrolled ? (
                <>
                  <button className={styles.cardCta} style={{ background: brand }} onClick={handleReservar}>Reservar ahora</button>
                  <p className={styles.cardSub}>{servicios.length} servicios disponibles</p>
                </>
              ) : (
                <>
                  <h2 className={styles.cardTitle}>{sede.nombre}</h2>
                  <div className={styles.cardRating}>
                    {resenas.total > 0 ? (
                      <>
                        <Estrellas n={resenas.promedio} size={18} />
                        <span className={styles.cardRatingVal}>{resenas.promedio.toFixed(1)}</span>
                        <span className={styles.ratingCount}>({resenas.total})</span>
                      </>
                    ) : <span className={styles.noRating}><Star width={16} height={16} className={styles.starOff} /> Aún sin reseñas</span>}
                  </div>

                  <button className={styles.cardCta} style={{ background: brand }} onClick={handleReservar}>Reservar ahora</button>
                  <p className={styles.cardSub}>{servicios.length} servicios disponibles</p>

                  {horarios.length > 0 && (
                    <div className={styles.cardDivider}>
                      <button className={styles.horaToggle} onClick={() => setExpandirHorarios(!expandirHorarios)}>
                        <Clock width={16} height={16} />
                        <span className={styles.horaTxt}>
                          <span className={abiertoAhora ? styles.openTxt : styles.closedTxt}>{abiertoAhora ? 'Abierto' : 'Cerrado'}</span>
                          {abiertoAhora && cierreHoy ? ` hasta las ${h12(cierreHoy)}` : ''}
                        </span>
                        <ChevronDown width={16} height={16} className={`${styles.horaChevron} ${expandirHorarios ? styles.horaChevronOpen : ''}`} />
                      </button>
                      <AnimatePresence>
                        {expandirHorarios && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div className={styles.horaList}>
                              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                                const rangos = horarios.filter((h) => h.estaActivo && (h.diaSemana === d || (d === 7 && h.diaSemana === 0)))
                                return (
                                  <div key={d} className={`${styles.horaRow} ${d === diaHoy ? styles.horaRowHoy : ''}`}>
                                    <span>{DIAS[d]}</span>
                                    <span className={rangos.length ? '' : styles.horaCerrado}>
                                      {rangos.length ? rangos.map((r) => `${h12(r.horaInicio)} - ${h12(r.horaFin)}`).join(', ') : 'Cerrado'}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {ubicacion && (
                    <div className={styles.cardDivider}>
                      <div className={styles.cardAddr}><MapPin width={16} height={16} /> <span>{ubicacion}</span></div>
                      <a className={styles.cardComoLlegar} href={mapsHref} target="_blank" rel="noreferrer"><Navigation width={16} height={16} /> Cómo llegar</a>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ───────── BOTTOM BAR MOBILE ───────── */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomInner}>
          <div>
            <div className={styles.bbServ}>{servicios.length} servicios</div>
            <div className={styles.bbDisp}>disponibles</div>
          </div>
          <button className={styles.bbBtn} style={{ background: brand }} onClick={handleReservar}>Reservar ahora <ChevronRight width={18} height={18} /></button>
        </div>
      </div>

      {/* ───────── LIGHTBOX ───────── */}
      <AnimatePresence>
        {lightbox !== null && galeria.length > 0 && (
          <motion.div className={styles.lb} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)}>
            <button className={styles.lbClose} onClick={() => setLightbox(null)} aria-label="Cerrar"><X width={26} height={26} /></button>
            {galeria.length > 1 && (
              <button className={styles.lbPrev} onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + galeria.length) % galeria.length) }} aria-label="Anterior"><ChevronLeft width={32} height={32} /></button>
            )}
            <img className={styles.lbImg} src={galeria[lightbox]} alt={`Foto ${lightbox + 1}`} onClick={(e) => e.stopPropagation()} />
            {galeria.length > 1 && (
              <button className={styles.lbNext} onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % galeria.length) }} aria-label="Siguiente"><ChevronRight width={32} height={32} /></button>
            )}
            <div className={styles.lbCounter}>{lightbox + 1} / {galeria.length}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────── MODAL TRABAJADOR ───────── */}
      <AnimatePresence>
        {trabajadorSel && (
          <TrabajadorModal
            trabajador={trabajadorSel}
            brand={brand}
            onReservar={() => {
              const id = trabajadorSel?.idTrabajador
              setTrabajadorSel(null)
              navigate(id ? `/reservar-publica?trabajador=${id}` : '/reservar-publica')
            }}
            onClose={() => setTrabajadorSel(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {servicioSel && (
          <ServicioModal
            servicio={servicioSel}
            brand={brand}
            onReservar={() => {
              const id = servicioSel?.idServicio || servicioSel?.id
              setServicioSel(null)
              navigate(id ? `/reservar-publica?servicio=${id}` : '/reservar-publica')
            }}
            onClose={() => setServicioSel(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
