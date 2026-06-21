import { Rocket, Check, ArrowRight } from 'lucide-react'

export type PasoPerfil = { clave: string; etiqueta: string; hecho: boolean }

/**
 * Tarjeta "Completa tu perfil" para Cliente y Trabajador. A diferencia del
 * onboarding del Admin (que lee un endpoint), esta versión calcula el avance en
 * el front a partir de los datos del perfil que la página ya cargó. Cada paso
 * pendiente dispara onCompletar(clave) — normalmente abre el modal de edición.
 * Se oculta sola cuando todo está completo (o no hay pasos).
 */
export function CompletaTuPerfil({
  titulo = 'Completa tu perfil',
  pasos,
  onCompletar,
  nota,
}: {
  titulo?: string
  pasos: PasoPerfil[]
  onCompletar: (clave: string) => void
  nota?: string
}) {
  const total = pasos.length
  const completados = pasos.filter((p) => p.hecho).length
  const porcentaje = total ? Math.round((completados / total) * 100) : 0

  // Nada pendiente (o sin pasos): no estorbar.
  if (total === 0 || completados === total) return null

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Rocket className="w-5 h-5" />
          </span>
          <h2 className="font-semibold text-gray-900">{titulo}</h2>
        </div>
        <span className="text-sm text-gray-400">
          {completados} de {total} · {porcentaje}%
        </span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${porcentaje}%` }} />
      </div>

      <div className="divide-y divide-gray-100">
        {pasos.map((p) => (
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
                onClick={() => onCompletar(p.clave)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Completar <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {nota && <p className="text-xs text-gray-500 mt-4">{nota}</p>}
    </div>
  )
}
