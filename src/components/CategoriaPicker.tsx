import { useMemo, useState } from 'react'
import { Check, Pencil, Plus, ArrowElbowDownLeft, CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { apiClient } from '@/services/apiClient'
import { mensajeError } from '@/utils/apiError'

/**
 * T11 — SELECTOR DE CATEGORÍA · elegir + crear + renombrar, todo aquí.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LA FUSIÓN
 * ───────────────────────────────────────────────────────────────────────────
 * Antes había DOS sitios para la misma lista:
 *
 *   1. Un <select> "Categoría *" dentro de Editar servicio → solo ELEGÍA.
 *   2. Un modal "Gestionar categorías" aparte           → solo GESTIONABA.
 *
 * Y si estabas creando un servicio y la categoría no existía, el camino era:
 *   cerrar el modal → abrir Gestionar → crear → cerrar → reabrir el servicio →
 *   volver a rellenarlo todo → elegirla.
 *
 * Seis pasos. Por eso el dueño de la captura tenía 7 categorías vacías y sin usar:
 * el sistema le estaba cobrando un peaje por organizarse.
 *
 * AHORA: escribes el nombre en el buscador. Si existe, filtra. Si no existe, aparece
 * "Crear «Afeitado Premium»" y con Enter se crea Y se asigna. Un paso.
 *
 * El lápiz para renombrar vive en la propia fila.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LA PAPELERA SOLO SALE SI LA CATEGORÍA ESTÁ VACÍA
 * ───────────────────────────────────────────────────────────────────────────
 * Borrar una categoría con 3 servicios dentro no es un click al vuelo: hay que
 * decidir qué pasa con esos servicios. Esa conversación vive en "Gestionar
 * categorías", no aquí. Aquí solo se borra lo que no arrastra nada.
 */

export interface CategoriaLite {
  idCategoria: number
  nombre: string
}

interface Props {
  /** Categoría elegida (0 = ninguna). */
  valor: number
  onChange: (idCategoria: number) => void

  categorias: CategoriaLite[]
  /** Cuántos servicios tiene cada categoría. Decide si se puede borrar. */
  contarServicios: (idCategoria: number) => number

  /** Sede en la que se crea (el backend la pide en la ruta). */
  idSede: number
  /** Recargar la lista tras crear/renombrar/borrar. */
  onRecargar: () => Promise<void> | void
}

/** Normaliza para comparar: sin tildes, sin mayúsculas, sin espacios de sobra. */
const norm = (t: string) =>
  t.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function CategoriaPicker({
  valor, onChange, categorias, contarServicios, idSede, onRecargar,
}: Props) {
  const [busca, setBusca] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [editando, setEditando] = useState<number | null>(null)
  const [borrador, setBorrador] = useState('')

  const filtradas = useMemo(() => {
    const q = norm(busca)
    if (!q) return categorias
    return categorias.filter((c) => norm(c.nombre).includes(q))
  }, [busca, categorias])

  // ¿Lo que escribe es una categoría NUEVA? Se compara normalizado: si ya tiene
  // "Cortes Clásicos" y escribe "cortes clasicos", NO ofrecemos crear un duplicado.
  const yaExiste = categorias.some((c) => norm(c.nombre) === norm(busca))
  const puedeCrear = busca.trim().length >= 2 && !yaExiste

  const crear = async () => {
    if (!puedeCrear || ocupado) return
    setOcupado(true)
    try {
      const { data } = await apiClient.post(`/api/Categorias/sede/${idSede}`, {
        nombre: busca.trim(),
        descripcion: '',
        orden: categorias.length,
        estaActivo: true,
      })
      await onRecargar()

      // Se ASIGNA al vuelo. Crear una categoría y no elegirla sería dejar al usuario
      // a medio camino: la creó PARA este servicio.
      const nuevoId = data?.data?.idCategoria ?? data?.idCategoria
      if (nuevoId) onChange(Number(nuevoId))

      setBusca('')
      toast.success('Categoría creada y asignada')
    } catch (e) {
      toast.error(mensajeError(e, 'No se pudo crear la categoría'))
    } finally {
      setOcupado(false)
    }
  }

  const renombrar = async (id: number) => {
    const nombre = borrador.trim()
    if (nombre.length < 2) { toast.error('El nombre es demasiado corto'); return }

    setOcupado(true)
    try {
      await apiClient.put(`/api/Categorias/${id}`, {
        nombre,
        descripcion: '',
        orden: 0,
        estaActivo: true,
      })
      await onRecargar()
      setEditando(null)
      toast.success('Categoría renombrada')
    } catch (e) {
      toast.error(mensajeError(e, 'No se pudo renombrar'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200">
      {/* Buscador que TAMBIÉN crea. Es la pieza central de la fusión. */}
      <div className="border-b border-gray-100 p-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // preventDefault: si no, el Enter envía el formulario del servicio
              // entero y se guarda a medias.
              e.preventDefault()
              crear()
            }
          }}
          placeholder="Buscar o crear categoría"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-gray-400"
        />
      </div>

      <div className="max-h-52 overflow-y-auto p-2">
        {/* Crear la que no existe */}
        {puedeCrear && (
          <button
            type="button"
            onClick={crear}
            disabled={ocupado}
            className="mb-1 flex w-full items-center gap-2.5 rounded-lg border border-dashed border-blue-300 bg-blue-50 px-2.5 py-2 text-left transition hover:bg-blue-100 disabled:opacity-60"
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-600 text-white">
              {ocupado ? <CircleNotch size={11} className="animate-spin" /> : <Plus size={11} weight="bold" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-blue-800">
                Crear «{busca.trim()}»
              </span>
              <span className="block text-[11px] text-blue-600">Y asignarla a este servicio</span>
            </span>
            <ArrowElbowDownLeft size={14} className="shrink-0 text-blue-500" />
          </button>
        )}

        {filtradas.length === 0 && !puedeCrear && (
          <p className="py-4 text-center text-xs text-gray-400">
            {categorias.length === 0
              ? 'Aún no tienes categorías. Escribe un nombre arriba para crear la primera.'
              : 'Ninguna coincide.'}
          </p>
        )}

        {filtradas.map((c) => {
          const activa = c.idCategoria === valor
          const nServicios = contarServicios(c.idCategoria)

          if (editando === c.idCategoria) {
            return (
              <div key={c.idCategoria} className="mb-1 flex items-center gap-1.5 px-1 py-1">
                <input
                  autoFocus
                  value={borrador}
                  onChange={(e) => setBorrador(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); renombrar(c.idCategoria) }
                    if (e.key === 'Escape') setEditando(null)
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-gray-500"
                />
                <button
                  type="button"
                  onClick={() => renombrar(c.idCategoria)}
                  disabled={ocupado}
                  aria-label="Guardar"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gray-900 text-white disabled:opacity-50"
                >
                  <Check size={13} weight="bold" />
                </button>
              </div>
            )
          }

          return (
            <div
              key={c.idCategoria}
              className={`mb-1 flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition ${
                activa
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-transparent hover:bg-gray-50'
              }`}
            >
              <button
                type="button"
                onClick={() => onChange(c.idCategoria)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                    activa
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 text-transparent'
                  }`}
                >
                  <Check size={11} weight="bold" />
                </span>
                <span className="min-w-0">
                  <span
                    className={`block truncate text-[13px] ${
                      activa ? 'font-semibold text-blue-800' : 'text-gray-800'
                    }`}
                  >
                    {c.nombre}
                  </span>
                  <span className={`block text-[11px] ${activa ? 'text-blue-600' : 'text-gray-400'}`}>
                    {nServicios === 0
                      ? 'Sin servicios'
                      : `${nServicios} servicio${nServicios === 1 ? '' : 's'}`}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setEditando(c.idCategoria); setBorrador(c.nombre) }}
                aria-label={`Renombrar ${c.nombre}`}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition hover:bg-white ${
                  activa ? 'text-blue-600' : 'text-gray-300 hover:text-gray-600'
                }`}
              >
                <Pencil size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CategoriaPicker
