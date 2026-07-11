import LegalShell from './LegalShell'
import s from './Legal.module.css'
import { LEGAL_VERSIONS, LEGAL_VIGENCIA } from './legalVersions'

// Puntos de la Declaración del propietario. Se reutilizan en el registro
// (AccesoPage) para que el texto sea idéntico al de esta página.
export const DECLARACION_PUNTOS = [
  'Soy mayor de edad y estoy facultado para representar a mi negocio.',
  'Soy el único responsable de la información, los servicios y la atención publicados por mi negocio.',
  'Solo ofreceré servicios permitidos por la legislación vigente y cuento con las licencias, permisos y autorizaciones sanitarias o profesionales que correspondan.',
  'Soy el responsable del tratamiento de los datos personales de mis clientes finales que registre en la Plataforma, y cuento con la base legal o el consentimiento para hacerlo; Barber.pe actúa como encargado del tratamiento por mi cuenta.',
  'Cuento con el consentimiento de mis clientes para enviarles recordatorios por WhatsApp o correo.',
  'Entiendo que Barber.pe solo provee una plataforma tecnológica para administrar reservas, clientes y ventas.',
]

export default function DeclaracionNegocioPage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Legal</span>
      <h1 className={s.title}>Declaración del propietario del negocio</h1>
      <p className={s.updated}>Versión {LEGAL_VERSIONS.declaracionNegocio} · Vigente desde el {LEGAL_VIGENCIA}</p>

      <div className={s.prose}>
        <p>Al registrar y utilizar un negocio en <strong>Barber.pe</strong>, el titular declara lo siguiente:</p>
        <ul>
          {DECLARACION_PUNTOS.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
        <p>Esta declaración se registra con fecha y versión al momento del alta, como parte de la aceptación de los <a href="/terminos">Términos y Condiciones</a>.</p>

        <div className={s.note}>Documento base. Recomendamos que un abogado lo revise antes de publicarlo.</div>
      </div>
    </LegalShell>
  )
}
