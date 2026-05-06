import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../services/api";

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

const getAssetUrl = (ruta) => {
  if (!ruta) return "";
  if (ruta.startsWith("http")) return ruta;
  return `${API_BASE.replace("/api", "")}${ruta}`;
};

export default function LandingSaaS() {
  const [negocios, setNegocios] = useState(FALLBACK_NEGOCIOS);

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

  const planes = useMemo(
    () => [
      {
        titulo: "Plan Starter",
        limite: "1 trabajador",
        texto: "Ideal para barberías pequeñas que quieren ordenar reservas, servicios y comisiones.",
      },
      {
        titulo: "Plan Growth",
        limite: "5 trabajadores",
        texto: "Para equipos en crecimiento con agenda pública, portafolio y control operativo.",
      },
      {
        titulo: "Plan Pro",
        limite: "10 trabajadores",
        texto: "Pensado para negocios con mayor rotación, pagos parciales y analítica diaria.",
      },
      {
        titulo: "Plan Enterprise",
        limite: "Ilimitado",
        texto: "Escalable para marcas con múltiples equipos, operación intensiva y expansión.",
      },
    ],
    []
  );

  return (
    <div className="saas-landing">
      <nav className="saas-navbar">
        <a className="saas-brand" href="/">
          barber<span>.pe</span>
        </a>

        <div className="saas-menu">
          <a href="#negocios">Negocios</a>
          <a href="#plataforma">Plataforma</a>
          <a href="#planes">Planes</a>
          <a className="saas-login-link" href="/login">
            Acceso
          </a>
          <a className="btn btn-gold saas-demo-link" href="#demo">
            Solicitar demo
          </a>
        </div>
      </nav>

      <header className="saas-hero">
        <div className="saas-hero-glow" />

        <div className="saas-hero-content">
          <div className="saas-badge">SaaS multi-negocio para barberías</div>

          <h1>
            Controla reservas, comisiones, pagos y perfiles públicos desde una
            sola plataforma.
          </h1>

          <p>
            Barber.pe centraliza la operación diaria de tu barbería con roles
            Admin y Trabajador, agenda online, landing pública, reportes
            financieros y control por negocio.
          </p>

          <div className="saas-hero-actions">
            <a href="/login" className="btn btn-gold">
              Acceder al sistema
            </a>

            <a href="#demo" className="btn btn-dark-outline saas-outline-light">
              Solicitar demo
            </a>
          </div>

          <div className="saas-hero-metrics">
            <div>
              <strong>Multi-tenant</strong>
              <span>cada negocio aislado por IdNegocio</span>
            </div>

            <div>
              <strong>Roles seguros</strong>
              <span>SuperAdmin, Admin y Trabajador</span>
            </div>

            <div>
              <strong>Agenda pública</strong>
              <span>reservas online por trabajador</span>
            </div>
          </div>
        </div>
      </header>

      <section id="negocios" className="saas-section">
        <div className="saas-section-head">
          <div>
            <span className="saas-eyebrow">Landings conectadas</span>
            <h2>Negocios reales dentro del ecosistema Barber.pe</h2>
            <p>
              Cada barbería puede tener su propia landing pública con servicios,
              trabajadores, portafolio, WhatsApp y reserva online.
            </p>
          </div>

          <a href="/login" className="btn btn-dark-outline">
            Ir al acceso
          </a>
        </div>

        <div className="saas-business-carousel">
          {negocios.map((n) => {
            const logo = getAssetUrl(n.logoUrl);
            const landingUrl = n.slug ? `/negocio/${n.slug}` : "/login";

            return (
              <article className="saas-business-card" key={n.idNegocio}>
                <div
                  className="saas-business-cover"
                  style={{
                    backgroundImage: logo
                      ? `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.55)), url(${logo})`
                      : "linear-gradient(135deg, #111, #2a2413)",
                  }}
                >
                  <span>LIVE</span>
                </div>

                <div className="saas-business-body">
                  <div className="saas-business-top">
                    <small>⭐ Landing activa</small>
                    <b>{n.whatsappNegocio ? "WhatsApp listo" : "Configurable"}</b>
                  </div>

                  <h3>{n.nombre}</h3>

                  <p>{n.direccion || n.descripcion || "Negocio conectado a Barber.pe"}</p>

                  <div className="saas-tags">
                    <span>Reservas</span>
                    <span>Servicios</span>
                    <span>Trabajadores</span>
                  </div>

                  <a className="saas-card-link" href={landingUrl}>
                    Visitar landing pública →
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="plataforma" className="saas-section saas-tech">
        <div className="saas-section-center">
          <span className="saas-eyebrow">Arquitectura SaaS</span>
          <h2>Diseñado para operar, medir y escalar barberías</h2>
          <p>
            No es solo una web de reservas. Es un sistema operativo comercial
            para administrar equipos, controlar comisiones y convertir cada
            trabajador en un perfil vendible.
          </p>
        </div>

        <div className="saas-feature-grid">
          <div className="saas-feature-card">
            <div className="saas-icon">📊</div>
            <h3>Dashboard financiero</h3>
            <p>
              Ventas, gastos, pagos parciales, comisiones pendientes y lectura
              operativa diaria para tomar mejores decisiones.
            </p>
            <ul>
              <li>Resumen financiero por negocio</li>
              <li>Comisiones por trabajador</li>
              <li>Historial de pagos</li>
            </ul>
          </div>

          <div className="saas-feature-card">
            <div className="saas-icon">💈</div>
            <h3>Panel del trabajador</h3>
            <p>
              Cada trabajador puede tener su propio dashboard, disponibilidad,
              reservas, servicios realizados y pagos.
            </p>
            <ul>
              <li>Acceso individual seguro</li>
              <li>Perfil público con portafolio</li>
              <li>Control de disponibilidad</li>
            </ul>
          </div>

          <div className="saas-feature-card">
            <div className="saas-icon">🔐</div>
            <h3>Multi-negocio seguro</h3>
            <p>
              Cada cuenta opera separada por negocio. El sistema valida el
              IdNegocio desde el token y protege datos por rol.
            </p>
            <ul>
              <li>JWT + roles</li>
              <li>Admin por negocio</li>
              <li>SuperAdmin global</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="planes" className="saas-section">
        <div className="saas-section-head">
          <div>
            <span className="saas-eyebrow">Planes por operación</span>
            <h2>Crece por bloques de trabajadores</h2>
            <p>
              Barber.pe se adapta al tamaño real del negocio: desde una barbería
              personal hasta equipos grandes con operación diaria.
            </p>
          </div>
        </div>

        <div className="saas-plans-carousel">
          {planes.map((p) => (
            <div className="saas-plan-card" key={p.titulo}>
              <small>{p.limite}</small>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
              <a href="#demo">Solicitar información →</a>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="saas-cta">
        <div>
          <span className="saas-eyebrow">Demo controlada</span>
          <h2>Activa una prueba para tu barbería</h2>
          <p>
            La demo se crea desde el panel SuperAdmin. Recibirás un usuario
            administrador, contraseña temporal por correo y acceso para cambiarla
            al primer ingreso.
          </p>
        </div>

        <a href="#" onClick={(e) => e.preventDefault()} className="btn btn-gold">
          Solicitar demo
        </a>
      </section>

      <footer className="saas-footer">
        <div>
          <a className="saas-brand" href="/">
            barber<span>.pe</span>
          </a>
          <p>
            Plataforma SaaS para digitalizar barberías, ordenar la gestión
            diaria y potenciar la presencia pública de cada negocio.
          </p>
        </div>

        <div className="saas-footer-links">
          <div>
            <h4>Sistema</h4>
            <a href="/login">Acceso Admin</a>
            <a href="/login">Acceso Trabajador</a>
            <a href="#planes">Planes</a>
          </div>

          <div>
            <h4>Producto</h4>
            <a href="#negocios">Negocios</a>
            <a href="#plataforma">Características</a>
            <a href="#demo">Demo</a>
          </div>
        </div>

        <div className="saas-copy">
          © 2026 Barber.pe — SaaS de gestión para barberías profesionales.
        </div>
      </footer>
    </div>
  );
}