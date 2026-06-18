import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Store, Building2, Phone, Clock, MapPin, Image as ImageIcon, Camera, Share2, Save, Loader2,
  X, Upload, Plus, Instagram, Facebook, Globe, Music2, Youtube, Twitter, Link2, Copy, ExternalLink, Info,
} from 'lucide-react'
import { apiClient } from '@/services/apiClient'
import { geoService } from '@/services/geoService'
import { AdminLayout } from '@/components/AdminLayout'
import SeccionFila from '@/components/SeccionFila'
import SeccionSheet from '@/components/SeccionSheet'

interface Sede {
  idSede?: number
  nombre?: string
  descripcion?: string
  subdominio?: string
  slug?: string
  direccion?: string
  telefono?: string
  correo?: string
  horarioApertura?: string
  horarioCierre?: string
  urlLogo?: string
  urlBanner?: string
  latitud?: number
  longitud?: number
  departamento?: string
  provincia?: string
  distrito?: string
  colorPrimarioHex?: string
}

const DIAS_SEMANA = [
  { dia: 1, label: 'Lunes' },
  { dia: 2, label: 'Martes' },
  { dia: 3, label: 'Miércoles' },
  { dia: 4, label: 'Jueves' },
  { dia: 5, label: 'Viernes' },
  { dia: 6, label: 'Sábado' },
  { dia: 0, label: 'Domingo' },
]
type DiaHorario = { dia: number; label: string; abierto: boolean; inicio: string; fin: string; idHorario?: number }

const RED_OPCIONES = [
  { value: 'instagram', label: 'Instagram', Icon: Instagram },
  { value: 'facebook', label: 'Facebook', Icon: Facebook },
  { value: 'tiktok', label: 'TikTok', Icon: Music2 },
  { value: 'youtube', label: 'YouTube', Icon: Youtube },
  { value: 'x', label: 'X', Icon: Twitter },
  { value: 'web', label: 'Sitio web', Icon: Globe },
]
const redIcon = (tipo: string) => RED_OPCIONES.find((o) => o.value === (tipo || '').toLowerCase())?.Icon || Globe

const inputCls =
  'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition'

// --- Ubicación: parser local de coordenadas (coords sueltas o URL larga) ---
function esCoordValida(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)
}
function parseCoordsLocal(texto: string): { lat: number; lng: number } | null {
  const t = (texto || '').trim()
  if (!t) return null
  const patrones = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|center|destination|daddr)=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/,
  ]
  for (const re of patrones) {
    const m = t.match(re)
    if (m) {
      const lat = parseFloat(m[1]); const lng = parseFloat(m[2])
      if (esCoordValida(lat, lng)) return { lat, lng }
    }
  }
  return null
}
function pareceLink(t: string) {
  return /^https?:\/\//i.test((t || '').trim())
}
// Mini-mapa de confirmación con OpenStreetMap (sin API key).
function osmEmbedSrc(lat: number, lng: number) {
  const dx = 0.004, dy = 0.003
  const bbox = `${lng - dx},${lat - dy},${lng + dx},${lat + dy}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`
}

// Colores sugeridos (vivos) para el tema de la sede.
const COLOR_PRESETS = ['#2855F6', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0d9488', '#dc2626', '#111827']
const DEFAULT_BRAND = '#2855F6'

// Identificadores de cada editor (sheet) del hub.
type SheetId = 'info' | 'imagen' | 'contacto' | 'ubicacion' | 'horarios' | 'negocio' | 'galeria' | 'redes' | null

export function ConfiguracionPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [subiendoBanner, setSubiendoBanner] = useState(false)

  const [redes, setRedes] = useState<any[]>([])
  const [imagenes, setImagenes] = useState<any[]>([])
  const [nuevaRedTipo, setNuevaRedTipo] = useState('instagram')
  const [nuevaRedUrl, setNuevaRedUrl] = useState('')
  const [subiendoGaleria, setSubiendoGaleria] = useState(false)

  const [idSedeActual, setIdSedeActual] = useState<number | null>(null)
  const [horariosDias, setHorariosDias] = useState<DiaHorario[]>(
    DIAS_SEMANA.map((d) => ({ ...d, abierto: false, inicio: '09:00', fin: '21:00' }))
  )
  const [cargandoHorarios, setCargandoHorarios] = useState(true)
  const [guardandoHorarios, setGuardandoHorarios] = useState(false)

  // Editor abierto del hub (null = ninguno).
  const [sheet, setSheet] = useState<SheetId>(null)
  const [ubicTexto, setUbicTexto] = useState('')
  const [resolviendoUbic, setResolviendoUbic] = useState(false)
  const cerrar = () => setSheet(null)

  const [sede, setSede] = useState<Sede>({
    idSede: 1, nombre: '', descripcion: '', direccion: '', telefono: '', correo: '',
    subdominio: '', slug: '', urlLogo: '', latitud: undefined, longitud: undefined,
    departamento: '', provincia: '', distrito: '',
  })

  // Datos del negocio (empresa) — ahora editables también desde aquí (antes solo en el primer login).
  const [empresa, setEmpresa] = useState({
    idEmpresa: null as number | null,
    razonSocial: '', nombreComercial: '', ruc: '', correoContacto: '', telefonoContacto: '',
  })
  // Correo/teléfono de la cuenta del admin: sirven como valor por defecto para no retipear.
  const [cuenta, setCuenta] = useState({ correo: '', telefono: '' })

  useEffect(() => { loadSede(); loadNegocio() }, [])

  const mapearHorarios = (lista: any[]): DiaHorario[] =>
    DIAS_SEMANA.map((d) => {
      const row = lista.find((h) => h.estaActivo && (h.diaSemana === d.dia || (d.dia === 0 && h.diaSemana === 7)))
      return row
        ? { ...d, abierto: true, inicio: (row.horaInicio || '').slice(0, 5), fin: (row.horaFin || '').slice(0, 5), idHorario: row.idHorario }
        : { ...d, abierto: false, inicio: '09:00', fin: '21:00' }
    })

  useEffect(() => {
    ;(async () => {
      try {
        setCargandoHorarios(true)
        const sedeRes = await apiClient.get('/api/Sedes/actual')
        const idSede = sedeRes.data?.data?.idSede ?? sedeRes.data?.idSede
        if (!idSede) { setCargandoHorarios(false); return }
        setIdSedeActual(idSede)
        const hRes = await apiClient.get(`/api/Horarios/sede/${idSede}`)
        const lista: any[] = hRes.data?.data ?? hRes.data ?? []
        setHorariosDias(mapearHorarios(lista))
      } catch (err) {
        console.error('❌ Error cargando horarios:', err)
      } finally {
        setCargandoHorarios(false)
      }
    })()
  }, [])

  const toggleDia = (dia: number) =>
    setHorariosDias((prev) => prev.map((d) => (d.dia === dia ? { ...d, abierto: !d.abierto } : d)))
  const setHora = (dia: number, campo: 'inicio' | 'fin', valor: string) =>
    setHorariosDias((prev) => prev.map((d) => (d.dia === dia ? { ...d, [campo]: valor } : d)))

  const guardarHorarios = async (): Promise<boolean> => {
    if (!idSedeActual) { toast.error('No se pudo resolver la sede activa'); return false }
    for (const d of horariosDias) {
      if (d.abierto && (!d.inicio || !d.fin || d.inicio >= d.fin)) {
        toast.error(`${d.label}: la hora de inicio debe ser menor que la de fin`)
        return false
      }
    }
    try {
      setGuardandoHorarios(true)
      const actualRes = await apiClient.get(`/api/Horarios/sede/${idSedeActual}`)
      const existentes: any[] = actualRes.data?.data ?? actualRes.data ?? []
      const porDia = new Map<number, any>()
      existentes.forEach((h) => porDia.set(h.diaSemana === 7 ? 0 : h.diaSemana, h))
      for (const d of horariosDias) {
        const row = porDia.get(d.dia)
        if (d.abierto) {
          if (row) {
            await apiClient.put(`/api/Horarios/${row.idHorario}`, { horaInicio: `${d.inicio}:00`, horaFin: `${d.fin}:00`, estaActivo: true })
          } else {
            await apiClient.post(`/api/Horarios/sede/${idSedeActual}`, { diaSemana: d.dia, horaInicio: `${d.inicio}:00`, horaFin: `${d.fin}:00` })
          }
        } else if (row) {
          await apiClient.delete(`/api/Horarios/${row.idHorario}`)
        }
      }
      const hRes = await apiClient.get(`/api/Horarios/sede/${idSedeActual}`)
      setHorariosDias(mapearHorarios(hRes.data?.data ?? hRes.data ?? []))
      toast.success('Horarios guardados')
      return true
    } catch (err: any) {
      console.error('❌ Error guardando horarios:', err.response?.data || err)
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Error guardando horarios')
      return false
    } finally {
      setGuardandoHorarios(false)
    }
  }

  const loadSede = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/api/Sedes/actual')
      const data = res.data?.data ?? res.data
      if (data) {
        const sedeData: Sede = {
          idSede: data.idSede,
          nombre: data.nombre ?? '',
          descripcion: data.descripcionCorta ?? '',
          subdominio: data.subdominio ?? '',
          slug: data.slug ?? '',
          direccion: data.direccion ?? '',
          telefono: data.telefono ?? '',
          correo: data.correoContacto ?? '',
          urlLogo: data.urlLogo ?? '',
          urlBanner: data.urlBanner ?? '',
          latitud: data.latitud != null ? Number(data.latitud) : undefined,
          longitud: data.longitud != null ? Number(data.longitud) : undefined,
          departamento: data.departamento ?? '',
          provincia: data.provincia ?? '',
          distrito: data.distrito ?? '',
          colorPrimarioHex: data.colorPrimarioHex ?? '',
        }
        setSede(sedeData)
        if (sedeData.urlLogo) setLogoPreview(sedeData.urlLogo)
        if (sedeData.urlBanner) setBannerPreview(sedeData.urlBanner)
      }
    } catch (err) {
      console.error('❌ Error cargando configuración:', err)
      toast.error('Error cargando configuración de la sede')
    } finally {
      setLoading(false)
    }
  }

  const loadNegocio = async () => {
    try {
      const [emp, perfil] = await Promise.all([
        apiClient.get('/api/mi-empresa').catch(() => null),
        apiClient.get('/api/auth/mi-perfil').catch(() => null),
      ])
      const e = emp?.data?.data ?? emp?.data
      const p = perfil?.data?.data ?? perfil?.data
      const cuentaCorreo = p?.correo ?? ''
      const cuentaTel = p?.telefono ?? ''
      setCuenta({ correo: cuentaCorreo, telefono: cuentaTel })
      if (e) {
        setEmpresa({
          idEmpresa: e.idEmpresa ?? null,
          razonSocial: e.razonSocial ?? '',
          nombreComercial: e.nombreComercial ?? '',
          ruc: e.ruc ?? '',
          // Si la empresa aún no tiene contacto, se pre-carga con el de tu cuenta (no retipear).
          correoContacto: e.correoContacto || cuentaCorreo || '',
          telefonoContacto: e.telefonoContacto || cuentaTel || '',
        })
      }
    } catch (err) {
      console.error('❌ Error cargando datos del negocio:', err)
    }
  }

  const handleChangeEmpresa = (field: string, value: string) =>
    setEmpresa((prev) => ({ ...prev, [field]: value }))

  const handleChange = (field: keyof Sede, value: string | number) =>
    setSede((prev) => ({ ...prev, [field]: value }))

  // Pega coords o un enlace de Maps → rellena latitud/longitud solo.
  const aplicarUbicacion = async (raw: string) => {
    let t = (raw || '').trim()
    if (!t) return
    // Si viene texto alrededor del enlace (o basura pegada antes), nos quedamos
    // SOLO con la URL. Si son coordenadas sueltas, queda igual.
    const link = t.match(/https?:\/\/[^\s]+/)
    if (link) t = link[0]
    const local = parseCoordsLocal(t)
    if (local) {
      setSede((prev) => ({ ...prev, latitud: local.lat, longitud: local.lng }))
      toast.success('Ubicación detectada ✓')
      return
    }
    if (pareceLink(t)) {
      setResolviendoUbic(true)
      const r = await geoService.resolver(t)
      setResolviendoUbic(false)
      if (r.ok && r.lat != null && r.lng != null) {
        setSede((prev) => ({ ...prev, latitud: r.lat!, longitud: r.lng! }))
        toast.success('Ubicación detectada ✓')
      } else {
        toast.error(r.mensaje || 'No pude leer la ubicación. Pega las coordenadas, ej: -11.83, -77.10')
      }
      return
    }
    toast.error('Pega coordenadas (ej: -11.83, -77.10) o un enlace de Google Maps')
  }

  // Sube por apiClient (NO fetch): así pasa por el interceptor que comprime y
  // convierte HEIC -> JPEG antes de enviar. El tamaño lo controla la compresión.
  const subirImagen = async (file: File, comoJpeg = false): Promise<string | null> => {
    const esImagen = file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name)
    if (!esImagen) { toast.error('Por favor selecciona una imagen'); return null }
    const form = new FormData()
    form.append('Archivo', file)
    const endpoint = comoJpeg ? '/api/Upload?jpg=true' : '/api/Upload'
    const res = await apiClient.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } })
    const json = res.data
    return json?.data?.url ?? json?.url ?? null
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    try { setSubiendoLogo(true); const url = await subirImagen(file); if (url) { setLogoPreview(url); handleChange('urlLogo', url); toast.success('Logo subido') } }
    catch (err: any) { toast.error(err.response?.data?.message || err.message || 'Error subiendo el logo') }
    finally { setSubiendoLogo(false); e.target.value = '' }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    try { setSubiendoBanner(true); const url = await subirImagen(file, true); if (url) { setBannerPreview(url); handleChange('urlBanner', url); toast.success('Banner subido') } }
    catch (err: any) { toast.error(err.response?.data?.message || err.message || 'Error subiendo el banner') }
    finally { setSubiendoBanner(false); e.target.value = '' }
  }

  const removeLogo = () => { setLogoPreview(null); handleChange('urlLogo', '') }
  const removeBanner = () => { setBannerPreview(null); handleChange('urlBanner', '') }

  useEffect(() => { cargarMedia() }, [])

  const cargarMedia = async () => {
    try {
      const [r, i] = await Promise.all([
        apiClient.get('/api/SedeMedia/redes'),
        apiClient.get('/api/SedeMedia/imagenes'),
      ])
      setRedes(r.data?.data ?? r.data ?? [])
      setImagenes(i.data?.data ?? i.data ?? [])
    } catch (err) { console.error('❌ Error cargando redes/galería:', err) }
  }

  const agregarRed = async () => {
    if (!nuevaRedUrl.trim()) { toast.error('Ingresa la URL de la red'); return }
    try {
      await apiClient.post('/api/SedeMedia/redes', { tipo: nuevaRedTipo, url: nuevaRedUrl.trim(), orden: redes.length + 1 })
      setNuevaRedUrl(''); toast.success('Red social agregada'); cargarMedia()
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error agregando la red') }
  }

  const eliminarRed = async (id: number) => {
    try { await apiClient.delete(`/api/SedeMedia/redes/${id}`); cargarMedia() }
    catch { toast.error('Error eliminando la red') }
  }

  const subirImagenGaleria = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      setSubiendoGaleria(true)
      const url = await subirImagen(file)
      if (url) { await apiClient.post('/api/SedeMedia/imagenes', { urlImagen: url, orden: imagenes.length + 1 }); toast.success('Imagen agregada a la galería'); cargarMedia() }
    } catch (err: any) { toast.error(err.response?.data?.message || err.message || 'Error subiendo la imagen') }
    finally { setSubiendoGaleria(false); e.target.value = '' }
  }

  const eliminarImagen = async (id: number) => {
    try { await apiClient.delete(`/api/SedeMedia/imagenes/${id}`); cargarMedia() }
    catch { toast.error('Error eliminando la imagen') }
  }

  // Guarda sede + datos del negocio (empresa) en una sola acción. Devuelve true si OK.
  const guardarConfig = async (): Promise<boolean> => {
    if (!sede.nombre?.trim()) { toast.error('El nombre de la barbería es obligatorio'); return false }
    if (empresa.idEmpresa != null && !empresa.nombreComercial?.trim()) { toast.error('El nombre del negocio es obligatorio.'); return false }
    try {
      setSubmitting(true)
      const telDigits = (sede.telefono || '').replace(/\D/g, '')
      const telValido = /^9\d{8}$/.test(telDigits) ? telDigits : undefined
      const payload: any = {
        nombre: sede.nombre.trim(),
        descripcionCorta: sede.descripcion?.trim() || undefined,
        direccion: sede.direccion?.trim() || undefined,
        telefono: telValido,
        correoContacto: sede.correo?.trim() || undefined,
        latitud: sede.latitud != null ? Number(sede.latitud) : undefined,
        longitud: sede.longitud != null ? Number(sede.longitud) : undefined,
        departamento: sede.departamento?.trim() || undefined,
        provincia: sede.provincia?.trim() || undefined,
        distrito: sede.distrito?.trim() || undefined,
        urlLogo: sede.urlLogo && !sede.urlLogo.startsWith('data:') ? sede.urlLogo : undefined,
        urlBanner: sede.urlBanner && !sede.urlBanner.startsWith('data:') ? sede.urlBanner : undefined,
        colorPrimarioHex: sede.colorPrimarioHex?.trim() || undefined,
      }
      if (sede.telefono?.trim() && !telValido) {
        toast.info('El teléfono no se guardó: debe ser 9 dígitos y empezar en 9 (ej. 987654321).')
      }
      await apiClient.put('/api/Sedes/actual', payload)

      // Guardar también los datos del negocio (empresa) en la misma acción.
      if (empresa.idEmpresa != null) {
        await apiClient.put('/api/mi-empresa', {
          razonSocial: empresa.razonSocial?.trim() || empresa.nombreComercial?.trim() || undefined,
          nombreComercial: empresa.nombreComercial?.trim() || undefined,
          ruc: empresa.ruc?.trim() || undefined,
          correoContacto: empresa.correoContacto?.trim() || undefined,
          telefonoContacto: empresa.telefonoContacto?.trim() || undefined,
        })
      }

      toast.success('Configuración guardada')
      await loadSede()
      await loadNegocio()
      return true
    } catch (err: any) {
      console.error('❌ Error guardando:', err.response?.data || err)
      toast.error(err.response?.data?.message || err.response?.data?.mensaje || 'Error al guardar la configuración')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  // Guarda y, si todo salió bien, cierra el editor.
  const guardarYcerrar = async () => { if (await guardarConfig()) cerrar() }
  const guardarHorariosYcerrar = async () => { if (await guardarHorarios()) cerrar() }

  // Resúmenes para las filas del hub.
  const diasAbiertos = horariosDias.filter((d) => d.abierto).length
  const tieneImagen = !!(logoPreview || bannerPreview)

  // Enlace público (mismo criterio que "Ver sitio"): en prod usa el subdominio
  // real; en dev, el link con ?s= que sí funciona en localhost.
  const enlacePublico = (sub?: string): string => {
    const v = (sub || '').trim()
    if (!v) return ''
    return window.location.hostname.endsWith('barber.pe')
      ? `https://${v}.barber.pe`
      : `${window.location.origin}/?s=${encodeURIComponent(v)}`
  }
  const enlaceMostrar = (sub?: string) => enlacePublico(sub).replace(/^https?:\/\//, '')
  const copiarEnlace = async () => {
    const url = enlacePublico(sede.subdominio)
    if (!url) return
    try { await navigator.clipboard.writeText(url); toast.success('Enlace copiado') }
    catch { toast.error('No se pudo copiar') }
  }
  const abrirEnlace = () => {
    const url = enlacePublico(sede.subdominio)
    if (url) window.open(url, '_blank', 'noopener')
  }

  // ================================================================= UI
  if (loading) {
    return (
      <AdminLayout title="Configuración" subtitle="Tu sede">
        <div className="flex items-center justify-center h-96 text-gray-400">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Configuración" subtitle="Tu sede">
      <div className="pb-10">
        {/* Encabezado */}


        {/* Enlace público (A): visible, de solo lectura y explicado */}
        {sede.subdominio && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-4 flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Link2 className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-sm font-medium text-gray-900">Tu enlace público</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={copiarEnlace}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100 transition">
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </button>
                  <button type="button" onClick={abrirEnlace}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition">
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir
                  </button>
                </div>
              </div>
              <p className="text-sm text-blue-600 truncate">{enlaceMostrar(sede.subdominio)}</p>
              <p className="text-xs text-gray-400 mt-1">Es fijo a propósito: no cambia aunque cambies el nombre, para no romper reservas ni enlaces que ya compartiste.</p>
            </div>
          </div>
        )}

        {/* HUB de secciones */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <SeccionFila
            icono={<Store className="w-[18px] h-[18px]" />}
            titulo="Información básica"
            preview={sede.nombre || 'Falta el nombre'}
            estado={sede.nombre ? 'listo' : 'falta'}
            onClick={() => setSheet('info')}
          />
          <SeccionFila
            icono={<ImageIcon className="w-[18px] h-[18px]" />}
            titulo="Imagen y color"
            preview={tieneImagen ? 'Logo / portada listos' : 'Sin imágenes aún'}
            estado={tieneImagen ? 'listo' : undefined}
            onClick={() => setSheet('imagen')}
            derecha={
              <span className="w-6 h-6 rounded-md border border-gray-200 shrink-0"
                style={{ background: sede.colorPrimarioHex || DEFAULT_BRAND }} />
            }
          />
          <SeccionFila
            icono={<Phone className="w-[18px] h-[18px]" />}
            titulo="Contacto"
            preview={sede.telefono || 'Agrega un teléfono'}
            estado={sede.telefono ? 'listo' : 'falta'}
            onClick={() => setSheet('contacto')}
          />
          <SeccionFila
            icono={<MapPin className="w-[18px] h-[18px]" />}
            titulo="Ubicación"
            preview={sede.direccion || 'Sin dirección'}
            estado={sede.direccion ? 'listo' : undefined}
            onClick={() => setSheet('ubicacion')}
          />
          <SeccionFila
            icono={<Clock className="w-[18px] h-[18px]" />}
            titulo="Horarios de atención"
            preview={cargandoHorarios ? 'Cargando...' : diasAbiertos ? `${diasAbiertos} día(s) abierto(s)` : 'Sin horarios'}
            estado={diasAbiertos ? 'listo' : 'falta'}
            onClick={() => setSheet('horarios')}
          />
          <SeccionFila
            icono={<Building2 className="w-[18px] h-[18px]" />}
            titulo="Datos del negocio"
            preview={empresa.nombreComercial || 'Completa los datos'}
            estado={empresa.nombreComercial ? 'listo' : 'falta'}
            onClick={() => setSheet('negocio')}
          />
          <SeccionFila
            icono={<Camera className="w-[18px] h-[18px]" />}
            titulo="Galería"
            preview={imagenes.length ? `${imagenes.length} foto(s)` : 'Sin fotos aún'}
            estado={imagenes.length ? 'listo' : undefined}
            onClick={() => setSheet('galeria')}
            derecha={
              imagenes.length ? (
                <span className="flex -space-x-2 shrink-0">
                  {imagenes.slice(0, 3).map((i) => (
                    <img key={i.idImagen} src={i.urlImagen} alt="" className="w-7 h-7 rounded-md object-cover border border-white shadow-sm" />
                  ))}
                </span>
              ) : undefined
            }
          />
          <SeccionFila
            icono={<Share2 className="w-[18px] h-[18px]" />}
            titulo="Redes sociales"
            preview={redes.length ? `${redes.length} red(es)` : 'Sin redes'}
            estado={redes.length ? 'listo' : undefined}
            onClick={() => setSheet('redes')}
          />
        </div>

      </div>

      {/* ===================================================== EDITORES (sheets) */}

      {/* Información básica */}
      <SeccionSheet open={sheet === 'info'} onClose={cerrar} titulo="Información básica"
        subtitulo="El nombre y la descripción de tu barbería"
        footer={<BotonGuardar onClick={guardarYcerrar} cargando={submitting} />}>
        <div className="space-y-4">
          <Field label="Nombre de la barbería *">
            <input className={inputCls} value={sede.nombre || ''} onChange={(e) => handleChange('nombre', e.target.value)} placeholder="Ej: Barbería Central" />
          </Field>
          {sede.subdominio && (
            <p className="text-xs text-gray-400 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Cambiar el nombre no cambia tu enlace público (<span className="font-medium text-gray-500">{enlaceMostrar(sede.subdominio)}</span>).</span>
            </p>
          )}
          <Field label="Descripción">
            <textarea className={inputCls + ' resize-none'} rows={4} value={sede.descripcion || ''} onChange={(e) => handleChange('descripcion', e.target.value)} placeholder="Cuéntale a tus clientes qué hace especial a tu barbería..." />
          </Field>
        </div>
      </SeccionSheet>

      {/* Imagen y color */}
      <SeccionSheet open={sheet === 'imagen'} onClose={cerrar} titulo="Imagen y color"
        subtitulo="Tu marca en la página pública"
        footer={<BotonGuardar onClick={guardarYcerrar} cargando={submitting} />}>
        <div className="space-y-5">
          <ImgUpload label="Logo" preview={logoPreview} onUpload={handleLogoUpload} onRemove={removeLogo}
            subiendo={subiendoLogo} hint="Cuadrado · PNG/JPG/HEIC" heightCls="h-40" />
          <ImgUpload label="Banner / portada" preview={bannerPreview} onUpload={handleBannerUpload} onRemove={removeBanner}
            subiendo={subiendoBanner} hint="Horizontal · PNG/JPG/HEIC" heightCls="h-44" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Color de tema</label>
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer shrink-0" title="Elegir color">
                <span className="block w-12 h-12 rounded-xl border border-gray-200 shadow-sm"
                  style={{ background: sede.colorPrimarioHex || DEFAULT_BRAND }} />
                <input type="color"
                  value={(sede.colorPrimarioHex || DEFAULT_BRAND).slice(0, 7)}
                  onChange={(e) => handleChange('colorPrimarioHex', e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </label>
              <input className={inputCls + ' w-36 font-mono uppercase'}
                value={sede.colorPrimarioHex || ''}
                onChange={(e) => handleChange('colorPrimarioHex', e.target.value)}
                placeholder={DEFAULT_BRAND} maxLength={9} />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {COLOR_PRESETS.map((c) => {
                const active = (sede.colorPrimarioHex || '').toLowerCase() === c.toLowerCase()
                return (
                  <button key={c} type="button" onClick={() => handleChange('colorPrimarioHex', c)} aria-label={c}
                    className={`w-8 h-8 rounded-lg transition ${active ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'shadow hover:scale-110'}`}
                    style={{ background: c }} />
                )
              })}
            </div>
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500">Vista previa</span>
              <span className="inline-flex items-center px-4 py-2 rounded-xl text-white text-sm font-semibold shadow"
                style={{ background: sede.colorPrimarioHex || DEFAULT_BRAND }}>
                Reservar ahora
              </span>
            </div>
          </div>
        </div>
      </SeccionSheet>

      {/* Contacto */}
      <SeccionSheet open={sheet === 'contacto'} onClose={cerrar} titulo="Contacto"
        subtitulo="Cómo te encuentran tus clientes"
        footer={<BotonGuardar onClick={guardarYcerrar} cargando={submitting} />}>
        <div className="space-y-4">
          <button type="button"
            onClick={() => { handleChange('telefono', empresa.telefonoContacto || sede.telefono || ''); handleChange('correo', empresa.correoContacto || sede.correo || '') }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700">
            Usar datos del negocio
          </button>
          <Field label="Teléfono *">
            <input type="tel" className={inputCls} value={sede.telefono || ''} onChange={(e) => handleChange('telefono', e.target.value)} placeholder="987654321" />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={sede.correo || ''} onChange={(e) => handleChange('correo', e.target.value)} placeholder="info@barberia.pe" />
          </Field>
        </div>
      </SeccionSheet>

      {/* Ubicación */}
      <SeccionSheet open={sheet === 'ubicacion'} onClose={cerrar} titulo="Ubicación"
        subtitulo="Para que te ubiquen en el mapa"
        footer={<BotonGuardar onClick={guardarYcerrar} cargando={submitting} />}>
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-2">
            <p className="text-sm font-semibold text-gray-800">Pega tu ubicación de Google Maps</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              En Google Maps mantén pulsado el punto de tu local y copia las <b>coordenadas</b>, o usa <b>Compartir</b> y pega el enlace. Llenamos latitud y longitud por ti.
            </p>
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={ubicTexto}
                onChange={(e) => setUbicTexto(e.target.value)}
                onPaste={(e) => { e.preventDefault(); const txt = (e.clipboardData.getData('text') || '').trim(); setUbicTexto(txt); aplicarUbicacion(txt) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarUbicacion(ubicTexto) } }}
                placeholder="-11.83, -77.10  ó  https://maps.app.goo.gl/..."
              />
              <button
                type="button"
                onClick={() => aplicarUbicacion(ubicTexto)}
                disabled={resolviendoUbic}
                className="shrink-0 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {resolviendoUbic ? '…' : 'Usar'}
              </button>
            </div>
            <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
              Abrir Google Maps <ExternalLink width={12} height={12} />
            </a>
          </div>

          <Field label="Dirección">
            <input className={inputCls} value={sede.direccion || ''} onChange={(e) => handleChange('direccion', e.target.value)} placeholder="Av. Principal 123, Lima" />
          </Field>
          <Field label="Distrito">
            <input className={inputCls} value={sede.distrito || ''} onChange={(e) => handleChange('distrito', e.target.value)} placeholder="Miraflores" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitud">
              <input type="number" step="0.0001" className={inputCls} value={sede.latitud ?? ''} onChange={(e) => handleChange('latitud', parseFloat(e.target.value) || 0)} placeholder="-12.0450" />
            </Field>
            <Field label="Longitud">
              <input type="number" step="0.0001" className={inputCls} value={sede.longitud ?? ''} onChange={(e) => handleChange('longitud', parseFloat(e.target.value) || 0)} placeholder="-77.0342" />
            </Field>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Se llenan solos al pegar arriba. Puedes ajustarlos a mano si quieres.</p>

          {esCoordValida(Number(sede.latitud), Number(sede.longitud)) && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600">¿Es aquí? Verifica el pin:</p>
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <iframe
                  title="Ubicación en el mapa"
                  src={osmEmbedSrc(Number(sede.latitud), Number(sede.longitud))}
                  className="w-full block"
                  style={{ height: 190, border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a
                href={`https://www.google.com/maps?q=${Number(sede.latitud)},${Number(sede.longitud)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Ver en Google Maps <ExternalLink width={12} height={12} />
              </a>
            </div>
          )}
        </div>
      </SeccionSheet>

      {/* Horarios */}
      <SeccionSheet open={sheet === 'horarios'} onClose={cerrar} titulo="Horarios de atención"
        subtitulo="Los días y horas en que recibes clientes"
        footer={<BotonGuardar onClick={guardarHorariosYcerrar} cargando={guardandoHorarios} label="Guardar horarios" />}>
        {cargandoHorarios ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-4"><Loader2 className="w-4 h-4 animate-spin" /> Cargando horarios...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {horariosDias.map((d) => (
              <div key={d.dia} className="flex items-center justify-between gap-3 py-2.5 flex-wrap">
                <button type="button" onClick={() => toggleDia(d.dia)}
                  className={`flex items-center gap-2.5 text-sm font-medium transition ${d.abierto ? 'text-gray-900' : 'text-gray-400'}`}>
                  <span className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${d.abierto ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${d.abierto ? 'left-[1.125rem]' : 'left-0.5'}`} />
                  </span>
                  <span className="w-20 text-left">{d.label}</span>
                </button>
                {d.abierto ? (
                  <div className="flex items-center gap-2">
                    <input type="time" value={d.inicio} onChange={(e) => setHora(d.dia, 'inicio', e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-gray-300">—</span>
                    <input type="time" value={d.fin} onChange={(e) => setHora(d.dia, 'fin', e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ) : (
                  <span className="text-sm text-gray-300">Cerrado</span>
                )}
              </div>
            ))}
          </div>
        )}
      </SeccionSheet>

      {/* Datos del negocio */}
      <SeccionSheet open={sheet === 'negocio'} onClose={cerrar} titulo="Datos del negocio"
        subtitulo="RUC, razón social y contacto de tu empresa"
        footer={<BotonGuardar onClick={guardarYcerrar} cargando={submitting} />}>
        <div className="space-y-4">
          <Field label="Nombre comercial *">
            <input className={inputCls} value={empresa.nombreComercial} onChange={(e) => handleChangeEmpresa('nombreComercial', e.target.value)} placeholder="Ej: Barbería Central" />
          </Field>
          <Field label="Razón social">
            <input className={inputCls} value={empresa.razonSocial} onChange={(e) => handleChangeEmpresa('razonSocial', e.target.value)} placeholder="Igual al nombre si no tienes" />
          </Field>
          <Field label="RUC">
            <input className={inputCls} value={empresa.ruc} onChange={(e) => handleChangeEmpresa('ruc', e.target.value)} placeholder="20•••••••••" maxLength={11} />
          </Field>
          <Field label="Correo del negocio">
            <input type="email" className={inputCls} value={empresa.correoContacto} onChange={(e) => handleChangeEmpresa('correoContacto', e.target.value)} placeholder="hola@negocio.com" />
          </Field>
          <Field label="Teléfono del negocio">
            <input type="tel" className={inputCls} value={empresa.telefonoContacto} onChange={(e) => handleChangeEmpresa('telefonoContacto', e.target.value)} placeholder="987654321" />
          </Field>
          <p className="text-xs text-gray-400">El correo y teléfono se pre-cargan con los de tu cuenta. Solo cámbialos si tu negocio usa otros.</p>
        </div>
      </SeccionSheet>

      {/* Galería */}
      <SeccionSheet open={sheet === 'galeria'} onClose={cerrar} titulo="Galería"
        subtitulo="Fotos de tu local y trabajos"
        footer={<BotonListo onClick={cerrar} />}>
        <div className="grid grid-cols-3 gap-3">
          {imagenes.map((i) => (
            <div key={i.idImagen} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
              <img src={i.urlImagen} alt={i.descripcion || 'Imagen'} className="w-full h-full object-cover" />
              <button type="button" onClick={() => eliminarImagen(i.idImagen)}
                className="absolute top-1.5 right-1.5 p-1 bg-white/90 text-red-500 rounded-full shadow hover:bg-white transition"
                aria-label="Eliminar imagen">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <label className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition ${
            subiendoGaleria ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'}`}>
            {subiendoGaleria ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : <Plus className="w-6 h-6 text-gray-300" />}
            <span className="text-[11px] text-gray-400 mt-1 px-1">Agregar</span>
            <input type="file" accept="image/*" onChange={subirImagenGaleria} disabled={subiendoGaleria} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-3">Se agregan al instante. PNG/JPG/HEIC.</p>
      </SeccionSheet>

      {/* Redes sociales */}
      <SeccionSheet open={sheet === 'redes'} onClose={cerrar} titulo="Redes sociales"
        subtitulo="Conecta tus perfiles para tu sitio"
        footer={<BotonListo onClick={cerrar} />}>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select value={nuevaRedTipo} onChange={(e) => setNuevaRedTipo(e.target.value)}
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-40">
            {RED_OPCIONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="url" value={nuevaRedUrl} onChange={(e) => setNuevaRedUrl(e.target.value)}
            placeholder="https://instagram.com/tubarberia"
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
          <button type="button" onClick={agregarRed}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
        {redes.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no hay redes configuradas.</p>
        ) : (
          <div className="space-y-2">
            {redes.map((r) => {
              const RIcon = redIcon(r.tipo)
              return (
                <div key={r.idRedSocial} className="flex items-center gap-3 border border-gray-100 bg-gray-50/60 rounded-xl px-3 py-2.5 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-blue-600 shrink-0">
                    <RIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold capitalize text-gray-800 leading-tight">{r.tipo}</p>
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs truncate block">{r.url}</a>
                  </div>
                  <button type="button" onClick={() => eliminarRed(r.idRedSocial)} className="text-gray-300 hover:text-red-500 shrink-0" aria-label="Eliminar">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </SeccionSheet>
    </AdminLayout>
  )
}

/* ---------------------------------------------------------------- helpers UI */
function BotonGuardar({ onClick, cargando, label = 'Guardar cambios' }:
  { onClick: () => void; cargando: boolean; label?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={cargando}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
      {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {cargando ? 'Guardando...' : label}
    </button>
  )
}

function BotonListo({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition">
      Listo
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ImgUpload({ label, preview, onUpload, onRemove, subiendo, hint, heightCls = 'h-40' }:
  { label: string; preview: string | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: () => void; subiendo: boolean; hint: string; heightCls?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {preview ? (
        <div className="relative">
          <img src={preview} alt={label} className={`w-full ${heightCls} object-cover rounded-xl border border-gray-100`} />
          <button type="button" onClick={onRemove}
            className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-full shadow hover:bg-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center text-center cursor-pointer rounded-xl border-2 border-dashed transition ${heightCls} ${
          subiendo ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'}`}>
          {subiendo ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : <Upload className="w-7 h-7 text-gray-300" />}
          <span className="text-sm font-medium text-gray-500 mt-2">Subir {label.toLowerCase()}</span>
          <span className="text-[11px] text-gray-400 mt-0.5">{hint}</span>
          <input type="file" accept="image/*" onChange={onUpload} disabled={subiendo} className="hidden" />
        </label>
      )}
    </div>
  )
}
