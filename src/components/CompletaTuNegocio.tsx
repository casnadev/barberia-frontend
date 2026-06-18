import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket, Check, ArrowRight } from 'lucide-react'
import { apiClient } from '@/services/apiClient'

type Paso = { clave: string; etiqueta: string; hecho: boolean }
type Onboarding = {
  pasos: Paso[]
  completados: number
  total: number
  porcentaje: number
  reservable: boolean
}

// A dónde lleva cada paso pendiente al pulsar "Completar".
const RUTA_POR_CLAVE: Record<string, string> = {
  negocio: '/admin/configuracion',
  direccion: '/admin/configuracion',
  horarios: '/admin/configuracion',
  servicios: '/admin/servicios',
  equipo: '/admin/trabajadores',
}

/**
 * Tarjeta "Completa tu negocio": muestra el avance del onboarding y guía al Admin
 * a lo que falta para que su micrositio sea reservable. Se oculta sola cuando el
 * negocio ya está completo (reservable === true). Lee GET /api/mi-empresa/onboarding.
 */
export function CompletaTuNegocio() {
  const navigate = useNavigate()
  const [data, setData] = useState<Onboarding | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiClient.get('/api/mi-empresa/onboarding')
        setData(res.data?.data ?? res.data)
      } catch (err) {
        console.error('❌ Error cargando onboarding:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Mientras carga, o si falla, o si ya está completo: no estorbar.
  if (loading || !data || data.reservable) return null

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Rocket className="w-5 h-5" />
          </span>
          <h2 className="font-semibold text-gray-900">Completa tu negocio</h2>
        </div>
        <span className="text-sm text-gray-400">
          {data.completados} de {data.total} · {data.porcentaje}%
        </span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${data.porcentaje}%` }} />
      </div>

      <div className="divide-y divide-gray-100">
        {data.pasos.map((p) => (
          <div key={p.clave} className="flex items-center gap-3 py-2.5">
            {p.hecho ? (
              <span className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full border-2 border-gray-200 shrink-0" />
            )}
            <span className={`flex-1 text-sm ${p.hecho ? 'text-gray-800' : 'text-gray-500'}`}>
              {p.etiqueta}
            </span>
            {p.hecho ? (
              <span className="text-xs text-green-600 font-medium">Listo</span>
            ) : (
              <button
                type="button"
                onClick={() => navigate(RUTA_POR_CLAVE[p.clave] || '/admin/configuracion')}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Completar <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Ya puedes recibir reservas. Completa estos datos para que tus clientes vean tu mejor versión
        (descripción del sitio, horarios, servicios y tu equipo).
      </p>
    </div>
  )
}
