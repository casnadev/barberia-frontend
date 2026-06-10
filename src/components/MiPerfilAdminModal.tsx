import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { perfilService } from '@/services/perfilService'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { buildImageUrl } from '@/services/apiClient'

/**
 * Modal "Mi perfil" del Admin (su propio Usuario). Permite editar nombre,
 * correo, teléfono y foto de perfil. Se monta en AdminHeader (dashboard) y
 * también en AccountMenu (micrositio), y se abre desde el menú de cuenta.
 * La foto se sube a /api/upload y se guarda en Usuarios.UrlFotoPerfil.
 */
export function MiPerfilAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [foto, setFoto] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Contraseña (sección de seguridad)
  const [passActual, setPassActual] = useState('')
  const [passNueva, setPassNueva] = useState('')
  const [passRepite, setPassRepite] = useState('')
  const [guardandoPass, setGuardandoPass] = useState(false)
  const [enviandoEnlace, setEnviandoEnlace] = useState(false)

  // Cargar datos al abrir
  useEffect(() => {
    if (!open) return
    let vivo = true
    setLoading(true)
    perfilService.getMiPerfil()
      .then(p => {
        if (!vivo) return
        setNombre(p.nombreCompleto || '')
        setCorreo(p.correo || '')
        setTelefono(p.telefono || '')
        setFoto(p.urlFotoPerfil || '')
      })
      .catch(() => toast.error('No se pudo cargar tu perfil'))
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [open])

  // Esc para cerrar
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  if (!open) return null

  const inicial = (nombre || 'A').trim().charAt(0).toUpperCase()

  const subirFoto = async (e: any) => {
    const file = e.target.files?.[0]; if (!file) return
    setSubiendo(true)
    try { const url = await perfilService.subirFoto(file); setFoto(url); toast.success('Foto actualizada') }
    catch { toast.error('No se pudo subir la foto') } finally { setSubiendo(false) }
  }

  const guardar = async () => {
    if (!nombre.trim()) return toast.error('El nombre es obligatorio')
    if (telefono && !/^9\d{8}$/.test(telefono)) return toast.error('Teléfono peruano inválido (9 dígitos)')
    setSaving(true)
    try {
      await perfilService.updateMiPerfil({
        nombreCompleto: nombre.trim(),
        correo: correo.trim() || undefined,
        telefono: telefono.trim() || undefined,
        urlFotoPerfil: foto,
      })
      const u = useAuthStore.getState().user
      if (u) useAuthStore.getState().setUser({ ...u, urlFotoPerfil: foto || null })
      toast.success('Perfil actualizado'); onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje || 'No se pudo guardar')
    } finally { setSaving(false) }
  }

  const cambiarPass = async () => {
    if (!passActual) return toast.error('Ingresa tu contraseña actual')
    if (passNueva.length < 8) return toast.error('La nueva contraseña debe tener al menos 8 caracteres')
    if (passNueva !== passRepite) return toast.error('Las contraseñas no coinciden')
    setGuardandoPass(true)
    const r = await authService.cambiarPassword(passActual, passNueva)
    setGuardandoPass(false)
    if (r.ok) {
      toast.success('Contraseña actualizada')
      setPassActual(''); setPassNueva(''); setPassRepite('')
    } else toast.error(r.mensaje || 'No se pudo cambiar la contraseña')
  }

  const enviarEnlacePass = async () => {
    const ident = correo.trim() || telefono.trim()
    if (!ident) return toast.error('Agrega un correo o teléfono a tu perfil primero')
    setEnviandoEnlace(true)
    await authService.solicitarPassword(ident)
    setEnviandoEnlace(false)
    toast.success('Te enviamos un enlace para crear tu contraseña. Ábrelo desde tu correo/WhatsApp.')
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'

  return createPortal(
    // ← CAMBIO (responsive): en móvil el modal es una "hoja inferior" (bottom-sheet)
    //   que ocupa el ancho completo y NO se desborda; en desktop (sm+) vuelve a ser
    //   la tarjeta centrada de siempre.
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* ← CAMBIO clave: max-h + overflow-y-auto → el contenido alto (datos +
          contraseña) hace scroll DENTRO del modal en vez de tapar toda la pantalla. */}
      <div className="relative bg-white w-full sm:max-w-md p-5 shadow-xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Mi perfil</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
        ) : (
          <div className="space-y-3">
            {/* Foto */}
            <div className="flex items-center gap-3">
              <div className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold shrink-0 ${foto ? '' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                {foto ? <img src={buildImageUrl(foto)} alt="" className="w-full h-full object-cover" /> : inicial}
              </div>
              <div className="space-y-1">
                <label className="inline-flex items-center gap-1 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 font-medium cursor-pointer">
                  <Camera className="w-4 h-4" /> {subiendo ? 'Subiendo…' : 'Subir foto'}
                  <input type="file" accept="image/*" onChange={subirFoto} className="hidden" disabled={subiendo} />
                </label>
                {foto && <button onClick={() => setFoto('')} className="block text-xs text-gray-400 hover:text-rose-500">Quitar foto</button>}
              </div>
            </div>

            <div><label className="text-xs text-gray-500">Nombre completo</label><input className={field} value={nombre} onChange={e => setNombre(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">Correo</label><input className={field} value={correo} onChange={e => setCorreo(e.target.value)} type="email" /></div>
            <div><label className="text-xs text-gray-500">Teléfono</label><input className={field} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="9XXXXXXXX" inputMode="numeric" /></div>

            <button onClick={guardar} disabled={saving || subiendo} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar cambios'}</button>

            {/* Contraseña */}
            <div className="pt-3 mt-1 border-t border-gray-100 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Contraseña</p>
                <p className="text-xs text-gray-400">Para entrar con correo/teléfono + contraseña. Tu PIN sigue funcionando igual.</p>
              </div>

              <div><label className="text-xs text-gray-500">Contraseña actual</label>
                <input className={field} type="password" value={passActual} onChange={e => setPassActual(e.target.value)} placeholder="••••••••" /></div>
              <div><label className="text-xs text-gray-500">Nueva contraseña</label>
                <input className={field} type="password" value={passNueva} onChange={e => setPassNueva(e.target.value)} placeholder="Mínimo 8 caracteres" /></div>
              <div><label className="text-xs text-gray-500">Repite la nueva</label>
                <input className={field} type="password" value={passRepite} onChange={e => setPassRepite(e.target.value)} placeholder="Repite la contraseña" /></div>

              <button onClick={cambiarPass} disabled={guardandoPass}
                className="w-full bg-gray-900 hover:bg-black text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">
                {guardandoPass ? 'Guardando…' : 'Cambiar contraseña'}
              </button>

              <button onClick={enviarEnlacePass} disabled={enviandoEnlace}
                className="w-full text-blue-600 text-xs py-1 hover:underline disabled:opacity-50">
                ¿Entras por PIN y nunca configuraste una, o la olvidaste? Crear contraseña por enlace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
