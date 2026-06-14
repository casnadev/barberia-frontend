import { useState } from 'react'
import { Check } from 'lucide-react'
import { apiClient } from '@/services/apiClient'
import LegalShell from './LegalShell'
import s from './Legal.module.css'

const EMPRESA = 'Computer Solutions L&E E.I.R.L.'
const RUC = '[RUC de la empresa]'
const CORREO = 'reclamos@barber.pe'

type Tipo = 'reclamo' | 'queja'

export default function LibroReclamacionesPage() {
  const [tipo, setTipo] = useState<Tipo>('reclamo')
  const [bien, setBien] = useState<'producto' | 'servicio'>('servicio')
  const [f, setF] = useState({ nombre: '', tipoDoc: 'DNI', numDoc: '', domicilio: '', telefono: '', correo: '', monto: '', descripcion: '', detalle: '', pedido: '' })
  const [enviando, setEnviando] = useState(false)
  const [hoja, setHoja] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value })

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enviando) return
    setEnviando(true); setErr('')
    const numero = `LR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
    try {
      // El endpoint debe registrar la hoja y notificar al correo de la empresa.
      await apiClient.post('/api/libro-reclamaciones', { numero, tipo, bien, ...f, fecha: new Date().toISOString() })
      setHoja(numero)
    } catch {
      // Si aún no existe el endpoint, no perdemos el reclamo: lo enviamos por correo.
      const cuerpo = `Hoja: ${numero}%0ATipo: ${tipo}%0ABien: ${bien}%0ANombre: ${f.nombre}%0ADoc: ${f.tipoDoc} ${f.numDoc}%0ADomicilio: ${f.domicilio}%0ATel: ${f.telefono}%0ACorreo: ${f.correo}%0AMonto: ${f.monto}%0ADescripción: ${f.descripcion}%0ADetalle: ${f.detalle}%0APedido: ${f.pedido}`
      window.location.href = `mailto:${CORREO}?subject=Libro de Reclamaciones ${numero}&body=${cuerpo}`
      setHoja(numero)
    } finally { setEnviando(false) }
  }

  return (
    <LegalShell>
      <span className={s.kicker}>Libro de Reclamaciones</span>
      <h1 className={s.title}>Libro de Reclamaciones</h1>
      <p className={s.updated}>{EMPRESA} · RUC {RUC} · Conforme al D.S. N° 011-2011-PCM</p>

      {hoja ? (
        <div className={s.ok}>
          <div className={s.okIc}><Check size={32} /></div>
          <h2 style={{ margin: '0 0 6px' }}>Reclamo registrado</h2>
          <p style={{ color: 'var(--ink-2)' }}>Tu Hoja de Reclamación es <strong style={{ color: 'var(--ink)' }}>{hoja}</strong>. Te responderemos en un plazo no mayor de <strong style={{ color: 'var(--ink)' }}>15 días hábiles</strong> al correo indicado.</p>
        </div>
      ) : (
        <>
          <div className={s.prose}>
            <p>Conforme a la normativa de protección al consumidor, ponemos a tu disposición este Libro de Reclamaciones virtual. Completa el formulario y guarda tu número de hoja. La presentación de un reclamo no impide acudir a otras vías de solución.</p>
          </div>

          <form className={s.form} onSubmit={enviar}>
            <div>
              <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 650, marginBottom: 8 }}>Tipo de solicitud</label>
              <div className={s.seg}>
                <button type="button" className={tipo === 'reclamo' ? s.segOn : ''} onClick={() => setTipo('reclamo')}>Reclamo <small>Disconformidad con el producto o servicio</small></button>
                <button type="button" className={tipo === 'queja' ? s.segOn : ''} onClick={() => setTipo('queja')}>Queja <small>Malestar con la atención recibida</small></button>
              </div>
            </div>

            <div className={s.prose}><h3 style={{ margin: '8px 0 0' }}>1. Datos del consumidor</h3></div>
            <div className={s.field}><label>Nombre y apellidos</label><input required value={f.nombre} onChange={set('nombre')} /></div>
            <div className={s.grid2}>
              <div className={s.field}><label>Tipo de documento</label>
                <select value={f.tipoDoc} onChange={set('tipoDoc')}><option>DNI</option><option>Carné de extranjería</option><option>Pasaporte</option><option>RUC</option></select>
              </div>
              <div className={s.field}><label>N° de documento</label><input required value={f.numDoc} onChange={set('numDoc')} /></div>
            </div>
            <div className={s.field}><label>Domicilio</label><input required value={f.domicilio} onChange={set('domicilio')} /></div>
            <div className={s.grid2}>
              <div className={s.field}><label>Teléfono</label><input required value={f.telefono} onChange={set('telefono')} /></div>
              <div className={s.field}><label>Correo electrónico</label><input type="email" required value={f.correo} onChange={set('correo')} /></div>
            </div>

            <div className={s.prose}><h3 style={{ margin: '8px 0 0' }}>2. Identificación del bien contratado</h3></div>
            <div className={s.grid2}>
              <div className={s.field}><label>Tipo</label>
                <select value={bien} onChange={(e) => setBien(e.target.value as any)}><option value="servicio">Servicio</option><option value="producto">Producto</option></select>
              </div>
              <div className={s.field}><label>Monto reclamado (S/)</label><input value={f.monto} onChange={set('monto')} placeholder="Opcional" /></div>
            </div>
            <div className={s.field}><label>Descripción del bien o servicio</label><input value={f.descripcion} onChange={set('descripcion')} /></div>

            <div className={s.prose}><h3 style={{ margin: '8px 0 0' }}>3. Detalle y pedido</h3></div>
            <div className={s.field}><label>Detalle de la reclamación</label><textarea required value={f.detalle} onChange={set('detalle')} /></div>
            <div className={s.field}><label>Pedido del consumidor</label><textarea required value={f.pedido} onChange={set('pedido')} /></div>

            {err && <p className={s.err}>{err}</p>}
            <button type="submit" className={s.submit} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar reclamo'}</button>
            <p style={{ color: 'var(--muted)', fontSize: '.82rem', margin: 0 }}>El proveedor responderá en un plazo no mayor de 15 días hábiles.</p>
          </form>
        </>
      )}
    </LegalShell>
  )
}
