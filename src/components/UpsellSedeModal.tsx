import { createPortal } from 'react-dom'
import { Sparkle as Sparkles, X } from '@phosphor-icons/react'

/**
 * Modal que aparece cuando el Admin toca "Agregar nueva Sede" pero su plan no se lo
 * permite. Mensaje amable, en términos de SEDE (nunca "local" ni "marca"). (Bloque A.)
 * Se renderiza vía portal en <body> para quedar SIEMPRE centrado en el viewport
 * (evita quedar pegado arriba si un ancestro tiene transform).
 */
export default function UpsellSedeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(17,24,39,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 380,
          padding: '28px 24px', textAlign: 'center', position: 'relative',
          boxShadow: '0 20px 60px rgba(17,24,39,.25)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
        >
          <X size={20} />
        </button>

        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
          display: 'grid', placeItems: 'center', background: 'rgba(40,85,246,.1)', color: '#2855F6',
        }}>
          <Sparkles size={26} />
        </div>

        <h2 style={{ fontSize: 19, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
          Mejora tu plan para tener más de 1 Sede
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5, marginBottom: 22 }}>
          Tu plan actual incluye una sola Sede. Sube de plan y abre todas las Sedes que necesites,
          cada una con su propia agenda y equipo.
        </p>

        <a
          href="/admin/mi-plan"
          style={{
            display: 'block', textDecoration: 'none', background: '#2855F6', color: '#fff',
            fontWeight: 700, padding: '12px', borderRadius: 12, marginBottom: 8,
          }}
        >
          Ver planes
        </a>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer', padding: 6 }}
        >
          Ahora no
        </button>
      </div>
    </div>,
    document.body,
  )
}
