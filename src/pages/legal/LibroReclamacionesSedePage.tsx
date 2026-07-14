import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, WarningCircle, CircleNotch } from '@phosphor-icons/react'
import LegalShell from './LegalShell'
import s from './Legal.module.css'
import {
  libroReclamacionesService,
  type ProveedorReclamacion,
  type CrearHoja,
  type HojaCreada,
} from '@/services/libroReclamacionesService'
import { mensajeError } from '@/utils/apiError'
import { ComboBox } from '@/components/ComboBox'
import { OptionGroup } from '@/components/ui/Controles'

/**
 * T8 — LIBRO DE RECLAMACIONES **DE UNA SEDE**.  /libro-reclamaciones/:idSede
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ESTABA MAL ANTES
 * ───────────────────────────────────────────────────────────────────────────
 * La página vieja (/libro-reclamaciones, sin sede):
 *
 *   1. Hardcodeaba la razón social y el RUC de barber.pe. El RUC era literalmente
 *      el string '[RUC de la empresa]' — un placeholder que nunca se rellenó.
 *   2. Posteaba a `/api/libro-reclamaciones`, un endpoint que NO EXISTÍA.
 *   3. Al fallar (siempre), caía a un `mailto:` al correo de barber.pe.
 *   4. Generaba el número de hoja con `Math.random()` EN EL NAVEGADOR. El D.S.
 *      exige numeración CORRELATIVA: con un aleatorio hay saltos y colisiones.
 *
 * Resultado: un cliente que se quejaba de su corte en NDR Barbería mandaba el
 * reclamo a barber.pe, con el RUC de barber.pe en el documento, señalando a
 * barber.pe como el proveedor reclamado.
 *
 * Ahora: la hoja es del NEGOCIO, con SU razón social y SU RUC, le llega a SU
 * correo, y el correlativo lo lleva el servidor.
 *
 * La página vieja se mantiene en /libro-reclamaciones para los reclamos contra
 * barber.pe COMO PLATAFORMA (que sí existen: si tu software no funciona, el
 * proveedor eres tú). Son dos libros distintos y no hay que mezclarlos.
 */

const DOCS = ['DNI', 'CE', 'Pasaporte', 'RUC']

export default function LibroReclamacionesSedePage() {
  const { idSede } = useParams()
  const sede = Number(idSede)

  const [prov, setProv] = useState<ProveedorReclamacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [hoja, setHoja] = useState<HojaCreada | null>(null)
  const [err, setErr] = useState('')

  const [f, setF] = useState<CrearHoja>({
    nombre: '', tipoDoc: 'DNI', numDoc: '', domicilio: '', telefono: '', correo: '',
    esMenorDeEdad: false, tutorNombre: '',
    tipo: 'Reclamo', bien: 'Servicio', monto: null,
    descripcion: '', detalle: '', pedido: '',
  })

  const set = <K extends keyof CrearHoja>(k: K) => (v: CrearHoja[K]) =>
    setF((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    if (!sede) { setCargando(false); return }
    libroReclamacionesService.getProveedor(sede)
      .then(setProv)
      .catch(() => setErr('No pudimos cargar los datos de este local.'))
      .finally(() => setCargando(false))
  }, [sede])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enviando) return
    setEnviando(true); setErr('')
    try {
      // El número correlativo lo genera el SERVIDOR. Antes se generaba aquí con
      // Math.random(), lo que incumple la exigencia de correlatividad del D.S.
      setHoja(await libroReclamacionesService.registrar(sede, f))
    } catch (e) {
      setErr(mensajeError(e, 'No pudimos registrar tu reclamo. Inténtalo de nuevo.'))
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) {
    return (
      <LegalShell>
        <div className="grid min-h-[40vh] place-items-center">
          <CircleNotch size={28} className="animate-spin text-gray-300" />
        </div>
      </LegalShell>
    )
  }

  // ── El negocio no está identificado → NO se puede reclamar ──────────────────
  //
  // Sin razón social y RUC del proveedor, la hoja no vale nada. Dejar que la
  // persona la rellene creyendo que ha reclamado sería mentirle: se quedaría
  // tranquila con un documento inválido y sin haber ejercido su derecho.
  if (prov && !prov.datosCompletos) {
    return (
      <LegalShell>
        <span className={s.kicker}>Libro de Reclamaciones</span>
        <h1 className={s.title}>Este local aún no puede recibir reclamos</h1>
        <div className={s.prose}>
          <p>
            <strong>{prov.nombreVisible}</strong> todavía no ha completado su razón social
            y su RUC en el sistema. Sin esos datos, una hoja de reclamación no tendría
            validez legal, y preferimos decírtelo antes que dejarte rellenar un documento
            que no serviría de nada.
          </p>
          {/* T10 — Aquí SOLO el correo.
              Antes esta pantalla listaba también el teléfono y un enlace a Indecopi. Dos
              problemas:
                · El TELÉFONO no deja constancia escrita. Un reclamo hecho por llamada no
                  se puede probar, y al cliente le da una falsa sensación de haber
                  reclamado. El correo sí deja rastro.
                · Mandar a INDECOPI de entrada es empujar al cliente a denunciar a un
                  negocio que probablemente solo tiene el perfil a medio llenar. Es
                  desproporcionado, y además le hace daño a barber.pe. Si el negocio no le
                  responde, el cliente ya sabrá dónde acudir. */}
          <p>
            <strong>Puedes reclamar igualmente</strong> escribiendo directamente al negocio:
          </p>
          {prov.correoContacto ? (
            <p>
              <a href={`mailto:${prov.correoContacto}?subject=${encodeURIComponent(`Reclamo · ${prov.nombreVisible}`)}`}>
                {prov.correoContacto}
              </a>
            </p>
          ) : (
            <p>
              Este negocio tampoco tiene un correo de contacto configurado. Pregunta en el
              local por su Libro de Reclamaciones físico.
            </p>
          )}
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            Ya hemos avisado al negocio para que complete sus datos.
          </p>
        </div>
      </LegalShell>
    )
  }

  // ── Hoja registrada ────────────────────────────────────────────────────────
  if (hoja) {
    return (
      <LegalShell>
        <span className={s.kicker}>Libro de Reclamaciones</span>
        <h1 className={s.title}><Check size={22} weight="bold" /> Reclamo registrado</h1>
        <div className={s.prose}>
          <p>
            Tu Hoja de Reclamación es <strong>{hoja.numero}</strong>.
          </p>
          <p>
            <strong>{hoja.razonSocial}</strong>{hoja.ruc && ` (RUC ${hoja.ruc})`} tiene hasta el{' '}
            <strong>{new Date(hoja.fechaLimiteRespuesta).toLocaleDateString('es-PE')}</strong>{' '}
            para responderte — son 15 días hábiles, como manda la Ley 29571. La respuesta te
            llegará al correo que nos diste.
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            Guarda este número. Si no te responden en plazo, o la respuesta no te satisface,
            puedes acudir a Indecopi con él.
          </p>
        </div>
      </LegalShell>
    )
  }

  return (
    <LegalShell>
      <span className={s.kicker}>Libro de Reclamaciones</span>
      <h1 className={s.title}>Libro de Reclamaciones</h1>

      {/* La ley exige que el PROVEEDOR esté plenamente identificado en la hoja.
          Estos son los datos del NEGOCIO, no los de barber.pe. */}
      <p className={s.updated}>
        <strong>{prov?.razonSocial}</strong>
        {prov?.ruc && <> · RUC {prov.ruc}</>}
        {prov?.direccion && <> · {prov.direccion}</>}
        <br />
        Conforme al D.S. N° 011-2011-PCM
      </p>

      <div className={s.prose} style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13 }}>
          Este reclamo va dirigido a <strong>{prov?.nombreVisible}</strong>, que es quien te
          prestó el servicio. barber.pe solo aloja este formulario y se lo hace llegar.
        </p>
      </div>

      <form className={s.form} onSubmit={enviar}>
        {/* ── Reclamo vs Queja: la ley los distingue y NO son lo mismo ── */}
        <div className={s.field}>
          <label>¿Qué quieres registrar?</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(['Reclamo', 'Queja'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('tipo')(t)}
                style={{
                  flex: 1, minWidth: 200, textAlign: 'left', padding: '10px 12px',
                  borderRadius: 10, cursor: 'pointer',
                  border: f.tipo === t ? '2px solid var(--ink)' : '1px solid var(--line)',
                  background: 'transparent',
                }}
              >
                <strong style={{ display: 'block' }}>{t}</strong>
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {t === 'Reclamo'
                    ? 'No estoy conforme con el servicio que recibí.'
                    : 'No estoy conforme con la atención (el trato, la espera).'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <h2 style={{ marginTop: 8 }}>Tus datos</h2>

        <div className={s.field}>
          <label>Nombre completo</label>
          <input required value={f.nombre} onChange={(e) => set('nombre')(e.target.value)} />
        </div>

        <div className={s.grid2}>
          <div className={s.field}>
            <label>Documento</label>
            <ComboBox value={f.tipoDoc} onChange={(v) => set('tipoDoc')(String(v))} opciones={DOCS} />
          </div>
          <div className={s.field}>
            <label>Número</label>
            <input required value={f.numDoc} onChange={(e) => set('numDoc')(e.target.value)} />
          </div>
        </div>

        <div className={s.field}>
          <label>Domicilio</label>
          <input value={f.domicilio} onChange={(e) => set('domicilio')(e.target.value)} />
        </div>

        <div className={s.grid2}>
          <div className={s.field}>
            <label>Teléfono</label>
            <input value={f.telefono} onChange={(e) => set('telefono')(e.target.value)} />
          </div>
          <div className={s.field}>
            <label>Correo electrónico</label>
            <input
              type="email" required value={f.correo}
              onChange={(e) => set('correo')(e.target.value)}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>
              Aquí te llegará la respuesta.
            </span>
          </div>
        </div>

        {/* Menor de edad → la ley exige identificar al padre/madre/tutor. */}
        <label className={s.field} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={f.esMenorDeEdad}
            onChange={(e) => set('esMenorDeEdad')(e.target.checked)}
          />
          <span style={{ fontSize: 13 }}>El consumidor es menor de edad</span>
        </label>

        {f.esMenorDeEdad && (
          <div className={s.field}>
            <label>Nombre del padre, madre o tutor</label>
            <input
              required
              value={f.tutorNombre}
              onChange={(e) => set('tutorNombre')(e.target.value)}
            />
          </div>
        )}

        <h2 style={{ marginTop: 8 }}>Tu {f.tipo.toLowerCase()}</h2>

        <div className={s.grid2}>
          <div className={s.field}>
            <label>Fue por un</label>
            <OptionGroup
              valor={f.bien}
              onChange={(v) => set('bien')(v)}
              cols={2}
              opciones={[
                { valor: 'Servicio' as const, etiqueta: 'Servicio' },
                { valor: 'Producto' as const, etiqueta: 'Producto' },
              ]}
            />
          </div>
          <div className={s.field}>
            <label>Monto reclamado (S/) · opcional</label>
            <input
              type="number" step="0.01" min="0"
              value={f.monto ?? ''}
              onChange={(e) => set('monto')(e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
        </div>

        <div className={s.field}>
          <label>¿Qué contrataste?</label>
          <input
            required
            placeholder="Ej: corte de cabello y barba"
            value={f.descripcion}
            onChange={(e) => set('descripcion')(e.target.value)}
          />
        </div>

        <div className={s.field}>
          <label>Cuéntanos qué pasó</label>
          <textarea
            required rows={5}
            value={f.detalle}
            onChange={(e) => set('detalle')(e.target.value)}
          />
        </div>

        <div className={s.field}>
          <label>¿Qué pides?</label>
          <textarea
            rows={3}
            placeholder="Ej: que me devuelvan el importe, que lo repitan…"
            value={f.pedido}
            onChange={(e) => set('pedido')(e.target.value)}
          />
        </div>

        {err && (
          <p style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            background: '#fef2f2', color: '#b91c1c',
            padding: 10, borderRadius: 8, fontSize: 13,
          }}>
            <WarningCircle size={15} weight="fill" style={{ marginTop: 2, flexShrink: 0 }} />
            {err}
          </p>
        )}

        <button type="submit" disabled={enviando} className={s.submit}>
          {enviando ? 'Enviando…' : `Registrar ${f.tipo.toLowerCase()}`}
        </button>

        <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }}>
          {prov?.razonSocial} tiene <strong>15 días hábiles</strong> para responderte
          (Ley 29571). Si no lo hace, o la respuesta no te satisface, puedes acudir a{' '}
          <a href="https://www.indecopi.gob.pe" target="_blank" rel="noreferrer">Indecopi</a>.
        </p>
      </form>
    </LegalShell>
  )
}
