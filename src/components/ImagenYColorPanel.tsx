import { UploadSimple, X, Image as ImageIcon, Share, Wallet } from '@phosphor-icons/react'
import { buildImageUrl } from '@/services/apiClient'
import BrandColorPicker from '@/components/BrandColorPicker'

/**
 * T14 — IMAGEN Y COLOR.  Logo · Portada · Recorte · Color.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EL RECORTE: por qué tres botones y no un editor
 * ───────────────────────────────────────────────────────────────────────────
 * La portada se recorta a dos formatos MUY apaisados:
 *
 *     Compartir       1200 × 630   (1.91:1)
 *     Google Wallet   1032 × 336   (3.07:1)
 *
 * Los dos son más anchos que altos comparados con cualquier foto normal, así que
 * el recorte SOLO se come alto — el ancho se aprovecha entero.
 *
 * Por eso el único control que importa es VERTICAL. Un editor 2D (arrastrar, hacer
 * zoom) no tendría nada que mover en horizontal: sería complicar sin ganar.
 *
 * Y por eso el default "Centro" es el que más molesta: las cabezas suelen estar
 * ARRIBA, y es justo lo que se pierde al centrar.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LA VISTA PREVIA ES EXACTA, NO UNA APROXIMACIÓN
 * ───────────────────────────────────────────────────────────────────────────
 * `object-fit: cover` + `object-position` reproduce EXACTAMENTE lo que hace el
 * backend (`ResizeMode.Crop` + `AnchorPositionMode`). Lo que se ve aquí es lo que
 * va a salir. Y reacciona al instante al pulsar Arriba/Centro/Abajo, sin guardar.
 */

export type Recorte = 'Arriba' | 'Centro' | 'Abajo'

/** El anclaje CSS que corresponde a cada recorte del backend. */
const POSICION: Record<Recorte, string> = {
  Arriba: 'top',
  Centro: 'center',
  Abajo: 'bottom',
}

interface Props {
  logoPreview: string | null
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onLogoRemove: () => void
  subiendoLogo: boolean

  bannerPreview: string | null
  onBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBannerRemove: () => void
  subiendoBanner: boolean

  recorte: Recorte
  onRecorte: (r: Recorte) => void

  color: string
  onColor: (c: string) => void

  nombreNegocio: string
  nombrePrograma?: string | null
}

const RECORTES: { valor: Recorte; etiqueta: string }[] = [
  { valor: 'Arriba', etiqueta: 'Arriba' },
  { valor: 'Centro', etiqueta: 'Centro' },
  { valor: 'Abajo', etiqueta: 'Abajo' },
]

export function ImagenYColorPanel({
  logoPreview, onLogoUpload, onLogoRemove, subiendoLogo,
  bannerPreview, onBannerUpload, onBannerRemove, subiendoBanner,
  recorte, onRecorte,
  color, onColor,
  nombreNegocio, nombrePrograma,
}: Props) {
  const src = bannerPreview ? buildImageUrl(bannerPreview) : null
  const pos = POSICION[recorte] ?? 'center'
  const bg = /^#[0-9a-f]{6}$/i.test(color) ? color : '#111827'
  const titulo = nombrePrograma?.trim() || `Puntos de ${nombreNegocio || 'tu negocio'}`

  return (
    // Desktop: dos columnas, todo a la vista, sin scroll.
    // Móvil: una columna. El footer fijo lo pone el contenedor (SeccionSheet).
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">

      {/* ══════════ COLUMNA IZQUIERDA · lo que el dueño SUBE ══════════ */}
      <div className="space-y-4">

        {/* ── LOGO ──
             Compacto a propósito: es cuadrado, pequeño, y no se recorta. No necesita
             espacio. La portada sí, porque es la que puede salir mal. */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Logo
          </p>
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
              {logoPreview ? (
                <img src={buildImageUrl(logoPreview)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-gray-300">
                  <ImageIcon size={22} />
                </span>
              )}
              {logoPreview && (
                <button
                  type="button"
                  onClick={onLogoRemove}
                  aria-label="Quitar logo"
                  className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-gray-800"
                >
                  <X size={11} weight="bold" />
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50">
                <UploadSimple size={14} />
                {subiendoLogo ? 'Subiendo…' : (logoPreview ? 'Cambiar logo' : 'Subir logo')}
                <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} disabled={subiendoLogo} />
              </label>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
                Cuadrado. Va en el círculo de la tarjeta y en tu sitio.
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* ── PORTADA ── la protagonista */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Portada
          </p>

          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50" style={{ aspectRatio: '16 / 10' }}>
            {src ? (
              <img src={src} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-gray-300">
                <ImageIcon size={30} />
              </span>
            )}
            {src && (
              <button
                type="button"
                onClick={onBannerRemove}
                aria-label="Quitar portada"
                className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-gray-600 shadow-sm hover:text-gray-900"
              >
                <X size={12} weight="bold" />
              </button>
            )}
          </div>

          <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50">
            <UploadSimple size={14} />
            {subiendoBanner ? 'Subiendo…' : (src ? 'Cambiar portada' : 'Subir portada')}
            <input type="file" accept="image/*" className="hidden" onChange={onBannerUpload} disabled={subiendoBanner} />
          </label>

          {/* ── EL RECORTE ── solo tiene sentido si hay portada */}
          {src && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs text-gray-500">¿Qué parte quieres conservar?</p>
              <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Recorte de la portada">
                {RECORTES.map((r) => {
                  const activo = r.valor === recorte
                  return (
                    <button
                      key={r.valor}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      onClick={() => onRecorte(r.valor)}
                      className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                        activo
                          ? 'border-blue-300 bg-blue-50 text-blue-800'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {r.etiqueta}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
                Al recortar solo se pierde <strong className="text-gray-500">alto</strong>, nunca
                ancho. Si tu foto tiene cabezas arriba, elige <strong className="text-gray-500">Arriba</strong>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════ COLUMNA DERECHA · cómo QUEDA ══════════ */}
      <div className="space-y-4">

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Cómo se verá
          </p>

          {src ? (
            <>
              {/* 1. Compartir · 1200×630 */}
              <p className="mb-1 flex items-center gap-1.5 text-[11px] text-gray-500">
                <Share size={12} weight="fill" /> Al compartir
              </p>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <img
                  src={src}
                  alt="Al compartir"
                  className="w-full"
                  style={{ aspectRatio: '1200 / 630', objectFit: 'cover', objectPosition: pos }}
                />
              </div>

              {/* 2. La tarjeta ENTERA — logo, nombre, título y foto.
                   No solo el recorte suelto: el dueño necesita ver el conjunto. */}
              <p className="mb-1 mt-3 flex items-center gap-1.5 text-[11px] text-gray-500">
                <Wallet size={12} weight="fill" /> En la tarjeta del cliente
              </p>
              <div className="overflow-hidden rounded-xl" style={{ background: bg }}>
                <div className="flex items-center gap-2 px-2.5 pt-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-white/15">
                    {logoPreview
                      ? <img src={buildImageUrl(logoPreview)} alt="" className="h-full w-full object-cover" />
                      : <ImageIcon size={10} className="text-white/70" />}
                  </span>
                  <p className="truncate text-[10px] text-white/75">{nombreNegocio || 'Tu negocio'}</p>
                </div>
                <p className="truncate px-2.5 pb-2 pt-1 text-[13px] font-semibold text-white">
                  {titulo}
                </p>
                <img
                  src={src}
                  alt="En Google Wallet"
                  className="w-full"
                  style={{ aspectRatio: '1032 / 336', objectFit: 'cover', objectPosition: pos }}
                />
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
                El logo va en el círculo. La portada, recortada a lo ancho.
              </p>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-3">
              <p className="text-[11px] leading-relaxed text-gray-500">
                <strong className="text-gray-700">Sin portada.</strong> La tarjeta de tus clientes
                irá <b>sin foto</b>, y al compartir tu negocio no saldrá imagen.
                <span className="mt-1 block text-gray-400">
                  No ponemos una genérica a propósito: enseñar la barbería de otro sería peor que
                  no enseñar ninguna.
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="h-px bg-gray-100" />

        {/* ── COLOR ── tal cual estaba: el picker ya funciona bien */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Color de tema
          </p>
          <BrandColorPicker value={color} onChange={onColor} />
        </div>
      </div>
    </div>
  )
}

export default ImagenYColorPanel
