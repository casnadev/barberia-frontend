import { useEffect, useMemo, useState } from 'react'
import {
  Search, Copy, Check, Loader2, X, ChevronLeft, ChevronRight,
  Shield, Briefcase, Users, RefreshCw, Mail, Phone, Trash2, AlertTriangle,
  Plus, Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  directorioService,
  type DirectorioContacto,
  type DirectorioSede,
  type AltaRapidaResponse,
} from '@/services/directorioService'

type Tab = 'admins' | 'trabajadores' | 'clientes'

const TIPO_STYLE: Record<string, { badge: string; icon: any }> = {
  Admin: { badge: 'bg-purple-50 text-purple-700 border-purple-200', icon: Shield },
  SuperAdmin: { badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: Shield },
  Trabajador: { badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: Briefcase },
  Cliente: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Users },
}

/** Texto copiable (correo/teléfono) con feedback. */
function Copiable({ valor }: { valor?: string }) {
  const [copiado, setCopiado] = useState(false)
  if (!valor) return <span className="text-gray-300">—</span>
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1200)
    } catch {
      toast.error('No se pudo copiar.')
    }
  }
  return (
    <button onClick={copiar} title="Copiar"
      className="group inline-flex items-center gap-1 text-gray-700 hover:text-blue-700 transition max-w-full">
      <span className="truncate">{valor}</span>
      {copiado
        ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 shrink-0" />}
    </button>
  )
}

/** Una fila de contacto. */
function FilaContacto({ c, mostrarTipo, onEliminar }: {
  c: DirectorioContacto
  mostrarTipo?: boolean
  onEliminar?: (c: DirectorioContacto) => void
}) {
  // Etiqueta REAL: si es una cuenta de login huérfana, su rol puede diferir del tipo.
  const etiqueta = c.rol && c.rol !== c.tipo ? c.rol : c.tipo
  const estilo = TIPO_STYLE[etiqueta] ?? TIPO_STYLE[c.tipo] ?? TIPO_STYLE.Cliente
  const Icono = estilo.icon
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900 truncate">{c.nombreCompleto || 'Sin nombre'}</p>
          {mostrarTipo && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${estilo.badge}`}>
              <Icono className="w-3 h-3" /> {etiqueta}
            </span>
          )}
          {c.activo === false && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">apagado</span>
          )}
        </div>
        {c.ubicacion && <p className="text-xs text-gray-400 truncate mt-0.5">{c.ubicacion}</p>}

        {/* MÓVIL: correo y teléfono apilados debajo del nombre (en ≥sm van en columnas). */}
        <div className="sm:hidden mt-1.5 space-y-1">
          <div className="flex items-center gap-1.5 text-sm">
            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /><Copiable valor={c.correo} />
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /><Copiable valor={c.telefono} />
          </div>
        </div>
      </div>

      {/* DESKTOP: columnas fijas (ocultas en móvil porque ya van arriba apiladas). */}
      <div className="hidden sm:block w-52 text-sm"><Copiable valor={c.correo} /></div>
      <div className="hidden sm:block w-32 text-sm"><Copiable valor={c.telefono} /></div>

      {onEliminar && (
        <button
          onClick={() => onEliminar(c)}
          title="Dar de baja"
          aria-label="Dar de baja"
          className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

type CampoBaja = 'correo' | 'telefono' | 'todo'

/** Modal de confirmación MUY específico: el SuperAdmin ELIGE qué dar de baja. */
function ModalConfirmarBaja({
  contacto, eliminando, onCancelar, onConfirmar,
}: {
  contacto: DirectorioContacto
  eliminando: boolean
  onCancelar: () => void
  onConfirmar: (campo: CampoBaja) => void
}) {
  const tieneCorreo = !!contacto.correo
  const tieneTelefono = !!contacto.telefono
  const soloUnDato = (tieneCorreo ? 1 : 0) + (tieneTelefono ? 1 : 0) === 1

  // Opciones disponibles según los datos que tenga el contacto.
  const opciones: { campo: CampoBaja; label: string; valor?: string; icono: any }[] = []
  if (tieneCorreo) opciones.push({ campo: 'correo', label: 'Solo el correo', valor: contacto.correo, icono: Mail })
  if (tieneTelefono) opciones.push({ campo: 'telefono', label: 'Solo el teléfono', valor: contacto.telefono, icono: Phone })
  if (tieneCorreo && tieneTelefono) opciones.push({ campo: 'todo', label: 'Toda la cuenta (ambos)', icono: Trash2 })

  // Por defecto NO marcamos "ambos": elegimos el primer dato disponible.
  const [campo, setCampo] = useState<CampoBaja>(opciones[0]?.campo ?? 'todo')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !eliminando && onCancelar()}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          <div className="p-2 rounded-xl bg-red-50 text-red-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">Dar de baja un contacto</h3>
            <p className="text-sm text-gray-500 mt-0.5">Elige exactamente qué dar de baja.</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-sm space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{contacto.nombreCompleto || 'Sin nombre'}</span>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-600">{contacto.rol && contacto.rol !== contacto.tipo ? contacto.rol : contacto.tipo}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-700">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{contacto.correo || '— sin correo —'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-700">
              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{contacto.telefono || '— sin teléfono —'}</span>
            </div>
            {contacto.ubicacion && <p className="text-xs text-gray-400 pt-0.5">{contacto.ubicacion}</p>}
          </div>

          {/* Selector: qué dar de baja */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">¿Qué deseas dar de baja?</p>
            {opciones.map((o) => {
              const activo = campo === o.campo
              const Icono = o.icono
              return (
                <button
                  key={o.campo}
                  onClick={() => setCampo(o.campo)}
                  disabled={eliminando}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition disabled:opacity-50 ${
                    activo ? 'border-red-400 bg-red-50/60 ring-1 ring-red-200' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${activo ? 'border-red-500 bg-red-500' : 'border-gray-300'}`} />
                  <Icono className={`w-4 h-4 shrink-0 ${activo ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-800">{o.label}</span>
                    {o.valor && <span className="block text-xs text-gray-500 truncate">{o.valor}</span>}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            {campo === 'todo' ? (
              <>Se dará de baja <strong>toda la cuenta</strong> (correo y teléfono) y se revocarán sus sesiones. Ambos datos quedarán <strong>libres</strong> para registrarse de nuevo.</>
            ) : soloUnDato ? (
              <>Es el <strong>único dato</strong> de este contacto, así que dar de baja {campo === 'correo' ? 'el correo' : 'el teléfono'} dará de baja <strong>toda la cuenta</strong>. Quedará <strong>libre</strong> para registrarse de nuevo.</>
            ) : (
              <>Se dará de baja <strong>solo {campo === 'correo' ? 'el correo' : 'el teléfono'}</strong>. La cuenta seguirá activa con su {campo === 'correo' ? 'teléfono' : 'correo'}, y ese {campo === 'correo' ? 'correo' : 'teléfono'} quedará <strong>libre</strong> para registrarse de nuevo.</>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onCancelar}
            disabled={eliminando}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(campo)}
            disabled={eliminando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-60"
          >
            {eliminando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Sí, dar de baja
          </button>
        </div>
      </div>
    </div>
  )
}

export function DirectorioPanel() {
  // ---- Buscador unificado ----
  const [q, setQ] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<DirectorioContacto[] | null>(null)

  // ---- Dar de baja (estado compartido por buscador y lista) ----
  const [aEliminar, setAEliminar] = useState<DirectorioContacto | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setResultados(null); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        const r = await directorioService.buscar(term)
        setResultados(r.resultados)
      } catch {
        toast.error('No se pudo buscar.')
      } finally {
        setBuscando(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [q, recarga])

  // ---- Navegador por pestañas ----
  const [tab, setTab] = useState<Tab>('admins')
  const [sedes, setSedes] = useState<DirectorioSede[]>([])
  const [idSede, setIdSede] = useState<number | null>(null)
  const [filtro, setFiltro] = useState('')
  const [pagina, setPagina] = useState(1)
  const [data, setData] = useState<DirectorioContacto[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(false)
  const tamano = 20

  // ---- Alta rápida de negocio (SuperAdmin) ----
  const [altaOpen, setAltaOpen] = useState(false)
  const [altaForm, setAltaForm] = useState({ nombreNegocio: '', correo: '', telefono: '', nombreContacto: '' })
  const [altaLoading, setAltaLoading] = useState(false)
  const [altaResultado, setAltaResultado] = useState<AltaRapidaResponse | null>(null)

  const abrirAlta = () => {
    setAltaForm({ nombreNegocio: '', correo: '', telefono: '', nombreContacto: '' })
    setAltaResultado(null)
    setAltaOpen(true)
  }

  const enviarAlta = async () => {
    if (!altaForm.nombreNegocio.trim()) { toast.error('Ingresa el nombre del negocio.'); return }
    if (!altaForm.correo.trim() && !altaForm.telefono.trim()) {
      toast.error('Indica al menos un correo o un teléfono.'); return
    }
    setAltaLoading(true)
    try {
      const res = await directorioService.altaRapida({
        nombreNegocio: altaForm.nombreNegocio.trim(),
        correo: altaForm.correo.trim() || undefined,
        telefono: altaForm.telefono.trim() || undefined,
        nombreContacto: altaForm.nombreContacto.trim() || undefined,
      })
      setAltaResultado(res)
      toast.success('Negocio dado de alta.')
      setRecarga((n) => n + 1)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.mensaje || e?.message || 'No se pudo dar de alta.')
    } finally {
      setAltaLoading(false)
    }
  }

  // ---- Dar de baja: lógica (el estado se declara arriba, junto al buscador) ----
  const confirmarBaja = async (campo: CampoBaja) => {
    if (!aEliminar) return
    setEliminando(true)
    try {
      const msg = await directorioService.eliminar(aEliminar.tipo, aEliminar.id, campo)
      toast.success(msg)
      setAEliminar(null)
      // Re-sincroniza ambas vistas (lista y buscador) con el servidor.
      setRecarga((n) => n + 1)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.mensaje || e?.message || 'No se pudo dar de baja.')
    } finally {
      setEliminando(false)
    }
  }

  useEffect(() => {
    directorioService.sedes().then(setSedes).catch(() => {})
  }, [])

  // Reinicia a página 1 cuando cambian pestaña / filtro / sede
  useEffect(() => { setPagina(1) }, [tab, filtro, idSede])

  useEffect(() => {
    let activo = true
    const cargar = async () => {
      setCargando(true)
      try {
        let r
        if (tab === 'admins') r = await directorioService.admins(filtro, pagina, tamano)
        else if (tab === 'trabajadores') r = await directorioService.trabajadores(filtro, idSede, pagina, tamano)
        else {
          if (!idSede) { if (activo) { setData([]); setTotal(0) } return }
          r = await directorioService.clientes(idSede, filtro, pagina, tamano)
        }
        if (activo) { setData(r.items); setTotal(r.total) }
      } catch {
        if (activo) { setData([]); setTotal(0) }
      } finally {
        if (activo) setCargando(false)
      }
    }
    const t = setTimeout(cargar, 250)
    return () => { activo = false; clearTimeout(t) }
  }, [tab, filtro, idSede, pagina, recarga])

  const totalPaginas = Math.max(1, Math.ceil(total / tamano))
  const tabs: { id: Tab; label: string; icon: any }[] = useMemo(() => [
    { id: 'admins', label: 'Admins', icon: Shield },
    { id: 'trabajadores', label: 'Trabajadores', icon: Briefcase },
    { id: 'clientes', label: 'Clientes', icon: Users },
  ], [])

  return (
    <div className="space-y-6">
      {/* El alta de negocios se hace desde la pestaña "Barberías" (botón "Nueva barbería"),
          que ahora usa el mismo flujo atómico. Aquí solo se busca/consulta el directorio. */}

      {/* ===================== BUSCADOR UNIFICADO (hero) ===================== */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1">¿Dónde está este contacto?</h2>
        <p className="text-sm text-gray-500 mb-3">
          Busca un correo, teléfono o nombre y te digo si es Admin, Trabajador o Cliente — y dónde.
        </p>
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="correo@ejemplo.com  ·  987654321  ·  nombre…"
            className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {q.trim().length >= 2 && (
          <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
            {buscando ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : resultados && resultados.length > 0 ? (
              resultados.map((c) => <FilaContacto key={`${c.tipo}-${c.id}`} c={c} mostrarTipo onEliminar={setAEliminar} />)
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Sin coincidencias para «{q.trim()}».</div>
            )}
          </div>
        )}
      </div>

      {/* ===================== NAVEGADOR POR TIPO ===================== */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Pestañas */}
        <div className="flex items-center gap-1 p-2 border-b border-gray-100">
          {tabs.map((t) => {
            const activa = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition ${
                  activa ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            )
          })}
          <button onClick={() => { setFiltro((f) => f); setPagina((p) => p) }} title="Refrescar"
            className="ml-auto p-2 text-gray-400 hover:text-blue-600 transition" aria-label="Refrescar">
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-gray-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar por nombre, correo o teléfono…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 outline-none text-sm" />
          </div>
          {(tab === 'trabajadores' || tab === 'clientes') && (
            <select value={idSede ?? ''} onChange={(e) => setIdSede(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white sm:w-64">
              <option value="">{tab === 'clientes' ? '— Elige una sede —' : 'Todas las sedes'}</option>
              {sedes.map((s) => (
                <option key={s.idSede} value={s.idSede}>{s.nombre} · {s.empresa}</option>
              ))}
            </select>
          )}
        </div>

        {/* Encabezado de columnas */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-2 text-xs font-semibold text-gray-400 bg-gray-50/60">
          <div className="flex-1">Nombre / ubicación</div>
          <div className="w-52">Correo</div>
          <div className="w-32">Teléfono</div>
        </div>

        {/* Lista */}
        {tab === 'clientes' && !idSede ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Elige una sede para ver sus clientes (los que han reservado ahí).
          </div>
        ) : cargando ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Sin resultados.</div>
        ) : (
          <div>{data.map((c) => <FilaContacto key={`${c.tipo}-${c.id}`} c={c} onEliminar={setAEliminar} />)}</div>
        )}

        {/* Paginación */}
        {data.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-100 text-sm text-gray-500">
            <span>{total} resultado{total !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition" aria-label="Anterior">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="tabular-nums">{pagina} / {totalPaginas}</span>
              <button disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition" aria-label="Siguiente">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación de baja */}
      {aEliminar && (
        <ModalConfirmarBaja
          contacto={aEliminar}
          eliminando={eliminando}
          onCancelar={() => { if (!eliminando) setAEliminar(null) }}
          onConfirmar={confirmarBaja}
        />
      )}

      {/* Modal de ALTA RÁPIDA */}
      {altaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !altaLoading && setAltaOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            {!altaResultado ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-600" /> Nueva alta de negocio</h3>
                  <button onClick={() => setAltaOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-sm text-gray-500 mb-4">El Admin recibirá un código para crear su contraseña.</p>

                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre del negocio *</label>
                <input value={altaForm.nombreNegocio} onChange={(e) => setAltaForm(f => ({ ...f, nombreNegocio: e.target.value }))}
                  placeholder="Barbería El Corte" className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 mb-3 focus:outline-none focus:border-blue-500" />

                <label className="block text-xs font-semibold text-gray-500 mb-1">Correo del Admin</label>
                <input value={altaForm.correo} onChange={(e) => setAltaForm(f => ({ ...f, correo: e.target.value }))}
                  placeholder="dueño@correo.com" autoCapitalize="none" className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 mb-3 focus:outline-none focus:border-blue-500" />

                <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono del Admin</label>
                <input value={altaForm.telefono} onChange={(e) => setAltaForm(f => ({ ...f, telefono: e.target.value }))}
                  placeholder="9XXXXXXXX" className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 mb-1 focus:outline-none focus:border-blue-500" />
                <p className="text-xs text-gray-400 mb-3">Indica al menos un correo o un teléfono.</p>

                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre del responsable (opcional)</label>
                <input value={altaForm.nombreContacto} onChange={(e) => setAltaForm(f => ({ ...f, nombreContacto: e.target.value }))}
                  placeholder="Si va vacío, se usa el del negocio" className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 mb-5 focus:outline-none focus:border-blue-500" />

                <div className="flex gap-2 justify-end">
                  <button onClick={() => setAltaOpen(false)} className="px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold">Cancelar</button>
                  <button onClick={enviarAlta} disabled={altaLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {altaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Dar de alta
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center"><Check className="w-5 h-5 text-green-600" /></div>
                  <h3 className="text-lg font-bold text-gray-900">¡Negocio dado de alta!</h3>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-1.5 mb-4">
                  <div><span className="text-gray-500">Negocio:</span> <b>{altaResultado.nombreNegocio}</b></div>
                  {altaResultado.correo && <div><span className="text-gray-500">Correo:</span> {altaResultado.correo}</div>}
                  {altaResultado.telefono && <div><span className="text-gray-500">Teléfono:</span> {altaResultado.telefono}</div>}
                  {altaResultado.subdominio && <div><span className="text-gray-500">Subdominio:</span> {altaResultado.subdominio}</div>}
                  <div className="pt-1">
                    {altaResultado.otpEnviado
                      ? <span className="text-green-700">Se envió un código al contacto para crear la contraseña.</span>
                      : <span className="text-amber-700">No se pudo enviar el código; el Admin puede crear su contraseña desde el login.</span>}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setAltaOpen(false)} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">Entendido</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
