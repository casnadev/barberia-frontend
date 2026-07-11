import LegalShell from './LegalShell'
import s from './Legal.module.css'
import { LEGAL_VERSIONS, LEGAL_VIGENCIA } from './legalVersions'

const EMPRESA = 'Computer Solutions L&E E.I.R.L.'
const RUC = '[RUC de la empresa]'
const CORREO = 'soporte@barber.pe'

export default function TerminosPage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Legal</span>
      <h1 className={s.title}>Términos y Condiciones de Uso</h1>
      <p className={s.updated}>Versión {LEGAL_VERSIONS.terminos} · Vigente desde el {LEGAL_VIGENCIA}</p>

      <div className={s.prose}>
        <p>Bienvenido a <strong>Barber.pe</strong> (en adelante, «la Plataforma»), un servicio de software de gestión y reservas para barberías, salones de belleza y negocios similares, operado por <strong>{EMPRESA}</strong>, con RUC {RUC} (en adelante, «nosotros» o «la Empresa»). Al registrarte o usar la Plataforma aceptas estos Términos y Condiciones, la Política de Privacidad y la Política de Uso Aceptable. Si no estás de acuerdo, no debes usar el servicio.</p>

        <h2>1. Definiciones</h2>
        <ul>
          <li><strong>Usuario / Titular del negocio:</strong> la barbería o persona que contrata Barber.pe para gestionar su negocio.</li>
          <li><strong>Cliente final:</strong> la persona que reserva una cita o es atendida en un negocio que usa Barber.pe.</li>
          <li><strong>Suscripción:</strong> el plan de pago contratado (Prueba, Solo, Barbería o Cadena).</li>
        </ul>

        <h2>2. Naturaleza de Barber.pe</h2>
        <p>Barber.pe es una plataforma tecnológica (software como servicio, SaaS) destinada a facilitar la administración de reservas, agenda, caja, comisiones, fidelización, recordatorios y reportes. <strong>Barber.pe no presta directamente servicios de barbería, estética, salud ni tratamientos personales</strong>. Los servicios publicados y prestados son responsabilidad exclusiva del titular del negocio, y toda relación comercial se establece directamente entre el negocio y su cliente final.</p>

        <h2>3. Registro y cuenta</h2>
        <p>Debes ser mayor de edad y estar facultado para representar a tu negocio. Debes proporcionar información veraz y mantenerla actualizada. Eres responsable de la confidencialidad de tus credenciales (contraseña, PIN, código de acceso) y de toda actividad realizada desde tu cuenta. Notifícanos de inmediato ante cualquier uso no autorizado.</p>

        <h2>4. Responsabilidad del negocio</h2>
        <p>Cada negocio es el único responsable de: los servicios que publica y presta; la atención y calidad brindadas; los precios; la contratación y gestión de sus trabajadores; el cumplimiento de sus obligaciones tributarias; el cumplimiento de las normas sanitarias; y la obtención de las licencias, permisos y autorizaciones que correspondan.</p>

        <h2>5. Servicios regulados</h2>
        <p>El usuario declara que únicamente publicará y prestará servicios cuya realización esté legalmente autorizada. Si ofrece servicios sujetos a autorización médica, sanitaria o profesional —entre otros, procedimientos médicos, estéticos invasivos o cualquier actividad que requiera habilitación profesional o sanitaria— declara que cuenta con todos los permisos exigidos por la legislación aplicable.</p>

        <h2>6. Uso permitido y contenido prohibido</h2>
        <p>Te comprometes a usar la Plataforma conforme a la ley. No podrás utilizarla para ofrecer o promocionar: servicios ilícitos o fraudulentos; actividades que infrinjan derechos de terceros; servicios prohibidos por la legislación vigente; ni procedimientos para los cuales no cuentes con autorización. El detalle de conductas prohibidas se encuentra en la <a href="/uso-aceptable">Política de Uso Aceptable</a>.</p>

        <h2>7. Planes, prueba gratuita y pagos</h2>
        <ul>
          <li>La prueba gratuita dura 14 días y no requiere tarjeta. Al finalizar, podrás elegir un plan de pago para continuar.</li>
          <li>Los precios se muestran en soles (PEN) e incluyen los impuestos aplicables según la normativa peruana.</li>
          <li>La suscripción se renueva automáticamente cada mes hasta que la canceles. Puedes cancelar en cualquier momento; el servicio seguirá activo hasta el fin del periodo ya pagado.</li>
          <li>Salvo disposición legal en contrario, los pagos efectuados no son reembolsables por periodos ya iniciados.</li>
          <li>Cuando el negocio utilice los servicios de pago integrados, aplican además los términos del proveedor de pagos correspondiente. Barber.pe no custodia los fondos ni recauda pagos en nombre del negocio, salvo cuando este active expresamente dichos servicios.</li>
        </ul>

        <h2>8. Mensajería (WhatsApp y correo)</h2>
        <p>La Plataforma permite enviar recordatorios y confirmaciones a los clientes finales. Eres responsable de contar con el consentimiento de tus clientes para contactarlos y de respetar los límites de envío de cada plan y las políticas de los proveedores de mensajería.</p>

        <h2>9. Rol de Barber.pe como proveedor de software</h2>
        <p>Barber.pe actúa exclusivamente como proveedor de software (SaaS). No emplea al personal de los negocios, no administra sus operaciones, no recauda pagos en nombre de las barberías (salvo cuando el negocio utilice expresamente los servicios de pago integrados), no supervisa la prestación de los servicios ni certifica que un negocio o sus trabajadores cuenten con licencias, autorizaciones o habilitaciones profesionales. El cumplimiento de las leyes aplicables corresponde exclusivamente al titular del negocio.</p>

        <h2>10. Disponibilidad y soporte</h2>
        <p>Trabajamos para mantener la Plataforma disponible de forma continua, pero no garantizamos un servicio libre de interrupciones. Podemos realizar mantenimientos programados y modificar o discontinuar funcionalidades. El soporte se brinda por los canales indicados en la Plataforma.</p>

        <h2>11. Propiedad intelectual</h2>
        <p>El software, la marca Barber.pe, el diseño y el código son propiedad de la Empresa. El contenido que tú cargas (logo, datos de tu negocio, clientes) sigue siendo tuyo; nos otorgas una licencia limitada para procesarlo y prestarte el servicio.</p>

        <h2>12. Limitación de responsabilidad</h2>
        <p>Barber.pe no garantiza la legalidad, calidad, seguridad ni idoneidad de los servicios ofrecidos por los negocios registrados, ni participa en su prestación. La Plataforma se ofrece «tal cual». En la medida permitida por la ley, la Empresa no será responsable por lucro cesante, pérdida de datos derivada de un mal uso, o daños indirectos; y su responsabilidad total se limita al monto pagado por el servicio en los últimos tres (3) meses.</p>

        <h2>13. Indemnidad</h2>
        <p>El usuario mantendrá indemne a Barber.pe frente a cualquier reclamación, demanda, sanción o perjuicio de terceros derivado de los servicios que publique o preste, de la información que cargue, o del incumplimiento de la ley o de estos Términos.</p>

        <h2>14. Facultad de suspensión</h2>
        <p>Barber.pe podrá suspender temporal o definitivamente las cuentas que incumplan estos Términos, reciban denuncias fundadas, publiquen contenido ilegal o afecten la seguridad de otros usuarios.</p>

        <h2>15. Terminación y datos</h2>
        <p>Puedes dejar de usar la Plataforma cuando quieras. Podemos suspender o cancelar cuentas que incumplan estos Términos. Tras la baja, podrás solicitar una copia de tus datos durante un plazo razonable antes de su eliminación.</p>

        <h2>16. Modificaciones y cesión</h2>
        <p>Podemos actualizar estos Términos. Los cambios sustanciales se notificarán y, cuando corresponda, se solicitará tu aceptación nuevamente al iniciar sesión. La Empresa podrá ceder este contrato en caso de reorganización societaria, manteniendo tus derechos.</p>

        <h2>17. Ley aplicable</h2>
        <p>Estos Términos se rigen por las leyes de la República del Perú. Cualquier controversia se someterá a los jueces y tribunales del domicilio de la Empresa, sin perjuicio de los derechos que la normativa de protección al consumidor reconozca a los usuarios.</p>

        <h2>18. Contacto</h2>
        <p>Para consultas escríbenos a <a href={`mailto:${CORREO}`}>{CORREO}</a>.</p>

        <div className={s.note}>Documento base. Antes de publicarlo, completa el RUC y domicilio reales de la Empresa y haz que un abogado lo revise.</div>
      </div>
    </LegalShell>
  )
}
