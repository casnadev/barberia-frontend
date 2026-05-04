import { Link } from "react-router-dom";

export default function LandingSaaS() {
  const demos = [
    {
      nombre: "Melchor Styles",
      descripcion: "Landing pública con servicios, trabajadores, reservas y redes sociales.",
      slug: "melchor-styles",
      estado: "Demo activa",
    },
    {
      nombre: "Kisha Barber Spa",
      descripcion: "Ejemplo de negocio con reservas online y catálogo de barberos.",
      slug: "kisha-barber-spa",
      estado: "Demo activa",
    },
    {
      nombre: "Barber Demo",
      descripcion: "Vista pública moderna para clientes desde celular.",
      slug: "barber-demo",
      estado: "Demo activa",
    },
  ];

  const beneficios = [
    {
      icono: "📅",
      titulo: "Reservas online",
      texto: "Tus clientes eligen servicio, barbero, fecha y hora desde el celular.",
    },
    {
      icono: "👥",
      titulo: "Trabajadores",
      texto: "Administra barberos, disponibilidad, perfiles públicos y servicios realizados.",
    },
    {
      icono: "💰",
      titulo: "Ventas y comisiones",
      texto: "Controla ingresos, pagos parciales, comisiones pendientes y pagadas.",
    },
    {
      icono: "🌐",
      titulo: "Landing por negocio",
      texto: "Cada barbería tiene su propio link público con logo, fotos, servicios y redes.",
    },
  ];

  const pasos = [
    {
      numero: "01",
      titulo: "Configura tu negocio",
      texto: "Sube logo, horarios, dirección, WhatsApp, redes sociales y fotos.",
    },
    {
      numero: "02",
      titulo: "Agrega trabajadores",
      texto: "Crea perfiles para barberos y organiza sus servicios.",
    },
    {
      numero: "03",
      titulo: "Publica tus servicios",
      texto: "Muestra precios, duración, imágenes y descripción para tus clientes.",
    },
    {
      numero: "04",
      titulo: "Recibe reservas",
      texto: "Tus clientes reservan y reciben confirmación por correo.",
    },
  ];

  return (
    <div className="saas-page">
      <header className="saas-navbar">
        <div className="container saas-navbar-inner">
          <Link to="/" className="saas-brand">
            Barber.pe
          </Link>

          <div className="saas-navbar-actions">
            <Link to="/login" className="saas-login-link">
              Ingresar
            </Link>

            <a
              href="#"
              target=""
              rel="noreferrer"
              className="saas-nav-cta"
            >
              Solicitar acceso
            </a>
          </div>
        </div>
      </header>

      <section className="saas-hero">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <span className="saas-eyebrow">Software para barberías</span>

              <h1 className="saas-hero-title">
                Administra tu barbería sin depender del cuaderno
              </h1>

              <p className="saas-hero-text">
                Controla citas, clientes, trabajadores, reservas, ventas,
                comisiones e historial desde un solo panel fácil de usar.
              </p>

              <div className="saas-hero-actions">
                <a
                  href="#"
                  target=""
                  rel="noreferrer"
                  className="saas-btn-primary"
                >
                  Solicitar acceso
                </a>

                <a href="#demos" className="saas-btn-secondary">
                  Ver negocios demo
                </a>
              </div>

              <div className="saas-hero-trust">
                <span>Multi-negocio</span>
                <span>Correo Gmail</span>
                <span>Contraseñas hasheadas</span>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="saas-dashboard-card">
                <div className="saas-dashboard-header">
                  <div>
                    <span>Resumen de hoy</span>
                    <h3>S/ 1,240.00</h3>
                  </div>

                  <span className="saas-status-pill">En vivo</span>
                </div>

                <div className="saas-metric-grid">
                  <div>
                    <span>Reservas</span>
                    <strong>18</strong>
                  </div>

                  <div>
                    <span>Clientes</span>
                    <strong>94</strong>
                  </div>

                  <div>
                    <span>Trabajadores</span>
                    <strong>6</strong>
                  </div>

                  <div>
                    <span>Comisiones</span>
                    <strong>S/ 320</strong>
                  </div>
                </div>

                <div className="saas-whatsapp-card">
                  <div>
                    <span className="saas-red-dot"></span>
                    <strong>Nueva reserva</strong>
                  </div>
                  <p>
                    Carlos reservó Corte + Barba para hoy a las 5:30 PM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="saas-video-section">
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-lg-6">
              <div className="saas-video-box">
                <video
                  src="/videos/barber-demo.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/imagenes/barber-poster.jpg"
                />
              </div>
            </div>

            <div className="col-lg-6">
              <span className="saas-eyebrow">Experiencia moderna</span>

              <h2>Tus clientes reservan. Tú controlas todo.</h2>

              <p>
                Barber.pe convierte tu barbería en un negocio más ordenado:
                tus clientes ven servicios, eligen barbero y reservan sin que
                tengas que revisar mensajes todo el día.
              </p>

              <div className="saas-mini-list">
                <span>Confirmación por correo</span>
                <span>Reservas desde celular</span>
                <span>Historial del negocio</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container saas-section">
        <div className="saas-section-head">
          <span className="saas-eyebrow">Todo en un solo lugar</span>
          <h2>Simple para el dueño, rápido para el cliente</h2>
          <p>
            Diseñado para negocios que quieren orden, control y reservas sin complicarse.
          </p>
        </div>

        <div className="row g-4">
          {beneficios.map((item) => (
            <div className="col-md-6 col-lg-3" key={item.titulo}>
              <div className="saas-benefit-card">
                <div className="saas-benefit-icon">{item.icono}</div>
                <h4>{item.titulo}</h4>
                <p>{item.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="saas-dark-section">
        <div className="container">
          <div className="saas-section-head light">
            <span className="saas-eyebrow">Empieza fácil</span>
            <h2>En pocos pasos tu barbería ya puede recibir reservas</h2>
            <p>
              Sin instalar nada. Solo ingresas al panel, configuras tu negocio y compartes tu link.
            </p>
          </div>

          <div className="row g-4">
            {pasos.map((paso) => (
              <div className="col-md-6 col-lg-3" key={paso.numero}>
                <div className="saas-step-card">
                  <span>{paso.numero}</span>
                  <h4>{paso.titulo}</h4>
                  <p>{paso.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demos" className="container saas-section">
        <div className="saas-section-head">
          <span className="saas-eyebrow">Negocios en demo</span>
          <h2>Mira cómo se ve una barbería usando Barber.pe</h2>
          <p>
            Cada negocio tiene su propia landing pública con servicios, trabajadores y reservas.
          </p>
        </div>

        <div className="saas-demo-scroll">
          {demos.map((demo) => (
            <div className="saas-demo-card" key={demo.slug}>
              <div className="saas-demo-cover">
                <span>{demo.nombre.charAt(0)}</span>
              </div>

              <div className="saas-demo-body">
                <span className="saas-status-pill">{demo.estado}</span>
                <h4>{demo.nombre}</h4>
                <p>{demo.descripcion}</p>

                <Link to={`/negocio/${demo.slug}`} className="saas-btn-primary full">
                  Ver negocio
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container saas-section">
        <div className="saas-whatsapp-panel">
          <div>
            <span className="saas-eyebrow">Sin perder mensajes</span>
            <h2>Menos caos en WhatsApp, más reservas ordenadas</h2>
            <p>
              Tus clientes pueden reservar desde la web y el negocio mantiene
              toda la información organizada: servicio, trabajador, fecha, hora,
              cliente y correo.
            </p>
          </div>

          <div className="saas-phone-card">
            <div className="saas-phone-message incoming">
              Hola, quiero reservar un corte.
            </div>

            <div className="saas-phone-message outgoing">
              Puedes reservar aquí: barber.pe/negocio/tu-barberia
            </div>

            <div className="saas-phone-message confirmed">
              Reserva registrada y confirmada por correo.
            </div>
          </div>
        </div>
      </section>

      <section className="container saas-section">
        <div className="saas-final-cta">
          <span className="saas-eyebrow">Barber.pe</span>
          <h2>Deja el cuaderno. Administra tu barbería desde el celular.</h2>
          <p>
            Solicita acceso y empieza a probar el sistema con tu negocio.
          </p>

          <div className="saas-hero-actions center">
            <a
              href="#"
              target=""
              rel="noreferrer"
              className="saas-btn-primary"
            >
              Solicitar acceso
            </a>

            <Link to="/login" className="saas-btn-secondary">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer-simple">
        <p>
          <strong>Barber.pe</strong> | © 2026 Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}