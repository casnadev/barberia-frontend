import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image as ImageIcon, ArrowRight } from '@phosphor-icons/react'
import { apiClient } from '@/services/apiClient'

/**
 * Aviso persistente: recuerda al Admin subir el BANNER de la sede (la "imagen de
 * reservas"). Sin esa imagen, Meta NO entrega las confirmaciones por WhatsApp
 * (la plantilla de reservas exige header de imagen). Por correo llegan igual.
 *
 * Es independiente del onboarding "Completa tu negocio": ese se oculta al llegar
 * a 5/5, pero el banner puede seguir faltando (las demos nacen 5/5 sin banner).
 * Por eso este aviso vive aparte y se muestra siempre que falte el banner.
 *
 * Lee GET /api/mi-empresa/onboarding → campo `tieneBanner`.
 */
export function AvisoBanner() {
  const navigate = useNavigate()
  const [tieneBanner, setTieneBanner] = useState<boolean | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiClient.get('/api/mi-empresa/onboarding')
        const data = res.data?.data ?? res.data
        setTieneBanner(Boolean(data?.tieneBanner))
      } catch (err) {
        console.error('❌ Error verificando banner:', err)
        setTieneBanner(true) // ante la duda, no estorbar
      }
    })()
  }, [])

  // Cargando, o ya tiene banner → no mostrar nada.
  if (tieneBanner === null || tieneBanner) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <ImageIcon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-900 text-sm">
            Falta tu imagen de reservas (banner)
          </h3>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            Sube el <b>banner de tu sede</b> para que las confirmaciones por <b>WhatsApp</b> lleguen
            a tus clientes. Sin esa imagen, WhatsApp <b>no</b> las entrega. Las confirmaciones por{' '}
            <b>correo</b> llegan con o sin banner.
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin/configuracion')}
            className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-amber-900 bg-amber-200/70 hover:bg-amber-200 rounded-lg px-3 py-1.5 transition"
          >
            Subir banner <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
