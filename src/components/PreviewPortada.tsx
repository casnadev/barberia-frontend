import { ShareNetwork, Wallet, Warning } from '@phosphor-icons/react'
import { buildImageUrl } from '@/services/apiClient'

/**
 * T13 — VISTA PREVIA DE LOS DOS RECORTES DE LA PORTADA.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * POR QUÉ EXISTE
 * ───────────────────────────────────────────────────────────────────────────
 * La misma portada se usa en dos sitios con proporciones MUY distintas:
 *
 *     Compartir (WhatsApp, Facebook)  → 1200 × 630   (1.91:1)
 *     Google Wallet (heroImage)       → 1032 × 336   (3.07:1)
 *
 * La de Wallet es casi el DOBLE de apaisada. Coger una foto 16:9 y forzarla a
 * 3:1 se come el 35% del alto — por el centro, que es donde suelen estar las
 * cabezas.
 *
 * Y la portada que sube el dueño puede tener CUALQUIER proporción: el uploader
 * solo la reduce a 1920px de lado largo, no la recorta.
 *
 * Así que aquí se le enseñan LOS DOS RECORTES, con las proporciones exactas,
 * ANTES de que publique. Si el de Wallet le corta la cabeza a su barbero, lo ve
 * y sube otra foto. Sin esto, se enteraría cuando un cliente le enseñara la
 * tarjeta en el móvil.
 *
 * ⚠️ El recorte es por CSS (`object-fit: cover` + aspect-ratio), que reproduce
 * exactamente lo que hace el backend (`ResizeMode.Crop` + `AnchorPositionMode.Center`).
 * No es una aproximación: es el mismo encuadre.
 */

interface Props {
  /** URL de la portada tal cual la subió el dueño (WebP, cualquier proporción). */
  urlPortada?: string | null
  /** Color de la marca, para pintar la tarjeta como se verá de verdad. */
  colorMarca?: string | null
  /** Nombre visible del negocio. */
  nombreNegocio?: string
  /** Título del programa ("Puntos de Shanell Salón"). */
  nombrePrograma?: string
}

export function PreviewPortada({
  urlPortada, colorMarca, nombreNegocio = 'Tu negocio', nombrePrograma,
}: Props) {
  if (!urlPortada) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-4">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-500">
          <Warning size={15} weight="fill" className="mt-px shrink-0 text-amber-500" />
          <span>
            <strong className="text-gray-700">Sin portada.</strong> La tarjeta de tus
            clientes irá <b>sin foto</b>, y al compartir tu negocio no saldrá imagen.
            <span className="mt-0.5 block text-gray-400">
              No ponemos una foto genérica a propósito: enseñar la barbería de otro sería
              peor que no enseñar ninguna.
            </span>
          </span>
        </p>
      </div>
    )
  }

  const src = buildImageUrl(urlPortada)
  const bg = colorMarca && /^#[0-9a-f]{6}$/i.test(colorMarca) ? colorMarca : '#111827'
  const titulo = nombrePrograma?.trim() || `Puntos de ${nombreNegocio}`

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-gray-400">
        Tu portada se recorta distinto en cada sitio. Míralo antes de guardar: si algo
        queda cortado, sube una foto más apaisada.
      </p>

      {/* ── 1. Compartir · 1200×630 (1.91:1) ── */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
          <ShareNetwork size={13} weight="fill" />
          Al compartir tu negocio
          <span className="font-normal text-gray-400">· WhatsApp, Facebook</span>
        </p>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <img
            src={src}
            alt="Cómo se verá al compartir"
            className="w-full object-cover"
            style={{ aspectRatio: '1200 / 630' }}
          />
        </div>
      </div>

      {/* ── 2. Google Wallet · 1032×336 (3.07:1) ──
           Se pinta la tarjeta ENTERA (color, nombre, foto) y no solo el recorte:
           el dueño necesita ver el conjunto, no un rectángulo suelto. */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
          <Wallet size={13} weight="fill" />
          En la tarjeta de tus clientes
          <span className="font-normal text-gray-400">· Google Wallet</span>
        </p>

        <div className="overflow-hidden rounded-xl" style={{ background: bg }}>
          <div className="px-3 pb-2.5 pt-3">
            <p className="truncate text-[11px] font-medium text-white/80">{nombreNegocio}</p>
            <p className="mt-1 truncate text-base font-semibold text-white">{titulo}</p>
          </div>
          <img
            src={src}
            alt="Cómo se verá en Google Wallet"
            className="w-full object-cover"
            style={{ aspectRatio: '1032 / 336' }}
          />
        </div>

        <p className="mt-1 text-[10px] text-gray-400">
          Mucho más apaisada que la de compartir: se recorta por el centro.
        </p>
      </div>
    </div>
  )
}

export default PreviewPortada
