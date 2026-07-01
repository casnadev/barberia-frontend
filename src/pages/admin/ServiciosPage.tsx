import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, X, Eye, EyeOff, Upload, Image as ImageIcon, Tag, AlertCircle, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ComboBox } from '@/components/ComboBox'
import { toast } from 'sonner'
import { apiClient, getActiveTenant } from '@/services/apiClient'
import { sedeTenantService } from '@/services/sedeTenantService'
import s from '@/styles/Servicios.module.css'

interface Servicio {
  idServicio?: number
  nombre: string
  descripcionCorta?: string
  precioBase?: number
  duracionMinutos: number
  urlImagen?: string
  esDestacado?: boolean
  estado?: boolean
  fechaCreacion?: string
  idCategoria: number
  nombreCategoria?: string
}

interface Categoria {
  idCategoria: number
  idSede?: number
  nombre: string
  descripcion?: string
  orden?: number
  estaActivo?: boolean
}

export function ServiciosPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [idSede, setIdSede] = useState<number>(0)

  // Servicio (modal)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [previewImage, setPreviewImage] = useState<string>('')
  const [form, setForm] = useState<Servicio>({
    nombre: '', descripcionCorta: '', precioBase: 0, duracionMinutos: 30,
    urlImagen: '', esDestacado: false, estado: true, idCategoria: 0,
  })

  // Filtro por categoría
  const [filterCat, setFilterCat] = useState<number | null>(null)

  // Gestor de categorías (modal)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catForm, setCatForm] = useState({ nombre: '', descripcion: '', orden: 1 })
  const [catEditingId, setCatEditingId] = useState<number | 'new' | null>(null)
  const [catSubmitting, setCatSubmitting] = useState(false)
  const [catConfirmDelete, setCatConfirmDelete] = useState<number | null>(null)

  // ========== CARGA ==========
  // Lista de servicios cacheada con React Query (navegación instantánea al revisitar).
  const {
    data: servicios = [],
    isLoading: loading,
    isError,
    refetch,
  } = useQuery<Servicio[]>({
    queryKey: ['servicios', 'admin-todos'],
    queryFn: async () => {
      const res = await apiClient.get('/api/Servicios/admin/todos')
      const data = res.data.data || res.data
      return Array.isArray(data) ? data : []
    },
  })
  const loadServicios = () => refetch()

  useEffect(() => {
    if (isError) toast.error('Error cargando servicios')
  }, [isError])

  const loadCategorias = async (sedeId: number) => {
    try {
      const path = sedeId ? `/api/Categorias/sede/${sedeId}` : '/api/Categorias/sede/1'
      const res = await apiClient.get(path)
      const data = res.data.data ?? res.data
      setCategorias(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('Error cargando categorías:', err.message)
      toast.error('Error cargando categorías')
    }
  }

  useEffect(() => {
    ;(async () => {
      let id = 0
      try {
        const sedes = await sedeTenantService.getMisSedes()
        const activa = sedes.find((x) => x.subdominio === getActiveTenant()) ?? sedes[0]
        id = activa?.idSede ?? 0
      } catch {
        id = 0
      }
      setIdSede(id)
      loadCategorias(id)
    })()
  }, [])

  // ========== UPLOAD IMAGEN ==========
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('archivo', file)
      const res = await apiClient.post('/api/Upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const urlImagen = res.data.data?.url || res.data.data?.Url
      setForm((prev) => ({ ...prev, urlImagen }))
      setPreviewImage(urlImagen)
      toast.success('Imagen subida correctamente')
    } catch (err: any) {
      console.error('Error subiendo imagen:', err)
      toast.error(err.response?.data?.message || 'Error al subir imagen')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  // ========== HELPERS ==========
  const nombreCategoria = (id: number) => categorias.find((c) => c.idCategoria === id)?.nombre
  const countServicios = (catId: number) => servicios.filter((sv) => sv.idCategoria === catId).length

  const filtrados = filterCat == null ? servicios : servicios.filter((sv) => sv.idCategoria === filterCat)
  const serviciosActivos = filtrados.filter((sv) => sv.estado)
  const serviciosInactivos = filtrados.filter((sv) => !sv.estado)

  // ========== CRUD SERVICIO ==========
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.precioBase || !form.idCategoria) {
      toast.error('Completa: nombre, precio y categoría')
      return
    }
    try {
      setSubmitting(true)
      const payload = {
        nombre: form.nombre,
        descripcionCorta: form.descripcionCorta,
        precioBase: form.precioBase,
        duracionMinutos: form.duracionMinutos,
        urlImagen: form.urlImagen,
        esDestacado: form.esDestacado,
        estado: form.estado,
        idCategoria: form.idCategoria,
      }
      if (editingId) {
        await apiClient.put(`/api/Servicios/${editingId}`, payload)
        toast.success('Servicio actualizado')
      } else {
        await apiClient.post('/api/Servicios', payload)
        toast.success('Servicio creado')
      }
      setShowModal(false)
      resetForm()
      loadServicios()
    } catch (err: any) {
      console.error('Error guardando:', err)
      toast.error(err.response?.data?.message || 'Error guardando servicio')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (servicio: Servicio) => {
    setForm({
      nombre: servicio.nombre,
      descripcionCorta: servicio.descripcionCorta,
      precioBase: servicio.precioBase,
      duracionMinutos: servicio.duracionMinutos,
      urlImagen: servicio.urlImagen,
      esDestacado: servicio.esDestacado,
      estado: servicio.estado,
      idCategoria: servicio.idCategoria,
    })
    setPreviewImage(servicio.urlImagen && servicio.urlImagen !== 'string' ? servicio.urlImagen : '')
    setEditingId(servicio.idServicio || null)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    try {
      setSubmitting(true)
      await apiClient.delete(`/api/Servicios/${id}`)
      toast.success('Servicio eliminado')
      setDeleteConfirm(null)
      loadServicios()
    } catch (err: any) {
      console.error('Error eliminando:', err)
      toast.error(err.response?.data?.message || 'Error eliminando servicio')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({
      nombre: '', descripcionCorta: '', precioBase: 0, duracionMinutos: 30,
      urlImagen: '', esDestacado: false, estado: true,
      idCategoria: categorias.length > 0 ? categorias[0].idCategoria : 0,
    })
    setPreviewImage('')
    setEditingId(null)
  }

  // ========== CRUD CATEGORÍA ==========
  const resetCatForm = () => {
    setCatForm({ nombre: '', descripcion: '', orden: categorias.length + 1 })
    setCatEditingId(null)
  }

  const nuevaCategoria = () => {
    setCatForm({ nombre: '', descripcion: '', orden: categorias.length + 1 })
    setCatEditingId('new')
    setCatConfirmDelete(null)
  }

  const editCategoria = (cat: Categoria) => {
    setCatForm({ nombre: cat.nombre, descripcion: cat.descripcion || '', orden: cat.orden ?? 1 })
    setCatEditingId(cat.idCategoria)
    setCatConfirmDelete(null)
  }

  const saveCategoria = async () => {
    if (!catForm.nombre.trim()) {
      toast.error('El nombre de la categoría es obligatorio')
      return
    }
    try {
      setCatSubmitting(true)
      // Body exacto que espera el backend (idSede va en la ruta, no en el body)
      const payload = {
        nombre: catForm.nombre.trim(),
        descripcion: catForm.descripcion,
        orden: catForm.orden,
        estaActivo: true, // evita que el backend desactive la categoría al editar
      }
      if (typeof catEditingId === 'number') {
        // ⚠️ CONFIRMAR en Swagger la ruta exacta del PUT (la dejé como /{id})
        await apiClient.put(`/api/Categorias/${catEditingId}`, payload)
        toast.success('Categoría actualizada')
      } else {
        // ✅ Confirmado por Swagger: POST /api/Categorias/sede/{idSede}
        await apiClient.post(`/api/Categorias/sede/${idSede}`, payload)
        toast.success('Categoría creada')
      }
      resetCatForm()
      await loadCategorias(idSede)
    } catch (err: any) {
      console.error('Error guardando categoría:', err)
      toast.error(err.response?.data?.message || 'Error guardando categoría')
    } finally {
      setCatSubmitting(false)
    }
  }

  const deleteCategoria = async (id: number) => {
    try {
      await apiClient.delete(`/api/Categorias/${id}`)
      toast.success('Categoría eliminada')
      setCatConfirmDelete(null)
      if (filterCat === id) setFilterCat(null)
      await loadCategorias(idSede)
    } catch (err: any) {
      console.error('Error eliminando categoría:', err)
      toast.error(err.response?.data?.message || 'No se pudo eliminar la categoría')
    }
  }

  // ========== CARD ==========
  const renderCard = (servicio: Servicio, inactivo: boolean) => (
    <motion.div
      key={servicio.idServicio}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${s.card} ${inactivo ? s.cardInactive : ''}`}
    >
      <div className={s.media}>
        {servicio.urlImagen && servicio.urlImagen !== 'string'
          ? <img src={servicio.urlImagen} alt={servicio.nombre} />
          : <div className={s.mediaEmpty}><ImageIcon width={30} height={30} /></div>}
        <div className={s.cardActions}>
          <button className={s.iconBtn} onClick={() => handleEdit(servicio)} title="Editar" aria-label="Editar">
            <Edit2 width={15} height={15} />
          </button>
          <button className={`${s.iconBtn} ${s.iconBtnDanger}`} onClick={() => setDeleteConfirm(servicio.idServicio || null)} title="Eliminar" aria-label="Eliminar">
            <Trash2 width={15} height={15} />
          </button>
        </div>
      </div>
      <div className={s.cardFooter}>
        <h3 className={`${s.cardName} ${inactivo ? s.cardNameInactive : ''}`}>{servicio.nombre}</h3>
        <div className={s.badges}>
          <span className={`${s.badge} ${s.badgeCat}`}>{servicio.nombreCategoria || nombreCategoria(servicio.idCategoria) || 'Sin categoría'}</span>
          {servicio.esDestacado && <span className={`${s.badge} ${s.badgeStar}`}>⭐ Destacado</span>}
          {inactivo && <span className={`${s.badge} ${s.badgeInactive}`}>Inactivo</span>}
        </div>
        <div className={s.cardMeta}>
          <span className={s.price}>S/ {(servicio.precioBase || 0).toFixed(2)}</span>
          <span className={s.dot}>•</span>
          <span className={s.dur}>{servicio.duracionMinutos} min</span>
        </div>
      </div>
    </motion.div>
  )

  if (loading) {
    return (
      <>
        <div className={s.loading}>
          <div className={s.loadingInner}>
            <div className={s.spinner} />
            <p className={s.loadingText}>Cargando servicios...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className={s.toolbar}>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          className={s.newBtn}
          onClick={() => { resetForm(); setShowModal(true) }}
        >
          <Plus width={18} height={18} /> Nuevo servicio
        </motion.button>
      </div>

      {/* Barra de categorías: desplegable (limpio) + gestionar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="relative inline-flex items-center flex-1 min-w-[180px] sm:flex-initial sm:min-w-[220px]">
          <Tag width={15} height={15} className="absolute left-3 text-blue-600 pointer-events-none" />
          <select
            value={filterCat ?? ''}
            onChange={(e) => setFilterCat(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm font-semibold text-gray-800 cursor-pointer hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.idCategoria} value={cat.idCategoria}>{cat.nombre}</option>
            ))}
          </select>
          <ChevronDown width={16} height={16} className="absolute right-3 text-gray-400 pointer-events-none" />
        </div>
        <button className={s.manageCatsBtn} onClick={() => { resetCatForm(); setCatModalOpen(true) }}>
          <Tag width={15} height={15} /> Gestionar categorías
        </button>
      </div>

      {servicios.length === 0 && (
        <div className={s.empty}>No hay servicios registrados todavía.</div>
      )}
      {servicios.length > 0 && filtrados.length === 0 && (
        <div className={s.empty}>No hay servicios en esta categoría.</div>
      )}

      {serviciosActivos.length > 0 && (
        <section className={s.section}>
          <div className={s.sectionHead}>
            <Eye width={18} height={18} color="#16a34a" />
            <h2 className={s.sectionTitle}>Activos ({serviciosActivos.length})</h2>
          </div>
          <div className={s.grid}>{serviciosActivos.map((sv) => renderCard(sv, false))}</div>
        </section>
      )}

      {serviciosInactivos.length > 0 && (
        <section className={s.section}>
          <div className={s.sectionHead}>
            <EyeOff width={18} height={18} color="#9ca3af" />
            <h2 className={s.sectionTitleMuted}>Desactivados ({serviciosInactivos.length})</h2>
          </div>
          <div className={s.grid}>{serviciosInactivos.map((sv) => renderCard(sv, true))}</div>
        </section>
      )}

      {/* Modal crear/editar servicio */}
      <AnimatePresence>
        {showModal && (
          <motion.div className={s.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}>
            <motion.div className={s.modal} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <button className={s.modalCloseFloat} onClick={() => setShowModal(false)} aria-label="Cerrar"><X width={18} height={18} /></button>

              <form className={s.form} onSubmit={handleSubmit}>
                <div className={s.field}>
                  <label className={s.label}>Imagen</label>
                  <div className={s.mediaRow}>
                    <div className={s.thumb}>
                      {previewImage ? <img src={previewImage} alt="Preview" /> : <ImageIcon width={22} height={22} />}
                      {previewImage && <button type="button" className={s.thumbRemove} onClick={() => { setPreviewImage(''); setForm({ ...form, urlImagen: '' }) }} aria-label="Quitar imagen"><X width={12} height={12} /></button>}
                    </div>
                    <label className={s.uploadLabel}>
                      <Upload width={16} height={16} />
                      {uploadingImage ? 'Subiendo...' : (previewImage ? 'Cambiar imagen' : 'Seleccionar imagen')}
                      <input className={s.uploadInput} type="file" accept="image/*" onChange={handleUploadImage} disabled={uploadingImage} />
                    </label>
                  </div>
                </div>

                <div className={s.field}>
                  <label className={s.label}>Nombre *</label>
                  <input className={s.input} type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>

                <div className={s.field}>
                  <label className={s.label}>Descripción corta</label>
                  <textarea className={s.textarea} value={form.descripcionCorta || ''} onChange={(e) => setForm({ ...form, descripcionCorta: e.target.value })} rows={2} />
                </div>

                <div className={s.row2}>
                  <div className={s.field}>
                    <label className={s.label}>Precio (S/) *</label>
                    <input className={s.input} type="number" value={form.precioBase || ''} onChange={(e) => setForm({ ...form, precioBase: parseFloat(e.target.value) })} min="0" step="0.01" />
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Duración (min)</label>
                    <input className={s.input} type="number" value={form.duracionMinutos} onChange={(e) => setForm({ ...form, duracionMinutos: parseInt(e.target.value) })} min="5" step="5" />
                  </div>
                </div>

                <div className={s.field}>
                  <label className={s.label}>Categoría *</label>
                  <ComboBox
                    value={form.idCategoria || ''}
                    onChange={(v) => setForm({ ...form, idCategoria: v === '' ? 0 : Number(v) })}
                    opciones={categorias.map((cat) => ({ valor: cat.idCategoria, etiqueta: cat.nombre }))}
                    inputClassName={s.select}
                  />
                  {categorias.length === 0 && (
                    <p className={s.hint}>No hay categorías. Crea una desde "Gestionar categorías".</p>
                  )}
                </div>

                <div className={s.row2}>
                  <div className={s.checkRow}>
                    <input className={s.checkbox} type="checkbox" id="esDestacado" checked={!!form.esDestacado} onChange={(e) => setForm({ ...form, esDestacado: e.target.checked })} />
                    <label htmlFor="esDestacado" className={s.checkLabel}>⭐ Destacado</label>
                  </div>
                  {editingId && (
                    <div className={s.checkRow}>
                      <input className={s.checkbox} type="checkbox" id="estado" checked={!!form.estado} onChange={(e) => setForm({ ...form, estado: e.target.checked })} />
                      <label htmlFor="estado" className={s.checkLabel}>✓ Activo</label>
                    </div>
                  )}
                </div>

                <div className={s.actions}>
                  <button type="button" className={s.btnGhost} onClick={() => setShowModal(false)}>Cancelar</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={submitting} className={s.btnPrimary}>
                    {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmar eliminación de servicio */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div className={s.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)}>
            <motion.div className={s.modal} style={{ maxWidth: 380 }} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
              <div className={s.form}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle width={22} height={22} color="#ef4444" />
                  <h3 className={s.modalTitle}>Eliminar servicio</h3>
                </div>
                <p className={s.sub}>¿Seguro que deseas eliminar este servicio?</p>
                <div className={s.actions}>
                  <button className={s.btnGhost} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                  <button className={s.btnDanger} disabled={submitting} onClick={() => handleDelete(deleteConfirm)}>
                    {submitting ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gestor de categorías */}
      <AnimatePresence>
        {catModalOpen && (
          <motion.div className={s.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCatModalOpen(false)}>
            <motion.div className={s.modal} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <div className={s.modalHead}>
                <h2 className={s.modalTitle}>Categorías</h2>
                <button className={s.modalClose} onClick={() => setCatModalOpen(false)} aria-label="Cerrar"><X width={18} height={18} /></button>
              </div>

              <div className={s.form}>
                {catEditingId === 'new' ? (
                  <div className={s.catRowEdit}>
                    <p className={s.catFormTitle}>Nueva categoría</p>
                    <div className={s.field}>
                      <label className={s.label}>Nombre *</label>
                      <input className={s.input} autoFocus value={catForm.nombre} onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })} />
                    </div>
                    <div className={s.field}>
                      <label className={s.label}>Descripción</label>
                      <input className={s.input} value={catForm.descripcion} onChange={(e) => setCatForm({ ...catForm, descripcion: e.target.value })} />
                    </div>
                    <div className={s.actions}>
                      <button type="button" className={s.btnGhost} onClick={resetCatForm}>Cancelar</button>
                      <button type="button" className={s.btnPrimary} disabled={catSubmitting} onClick={saveCategoria}>
                        {catSubmitting ? 'Guardando...' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className={s.catAddBtn} onClick={nuevaCategoria}>
                    <Plus width={16} height={16} /> Nueva categoría
                  </button>
                )}

                <div className={s.catList}>
                  {categorias.length === 0 && <p className={s.hint}>Aún no hay categorías. Crea la primera con el botón de arriba.</p>}
                  {categorias.map((cat) => {
                    const n = countServicios(cat.idCategoria)
                    const editing = catEditingId === cat.idCategoria
                    return editing ? (
                      <div key={cat.idCategoria} className={s.catRowEdit}>
                        <div className={s.field}>
                          <label className={s.label}>Nombre *</label>
                          <input className={s.input} autoFocus value={catForm.nombre} onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })} />
                        </div>
                        <div className={s.field}>
                          <label className={s.label}>Descripción</label>
                          <input className={s.input} value={catForm.descripcion} onChange={(e) => setCatForm({ ...catForm, descripcion: e.target.value })} />
                        </div>
                        <div className={s.actions}>
                          <button type="button" className={s.btnGhost} onClick={resetCatForm}>Cancelar</button>
                          <button type="button" className={s.btnPrimary} disabled={catSubmitting} onClick={saveCategoria}>
                            {catSubmitting ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={cat.idCategoria} className={s.catRow}>
                        <div className={s.catRowInfo}>
                          <div className={s.catName}>{cat.nombre}</div>
                          <div className={s.catCount}>{n} {n === 1 ? 'servicio' : 'servicios'}{cat.descripcion ? ` · ${cat.descripcion}` : ''}</div>
                        </div>
                        {catConfirmDelete === cat.idCategoria ? (
                          <div className={s.catConfirm}>
                            <span>¿Eliminar?</span>
                            <button className={s.catConfirmYes} onClick={() => deleteCategoria(cat.idCategoria)}>Sí</button>
                            <button className={s.catConfirmNo} onClick={() => setCatConfirmDelete(null)}>No</button>
                          </div>
                        ) : (
                          <div className={s.catRowActions}>
                            <button className={s.catIconBtn} onClick={() => editCategoria(cat)} title="Editar" aria-label="Editar categoría"><Edit2 width={16} height={16} /></button>
                            <button className={`${s.catIconBtn} ${s.catIconBtnDanger}`} disabled={n > 0} title={n > 0 ? 'No puedes eliminar una categoría con servicios' : 'Eliminar'} onClick={() => setCatConfirmDelete(cat.idCategoria)} aria-label="Eliminar categoría">
                              <Trash2 width={16} height={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
