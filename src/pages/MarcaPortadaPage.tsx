import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, ChevronRight, Loader2 } from 'lucide-react'
import { getActiveTenant, setTenant, urlMicrositio, buildImageUrl } from '@/services/apiClient'
import { marcaService, MarcaPublica, SedeDeMarca } from '@/services/marcaService'
import { NegocioNoDisponible } from '@/components/NegocioNoDisponible'

/**
 * Portada pública de una MARCA (kisha.barber.pe o barber.pe/marca/kisha): lista sus
 * SEDES como tarjetas sobre un fondo estilo login. Solo tiene sentido con 2+ Sedes;
 * con 1 el router entra directo al micrositio. Cada tarjeta abre esa Sede. (Bloque A · Tanda 2.)
 */
export function MarcaPortadaPage({ slug: slugProp }: { slug?: string } = {}) {
  const { slugMarca: slugParam } = useParams()
  const navigate = useNavigate()
  const slug = slugProp || slugParam || getActiveTenant() || ''

  const [estado, setEstado] = useState<'cargando' | 'ok' | 'vacio'>('cargando')
  const [marca, setMarca] = useState<MarcaPublica | null>(null)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      if (!slug) { setEstado('vacio'); return }
      const data = await marcaService.getPortada(slug)
      if (cancelado) return
      if (!data || data.sedes.length === 0) { setEstado('vacio'); return }
      setMarca(data)
      setEstado('ok')
    })()
    return () => { cancelado = true }
  }, [slug])

  const abrirSede = (s: SedeDeMarca) => {
    if (!s.subdominio) { navigate(`/sede/${s.idSede}`); return }
    const url = urlMicrositio(s.subdominio)
    if (url.startsWith('http')) {
      window.location.href = url                        // prod: subdominio canónico
    } else {
      setTenant(s.subdominio)                           // dev: ?s= manda en esta pestaña
      navigate(`/sede/${s.idSede}${url.slice(1)}`)
    }
  }

  if (estado === 'cargando') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b1220' }}>
        <Loader2 className="w-8 h-8 animate-spin text-white/80" />
      </div>
    )
  }

  if (estado === 'vacio' || !marca) {
    return <NegocioNoDisponible mensaje="No encontramos Sedes disponibles para este negocio." />
  }

  const logo = marca.sedes[0]?.urlLogo

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Fondo estilo login */}
      <img
        src="/login-barberia.jpg"
        alt=""
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(180deg, rgba(9,14,28,.72) 0%, rgba(9,14,28,.86) 60%, rgba(9,14,28,.94) 100%)' }} />

      {/* Contenido */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, padding: '48px 20px 40px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {logo && (
            <img
              src={buildImageUrl(logo)}
              alt={marca.nombreComercial}
              style={{ width: 84, height: 84, borderRadius: 20, objectFit: 'cover', margin: '0 auto 16px', boxShadow: '0 8px 30px rgba(0,0,0,.35)' }}
            />
          )}
          <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 800, letterSpacing: '-.02em' }}>
            {marca.nombreComercial}
          </h1>
          <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 15, marginTop: 6 }}>
            Elige tu Sede ({marca.sedes.length})
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {marca.sedes.map((s) => (
            <button
              key={s.idSede}
              onClick={() => abrirSede(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                background: 'rgba(255,255,255,.97)', border: '1px solid rgba(255,255,255,.6)',
                borderRadius: 16, padding: 16, cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0,0,0,.18)', transition: 'transform .12s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span style={{ width: 46, height: 46, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(40,85,246,.12)', color: '#2855F6', flexShrink: 0 }}>
                <MapPin className="w-5 h-5" />
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {marca.nombreComercial} – {s.nombre}
                </span>
                <span style={{ display: 'block', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {[s.direccion, s.distrito].filter(Boolean).join(' · ') || 'Sede disponible'}
                </span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#2855F6', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                Reservar <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
