import LegalShell from './LegalShell'
import s from './Legal.module.css'
import { LEGAL_VERSIONS, LEGAL_VIGENCIA } from './legalVersions'

const CORREO = 'soporte@barber.pe'

export default function UsoAceptablePage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Legal</span>
      <h1 className={s.title}>Política de Uso Aceptable</h1>
      <p className={s.updated}>Versión {LEGAL_VERSIONS.usoAceptable} · Vigente desde el {LEGAL_VIGENCIA}</p>

      <div className={s.prose}>
        <p>Esta Política de Uso Aceptable complementa los <a href="/terminos">Términos y Condiciones</a> y define las conductas y contenidos prohibidos en <strong>Barber.pe</strong>. Puede actualizarse de forma independiente para responder con rapidez a nuevos usos indebidos.</p>

        <h2>1. Contenido y servicios prohibidos</h2>
        <p>Está prohibido usar la Plataforma para publicar, ofrecer o promocionar:</p>
        <ul>
          <li>servicios ilegales o prohibidos por la legislación vigente;</li>
          <li>procedimientos médicos, sanitarios o estéticos invasivos sin la autorización o habilitación profesional exigida;</li>
          <li>venta de medicamentos o productos cuya comercialización requiera autorización o esté restringida por ley;</li>
          <li>documentos, certificados o credenciales falsos;</li>
          <li>publicidad engañosa, fraudulenta o que induzca a error sobre precios, resultados o cualificaciones;</li>
          <li>contenido que infrinja derechos de propiedad intelectual o de imagen de terceros;</li>
          <li>contenido ofensivo, discriminatorio, violento o sexual explícito;</li>
          <li>datos personales de terceros sin base legal o consentimiento.</li>
        </ul>

        <h2>2. Conducta prohibida en la Plataforma</h2>
        <ul>
          <li>vulnerar o intentar vulnerar la seguridad del sistema, acceder a cuentas ajenas o a datos de otros negocios;</li>
          <li>enviar comunicaciones masivas no solicitadas (spam) a los clientes finales;</li>
          <li>revender, sublicenciar o suplantar el servicio;</li>
          <li>automatizar el uso de la Plataforma de forma abusiva o que degrade el servicio para otros;</li>
          <li>usar la Plataforma para actividades que dañen su reputación o la de otros usuarios.</li>
        </ul>

        <h2>3. Mensajería responsable</h2>
        <p>El envío de recordatorios y promociones a clientes finales exige contar con su consentimiento y respetar las políticas de WhatsApp, del proveedor de correo y los límites de cada plan. El uso indebido de la mensajería puede derivar en la suspensión de esa función o de la cuenta.</p>

        <h2>4. Consecuencias</h2>
        <p>El incumplimiento de esta Política puede implicar la eliminación del contenido infractor, la suspensión temporal o la cancelación definitiva de la cuenta, sin perjuicio de las acciones legales que correspondan. Barber.pe podrá actuar ante denuncias fundadas o cuando detecte contenido ilegal.</p>

        <h2>5. Reporte</h2>
        <p>Para reportar un uso indebido escríbenos a <a href={`mailto:${CORREO}`}>{CORREO}</a>.</p>

        <div className={s.note}>Documento base. Recomendamos que un abogado lo revise antes de publicarlo.</div>
      </div>
    </LegalShell>
  )
}
