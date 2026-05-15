import { useEffect, useMemo, useState, useRef } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  Menu,
  PhoneCall,
  Scissors,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

import API_BASE from "../../services/api";
import { getImageUrl } from "../../utils/imageUrl";

const FALLBACK_NEGOCIOS = [
  {
    idNegocio: 1,
    nombre: "Kisha Barber Spa",
    slug: "kisha-barber-spa",
    logoUrl: "",
    direccion: "Puente Piedra – Zapallal",
    whatsappNegocio: "943811931",
    descripcion: "Reservas online, gestión profesional y perfiles públicos.",
  },
];

const STATS = [
  { value: "3 min", label: "para hacer una reserva" },
  { value: "100%", label: "desde el celular" },
  { value: "0 papel", label: "todo digital" },
  { value: "24/7", label: "disponible siempre" },
];

export default function LandingSaaS() {
  const [negocios, setNegocios] = useState(FALLBACK_NEGOCIOS);
  const [negocioActivo, setNegocioActivo] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);
  const [billingAnual, setBillingAnual] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60);
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
        if (Array.isArray(data) && data.length > 0) setNegocios(data);
      } catch {
        setNegocios(FALLBACK_NEGOCIOS);
      }
    };
    cargarNegocios();
  }, []);

  useEffect(() => {
    if (negocios.length <= 1) return;
    const timer = setInterval(() => {
      setNegocioActivo((a) => (a + 1) % negocios.length);
    }, 5200);
    return () => clearInterval(timer);
  }, [negocios.length]);

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const planes = useMemo(
    () => [
      {
        titulo: "Starter",
        precio_mensual: 49,
        precio_anual: 39,
        limite: "1 trabajador",
        desc: "Para empezar fuerte y digitalizarte desde el día uno.",
        features: [
          "Landing pública personalizada",
          "Reservas online 24/7",
          "Panel de administración",
          "Registro de ventas",
          "Historial de servicios",
        ],
      },
      {
        titulo: "Growth",
        precio_mensual: 89,
        precio_anual: 69,
        limite: "Hasta 5 trabajadores",
        desc: "El plan favorito de las barberías que quieren crecer.",
        features: [
          "Todo lo del Starter",
          "Perfiles públicos por trabajador",
          "Dashboard financiero",
          "Comisiones automáticas",
          "Pagos parciales",
          "Exportar a Excel y PDF",
        ],
        featured: true,
      },
      {
        titulo: "Pro",
        precio_mensual: 149,
        precio_anual: 119,
        limite: "Hasta 10 trabajadores",
        desc: "Control total del negocio con reportes avanzados.",
        features: [
          "Todo lo del Growth",
          "Reportes por período",
          "Ranking de trabajadores",
          "Portafolios con fotos",
          "Gestión de disponibilidad",
          "Soporte prioritario",
        ],
      },
      {
        titulo: "Enterprise",
        precio_mensual: null,
        precio_anual: null,
        limite: "Escalable",
        desc: "Para cadenas o grupos con múltiples locales.",
        features: [
          "Multi-negocio",
          "Panel SuperAdmin",
          "Escalabilidad ilimitada",
          "Soporte dedicado",
          "Configuración a medida",
        ],
      },
    ],
    []
  );

  const modulos = useMemo(
    () => [
      {
        icon: <CalendarCheck size={24} />,
        title: "Reservas online",
        text: "Tu cliente reserva desde el celular en menos de 3 minutos. Sin llamadas, sin confusiones.",
        stat: "24/7 disponible",
      },
      {
        icon: <Users size={24} />,
        title: "Panel por trabajador",
        text: "Cada barbero ve sus reservas, cobros, comisiones y perfil público. Nada se mezcla.",
        stat: "Roles separados",
      },
      {
        icon: <BarChart3 size={24} />,
        title: "Finanzas en tiempo real",
        text: "Ventas, gastos, comisiones y ganancias netas. Ve el dinero del día con un vistazo.",
        stat: "Reportes al instante",
      },
      {
        icon: <TrendingUp size={24} />,
        title: "Historial y reportes",
        text: "Filtra por día, semana, mes o rango personalizado. Exporta a Excel o PDF cuando quieras.",
        stat: "Excel y PDF",
      },
      {
        icon: <Smartphone size={24} />,
        title: "Tu landing propia",
        text: "Una página profesional con tu logo, servicios, trabajadores y botón de WhatsApp. Lista para compartir.",
        stat: "100% tuya",
      },
      {
        icon: <Shield size={24} />,
        title: "Accesos protegidos",
        text: "Admin y trabajador tienen sus propias credenciales. Tú decides quién ve qué.",
        stat: "Seguridad total",
      },
    ],
    []
  );

  const faqs = useMemo(
    () => [
      {
        pregunta: "¿Sirve tanto para barberías como para salones de belleza?",
        respuesta:
          "Sí. Barber.pe está diseñado para cualquier negocio que preste servicios con trabajadores: barberías, peluquerías, salones de belleza, spas y más. Puedes personalizar los servicios, precios y trabajadores a tu medida.",
      },
      {
        pregunta: "¿Cada negocio tiene su propia página pública?",
        respuesta:
          "Exacto. Cada negocio tiene su propia landing con logo, colores, servicios, trabajadores, horarios y contacto directo por WhatsApp. Puedes compartirla en Instagram, Google o como tu sitio web.",
      },
      {
        pregunta: "¿Puedo controlar comisiones y pagos de los trabajadores?",
        respuesta:
          "Sí. El sistema calcula comisiones automáticamente según el porcentaje que asignes a cada trabajador. También puedes registrar pagos parciales, deudas y cerrar cuentas cuando quieras.",
      },
      {
        pregunta: "¿Puedo ver quién generó más ventas o qué servicio se pide más?",
        respuesta:
          "Sí, eso es parte del dashboard. Puedes ver ranking de trabajadores por ventas, los servicios más solicitados, y exportar esos datos a Excel o PDF para tener tu historial completo.",
      },
      {
        pregunta: "¿Funciona bien en el celular?",
        respuesta:
          "Todo está optimizado para celular: el panel del admin, el portal del trabajador y la landing pública. Funciona en Android e iOS sin instalar ninguna app.",
      },
      {
        pregunta: "¿Cuánto tiempo toma configurar mi negocio?",
        respuesta:
          "En menos de un día tienes todo listo: logo, servicios, trabajadores y tu landing publicada. Te acompañamos en el proceso con una demo personalizada.",
      },
    ],
    []
  );

  const negocioActual = negocios[negocioActivo] || FALLBACK_NEGOCIOS[0];
  const logoActual = getImageUrl(negocioActual?.logoUrl);

  const cerrarMenu = () => setMenuOpen(false);
  const irLogin = () => { window.location.href = "/login"; };
  const irDemoWhatsapp = () => {
    window.open("https://wa.me/51943811931?text=Hola,%20quiero%20una%20demo%20de%20Barber.pe", "_blank");
  };
  const scrollToSection = (id) => {
    cerrarMenu();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="lp-root">
      {/* ── NAV ── */}
      <nav className={`lp-nav ${isScrolled ? "lp-nav--scrolled" : ""}`}>
        <div className="lp-nav__inner">
          <a className="lp-logo" href="/">barber<span>.pe</span></a>

          <div className="lp-nav__links">
            <button type="button" onClick={() => scrollToSection("funciones")}>Funciones</button>
            <button type="button" onClick={() => scrollToSection("negocios")}>Negocios</button>
            <button type="button" onClick={() => scrollToSection("planes")}>Planes</button>
            <button type="button" onClick={() => scrollToSection("faq")}>FAQ</button>
            <a href="/login" className="lp-nav__login">Acceso</a>
            <button type="button" className="lp-btn lp-btn--gold lp-btn--sm" onClick={irDemoWhatsapp}>
              <PhoneCall size={15} /> Agendar demo
            </button>
          </div>

          <button type="button" className="lp-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        <div className={`lp-mobile-menu ${menuOpen ? "lp-mobile-menu--open" : ""}`}>
          <button type="button" onClick={() => scrollToSection("funciones")}>Funciones</button>
          <button type="button" onClick={() => scrollToSection("negocios")}>Negocios</button>
          <button type="button" onClick={() => scrollToSection("planes")}>Planes</button>
          <button type="button" onClick={() => scrollToSection("faq")}>FAQ</button>
          <a href="/login" onClick={cerrarMenu}>Acceso al sistema</a>
          <button type="button" className="lp-btn lp-btn--gold lp-btn--block" onClick={irDemoWhatsapp}>
            <PhoneCall size={15} /> Agendar demo gratis
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="lp-hero" ref={heroRef}>
        <div className="lp-hero__bg">
          <div className="lp-hero__grain"></div>
          <div className="lp-hero__glow lp-hero__glow--1"></div>
          <div className="lp-hero__glow lp-hero__glow--2"></div>
          <div className="lp-hero__grid-lines"></div>
        </div>

        <div className="lp-hero__inner">
          <div className="lp-hero__text">
            <div className="lp-badge">
              <Sparkles size={13} />
              Software N°1 para barberías en Perú
            </div>

            <h1 className="lp-hero__h1">
              Tu barbería,<br />
              <em className="lp-text-gold">digitalizada</em><br />
              y vendiendo más.
            </h1>

            <p className="lp-hero__sub">
              Reservas online, control de finanzas, comisiones automáticas y una landing profesional para tu negocio — todo en un solo lugar.
            </p>

            <div className="lp-hero__btns">
              <button type="button" className="lp-btn lp-btn--gold lp-btn--lg" onClick={irDemoWhatsapp}>
                Agendar demo gratis <ArrowRight size={18} />
              </button>
              <button type="button" className="lp-btn lp-btn--ghost lp-btn--lg" onClick={() => scrollToSection("planes")}>
                Ver planes
              </button>
            </div>

            <div className="lp-hero__pills">
              <span>✓ Sin tarjeta de crédito</span>
              <span>✓ Setup en 1 día</span>
              <span>✓ Soporte por WhatsApp</span>
            </div>
          </div>

          <div className="lp-hero__mockup">
            <div className="lp-mockup">
              <div className="lp-mockup__topbar">
                <div className="lp-mockup__dots">
                  <span></span><span></span><span></span>
                </div>
                <div className="lp-mockup__url">barber.pe/{negocioActual?.slug || "mi-barberia"}</div>
              </div>

              <div className="lp-mockup__screen">
                {/* Header negocio */}
                <div className="lp-mock-header">
                  <div className="lp-mock-logo">
                    {logoActual
                      ? <img src={logoActual} alt={negocioActual?.nombre} />
                      : <Scissors size={28} />}
                  </div>
                  <div>
                    <div className="lp-mock-name">{negocioActual?.nombre || "Barbería Premium"}</div>
                    <div className="lp-mock-addr">{negocioActual?.direccion || "Lima, Perú"}</div>
                  </div>
                  <div className="lp-mock-live">● EN VIVO</div>
                </div>

                {/* Stats row */}
                <div className="lp-mock-stats">
                  <div className="lp-mock-stat">
                    <strong>S/ 1,240</strong>
                    <span>Hoy</span>
                  </div>
                  <div className="lp-mock-stat lp-mock-stat--gold">
                    <strong>18</strong>
                    <span>Reservas</span>
                  </div>
                  <div className="lp-mock-stat">
                    <strong>4</strong>
                    <span>Barberos</span>
                  </div>
                </div>

                {/* Mini chart */}
                <div className="lp-mock-chart">
                  <div className="lp-mock-chart__label">Ventas esta semana</div>
                  <div className="lp-mock-bars">
                    {[55, 78, 45, 92, 68, 100, 82].map((h, i) => (
                      <div key={i} className="lp-mock-bar-wrap">
                        <div className="lp-mock-bar" style={{ height: `${h}%` }}></div>
                        <span>{["L","M","X","J","V","S","D"][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next reservations */}
                <div className="lp-mock-reservas">
                  <div className="lp-mock-section-title">Próximas reservas</div>
                  {["Carlos M. · Corte + Barba · 10:00", "Andrés P. · Degradado · 10:30", "Luis T. · Barba completa · 11:00"].map((r, i) => (
                    <div key={i} className="lp-mock-reserva">
                      <div className="lp-mock-avatar">{r[0]}</div>
                      <span>{r}</span>
                      <div className="lp-mock-tag">Confirmado</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="lp-float lp-float--1">
              <Zap size={14} />
              <span>Reserva confirmada</span>
            </div>
            <div className="lp-float lp-float--2">
              <DollarSign size={14} />
              <span>+S/340 hoy</span>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="lp-stats-bar">
          {STATS.map((s, i) => (
            <div key={i} className="lp-stats-bar__item">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── ECOSISTEMA ── */}
      <section className="lp-section lp-section--dark" id="ecosistema">
        <div className="lp-container">
          <div className="lp-section__header reveal">
            <span className="lp-eyebrow">EL ECOSISTEMA</span>
            <h2>Un sistema, tres portales,<br /><em className="lp-text-gold">todo conectado.</em></h2>
            <p>Desde que el cliente reserva hasta que cobras la comisión del barbero, Barber.pe lo maneja todo.</p>
          </div>

          <div className="lp-ecosystem">
            <div className="lp-eco-card reveal">
              <div className="lp-eco-card__icon lp-eco-card__icon--blue">
                <Users size={28} />
              </div>
              <h3>Landing del negocio</h3>
              <p>Tu cliente ve servicios, precios, trabajadores y puede reservar directo. Sin intermediarios.</p>
              <ul>
                <li>Logo y colores propios</li>
                <li>Galería de fotos</li>
                <li>Botón WhatsApp integrado</li>
                <li>Listo para Google</li>
              </ul>
              <div className="lp-eco-card__badge">Para el cliente</div>
            </div>

            <div className="lp-eco-card lp-eco-card--featured reveal">
              <div className="lp-eco-card__icon lp-eco-card__icon--gold">
                <BarChart3 size={28} />
              </div>
              <h3>Panel administrativo</h3>
              <p>Ve ganancias, gastos, comisiones y reservas en tiempo real. Exporta lo que necesites.</p>
              <ul>
                <li>Dashboard financiero diario</li>
                <li>Historial por semana/mes</li>
                <li>Ranking de trabajadores</li>
                <li>Exportar Excel y PDF</li>
              </ul>
              <div className="lp-eco-card__badge lp-eco-card__badge--gold">Para el dueño</div>
            </div>

            <div className="lp-eco-card reveal">
              <div className="lp-eco-card__icon lp-eco-card__icon--green">
                <Scissors size={28} />
              </div>
              <h3>Portal del barbero</h3>
              <p>Cada trabajador tiene su propio espacio para ver reservas, generar ventas y ver sus comisiones.</p>
              <ul>
                <li>Ver reservas asignadas</li>
                <li>Registrar servicios</li>
                <li>Cobros y pagos propios</li>
                <li>Perfil público propio</li>
              </ul>
              <div className="lp-eco-card__badge">Para el barbero</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FUNCIONES ── */}
      <section className="lp-section" id="funciones">
        <div className="lp-container">
          <div className="lp-section__header reveal">
            <span className="lp-eyebrow">FUNCIONES</span>
            <h2>Todo lo que tu negocio<br /><em className="lp-text-gold">necesita para crecer.</em></h2>
            <p>No es solo una agenda. Es el sistema operativo de tu barbería.</p>
          </div>

          <div className="lp-modules">
            {modulos.map((m, i) => (
              <div key={i} className="lp-module reveal">
                <div className="lp-module__icon">{m.icon}</div>
                <div className="lp-module__body">
                  <div className="lp-module__header-row">
                    <h3>{m.title}</h3>
                    <span className="lp-module__stat">{m.stat}</span>
                  </div>
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEGOCIOS REALES ── */}
      <section className="lp-section lp-section--dark" id="negocios">
        <div className="lp-container">
          <div className="lp-section__header reveal">
            <span className="lp-eyebrow">YA EN USO</span>
            <h2>Negocios reales<br /><em className="lp-text-gold">que ya confían en nosotros.</em></h2>
            <p>Estas barberías y salones ya tienen su landing y gestionan su negocio con Barber.pe.</p>
          </div>

          <div className="lp-negocios">
            {negocios.slice(0, 3).map((neg) => {
              const logo = getImageUrl(neg.logoUrl);
              return (
                <a key={neg.idNegocio} href={`/negocio/${neg.slug}`} className="lp-negocio-card reveal">
                  <div className="lp-negocio-card__cover">
                    {logo
                      ? <img src={logo} alt={neg.nombre} />
                      : <Scissors size={36} className="lp-icon-gold" />}
                  </div>
                  <div className="lp-negocio-card__body">
                    <h3>{neg.nombre}</h3>
                    <p>{neg.direccion || "Lima, Perú"}</p>
                    <div className="lp-negocio-card__stars">
                      {[1,2,3,4,5].map(s => <Star key={s} size={13} fill="currentColor" />)}
                      <span>Activo en Barber.pe</span>
                    </div>
                  </div>
                  <div className="lp-negocio-card__arrow">
                    Ver landing <ArrowRight size={15} />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PLANES ── */}
      <section className="lp-section" id="planes">
        <div className="lp-container">
          <div className="lp-section__header reveal">
            <span className="lp-eyebrow">PLANES Y PRECIOS</span>
            <h2>Elige el plan que<br /><em className="lp-text-gold">se ajusta a ti.</em></h2>
            <p>Sin contratos. Sin sorpresas. Cancela cuando quieras.</p>
          </div>

          <div className="lp-billing-toggle reveal">
            <span className={!billingAnual ? "lp-billing-toggle__active" : ""}>Mensual</span>
            <button
              type="button"
              className={`lp-toggle ${billingAnual ? "lp-toggle--on" : ""}`}
              onClick={() => setBillingAnual(!billingAnual)}
              aria-label="Toggle facturación anual"
            >
              <span></span>
            </button>
            <span className={billingAnual ? "lp-billing-toggle__active" : ""}>
              Anual <em className="lp-save-badge">-20%</em>
            </span>
          </div>

          <div className="lp-planes">
            {planes.map((plan, i) => (
              <div key={i} className={`lp-plan ${plan.featured ? "lp-plan--featured" : ""}`}>
                {plan.featured && <div className="lp-plan__pop">⭐ Más popular</div>}
                <h3>{plan.titulo}</h3>
                <p className="lp-plan__desc">{plan.desc}</p>

                <div className="lp-plan__price">
                  {plan.precio_mensual ? (
                    <>
                      <span className="lp-plan__currency">S/</span>
                      <span className="lp-plan__amount">
                        {billingAnual ? plan.precio_anual : plan.precio_mensual}
                      </span>
                      <span className="lp-plan__period">/mes</span>
                    </>
                  ) : (
                    <span className="lp-plan__custom">A consultar</span>
                  )}
                </div>

                {plan.precio_mensual && billingAnual && (
                  <div className="lp-plan__saving">
                    Ahorras S/ {(plan.precio_mensual - plan.precio_anual) * 12} al año
                  </div>
                )}

                <div className="lp-plan__limit">
                  <Clock size={13} /> {plan.limite}
                </div>

                <ul className="lp-plan__features">
                  {plan.features.map((f, j) => (
                    <li key={j}><CheckCircle2 size={15} /> {f}</li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`lp-btn lp-btn--block ${plan.featured ? "lp-btn--gold" : "lp-btn--outline"}`}
                  onClick={irDemoWhatsapp}
                >
                  {plan.precio_mensual ? "Empezar ahora" : "Hablar con ventas"}
                  <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>

          <p className="lp-planes__note reveal">
            Todos los planes incluyen onboarding gratuito y soporte por WhatsApp. ¿Dudas? <button type="button" onClick={irDemoWhatsapp} className="lp-link">Escríbenos.</button>
          </p>
        </div>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section className="lp-section lp-section--dark lp-section--testimonios">
        <div className="lp-container">
          <div className="lp-section__header reveal">
            <span className="lp-eyebrow">TESTIMONIOS</span>
            <h2>Lo que dicen<br /><em className="lp-text-gold">los dueños.</em></h2>
          </div>

          <div className="lp-testimonios">
            {[
              {
                texto: "Antes perdía reservas por WhatsApp. Ahora mis clientes reservan solos y yo veo todo desde mi celular.",
                nombre: "Kisha Barbería",
                rol: "Barbería — Puente Piedra",
              },
              {
                texto: "El panel de finanzas me ahorra horas. Sé exactamente cuánto ganó cada barbero sin hacer cuentas a mano.",
                nombre: "Dueño de salón",
                rol: "Salón — San Martín de Porres",
              },
              {
                texto: "Mi landing se ve más profesional que la de muchos negocios grandes. Mis clientes la comparten en WhatsApp.",
                nombre: "Barbería premium",
                rol: "Barbería — Miraflores",
              },
            ].map((t, i) => (
              <div key={i} className="lp-testimonio reveal">
                <div className="lp-testimonio__stars">
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="currentColor" />)}
                </div>
                <p>"{t.texto}"</p>
                <div className="lp-testimonio__autor">
                  <div className="lp-testimonio__avatar">
                    <Scissors size={18} />
                  </div>
                  <div>
                    <strong>{t.nombre}</strong>
                    <span>{t.rol}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-section" id="faq">
        <div className="lp-container lp-container--narrow">
          <div className="lp-section__header reveal">
            <span className="lp-eyebrow">PREGUNTAS FRECUENTES</span>
            <h2>¿Tienes dudas?<br /><em className="lp-text-gold">Aquí las resolvemos.</em></h2>
          </div>

          <div className="lp-faq reveal">
            {faqs.map((f, i) => (
              <div key={i} className={`lp-faq__item ${faqOpen === i ? "lp-faq__item--open" : ""}`}>
                <button
                  type="button"
                  className="lp-faq__q"
                  onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}
                >
                  {f.pregunta}
                  <ChevronDown size={20} className="lp-faq__chevron" />
                </button>
                <div className="lp-faq__a">
                  <p>{f.respuesta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="lp-cta">
        <div className="lp-cta__bg">
          <div className="lp-cta__glow"></div>
          <div className="lp-cta__grid"></div>
        </div>
        <div className="lp-container lp-container--narrow">
          <div className="lp-cta__inner reveal">
            <div className="lp-badge">
              <PhoneCall size={13} /> Demo gratuita en 24 horas
            </div>
            <h2>Digitaliza tu barbería<br /><em className="lp-text-gold">esta semana.</em></h2>
            <p>
              Agenda una demo y ve en vivo cómo funciona Barber.pe con datos reales. Sin compromisos, sin costo.
            </p>
            <div className="lp-cta__btns">
              <button type="button" className="lp-btn lp-btn--gold lp-btn--xl" onClick={irDemoWhatsapp}>
                <PhoneCall size={18} /> Hablar por WhatsApp
              </button>
              <button type="button" className="lp-btn lp-btn--ghost lp-btn--xl" onClick={irLogin}>
                Ya tengo cuenta
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer__top">
            <div className="lp-footer__brand">
              <a className="lp-logo" href="/">barber<span>.pe</span></a>
              <p>Software de gestión para barberías y salones de belleza en Perú.</p>
            </div>
            <div className="lp-footer__links">
              <div className="lp-footer__col">
                <strong>Producto</strong>
                <button type="button" onClick={() => scrollToSection("funciones")}>Funciones</button>
                <button type="button" onClick={() => scrollToSection("planes")}>Planes</button>
                <button type="button" onClick={() => scrollToSection("negocios")}>Negocios</button>
              </div>
              <div className="lp-footer__col">
                <strong>Soporte</strong>
                <button type="button" onClick={irDemoWhatsapp}>Agendar demo</button>
                <button type="button" onClick={() => scrollToSection("faq")}>Preguntas frecuentes</button>
                <a href="/login">Acceso al sistema</a>
              </div>
            </div>
          </div>
          <div className="lp-footer__bottom">
            <p>© 2026 Barber.pe — Software para barberías y salones de belleza.</p>
            <p>Hecho con ♥ en Perú.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
