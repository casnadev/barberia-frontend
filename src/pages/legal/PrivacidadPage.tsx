import LegalShell from './LegalShell'
import s from './Legal.module.css'
import { LEGAL_VERSIONS, LEGAL_VIGENCIA } from './legalVersions'

const EMPRESA = 'Computer Solutions L&E E.I.R.L.'
const CORREO = 'contacto@barber.pe'

export default function PrivacidadPage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Legal</span>
      <h1 className={s.title}>Política de Privacidad</h1>
      <p className={s.updated}>Versión {LEGAL_VERSIONS.privacidad} · Vigente desde el {LEGAL_VIGENCIA}</p>

      <div className={s.prose}>
        <p>En Barber.pe cuidamos tus datos y los de tus clientes. Aquí te contamos, sin vueltas, qué información manejamos y para qué. El responsable del tratamiento es <strong>{EMPRESA}</strong>, conforme a la Ley N.° 29733 de Protección de Datos Personales del Perú.</p>

        <h2>Qué datos recopilamos</h2>
        <ul>
          <li>Información de tu negocio.</li>
          <li>Información de tus trabajadores.</li>
          <li>Información de tus clientes.</li>
          <li>Información técnica (por ejemplo, del dispositivo y del uso de la app).</li>
        </ul>

        <h2>Para qué los usamos</h2>
        <ul>
          <li>Crear y administrar tu cuenta.</li>
          <li>Gestionar reservas.</li>
          <li>Enviar recordatorios y confirmaciones.</li>
          <li>Procesar pagos.</li>
          <li>Brindarte soporte.</li>
          <li>Mejorar el servicio.</li>
        </ul>

        <h2>Quién puede acceder</h2>
        <p>Solo el personal autorizado y nuestros proveedores tecnológicos, cuando sea necesario para prestarte el servicio. No vendemos tus datos.</p>

        <h2>Datos de tus clientes</h2>
        <p>Los datos de tus clientes que cargas o generas en la plataforma son tuyos y bajo tu responsabilidad. Barber.pe los procesa por encargo tuyo para que puedas operar tu negocio.</p>

        <h2>Tus derechos</h2>
        <p>Puedes solicitar acceso, rectificación, actualización o eliminación de tus datos conforme a la legislación aplicable, escribiéndonos a <a href={`mailto:${CORREO}`}>{CORREO}</a>.</p>

        <h2>Seguridad</h2>
        <p>Aplicamos medidas razonables para proteger tu información. Ningún sistema es 100% infalible, pero trabajamos para mantener tus datos seguros.</p>

        <h2>Contacto</h2>
        <p>Para cualquier tema de privacidad, escríbenos a <a href={`mailto:${CORREO}`}>{CORREO}</a>.</p>
      </div>
    </LegalShell>
  )
}
