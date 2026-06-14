import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import s from './Legal.module.css'

export default function LegalShell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate()
  return (
    <div className={s.page}>
      <header className={s.topbar}>
        <div className={s.topin}>
          <img src="/barber-logo.png" alt="Barber.PE" className={s.logoImg} onClick={() => nav('/')} />
          <Link to="/" className={s.back}><ArrowLeft size={16} /> Volver al inicio</Link>
        </div>
      </header>
      <main className={s.wrap}>{children}</main>
    </div>
  )
}
