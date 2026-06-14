import LegalShell from './LegalShell'
import s from './Legal.module.css'

const EMPRESA = 'Computer Solutions L&E E.I.R.L.'
const CORREO = 'soporte@barber.pe'

export default function PrivacidadPage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Legal</span>
      <h1 className={s.title}>Política de Privacidad</h1>
      <p className={s.updated}>Última actualización: {new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className={s.prose}>
        <p><strong>{EMPRESA}</strong>, responsable de la plataforma <strong>Barber.pe</strong>, valora tu privacidad. Esta política explica qué datos personales tratamos, con qué finalidad y qué derechos tienes, en cumplimiento de la <strong>Ley N° 29733, Ley de Protección de Datos Personales</strong>, y su reglamento.</p>

        <h2>1. Datos que recopilamos</h2>
        <ul>
          <li><strong>De la barbería:</strong> nombre del negocio, nombre del titular, RUC o documento, correo, teléfono, dirección y logo.</li>
          <li><strong>De los clientes finales:</strong> nombre, teléfono y/o correo necesarios para gestionar la reserva y enviar recordatorios.</li>
          <li><strong>De uso:</strong> fecha y hora de acceso, dispositivo y datos técnicos para seguridad y mejora del servicio.</li>
        </ul>

        <h2>2. Finalidad del tratamiento</h2>
        <ul>
          <li>Prestar y operar el servicio de reservas, agenda, caja y reportes.</li>
          <li>Enviar confirmaciones y recordatorios de citas por WhatsApp o correo.</li>
          <li>Gestionar la suscripción, la facturación y el soporte.</li>
          <li>Garantizar la seguridad de las cuentas y prevenir fraudes.</li>
        </ul>

        <h2>3. Base legal y consentimiento</h2>
        <p>Tratamos los datos sobre la base de la ejecución del contrato de servicio y, cuando corresponde, de tu consentimiento. La barbería es responsable de obtener el consentimiento de sus clientes finales para enviarles comunicaciones a través de la Plataforma.</p>

        <h2>4. Almacenamiento y seguridad</h2>
        <p>Aplicamos medidas técnicas y organizativas para proteger tus datos: cifrado de credenciales, control de acceso por roles, aislamiento por sede y copias de seguridad. Ningún sistema es 100% infalible, pero trabajamos para minimizar riesgos.</p>

        <h2>5. Compartir datos con terceros</h2>
        <p>No vendemos tus datos. Solo los compartimos con proveedores necesarios para operar (por ejemplo, servicios de mensajería de WhatsApp/correo y alojamiento), quienes los tratan según nuestras instrucciones y con las debidas garantías.</p>

        <h2>6. Plazo de conservación</h2>
        <p>Conservamos los datos mientras tu cuenta esté activa y durante los plazos legales aplicables. Tras la baja, los eliminamos o anonimizamos en un plazo razonable, salvo obligación legal de conservarlos.</p>

        <h2>7. Tus derechos (ARCO)</h2>
        <p>Puedes ejercer tus derechos de <strong>acceso, rectificación, cancelación y oposición</strong>, así como revocar tu consentimiento, escribiendo a <a href={`mailto:${CORREO}`}>{CORREO}</a>. También puedes presentar un reclamo ante la Autoridad Nacional de Protección de Datos Personales.</p>

        <h2>8. Cookies</h2>
        <p>La Plataforma usa cookies y almacenamiento local estrictamente necesarios para mantener tu sesión y preferencias. Puedes administrarlas desde tu navegador.</p>

        <h2>9. Cambios</h2>
        <p>Podemos actualizar esta política. Publicaremos la versión vigente en esta página con su fecha de actualización.</p>

        <h2>10. Contacto</h2>
        <p>Dudas sobre tus datos: <a href={`mailto:${CORREO}`}>{CORREO}</a>.</p>

        <div className={s.note}>Plantilla base. Completa el RUC, domicilio y el correo del responsable de datos, y haz que un abogado la revise antes de publicarla.</div>
      </div>
    </LegalShell>
  )
}
