import { useState, useEffect } from 'react'
import { getActiveTenant, setTenant } from '@/services/apiClient'
import { sedeTenantService, MiSede, CapacidadSedes } from '@/services/sedeTenantService'
import { MapPin, ChevronDown, Check, Plus } from 'lucide-react'
import AgregarLocalModal from './AgregarLocalModal'
import UpsellSedeModal from './UpsellSedeModal'
import s from '@/styles/SedeSwitcher.module.css'

/**
 * Selector de sede para el header del admin.
 * - Muestra la marca (Empresa) como grupo y sus SEDES por zona.
 * - "Agregar nueva Sede" SIEMPRE visible: si el plan/override lo permite abre el alta;
 *   si no, abre el modal de upsell ("Mejora tu plan para tener más de 1 Sede").
 * Terminología: siempre "Sede" (nunca "local" ni "marca" en los botones).
 */
export function SedeSwitcher() {
  const [sedes, setSedes] = useState<MiSede[]>([])
  const [cap, setCap] = useState<CapacidadSedes | null>(null)
  const [active, setActive] = useState('')
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState(false)
  const [upsell, setUpsell] = useState(false)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const [lista, capacidad] = await Promise.all([
          sedeTenantService.getMisSedesCached(),
          sedeTenantService.getCapacidad().catch(() => null),
        ])
        if (cancelado) return
        setSedes(lista)
        setCap(capacidad)
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
    window.location.reload()   // recarga completa = data fresca de la sede (sin cruces)
  }

  const onCreado = (nuevoSubdominio: string) => {
    setTenant(nuevoSubdominio)
    window.location.reload()
  }

  // "Agregar nueva Sede": con cupo → alta; sin cupo → upsell.
  const clickAgregar = () => {
    setOpen(false)
    if (cap?.puedeAgregar) setModal(true)
    else setUpsell(true)
  }

  if (sedes.length === 0) return null

  const marca = sedes[0]?.nombreComercial
  const activa = sedes.find((x) => x.subdominio === active) ?? sedes[0]
  const varias = sedes.length >= 2
  // Con 1 sede el trigger muestra la marca; con varias, la zona activa.
  const triggerName = varias ? (activa?.nombre ?? 'Selecciona') : (marca || activa?.nombre || 'Mi negocio')

  return (
    <div className={s.switcher}>
      <button className={s.trigger} onClick={() => setOpen((v) => !v)}>
        <span className={s.pinWrap}><MapPin size={15} /></span>
        <span className={s.triggerText}>
          <span className={s.triggerLabel}>Sede activa</span>
          <span className={s.triggerName}>{triggerName}</span>
        </span>
        <ChevronDown size={16} className={`${s.chev} ${open ? s.chevOpen : ''}`} />
      </button>

      {open && (
        <>
          <div className={s.backdrop} onClick={() => setOpen(false)} />
          <div className={s.menu}>
            <div className={s.menuHead}>
              {marca
                ? `${marca} · ${sedes.length} ${sedes.length === 1 ? 'Sede' : 'Sedes'}`
                : `Mis Sedes (${sedes.length})`}
            </div>
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

            <div className={s.divider} />
            <button className={s.addBtn} onClick={clickAgregar}>
              <span className={s.addIcon}><Plus size={16} /></span>
              <span className={s.addName}>Agregar nueva Sede</span>
            </button>
          </div>
        </>
      )}

      <AgregarLocalModal
        open={modal}
        onClose={() => setModal(false)}
        sedes={sedes}
        onCreated={onCreado}
      />
      <UpsellSedeModal open={upsell} onClose={() => setUpsell(false)} />
    </div>
  )
}
