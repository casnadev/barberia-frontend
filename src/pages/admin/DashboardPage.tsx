import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Activity, Clock, User, TrendingDown, Wallet, CalendarDays, ShoppingBag, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { ventasService, type ResumenFinanciero } from '@/services/ventasService'
import { clientesService } from '@/services/clientesService'
import { reservasService } from '@/services/reservasService'
import { sedeTenantService } from '@/services/sedeTenantService'
import { getActiveTenant } from '@/services/apiClient'
import { exportarExcel, exportarPDF, type FilaVenta } from '@/utils/exportReportes'
import { toast } from 'sonner'
import { CompletaTuNegocio } from '@/components/CompletaTuNegocio'
import { CalendarModal } from '@/pages/cliente/CalendarModal'
import { AvisoBanner } from '@/components/AvisoBanner'
import s from '@/styles/Dashboard.module.css'

type RangoKey = 'hoy' | 'semana' | 'mes' | 'custom'

const RANGOS: { key: RangoKey; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'custom', label: 'Personalizado' },
]

// Fecha local YYYY-MM-DD (evita el corrimiento UTC de toISOString).
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const fmtCorta = (iso: string) => {
  try { return new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) }
  catch { return iso }
}

// Etiqueta corta de día para la gráfica ("L", "12", etc.).
const fmtDia = (iso: string) => {
  try {
    const dd = new Date(`${iso}T00:00:00`)
    return String(dd.getDate())
  } catch { return iso }
}

// Monto "S/ X.XX" con el "S/" más chico y tenue (el número es el héroe).
function Monto({ n, cur }: { n?: number; cur: string }) {
  const txt = Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return <><span className={cur}>S/</span>{txt}</>
}

// Gráfica de ventas. Desktop = línea (área), móvil = barras (vía CSS toggling).
function VentasChart({ serie }: { serie: { label: string; valor: number }[] }) {
  if (!serie.length) {
    return <div className={s.chartEmpty}>Sin datos en este periodo.</div>
  }
  const max = Math.max(1, ...serie.map((p) => p.valor))
  const total = serie.reduce((a, b) => a + b.valor, 0)
  const W = 600, H = 150, padX = 24, padTop = 14, base = 122
  const n = serie.length
  const step = n > 1 ? (W - padX * 2) / (n - 1) : 0
  const pts = serie.map((p, i) => {
    const x = n > 1 ? padX + i * step : W / 2
    const y = base - (p.valor / max) * (base - padTop)
    return [x, y] as [number, number]
  })
  const linePath = pts.map((p) => `${p[0]},${p[1]}`).join(' ')
  const areaPath = `${linePath} ${pts[n - 1][0]},${base} ${pts[0][0]},${base}`

  // Barras (para móvil). Ancho según cantidad.
  const bw = Math.min(26, (W - padX * 2) / n - 6)

  return (
    <>
      {/* LÍNEA — visible en desktop */}
      <svg viewBox={`0 0 ${W} ${H}`} className={s.chartSvgLine} preserveAspectRatio="none">
        <line x1={padX} y1={base} x2={W - padX} y2={base} stroke="#e5e7eb" strokeWidth="1" />
        <polygon points={areaPath} fill="#2855F6" opacity="0.08" />
        <polyline points={linePath} fill="none" stroke="#2855F6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#2855F6" />)}
      </svg>
      {/* BARRAS — visible en móvil */}
      <svg viewBox={`0 0 ${W} ${H}`} className={s.chartSvgBars} preserveAspectRatio="none">
        <line x1={padX} y1={base} x2={W - padX} y2={base} stroke="#e5e7eb" strokeWidth="1" />
        {serie.map((p, i) => {
          const x = n > 1 ? padX + i * step : W / 2
          const bh = (p.valor / max) * (base - padTop)
          return <rect key={i} x={x - bw / 2} y={base - bh} width={bw} height={Math.max(2, bh)} rx="3" fill="#2855F6" opacity={0.4 + 0.5 * (p.valor / max)} />
        })}
      </svg>
      <div className={s.chartTotal}>Total del periodo: <strong>S/ {total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
    </>
  )
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [rango, setRango] = useState<RangoKey>('hoy')
  const hoyISO = isoLocal(new Date())
  const [desde, setDesde] = useState(hoyISO)
  const [hasta, setHasta] = useState(hoyISO)
  const [calRango, setCalRango] = useState<'desde' | 'hasta' | null>(null)

  const [resumen, setResumen] = useState<ResumenFinanciero | null>(null)
  const [clientes, setClientes] = useState(0)
  const [reservasHoy, setReservasHoy] = useState(0)
  const [reservasConfirmadas, setReservasConfirmadas] = useState(0)
  const [serie, setSerie] = useState<{ label: string; valor: number }[]>([])
  // Race guard: id de la última petición. Solo la última aplica su resultado,
  // evitando que una respuesta lenta (rango anterior) pise los datos actuales
  // o deje el spinner colgado al cambiar de sección/rango.
  const reqId = useRef(0)

  // Rango efectivo (desde/hasta) según la opción elegida.
  const { d, h } = useMemo(() => {
    const today = new Date()
    if (rango === 'hoy') return { d: isoLocal(today), h: isoLocal(today) }
    if (rango === 'semana') {
      const monday = new Date(today)
      const off = (today.getDay() + 6) % 7
      monday.setDate(today.getDate() - off)
      return { d: isoLocal(monday), h: isoLocal(today) }
    }
    if (rango === 'mes') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      return { d: isoLocal(first), h: isoLocal(today) }
    }
    return { d: desde, h: hasta }
  }, [rango, desde, hasta])

  useEffect(() => { cargarResumen() /* eslint-disable-next-line */ }, [d, h])
  useEffect(() => { cargarHoy() }, [])

  const cargarResumen = async () => {
    const myReq = ++reqId.current   // marca esta como la petición vigente
    setLoading(true)
    try {
      // Paraleliza resumen + ventas (antes era en serie = el doble de espera).
      const [resumenRes, ventas] = await Promise.all([
        ventasService.getResumenFinanciero(d, h),
        ventasService.listarVentas({ desde: d, hasta: h, tamanoPagina: 1000 }),
      ])
      // Si mientras tanto se disparó otra carga (cambio de rango), descarta esta.
      if (myReq !== reqId.current) return
      setResumen(resumenRes)
      setSerie(construirSerie(ventas))
    }
    catch {
      if (myReq === reqId.current) toast.error('No se pudo cargar el resumen')
    }
    finally {
      // Solo la última petición apaga el spinner (evita que una vieja lo apague antes).
      if (myReq === reqId.current) setLoading(false)
    }
  }

  // Agrupa las ventas por día del rango (alimenta la gráfica).
  const construirSerie = (ventas: any[]): { label: string; valor: number }[] => {
    const dias: string[] = []
    const di = new Date(`${d}T00:00:00`), hi = new Date(`${h}T00:00:00`)
    for (let cur = new Date(di); cur <= hi; cur.setDate(cur.getDate() + 1)) dias.push(isoLocal(new Date(cur)))
    const porDia: Record<string, number> = {}
    dias.forEach((x) => { porDia[x] = 0 })
    ;(ventas || []).forEach((v: any) => {
      const f = v.fechaVenta ? isoLocal(new Date(v.fechaVenta)) : null
      if (f && f in porDia) porDia[f] += Number(v.total || 0)
    })
    return dias.map((x) => ({ label: fmtDia(x), valor: porDia[x] }))
  }

  // "Hoy" (agenda) y clientes: independientes del rango financiero.
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

  // ─── Exportación (Excel / PDF) ───
  const [exportMenu, setExportMenu] = useState(false)
  const [exportando, setExportando] = useState(false)

  const nombreNegocio = async (): Promise<string> => {
    try {
      const mis = await sedeTenantService.getMisSedes()
      const activa = mis.find((x) => x.subdominio === getActiveTenant()) ?? mis[0]
      return activa?.nombre || 'Mi negocio'
    } catch { return 'Mi negocio' }
  }

  const periodoLabel = d === h ? fmtCorta(d) : `${fmtCorta(d)} – ${fmtCorta(h)}`

  const exportar = async (tipo: 'excel' | 'pdf') => {
    setExportMenu(false)
    if (!resumen) { toast.error('Aún no hay datos para exportar'); return }
    setExportando(true)
    try {
      const [ventas, negocio] = await Promise.all([
        ventasService.listarVentas({ desde: d, hasta: h, tamanoPagina: 1000 }),
        nombreNegocio(),
      ])
      const filas: FilaVenta[] = (ventas || []).map((v: any) => ({
        fecha: v.fechaVenta ? new Date(v.fechaVenta).toLocaleDateString('es-PE') : '',
        cliente: v.nombreCliente || 'Walk-in',
        metodoPago: v.metodoPago || '—',
        estado: v.estado || '—',
        total: Number(v.total || 0),
      }))
      const resumenExp = {
        totalVentas: resumen.totalVentas ?? 0,
        totalPagosTrabajadores: resumen.totalPagosTrabajadores ?? 0,
        totalGastos: resumen.totalGastos ?? 0,
        utilidad: resumen.utilidad ?? 0,
        cantidadVentas: resumen.cantidadVentas ?? 0,
      }
      const meta = { negocio, periodoLabel }
      if (tipo === 'excel') await exportarExcel(filas, resumenExp, meta)
      else await exportarPDF(filas, resumenExp, meta)
      toast.success(`Reporte ${tipo === 'excel' ? 'Excel' : 'PDF'} generado`)
    } catch (e) {
      console.error(e)
      toast.error('No se pudo generar el reporte')
    } finally {
      setExportando(false)
    }
  }

  const utilidad = resumen?.utilidad ?? 0
  const utilidadPos = utilidad >= 0
  const tituloRango = rango === 'hoy' ? 'Resumen de hoy'
    : rango === 'semana' ? 'Resumen de la semana'
    : rango === 'mes' ? 'Resumen del mes'
    : 'Resumen del periodo'

  return (
    <>
      <AvisoBanner />
      <CompletaTuNegocio />

      {/* LAYOUT: card azul (hero) + panel de rango/contenido al lado */}
      <div className={s.topGrid}>

        {/* HERO con título + EN VIVO + fecha + 4 métricas dentro */}
        <motion.div className={s.hero} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
          <div className={s.heroGlow} />
          <div className={s.heroHead}>
            <span className={s.heroLabel}><Activity width={13} height={13} /> Utilidad neta</span>
            {rango === 'hoy' && <span className={s.heroLive} title="En vivo"><span className={s.heroLiveDot} /></span>}
          </div>
          <div className={s.heroValue}>
            {loading ? <span className={s.sk} style={{ width: 180, height: 38 }} />
              : <>{!utilidadPos && '−'}<span className={s.heroCur}>S/</span>{Math.abs(utilidad).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>}
          </div>
          <div className={s.heroDate}>{tituloRango} · {d === h ? fmtCorta(d) : `${fmtCorta(d)} – ${fmtCorta(h)}`}{loading && ' · actualizando…'}</div>
          <div className={s.heroFoot}>
            <div className={s.heroStat}>
              <span className={s.heroStatLabel}><ShoppingBag width={12} height={12} /> Ventas</span>
              <div className={s.heroStatValue}>{loading ? <span className={s.sk} /> : <Monto n={resumen?.totalVentas} cur={s.heroCur} />}</div>
              <span className={s.heroStatSub}>{resumen?.cantidadVentas ?? 0} venta{(resumen?.cantidadVentas ?? 0) === 1 ? '' : 's'}</span>
            </div>
            <div className={s.heroStat}>
              <span className={s.heroStatLabel}><Wallet width={12} height={12} /> Pagos</span>
              <div className={s.heroStatValue}>{loading ? <span className={s.sk} /> : <Monto n={resumen?.totalPagosTrabajadores} cur={s.heroCur} />}</div>
              <span className={s.heroStatSub}>Comisiones</span>
            </div>
            <div className={s.heroStat}>
              <span className={s.heroStatLabel}><TrendingDown width={12} height={12} /> Gastos</span>
              <div className={s.heroStatValue}>{loading ? <span className={s.sk} /> : <Monto n={resumen?.totalGastos} cur={s.heroCur} />}</div>
              <span className={s.heroStatSub}>Egresos</span>
            </div>
            <div className={s.heroStat}>
              <span className={s.heroStatLabel}><Calendar width={12} height={12} /> Reservas</span>
              <div className={s.heroStatValue}>{reservasHoy}</div>
              <span className={s.heroStatSub}>{reservasConfirmadas} confirmadas</span>
            </div>
          </div>
        </motion.div>

        {/* Panel derecho: botones (Exportar + rango) y contenido bajo "Personalizado" */}
        <div className={s.sidePanel}>
          <div className={s.controlsRow}>
            <div className={s.exportWrap}>
              <button className={s.exportBtn} onClick={() => setExportMenu((v) => !v)} disabled={exportando}>
                <Download width={15} height={15} />
                {exportando ? 'Generando…' : 'Exportar'}
              </button>
              {exportMenu && (
                <>
                  <div className={s.exportBackdrop} onClick={() => setExportMenu(false)} />
                  <div className={s.exportMenu}>
                    <button className={s.exportItem} onClick={() => exportar('excel')}>
                      <FileSpreadsheet width={16} height={16} color="#16a34a" /> Excel (.xlsx)
                    </button>
                    <button className={s.exportItem} onClick={() => exportar('pdf')}>
                      <FileText width={16} height={16} color="#dc2626" /> PDF
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className={s.rangeBar}>
              {RANGOS.map(r => (
                <button key={r.key} onClick={() => setRango(r.key)} className={`${s.rangeBtn} ${rango === r.key ? s.rangeBtnActive : ''}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {rango === 'custom' && (
            <div className={s.customRow}>
              <button type="button" className={s.dateBtn} onClick={() => setCalRango('desde')}>
                <CalendarDays width={14} height={14} color="#2563eb" /> {fmtCorta(desde)}
              </button>
              <span className={s.dateArrow}>→</span>
              <button type="button" className={s.dateBtn} onClick={() => setCalRango('hasta')}>
                <CalendarDays width={14} height={14} color="#2563eb" /> {fmtCorta(hasta)}
              </button>
            </div>
          )}

          {/* Atajos contextuales */}
          <div className={s.sideCard}>
            <div className={s.sideMini}>
              <Link to="/admin/clientes" className={s.sideMiniRow}><span><User width={14} height={14} /> Clientes</span><strong>{clientes}</strong></Link>
              <Link to="/admin/reservas" className={s.sideMiniRow}><span><Clock width={14} height={14} /> Reservas hoy</span><strong>{reservasHoy}</strong></Link>
            </div>
          </div>
        </div>
      </div>

      <CalendarModal isOpen={calRango === 'desde'} selectedDate={desde} allowPast
        onSelectDate={(x) => { if (x <= hasta) setDesde(x) }} onClose={() => setCalRango(null)} />
      <CalendarModal isOpen={calRango === 'hasta'} selectedDate={hasta} allowPast
        onSelectDate={(x) => { if (x >= desde && x <= hoyISO) setHasta(x) }} onClose={() => setCalRango(null)} />

      {/* GRÁFICA de ventas (cambia con el rango) */}
      <div className={s.chartCard}>
        <div className={s.chartHead}>
          <div className={s.chartTitle}>Ventas <span className={s.chartRango}>· {tituloRango.replace('Resumen de ', '').replace('Resumen del ', '').replace('Resumen de la ', '')}</span></div>
        </div>
        {loading ? <div className={s.chartEmpty}>Cargando…</div> : <VentasChart serie={serie} />}
      </div>
    </>
  )
}
