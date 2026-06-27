import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CreditCard, Copy, Share2, Users, Building2, MessageCircle,
  CheckCircle2, Clock, AlertTriangle, ExternalLink, Loader2, Gift, X, Sparkles,
} from 'lucide-react'
import { billingService, type MiPlan, type Consumo } from '@/services/billingService'
import { planesService } from '@/services/planesService'
import { mensajeriaService, type MensajeFila } from '@/services/mensajeriaService'

// ---- Helpers de formato ----
const soles = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`
const fecha = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const ESTADO_STYLE: Record<string, { label: string; cls: string }> = {
  Activa: { label: 'Activa', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Trial: { label: 'Prueba gratis', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  Demo: { label: 'Prueba gratis', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  PeriodoGracia: { label: 'Período de gracia', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  PagoPendiente: { label: 'Pago pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  PagoVencido: { label: 'Pago vencido', cls: 'bg-red-50 text-red-700 border-red-200' },
  Suspendida: { label: 'Suspendida', cls: 'bg-red-50 text-red-700 border-red-200' },
  Cancelada: { label: 'Cancelada', cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
}

function EstadoBadge({ estado }: { estado: string }) {
  const s = ESTADO_STYLE[estado] ?? { label: estado, cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' }
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>{s.label}</span>
}

function Barra({ titulo, icon: Icon, c }: { titulo: string; icon: typeof Users; c: Consumo }) {
  const pct = c.ilimitado || !c.limite ? 0 : Math.min(100, Math.round((c.usado / c.limite) * 100))
  const cerca = !c.ilimitado && c.limite ? c.usado / c.limite >= 0.8 : false
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-zinc-700">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{titulo}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-zinc-900">{c.usado}</span>
        <span className="text-sm text-zinc-500">/ {c.ilimitado ? '∞' : c.limite}</span>
      </div>
      {!c.ilimitado && (
        <div className="mt-2 h-2 rounded-full bg-zinc-100 overflow-hidden">
          <div className={`h-full rounded-full ${cerca ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="mt-1.5 text-xs text-zinc-500">
        {c.ilimitado ? 'Ilimitado en tu plan' : `${c.restante ?? 0} disponibles`}
      </p>
    </div>
  )
}

export function MiPlanPage() {
  const [accion, setAccion] = useState<'checkout' | 'portal' | null>(null)
  const [verMensajes, setVerMensajes] = useState(false)

  const { data: mp, isLoading, isError, refetch } = useQuery<MiPlan>({
    queryKey: ['mi-plan'],
    queryFn: billingService.getMiPlan,
  })

  const { data: planes = [] } = useQuery({
    queryKey: ['planes-publicos'],
    queryFn: planesService.getPublicos,
  })

  // Detalle de mensajes enviados este mes (a quién, cuándo, estado).
  const inicioMesISO = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1).toISOString() })()
  const reinicioMes = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 1) })()
  const { data: mensajes } = useQuery({
    queryKey: ['mis-mensajes-mes'],
    queryFn: () => mensajeriaService.listarMes(inicioMesISO, 50),
  })

  const irACheckout = async (idPlan: number) => {
    try {
      setAccion('checkout')
      const url = await billingService.iniciarCheckout(idPlan)
      if (url) window.location.href = url
      else toast.error('No se pudo iniciar el checkout.')
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje ?? 'No se pudo iniciar el checkout.')
    } finally {
      setAccion(null)
    }
  }

  const abrirPortal = async () => {
    try {
      setAccion('portal')
      const url = await billingService.abrirPortal()
      if (url) window.location.href = url
      else toast.error('No se pudo abrir el portal de pagos.')
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje ?? 'No se pudo abrir el portal de pagos.')
    } finally {
      setAccion(null)
    }
  }

  const copiarCodigo = async () => {
    if (!mp?.codigoReferido) return
    try {
      await navigator.clipboard.writeText(mp.codigoReferido)
      toast.success('Código copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const compartir = async () => {
    if (!mp?.codigoReferido) return
    const url = `${window.location.origin}/?ref=${encodeURIComponent(mp.codigoReferido)}`
    const texto = `Únete a Barber.pe con mi código ${mp.codigoReferido} y obtén un descuento: ${url}`
    try {
      if (navigator.share) await navigator.share({ title: 'Barber.pe', text: texto, url })
      else { await navigator.clipboard.writeText(url); toast.success('Enlace copiado') }
    } catch { /* cancelado */ }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-zinc-500"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }
  if (isError || !mp) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="mt-3 text-zinc-700">No pudimos cargar tu plan.</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-semibold">Reintentar</button>
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-6 space-y-6">
      {/* Encabezado plan */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-zinc-500 text-sm"><CreditCard className="w-4 h-4" /> Mi plan</div>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">{mp.nombrePlan}</h1>
            <div className="mt-2 flex items-center gap-3">
              <EstadoBadge estado={mp.estado} />
              <span className="text-sm text-zinc-500">{soles(mp.precioMensualPEN)} / mes</span>
            </div>
          </div>
          <div className="flex gap-2">
            {mp.tieneMetodoPago && (
              <button onClick={abrirPortal} disabled={accion === 'portal'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60">
                {accion === 'portal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Administrar pagos
              </button>
            )}
          </div>
        </div>

        {/* Datos clave */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Dato titulo="Días restantes" valor={mp.diasRestantes != null ? `${mp.diasRestantes}` : '—'} />
          <Dato titulo="Inicio" valor={fecha(mp.fechaInicio)} />
          <Dato titulo={mp.esTrial ? 'Fin de prueba' : 'Próximo cobro'} valor={fecha(mp.trialEnd ?? mp.proximoCobro)} />
          <Dato titulo="Método de pago" valor={mp.tieneMetodoPago ? (mp.proveedorPago ?? 'Configurado') : 'No configurado'} />
        </div>

        {mp.cancelAtPeriodEnd && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4" /> Tu suscripción se cancelará al final del período actual.
          </div>
        )}
      </div>

      {/* Consumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Barra titulo="WhatsApp este mes" icon={MessageCircle} c={mp.whatsApp} />
        <Barra titulo="Trabajadores" icon={Users} c={mp.trabajadores} />
        <Barra titulo="Sedes" icon={Building2} c={mp.sedes} />
      </div>

      {/* Detalle de mensajes de este mes (transparencia del consumo de WhatsApp) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-blue-600" /><h2 className="text-lg font-semibold text-zinc-900">Mensajes de este mes</h2></div>
          <span className="text-xs text-zinc-500">Se reinicia el {reinicioMes.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>
        </div>
        {!mensajes || mensajes.items.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Aún no se han enviado mensajes este mes.</p>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-zinc-500 border-b border-zinc-200">
                  <Th>Destinatario</Th><Th>Tipo</Th><Th>Fecha</Th><Th>Estado</Th>
                </tr></thead>
                <tbody>
                  {mensajes.items.slice(0, 5).map((m: MensajeFila) => (
                    <tr key={m.idMensaje} className="border-b border-zinc-100">
                      <td className="py-2 pr-3 text-zinc-800">{m.destinatarioNombre || m.destinatarioTelefono}</td>
                      <td className="py-2 pr-3 text-zinc-600">{m.codigoPlantilla}</td>
                      <td className="py-2 pr-3 text-zinc-600">{fecha(m.fechaEnviado ?? m.fechaCreacion)}</td>
                      <td className="py-2 pr-3"><EstadoMensajeBadge estado={m.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mensajes.items.length > 5 && (
              <button onClick={() => setVerMensajes(true)}
                className="mt-3 text-sm font-semibold text-blue-600 hover:underline">
                Ver todos ({mensajes.total})
              </button>
            )}
          </>
        )}
      </div>

      {/* Planes disponibles (mejorar / contratar) */}
      {planes.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Planes</h2>
          <p className="text-sm text-zinc-500">Contrata o mejora tu plan en segundos.</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {planes.map((p) => {
              const esActual = p.idPlan === mp.idPlan
              return (
                <div key={p.idPlan} className={`rounded-2xl border p-4 ${p.popular ? 'border-blue-600' : 'border-zinc-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900">{p.nombre}</span>
                    {p.popular && <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-600 text-white px-2 py-0.5 rounded-full">Popular</span>}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-zinc-900">{p.esGratis ? 'Gratis' : soles(p.precioMensualPEN)}</div>
                  <ul className="mt-3 space-y-1.5">
                    {p.caracteristicas.slice(0, 4).map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{c}</li>
                    ))}
                  </ul>
                  <button
                    disabled={esActual || p.esGratis || accion === 'checkout'}
                    onClick={() => irACheckout(p.idPlan)}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700">
                    {accion === 'checkout' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {esActual ? 'Plan actual' : p.esGratis ? 'Incluido' : 'Contratar'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Referidos — OCULTO temporalmente (función lista, se habilitará pronto) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-zinc-900">Refiere y gana</h2>
          <span className="ml-1 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Próximamente</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
          <Sparkles className="w-4 h-4 text-blue-500" />
          Pronto podrás invitar a otras barberías con tu código y ambas ganan un descuento. ¡Estamos afinando los detalles!
        </div>
      </div>

      {/* Historial de pagos */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Historial de pagos</h2>
        {mp.historialPagos.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Aún no hay pagos registrados.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-zinc-500 border-b border-zinc-200">
                <Th>Fecha</Th><Th>Concepto</Th><Th>Monto</Th><Th>Estado</Th><Th>Factura</Th>
              </tr></thead>
              <tbody>
                {mp.historialPagos.map((p, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="py-2 pr-3 text-zinc-600">{fecha(p.fecha)}</td>
                    <td className="py-2 pr-3 text-zinc-800">{p.tipo}</td>
                    <td className="py-2 pr-3 text-zinc-800">{`${p.moneda} ${Number(p.monto).toFixed(2)}`}</td>
                    <td className="py-2 pr-3 text-zinc-600">{p.estado}</td>
                    <td className="py-2 pr-3">
                      {p.urlFactura ? <a href={p.urlFactura} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Ver <ExternalLink className="w-3 h-3" /></a> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial de consumo */}
      {mp.historialConsumo.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Historial de consumo</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-zinc-500 border-b border-zinc-200">
                <Th>Período</Th><Th>Recurso</Th><Th>Consumido</Th><Th>Límite</Th>
              </tr></thead>
              <tbody>
                {mp.historialConsumo.map((c, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="py-2 pr-3 text-zinc-600">{String(c.mes).padStart(2, '0')}/{c.anio}</td>
                    <td className="py-2 pr-3 text-zinc-800 capitalize">{c.recurso}</td>
                    <td className="py-2 pr-3 text-zinc-800">{c.cantidad}</td>
                    <td className="py-2 pr-3 text-zinc-600">{c.limite == null || c.limite < 0 ? '∞' : c.limite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Modal: todos los mensajes del mes (scroll interno, no empuja la página) */}
      {verMensajes && mensajes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setVerMensajes(false)}>
          <div className="bg-white rounded-2xl border border-zinc-200 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-200">
              <div className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-zinc-900">Mensajes de este mes ({mensajes.total})</h3></div>
              <button onClick={() => setVerMensajes(false)} className="p-1.5 rounded-lg hover:bg-zinc-100"><X className="w-5 h-5 text-zinc-500" /></button>
            </div>
            <div className="overflow-y-auto p-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white"><tr className="text-left text-zinc-500 border-b border-zinc-200">
                  <Th>Destinatario</Th><Th>Tipo</Th><Th>Fecha</Th><Th>Estado</Th>
                </tr></thead>
                <tbody>
                  {mensajes.items.map((m: MensajeFila) => (
                    <tr key={m.idMensaje} className="border-b border-zinc-100">
                      <td className="py-2 pr-3 text-zinc-800">{m.destinatarioNombre || m.destinatarioTelefono}</td>
                      <td className="py-2 pr-3 text-zinc-600">{m.codigoPlantilla}</td>
                      <td className="py-2 pr-3 text-zinc-600">{fecha(m.fechaEnviado ?? m.fechaCreacion)}</td>
                      <td className="py-2 pr-3"><EstadoMensajeBadge estado={m.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mensajes.total > mensajes.items.length && (
                <p className="mt-3 text-xs text-zinc-400">Mostrando los {mensajes.items.length} más recientes de {mensajes.total}.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Subcomponentes ----
function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{titulo}</p>
      <p className="mt-0.5 font-semibold text-zinc-900">{valor}</p>
    </div>
  )
}

function Mini({ titulo, valor, icon }: { titulo: string; valor: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs">{icon}{titulo}</div>
      <p className="mt-1 text-xl font-bold text-zinc-900">{valor}</p>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 pr-3 font-medium">{children}</th>
}

function EstadoReferidoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Confirmado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
    Anulado: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${map[estado] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>{estado}</span>
}

function EstadoMensajeBadge({ estado }: { estado: string }) {
  const e = (estado || '').toLowerCase()
  const cls = e.includes('envi') ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : e.includes('error') || e.includes('fall') ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{estado}</span>
}
