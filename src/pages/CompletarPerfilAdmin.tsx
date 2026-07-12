import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { User, Buildings as Building2, FloppyDisk as Save, CircleNotch as Loader2, Sparkle as Sparkles } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/authStore'
import { perfilService } from '@/services/perfilService'

/**
 * Pantalla de bienvenida del Admin: muestra sus datos PRE-ASIGNADOS
 * (sombreados) listos para confirmar o editar. Estilo Fresha: el dueño
 * completa su propia info. Puede "Hacerlo más tarde".
 */
export function CompletarPerfilAdmin() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Cuenta
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')

  // Negocio
  const [idEmpresa, setIdEmpresa] = useState<number | null>(null)
  const [nombreComercial, setNombreComercial] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [ruc, setRuc] = useState('')
  const [empCorreo, setEmpCorreo] = useState('')
  const [empTelefono, setEmpTelefono] = useState('')

  useEffect(() => {
    (async () => {
      // Pre-llena con lo que ya tenemos del store, luego refresca del backend.
      setNombre(user?.nombreCompleto || '')
      setCorreo((user as any)?.correo || '')
      try {
        const [p, e] = await Promise.all([
          perfilService.getMiPerfil().catch(() => null),
          perfilService.getMiEmpresa().catch(() => null),
        ])
        if (p) { setNombre(p.nombreCompleto || ''); setCorreo(p.correo || ''); setTelefono(p.telefono || '') }
        if (e) {
          setIdEmpresa(e.idEmpresa)
          setNombreComercial(e.nombreComercial || '')
          setRazonSocial(e.razonSocial || '')
          setRuc(e.ruc || '')
          setEmpCorreo(e.correoContacto || '')
          setEmpTelefono(e.telefonoContacto || '')
        }
      } finally { setLoading(false) }
    })()
  }, []) // eslint-disable-line

  const guardar = async () => {
    if (nombre.trim().length < 2) { toast.error('Ingresa tu nombre.'); return }
    setSaving(true)
    try {
      await perfilService.updateMiPerfil({
        nombreCompleto: nombre.trim(),
        correo: correo.trim() || undefined,
        telefono: telefono.trim() || undefined,
      })
      if (idEmpresa != null) {
        await perfilService.updateMiEmpresa({
          razonSocial: razonSocial.trim() || nombreComercial.trim(),
          nombreComercial: nombreComercial.trim(),
          ruc: ruc.trim() || undefined,
          correoContacto: empCorreo.trim() || undefined,
          telefonoContacto: empTelefono.trim() || undefined,
        })
      }
      toast.success('¡Datos guardados!')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudieron guardar los datos.')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50/50">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <img src="/barber-logo-black.png" alt="Barber.PE" className="h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">¡Te damos la bienvenida!</h1>
          <p className="text-gray-500 mt-1 flex items-center justify-center gap-1.5 text-sm">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Revisa tus datos pre-cargados y edítalos a tu gusto.
          </p>
        </div>

        {/* Cuenta */}
        <Section icon={User} title="Tu cuenta">
          <Ghost label="Nombre" value={nombre} onChange={setNombre} />
          <div className="grid grid-cols-2 gap-3">
            <Ghost label="Correo" value={correo} onChange={setCorreo} />
            <Ghost label="Teléfono" value={telefono} onChange={setTelefono} />
          </div>
        </Section>

        {/* Negocio */}
        <Section icon={Building2} title="Tu barbería">
          <Ghost label="Nombre del negocio" value={nombreComercial} onChange={setNombreComercial} />
          <Ghost label="Teléfono del negocio" value={empTelefono} onChange={setEmpTelefono} />
          <Ghost label="Correo del negocio" value={empCorreo} onChange={setEmpCorreo} />
        </Section>

        <div className="flex items-center gap-3 mt-6">
          <button onClick={() => navigate('/dashboard')}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition">
            Más tarde
          </button>
          <button onClick={guardar} disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function Section({ icon: Icon, title, children }:
  { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 space-y-3">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-600" /> {title}
      </h2>
      {children}
    </div>
  )
}

/** Campo "sombreado": si trae valor pre-asignado lo muestra atenuado hasta enfocar. */
function Ghost({ label, value, onChange, placeholder }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false)
  const preAsignado = value.trim().length > 0
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {preAsignado && !focused && (
          <span className="ml-2 text-[11px] font-normal text-blue-500">pre-cargado · edítalo</span>
        )}
      </label>
      <input
        value={value}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition
          ${preAsignado && !focused
            ? 'bg-blue-50/50 border-blue-100 text-gray-500 italic'
            : 'bg-gray-50 border-gray-300 text-gray-900'}`}
      />
    </div>
  )
}
