import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { MapPin, CaretRight } from '@phosphor-icons/react'
import { getActiveTenant, setTenant, setTenantOverride, urlMicrositio, buildImageUrl } from '@/services/apiClient'
import { marcaService, MarcaPublica, SedeDeMarca } from '@/services/marcaService'
import { NegocioNoDisponible } from '@/components/NegocioNoDisponible'

/**
 * Portada pública de una MARCA (kisha.barber.pe o barber.pe/marca/kisha): lista sus
 * SEDES como tarjetas sobre un fondo estilo login. Solo tiene sentido con 2+ Sedes;
 * con 1 el router entra directo al micrositio. Cada tarjeta abre esa Sede.
 * El acento usa el color de marca elegido por el negocio (colorPrimarioHex).
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

  // Slug de zona = subdominio de la sede sin el prefijo de la marca.
  // Ej: "shanell-salon-miraflores" con marca "shanell-salon" → "miraflores".
  const zonaDeSubdominio = (sub: string, slugMarca: string): string => {
    const pref = `${slugMarca}-`.toLowerCase()
    const s = sub.toLowerCase()
    return s.startsWith(pref) ? s.slice(pref.length) : s
  }

  const abrirSede = (s: SedeDeMarca) => {
    if (!s.subdominio) { navigate(`/sede/${s.idSede}`); return }
    // PROD: link único — nos quedamos en el MISMO dominio del negocio
    // (kisha.barber.pe/miraflores), sin redirigir al subdominio de la sede.
    if (window.location.hostname.endsWith('barber.pe') && marca?.slugMarca) {
      const zona = zonaDeSubdominio(s.subdominio, marca.slugMarca)
      setTenantOverride(s.subdominio)
      navigate(`/${zona}`)
      return
    }
    // DEV (localhost, sin subdominios reales): se usa ?s= como siempre.
    setTenant(s.subdominio)
    const url = urlMicrositio(s.subdominio)
    navigate(`/sede/${s.idSede}${url.startsWith('/') ? url.slice(1) : ''}`)
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
  const brand = marca.sedes[0]?.colorPrimarioHex || '#2855F6'
  const rgba = (hex: string, a: number) => {
    const h = hex.replace('#', '')
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    const r = parseInt(n.slice(0, 2), 16) || 40
    const g = parseInt(n.slice(2, 4), 16) || 85
    const b = parseInt(n.slice(4, 6), 16) || 246
    return `rgba(${r},${g},${b},${a})`
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Fondo estilo login */}
      <img src="/login-barberia.jpg" alt="" aria-hidden="true"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(180deg, rgba(9,14,28,.74) 0%, rgba(9,14,28,.88) 55%, rgba(9,14,28,.95) 100%)' }} />

      {/* Contenido */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, padding: '52px 20px 44px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          {logo && (
            <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 16px' }}>
              <div style={{ position: 'absolute', inset: -6, borderRadius: 26, background: rgba(brand, 0.45), filter: 'blur(18px)' }} />
              <img src={buildImageUrl(logo)} alt={marca.nombreComercial}
                style={{ position: 'relative', width: 90, height: 90, borderRadius: 22, objectFit: 'cover', boxShadow: '0 10px 34px rgba(0,0,0,.4)' }} />
            </div>
          )}
          <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>
            {marca.nombreComercial}
          </h1>
          <p style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,.82)', fontSize: 14, marginTop: 10, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.16)', padding: '5px 14px', borderRadius: 999 }}>
            <MapPin size={15} weight="fill" style={{ color: brand }} />
            Elige tu sede · {marca.sedes.length}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {marca.sedes.map((s) => (
            <button key={s.idSede} onClick={() => abrirSede(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                background: '#fff', border: '1px solid rgba(255,255,255,.5)',
                borderRadius: 18, padding: '15px 16px', cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,.22)', transition: 'transform .14s ease, box-shadow .14s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 14px 30px ${rgba(brand, 0.3)}` }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.22)' }}
            >
              <span style={{ width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', background: rgba(brand, 0.12), color: brand, flexShrink: 0 }}>
                <MapPin size={22} weight="fill" />
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 700, color: '#111827', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.nombre}
                </span>
                <span style={{ display: 'block', fontSize: 13, color: '#6b7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {[s.direccion, s.distrito].filter(Boolean).join(' · ') || 'Sede disponible'}
                </span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#fff', fontWeight: 700, fontSize: 13.5, flexShrink: 0, background: brand, padding: '8px 12px', borderRadius: 11 }}>
                Reservar <CaretRight size={15} weight="bold" />
              </span>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: 12, marginTop: 26 }}>
          Reserva online · {marca.nombreComercial}
        </p>
      </div>
    </div>
  )
}
