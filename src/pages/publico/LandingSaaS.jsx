import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Gauge,
  Menu,
  PhoneCall,
  Scissors,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
  X,
} from "lucide-react";

import API_BASE from "../../services/api";
import { getImageUrl } from "../../utils/imageUrl";

const FALLBACK_NEGOCIOS = [
  {
    idNegocio: 1,
    nombre: "Kisha Barber Spa",
    slug: "kisha-barber-spa",
    logoUrl: "",
    direccion: "Puente Piedra - Zapallal",
    whatsappNegocio: "943811931",
    descripcion: "Gestión profesional, reservas online y perfiles públicos.",
  },
];

export default function LandingSaaS() {
  const [negocios, setNegocios] = useState(FALLBACK_NEGOCIOS);
  const [negocioActivo, setNegocioActivo] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const cargarNegocios = async () => {
      try {
        const res = await fetch(`${API_BASE}/Negocios/publicos`);

        if (!res.ok) return;

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setNegocios(data);
        }
      } catch {
        setNegocios(FALLBACK_NEGOCIOS);
      }
    };

    cargarNegocios();
  }, []);

  useEffect(() => {
    if (negocios.length <= 1) return;

    const timer = setInterval(() => {
      setNegocioActivo((actual) => (actual + 1) % negocios.length);
    }, 5200);

    return () => clearInterval(timer);
  }, [negocios.length]);

  const planes = useMemo(
    () => [
      {
        titulo: "Starter",
        limite: "1 trabajador",
        features: ["Landing pública", "Servicios", "Reservas", "Panel Admin"],
      },
      {
        titulo: "Growth",
        limite: "Hasta 5 trabajadores",
        features: ["Perfiles públicos", "Dashboard", "Pagos parciales", "Roles"],
        featured: true,
      },
      {
        titulo: "Pro",
        limite: "Hasta 10 trabajadores",
        features: ["Comisiones", "Reportes", "Portafolios", "Disponibilidad"],
      },
      {
        titulo: "Enterprise",
        limite: "Escalable",
        features: ["Multi-negocio", "SuperAdmin", "Escalabilidad", "Soporte"],
      },
    ],
    []
  );

  const modulos = useMemo(
    () => [
      {
        icon: <CalendarCheck size={26} />,
        title: "Reservas online",
        text: "Tus clientes pueden reservar desde una landing profesional disponible las 24 horas.",
      },
      {
        icon: <UsersRound size={26} />,
        title: "Panel trabajador",
        text: "Cada trabajador ve sus servicios, pagos, perfil público y disponibilidad.",
      },
      {
        icon: <BarChart3 size={26} />,
        title: "Finanzas",
        text: "Controla ventas, comisiones, gastos y pagos desde un solo panel.",
      },
      {
        icon: <ShieldCheck size={26} />,
        title: "Roles protegidos",
        text: "Accesos separados para administrador y trabajador con seguridad por token.",
      },
      {
        icon: <Store size={26} />,
        title: "Landing por negocio",
        text: "Cada barbería o salón tiene su propia página pública con logo, servicios y contacto.",
      },
      {
        icon: <Gauge size={26} />,
        title: "Control operativo",
        text: "Una plataforma creada para gestionar el día a día de barberías y salones.",
      },
    ],
    []
  );

  const faqs = useMemo(
    () => [
      {
        pregunta: "¿Sirve para barberías y salones de belleza?",
        respuesta:
          "Sí. Barber.pe está pensado para barberías, peluquerías, salones de belleza y negocios con trabajadores que brindan servicios.",
      },
      {
        pregunta: "¿Cada negocio tiene su propia página?",
        respuesta:
          "Sí. Cada negocio puede tener su landing pública con logo, servicios, trabajadores, horarios y contacto.",
      },
      {
        pregunta: "¿Puedo controlar pagos y comisiones?",
        respuesta:
          "Sí. El sistema permite registrar ventas, calcular comisiones y controlar pagos totales o parciales.",
      },
      {
        pregunta: "¿Funciona en celular?",
        respuesta:
          "Sí. La plataforma está pensada para usarse desde computadora, tablet o celular.",
      },
    ],
    []
  );

  const negocioActual = negocios[negocioActivo] || FALLBACK_NEGOCIOS[0];
  const logoActual = getImageUrl(negocioActual?.logoUrl);

  const cerrarMenu = () => setMenuOpen(false);

  const irLogin = () => {
    window.location.href = "/login";
  };

  const irDemoWhatsapp = () => {
    window.open("https://wa.me/51943811931?text=Hola,%20quiero%20una%20demo%20de%20Barber.pe", "_blank");
  };

  const scrollToSection = (id) => {
    cerrarMenu();
    const section = document.getElementById(id);
    if (section) section.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="saas-container">
      <nav className={`saas-nav ${isScrolled ? "scrolled" : ""}`}>
        <div className="nav-content">
          <a className="brand-logo" href="/">
            barber<span>.pe</span>
          </a>

          <div className="nav-links">
            <button type="button" onClick={() => scrollToSection("ecosistema")}>
              Negocios
            </button>
            <button type="button" onClick={() => scrollToSection("plataforma")}>
              Módulos
            </button>
            <button type="button" onClick={() => scrollToSection("planes")}>
              Planes
            </button>
            <a href="/login" className="btn-login">
              Acceso
            </a>
            <button type="button" className="btn-gold-nav" onClick={irDemoWhatsapp}>
              Agendar demo
            </button>
          </div>

          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={27} /> : <Menu size={27} />}
          </button>
        </div>

        <div className={`mobile-menu ${menuOpen ? "active" : ""}`}>
          <button type="button" onClick={() => scrollToSection("ecosistema")}>
            Negocios
          </button>
          <button type="button" onClick={() => scrollToSection("plataforma")}>
            Módulos
          </button>
          <button type="button" onClick={() => scrollToSection("planes")}>
            Planes
          </button>
          <a href="/login" onClick={cerrarMenu}>
            Acceso
          </a>
          <button type="button" className="mobile-demo-btn" onClick={irDemoWhatsapp}>
            Agendar demo
          </button>
        </div>
      </nav>

      <header className="hero-section">
        <div className="hero-grid">
          <div className="hero-text">
            <span className="badge-gold">
              <Sparkles size={14} />
              SOFTWARE PARA BARBERÍAS Y SALONES
            </span>

            <h1>
              Convierte tu barbería en un negocio{" "}
              <span className="text-gold">digital y profesional.</span>
            </h1>

            <p>
              Barber.pe ayuda a dueños de barberías y salones de belleza a gestionar
              reservas, trabajadores, servicios, ventas, comisiones y pagos desde una
              plataforma moderna.
            </p>

            <div className="hero-btns">
              <button className="btn-gold" type="button" onClick={irDemoWhatsapp}>
                Agendar demo <ArrowRight size={18} />
              </button>

              <button className="btn-outline" type="button" onClick={() => scrollToSection("plataforma")}>
                Ver módulos
              </button>
            </div>

            <div className="hero-trust">
              <span>Reservas online</span>
              <span>Panel admin</span>
              <span>Comisiones</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="device-mockup">
              <div className="screen-header">
                <div className="status-dot"></div>
                <span>{negocioActual?.nombre || "Barbería premium"}</span>
              </div>

              <div className="screen-content">
                {logoActual ? (
                  <img src={logoActual} alt={negocioActual?.nombre || "Logo"} />
                ) : (
                  <Scissors size={52} className="icon-gold" />
                )}

                <h3>{negocioActual?.nombre || "Barbería premium"}</h3>

                <p>
                  {negocioActual?.descripcion ||
                    "Reservas, servicios y gestión profesional para tu negocio."}
                </p>

                <div className="mock-stats">
                  <div>
                    <strong>24</strong>
                    <span>Reservas</span>
                  </div>
                  <div>
                    <strong>S/ 890</strong>
                    <span>Ventas</span>
                  </div>
                  <div>
                    <strong>5</strong>
                    <span>Trabajadores</span>
                  </div>
                </div>

                <div className="mock-data">
                  <div className="bar"></div>
                  <div className="bar short"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="ecosistema" className="section-padding">
        <div className="section-header">
          <span className="section-label">ECOSISTEMA</span>
          <h2>Todo conectado para vender más y administrar mejor</h2>
          <p>
            Tu landing pública atrae clientes, el panel administra el negocio y el portal
            trabajador organiza servicios, comisiones y disponibilidad.
          </p>
        </div>

        <div className="preview-grid">
          <article className="preview-card large">
            <div className="preview-image dashboard-preview">
              <div className="dashboard-top"></div>
              <div className="dashboard-grid">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="dashboard-line"></div>
              <div className="dashboard-line small"></div>
            </div>
            <h3>Panel administrativo</h3>
            <p>Controla ventas, servicios, trabajadores, pagos, gastos y reportes.</p>
          </article>

          <article className="preview-card">
            <div className="phone-preview">
              <div className="phone-notch"></div>
              <Scissors size={36} className="icon-gold" />
              <span>Reserva online</span>
              <button type="button">Reservar</button>
            </div>
            <h3>Reservas desde celular</h3>
            <p>El cliente puede consultar servicios y contactarte rápidamente.</p>
          </article>
        </div>
      </section>

      <section id="plataforma" className="section-padding">
        <div className="section-header">
          <span className="section-label">MÓDULOS</span>
          <h2>Gestión de 360 grados</h2>
          <p>Todo lo que tu negocio necesita en una sola herramienta.</p>
        </div>

        <div className="modules-grid">
          {modulos.map((modulo, index) => (
            <article className="module-card" key={index}>
              <div className="module-icon">{modulo.icon}</div>
              <h3>{modulo.title}</h3>
              <p>{modulo.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-padding bg-dark">
        <div className="section-header">
          <span className="section-label">NEGOCIOS</span>
          <h2>Tu barbería también puede verse así</h2>
          <p>
            Muestra tu marca, tus servicios y tus trabajadores en una página moderna
            lista para compartir por WhatsApp, Instagram o Google.
          </p>
        </div>

        <div className="business-grid">
          {negocios.slice(0, 3).map((negocio) => {
            const logo = getImageUrl(negocio.logoUrl);

            return (
              <article className="business-card" key={negocio.idNegocio}>
                <div className="business-cover">
                  {logo ? (
                    <img src={logo} alt={negocio.nombre} />
                  ) : (
                    <Scissors size={42} className="icon-gold" />
                  )}
                </div>

                <div className="business-info">
                  <h3>{negocio.nombre}</h3>
                  <p>{negocio.direccion || "Landing profesional para tu negocio"}</p>

                  <a href={`/negocio/${negocio.slug}`} className="business-link">
                    Ver landing <ArrowRight size={15} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="planes" className="section-padding">
        <div className="section-header">
          <span className="section-label">PLANES</span>
          <h2>Planes a tu medida</h2>
          <p>Empieza pequeño y escala cuando tu negocio crezca.</p>
        </div>

        <div className="plans-wrapper">
          {planes.map((plan, index) => (
            <article
              className={`plan-card ${plan.featured ? "gold-border" : ""}`}
              key={index}
            >
              {plan.featured && <span className="pop-badge">Popular</span>}

              <h4>{plan.titulo}</h4>
              <span className="plan-limit">{plan.limite}</span>

              <ul className="plan-list">
                {plan.features.map((feature, idx) => (
                  <li key={idx}>
                    <CheckCircle2 size={15} className="icon-gold" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={plan.featured ? "btn-gold-full" : "btn-white-outline"}
                onClick={irDemoWhatsapp}
              >
                Consultar
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="section-padding bg-dark">
        <div className="section-header">
          <span className="section-label">FAQ</span>
          <h2>Preguntas frecuentes</h2>
        </div>

        <div className="faq-wrapper">
          {faqs.map((faq, index) => (
            <details className="faq-item" key={index} open={index === 0}>
              <summary>{faq.pregunta}</summary>
              <p>{faq.respuesta}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="demo" className="cta-section">
        <div className="cta-content">
          <span className="badge-gold">
            <PhoneCall size={14} />
            DEMO PERSONALIZADA
          </span>

          <h2>Moderniza tu barbería o salón con Barber.pe</h2>

          <p>
            Agenda una demo y mira cómo tu negocio puede tener landing pública,
            reservas, trabajadores, ventas, comisiones y pagos en una sola plataforma.
          </p>

          <div className="hero-btns center">
            <button className="btn-gold" type="button" onClick={irDemoWhatsapp}>
              Hablar por WhatsApp <ArrowRight size={18} />
            </button>

            <button className="btn-outline" type="button" onClick={irLogin}>
              Acceso al sistema
            </button>
          </div>
        </div>
      </section>

      <footer className="footer-simple">
        <a className="brand-logo" href="/">
          barber<span>.pe</span>
        </a>

        <p>© 2026 Barber.pe - Software para barberías y salones de belleza.</p>
      </footer>
    </main>
  );
}