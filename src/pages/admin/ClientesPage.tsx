import { useState, useEffect } from 'react'
import { clientesService, Cliente } from '@/services/clientesService'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ConfirmDialog'
import { Eye, Unlock, Search, Phone, Mail, Calendar, MessageSquare, Users, Info, X, Gift, Plus, Trash2, ImagePlus, ShieldCheck, Pencil, EyeOff } from 'lucide-react'
import { AdminLayout } from '@/components/AdminLayout'
import { novedadesService, type Novedad } from '@/services/novedadesService'
import { buildImageUrl } from '@/services/apiClient'
import s from '@/styles/Clientes.module.css'
import { serviciosService } from '@/services/serviciosService'
import { ModeracionNovedadesModal } from '@/components/ModeracionNovedadesModal'

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [visibleMobile, setVisibleMobile] = useState(8)   // "Ver más" solo en móvil
  const [novedadOpen, setNovedadOpen] = useState(false)   // modal "Nueva novedad"
  const [moderacionOpen, setModeracionOpen] = useState(false) // modal "Moderación"

  // Al recargar la lista (búsqueda/refresh) reseteamos el "Ver más" de móvil.
  useEffect(() => { setVisibleMobile(8) }, [clientes])

  useEffect(() => {
    loadClientes()
  }, [])

  const loadClientes = async () => {
    try {
      setLoading(true)
      const data = await clientesService.getClientes(1, 20, searchTerm || undefined)
      setClientes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando clientes:', error)
      toast.error('Error al cargar clientes')
      setClientes([])
    } finally {
      setLoading(false)
    }
  }

  // Recargar cuando cambia el término de búsqueda (debounce)
  useEffect(() => {
    const timer = setTimeout(() => { loadClientes() }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const handleViewDetails = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setShowDetailModal(true)
  }

  const handleDesbloquear = async (id: number) => {
    if (!(await confirmDialog({
      title: 'Desbloquear cliente',
      message: '¿Deseas desbloquear este cliente? Recuperará el acceso para reservar.',
      confirmText: 'Desbloquear',
      cancelText: 'Cancelar',
    }))) return
    try {
      await clientesService.desbloquearCliente(id)
      toast.success('Cliente desbloqueado')
      await loadClientes()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al desbloquear cliente')
    }
  }

  // Las "promociones" son novedades in-app para TODOS los clientes de la sede.
  // (Se conserva la firma para no tocar los botones que ya la llaman.)
  const handleEnviarMensaje = (_cliente?: Cliente) => {
    setShowDetailModal(false)
    setNovedadOpen(true)
  }

  // Estadísticas
  const totalClientes = clientes.length
  const clientesActivos = clientes.filter((c) => !c.bloqueadoWeb).length
  const clientesBloqueados = clientes.filter((c) => c.bloqueadoWeb).length

  const fecha = (d?: string, largo = false) =>
    d ? new Date(d).toLocaleDateString('es-PE', largo ? { year: 'numeric', month: 'long', day: 'numeric' } : undefined) : 'N/A'

  return (
    <AdminLayout title="Clientes" subtitle="Tu base de clientes">
      <div className={s.note}>
        <Info width={16} height={16} />
        <span>Los clientes se registran automáticamente al reservar. Aquí puedes ver su detalle, historial y controlar su acceso.</span>
      </div>

      {/* KPIs */}
      <div className={s.kpis}>
        <div className={s.kpi}>
          <div className={s.kpiTop}>
            <div className={`${s.kpiIcon} ${s.kpiBlue}`}><Users width={20} height={20} /></div>
            <span className={s.kpiLabel}>Total de clientes</span>
          </div>
          <div className={s.kpiValue}>{totalClientes}</div>
          <div className={s.kpiHint}>Registrados en el sistema</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiTop}>
            <div className={`${s.kpiIcon} ${s.kpiGreen}`}><Unlock width={20} height={20} /></div>
            <span className={s.kpiLabel}>Clientes activos</span>
          </div>
          <div className={`${s.kpiValue} ${s.kpiValueGreen}`}>{clientesActivos}</div>
          <div className={s.kpiHint}>Con acceso habilitado</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiTop}>
            <div className={`${s.kpiIcon} ${s.kpiRed}`}><Users width={20} height={20} /></div>
            <span className={s.kpiLabel}>Clientes bloqueados</span>
          </div>
          <div className={`${s.kpiValue} ${s.kpiValueRed}`}>{clientesBloqueados}</div>
          <div className={s.kpiHint}>Por inasistencias</div>
        </div>
      </div>

      {/* Acciones: moderar + publicar novedad */}
      <div className="flex justify-end gap-2 mb-3">
        <button onClick={() => setModeracionOpen(true)} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-4 py-2 text-sm font-semibold transition">
          <ShieldCheck width={16} height={16} /> Moderación
        </button>
        <button onClick={() => setNovedadOpen(true)} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition">
          <Gift width={16} height={16} /> Nueva novedad
        </button>
      </div>

      {/* Buscador */}
      <div className={s.searchWrap}>
        <Search className={s.searchIcon} width={18} height={18} />
        <input
          className={s.searchInput}
          type="text"
          placeholder="Buscar por nombre, teléfono o correo..."
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
                      <td className={s.cellName}>{cliente.nombreCompleto}</td>
                      <td><span className={s.cellIcon}><Phone width={14} height={14} /> {cliente.telefono}</span></td>
                      <td><span className={s.cellIcon}><Mail width={14} height={14} /> {cliente.correo || 'Sin email'}</span></td>
                      <td><span className={s.countPill}>{cliente.totalReservas || 0}</span></td>
                      <td>
                        <span className={`${s.badge} ${cliente.bloqueadoWeb ? s.badgeBlocked : s.badgeActive}`}>
                          {cliente.bloqueadoWeb ? '🚫 Bloqueado' : '✅ Activo'}
                        </span>
                      </td>
                      <td><span className={s.cellIcon}><Calendar width={14} height={14} /> {fecha(cliente.fechaCreacion)}</span></td>
                      <td>
                        <div className={s.rowActions}>
                          <button className={`${s.actBtn} ${s.actView}`} onClick={() => handleViewDetails(cliente)} title="Ver detalles" aria-label="Ver detalles"><Eye width={16} height={16} /></button>
                          <button className={`${s.actBtn} ${s.actMsg}`} onClick={() => handleEnviarMensaje(cliente)} title="Enviar mensaje" aria-label="Enviar mensaje"><MessageSquare width={16} height={16} /></button>
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
                    <p className="font-semibold text-gray-900 truncate">{cliente.nombreCompleto || 'Sin nombre'}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><Phone width={13} height={13} /> {cliente.telefono}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 truncate"><Mail width={13} height={13} /> {cliente.correo || 'Sin email'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`${s.badge} ${cliente.bloqueadoWeb ? s.badgeBlocked : s.badgeActive}`}>
                        {cliente.bloqueadoWeb ? '🚫 Bloqueado' : '✅ Activo'}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar width={12} height={12} /> {cliente.totalReservas || 0} reservas</span>
                    </div>
                  </div>
                  <div className={s.rowActions}>
                    <button className={`${s.actBtn} ${s.actView}`} onClick={() => handleViewDetails(cliente)} aria-label="Ver detalles"><Eye width={16} height={16} /></button>
                    <button className={`${s.actBtn} ${s.actMsg}`} onClick={() => handleEnviarMensaje(cliente)} aria-label="Enviar mensaje"><MessageSquare width={16} height={16} /></button>
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

            <div className={s.modalActions}>
              <button className={s.btnMsg} onClick={() => handleEnviarMensaje(selectedCliente)}><MessageSquare width={16} height={16} /> Enviar promoción</button>
              {selectedCliente.bloqueadoWeb && (
                <button className={s.btnUnlock} onClick={() => { handleDesbloquear(selectedCliente.idCliente!); setShowDetailModal(false) }}><Unlock width={16} height={16} /> Desbloquear cliente</button>
              )}
              <button className={s.btnClose} onClick={() => setShowDetailModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {novedadOpen && <NovedadModal onClose={() => setNovedadOpen(false)} />}
      {moderacionOpen && <ModeracionNovedadesModal onClose={() => setModeracionOpen(false)} />}
    </AdminLayout>
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
        <p className="text-xs text-gray-500 mb-4">La verán <strong>todos los clientes</strong> de tu sede en su muro de Novedades.</p>

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

          <div><label className="text-xs text-gray-500">Título</label><input className={field} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej.: 2x1 en cortes este finde" maxLength={120} /></div>
          <div><label className="text-xs text-gray-500">Mensaje</label><textarea className={field} rows={3} value={cuerpo} onChange={e => setCuerpo(e.target.value)} placeholder="Describe la promoción, evento o novedad…" maxLength={1000} /></div>

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
            <div><label className="text-xs text-gray-500">Texto del botón</label><input className={field} value={textoBoton} onChange={e => setTextoBoton(e.target.value)} placeholder="Lo quiero" maxLength={40} /></div>
          )}

          {tipoAccion === 'Enlace' && (
            <div><label className="text-xs text-gray-500">URL del enlace</label><input className={field} value={urlAccion} onChange={e => setUrlAccion(e.target.value)} placeholder="https://wa.me/51999999999" maxLength={300} /></div>
          )}

          {tipoAccion === 'Reservar' && (
            <>
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs text-gray-500">Precio promo S/ (opcional)</label><input type="number" min={0} step="0.5" className={field} value={precioPromo} onChange={e => setPrecioPromo(e.target.value)} placeholder="50" /></div>
                <div className="flex-1"><label className="text-xs text-gray-500">% descuento (opcional)</label><input type="number" min={0} max={100} className={field} value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="20" /></div>
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
            <p className="text-xs font-semibold text-gray-500 mb-2">Novedades publicadas</p>
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
    </div>
  )
}
