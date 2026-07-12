import LegalShell from './LegalShell'
import s from './Legal.module.css'
import { LEGAL_VERSIONS, LEGAL_VIGENCIA } from './legalVersions'

export default function DeclaracionNegocioPage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Legal</span>
      <h1 className={s.title}>Declaración del propietario del negocio</h1>
      <p className={s.updated}>Versión {LEGAL_VERSIONS.declaracionNegocio} · Vigente desde el {LEGAL_VIGENCIA}</p>

      <div className={s.prose}>
        <p>Al crear una cuenta en Barber.pe declaras que:</p>
        <ul>
          <li>La información registrada sobre ti y tu negocio es verdadera.</li>
          <li>Los servicios que publiques cumplen la legislación aplicable.</li>
          <li>Cuentas con las licencias, permisos o autorizaciones que correspondan cuando sean exigidos por ley.</li>
          <li>Eres responsable de la atención, los precios y los servicios prestados por tu negocio.</li>
          <li>Eres responsable del tratamiento de los datos de tus clientes conforme a la legislación aplicable.</li>
          <li>Barber.pe únicamente proporciona una plataforma tecnológica para administrar tu negocio y no participa en la prestación de los servicios.</li>
        </ul>
        <p>Esta declaración forma parte de la aceptación de los <a href="/terminos">Términos y Condiciones</a>.</p>
      </div>
    </LegalShell>
  )
}
