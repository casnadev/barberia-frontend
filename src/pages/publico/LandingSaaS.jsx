import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gauge,
  LockKeyhole,
  MessageCircle,
  Rocket,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UsersRound,
} from "lucide-react";

import API_BASE from "../../services/api";
import "../../styles/LandingSaaS.css";

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

import { getImageUrl } from "../../utils/imageUrl";

export default function LandingSaaS() {
  const [negocios, setNegocios] = useState(FALLBACK_NEGOCIOS);
  const [negocioActivo, setNegocioActivo] = useState(0);

  useEffect(() => {
    const cargarNegocios = async () => {
      try {
        const res = await fetch(`${API_BASE}/Negocios/publicos`);

        if (!res.ok) return;

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setNegocios(data);
        }
      } catch (error) {
        console.error("Error cargando negocios públicos:", error);
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
        texto: "Para barberías pequeñas que desean ordenar reservas, servicios y comisiones desde el primer día.",
        features: ["Landing pública", "Servicios", "Reservas", "Panel Admin"],
      },
      {
        titulo: "Growth",
        limite: "Hasta 5 trabajadores",
        texto: "Para equipos en crecimiento que necesitan agenda, perfiles, portafolios y control diario.",
        features: ["Perfiles públicos", "Dashboard", "Pagos parciales", "Roles"],
        featured: true,
      },
      {
        titulo: "Pro",
        limite: "Hasta 10 trabajadores",
        texto: "Para negocios con alta rotación, más control financiero y operación constante.",
        features: ["Comisiones", "Reportes", "Portafolios", "Disponibilidad"],
      },
      {
        titulo: "Enterprise",
        limite: "Escalable",
        texto: "Para marcas con varias sedes o equipos grandes que buscan centralizar su operación.",
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
        text: "Tus clientes reservan desde una landing pública profesional conectada a cada negocio.",
      },
      {
        icon: <UsersRound size={26} />,
        title: "Panel trabajador",
        text: "Cada profesional tiene acceso a su perfil, servicios, reservas y pagos.",
      },
      {
        icon: <BarChart3 size={26} />,
        title: "Dashboard financiero",
        text: "Ventas, comisiones, gastos y pagos parciales en un solo lugar.",
      },
      {
        icon: <ShieldCheck size={26} />,
        title: "Roles seguros",
        text: "SuperAdmin, Admin y Trabajador con acceso separado según negocio.",
      },
      {
        icon: <Store size={26} />,
        title: "Landing por negocio",
        text: "Cada barbería puede mostrar logo, servicios, trabajadores, redes y WhatsApp.",
      },
      {
        icon: <Gauge size={26} />,
        title: "Operación diaria",
        text: "Pensado para administrar la barbería real: atención, servicios, pagos y seguimiento.",
      },
    ],
    []
  );

  const negocioActual = negocios[negocioActivo] || negocios[0] || FALLBACK_NEGOCIOS[0];

  const irNegocioAnterior = () => {
    setNegocioActivo((actual) => (actual - 1 + negocios.length) % negocios.length);
  };

  const irNegocioSiguiente = () => {
    setNegocioActivo((actual) => (actual + 1) % negocios.length);
  };

  const getLandingUrl = (negocio) => {
    return negocio?.slug || negocio?.Slug ? `/negocio/${negocio.slug || negocio.Slug}` : "/login";
  };

  const renderNegocioCard = (negocio, index) => {
    const logo = getImageUrl(negocio.logoUrl || negocio.LogoUrl);
    const nombre = negocio.nombre || negocio.Nombre || "Negocio Barber.pe";
    const direccion = negocio.direccion || negocio.Direccion || negocio.descripcion || negocio.Descripcion || "Negocio conectado a Barber.pe";
    const whatsapp = negocio.whatsappNegocio || negocio.WhatsappNegocio || negocio.telefono || negocio.Telefono;
    const activo = index === negocioActivo;

    return (
      <article
        key={negocio.idNegocio || negocio.IdNegocio || nombre}
        className={`saas2-business-card ${activo ? "active" : ""}`}
      >
        <div className="saas2-business-cover">
          {logo ? (
            <img src={logo} alt={nombre} loading="lazy" />
          ) : (
            <div className="saas2-business-cover-empty">
              <Scissors size={38} />
            </div>
          )}

          <div className="saas2-live-pill">
            <span />
            Activo en Barber.pe
          </div>
        </div>

        <div className="saas2-business-content">
          <div className="saas2-business-kicker">
            <Star size={15} fill="currentColor" />
            Landing conectada
          </div>

          <h3>{nombre}</h3>
          <p>{direccion}</p>

          <div className="saas2-business-tags">
            <span>Landing</span>
            <span>Servicios</span>
            <span>Trabajadores</span>
            {whatsapp && <span>WhatsApp</span>}
          </div>

          <a className="saas2-card-link" href={getLandingUrl(negocio)}>
            Ver landing pública
            <ArrowRight size={16} />
          </a>
        </div>
      </article>
    );
  };

  return (
    <main className="saas2-page">
      <nav className="saas2-navbar">
        <a className="saas2-brand" href="/">
          barber<span>.pe</span>
        </a>

        <div className="saas2-menu">
          <a href="#ecosistema">Negocios</a>
          <a href="#plataforma">Plataforma</a>
          <a href="#planes">Planes</a>
          <a href="/login" className="saas2-user-link">
            Ya uso el sistema
          </a>
          <a
            href="#demo"
            className="saas2-nav-cta"
            onClick={(e) => e.preventDefault()}
          >
            Solicitar demo
          </a>
        </div>
      </nav>

      <section className="saas2-hero">
        <div className="saas2-hero-bg" />
        <div className="saas2-hero-grid">
          <div className="saas2-hero-copy">
            <div className="saas2-eyebrow">
              <Sparkles size={16} />
              SaaS premium para barberías y salones
            </div>

            <h1>
              Convierte tu barbería en una operación digital, elegante y medible.
            </h1>

            <p>
              Barber.pe reúne landing pública, reservas, trabajadores, servicios,
              comisiones, pagos y dashboard en una sola plataforma diseñada para
              vender más y administrar mejor.
            </p>

            <div className="saas2-hero-actions">
              <a href="/login" className="saas2-btn-primary">
                Ya uso el sistema
                <ArrowRight size={18} />
              </a>

              <a
                href="#demo"
                className="saas2-btn-secondary"
                onClick={(e) => e.preventDefault()}
              >
                Solicitar demo
              </a>

              <a
                href="#info"
                className="saas2-btn-ghost"
                onClick={(e) => e.preventDefault()}
              >
                Deseo más información
              </a>
            </div>

            <div className="saas2-hero-proof">
              <div>
                <strong>Multi-negocio</strong>
                <span>Cada barbería con datos separados</span>
              </div>
              <div>
                <strong>Perfiles públicos</strong>
                <span>Trabajadores con portafolio propio</span>
              </div>
              <div>
                <strong>Panel seguro</strong>
                <span>Roles Admin y Trabajador</span>
              </div>
            </div>
          </div>

          <div className="saas2-hero-showcase">
            <div className="saas2-device-card">
              <div className="saas2-device-top">
                <div>
                  <span>Barber.pe Live</span>
                  <h3>{negocioActual?.nombre || negocioActual?.Nombre || "Negocio conectado"}</h3>
                </div>
                <Crown size={26} />
              </div>

              <div className="saas2-device-preview">
                {getImageUrl(negocioActual?.logoUrl || negocioActual?.LogoUrl) ? (
                  <img
                    src={getImageUrl(negocioActual?.logoUrl || negocioActual?.LogoUrl)}
                    alt={negocioActual?.nombre || negocioActual?.Nombre || "Negocio"}
                  />
                ) : (
                  <Scissors size={54} />
                )}
              </div>

              <div className="saas2-device-bottom">
                <div>
                  <small>Landing pública</small>
                  <strong>{negocioActual?.direccion || negocioActual?.Direccion || "Reservas, servicios y equipo"}</strong>
                </div>

                <a href={getLandingUrl(negocioActual)}>
                  Ver
                  <ArrowRight size={15} />
                </a>
              </div>
            </div>

            <div className="saas2-floating-card top">
              <CalendarCheck size={20} />
              <div>
                <strong>Reservas online</strong>
                <span>Flujo conectado al negocio</span>
              </div>
            </div>

            <div className="saas2-floating-card bottom">
              <BarChart3 size={20} />
              <div>
                <strong>Comisiones y pagos</strong>
                <span>Control operativo diario</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ecosistema" className="saas2-section saas2-ecosystem">
        <div className="saas2-section-head">
          <div>
            <div className="saas2-eyebrow dark">
              <Rocket size={16} />
              Ecosistema Barber.pe
            </div>

            <h2>Negocios reales conectados a tu red</h2>

            <p>
              Este carrusel muestra barberías o salones que ya existen dentro de
              tu red. Cada tarjeta apunta a su landing pública funcionando en Barber.pe.
            </p>
          </div>

          <div className="saas2-carousel-controls">
            <button onClick={irNegocioAnterior} type="button" aria-label="Negocio anterior">
              <ChevronLeft size={20} />
            </button>
            <button onClick={irNegocioSiguiente} type="button" aria-label="Negocio siguiente">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="saas2-business-feature">
          <div className="saas2-business-main">
            {renderNegocioCard(negocioActual, negocioActivo)}
          </div>

          <div className="saas2-business-strip">
            {negocios.map((negocio, index) => {
              const logo = getImageUrl(negocio.logoUrl || negocio.LogoUrl);
              const nombre = negocio.nombre || negocio.Nombre || "Negocio";

              return (
                <button
                  key={negocio.idNegocio || negocio.IdNegocio || nombre}
                  className={`saas2-mini-business ${index === negocioActivo ? "active" : ""}`}
                  type="button"
                  onClick={() => setNegocioActivo(index)}
                  title={nombre}
                >
                  {logo ? <img src={logo} alt={nombre} /> : <Scissors size={20} />}
                  <span>{nombre}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section id="plataforma" className="saas2-section saas2-platform">
        <div className="saas2-section-center">
          <div className="saas2-eyebrow">
            <LockKeyhole size={16} />
            Plataforma operativa
          </div>

          <h2>Todo lo que necesita una barbería para verse profesional y operar mejor</h2>

          <p>
            Una sola plataforma para presencia pública, gestión interna y control
            de trabajadores. Sin mezclar datos entre negocios.
          </p>
        </div>

        <div className="saas2-module-grid">
          {modulos.map((modulo) => (
            <article className="saas2-module-card" key={modulo.title}>
              <div className="saas2-module-icon">{modulo.icon}</div>
              <h3>{modulo.title}</h3>
              <p>{modulo.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="saas2-section saas2-comparison">
        <div className="saas2-comparison-card">
          <div>
            <div className="saas2-eyebrow">
              <ShieldCheck size={16} />
              Diferencia clara
            </div>

            <h2>No vendes solo turnos. Vendes una experiencia digital premium.</h2>

            <p>
              El cliente ve una landing seria. El dueño controla ventas y
              comisiones. El trabajador tiene perfil y agenda. El negocio gana
              orden y presencia.
            </p>
          </div>

          <div className="saas2-check-list">
            <div>
              <CheckCircle2 size={19} />
              Landing pública por negocio
            </div>
            <div>
              <CheckCircle2 size={19} />
              Catálogo de servicios y trabajadores
            </div>
            <div>
              <CheckCircle2 size={19} />
              Reservas con confirmación por correo
            </div>
            <div>
              <CheckCircle2 size={19} />
              Dashboard de ventas, comisiones y pagos
            </div>
            <div>
              <CheckCircle2 size={19} />
              Administración separada por negocio
            </div>
          </div>
        </div>
      </section>

      <section id="planes" className="saas2-section saas2-plans">
        <div className="saas2-section-head">
          <div>
            <div className="saas2-eyebrow dark">
              <Crown size={16} />
              Planes por crecimiento
            </div>
            <h2>Escala según el tamaño de tu equipo</h2>
            <p>
              De una barbería pequeña a una marca con múltiples trabajadores.
              Barber.pe puede crecer junto al negocio.
            </p>
          </div>
        </div>

        <div className="saas2-plan-grid">
          {planes.map((plan) => (
            <article className={`saas2-plan-card ${plan.featured ? "featured" : ""}`} key={plan.titulo}>
              {plan.featured && <span className="saas2-plan-popular">Más recomendado</span>}
              <small>{plan.limite}</small>
              <h3>{plan.titulo}</h3>
              <p>{plan.texto}</p>

              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <CheckCircle2 size={16} />
                    {feature}
                  </li>
                ))}
              </ul>

              <a href="#demo" onClick={(e) => e.preventDefault()}>
                Solicitar información
                <ArrowRight size={16} />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="saas2-final-cta">
        <div>
          <div className="saas2-eyebrow">
            <MessageCircle size={16} />
            Demo personalizada
          </div>

          <h2>Haz que tu barbería se vea como una marca premium.</h2>

          <p>
            Por ahora este botón queda preparado para conectar luego con WhatsApp,
            formulario comercial o CRM.
          </p>
        </div>

        <div className="saas2-final-actions">
          <a href="/login" className="saas2-btn-primary">
            Ya uso el sistema
            <ArrowRight size={18} />
          </a>

          <a href="#demo" className="saas2-btn-secondary" onClick={(e) => e.preventDefault()}>
            Solicitar demo
          </a>
        </div>
      </section>

      <footer className="saas2-footer">
        <div>
          <a className="saas2-brand footer" href="/">
            barber<span>.pe</span>
          </a>
          <p>
            SaaS para digitalizar barberías, ordenar la gestión diaria y convertir
            cada negocio en una marca pública profesional.
          </p>
        </div>

        <div className="saas2-footer-links">
          <a href="/login">Ya uso el sistema</a>
          <a href="#ecosistema">Negocios</a>
          <a href="#plataforma">Plataforma</a>
          <a href="#planes">Planes</a>
        </div>

        <div className="saas2-copy">
          © 2026 Barber.pe — Plataforma SaaS para barberías y salones.
        </div>
      </footer>
    </main>
  );
}
