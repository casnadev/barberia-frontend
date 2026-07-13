import LegalShell from './LegalShell'
import s from './Legal.module.css'

/**
 * PÁGINA DE SOPORTE — barber.pe/soporte   (pública, sin sesión)
 *
 * Existe por una razón concreta: la consola de Google Pay & Wallet exige una
 * "URL de soporte al cliente" — un sitio real, público y accesible, al que el
 * usuario de la tarjeta pueda acudir a pedir ayuda.
 *
 * Lo que había antes NO servía: el "Contacto" de la landing es un ancla
 * (#contacto) que hace scroll a un formulario de CAPTACIÓN DE LEADS ("quiero
 * Barber.pe para mi negocio"). Eso es un formulario de ventas, no un canal de
 * soporte — y una URL con # puede que Google ni la acepte.
 *
 * Por eso esta página es una URL limpia, con canales de contacto de verdad y sin
 * nada que vender.
 */

const CORREO = 'contacto@barber.pe'
const TELEFONO = '+51 970 888 117'
const TELEFONO_E164 = '+51970888117'      // el formato que pide Google (con prefijo de país)
const WHATSAPP = '51970888117'            // wa.me va sin el "+"

export default function SoportePage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Ayuda</span>
      <h1 className={s.title}>Soporte</h1>
      <p className={s.updated}>Barber.pe · Computer Solutions L&amp;E E.I.R.L.</p>

      <div className={s.prose}>
        <p>
          ¿Necesitas ayuda con tu tarjeta de puntos, una reserva o tu cuenta?
          Escríbenos y te respondemos. Somos personas, no un bot.
        </p>

        <h2>Cómo contactarnos</h2>
        <ul>
          <li>
            <strong>Correo:</strong> <a href={`mailto:${CORREO}`}>{CORREO}</a>
          </li>
          <li>
            <strong>WhatsApp:</strong>{' '}
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
              {TELEFONO}
            </a>
          </li>
          <li>
            <strong>Teléfono:</strong> <a href={`tel:${TELEFONO_E164}`}>{TELEFONO}</a>
          </li>
        </ul>

        <p>
          <strong>Horario de atención:</strong> lunes a sábado, de 9:00 a 19:00 (hora de Perú, UTC−5).
          Fuera de ese horario escríbenos igual: lo vemos al día siguiente.
        </p>

        <h2>Preguntas frecuentes</h2>

        <h3>Perdí mi tarjeta de puntos o cambié de teléfono</h3>
        <p>
          No has perdido nada. Tus puntos <strong>no viven en el teléfono</strong>: viven en tu cuenta
          de Barber.pe. Vuelve a escanear el código QR del local, pon el mismo número de celular de
          siempre, y recuperarás tu tarjeta con todos tus puntos intactos.
        </p>

        <h3>Google Wallet no me funciona / tengo un iPhone</h3>
        <p>
          No hace falta Google Wallet. Cada tarjeta tiene también una página web propia
          (<strong>barber.pe/monedero/…</strong>) que funciona en cualquier teléfono, sin instalar
          nada. Guárdala en tu pantalla de inicio y listo.
        </p>

        <h3>Mis puntos no aparecen</h3>
        <p>
          Los puntos se acreditan cuando la venta queda registrada. Si te atendió un profesional, la
          venta pasa antes por la aprobación del dueño del local, así que pueden tardar un poco.
          Si tras eso sigues sin verlos, escríbenos con la fecha de tu visita y el nombre del local.
        </p>

        <h3>Quiero borrar mi cuenta o mis datos</h3>
        <p>
          Puedes darte de baja desde tu cuenta, o escribirnos a{' '}
          <a href={`mailto:${CORREO}`}>{CORREO}</a>. Te explicamos qué guardamos y por qué en la{' '}
          <a href="/privacidad">Política de Privacidad</a>.
        </p>

        <h3>Tengo un reclamo formal</h3>
        <p>
          Puedes dejarlo en nuestro <a href="/libro-reclamaciones">Libro de Reclamaciones</a>, tal
          como manda la ley peruana.
        </p>

        <h2>Otros enlaces</h2>
        <ul>
          <li><a href="/terminos">Términos y Condiciones</a></li>
          <li><a href="/privacidad">Política de Privacidad</a></li>
          <li><a href="/uso-aceptable">Política de Uso Aceptable</a></li>
          <li><a href="/libro-reclamaciones">Libro de Reclamaciones</a></li>
        </ul>
      </div>
    </LegalShell>
  )
}
