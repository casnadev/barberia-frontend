import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Store, Phone, Clock, MapPin, Image as ImageIcon, Camera, Share2, Save, Loader2,
  X, Upload, RefreshCw, Plus, Instagram, Facebook, Globe, Music2, Youtube, Twitter, Palette,
} from 'lucide-react'
import { apiClient } from '@/services/apiClient'
import { AdminLayout } from '@/components/AdminLayout'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.100.25:55692'

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

// Colores sugeridos (vivos) para el tema de la sede.
const COLOR_PRESETS = ['#2855F6', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0d9488', '#dc2626', '#111827']
const DEFAULT_BRAND = '#2855F6'

export function ConfiguracionPage() {
  const navigate = useNavigate()
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

  const [sede, setSede] = useState<Sede>({
    idSede: 1, nombre: '', descripcion: '', direccion: '', telefono: '', correo: '',
    subdominio: '', slug: '', urlLogo: '', latitud: undefined, longitud: undefined,
    departamento: '', provincia: '', distrito: '',
  })

  useEffect(() => { loadSede() }, [])

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

  const guardarHorarios = async () => {
    if (!idSedeActual) { toast.error('No se pudo resolver la sede activa'); return }
    for (const d of horariosDias) {
      if (d.abierto && (!d.inicio || !d.fin || d.inicio >= d.fin)) {
        toast.error(`${d.label}: la hora de inicio debe ser menor que la de fin`)
        return
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
    } catch (err: any) {
      console.error('❌ Error guardando horarios:', err.response?.data || err)
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Error guardando horarios')
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

  const handleChange = (field: keyof Sede, value: string | number) =>
    setSede((prev) => ({ ...prev, [field]: value }))

  const subirImagen = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) { toast.error('Por favor selecciona una imagen'); return null }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen debe ser menor a 5MB'); return null }
    const form = new FormData()
    form.append('Archivo', file)
    const res = await fetch(`${API_BASE}/api/Upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: form,
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(json?.mensaje || json?.message || 'Error subiendo la imagen')
    return json?.data?.url ?? json?.url ?? null
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    try { setSubiendoLogo(true); const url = await subirImagen(file); if (url) { setLogoPreview(url); handleChange('urlLogo', url); toast.success('Logo subido') } }
    catch (err: any) { toast.error(err.message || 'Error subiendo el logo') }
    finally { setSubiendoLogo(false) }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    try { setSubiendoBanner(true); const url = await subirImagen(file); if (url) { setBannerPreview(url); handleChange('urlBanner', url); toast.success('Banner subido') } }
    catch (err: any) { toast.error(err.message || 'Error subiendo el banner') }
    finally { setSubiendoBanner(false) }
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
    } catch (err: any) { toast.error(err.message || 'Error subiendo la imagen') }
    finally { setSubiendoGaleria(false); e.target.value = '' }
  }

  const eliminarImagen = async (id: number) => {
    try { await apiClient.delete(`/api/SedeMedia/imagenes/${id}`); cargarMedia() }
    catch { toast.error('Error eliminando la imagen') }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sede.nombre?.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!sede.telefono?.trim()) { toast.error('El teléfono es obligatorio'); return }
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
      toast.success('Configuración guardada')
      await loadSede()
    } catch (err: any) {
      console.error('❌ Error guardando:', err.response?.data || err)
      toast.error(err.response?.data?.message || err.response?.data?.mensaje || 'Error al guardar la configuración')
    } finally {
      setSubmitting(false)
    }
  }

  const recargar = () => { setLoading(true); loadSede() }

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
      <form onSubmit={handleSubmit} className="pb-10">
        {/* Encabezado del body */}
        <div className="flex items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración de sede</h1>
            <p className="text-sm text-gray-400 mt-0.5">Personaliza cómo se ve tu barbería en tu página pública.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={recargar} title="Recargar"
              className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
              <RefreshCw className="w-5 h-5" />
            </button>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-600/20">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">{submitting ? 'Guardando...' : 'Guardar cambios'}</span>
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* ===== Columna izquierda ===== */}
          <div className="space-y-4">
          {/* Información básica */}
          <Card icon={Store} title="Información básica" desc="El nombre y la descripción de tu barbería.">
            <div className="space-y-4">
              <Field label="Nombre de la barbería *">
                <input className={inputCls} value={sede.nombre || ''} onChange={(e) => handleChange('nombre', e.target.value)} placeholder="Ej: Barbería Central" required />
              </Field>
              <Field label="Descripción">
                <textarea className={inputCls + ' resize-none'} rows={3} value={sede.descripcion || ''} onChange={(e) => handleChange('descripcion', e.target.value)} placeholder="Cuéntale a tus clientes qué hace especial a tu barbería..." />
              </Field>
            </div>
          </Card>

          {/* Contacto */}
          <Card icon={Phone} title="Contacto" desc="Cómo te encuentran tus clientes.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Teléfono *">
                <input type="tel" className={inputCls} value={sede.telefono || ''} onChange={(e) => handleChange('telefono', e.target.value)} placeholder="987654321" required />
              </Field>
              <Field label="Email">
                <input type="email" className={inputCls} value={sede.correo || ''} onChange={(e) => handleChange('correo', e.target.value)} placeholder="info@barberia.pe" />
              </Field>
              <Field label="Subdominio">
                <input className={inputCls + ' bg-gray-100 text-gray-500 cursor-not-allowed'} value={sede.subdominio || ''} disabled />
              </Field>
            </div>
          </Card>

          {/* Horarios */}
          <Card icon={Clock} title="Horarios de atención" desc="Los días y horas en que recibes clientes."
            actions={
              <button type="button" onClick={guardarHorarios} disabled={guardandoHorarios || !idSedeActual}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
                {guardandoHorarios ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            }>
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
          </Card>
          </div>

          {/* ===== Columna derecha ===== */}
          <div className="space-y-4">
          {/* Ubicación */}
          <Card icon={MapPin} title="Ubicación" desc="Para que te ubiquen en el mapa.">
            <div className="space-y-4">
              <Field label="Dirección">
                <input className={inputCls} value={sede.direccion || ''} onChange={(e) => handleChange('direccion', e.target.value)} placeholder="Av. Principal 123, Lima" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Distrito">
                  <input className={inputCls} value={sede.distrito || ''} onChange={(e) => handleChange('distrito', e.target.value)} placeholder="Miraflores" />
                </Field>
                <Field label="Latitud">
                  <input type="number" step="0.0001" className={inputCls} value={sede.latitud ?? ''} onChange={(e) => handleChange('latitud', parseFloat(e.target.value) || 0)} placeholder="-12.0450" />
                </Field>
                <Field label="Longitud">
                  <input type="number" step="0.0001" className={inputCls} value={sede.longitud ?? ''} onChange={(e) => handleChange('longitud', parseFloat(e.target.value) || 0)} placeholder="-77.0342" />
                </Field>
              </div>
            </div>
          </Card>

          {/* Logo y portada */}
          <Card icon={ImageIcon} title="Logo y portada" desc="Tu marca en la página pública.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div className="sm:col-span-1">
                <ImgUpload label="Logo" preview={logoPreview} onUpload={handleLogoUpload} onRemove={removeLogo}
                  subiendo={subiendoLogo} hint="Cuadrado · PNG/JPG (máx 5MB)" heightCls="h-40" />
              </div>
              <div className="sm:col-span-2">
                <ImgUpload label="Banner / portada" preview={bannerPreview} onUpload={handleBannerUpload} onRemove={removeBanner}
                  subiendo={subiendoBanner} hint="Horizontal · PNG/JPG (máx 5MB)" heightCls="h-48" />
              </div>
            </div>
          </Card>

          {/* Color de tema */}
          <Card icon={Palette} title="Color de tema" desc="El color principal de tu página pública: botones, enlaces y acentos.">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Selector + código */}
              <div className="flex items-center gap-3">
                <label className="relative cursor-pointer shrink-0" title="Elegir color">
                  <span className="block w-14 h-14 rounded-xl border border-gray-200 shadow-sm"
                    style={{ background: sede.colorPrimarioHex || DEFAULT_BRAND }} />
                  <input type="color"
                    value={(sede.colorPrimarioHex || DEFAULT_BRAND).slice(0, 7)}
                    onChange={(e) => handleChange('colorPrimarioHex', e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </label>
                <Field label="Código de color">
                  <input className={inputCls + ' w-36 font-mono uppercase'}
                    value={sede.colorPrimarioHex || ''}
                    onChange={(e) => handleChange('colorPrimarioHex', e.target.value)}
                    placeholder={DEFAULT_BRAND} maxLength={9} />
                </Field>
              </div>

              {/* Sugerencias */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sugerencias</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => {
                    const active = (sede.colorPrimarioHex || '').toLowerCase() === c.toLowerCase()
                    return (
                      <button key={c} type="button" onClick={() => handleChange('colorPrimarioHex', c)} aria-label={c}
                        className={`w-8 h-8 rounded-lg transition ${active ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'shadow hover:scale-110'}`}
                        style={{ background: c }} />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Vista previa */}
            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/60 p-4 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-500">Vista previa</span>
              <span className="inline-flex items-center px-4 py-2 rounded-xl text-white text-sm font-semibold shadow"
                style={{ background: sede.colorPrimarioHex || DEFAULT_BRAND }}>
                Reservar ahora
              </span>
            </div>
          </Card>
          <Card icon={Share2} title="Redes sociales" desc="Conecta tus perfiles para que aparezcan en tu sitio.">
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
          </Card>

          {/* Galería */}
          <Card icon={Camera} title="Galería" desc="Fotos de tu local y trabajos para tu landing.">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {imagenes.map((i) => (
                <div key={i.idImagen} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                  <img src={i.urlImagen} alt={i.descripcion || 'Imagen'} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => eliminarImagen(i.idImagen)}
                    className="absolute top-1.5 right-1.5 p-1 bg-white/90 text-red-500 rounded-full shadow hover:bg-white transition opacity-0 group-hover:opacity-100"
                    aria-label="Eliminar imagen">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {/* Tile para subir */}
              <label className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition ${
                subiendoGaleria ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'}`}>
                {subiendoGaleria ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : <Plus className="w-6 h-6 text-gray-300" />}
                <span className="text-[11px] text-gray-400 mt-1 px-1">Agregar</span>
                <input type="file" accept="image/*" onChange={subirImagenGaleria} disabled={subiendoGaleria} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-3">PNG/JPG (máx 5MB). Se muestran en la galería de tu landing.</p>
          </Card>
          </div>
        </div>

        {/* Botones al final */}
        <div className="flex items-center justify-between gap-3 mt-6">
          <button type="button" onClick={() => navigate('/dashboard')}
            className="px-4 py-2.5 text-gray-500 font-medium hover:text-gray-800 transition">
            Volver
          </button>
          <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-600/20">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </motion.button>
        </div>
      </form>
    </AdminLayout>
  )
}

/* ---------------------------------------------------------------- helpers UI */
function Card({ icon: Icon, title, desc, actions, children }:
  { icon: any; title: string; desc?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 leading-tight">{title}</h2>
            {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
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
