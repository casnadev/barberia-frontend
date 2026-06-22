import { useEffect, useMemo, useState } from 'react'
import {
  Search, Copy, Check, Loader2, X, ChevronLeft, ChevronRight,
  Shield, Briefcase, Users, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  directorioService,
  type DirectorioContacto,
  type DirectorioSede,
} from '@/services/directorioService'

type Tab = 'admins' | 'trabajadores' | 'clientes'

const TIPO_STYLE: Record<string, { badge: string; icon: any }> = {
  Admin: { badge: 'bg-purple-50 text-purple-700 border-purple-200', icon: Shield },
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
function FilaContacto({ c, mostrarTipo }: { c: DirectorioContacto; mostrarTipo?: boolean }) {
  const estilo = TIPO_STYLE[c.tipo] ?? TIPO_STYLE.Cliente
  const Icono = estilo.icon
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 truncate">{c.nombreCompleto || 'Sin nombre'}</p>
          {mostrarTipo && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${estilo.badge}`}>
              <Icono className="w-3 h-3" /> {c.tipo}
            </span>
          )}
          {c.activo === false && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">apagado</span>
          )}
        </div>
        {c.ubicacion && <p className="text-xs text-gray-400 truncate mt-0.5">{c.ubicacion}</p>}
      </div>
      <div className="hidden sm:block w-52 text-sm"><Copiable valor={c.correo} /></div>
      <div className="w-32 text-sm"><Copiable valor={c.telefono} /></div>
    </div>
  )
}

export function DirectorioPanel() {
  // ---- Buscador unificado ----
  const [q, setQ] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<DirectorioContacto[] | null>(null)

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
  }, [q])

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
  }, [tab, filtro, idSede, pagina])

  const totalPaginas = Math.max(1, Math.ceil(total / tamano))
  const tabs: { id: Tab; label: string; icon: any }[] = useMemo(() => [
    { id: 'admins', label: 'Admins', icon: Shield },
    { id: 'trabajadores', label: 'Trabajadores', icon: Briefcase },
    { id: 'clientes', label: 'Clientes', icon: Users },
  ], [])

  return (
    <div className="space-y-6">
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
              resultados.map((c) => <FilaContacto key={`${c.tipo}-${c.id}`} c={c} mostrarTipo />)
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
          <div>{data.map((c) => <FilaContacto key={`${c.tipo}-${c.id}`} c={c} />)}</div>
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
    </div>
  )
}
