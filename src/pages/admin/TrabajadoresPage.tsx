import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertCircle, X, Eye, EyeOff, Upload, Image as ImageIcon, KeyRound, Mail, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { apiClient, buildImageUrl } from '@/services/apiClient'
import { AdminLayout } from '@/components/AdminLayout'
import s from '@/styles/Trabajadores.module.css'

interface Trabajador {
  idTrabajador?: number
  nombreCompleto: string
  telefono?: string
  correo?: string
  porcentajeComision?: number
  urlFotoPerfil?: string
  descripcion?: string
  especialidad?: string
  experiencia?: string
  esDestacado?: boolean
  estado?: boolean
  fechaIngreso?: string
}

export function TrabajadoresPage() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [accesoPara, setAccesoPara] = useState<Trabajador | null>(null)  // selector Email/WhatsApp
  const [uploadingImage, setUploadingImage] = useState(false)
  const [previewImage, setPreviewImage] = useState<string>('')

  const [form, setForm] = useState<Trabajador>({
    nombreCompleto: '',
    telefono: '',
    correo: '',
    porcentajeComision: 0,
    urlFotoPerfil: '',
    descripcion: '',
    especialidad: '',
    experiencia: '',
    esDestacado: false,
    estado: true,
  })

  // ========== CARGA (SIEMPRE admin/todos para ver activos + inactivos) ==========
  const loadTrabajadores = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/api/Trabajadores/admin/todos')
      const data = res.data.data ?? res.data
      const lista = Array.isArray(data) ? data : []
      setTrabajadores(lista)
    } catch (err: any) {
      console.error('Error cargando trabajadores:', err.message)
      toast.error(err.response?.data?.message || 'Error cargando trabajadores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrabajadores()
  }, [])

  // ========== UPLOAD IMAGEN ==========
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('archivo', file)

      // Endpoint por módulo → devuelve ruta RELATIVA (/uploads/trabajadores/xxx.jpg)
      const res = await apiClient.post('/api/upload/trabajadores', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const urlRelativa = res.data.data?.url || res.data.data?.Url
      setForm(prev => ({ ...prev, urlFotoPerfil: urlRelativa }))
      setPreviewImage(buildImageUrl(urlRelativa)) // preview = API_URL + ruta relativa
      toast.success('Imagen subida correctamente')
    } catch (err: any) {
      console.error('Error subiendo imagen:', err)
      toast.error(err.response?.data?.message || 'Error al subir imagen')
    } finally {
      setUploadingImage(false)
      e.target.value = '' // permite re-subir el mismo archivo
    }
  }

  // ========== ELIMINAR IMAGEN (DELETE upload con body { ruta }) ==========
  const handleRemoveImage = async () => {
    const ruta = form.urlFotoPerfil
    setPreviewImage('')
    setForm(prev => ({ ...prev, urlFotoPerfil: '' }))

    if (!ruta || ruta.startsWith('http')) return // nada físico que borrar / legacy absoluta

    try {
      await apiClient.delete('/api/upload', { data: { ruta } })
    } catch (err: any) {
      console.warn('No se pudo borrar la imagen física:', err.response?.status)
    }
  }

  // ========== SEPARAR ACTIVOS E INACTIVOS ==========
  const activos = trabajadores.filter(t => t.estado)
  const inactivos = trabajadores.filter(t => !t.estado)

  // ========== HANDLERS CRUD ==========
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombreCompleto) {
      toast.error('El nombre es obligatorio')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        nombreCompleto: form.nombreCompleto,
        telefono: form.telefono,
        correo: form.correo,
        porcentajeComision: form.porcentajeComision ?? 0,
        urlFotoPerfil: form.urlFotoPerfil,
        descripcion: form.descripcion,
        especialidad: form.especialidad,
        experiencia: form.experiencia,
        esDestacado: form.esDestacado,
        estado: form.estado,
      }

      if (editingId) {
        await apiClient.put(`/api/Trabajadores/${editingId}`, payload)
        toast.success('Trabajador actualizado')
      } else {
        await apiClient.post('/api/Trabajadores', payload)
        toast.success('Trabajador creado')
      }

      setShowModal(false)
      resetForm()
      await loadTrabajadores()
    } catch (err: any) {
      console.error('Error guardando:', err)
      if (err.response?.status === 404) {
        toast.error('El trabajador ya no existe. Refrescando lista...')
        setShowModal(false)
        resetForm()
        await loadTrabajadores()
      } else {
        toast.error(err.response?.data?.detail || err.response?.data?.message || 'Error guardando trabajador')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const enviarAcceso = async (t: Trabajador, canal: 'Email' | 'WhatsApp') => {
    setAccesoPara(null)
    if (!t.idTrabajador) return
    try {
      await apiClient.post(`/api/Trabajadores/${t.idTrabajador}/dar-acceso`, { canal })
      toast.success(`Código de acceso enviado por ${canal === 'Email' ? 'correo' : 'WhatsApp'}.`)
    } catch (err: any) {
      toast.error(err.response?.data?.mensaje || err.response?.data?.message || 'No se pudo enviar el acceso.')
    }
  }

  const darAcceso = (t: Trabajador) => {
    if (!t.idTrabajador) return
    if (!t.correo && !t.telefono) { toast.error('Asigna correo o teléfono al trabajador primero.'); return }
    // Siempre abre el selector para que se vea a qué correo/teléfono se enviará.
    setAccesoPara(t)
  }

  const handleEdit = (trabajador: Trabajador) => {
    setForm({
      nombreCompleto: trabajador.nombreCompleto,
      telefono: trabajador.telefono,
      correo: trabajador.correo,
      porcentajeComision: trabajador.porcentajeComision ?? 0,
      urlFotoPerfil: trabajador.urlFotoPerfil,
      descripcion: trabajador.descripcion,
      especialidad: trabajador.especialidad,
      experiencia: trabajador.experiencia,
      esDestacado: trabajador.esDestacado,
      estado: trabajador.estado,
    })
    setPreviewImage(buildImageUrl(trabajador.urlFotoPerfil))
    setEditingId(trabajador.idTrabajador || null)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    try {
      setSubmitting(true)
      await apiClient.delete(`/api/Trabajadores/${id}`)
      toast.success('Trabajador eliminado')
      setDeleteConfirm(null)
      await loadTrabajadores()
    } catch (err: any) {
      console.error('Error eliminando:', err)
      if (err.response?.status === 404) {
        toast.error('El trabajador ya no existe. Refrescando lista...')
        setDeleteConfirm(null)
        await loadTrabajadores()
      } else {
        toast.error(err.response?.data?.message || 'Error eliminando trabajador')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({
      nombreCompleto: '',
      telefono: '',
      correo: '',
      porcentajeComision: 0,
      urlFotoPerfil: '',
      descripcion: '',
      especialidad: '',
      experiencia: '',
      esDestacado: false,
      estado: true,
    })
    setPreviewImage('')
    setEditingId(null)
  }

  const renderCard = (t: Trabajador, inactivo: boolean) => (
    <motion.div
      key={t.idTrabajador}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${s.card} ${inactivo ? s.cardInactive : ''}`}
    >
      <div className={s.media}>
        {t.urlFotoPerfil
          ? <img src={buildImageUrl(t.urlFotoPerfil)} alt={t.nombreCompleto} />
          : <div className={s.mediaEmpty}><ImageIcon width={30} height={30} /></div>}
        <div className={s.cardActions}>
          <button className={s.iconBtn} onClick={() => darAcceso(t)} title="Dar acceso" aria-label="Dar acceso">
            <KeyRound width={15} height={15} />
          </button>
          <button className={s.iconBtn} onClick={() => handleEdit(t)} title="Editar" aria-label="Editar">
            <Edit2 width={15} height={15} />
          </button>
          <button className={`${s.iconBtn} ${s.iconBtnDanger}`} onClick={() => setDeleteConfirm(t.idTrabajador || null)} title="Eliminar" aria-label="Eliminar">
            <Trash2 width={15} height={15} />
          </button>
        </div>
      </div>
      <div className={s.cardFooter}>
        <h3 className={`${s.cardName} ${inactivo ? s.cardNameInactive : ''}`}>{t.nombreCompleto}</h3>
        <div className={s.badges}>
          <span className={`${s.badge} ${inactivo ? s.badgeInactive : s.badgeActive}`}>
            {inactivo ? '✗ Inactivo' : '✓ Activo'}
          </span>
          {t.esDestacado && <span className={`${s.badge} ${s.badgeStar}`}>⭐ Destacado</span>}
          {t.especialidad && <span className={`${s.badge} ${s.badgeSpec}`}>{t.especialidad}</span>}
        </div>
      </div>
    </motion.div>
  )

  if (loading) {
    return (
      <AdminLayout title="Trabajadores" subtitle="Tu equipo y sus horarios">
        <div className={s.loading}>
          <div className={s.loadingInner}>
            <div className={s.spinner} />
            <p className={s.loadingText}>Cargando trabajadores...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Trabajadores" subtitle="Tu equipo y sus horarios">
      <div className={s.toolbar}>
        <div className={s.toolbarText}>
          <h1 className={s.h1}>Tu equipo</h1>
          <p className={s.sub}>Gestiona los trabajadores de tu barbería</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className={s.newBtn}
          onClick={() => { resetForm(); setShowModal(true) }}
        >
          <Plus width={18} height={18} /> Nuevo trabajador
        </motion.button>
      </div>

      {trabajadores.length === 0 && (
        <div className={s.empty}>No hay trabajadores registrados todavía.</div>
      )}

      {activos.length > 0 && (
        <section className={s.section}>
          <div className={s.sectionHead}>
            <Eye width={18} height={18} color="#16a34a" />
            <h2 className={s.sectionTitle}>Activos ({activos.length})</h2>
          </div>
          <div className={s.grid}>{activos.map(t => renderCard(t, false))}</div>
        </section>
      )}

      {inactivos.length > 0 && (
        <section className={s.section}>
          <div className={s.sectionHead}>
            <EyeOff width={18} height={18} color="#9ca3af" />
            <h2 className={s.sectionTitleMuted}>Desactivados ({inactivos.length})</h2>
          </div>
          <div className={s.grid}>{inactivos.map(t => renderCard(t, true))}</div>
        </section>
      )}
      {/* Modal crear/editar */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className={s.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className={s.modal}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={s.modalHead}>
                <h2 className={s.modalTitle}>{editingId ? 'Editar trabajador' : 'Nuevo trabajador'}</h2>
                <button className={s.modalClose} onClick={() => setShowModal(false)} aria-label="Cerrar">
                  <X width={18} height={18} />
                </button>
              </div>

              <form className={s.form} onSubmit={handleSubmit}>
                {/* Foto */}
                <div className={s.field}>
                  <label className={s.label}>Foto de perfil</label>
                  {previewImage ? (
                    <div className={s.photoPreview}>
                      <img src={previewImage} alt="Preview" />
                      <button type="button" className={s.photoRemove} onClick={handleRemoveImage} aria-label="Quitar imagen">
                        <X width={16} height={16} />
                      </button>
                    </div>
                  ) : (
                    <div className={s.photoPlaceholder}><ImageIcon width={30} height={30} /></div>
                  )}
                  <label className={s.uploadLabel}>
                    <Upload width={16} height={16} />
                    {uploadingImage ? 'Subiendo...' : 'Seleccionar imagen'}
                    <input className={s.uploadInput} type="file" accept="image/*" onChange={handleUploadImage} disabled={uploadingImage} />
                  </label>
                </div>

                <div className={s.field}>
                  <label className={s.label}>Nombre completo *</label>
                  <input className={s.input} type="text" value={form.nombreCompleto} onChange={e => setForm({ ...form, nombreCompleto: e.target.value })} required />
                </div>

                <div className={s.field}>
                  <label className={s.label}>Teléfono</label>
                  <input className={s.input} type="text" value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="9XXXXXXXX" />
                </div>

                <div className={s.field}>
                  <label className={s.label}>Correo (para acceso por email)</label>
                  <input className={s.input} type="email" value={form.correo || ''} onChange={e => setForm({ ...form, correo: e.target.value })} placeholder="trabajador@correo.com" />
                </div>

                <div className={s.field}>
                  <label className={s.label}>Especialidad</label>
                  <input className={s.input} type="text" value={form.especialidad || ''} onChange={e => setForm({ ...form, especialidad: e.target.value })} />
                </div>

                <div className={s.field}>
                  <label className={s.label}>Experiencia</label>
                  <input className={s.input} type="text" value={form.experiencia || ''} onChange={e => setForm({ ...form, experiencia: e.target.value })} />
                </div>

                <div className={s.field}>
                  <label className={s.label}>Descripción</label>
                  <textarea className={s.textarea} value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} />
                </div>

                <div className={s.field}>
                  <label className={s.label}>% Comisión</label>
                  <input className={s.input} type="number" value={form.porcentajeComision ?? 0} onChange={e => setForm({ ...form, porcentajeComision: parseFloat(e.target.value) })} min="0" max="100" step="0.01" />
                </div>

                <div className={s.checkRow}>
                  <input className={s.checkbox} type="checkbox" id="esDestacado" checked={!!form.esDestacado} onChange={e => setForm({ ...form, esDestacado: e.target.checked })} />
                  <label htmlFor="esDestacado" className={s.checkLabel}>⭐ Destacado</label>
                </div>

                {editingId && (
                  <div className={s.checkRow}>
                    <input className={s.checkbox} type="checkbox" id="estado" checked={!!form.estado} onChange={e => setForm({ ...form, estado: e.target.checked })} />
                    <label htmlFor="estado" className={s.checkLabel}>✓ Activo</label>
                  </div>
                )}

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

      {/* Confirmar eliminación */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className={s.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              className={s.confirm}
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={s.confirmHead}>
                <AlertCircle width={22} height={22} color="#ef4444" />
                <h3 className={s.confirmTitle}>Eliminar trabajador</h3>
              </div>
              <p className={s.confirmText}>¿Seguro que deseas eliminar este trabajador?</p>
              <div className={s.confirmActions}>
                <button className={s.btnGhost} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                <button className={s.btnDanger} disabled={submitting} onClick={() => handleDelete(deleteConfirm)}>
                  {submitting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selector de canal para enviar el código de acceso */}
      <AnimatePresence>
        {accesoPara && (
          <motion.div
            className={s.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAccesoPara(null)}
          >
            <motion.div
              className={s.confirm}
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
            >
              <div className={s.confirmHead}>
                <KeyRound width={22} height={22} color="#2563eb" />
                <h3 className={s.confirmTitle}>Enviar código de acceso</h3>
              </div>
              <p className={s.confirmText}>¿Por dónde enviamos el código a <b>{accesoPara.nombreCompleto}</b>?</p>
              <div className="grid grid-cols-2 gap-2.5 mt-1">
                <button
                  disabled={!accesoPara.correo}
                  onClick={() => accesoPara.correo && enviarAcceso(accesoPara, 'Email')}
                  className="flex flex-col items-center gap-1 py-3.5 px-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  <Mail width={20} height={20} /> Correo
                  <span className="text-xs font-normal text-blue-600/80 truncate max-w-full">{accesoPara.correo || 'Sin correo'}</span>
                </button>
                <button
                  disabled={!accesoPara.telefono}
                  onClick={() => accesoPara.telefono && enviarAcceso(accesoPara, 'WhatsApp')}
                  className="flex flex-col items-center gap-1 py-3.5 px-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  <MessageCircle width={20} height={20} /> WhatsApp
                  <span className="text-xs font-normal text-emerald-600/80 truncate max-w-full">{accesoPara.telefono || 'Sin teléfono'}</span>
                </button>
              </div>
              <div className={s.confirmActions}>
                <button className={s.btnGhost} onClick={() => setAccesoPara(null)}>Cancelar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
