import LegalShell from './LegalShell'
import s from './Legal.module.css'
import { LEGAL_VERSIONS, LEGAL_VIGENCIA } from './legalVersions'

const EMPRESA = 'Computer Solutions L&E E.I.R.L.'
const CORREO = 'contacto@barber.pe'

export default function TerminosPage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Legal</span>
      <h1 className={s.title}>Términos y Condiciones</h1>
      <p className={s.updated}>Versión {LEGAL_VERSIONS.terminos} · Vigente desde el {LEGAL_VIGENCIA}</p>

      <div className={s.prose}>
        <p>Gracias por usar <strong>Barber.pe</strong>. Estos términos explican, en lenguaje sencillo, cómo funciona nuestra plataforma y cuáles son los derechos y responsabilidades tanto de Barber.pe como de los negocios que la usan. Al crear una cuenta aceptas estos términos junto con la <a href="/privacidad">Política de Privacidad</a> y la <a href="/uso-aceptable">Política de Uso Aceptable</a>.</p>

        <h2>Qué es Barber.pe</h2>
        <p>Barber.pe es una plataforma de gestión para barberías, salones de belleza y negocios similares. Nuestro software te ayuda a administrar reservas, clientes, ventas, trabajadores, pagos, fidelización y otras funciones del día a día.</p>
        <p><strong>Barber.pe no presta directamente servicios de barbería, estética ni salud.</strong> Esos servicios los prestas tú, en tu negocio.</p>

        <h2>Crear una cuenta</h2>
        <p>Debes darnos información verdadera y mantenerla actualizada. Eres responsable de cuidar tu contraseña y de lo que ocurra en tu cuenta. Si notas un uso que no reconoces, avísanos.</p>

        <h2>Tu negocio</h2>
        <p>Como propietario del negocio, eres responsable de:</p>
        <ul>
          <li>los servicios que ofreces;</li>
          <li>los precios que publicas;</li>
          <li>la atención a tus clientes;</li>
          <li>tus trabajadores;</li>
          <li>tus obligaciones tributarias;</li>
          <li>cumplir las normas sanitarias que correspondan.</li>
        </ul>

        <h2>Servicios que requieren autorización</h2>
        <p>Si publicas servicios que necesitan licencias, permisos o habilitaciones profesionales o sanitarias, declaras que cuentas con ellos. Barber.pe no verifica ni certifica esas autorizaciones.</p>

        <h2>Pagos</h2>
        <p>Los planes funcionan por suscripción mensual. Puedes cancelar cuando quieras; la cancelación evita renovaciones futuras y el servicio sigue activo hasta el fin del periodo ya pagado. Los precios se muestran en soles e incluyen los impuestos aplicables. Salvo que la ley diga lo contrario, los pagos de periodos ya iniciados no son reembolsables.</p>

        <h2>Disponibilidad</h2>
        <p>Trabajamos para mantener el servicio disponible, aunque pueden existir mantenimientos programados o interrupciones no previstas. También podemos mejorar o cambiar funciones con el tiempo.</p>

        <h2>Propiedad intelectual</h2>
        <p>El software y la marca Barber.pe pertenecen a <strong>{EMPRESA}</strong>. <strong>Los datos de tu negocio siguen siendo tuyos</strong>; solo nos das permiso para procesarlos y así prestarte el servicio.</p>

        <h2>Responsabilidad del negocio</h2>
        <p>El negocio es el único responsable de:</p>
        <ul>
          <li>los servicios publicados;</li>
          <li>sus trabajadores;</li>
          <li>las licencias y autorizaciones;</li>
          <li>los tratamientos realizados;</li>
          <li>el cumplimiento de la normativa aplicable.</li>
        </ul>
        <p><strong>Barber.pe actúa únicamente como proveedor de software y no interviene en la prestación de los servicios ofrecidos por los negocios registrados.</strong></p>

        <h2>Limitación de responsabilidad</h2>
        <p>Barber.pe proporciona una plataforma tecnológica. No garantiza la calidad, legalidad ni seguridad de los servicios ofrecidos por los negocios registrados. Cada negocio responde frente a sus clientes por los servicios que presta.</p>

        <h2>Uso responsable de Barber.pe</h2>
        <p>Queremos que Barber.pe sea una plataforma segura para todos. Si detectamos servicios ilegales, fraudulentos o que puedan poner en riesgo a los clientes, podremos solicitar información adicional, ocultar el contenido o suspender la cuenta mientras revisamos el caso.</p>

        <h2>Suspensión</h2>
        <p>Podremos suspender cuentas que incumplan estos términos, publiquen contenido ilegal, afecten la seguridad del sistema o usen la plataforma de forma fraudulenta.</p>

        <h2>Cambios</h2>
        <p>Podremos actualizar estos términos. Cuando el cambio sea importante, te pediremos nuevamente tu aceptación.</p>

        <h2>Contacto</h2>
        <p>¿Dudas? Escríbenos a <a href={`mailto:${CORREO}`}>{CORREO}</a>.</p>
      </div>
    </LegalShell>
  )
}
