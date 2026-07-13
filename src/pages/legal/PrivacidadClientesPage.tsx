import LegalShell from './LegalShell'
import s from './Legal.module.css'
import { LEGAL_VERSIONS, LEGAL_VIGENCIA } from './legalVersions'

/**
 * T4 — AVISO DE PRIVACIDAD PARA EL CLIENTE FINAL (B2C).
 *
 * POR QUÉ EXISTE
 * --------------
 * Hasta ahora, cuando alguien se unía al programa de puntos (/unirme) o entraba a
 * su cuenta (/acceso), se le enlazaba a /terminos y /privacidad. Pero esos son los
 * documentos B2B: el contrato con el DUEÑO del negocio que contrata el software.
 * Dicen cosas como "Al crear una cuenta…", "Como propietario del negocio, eres
 * responsable de…" y "Esos servicios los prestas tú, en tu negocio". Nada de eso
 * aplica a alguien que solo quiere que le sumen puntos por su corte de pelo.
 *
 * Y no es solo cosmético: la Ley 29733 exige que el consentimiento sea informado,
 * expreso e inequívoco. Enterrar el aviso del cliente en la sección 8 de un contrato
 * de suscripción de software es una defensa legal débil.
 *
 * Es lo que hacen Square (Customer Privacy Notice ≠ Seller Terms) y Fresha
 * (Customer Terms ≠ Partner Terms): documentos separados por audiencia.
 *
 * LO IMPORTANTE DE ESTE DOCUMENTO
 * -------------------------------
 * Deja escrito quién es quién: el NEGOCIO (la barbería) es el RESPONSABLE de los
 * datos del cliente; barber.pe es solo el ENCARGADO (el proveedor del software).
 * Esa distinción es la que protege a barber.pe.
 */

const EMPRESA = 'Computer Solutions L&E E.I.R.L.'
const CORREO = 'contacto@barber.pe'

export default function PrivacidadClientesPage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Para clientes</span>
      <h1 className={s.title}>Tus datos en barber.pe</h1>
      <p className={s.updated}>
        Versión {LEGAL_VERSIONS.privacidadClientes} · Vigente desde el {LEGAL_VIGENCIA}
      </p>

      <div className={s.prose}>
        <p>
          Si reservaste una cita o te uniste al programa de puntos de una barbería o salón,
          esta página es para ti. Está escrita en lenguaje simple y se lee en dos minutos.
        </p>
        <p>
          <em>
            ¿Eres dueño de un negocio y usas barber.pe como tu sistema de citas? Entonces
            los documentos que te aplican son los <a href="/terminos">Términos y Condiciones</a>{' '}
            y la <a href="/privacidad">Política de Privacidad</a>.
          </em>
        </p>

        <h2>Quién es responsable de tus datos</h2>
        <p>
          Esto es lo más importante y conviene que quede claro desde el principio:
        </p>
        <ul>
          <li>
            <strong>La barbería o salón donde te atiendes</strong> es la <strong>responsable</strong>{' '}
            de tus datos. Es quien decide qué guarda de ti y para qué. Es su cliente, eres tú.
          </li>
          <li>
            <strong>barber.pe</strong> ({EMPRESA}) es solo el <strong>proveedor del software</strong>{' '}
            que ese negocio usa para gestionar sus citas. Tratamos tus datos por encargo suyo y
            siguiendo sus instrucciones. No los usamos para nuestros propios fines.
          </li>
        </ul>
        <p>
          En términos de la Ley N.° 29733: el negocio es el <em>titular del banco de datos</em>{' '}
          y barber.pe es el <em>encargado del tratamiento</em>.
        </p>

        <h2>Qué guardamos de ti</h2>
        <ul>
          <li>Tu <strong>nombre</strong>, tal como tú lo escribes.</li>
          <li>Tu <strong>celular</strong> y, si lo diste, tu <strong>correo</strong>. Sirven para identificarte y avisarte de tus citas.</li>
          <li>Tu <strong>cumpleaños</strong>, solo si lo diste. Es opcional.</li>
          <li>El <strong>historial de tus citas</strong> en ese negocio: qué servicio, cuándo y con quién.</li>
          <li>Tus <strong>puntos de fidelización</strong>, si el negocio tiene programa de puntos.</li>
          <li>Las <strong>reseñas</strong> que dejes, que pueden mostrarse públicamente junto a tu nombre.</li>
        </ul>
        <p>
          Los pagos, cuando existen, los procesa el proveedor de pagos, no nosotros.{' '}
          <strong>No guardamos ningún dato de pago.</strong>
        </p>

        <h2>Para qué los usamos</h2>
        <ul>
          <li>Para que puedas reservar y para recordarte tu cita.</li>
          <li>Para que el negocio sepa quién eres cuando llegas.</li>
          <li>Para sumarte y descontarte puntos, si participas del programa.</li>
          <li>Para enviarte novedades o promociones de ese negocio, si lo aceptaste. Puedes decir que no en cualquier momento.</li>
        </ul>
        <p>
          <strong>Tus datos son privados</strong> y un negocio no puede ver los datos de los
          clientes de otro negocio.
        </p>

        <h2>Tu nombre es tuyo</h2>
        <p>
          Si reservaste con un apodo o con el nombre mal escrito, puedes corregirlo tú mismo desde
          tu monedero de puntos. El negocio no decide cómo te llamas.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes pedir en cualquier momento <strong>acceder</strong> a tus datos,{' '}
          <strong>corregirlos</strong>, <strong>cancelarlos</strong> (que los borren) u{' '}
          <strong>oponerte</strong> a que se usen para ciertos fines. Son los derechos ARCO que te
          da la Ley N.° 29733.
        </p>
        <p>
          Como el <strong>responsable es el negocio</strong>, lo más rápido es pedírselo a ellos
          directamente. Si no te responden o no sabes cómo contactarlos, escríbenos a{' '}
          <a href={`mailto:${CORREO}`}>{CORREO}</a> y te ayudamos a canalizarlo.
        </p>

        <h2>Cuánto tiempo los guardamos</h2>
        <p>
          Mientras el negocio siga usando barber.pe y tú sigas siendo su cliente. Si pides que
          borren tus datos, se eliminan; se conserva únicamente lo que la ley obliga a conservar
          (por ejemplo, comprobantes de pago).
        </p>

        <h2>Reclamos</h2>
        <p>
          Si tienes un reclamo sobre el <strong>servicio que recibiste</strong> (el corte, la
          atención, el precio), va dirigido al negocio: cada uno tiene su Libro de Reclamaciones,
          disponible en su local y en su página.
        </p>
        <p>
          Si tu reclamo es sobre <strong>barber.pe como plataforma</strong>, tienes nuestro{' '}
          <a href="/libro-reclamaciones">Libro de Reclamaciones</a>.
        </p>

        <h2>Cambios</h2>
        <p>
          Si esto cambia de forma relevante, lo verás aquí con una versión nueva. La versión
          actual y su fecha de vigencia están arriba del todo.
        </p>
      </div>
    </LegalShell>
  )
}
