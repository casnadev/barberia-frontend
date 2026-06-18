import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DollarSign, Users, Calendar, Activity, Clock, Scissors, User, TrendingDown, Wallet, Calculator } from 'lucide-react'
import { ventasService, type ResumenFinanciero } from '@/services/ventasService'
import { clientesService } from '@/services/clientesService'
import { reservasService } from '@/services/reservasService'
import { toast } from 'sonner'
import { AdminLayout } from '@/components/AdminLayout'
import { CompletaTuNegocio } from '@/components/CompletaTuNegocio'
import { AvisoBanner } from '@/components/AvisoBanner'
import s from '@/styles/Dashboard.module.css'

type RangoKey = 'hoy' | 'semana' | 'mes' | 'custom'

const RANGOS: { key: RangoKey; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'custom', label: 'Personalizado' },
]

// Fecha local en formato YYYY-MM-DD (evita el corrimiento de toISOString por UTC).
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const fmtCorta = (iso: string) => {
  try { return new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) }
  catch { return iso }
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [rango, setRango] = useState<RangoKey>('hoy')
  const hoyISO = isoLocal(new Date())
  const [desde, setDesde] = useState(hoyISO)
  const [hasta, setHasta] = useState(hoyISO)

  const [resumen, setResumen] = useState<ResumenFinanciero | null>(null)
  const [clientes, setClientes] = useState(0)
  const [reservasHoy, setReservasHoy] = useState(0)
  const [reservasConfirmadas, setReservasConfirmadas] = useState(0)

  // Rango efectivo (desde/hasta) según la opción elegida.
  const { d, h } = useMemo(() => {
    const today = new Date()
    if (rango === 'hoy') return { d: isoLocal(today), h: isoLocal(today) }
    if (rango === 'semana') {
      const monday = new Date(today)
      const off = (today.getDay() + 6) % 7         // lunes = inicio de semana
      monday.setDate(today.getDate() - off)
      return { d: isoLocal(monday), h: isoLocal(today) }
    }
    if (rango === 'mes') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      return { d: isoLocal(first), h: isoLocal(today) }
    }
    return { d: desde, h: hasta }                   // custom
  }, [rango, desde, hasta])

  useEffect(() => { cargarResumen() /* eslint-disable-next-line */ }, [d, h])
  useEffect(() => { cargarHoy() }, [])

  const cargarResumen = async () => {
    setLoading(true)
    try {
      setResumen(await ventasService.getResumenFinanciero(d, h))
    } catch { toast.error('No se pudo cargar el resumen') }
    finally { setLoading(false) }
  }

  // Datos de "hoy" (agenda) y clientes: independientes del rango financiero.
  const cargarHoy = async () => {
    try {
      const [clientesRes, reservas] = await Promise.all([
        clientesService.getClientes(),
        reservasService.getReservas(),
      ])
      setClientes(Array.isArray(clientesRes) ? clientesRes.length : 0)
      const rHoy = Array.isArray(reservas) ? reservas.filter((r: any) => r.fechaReserva === hoyISO) : []
      setReservasHoy(rHoy.length)
      setReservasConfirmadas(rHoy.filter((r: any) => r.estado === 'Confirmada').length)
    } catch { /* no bloquea el dashboard */ }
  }

  const money = (n?: number) => `S/ ${Number(n || 0).toFixed(2)}`

  const kpis = [
    { label: 'Ventas', value: money(resumen?.totalVentas), sub: `${resumen?.cantidadVentas ?? 0} venta${(resumen?.cantidadVentas ?? 0) === 1 ? '' : 's'}`, icon: DollarSign, tone: 'green', tint: 'tintGreen' },
    { label: 'Pagos a trabajadores', value: money(resumen?.totalPagosTrabajadores), icon: Wallet, tone: 'purple', tint: 'tintPurple' },
    { label: 'Gastos', value: money(resumen?.totalGastos), icon: TrendingDown, tone: 'red', tint: 'tintRed' },
    { label: 'Utilidad', value: money(resumen?.utilidad), sub: 'Ventas − pagos − gastos', icon: Activity, tone: 'blue', tint: 'tintBlue' },
    { label: 'Reservas Hoy', value: `${reservasHoy}`, sub: `${reservasConfirmadas} confirmadas`, icon: Calendar, tone: 'purple', tint: 'tintPurple' },
  ]

  const accesos = [
    { to: '/admin/servicios', icon: Scissors, title: 'Servicios', desc: 'Precios y categorías' },
    { to: '/admin/trabajadores', icon: Users, title: 'Trabajadores', desc: 'Tu equipo' },
    { to: '/admin/agenda', icon: Calendar, title: 'Agenda', desc: 'Calendario de citas' },
    { to: '/admin/clientes', icon: User, title: `Clientes (${clientes})`, desc: 'Base de clientes' },
    { to: '/admin/reservas', icon: Clock, title: 'Reservas', desc: 'Todas las citas' },
    { to: '/admin/pagos', icon: Wallet, title: 'Pagos', desc: 'Comisiones del equipo' },
    { to: '/admin/caja', icon: Calculator, title: 'Caja', desc: 'Cierre del día' },
  ]

  return (
    <AdminLayout title="Dashboard" subtitle="Resumen de tu barbería">

      <AvisoBanner />
      <CompletaTuNegocio />
      {/* Selector de rango */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {RANGOS.map(r => (
          <button
            key={r.key}
            onClick={() => setRango(r.key)}
            style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              border: rango === r.key ? '1px solid #2563eb' : '1px solid #e5e7eb',
              background: rango === r.key ? '#2563eb' : '#fff',
              color: rango === r.key ? '#fff' : '#4b5563',
            }}
          >
            {r.label}
          </button>
        ))}
        {rango === 'custom' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={desde} max={hasta} onChange={e => setDesde(e.target.value)}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 14 }} />
            <span style={{ color: '#9ca3af' }}>→</span>
            <input type="date" value={hasta} min={desde} max={hoyISO} onChange={e => setHasta(e.target.value)}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 14 }} />
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
        Mostrando: <strong>{d === h ? fmtCorta(d) : `${fmtCorta(d)} – ${fmtCorta(h)}`}</strong>
        {loading && ' · cargando…'}
      </p>

      {/* KPIs */}
      <div className={s.kpiGrid}>
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            className={s.kpiCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className={s.kpiTop}>
              <div>
                <p className={s.kpiLabel}>{k.label}</p>
                <p className={`${s.kpiValue} ${s[k.tone]}`}>{k.value}</p>
                {k.sub && <p className={s.kpiSub}>{k.sub}</p>}
              </div>
              <div className={`${s.kpiIcon} ${s[k.tint]}`}>
                <k.icon width={22} height={22} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Accesos rápidos */}
      <h2 className={s.sectionTitle}>Accesos rápidos</h2>
      <div className={s.tilesGrid}>
        {accesos.map((a, i) => (
          <motion.div
            key={a.to}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 + i * 0.05 }}
          >
            <Link to={a.to} className={s.tile}>
              <div className={s.tileIcon}><a.icon width={26} height={26} /></div>
              <span className={s.tileTitle}>{a.title}</span>
              <span className={s.tileDesc}>{a.desc}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </AdminLayout>
  )
}
