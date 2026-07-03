import { useEffect, useRef, useState } from 'react'

/**
 * BrandColorPicker — selector de color de MARCA, moderno y con vista en vivo.
 *
 * Incluye:
 *  • Cuadro 2D (saturación × brillo) arrastrable → cualquier color, no solo tono.
 *  • Barra de tono (arcoíris).
 *  • Input hex + botón nativo del sistema (trae el cuentagotas en Chrome/Edge).
 *  • Aro de contraste: elige texto blanco/oscuro automático y muestra el ratio.
 *
 * Uso:
 *   <BrandColorPicker value={color} onChange={setColor} logoColors={['#BF9F00']} />
 *
 * `logoColors` (opcional): colores dominantes extraídos del logo, se muestran
 * como accesos rápidos ("Extraídos de tu logo").
 */

type HSV = { h: number; s: number; v: number }

function clamp01(n: number) { return Math.max(0, Math.min(1, n)) }

function hsvToHex({ h, s, v }: HSV): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c } else { r = c; b = x }
  const t = (n: number) => ('0' + Math.round((n + m) * 255).toString(16)).slice(-2)
  return ('#' + t(r) + t(g) + t(b)).toUpperCase()
}

function hexToHsv(hex: string): HSV {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  const r = (parseInt(c.slice(0, 2), 16) || 0) / 255
  const g = (parseInt(c.slice(2, 4), 16) || 0) / 255
  const b = (parseInt(c.slice(4, 6), 16) || 0) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  let h = 0
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  return { h, s: mx === 0 ? 0 : d / mx, v: mx }
}

function relLum(hex: string): number {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  const ch = [0, 2, 4].map((i) => {
    const v = (parseInt(c.slice(i, i + 2), 16) || 0) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
function ratio(a: string, b: string) {
  const l1 = relLum(a), l2 = relLum(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}
export function onColor(hex: string): '#FFFFFF' | '#111827' {
  return ratio(hex, '#FFFFFF') >= ratio(hex, '#111827') ? '#FFFFFF' : '#111827'
}

interface Props {
  value: string
  onChange: (hex: string) => void
  logoColors?: string[]
}

export default function BrandColorPicker({ value, onChange, logoColors = [] }: Props) {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value || '#2855F6'))
  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  // Si el valor cambia desde afuera (ej. reset), re-sincroniza.
  useEffect(() => {
    if (/^#?[0-9a-fA-F]{6}$/.test(value || '')) {
      const next = hexToHsv(value)
      setHsv((cur) => (hsvToHex(cur) === value.toUpperCase() ? cur : next))
    }
  }, [value])

  const hex = hsvToHex(hsv)
  const on = onColor(hex)
  const emit = (h: HSV) => { setHsv(h); onChange(hsvToHex(h)) }

  const dragSV = (clientX: number, clientY: number) => {
    const r = svRef.current!.getBoundingClientRect()
    emit({ ...hsv, s: clamp01((clientX - r.left) / r.width), v: 1 - clamp01((clientY - r.top) / r.height) })
  }
  const dragHue = (clientX: number) => {
    const r = hueRef.current!.getBoundingClientRect()
    emit({ ...hsv, h: clamp01((clientX - r.left) / r.width) * 360 })
  }
  const bind = (fn: (x: number, y: number) => void) => (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    fn(e.clientX, e.clientY)
    const move = (ev: PointerEvent) => fn(ev.clientX, ev.clientY)
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1 })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 140px', gap: 14, alignItems: 'start' }}>
      <div>
        <div
          ref={svRef}
          onPointerDown={bind((x, y) => dragSV(x, y))}
          style={{
            position: 'relative', width: '100%', height: 150, borderRadius: 12, cursor: 'crosshair',
            touchAction: 'none', border: '1px solid rgba(0,0,0,.1)',
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueHex}`,
          }}
        >
          <div style={{
            position: 'absolute', width: 16, height: 16, borderRadius: '50%', border: '2px solid #fff',
            boxShadow: '0 0 0 1px rgba(0,0,0,.35)', transform: 'translate(-50%,-50%)', pointerEvents: 'none',
            left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`,
          }} />
        </div>
        <div
          ref={hueRef}
          onPointerDown={bind((x) => dragHue(x))}
          style={{
            position: 'relative', width: '100%', height: 16, borderRadius: 8, marginTop: 10, cursor: 'pointer', touchAction: 'none',
            background: 'linear-gradient(to right,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%)',
          }}
        >
          <div style={{
            position: 'absolute', top: -2, width: 20, height: 20, borderRadius: '50%', background: '#fff',
            border: '1px solid rgba(0,0,0,.2)', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transform: 'translateX(-50%)',
            pointerEvents: 'none', left: `${(hsv.h / 360) * 100}%`,
          }} />
        </div>

        {logoColors.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>De tu logo:</span>
            {logoColors.map((c) => (
              <button key={c} type="button" onClick={() => emit(hexToHsv(c))}
                style={{ width: 28, height: 28, borderRadius: 8, background: c, border: '1px solid rgba(0,0,0,.15)', cursor: 'pointer' }}
                aria-label={`Usar ${c}`} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ width: '100%', height: 56, borderRadius: 12, background: hex, border: '1px solid rgba(0,0,0,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: on, fontSize: 13, fontWeight: 600 }}>
          Reservar
        </div>
        <input
          type="text" value={hex} maxLength={7}
          onChange={(e) => { const v = e.target.value.trim(); if (/^#?[0-9a-fA-F]{6}$/.test(v)) emit(hexToHsv(v.charAt(0) === '#' ? v : '#' + v)) }}
          style={{ width: '100%', height: 34, marginTop: 8, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 10px', fontFamily: 'monospace', fontSize: 13, boxSizing: 'border-box' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 34, marginTop: 8, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer', position: 'relative' }}>
          Del sistema
          <input type="color" value={hex} onChange={(e) => emit(hexToHsv(e.target.value))} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} aria-label="Elegir color del sistema" />
        </label>
        <div style={{ marginTop: 8, fontSize: 11, color: '#059669', textAlign: 'center' }}>
          Texto {on === '#FFFFFF' ? 'blanco' : 'oscuro'} · {ratio(hex, on).toFixed(1)}:1
        </div>
      </div>
    </div>
  )
}
