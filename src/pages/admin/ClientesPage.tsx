import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DuplicadosModal } from '@/components/DuplicadosModal'
import { clientesService, Cliente } from '@/services/clientesService'
import { MonederoClienteCard } from '@/components/MonederoClienteCard'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ConfirmDialog'
import { mensajeError } from '@/utils/apiError'
import { Eye, LockOpen as Unlock, MagnifyingGlass as Search, Phone, Envelope as Mail, Calendar, Users, Info, X, Gift, Plus, Trash as Trash2, ImageSquare as ImagePlus, ShieldCheck, Pencil, EyeSlash as EyeOff, DownloadSimple as Download, FileXls as FileSpreadsheet, FileText, CircleNotch as Loader2, PaperPlaneRight as Send, UploadSimple as Upload, UserPlus, CheckCircle as CheckCircle2, WarningCircle as AlertCircle, MapPin, CaretDown as ChevronDown, ArrowsMerge } from '@phosphor-icons/react'
import { novedadesService, type Novedad } from '@/services/novedadesService'
import { campanasService, type CoberturaCampana } from '@/services/campanasService'
import { buildImageUrl, getActiveTenant } from '@/services/apiClient'
import { sedeTenantService } from '@/services/sedeTenantService'
import s from '@/styles/Clientes.module.css'
import { serviciosService } from '@/services/serviciosService'
import { ModeracionNovedadesModal } from '@/components/ModeracionNovedadesModal'

export function ClientesPage() {
  // clientesRaw y loading vienen ahora de useQuery (más abajo).
  const [searchTerm, setSearchTerm] = useState('')
  // Filtros estilo Fresha: sede (por defecto la activa) + segmento.
  const [sedes, setSedes] = useState<{ idSede: number; nombre: string; subdominio: string }[]>([])
  const [sedeFiltro, setSedeFiltro] = useState<number | null>(null)   // null = aún no resuelta; 0 = todas
  const [segmento, setSegmento] = useState<string>('')                // '' = todos
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [visibleMobile, setVisibleMobile] = useState(8)   // "Ver más" solo en móvil
  const [novedadOpen, setNovedadOpen] = useState(false)   // modal "Nueva novedad"
  const [moderacionOpen, setModeracionOpen] = useState(false) // modal "Moderación"
  // T4 — Posibles duplicados. El sistema sugiere, el Admin decide.
  const [duplicadosOpen, setDuplicadosOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)     // modal "Importar clientes"

  // Búsqueda con debounce (500ms) que alimenta la query-key.
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Lista de clientes cacheada con React Query. La key incluye sede y término
  // debounced: revisitar con los mismos filtros muestra los datos al instante y
  // revalida en segundo plano. Solo corre cuando la sede ya está resuelta.
  const {
    data: clientesRaw = [],
    isLoading: clientesLoading,
    isError,
    refetch,
  } = useQuery<Cliente[]>({
    queryKey: ['clientes', 'admin', sedeFiltro ?? -1, debouncedSearch],
    enabled: sedeFiltro !== null,
    queryFn: async () => {
      const data = await clientesService.getClientes(
        1, 200, debouncedSearch || undefined,
        sedeFiltro && sedeFiltro > 0 ? sedeFiltro : undefined,
        undefined,
      )
      return Array.isArray(data) ? data : []
    },
  })
  const loading = clientesLoading || sedeFiltro === null
  const loadClientes = () => refetch()

  useEffect(() => { if (isError) toast.error('Error al cargar clientes') }, [isError])

  // El segmento se filtra EN MEMORIA (instantáneo, sin ir al servidor). Solo la
  // sede y la búsqueda recargan del servidor. Esto hace que cambiar de segmento
  // (Nuevos/Frecuentes/Inactivos) sea inmediato, sin spinner.
  const clientes = segmento
    ? clientesRaw.filter((c) => (c.segmento || '').toLowerCase() === segmento.toLowerCase())
    : clientesRaw

  // Modal de desbloqueo (pide motivo al admin)
  const [desbloqueoTarget, setDesbloqueoTarget] = useState<number | null>(null)
  const [desbloqueoMotivo, setDesbloqueoMotivo] = useState('')
  const [desbloqueando, setDesbloqueando] = useState(false)

  // Al recargar la lista (búsqueda/refresh) reseteamos el "Ver más" de móvil.
  useEffect(() => { setVisibleMobile(8) }, [clientes])

  // Al montar: resolver la sede activa (decisión 3A: por defecto la sede activa).
  useEffect(() => {
    (async () => {
      try {
        const mis = await sedeTenantService.getMisSedes()
        setSedes(mis)
        const activa = mis.find((x) => x.subdominio === getActiveTenant()) ?? mis[0]
        setSedeFiltro(activa?.idSede ?? 0)
      } catch {
        setSedeFiltro(0) // si falla, mostrar todas
      }
    })()
  }, [])

  // (La carga de clientes ahora la maneja useQuery arriba; refetch al mutar.)

  const handleViewDetails = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setShowDetailModal(true)
  }

  const handleDesbloquear = (id: number) => {
    setDesbloqueoMotivo('')
    setDesbloqueoTarget(id)
  }

  const confirmDesbloqueo = async () => {
    if (desbloqueoTarget == null) return
    const motivo = desbloqueoMotivo.trim()
    if (motivo.length < 5) {
      toast.error('Indica un motivo (mínimo 5 caracteres)')
      return
    }
    try {
      setDesbloqueando(true)
      await clientesService.desbloquearCliente(desbloqueoTarget, motivo)
      toast.success('Cliente desbloqueado')
      setDesbloqueoTarget(null)
      await loadClientes()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo desbloquear el cliente'))
    } finally {
      setDesbloqueando(false)
    }
  }

  // Estadísticas
  const totalClientes = clientes.length
  const clientesActivos = clientes.filter((c) => !c.bloqueadoWeb).length
  const clientesBloqueados = clientes.filter((c) => c.bloqueadoWeb).length

  const fecha = (d?: string, largo = false) =>
    d ? new Date(d).toLocaleDateString('es-PE', largo ? { year: 'numeric', month: 'long', day: 'numeric' } : undefined) : 'N/A'

  // Badge visual de segmento del cliente (Nuevo / Frecuente / Inactivo / En riesgo).
  const SEG_META: Record<string, { label: string; cls: string }> = {
    nuevo: { label: 'Nuevo', cls: s.segBadgeNuevo },
    frecuente: { label: 'Frecuente', cls: s.segBadgeFrecuente },
    inactivo: { label: 'Inactivo', cls: s.segBadgeInactivo },
    riesgo: { label: 'En riesgo', cls: s.segBadgeRiesgo },
  }
  const renderSegmento = (seg?: string) => {
    const meta = seg ? SEG_META[seg] : undefined
    if (!meta) return null
    return <span className={`${s.segBadge} ${meta.cls}`}>{meta.label}</span>
  }

  // ─── Exportar base de clientes (portabilidad de datos) ───
  const [exportMenu, setExportMenu] = useState(false)
  const [exportando, setExportando] = useState(false)

  const exportarClientes = async (tipo: 'excel' | 'pdf') => {
    setExportMenu(false)
    setExportando(true)
    try {
      const { exportarClientesExcel, exportarClientesPDF } = await import('@/utils/exportReportes')
      // Para portabilidad real, traemos la lista COMPLETA del filtro actual
      // (hasta 1000), no solo los que están visibles en pantalla.
      const fullList = await clientesService.getClientes(
        1, 1000, searchTerm || undefined,
        sedeFiltro && sedeFiltro > 0 ? sedeFiltro : undefined,
        segmento || undefined,
      )
      const data = Array.isArray(fullList) && fullList.length > 0 ? fullList : clientes
      if (data.length === 0) { toast.error('No hay clientes para exportar'); setExportando(false); return }

      let negocio = 'Mi negocio'
      let sedesLabel: string | undefined
      const activa = sedes.find((x) => x.idSede === sedeFiltro)
      if (activa) {
        // Una sede específica.
        negocio = activa.nombre
        sedesLabel = `Sede: ${activa.nombre}`
      } else {
        // "Todas las sedes": no usar el nombre de una sola sede.
        negocio = 'Todas las sedes'
        const nombres = sedes.map((sd) => sd.nombre).filter(Boolean)
        if (nombres.length === 1) { negocio = nombres[0]; sedesLabel = `Sede: ${nombres[0]}` }
        else if (nombres.length > 1) sedesLabel = `Datos de todas las sedes (${nombres.join(', ')})`
      }

      const filas = data.map((c) => ({
        nombre: c.nombreCompleto || 'Sin nombre',
        telefono: c.telefono || '',
        correo: c.correo || '',
        genero: c.genero || '',
        segmento: c.segmento || '',
        totalReservas: c.totalReservas ?? 0,
        reservasAtendidas: c.reservasAtendidas ?? 0,
        ultimaVisita: c.ultimaVisita ? new Date(c.ultimaVisita).toLocaleDateString('es-PE') : '',
        registrado: c.fechaCreacion ? new Date(c.fechaCreacion).toLocaleDateString('es-PE') : '',
      }))
      const meta = { negocio, periodoLabel: new Date().toLocaleDateString('es-PE'), sedesLabel }
      if (tipo === 'excel') await exportarClientesExcel(filas, meta)
      else await exportarClientesPDF(filas, meta)
      toast.success(`${filas.length} cliente(s) exportado(s) a ${tipo === 'excel' ? 'Excel' : 'PDF'}`)
    } catch (e) {
      console.error(e)
      toast.error('No se pudo exportar')
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <div className={s.note}>
        <Info width={16} height={16} />
        <span>Los clientes se registran automáticamente al reservar. Aquí puedes ver su detalle, historial y controlar su acceso.</span>
      </div>

      {/* KPIs */}
      <div className={s.kpis}>
        <div className={s.kpi}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Total de clientes</span>
            <div className={`${s.kpiIcon} ${s.kpiBlue}`}><Users width={19} height={19} /></div>
          </div>
          <div className={s.kpiValue}>{totalClientes}</div>
          <div className={s.kpiHint}>Registrados en el sistema</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Clientes activos</span>
            <div className={`${s.kpiIcon} ${s.kpiGreen}`}><Unlock width={19} height={19} /></div>
          </div>
          <div className={`${s.kpiValue} ${s.kpiValueGreen}`}>{clientesActivos}</div>
          <div className={s.kpiHint}>Con acceso habilitado</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Clientes bloqueados</span>
            <div className={`${s.kpiIcon} ${s.kpiRed}`}><Users width={19} height={19} /></div>
          </div>
          <div className={`${s.kpiValue} ${s.kpiValueRed}`}>{clientesBloqueados}</div>
          <div className={s.kpiHint}>Por inasistencias</div>
        </div>
      </div>

      {/* Acciones: en móvil 3 parejos (Exportar/Importar/Moderación) + promoción ancho completo */}
      <div className="mb-3">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <div style={{ position: 'relative' }} className="sm:order-1">
            <button onClick={() => setExportMenu((v) => !v)} disabled={exportando}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-60">
              <Download width={16} height={16} /> <span className="truncate">{exportando ? '…' : 'Exportar'}</span>
            </button>
            {exportMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setExportMenu(false)} />
                <div className="export-menu-pop" style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 50, background: '#fff', border: '1px solid #e9ebef', borderRadius: 12, padding: 6, boxShadow: '0 12px 28px rgba(16,24,40,.16)', minWidth: 190, maxWidth: 'calc(100vw - 32px)' }}>
                  <button onClick={() => exportarClientes('excel')} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-50 text-left">
                    <FileSpreadsheet width={16} height={16} color="#16a34a" /> Excel (.xlsx)
                  </button>
                  <button onClick={() => exportarClientes('pdf')} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-50 text-left">
                    <FileText width={16} height={16} color="#dc2626" /> PDF
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={() => setImportOpen(true)} className="sm:order-2 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-3 py-2 text-sm font-semibold transition">
            <Upload width={16} height={16} /> <span className="truncate">Importar</span>
          </button>
          <button onClick={() => setDuplicadosOpen(true)} className="sm:order-3 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-3 py-2 text-sm font-semibold transition" title="Fichas que podrían ser la misma persona">
            <ArrowsMerge width={16} height={16} /> <span className="truncate">Duplicados</span>
          </button>
          <button onClick={() => setModeracionOpen(true)} className="sm:order-4 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-3 py-2 text-sm font-semibold transition">
            <ShieldCheck width={16} height={16} /> <span className="truncate">Moderación</span>
          </button>
          {/* Nueva promoción: en móvil ocupa todo el ancho debajo; en desktop va en la fila */}
          <button onClick={() => setNovedadOpen(true)} className="sm:order-4 col-span-3 sm:col-span-1 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition">
            <Gift width={16} height={16} /> Nueva promoción
          </button>
        </div>
      </div>

      {/* Filtros estilo Fresha: sede (desplegable) + segmentos (chips) */}
      <div className={s.filtros}>
        {sedes.length > 1 && (
          <div className="mb-2.5">
            <div className="relative inline-flex items-center w-full sm:w-auto">
              <MapPin width={16} height={16} className="absolute left-3 text-blue-600 pointer-events-none" />
              <select
                value={sedeFiltro ?? 0}
                onChange={(e) => setSedeFiltro(Number(e.target.value))}
                className="w-full sm:w-auto appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm font-semibold text-gray-800 cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              >
                <option value={0}>Todas las sedes</option>
                {sedes.map((sd) => (
                  <option key={sd.idSede} value={sd.idSede}>{sd.nombre}</option>
                ))}
              </select>
              <ChevronDown width={16} height={16} className="absolute right-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
        <div className={s.filtroRow}>
          {[
            { key: '', label: 'Todos', cls: '' },
            { key: 'nuevo', label: 'Nuevos', cls: s.segNuevo },
            { key: 'frecuente', label: 'Frecuentes', cls: s.segFrecuente },
            { key: 'inactivo', label: 'Inactivos', cls: s.segInactivo },
            { key: 'riesgo', label: 'En riesgo', cls: s.segRiesgo },
          ].map((seg) => (
            <button
              key={seg.key || 'todos'}
              className={`${s.fChip} ${seg.cls} ${segmento === seg.key ? s.fChipActive : ''}`}
              onClick={() => setSegmento(seg.key)}
            >
              {seg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Buscador */}
      <div className={s.searchWrap}>
        <Search className={s.searchIcon} width={18} height={18} />
        <input
          className={s.searchInput}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className={s.tableCard}>
        {loading ? (
          <div className={s.loading}>
            <div className={s.spinner} />
            <p className={s.loadingText}>Cargando clientes...</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className={s.empty}>
            <Users width={56} height={56} />
            <p>{searchTerm ? 'No se encontraron clientes con esa búsqueda.' : 'Aún no hay clientes registrados.'}</p>
          </div>
        ) : (
          <>
            {/* Desktop: tabla (sin cambios) */}
            <div className={`${s.tableScroll} hidden md:block`}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Reservas</th>
                    <th>Estado</th>
                    <th>Registrado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr key={cliente.idCliente}>
                      <td className={s.cellName}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {cliente.nombreCompleto}
                          {renderSegmento(cliente.segmento)}
                        </span>
                      </td>
                      <td><span className={s.cellIcon}><Phone width={14} height={14} /> {cliente.telefono}</span></td>
                      <td><span className={s.cellIcon}><Mail width={14} height={14} /> {cliente.correo || 'Sin email'}</span></td>
                      <td><span className={s.countPill}>{cliente.totalReservas || 0}</span></td>
                      <td>
                        <span className={`${s.badge} ${cliente.bloqueadoWeb ? s.badgeBlocked : s.badgeActive}`}>
                          {cliente.bloqueadoWeb ? '🚫 Bloqueado' : '✅ Activo'}
                        </span>
                        {cliente.bloqueadoWeb && cliente.fechaSolicitudDesbloqueo && (
                          <span title={cliente.motivoSolicitudDesbloqueo} style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap', cursor: 'help' }}>🙋 solicitó</span>
                        )}
                      </td>
                      <td><span className={s.cellIcon}><Calendar width={14} height={14} /> {fecha(cliente.fechaCreacion)}</span></td>
                      <td>
                        <div className={s.rowActions}>
                          <button className={`${s.actBtn} ${s.actView}`} onClick={() => handleViewDetails(cliente)} title="Ver detalles" aria-label="Ver detalles"><Eye width={16} height={16} /></button>
                          {cliente.bloqueadoWeb && (
                            <button className={`${s.actBtn} ${s.actUnlock}`} onClick={() => handleDesbloquear(cliente.idCliente!)} title="Desbloquear" aria-label="Desbloquear"><Unlock width={16} height={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Móvil: tarjetas + "Ver más" */}
            <div className="md:hidden divide-y divide-gray-100">
              {clientes.slice(0, visibleMobile).map((cliente) => (
                <div key={cliente.idCliente} className="p-4 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate flex items-center gap-2">
                      <span className="truncate">{cliente.nombreCompleto || 'Sin nombre'}</span>
                      {renderSegmento(cliente.segmento)}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><Phone width={13} height={13} /> {cliente.telefono}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 truncate"><Mail width={13} height={13} /> {cliente.correo || 'Sin email'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`${s.badge} ${cliente.bloqueadoWeb ? s.badgeBlocked : s.badgeActive}`}>
                        {cliente.bloqueadoWeb ? '🚫 Bloqueado' : '✅ Activo'}
                      </span>
                      {cliente.bloqueadoWeb && cliente.fechaSolicitudDesbloqueo && (
                        <span className="text-xs font-bold" style={{ color: '#b45309' }}>🙋 solicitó desbloqueo</span>
                      )}
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar width={12} height={12} /> {cliente.totalReservas || 0} reservas</span>
                    </div>
                  </div>
                  <div className={s.rowActions}>
                    <button className={`${s.actBtn} ${s.actView}`} onClick={() => handleViewDetails(cliente)} aria-label="Ver detalles"><Eye width={16} height={16} /></button>
                    {cliente.bloqueadoWeb && (
                      <button className={`${s.actBtn} ${s.actUnlock}`} onClick={() => handleDesbloquear(cliente.idCliente!)} aria-label="Desbloquear"><Unlock width={16} height={16} /></button>
                    )}
                  </div>
                </div>
              ))}
              {visibleMobile < clientes.length && (
                <button
                  onClick={() => setVisibleMobile((v) => v + 8)}
                  className="w-full py-3.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition"
                >
                  Ver más ({clientes.length - visibleMobile})
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal de detalle */}
      {showDetailModal && selectedCliente && (
        <div className={s.overlay} onClick={() => setShowDetailModal(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHead}>
              <h2 className={s.modalTitle}><Users width={20} height={20} color="var(--brand, #2855F6)" /> Detalles del cliente</h2>
              <button className={s.modalClose} onClick={() => setShowDetailModal(false)} aria-label="Cerrar"><X width={18} height={18} /></button>
            </div>

            <div className={s.detail}>
              <div className={s.dField}>
                <span className={s.dLabel}>Nombre</span>
                <span className={s.dValue} style={{ fontSize: '1.05rem' }}>{selectedCliente.nombreCompleto}</span>
              </div>
              <div className={s.dField}>
                <span className={s.dLabel}>Teléfono</span>
                <span className={s.dValue}><Phone width={15} height={15} /> {selectedCliente.telefono}</span>
              </div>
              <div className={s.dField}>
                <span className={s.dLabel}>Email</span>
                <span className={s.dValue}>{selectedCliente.correo || 'No registrado'}</span>
              </div>
              <div className={s.dField}>
                <span className={s.dLabel}>Género</span>
                <span className={s.dValue}>
                  {selectedCliente.genero === 'M' ? '👨 Masculino' : selectedCliente.genero === 'F' ? '👩 Femenino' : selectedCliente.genero || 'No especificado'}
                </span>
              </div>

              <div className={s.statsBox}>
                <span className={s.dLabel}>Historial de reservas</span>
                <div className={s.statsGrid}>
                  <div>
                    <div className={s.statNum}>{selectedCliente.totalReservas || 0}</div>
                    <div className={s.statLabel}>Total de reservas</div>
                  </div>
                  <div>
                    <div className={`${s.statNum} ${s.statNumGreen}`}>{selectedCliente.reservasAtendidas || 0}</div>
                    <div className={s.statLabel}>Atendidas</div>
                  </div>
                </div>
              </div>

              <div className={s.dField}>
                <span className={s.dLabel}>No-shows</span>
                <span className={s.dValue}>
                  {selectedCliente.contadorNoShows || 0} inasistencias
                  {(selectedCliente.contadorNoShows || 0) >= 3 && <span className={s.warn}>⚠️ Riesgo de bloqueo</span>}
                </span>
              </div>

              <div className={s.dField}>
                <span className={s.dLabel}>Estado de acceso</span>
                <span>
                  <span className={`${s.badge} ${selectedCliente.bloqueadoWeb ? s.badgeBlocked : s.badgeActive}`}>
                    {selectedCliente.bloqueadoWeb ? '🚫 Bloqueado' : '✅ Activo'}
                  </span>
                </span>
              </div>

              {selectedCliente.bloqueadoWeb && selectedCliente.fechaSolicitudDesbloqueo && (
                <div className={s.dField}>
                  <span className={s.dLabel}>🙋 Solicitó desbloqueo</span>
                  <span className={s.dValue} style={{ display: 'block' }}>
                    <span style={{ fontStyle: 'italic', color: '#b45309' }}>
                      “{selectedCliente.motivoSolicitudDesbloqueo}”
                    </span>
                    <br />
                    <small style={{ color: '#9ca3af' }}>{fecha(selectedCliente.fechaSolicitudDesbloqueo, true)}</small>
                  </span>
                </div>
              )}

              <div className={s.dField}>
                <span className={s.dLabel}>Registrado desde</span>
                <span className={s.dValue}><Calendar width={15} height={15} /> {fecha(selectedCliente.fechaCreacion, true)}</span>
              </div>

              {selectedCliente.ultimaVisita && (
                <div className={s.dField}>
                  <span className={s.dLabel}>Última visita</span>
                  <span className={s.dValue}>{fecha(selectedCliente.ultimaVisita)}</span>
                </div>
              )}
            </div>

            {/* Fidelización. OJO: el idCliente de ESTA lista es del CRM agregado y no
                identifica a nadie (puede ser 0 o negativo). El monedero se abre con el
                cliente REAL, resuelto por teléfono. */}
            <div style={{ padding: '0 20px 4px' }}>
              <MonederoDelCliente telefono={selectedCliente.telefono} idClienteReal={selectedCliente.idClienteReal} />
            </div>

            <div className={s.modalActions}>
              {selectedCliente.bloqueadoWeb && (
                <button className={s.btnUnlock} onClick={() => { handleDesbloquear(selectedCliente.idCliente!); setShowDetailModal(false) }}><Unlock width={16} height={16} /> Desbloquear cliente</button>
              )}
              <button className={s.btnClose} onClick={() => setShowDetailModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {desbloqueoTarget != null && (() => {
        const cli = clientes.find((c) => c.idCliente === desbloqueoTarget)
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
            onClick={() => !desbloqueando && setDesbloqueoTarget(null)}
          >
            <div
              style={{ background: '#fff', borderRadius: 16, padding: 22, width: '100%', maxWidth: 420, boxShadow: '0 10px 40px rgba(0,0,0,.2)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#111' }}>Desbloquear cliente</h3>
              <p style={{ margin: '0 0 14px', fontSize: 14, color: '#6b7280' }}>
                {cli?.nombreCompleto || cli?.telefono || 'Cliente'} recuperará el acceso para reservar. Indica el motivo (queda registrado).
              </p>

              {cli?.fechaSolicitudDesbloqueo && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 2 }}>🙋 El cliente escribió:</div>
                  <div style={{ fontSize: 13, color: '#92400e', fontStyle: 'italic' }}>“{cli.motivoSolicitudDesbloqueo}”</div>
                </div>
              )}

              <textarea
                value={desbloqueoMotivo}
                onChange={(e) => setDesbloqueoMotivo(e.target.value)}
                rows={3}
                maxLength={300}
                autoFocus
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDesbloqueoTarget(null)}
                  disabled={desbloqueando}
                  style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDesbloqueo}
                  disabled={desbloqueando}
                  style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontSize: 14, fontWeight: 700, cursor: desbloqueando ? 'default' : 'pointer', opacity: desbloqueando ? .7 : 1 }}
                >
                  {desbloqueando ? 'Desbloqueando…' : 'Desbloquear'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      {novedadOpen && <NovedadModal onClose={() => setNovedadOpen(false)} />}
      {moderacionOpen && <ModeracionNovedadesModal onClose={() => setModeracionOpen(false)} />}

      {/* T4 — Al fusionar, el listado cambia: hay que recargarlo. */}
      {duplicadosOpen && (
        <DuplicadosModal
          onClose={() => setDuplicadosOpen(false)}
          onFusionado={() => { loadClientes() }}
        />
      )}
      {importOpen && (
        <ImportarClientesModal
          sedeActual={sedeFiltro && sedeFiltro > 0 ? sedeFiltro : (sedes[0]?.idSede ?? 0)}
          sedeNombre={sedes.find((x) => x.idSede === sedeFiltro)?.nombre || sedes[0]?.nombre || 'tu sede'}
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); loadClientes() }}
        />
      )}
    </>
  )
}

/* ===================== Modal "Nueva novedad" (broadcast) ===================== */
function NovedadModal({ onClose }: { onClose: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [imagen, setImagen] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lista, setLista] = useState<Novedad[]>([])

  // Campos nuevos
  const [tipo, setTipo] = useState('Promo')                 // Promo | Evento | Aviso
  const [destacado, setDestacado] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaExpiracion, setFechaExpiracion] = useState('')
  const [tipoAccion, setTipoAccion] = useState('Ninguna')   // Ninguna | Reservar | Enlace
  const [textoBoton, setTextoBoton] = useState('Lo quiero')
  const [urlAccion, setUrlAccion] = useState('')
  const [precioPromo, setPrecioPromo] = useState('')
  const [descuento, setDescuento] = useState('')
  const [serviciosSede, setServiciosSede] = useState<any[]>([])
  const [idServicios, setIdServicios] = useState<number[]>([])
  const [editandoId, setEditandoId] = useState<number | null>(null) // null = crear; id = editando
  const [campanaTarget, setCampanaTarget] = useState<Novedad | null>(null) // promo a enviar por correo

  const cargar = () => novedadesService.listar().then(setLista).catch(() => setLista([]))
  useEffect(() => { cargar() }, [])
  useEffect(() => {
    serviciosService.getServicios().then((s: any) => setServiciosSede(s || [])).catch(() => setServiciosSede([]))
  }, [])

  const toggleServicio = (id: number) =>
    setIdServicios((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  // ISO ("2026-06-10T18:00:00") -> valor de <input datetime-local> ("2026-06-10T18:00")
  const toInputDate = (s?: string | null) => (s ? String(s).slice(0, 16) : '')

  // Carga una novedad existente en el formulario para editarla.
  const editarNovedad = (n: any) => {
    setEditandoId(n.idNovedad)
    setTitulo(n.titulo || '')
    setCuerpo(n.cuerpo || '')
    setImagen(n.urlImagen || '')
    setTipo(n.tipo || 'Promo')
    setDestacado(!!n.destacado)
    setFechaInicio(toInputDate(n.fechaInicio))
    setFechaExpiracion(toInputDate(n.fechaExpiracion))
    setTipoAccion(n.tipoAccion || 'Ninguna')
    setTextoBoton(n.textoBoton || 'Lo quiero')
    setUrlAccion(n.urlAccion || '')
    setPrecioPromo(n.precioPromo != null ? String(n.precioPromo) : '')
    setDescuento(n.descuentoPorcentaje != null ? String(n.descuentoPorcentaje) : '')
    setIdServicios((n.servicios || []).map((s: any) => s.idServicio))
    // sube el scroll del modal al formulario
    document.querySelector('[data-novedad-modal]')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const subir = async (e: any) => {
    const file = e.target.files?.[0]; if (!file) return
    setSubiendo(true)
    try { const url = await novedadesService.subirImagen(file); setImagen(url) }
    catch { toast.error('No se pudo subir la imagen') } finally { setSubiendo(false) }
  }

  const limpiar = () => {
    setTitulo(''); setCuerpo(''); setImagen('')
    setTipo('Promo'); setDestacado(false); setFechaInicio(''); setFechaExpiracion('')
    setTipoAccion('Ninguna'); setTextoBoton('Lo quiero'); setUrlAccion('')
    setPrecioPromo(''); setDescuento(''); setIdServicios([]); setEditandoId(null)
  }

  const guardar = async () => {
    if (!titulo.trim() || !cuerpo.trim()) return toast.error('Completa título y mensaje')
    if (tipoAccion === 'Enlace' && !urlAccion.trim()) return toast.error('Indica la URL del botón')
    if (tipoAccion === 'Reservar' && idServicios.length === 0) return toast.error('Elige al menos un servicio para la promo')
    setSaving(true)
    const body = {
      titulo: titulo.trim(),
      cuerpo: cuerpo.trim(),
      urlImagen: imagen || undefined,
      tipo,
      destacado,
      fechaInicio: fechaInicio || null,
      fechaExpiracion: fechaExpiracion || null,
      tipoAccion,
      textoBoton: tipoAccion !== 'Ninguna' ? (textoBoton.trim() || 'Lo quiero') : undefined,
      urlAccion: tipoAccion === 'Enlace' ? urlAccion.trim() : undefined,
      precioPromo: tipoAccion === 'Reservar' && precioPromo ? Number(precioPromo) : null,
      descuentoPorcentaje: tipoAccion === 'Reservar' && descuento ? Number(descuento) : null,
      idServicios: tipoAccion === 'Reservar' ? idServicios : undefined,
    }
    try {
      if (editandoId) {
        await novedadesService.editar(editandoId, body)
        toast.success('Novedad actualizada')
      } else {
        await novedadesService.crear(body)
        toast.success('Novedad publicada')
      }
      limpiar()
      cargar()
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje || (editandoId ? 'No se pudo guardar' : 'No se pudo publicar'))
    } finally { setSaving(false) }
  }

  const borrar = async (id: number) => {
    if (!(await confirmDialog({
      title: 'Eliminar novedad',
      message: 'Se eliminará junto con sus comentarios y corazones. Esta acción no se puede deshacer. Si solo quieres ocultarla, usa "Pausar".',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      tone: 'danger',
    }))) return
    try { await novedadesService.eliminar(id); toast.success('Novedad eliminada'); cargar() }
    catch { toast.error('No se pudo eliminar') }
  }

  // Pausar/activar sin borrar: una pausada no se ve en el muro pero conserva
  // comentarios, corazones y datos. Se reactiva cuando quieras.
  const cambiar = async (n: any) => {
    try {
      await novedadesService.cambiarActivo(n.idNovedad, !n.activo)
      toast.success(n.activo ? 'Novedad pausada' : 'Novedad activada')
      cargar()
    } catch { toast.error('No se pudo cambiar el estado') }
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div data-novedad-modal className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2"><Gift width={18} height={18} className="text-blue-600" /> {editandoId ? 'Editar novedad' : 'Nueva novedad'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar"><X width={18} height={18} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">La verán <strong>todos los clientes</strong> de tu sede en su muro de Promociones.</p>

        <div className="space-y-3">
          {/* Tipo + destacado */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Tipo</label>
              <select className={field} value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="Promo">Promo</option>
                <option value="Evento">Evento</option>
                <option value="Aviso">Aviso</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-5 whitespace-nowrap">
              <input type="checkbox" checked={destacado} onChange={e => setDestacado(e.target.checked)} /> Destacar
            </label>
          </div>

          <div><label className="text-xs text-gray-500">Título</label><input className={field} value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120} /></div>
          <div><label className="text-xs text-gray-500">Mensaje</label><textarea className={field} rows={3} value={cuerpo} onChange={e => setCuerpo(e.target.value)} maxLength={1000} /></div>

          {/* Vigencia */}
          <div className="flex gap-2">
            <div className="flex-1"><label className="text-xs text-gray-500">Desde (opcional)</label><input type="datetime-local" className={field} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} /></div>
            <div className="flex-1"><label className="text-xs text-gray-500">Caduca (opcional)</label><input type="datetime-local" className={field} value={fechaExpiracion} onChange={e => setFechaExpiracion(e.target.value)} /></div>
          </div>

          {/* Imagen */}
          <div>
            <label className="text-xs text-gray-500">Imagen / flyer (opcional)</label>
            <div className="flex items-center gap-3 mt-1">
              {imagen
                ? <img src={buildImageUrl(imagen)} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                : <div className="w-20 h-20 rounded-xl bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-300"><ImagePlus width={22} height={22} /></div>}
              <div className="space-y-1">
                <label className="inline-flex items-center gap-1 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 font-medium cursor-pointer">
                  <ImagePlus width={15} height={15} /> {subiendo ? 'Subiendo…' : 'Subir imagen'}
                  <input type="file" accept="image/*" onChange={subir} className="hidden" disabled={subiendo} />
                </label>
                {imagen && <button onClick={() => setImagen('')} className="block text-xs text-gray-400 hover:text-rose-500">Quitar imagen</button>}
              </div>
            </div>
          </div>

          {/* Botón / acción */}
          <div>
            <label className="text-xs text-gray-500">Botón de acción</label>
            <select className={field} value={tipoAccion} onChange={e => setTipoAccion(e.target.value)}>
              <option value="Ninguna">Sin botón (solo informativa)</option>
              <option value="Reservar">Reservar (promo sobre servicios)</option>
              <option value="Enlace">Enlace externo (WhatsApp, web…)</option>
            </select>
          </div>

          {tipoAccion !== 'Ninguna' && (
            <div><label className="text-xs text-gray-500">Texto del botón</label><input className={field} value={textoBoton} onChange={e => setTextoBoton(e.target.value)} maxLength={40} /></div>
          )}

          {tipoAccion === 'Enlace' && (
            <div><label className="text-xs text-gray-500">URL del enlace</label><input className={field} value={urlAccion} onChange={e => setUrlAccion(e.target.value)} maxLength={300} /></div>
          )}

          {tipoAccion === 'Reservar' && (
            <>
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs text-gray-500">Precio promo S/ (opcional)</label><input type="number" min={0} step="0.5" className={field} value={precioPromo} onChange={e => setPrecioPromo(e.target.value)} /></div>
                <div className="flex-1"><label className="text-xs text-gray-500">% descuento (opcional)</label><input type="number" min={0} max={100} className={field} value={descuento} onChange={e => setDescuento(e.target.value)} /></div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Servicios de la promo</label>
                <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                  {serviciosSede.length === 0 && <p className="text-xs text-gray-400 px-1">No hay servicios en esta sede.</p>}
                  {serviciosSede.map((s: any) => {
                    const id = s.idServicio ?? s.id
                    return (
                      <label key={id} className="flex items-center gap-2 text-sm text-gray-700 px-1 py-0.5 cursor-pointer">
                        <input type="checkbox" checked={idServicios.includes(id)} onChange={() => toggleServicio(id)} />
                        <span className="flex-1 truncate">{s.nombre}</span>
                        <span className="text-xs text-gray-400">S/ {Number(s.precioBase ?? 0).toFixed(2)}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2">
            {editandoId && (
              <button onClick={limpiar} disabled={saving} className="inline-flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2.5 px-4 font-semibold disabled:opacity-50">
                Cancelar
              </button>
            )}
            <button onClick={guardar} disabled={saving || subiendo} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">
              {editandoId ? <Pencil width={16} height={16} /> : <Plus width={16} height={16} />}
              {saving ? 'Guardando…' : (editandoId ? 'Guardar cambios' : 'Publicar novedad')}
            </button>
          </div>
        </div>

        {lista.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Promociones publicadas</p>
            <div className="space-y-2">
              {lista.map(n => (
                <div key={n.idNovedad} className={`flex items-center gap-3 rounded-xl p-2.5 ${editandoId === n.idNovedad ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-gray-50'} ${!n.activo ? 'opacity-60' : ''}`}>
                  {n.urlImagen
                    ? <img src={buildImageUrl(n.urlImagen)} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0"><Gift width={16} height={16} /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {n.titulo}
                      {!n.activo && <span className="ml-2 text-[11px] font-semibold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">Pausada</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {n.tipo}{n.tipoAccion === 'Reservar' ? ' · Reservar' : n.tipoAccion === 'Enlace' ? ' · Enlace' : ''}
                      {' · '}❤️ {n.totalCorazones ?? 0} · 💬 {n.totalComentarios ?? 0}
                      {n.tipoAccion !== 'Ninguna' && ` · 👀 ${n.clicsAccion ?? 0}`}
                      {n.tipoAccion === 'Reservar' && ` · 🗓 ${n.reservasAtribuidas ?? 0}`}
                    </p>
                  </div>
                  <button onClick={() => setCampanaTarget(n)} className="shrink-0 text-gray-400 hover:text-emerald-600 p-1" aria-label="Enviar por correo" title="Enviar por correo a clientes">
                    <Mail width={16} height={16} />
                  </button>
                  <button onClick={() => cambiar(n)} className="shrink-0 text-gray-400 hover:text-gray-700 p-1" aria-label={n.activo ? 'Pausar' : 'Activar'} title={n.activo ? 'Pausar' : 'Activar'}>
                    {n.activo ? <EyeOff width={16} height={16} /> : <Eye width={16} height={16} />}
                  </button>
                  <button onClick={() => editarNovedad(n)} className="shrink-0 text-gray-400 hover:text-blue-600 p-1" aria-label="Editar"><Pencil width={16} height={16} /></button>
                  <button onClick={() => borrar(n.idNovedad)} className="shrink-0 text-gray-400 hover:text-rose-500 p-1" aria-label="Eliminar"><Trash2 width={16} height={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {campanaTarget && <CampanaModal novedad={campanaTarget} onClose={() => setCampanaTarget(null)} />}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Modal: enviar una promoción por CORREO a un segmento de clientes.
// La promo ya está publicada en el micrositio; esto la empuja por correo.
// ───────────────────────────────────────────────────────────────────────────
const SEGMENTOS_CAMPANA: { key: string; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'nuevo', label: 'Nuevos' },
  { key: 'frecuente', label: 'Frecuentes' },
  { key: 'inactivo', label: 'Inactivos' },
  { key: 'riesgo', label: 'En riesgo' },
]

function CampanaModal({ novedad, onClose }: { novedad: Novedad; onClose: () => void }) {
  const [segmento, setSegmento] = useState('')
  const [cobertura, setCobertura] = useState<CoberturaCampana | null>(null)
  const [cargandoCob, setCargandoCob] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Carga la cobertura cada vez que cambia el segmento.
  useEffect(() => {
    let vivo = true
    setCargandoCob(true)
    setCobertura(null)
    campanasService.cobertura(novedad.idNovedad, segmento || undefined)
      .then((c) => { if (vivo) setCobertura(c) })
      .catch(() => { if (vivo) setCobertura(null) })
      .finally(() => { if (vivo) setCargandoCob(false) })
    return () => { vivo = false }
  }, [segmento, novedad.idNovedad])

  const enviar = async () => {
    if (!cobertura || cobertura.seEnviaran <= 0) return
    setEnviando(true)
    try {
      const res = await campanasService.enviar(novedad.idNovedad, segmento || undefined)
      toast.success(res.mensaje || `Enviados ${res.enviados} correo(s)`)
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje ?? 'No se pudo enviar la campaña')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 text-gray-900">
            <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><Mail width={18} height={18} /></span>
            <div>
              <h3 className="font-bold leading-tight">Enviar por correo</h3>
              <p className="text-xs text-gray-500 truncate max-w-[230px]">{novedad.titulo}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X width={18} height={18} /></button>
        </div>

        <p className="text-sm text-gray-600 mt-2 mb-3">Elige a qué clientes enviar esta promoción. Solo llega a quienes tienen correo.</p>

        {/* Segmentos */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SEGMENTOS_CAMPANA.map((seg) => (
            <button
              key={seg.key || 'todos'}
              onClick={() => setSegmento(seg.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${segmento === seg.key ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-400'}`}>
              {seg.label}
            </button>
          ))}
        </div>

        {/* Cobertura */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-4 text-sm">
          {cargandoCob ? (
            <div className="flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Calculando cobertura…</div>
          ) : cobertura ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-gray-600">Clientes en el segmento</span><b className="text-gray-900">{cobertura.totalSegmento}</b></div>
              <div className="flex items-center justify-between"><span className="text-gray-600">Con correo (les llega)</span><b className="text-emerald-600">{cobertura.conCorreo}</b></div>
              {cobertura.sinCorreo > 0 && <div className="flex items-center justify-between"><span className="text-gray-600">Sin correo (no se envía)</span><b className="text-amber-600">{cobertura.sinCorreo}</b></div>}
              {cobertura.cuotaRestante !== null && <div className="flex items-center justify-between"><span className="text-gray-600">Cuota de correos este mes</span><b className="text-gray-900">{cobertura.cuotaRestante}</b></div>}
              <div className="flex items-center justify-between pt-1.5 border-t border-gray-200"><span className="font-semibold text-gray-700">Se enviarán</span><b className="text-emerald-700 text-base">{cobertura.seEnviaran}</b></div>
              {cobertura.cuotaInsuficiente && <p className="text-xs text-amber-600 mt-1">Tu plan no alcanza para todos este mes. Se enviarán los primeros {cobertura.seEnviaran}.</p>}
            </div>
          ) : (
            <div className="text-gray-400">No se pudo calcular la cobertura.</div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button
            onClick={enviar}
            disabled={enviando || !cobertura || cobertura.seEnviaran <= 0}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send width={15} height={15} />}
            {enviando ? 'Enviando…' : cobertura ? `Enviar a ${cobertura.seEnviaran}` : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────── IMPORTAR CLIENTES ───────────────────────────
// Modal estilo Fresha: sube CSV o Excel (nombre, teléfono, correo), previsualiza
// con validación (duplicados, filas inválidas) y confirma la importación.
type FilaImport = {
  nombre: string
  telefono: string
  correo: string
  _estado: 'ok' | 'dup' | 'invalido'
  _motivo?: string
}

function ImportarClientesModal({
  sedeActual, sedeNombre, onClose, onDone,
}: {
  sedeActual: number
  sedeNombre: string
  onClose: () => void
  onDone: () => void
}) {
  const [paso, setPaso] = useState<'subir' | 'preview' | 'hecho'>('subir')
  const [filas, setFilas] = useState<FilaImport[]>([])
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState<{ creados: number; omitidos: number } | null>(null)

  const validas = filas.filter((f) => f._estado === 'ok')
  const duplicadas = filas.filter((f) => f._estado === 'dup')
  const invalidas = filas.filter((f) => f._estado === 'invalido')

  // Normalizadores básicos.
  const normTel = (t: string) => (t || '').replace(/[^\d+]/g, '').trim()
  const normMail = (c: string) => (c || '').trim().toLowerCase()
  const mailValido = (c: string) => !c || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)

  // Detecta a qué columna corresponde cada encabezado (flexible con los nombres).
  const mapearColumnas = (headers: string[]) => {
    const idx = { nombre: -1, telefono: -1, correo: -1 }
    headers.forEach((h, i) => {
      const k = (h || '').toString().trim().toLowerCase()
      if (idx.nombre < 0 && /(nombre|name|cliente|completo)/.test(k)) idx.nombre = i
      else if (idx.telefono < 0 && /(tel|phone|celular|móvil|movil|whatsapp|número|numero)/.test(k)) idx.telefono = i
      else if (idx.correo < 0 && /(correo|email|mail|e-mail)/.test(k)) idx.correo = i
    })
    return idx
  }

  // Convierte filas crudas (array de arrays) en FilaImport validadas.
  const construirFilas = (matriz: any[][]) => {
    if (!matriz.length) { toast.error('El archivo está vacío'); return }
    // ¿La primera fila es encabezado? Si contiene palabras clave, sí.
    const head = matriz[0].map((x) => (x ?? '').toString())
    const idx = mapearColumnas(head)
    const tieneHeader = idx.nombre >= 0 || idx.telefono >= 0 || idx.correo >= 0
    // Si no hay encabezado reconocible, asumimos orden: nombre, teléfono, correo.
    const map = tieneHeader ? idx : { nombre: 0, telefono: 1, correo: 2 }
    const cuerpo = tieneHeader ? matriz.slice(1) : matriz

    const vistos = new Set<string>()
    const out: FilaImport[] = []
    for (const row of cuerpo) {
      const nombre = (row[map.nombre] ?? '').toString().trim()
      const telefono = normTel((row[map.telefono] ?? '').toString())
      const correo = normMail((row[map.correo] ?? '').toString())
      if (!nombre && !telefono && !correo) continue // fila totalmente vacía: ignorar

      let estado: FilaImport['_estado'] = 'ok'
      let motivo: string | undefined
      if (!telefono && !correo) { estado = 'invalido'; motivo = 'Sin teléfono ni correo' }
      else if (!mailValido(correo)) { estado = 'invalido'; motivo = 'Correo inválido' }
      else {
        const clave = telefono || correo
        if (vistos.has(clave)) { estado = 'dup'; motivo = 'Repetido en el archivo' }
        else vistos.add(clave)
      }
      out.push({ nombre: nombre || '(sin nombre)', telefono, correo, _estado: estado, _motivo: motivo })
    }
    setFilas(out)
    setPaso('preview')
  }

  // Lee el archivo según su tipo (CSV o Excel).
  const onArchivo = async (file: File) => {
    setNombreArchivo(file.name)
    try {
      const esCsv = /\.csv$/i.test(file.name)
      if (esCsv) {
        const texto = await file.text()
        // Parse CSV simple (separador coma o punto y coma), respeta comillas básicas.
        const sep = texto.includes(';') && !texto.includes(',') ? ';' : ','
        const matriz = texto.split(/\r?\n/).filter((l) => l.trim().length).map((linea) => {
          const celdas: string[] = []
          let cur = '', dentro = false
          for (const ch of linea) {
            if (ch === '"') dentro = !dentro
            else if (ch === sep && !dentro) { celdas.push(cur); cur = '' }
            else cur += ch
          }
          celdas.push(cur)
          return celdas.map((c) => c.trim())
        })
        construirFilas(matriz)
      } else {
        // Excel: usa SheetJS (xlsx ya está en el proyecto).
        const XLSX = await import('xlsx')
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const matriz = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false })
        construirFilas(matriz)
      }
    } catch (e) {
      console.error(e)
      toast.error('No se pudo leer el archivo. Revisa el formato.')
    }
  }

  const confirmar = async () => {
    if (validas.length === 0) { toast.error('No hay clientes válidos para importar'); return }
    setProcesando(true)
    try {
      const res = await clientesService.importarClientes(
        sedeActual,
        validas.map((f) => ({ nombre: f.nombre, telefono: f.telefono, correo: f.correo })),
      )
      setResultado({ creados: res?.creados ?? validas.length, omitidos: res?.omitidos ?? 0 })
      setPaso('hecho')
    } catch (e: any) {
      console.error(e)
      toast.error(e?.response?.data?.mensaje || 'No se pudo importar. Intenta de nuevo.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus width={18} height={18} className="text-blue-600" /> Importar clientes
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar"><X width={18} height={18} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Trae tu base de clientes desde otro sistema (Fresha, Excel, etc.) a <strong>{sedeNombre}</strong>.
          Acepta archivos <strong>CSV</strong> o <strong>Excel</strong> con columnas: nombre, teléfono y correo.
        </p>

        {/* PASO 1: subir */}
        {paso === 'subir' && (
          <div>
            <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onArchivo(f) }}
              />
              <Upload width={28} height={28} className="mx-auto text-blue-500 mb-2" />
              <p className="text-sm font-semibold text-gray-700">Haz clic para elegir un archivo</p>
              <p className="text-xs text-gray-400 mt-1">CSV, XLSX o XLS · primera fila puede ser el encabezado</p>
            </label>
            <div className="mt-4 bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
              <p className="font-semibold text-gray-600 mb-1">Formato esperado (ejemplo):</p>
              <code className="block bg-white rounded-lg p-2 border border-gray-200 text-gray-700">
                nombre, telefono, correo<br />
                Juan Pérez, 999888777, juan@correo.com<br />
                Ana Torres, 988777666, ana@correo.com
              </code>
            </div>
          </div>
        )}

        {/* PASO 2: preview */}
        {paso === 'preview' && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                <CheckCircle2 width={13} height={13} /> {validas.length} válidos
              </span>
              {duplicadas.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
                  {duplicadas.length} repetidos
                </span>
              )}
              {invalidas.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-semibold">
                  <AlertCircle width={13} height={13} /> {invalidas.length} con error
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-2 truncate">Archivo: {nombreArchivo}</p>

            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-gray-500">
                    <th className="py-2 px-2.5 font-medium">Nombre</th>
                    <th className="py-2 px-2.5 font-medium">Teléfono</th>
                    <th className="py-2 px-2.5 font-medium">Correo</th>
                    <th className="py-2 px-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(0, 100).map((f, i) => (
                    <tr key={i} className={`border-t border-gray-100 ${f._estado === 'invalido' ? 'bg-red-50/50' : f._estado === 'dup' ? 'bg-amber-50/40' : ''}`}>
                      <td className="py-1.5 px-2.5 text-gray-800">{f.nombre}</td>
                      <td className="py-1.5 px-2.5 text-gray-600">{f.telefono || '—'}</td>
                      <td className="py-1.5 px-2.5 text-gray-600 truncate max-w-[140px]">{f.correo || '—'}</td>
                      <td className="py-1.5 px-2.5">
                        {f._estado === 'ok' && <CheckCircle2 width={14} height={14} className="text-emerald-500" />}
                        {f._estado !== 'ok' && <span className="text-[10px] text-gray-400" title={f._motivo}>{f._motivo}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filas.length > 100 && <p className="text-[11px] text-gray-400 mt-1">Mostrando 100 de {filas.length} filas. Se importarán todas las válidas.</p>}

            <div className="flex gap-2 mt-4">
              <button onClick={() => { setPaso('subir'); setFilas([]) }} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Atrás</button>
              <button
                onClick={confirmar}
                disabled={procesando || validas.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus width={15} height={15} />}
                {procesando ? 'Importando…' : `Importar ${validas.length}`}
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: hecho */}
        {paso === 'hecho' && resultado && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 width={30} height={30} className="text-emerald-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">¡Importación completa!</h4>
            <p className="text-sm text-gray-500 mt-1">
              Se agregaron <strong>{resultado.creados}</strong> cliente(s) a {sedeNombre}.
              {resultado.omitidos > 0 && <> {resultado.omitidos} ya existían y se omitieron.</>}
            </p>
            <button onClick={onDone} className="mt-5 w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              Ver mis clientes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Abre el monedero del cliente REAL a partir de su teléfono.
 *
 * El listado de Clientes es una vista agregada (reservas + importados): su
 * `idCliente` NO es un cliente real. La identidad válida para fidelización es el
 * TELÉFONO, así que lo resolvemos contra la tabla real antes de pintar nada.
 */
function MonederoDelCliente({ telefono, idClienteReal }: { telefono?: string; idClienteReal?: number | null }) {
  const [idReal, setIdReal] = useState<number | null>(idClienteReal ?? null)
  const [cargando, setCargando] = useState(!idClienteReal)

  useEffect(() => {
    let vivo = true

    // El listado YA trae la identidad REAL (la resuelve el backend a partir de las
    // ventas y los monederos del negocio). Si viene, no hay que preguntar nada:
    // abrimos su monedero directamente.
    if (idClienteReal) { setIdReal(idClienteReal); setCargando(false); return }

    // Fallback: resolver por TELÉFONO (la llave natural del cliente).
    const tel = (telefono || '').trim()
    if (!tel) { setIdReal(null); setCargando(false); return }
    setCargando(true)
    clientesService.buscarRealPorTelefono(tel)
      .then((c) => { if (vivo) setIdReal(c?.idCliente ?? null) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [telefono, idClienteReal])

  if (cargando) return null

  if (!idReal) {
    // OJO con el mensaje: lo que falta NO es "el celular", es un Cliente REAL.
    // El monedero cuelga de IdCliente, no del teléfono. Pasa que una reserva
    // anónima NO crea Cliente (ReservaService: `IdCliente = idClienteAutenticado`,
    // anónimo → null): solo deja snapshots de nombre/teléfono/correo. Por eso
    // alguien puede tener 11 reservas y ningún registro real detrás.
    //
    // Y el celular sí es la llave para darle de alta: en el mostrador el barbero
    // no puede identificarlo por correo, y Google Wallet nunca nos entrega ni el
    // correo ni el teléfono del usuario. Por eso pedimos el celular.
    return (
      <p style={{ fontSize: 12, color: '#9ca3af', padding: '8px 0', lineHeight: 1.5 }}>
        {telefono?.trim()
          ? 'Este cliente aún no está en el programa de puntos. Se inscribe solo al cobrarle una venta con su celular, o escaneando el QR del local.'
          : 'Este cliente reservó sin dejar celular, así que todavía no tiene una ficha real a la que acreditarle puntos. Pídele el celular en su próxima visita y regístralo desde la Venta rápida — o que escanee el QR del local.'}
      </p>
    )
  }

  return <MonederoClienteCard idCliente={idReal} />
}
