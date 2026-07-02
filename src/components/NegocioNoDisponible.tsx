/**
 * Pantalla pública "no disponible en estos momentos": se muestra cuando un local
 * está pausado o dejó de ser público (soft-lock por downgrade, Bloque A · Tanda 3),
 * o cuando el subdominio no resuelve a un local válido. No desloguea a nadie.
 */
export function NegocioNoDisponible({
  titulo = 'No disponible en estos momentos',
  mensaje = 'Por el momento este local no está disponible.',
}: {
  titulo?: string
  mensaje?: string
}) {
  return (
    <div style={wrap}>
      <div style={card}>
        <img src="/barber-logo-black.png" alt="Barber.pe" style={logo} />
        <h1 style={title}>{titulo}</h1>
        <p style={text}>{mensaje}</p>
        <p style={muted}>Gracias por tu visita.</p>
        <a href="https://barber.pe" style={btn}>Ir a Barber.pe</a>
      </div>
    </div>
  )
}

const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#f3f4f6', padding: 24,
}
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '40px 32px', maxWidth: 440, width: '100%',
  textAlign: 'center', boxShadow: '0 10px 40px rgba(17,24,39,0.10)',
}
const logo: React.CSSProperties = { width: 88, height: 88, objectFit: 'contain', margin: '0 auto 20px', display: 'block', opacity: 0.95 }
const title: React.CSSProperties = { fontSize: 22, fontWeight: 800, marginBottom: 10, color: '#111827' }
const text: React.CSSProperties = { color: '#4b5563', marginBottom: 8, lineHeight: 1.5 }
const muted: React.CSSProperties = { color: '#9ca3af', fontSize: 14, marginBottom: 22 }
const btn: React.CSSProperties = {
  display: 'inline-block', textDecoration: 'none', background: '#2855F6', color: '#fff',
  fontWeight: 700, padding: '12px 18px', borderRadius: 12,
}
