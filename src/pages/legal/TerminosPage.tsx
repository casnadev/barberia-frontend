import LegalShell from './LegalShell'
import s from './Legal.module.css'

const EMPRESA = 'Computer Solutions L&E E.I.R.L.'
const RUC = '[RUC de la empresa]'
const CORREO = 'soporte@barber.pe'

export default function TerminosPage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Legal</span>
      <h1 className={s.title}>Términos y Condiciones de Uso</h1>
      <p className={s.updated}>Última actualización: {new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className={s.prose}>
        <p>Bienvenido a <strong>Barber.pe</strong> (en adelante, “la Plataforma”), un servicio de software de gestión y reservas para barberías operado por <strong>{EMPRESA}</strong>, con RUC {RUC} (en adelante, “nosotros” o “la Empresa”). Al registrarte o usar la Plataforma aceptas estos Términos y Condiciones. Si no estás de acuerdo, no debes usar el servicio.</p>

        <h2>1. Definiciones</h2>
        <ul>
          <li><strong>Usuario / Cliente del servicio:</strong> la barbería o persona que contrata Barber.pe para gestionar su negocio.</li>
          <li><strong>Cliente final:</strong> la persona que reserva una cita en una barbería que usa Barber.pe.</li>
          <li><strong>Suscripción:</strong> el plan de pago mensual contratado (Prueba, Solo, Barbería o Cadena).</li>
        </ul>

        <h2>2. Objeto del servicio</h2>
        <p>Barber.pe ofrece herramientas para gestionar reservas, agenda por barbero, caja, comisiones, recordatorios por WhatsApp/correo y reportes. La Plataforma es un software como servicio (SaaS); la Empresa no presta servicios de barbería ni interviene en la relación entre la barbería y sus clientes finales.</p>

        <h2>3. Registro y cuenta</h2>
        <p>Para usar la Plataforma debes proporcionar información veraz y mantenerla actualizada. Eres responsable de la confidencialidad de tus credenciales (contraseña, PIN, código de acceso) y de toda actividad realizada desde tu cuenta. Notifícanos de inmediato ante cualquier uso no autorizado.</p>

        <h2>4. Planes, prueba gratuita y pagos</h2>
        <ul>
          <li>La prueba gratuita tiene una duración de 14 días y no requiere tarjeta. Al finalizar, podrás elegir un plan de pago para continuar.</li>
          <li>Los precios se muestran en soles (PEN) e incluyen los impuestos aplicables según la normativa peruana.</li>
          <li>La suscripción se renueva automáticamente cada mes hasta que la canceles. Puedes cancelar en cualquier momento; el servicio seguirá activo hasta el fin del periodo ya pagado.</li>
          <li>Salvo disposición legal en contrario, los pagos efectuados no son reembolsables por periodos ya iniciados.</li>
        </ul>

        <h2>5. Uso permitido</h2>
        <p>Te comprometes a usar la Plataforma conforme a la ley y a no: (a) vulnerar la seguridad del sistema; (b) usar la Plataforma para fines ilícitos o para enviar comunicaciones no solicitadas (spam); (c) revender o suplantar el servicio; (d) cargar contenido que infrinja derechos de terceros.</p>

        <h2>6. Mensajería (WhatsApp y correo)</h2>
        <p>La Plataforma permite enviar recordatorios y confirmaciones a los clientes finales. Eres responsable de contar con el consentimiento de tus clientes para contactarlos y de respetar los límites de envío de cada plan y las políticas de los proveedores de mensajería.</p>

        <h2>7. Disponibilidad y soporte</h2>
        <p>Trabajamos para mantener la Plataforma disponible de forma continua, pero no garantizamos un servicio libre de interrupciones. Podemos realizar mantenimientos programados. El soporte se brinda por los canales indicados en la Plataforma.</p>

        <h2>8. Propiedad intelectual</h2>
        <p>El software, la marca Barber.pe, el diseño y el código son propiedad de la Empresa. El contenido que tú cargas (logo, datos de tu barbería, clientes) sigue siendo tuyo; nos otorgas una licencia limitada para procesarlo y prestarte el servicio.</p>

        <h2>9. Limitación de responsabilidad</h2>
        <p>La Plataforma se ofrece “tal cual”. En la medida permitida por la ley, la Empresa no será responsable por lucro cesante, pérdida de datos derivada de un mal uso, o daños indirectos. Nuestra responsabilidad total se limita al monto pagado por el servicio en los últimos tres (3) meses.</p>

        <h2>10. Terminación</h2>
        <p>Puedes dejar de usar la Plataforma cuando quieras. Podemos suspender o cancelar cuentas que incumplan estos Términos. Tras la baja, podrás solicitar una copia de tus datos durante un plazo razonable antes de su eliminación.</p>

        <h2>11. Ley aplicable</h2>
        <p>Estos Términos se rigen por las leyes de la República del Perú. Cualquier controversia se someterá a los jueces y tribunales del domicilio de la Empresa, sin perjuicio de los derechos que la normativa de protección al consumidor reconozca a los usuarios.</p>

        <h2>12. Contacto</h2>
        <p>Para consultas sobre estos Términos escríbenos a <a href={`mailto:${CORREO}`}>{CORREO}</a>.</p>

        <div className={s.note}>Este documento es una plantilla base. Antes de publicarlo, complétalo con los datos reales de tu empresa (RUC, domicilio, correo) y haz que un abogado lo revise.</div>
      </div>
    </LegalShell>
  )
}
