import { useEffect, useState } from 'react'
import { superAdminBillingService, type SuperAdminBilling, type EmpresaBilling } from '@/services/superAdminBillingService'

const soles = (n?: number | null) => `S/ ${Number(n || 0).toFixed(2)}`
const fecha = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const estadoColor: Record<string, string> = {
  Activa: 'bg-emerald-100 text-emerald-700',
  Trial: 'bg-indigo-100 text-indigo-700',
  Demo: 'bg-indigo-100 text-indigo-700',
  PeriodoGracia: 'bg-amber-100 text-amber-700',
  PagoPendiente: 'bg-amber-100 text-amber-700',
  PagoVencido: 'bg-red-100 text-red-700',
  Suspendida: 'bg-red-100 text-red-700',
  Cancelada: 'bg-gray-100 text-gray-600',
}

function Kpi({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{valor}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export function SuperAdminBillingPanel() {
  const [data, setData] = useState<SuperAdminBilling | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const d = await superAdminBillingService.listar()
        if (vivo) setData(d)
      } catch {
        if (vivo) setError(true)
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => { vivo = false }
  }, [])

  if (loading) return <p className="text-gray-500 py-10 text-center">Cargando facturación…</p>
  if (error || !data) return <p className="text-red-600 py-10 text-center">No se pudo cargar el panel de facturación.</p>

  const { resumen } = data
  const filas: EmpresaBilling[] = data.empresas.filter(e =>
    !q.trim() || e.nombre.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi titulo="Empresas" valor={String(resumen.totalEmpresas)} sub={`${resumen.activas} activas`} />
        <Kpi titulo="En prueba" valor={String(resumen.enTrial)} />
        <Kpi titulo="Suspendidas" valor={String(resumen.suspendidas)} />
        <Kpi titulo="Ingresos del mes" valor={soles(resumen.ingresosMesPEN)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi titulo="Webhooks recibidos" valor={String(resumen.webhooksTotal)} />
        <Kpi titulo="Webhooks con error" valor={String(resumen.webhooksConError)}
             sub={resumen.webhooksConError > 0 ? 'Revisar' : 'OK'} />
      </div>

      {/* Buscador */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar empresa…"
        className="w-full md:w-72 px-3 py-2 rounded-lg border border-gray-300 text-sm"
      />

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
              <th className="py-2.5 px-3 font-medium">Empresa</th>
              <th className="py-2.5 px-3 font-medium">Plan</th>
              <th className="py-2.5 px-3 font-medium">Estado</th>
              <th className="py-2.5 px-3 font-medium">Trial / Cobro</th>
              <th className="py-2.5 px-3 font-medium">Stripe</th>
              <th className="py-2.5 px-3 font-medium">WhatsApp/mes</th>
              <th className="py-2.5 px-3 font-medium">Referidos</th>
              <th className="py-2.5 px-3 font-medium">Saldo</th>
              <th className="py-2.5 px-3 font-medium">Último pago</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((e) => (
              <tr key={e.idEmpresa} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-medium text-gray-800">{e.nombre}</td>
                <td className="py-2 px-3 text-gray-600">{e.plan ?? '—'}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColor[e.estado] ?? 'bg-gray-100 text-gray-600'}`}>{e.estado}</span>
                </td>
                <td className="py-2 px-3 text-gray-600">{fecha(e.trialEnd ?? e.proximoCobro)}</td>
                <td className="py-2 px-3 text-gray-600">
                  {e.tieneStripeSubscription ? '✅ Sub' : e.tieneStripeCustomer ? '👤 Cust' : '—'}
                </td>
                <td className="py-2 px-3 text-gray-700">{e.whatsAppUsadoMes}</td>
                <td className="py-2 px-3 text-gray-700">{e.referidosConfirmados}</td>
                <td className="py-2 px-3 text-gray-700">{soles(e.saldoReferidoPEN)}</td>
                <td className="py-2 px-3 text-gray-600">
                  {e.ultimoPagoFecha ? `${fecha(e.ultimoPagoFecha)} · ${e.ultimoPagoEstado}` : '—'}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-gray-400">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
