import { useState, useEffect } from 'react'
import { getActiveTenant, setTenant } from '@/services/apiClient'
import { sedeTenantService, MiSede } from '@/services/sedeTenantService'
import { MapPin, ChevronDown, Check } from 'lucide-react'
import s from '@/styles/SedeSwitcher.module.css'

/**
 * Selector de sede inline para el header del admin.
 * Reutiliza la lógica del TenantGate (Mis sedes + tenant activo + cambiar/reload).
 */
export function SedeSwitcher() {
  const [sedes, setSedes] = useState<MiSede[]>([])
  const [active, setActive] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const lista = await sedeTenantService.getMisSedes()
        if (cancelado) return
        setSedes(lista)
        setActive(getActiveTenant())
      } catch {
        /* silencioso: el TenantGate ya maneja el guard */
      }
    })()
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const cambiarSede = (sub: string) => {
    setOpen(false)
    if (!sub || sub === getActiveTenant()) return
    setTenant(sub)
    window.location.reload()
  }

  if (sedes.length === 0) return null

  const activa = sedes.find((x) => x.subdominio === active) ?? sedes[0]

  // Una sola sede → pill estática (sin dropdown)
  if (sedes.length === 1) {
    return (
      <div className={s.switcher}>
        <div className={s.staticPill}>
          <span className={s.pinWrap}><MapPin size={15} /></span>
          <span className={s.triggerText}>
            <span className={s.triggerLabel}>Sede</span>
            <span className={s.triggerName}>{sedes[0].nombre}</span>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={s.switcher}>
      <button className={s.trigger} onClick={() => setOpen((v) => !v)}>
        <span className={s.pinWrap}><MapPin size={15} /></span>
        <span className={s.triggerText}>
          <span className={s.triggerLabel}>Sede activa</span>
          <span className={s.triggerName}>{activa?.nombre ?? 'Selecciona sede'}</span>
        </span>
        <ChevronDown size={16} className={`${s.chev} ${open ? s.chevOpen : ''}`} />
      </button>

      {open && (
        <>
          <div className={s.backdrop} onClick={() => setOpen(false)} />
          <div className={s.menu}>
            <div className={s.menuHead}>Mis sedes ({sedes.length})</div>
            {sedes.map((sede) => {
              const esActiva = sede.subdominio === active
              return (
                <button
                  key={sede.idSede}
                  className={`${s.item} ${esActiva ? s.itemActive : ''}`}
                  onClick={() => cambiarSede(sede.subdominio)}
                >
                  <span className={s.itemDot}><MapPin size={15} /></span>
                  <span className={s.itemText}>
                    <span className={s.itemName}>{sede.nombre}</span>
                    <span className={s.itemSub}>{sede.subdominio}</span>
                  </span>
                  {esActiva && <Check size={16} className={s.check} />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
