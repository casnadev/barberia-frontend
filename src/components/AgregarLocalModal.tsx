import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Loader2, Store } from 'lucide-react'
import SeccionSheet from './SeccionSheet'
import { ComboBox } from './ComboBox'
import { DEPARTAMENTOS, distritosDe, distritoValido } from '@/data/ubigeo'
import { geoService } from '@/services/geoService'
import { perfilService } from '@/services/perfilService'
import { sedeTenantService, MiSede } from '@/services/sedeTenantService'
import { esCoordValida, parseCoordsLocal, pareceLink, osmEmbedSrc } from '@/utils/ubicacion'

const inputCls =
  'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition'

/** Slugify de preview (equivalente al del backend): minúsculas, sin acentos, guiones. */
function slugify(t: string): string {
  return (t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

type Props = {
  open: boolean
  onClose: () => void
  /** Sedes existentes de la empresa, para el selector "Copiar de …". */
  sedes: MiSede[]
  /** Se llama tras crear con éxito (recibe el subdominio nuevo). */
  onCreated: (nuevoSubdominio: string) => void
}

export default function AgregarLocalModal({ open, onClose, sedes, onCreated }: Props) {
  const [marca, setMarca] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [distrito, setDistrito] = useState('')
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [ubicTexto, setUbicTexto] = useState('')
  const [lat, setLat] = useState<number | undefined>(undefined)
  const [lng, setLng] = useState<number | undefined>(undefined)
  const [resolviendo, setResolviendo] = useState(false)

  const [idOrigen, setIdOrigen] = useState<number | ''>(sedes[0]?.idSede ?? '')
  const [copiarCatalogo, setCopiarCatalogo] = useState(true)
  const [copiarHorarios, setCopiarHorarios] = useState(false)

  const [enviando, setEnviando] = useState(false)
  const nombreEditadoRef = useRef(false)

  // Al abrir: cargar marca (para el preview) y limpiar el formulario.
  useEffect(() => {
    if (!open) return
    nombreEditadoRef.current = false
    setDepartamento(''); setDistrito(''); setNombre(''); setDireccion('')
    setUbicTexto(''); setLat(undefined); setLng(undefined)
    setIdOrigen(sedes[0]?.idSede ?? '')
    setCopiarCatalogo(true); setCopiarHorarios(false)
    ;(async () => {
      try {
        const emp = await perfilService.getMiEmpresa()
        setMarca(emp?.nombreComercial || '')
      } catch {
        setMarca('')
      }
    })()
  }, [open, sedes])

  // Nombre autosugerido = distrito (mientras el usuario no lo edite a mano).
  const elegirDistrito = (d: string) => {
    setDistrito(d)
    if (!nombreEditadoRef.current) setNombre(d)
  }
  const elegirDepartamento = (dep: string) => {
    setDepartamento(dep)
    if (!distritoValido(dep, distrito)) {
      setDistrito('')
      if (!nombreEditadoRef.current) setNombre('')
    }
  }

  const zonaSlug = useMemo(() => slugify(nombre || distrito), [nombre, distrito])
  const marcaSlug = useMemo(() => slugify(marca) || 'tu-marca', [marca])
  const subdominioPreview = zonaSlug ? `${marcaSlug}-${zonaSlug}` : `${marcaSlug}-…`

  const aplicarUbicacion = async (raw: string) => {
    let t = (raw || '').trim()
    if (!t) return
    const link = t.match(/https?:\/\/[^\s]+/)
    if (link) t = link[0]
    const local = parseCoordsLocal(t)
    if (local) {
      setLat(local.lat); setLng(local.lng)
      toast.success('Ubicación detectada ✓')
      return
    }
    if (pareceLink(t)) {
      setResolviendo(true)
      const r = await geoService.resolver(t)
      setResolviendo(false)
      if (r.ok && r.lat != null && r.lng != null) {
        setLat(r.lat); setLng(r.lng)
        toast.success('Ubicación detectada ✓')
      } else {
        toast.error(r.mensaje || 'No pude leer la ubicación. Pega coordenadas, ej: -11.83, -77.10')
      }
      return
    }
    toast.error('Pega coordenadas (ej: -11.83, -77.10) o un enlace de Google Maps')
  }

  const crear = async () => {
    if (!nombre.trim()) { toast.error('Ponle un nombre a la Sede (la zona).'); return }
    setEnviando(true)
    try {
      const nueva = await sedeTenantService.crearLocal({
        nombre: nombre.trim(),
        departamento: departamento || undefined,
        distrito: distrito || undefined,
        direccion: direccion.trim() || undefined,
        latitud: lat,
        longitud: lng,
        idSedeOrigen: idOrigen === '' ? null : Number(idOrigen),
        copiarServicios: copiarCatalogo,
        copiarCategorias: copiarCatalogo,
        copiarHorarios,
      })
      toast.success('Sede creada ✓')
      onCreated(nueva.subdominio)
      onClose()
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.response?.data?.mensaje || e?.response?.data?.message
      toast.error(msg || 'No se pudo crear la Sede.')
    } finally {
      setEnviando(false)
    }
  }

  const opcionesOrigen = sedes.map((s) => ({ valor: s.idSede, etiqueta: s.nombre }))

  return (
    <SeccionSheet
      open={open}
      onClose={onClose}
      titulo="Agregar nueva Sede"
      subtitulo="Una nueva Sede de tu negocio, en otra zona"
      footer={
        <button
          onClick={crear}
          disabled={enviando}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
          Crear Sede
        </button>
      }
    >
      <div className="space-y-4">
        {/* Zona */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Departamento</label>
            <ComboBox
              value={departamento}
              onChange={(v) => elegirDepartamento(String(v))}
              opciones={DEPARTAMENTOS}
              inputClassName={inputCls}
              placeholder="Departamento"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Distrito</label>
            <ComboBox
              value={distrito}
              onChange={(v) => elegirDistrito(String(v))}
              opciones={distritosDe(departamento)}
              disabled={!departamento}
              textoDeshabilitado="Elige departamento"
              inputClassName={inputCls}
              placeholder="Distrito"
            />
          </div>
        </div>

        {/* Nombre de la Sede (autosugerido desde el distrito) */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="block text-xs font-medium text-gray-600">Nombre de la Sede</label>
            {!nombreEditadoRef.current && distrito && (
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                autosugerido
              </span>
            )}
          </div>
          <input
            className={inputCls}
            value={nombre}
            placeholder="Ej: Miraflores"
            onChange={(e) => { nombreEditadoRef.current = true; setNombre(e.target.value) }}
          />
          <p className="mt-1 text-[11px] text-gray-400">Suele ser la zona. La marca se añade sola.</p>
        </div>

        {/* Preview del subdominio */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <p className="text-[11px] font-medium text-gray-500 mb-0.5">Dirección web de la Sede</p>
          <p className="text-sm font-mono text-gray-800 break-all">{subdominioPreview}.barber.pe</p>
        </div>

        {/* Ubicación */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-2">
          <p className="text-sm font-semibold text-gray-800">Ubica la Sede en el mapa</p>
          <p className="text-xs text-gray-500 leading-relaxed">Pega el enlace de Google Maps y lo ponemos por ti.</p>
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={ubicTexto}
              placeholder="Pega el enlace o coordenadas"
              onChange={(e) => setUbicTexto(e.target.value)}
              onPaste={(e) => { e.preventDefault(); const txt = (e.clipboardData.getData('text') || '').trim(); setUbicTexto(txt); aplicarUbicacion(txt) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarUbicacion(ubicTexto) } }}
            />
            <button
              type="button"
              onClick={() => aplicarUbicacion(ubicTexto)}
              disabled={resolviendo}
              className="shrink-0 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              {resolviendo ? '…' : 'Usar'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 leading-snug">¿Ya tienes las coordenadas? Pégalas igual, ej. -11.83, -77.10</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
          <input className={inputCls} value={direccion} placeholder="Calle, número, referencia" onChange={(e) => setDireccion(e.target.value)} />
        </div>

        {lat != null && lng != null && esCoordValida(Number(lat), Number(lng)) && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-600">¿Es aquí? Verifica el pin:</p>
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <iframe
                title="Ubicación en el mapa"
                src={osmEmbedSrc(Number(lat), Number(lng))}
                className="w-full block"
                style={{ height: 150, border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href={`https://www.google.com/maps?q=${Number(lat)},${Number(lng)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Ver en Google Maps <ExternalLink width={12} height={12} />
            </a>
          </div>
        )}

        {/* Copiar de otra sede */}
        {sedes.length > 0 && (
          <div className="rounded-xl border border-gray-200 p-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Copiar de</label>
              <ComboBox
                value={idOrigen}
                onChange={(v) => setIdOrigen(v === '' ? '' : Number(v))}
                opciones={opcionesOrigen}
                inputClassName={inputCls}
                placeholder="Elige una Sede"
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={copiarCatalogo} onChange={(e) => setCopiarCatalogo(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-700">Servicios y categorías</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={copiarHorarios} onChange={(e) => setCopiarHorarios(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-700">Horarios de atención</span>
            </label>
            <p className="text-[11px] text-gray-400 leading-snug">Los barberos no se copian: son personas de cada Sede.</p>
          </div>
        )}
      </div>
    </SeccionSheet>
  )
}
