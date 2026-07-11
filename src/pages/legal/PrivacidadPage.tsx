import LegalShell from './LegalShell'
import s from './Legal.module.css'
import { LEGAL_VERSIONS, LEGAL_VIGENCIA } from './legalVersions'

const EMPRESA = 'Computer Solutions L&E E.I.R.L.'
const RUC = '[RUC de la empresa]'
const DOMICILIO = '[domicilio de la empresa]'
const CORREO = 'soporte@barber.pe'

export default function PrivacidadPage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Legal</span>
      <h1 className={s.title}>Política de Privacidad</h1>
      <p className={s.updated}>Versión {LEGAL_VERSIONS.privacidad} · Vigente desde el {LEGAL_VIGENCIA}</p>

      <div className={s.prose}>
        <p><strong>{EMPRESA}</strong> (RUC {RUC}, con domicilio en {DOMICILIO}), responsable de la plataforma <strong>Barber.pe</strong>, valora tu privacidad. Esta política explica qué datos personales tratamos, con qué finalidad y qué derechos tienes, en cumplimiento de la <strong>Ley N.º 29733, Ley de Protección de Datos Personales</strong>, y su reglamento.</p>

        <h2>1. Responsable y roles</h2>
        <p>Respecto de los datos de las barberías y de los usuarios de la Plataforma, el responsable del banco de datos es la Empresa. Respecto de los datos de los <strong>clientes finales</strong> que cada negocio registra (nombre, teléfono, historial de citas), el <strong>responsable es el propio negocio</strong>, y Barber.pe actúa como <strong>encargado del tratamiento</strong> por cuenta de aquel.</p>

        <h2>2. Datos que recopilamos</h2>
        <ul>
          <li><strong>De la barbería:</strong> nombre del negocio, nombre del titular, RUC o documento, correo, teléfono, dirección y logo.</li>
          <li><strong>De los trabajadores:</strong> nombre, contacto y datos laborales que el negocio registre.</li>
          <li><strong>De los clientes finales:</strong> nombre, teléfono, correo (opcional), fecha de cumpleaños (opcional) e historial de citas, ventas y fidelización.</li>
          <li><strong>De uso:</strong> datos técnicos de acceso necesarios para la seguridad y el funcionamiento del servicio.</li>
        </ul>

        <h2>3. Finalidad del tratamiento</h2>
        <p>Tratamos los datos para: crear y administrar cuentas; gestionar reservas, agenda, caja, comisiones y fidelización; enviar recordatorios y confirmaciones; procesar pagos de la suscripción; brindar soporte; y cumplir obligaciones legales.</p>

        <h2>4. Base legal y consentimiento</h2>
        <p>El tratamiento se basa en la ejecución del contrato con el negocio y, cuando corresponde, en tu consentimiento. El negocio es responsable de contar con la base legal o el consentimiento de sus clientes finales para registrarlos y contactarlos.</p>

        <h2>5. Encargados y terceros con quienes compartimos datos</h2>
        <p>Para prestar el servicio nos apoyamos en proveedores que actúan como encargados, bajo obligaciones de confidencialidad y seguridad. Entre otros:</p>
        <ul>
          <li><strong>Proveedor de pagos</strong> (p. ej. Stripe): para procesar la suscripción.</li>
          <li><strong>Proveedores de mensajería</strong> (p. ej. Meta/WhatsApp, Twilio): para recordatorios y notificaciones.</li>
          <li><strong>Servicios de Google</strong>: autenticación e integración de tarjetas de fidelización (Google Wallet).</li>
          <li><strong>Proveedor de infraestructura/hosting</strong>: para alojar la Plataforma de forma segura.</li>
        </ul>
        <p>Algunos proveedores pueden almacenar datos fuera del país; en tales casos aplicamos las garantías exigidas por la normativa de protección de datos.</p>

        <h2>6. Almacenamiento y seguridad</h2>
        <p>Aplicamos medidas técnicas y organizativas razonables para proteger los datos (cifrado en tránsito, control de acceso, respaldo). Ningún sistema es infalible, pero trabajamos para minimizar los riesgos.</p>

        <h2>7. Notificación de incidentes</h2>
        <p>Ante una brecha de seguridad que afecte datos personales, adoptaremos medidas de contención y notificaremos a los afectados y a la autoridad competente cuando la normativa lo exija.</p>

        <h2>8. Plazo de conservación</h2>
        <p>Conservamos los datos mientras la cuenta esté activa y por los plazos legales aplicables. Tras la baja, podrás solicitar una copia y luego procederemos a su eliminación o anonimización.</p>

        <h2>9. Tus derechos (ARCO)</h2>
        <p>Puedes ejercer tus derechos de <strong>acceso, rectificación, cancelación y oposición</strong>, así como los demás previstos en la Ley N.º 29733, escribiéndonos a <a href={`mailto:${CORREO}`}>{CORREO}</a>. Los clientes finales deben ejercer sus derechos ante el negocio que registró sus datos; Barber.pe colaborará como encargado.</p>

        <h2>10. Registro del banco de datos</h2>
        <p>La Empresa cumple con las obligaciones de inscripción de sus bancos de datos personales ante la Autoridad Nacional de Protección de Datos Personales (ANPD) cuando corresponda.</p>

        <h2>11. Cookies</h2>
        <p>Usamos cookies y tecnologías similares necesarias para el funcionamiento y la seguridad de la Plataforma, y podemos usar cookies analíticas para mejorar el servicio.</p>

        <h2>12. Cambios</h2>
        <p>Podemos actualizar esta política. Los cambios sustanciales se comunicarán por los canales de la Plataforma.</p>

        <h2>13. Contacto</h2>
        <p>Para consultas sobre privacidad escríbenos a <a href={`mailto:${CORREO}`}>{CORREO}</a>.</p>

        <div className={s.note}>Documento base. Completa el RUC, domicilio y el correo del responsable de datos, verifica la lista de proveedores y haz que un abogado lo revise antes de publicarlo.</div>
      </div>
    </LegalShell>
  )
}
