import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Lifebuoy as LifeBuoy, CircleNotch as Loader2, PaperPlaneRight as Send } from '@phosphor-icons/react'
import SeccionSheet from '@/components/SeccionSheet'
import { apiClient } from '@/services/apiClient'
import { useAuthStore } from '@/store/authStore'
import { useSoporteStore } from '@/store/soporteStore'
import { soporteService } from '@/services/soporteService'
import { nombreParaMostrar } from '@/utils/nombreParaMostrar'
import { ComboBox } from '@/components/ComboBox'

const MOTIVOS = [
  'Problema técnico',
  'Cambiar mi enlace público',
  'Facturación o plan',
  'Sugerencia',
  'Otro',
]

const inputCls =
  'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition'

/**
 * Modal de "Ayuda y soporte" (mobile-first, vía SeccionSheet). Se controla por
 * el store global, así se abre desde el menú de cuenta o la pestaña "Más".
 * Precarga el contexto (sede + cuenta) y lo envía a soporte por correo.
 */
export function SoporteModal() {
  const { open, cerrar } = useSoporteStore()
  const { user } = useAuthStore()

  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sede, setSede] = useState<{ nombre?: string; subdominio?: string }>({})

  useEffect(() => {
    if (!open) return
    setMotivo(MOTIVOS[0]); setDescripcion('')   // reset al abrir
    ;(async () => {
      // /api/Sedes/actual solo tiene sentido en el subdominio de una sede.
      // En el panel (barber.pe / app.barber.pe) no hay tenant → daría 400.
      // Evitamos la llamada para no ensuciar la consola.
      const host = window.location.hostname.toLowerCase()
      const label = host.split('.')[0]
      const RESERVADOS = ['www', 'app', 'admin', 'api', 'barber', 'localhost', '127']
      const enSedeSubdominio =
        host.endsWith('barber.pe') && host.split('.').length > 2 && !RESERVADOS.includes(label)
      if (!enSedeSubdominio) { setSede({}); return }
      try {
        const res = await apiClient.get('/api/Sedes/actual')
        const d: any = res.data?.data ?? res.data
        setSede({ nombre: d?.nombre, subdominio: d?.subdominio })
      } catch { setSede({}) }
    })()
  }, [open])

  const enviar = async () => {
    if (!descripcion.trim()) { toast.error('Cuéntanos qué pasa antes de enviar'); return }
    try {
      setEnviando(true)
      const r = await soporteService.enviar({
        motivo,
        descripcion: descripcion.trim(),
        sedeNombre: sede.nombre,
        subdominio: sede.subdominio,
        nombre: user?.nombreCompleto,
        rol: user?.rol,
        correo: user?.correo,
        telefono: user?.telefono,
      })
      if (r.ok) { toast.success(r.mensaje || 'Mensaje enviado'); cerrar() }
      else toast.error(r.mensaje || 'No pudimos enviar tu mensaje')
    } catch {
      toast.error('No pudimos enviar tu mensaje. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <SeccionSheet
      open={open}
      onClose={cerrar}
      titulo="Ayuda y soporte"
      subtitulo="Cuéntanos qué necesitas y te respondemos a tu correo"
      footer={
        <button type="button" onClick={enviar} disabled={enviando}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {enviando ? 'Enviando...' : 'Enviar mensaje'}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-blue-50/60 border border-blue-100 p-3">
          <LifeBuoy className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">
            Enviaremos tu mensaje junto con los datos de tu cuenta y sede
            {sede.nombre ? <> (<span className="font-medium text-gray-700">{nombreParaMostrar(sede as any, { forzarMulti: true })}</span>)</> : null} para
            identificarte. Te responderemos a <span className="font-medium text-gray-700">{user?.correo || 'tu correo'}</span>.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo</label>
          <ComboBox value={motivo} onChange={(v) => setMotivo(String(v))} opciones={MOTIVOS} inputClassName={inputCls} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">¿Qué necesitas?</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={5}
            className={inputCls + ' resize-none'} />
        </div>
      </div>
    </SeccionSheet>
  )
}
