import LegalShell from './LegalShell'
import s from './Legal.module.css'
import { LEGAL_VERSIONS, LEGAL_VIGENCIA } from './legalVersions'

const CORREO = 'contacto@barber.pe'

export default function UsoAceptablePage() {
  return (
    <LegalShell>
      <span className={s.kicker}>Legal</span>
      <h1 className={s.title}>Política de Uso Aceptable</h1>
      <p className={s.updated}>Versión {LEGAL_VERSIONS.usoAceptable} · Vigente desde el {LEGAL_VIGENCIA}</p>

      <div className={s.prose}>
        <p>Para que Barber.pe sea un lugar seguro para todos, hay algunos usos que no están permitidos.</p>

        <h2>No está permitido usar Barber.pe para</h2>
        <ul>
          <li>actividades ilegales;</li>
          <li>fraudes;</li>
          <li>publicidad engañosa;</li>
          <li>publicar servicios prohibidos por la legislación vigente;</li>
          <li>ofrecer procedimientos que requieran autorización sin contar con ella;</li>
          <li>vulnerar la seguridad de la plataforma;</li>
          <li>enviar spam;</li>
          <li>infringir derechos de terceros.</li>
        </ul>

        <p>Si detectamos alguno de estos casos, podremos ocultar el contenido o suspender la cuenta mientras revisamos el caso. ¿Dudas? Escríbenos a <a href={`mailto:${CORREO}`}>{CORREO}</a>.</p>
      </div>
    </LegalShell>
  )
}
