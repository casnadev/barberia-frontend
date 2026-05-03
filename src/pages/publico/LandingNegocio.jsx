import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API_BASE from "../../services/api";

import CardDark from "../../components/ui/CardDark";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation, FreeMode } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/free-mode";

export default function LandingNegocio() {
  const { slug } = useParams();
  const [data, setData] = useState(null);

  const [mostrarModalReserva, setMostrarModalReserva] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);

  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState("");
  const [fechaReserva, setFechaReserva] = useState("");
  const [horaReserva, setHoraReserva] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [correoCliente, setCorreoCliente] = useState("");
  const [comentario, setComentario] = useState("");

  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [reservaConfirmada, setReservaConfirmada] = useState(false);
  const [datosReservaConfirmada, setDatosReservaConfirmada] = useState(null);
  const [guardandoReserva, setGuardandoReserva] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const res = await fetch(`${API_BASE}/Negocios/publico-slug/${slug}`);
      const json = await res.json();
      setData(json);
    };

    cargar();
  }, [slug]);

  useEffect(() => {
    if (!trabajadorSeleccionado || !fechaReserva) {
      setHorariosDisponibles([]);
      setHoraReserva("");
      return;
    }

    const cargarHorarios = async () => {
      try {
        setHoraReserva("");

        const res = await fetch(
          `${API_BASE}/Reservas/horarios-disponibles/${trabajadorSeleccionado}?fecha=${fechaReserva}`
        );

        const data = await res.json();
        setHorariosDisponibles(data || []);
      } catch (error) {
        console.error(error);
      }
    };

    cargarHorarios();
  }, [trabajadorSeleccionado, fechaReserva]);

  if (!data) return null;

  const baseUrl = API_BASE.replace("/api", "");
  const logo = data.negocio.logoUrl ? `${baseUrl}${data.negocio.logoUrl}` : "";
  const imagenesCarrusel = data.imagenes || [];

  const whatsappUrl = `https://wa.me/${data.negocio.whatsappNegocio || ""}`;


  const cerrarModal = () => {
    setMostrarModalReserva(false);
    setServicioSeleccionado(null);
    setTrabajadorSeleccionado("");
    setFechaReserva("");
    setHoraReserva("");
    setNombreCliente("");
    setTelefonoCliente("");
    setCorreoCliente("");
    setComentario("");
    setHorariosDisponibles([]);
    setReservaConfirmada(false);
    setDatosReservaConfirmada(null);
    setGuardandoReserva(false);
  };

  const confirmarReserva = async () => {
    if (
      !servicioSeleccionado ||
      !trabajadorSeleccionado ||
      !fechaReserva ||
      !horaReserva ||
      !nombreCliente.trim() ||
      !telefonoCliente.trim() ||
      !correoCliente.trim()
    ) {
      alert("Completa servicio, trabajador, fecha, hora, nombre, teléfono y correo.");
      return;
    }

    try {
      setGuardandoReserva(true);

      const payload = {
        idTrabajador: Number(trabajadorSeleccionado),
        idServicio: Number(servicioSeleccionado.idServicio),
        nombreCliente: nombreCliente.trim(),
        telefonoCliente: telefonoCliente.trim(),
        correoCliente: correoCliente.trim(),
        fechaReserva: fechaReserva,
        horaReserva: `${horaReserva}:00`,
      };

      const res = await fetch(`${API_BASE}/Reservas/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const respuesta = await res.json();

      if (!res.ok) {
        alert(respuesta.mensaje || "No se pudo registrar la reserva");
        return;
      }

      const trabajador = data.trabajadores.find(
        (t) => Number(t.idTrabajador) === Number(trabajadorSeleccionado)
      );

      setDatosReservaConfirmada({
        servicio: servicioSeleccionado,
        trabajador,
        fecha: fechaReserva,
        hora: horaReserva,
        cliente: nombreCliente.trim(),
        telefono: telefonoCliente.trim(),
        correo: correoCliente.trim(),
        estado: "Pendiente",
        whatsappUrl: respuesta.whatsappUrl,
      });

      setReservaConfirmada(true);
    } catch (error) {
      console.error(error);
      alert("Error de conexión al registrar la reserva");
    } finally {
      setGuardandoReserva(false);
    }
  };

  const obtenerEstado = () => {
    const ahora = new Date();
    const dia = ahora.getDay();
    const hora = ahora.getHours();

    if (dia === 0) return { abierto: false, texto: "Cerrado hoy" };

    if (dia === 6) {
      if (hora >= 10 && hora < 18) {
        return { abierto: true, texto: "Abierto hasta 6:00 PM" };
      }

      return {
        abierto: false,
        texto: "Horario sábado: 10:00 AM - 6:00 PM",
      };
    }

    if (hora >= 9 && hora < 20) {
      return { abierto: true, texto: "Abierto hasta 8:00 PM" };
    }

    return { abierto: false, texto: "Abre mañana 9:00 AM" };
  };

  const estado = obtenerEstado();
  const numeroWhatsApp = data.negocio.whatsappNegocio || data.negocio.telefono;

  const mensajeWhatsAppLanding = encodeURIComponent(
    `Hola, ${data.negocio.nombre}. Estoy interesado en sus servicios. ¿Me podrían brindar más información?`
  );

  return (
    <div className="page-shell landing-public-page">
      <div className="container py-4 landing-main-container">
        <CardDark>
          <div
            className="landing-hero-carousel landing-hero-mobile-full"
            style={{
              position: "relative",
              borderRadius: "22px",
              overflow: "hidden",
              border: "1px solid rgba(212,175,55,0.18)",
            }}
          >
            {imagenesCarrusel.length > 0 ? (
              <Swiper
                modules={[Autoplay, Pagination, Navigation]}
                slidesPerView={1}
                loop={imagenesCarrusel.length > 1}
                autoplay={{
                  delay: 3500,
                  disableOnInteraction: false,
                }}
                pagination={{ clickable: true }}
                navigation={false}
              >
                {imagenesCarrusel.map((img) => (
                  <SwiperSlide key={img.idImagen}>
                    <div className="landing-hero-slide" style={{ background: "#111" }}>
                      <img
                        src={`${baseUrl}${img.urlImagen}`}
                        alt={img.descripcion || data.negocio.nombre}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />

                      {img.descripcion && (
                        <div
                          className="landing-img-description"
                          style={{
                            position: "absolute",
                            left: "30px",
                            bottom: "40px",
                            zIndex: 6,
                            color: "#fff",
                            maxWidth: "600px",
                            background: "rgba(0,0,0,.4)",
                            backdropFilter: "blur(6px)",
                            padding: "10px 16px",
                            borderRadius: "12px",
                          }}
                        >
                          <h4 style={{ fontWeight: 800, marginBottom: "4px" }}>
                            {img.descripcion}
                          </h4>

                          <p
                            style={{
                              margin: 0,
                              color: "#f0cf73",
                              fontWeight: 600,
                              fontSize: "14px",
                            }}
                          >
                            Vive la experiencia en nuestro local
                          </p>
                        </div>
                      )}
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div
                className="landing-hero-slide"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(212,175,55,.25), rgba(0,0,0,.95))",
                }}
              />
            )}

            <div
              className="landing-hero-overlay"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 5,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.72))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "30px",
                pointerEvents: "none",
              }}
            >
              <div className="landing-hero-content" style={{ maxWidth: "760px", pointerEvents: "auto" }}>
                {logo && (
                  <img
                    src={logo}
                    alt="Logo"
                    className="landing-hero-logo"
                    style={{
                      width: "160px",
                      height: "160px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "4px solid #d4af37",
                      boxShadow: "0 15px 35px rgba(0,0,0,.45)",
                      transform: "translateY(-8px)",
                    }}
                  />
                )}

                <h1
                  className="mt-4 landing-hero-title"
                  style={{
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: "clamp(2.8rem,6vw,5.2rem)",
                    letterSpacing: "1px",
                    textShadow: "0 6px 30px rgba(0,0,0,.45)",
                  }}
                >
                  {data.negocio.nombre}
                </h1>

                <p
                  className="landing-hero-address"
                  style={{
                    color: "#f0cf73",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    marginBottom: "10px",
                  }}
                >
                  📍 {data.negocio.direccion}
                </p>

                <div
                  className="mt-4 landing-schedule-box"
                  style={{
                    maxWidth: "640px",
                    margin: "0 auto",
                    background: "rgba(0,0,0,.38)",
                    backdropFilter: "blur(12px)",
                    padding: "22px",
                    borderRadius: "22px",
                    border: "1px solid rgba(212,175,55,.2)",
                  }}
                >
                  <div className="row g-3">
                    <div className="col-md-5">
                      <div
                        className="landing-status-box"
                        style={{
                          background: estado.abierto
                            ? "rgba(16,185,129,.15)"
                            : "rgba(239,68,68,.15)",
                          padding: "18px",
                          borderRadius: "18px",
                          height: "100%",
                        }}
                      >
                        <h5
                          style={{
                            color: estado.abierto ? "#10b981" : "#ff6b6b",
                            fontWeight: 800,
                            marginBottom: "8px",
                          }}
                        >
                          {estado.abierto ? "🟢 Abierto ahora" : "🔴 Cerrado"}
                        </h5>

                        <p style={{ margin: 0, color: "#ddd" }}>{estado.texto}</p>
                      </div>
                    </div>

                    <div className="col-md-7">
                      <div
                        className="landing-hours-box"
                        style={{
                          background: "rgba(255,255,255,.04)",
                          padding: "18px",
                          borderRadius: "18px",
                          height: "100%",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "10px",
                            color: "#fff",
                          }}
                        >
                          <span>Lun - Vie</span>
                          <strong style={{ color: "#d4af37" }}>9:00 AM - 8:00 PM</strong>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "10px",
                            color: "#fff",
                          }}
                        >
                          <span>Sábado</span>
                          <strong style={{ color: "#d4af37" }}>10:00 AM - 6:00 PM</strong>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "#fff",
                          }}
                        >
                          <span>Domingo</span>
                          <strong style={{ color: "#ff7676" }}>Cerrado</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-3 justify-content-center mt-4 flex-wrap landing-hero-buttons">
                  <Link
                    to={`/catalogo-servicios/${data.negocio.idNegocio}`}
                    className="btn btn-gold"
                  >
                    Reservar ahora
                  </Link>

                  <a
                    href={`https://wa.me/${numeroWhatsApp}?text=${mensajeWhatsAppLanding}`}
                    className="btn btn-dark-outline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>

                </div>
              </div>
            </div>
          </div>
        </CardDark>

        <CardDark className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h3 className="section-title mb-1">Nuestros Servicios</h3>
              <p className="section-subtitle mb-0">
                Elige el servicio ideal y reserva con nuestros especialistas.
              </p>
            </div>

            <span
              style={{
                background: "rgba(212,175,55,.12)",
                color: "#d4af37",
                border: "1px solid rgba(212,175,55,.22)",
                borderRadius: "999px",
                padding: "8px 14px",
                fontWeight: 800,
              }}
            >
              {(data.servicios || []).length} servicios
            </span>
          </div>

          <Swiper
            modules={[FreeMode, Pagination, Navigation]}
            spaceBetween={22}
            slidesPerView={1.08}
            freeMode={true}
            navigation={true}
            pagination={{ clickable: true }}
            loop={true}
            breakpoints={{
              576: { slidesPerView: 1.4 },
              768: { slidesPerView: 2.15 },
              1024: { slidesPerView: 3.05 },
            }}
            style={{ paddingBottom: "44px" }}
          >
            {(data.servicios || []).map((s) => {
              const imagenRaw = s.imagenUrl || s.ImagenUrl || "";
              const imagenServicio = imagenRaw ? `${baseUrl}${imagenRaw}` : "";

              return (
                <SwiperSlide key={s.idServicio}>
                  <div
                    className="h-100"
                    style={{
                      position: "relative",
                      borderRadius: "22px",
                      overflow: "hidden",
                      minHeight: "450px",
                      border: s.destacado
                        ? "1px solid rgba(212,175,55,.5)"
                        : "1px solid rgba(255,255,255,.1)",
                      boxShadow: s.destacado
                        ? "0 18px 35px rgba(212,175,55,.12)"
                        : "none",
                      background: "#111",
                    }}
                  >
                    <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
                      {imagenServicio ? (
                        <img
                          src={imagenServicio}
                          alt={s.nombre}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "64px",
                            color: "rgba(212,175,55,.2)",
                          }}
                        >
                          ✂
                        </div>
                      )}

                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 70%, #000 100%)",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        position: "relative",
                        zIndex: 2,
                        padding: "20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        {s.destacado && (
                          <span
                            style={{
                              background: "#d4af37",
                              color: "#111",
                              borderRadius: "999px",
                              padding: "6px 12px",
                              fontWeight: 900,
                              fontSize: ".75rem",
                              display: "inline-block",
                            }}
                          >
                            🔥 DESTACADO
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          background: "rgba(0,0,0,.6)",
                          backdropFilter: "blur(8px)",
                          color: "#f0cf73",
                          borderRadius: "12px",
                          padding: "6px 12px",
                          fontWeight: 900,
                          fontSize: "1.1rem",
                          border: "1px solid rgba(212,175,55,.3)",
                        }}
                      >
                        S/ {Number(s.precioBase || 0).toFixed(2)}
                      </div>
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 3,
                        padding: "25px",
                        textAlign: "center",
                      }}
                    >
                      <h4
                        style={{
                          color: "#fff",
                          fontWeight: 850,
                          fontSize: "1.5rem",
                          marginBottom: "8px",
                          textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                        }}
                      >
                        {s.nombre}
                      </h4>

                      <div className="d-flex gap-2 justify-content-center mb-3">
                        {s.duracionMinutos && (
                          <span
                            style={{
                              background: "rgba(255,255,255,.15)",
                              backdropFilter: "blur(4px)",
                              color: "#fff",
                              borderRadius: "999px",
                              padding: "4px 10px",
                              fontSize: ".8rem",
                              fontWeight: 700,
                            }}
                          >
                            ⏱ {s.duracionMinutos} min
                          </span>
                        )}

                        <span
                          style={{
                            background: "rgba(212,175,55,.25)",
                            backdropFilter: "blur(4px)",
                            color: "#f0cf73",
                            borderRadius: "999px",
                            padding: "4px 10px",
                            fontSize: ".8rem",
                            fontWeight: 700,
                            border: "1px solid rgba(212,175,55,.3)",
                          }}
                        >
                          Reserva online
                        </span>
                      </div>

                      <p
                        style={{
                          color: "#e0e0e0",
                          fontSize: "14px",
                          lineHeight: "1.5",
                          marginBottom: "20px",
                          display: "-webkit-box",
                          WebkitLineClamp: "2",
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          minHeight: "42px",
                        }}
                      >
                        {s.descripcionCorta ||
                          "Servicio profesional con atención personalizada."}
                      </p>

                      <button
                        className="btn btn-gold w-100"
                        style={{
                          borderRadius: "12px",
                          padding: "12px",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                        onClick={() => {
                          setServicioSeleccionado(s);
                          setMostrarModalReserva(true);
                        }}
                      >
                        Quiero este servicio
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </CardDark>

        <CardDark className="mt-4">
          <h3 className="text-center mb-5">Nuestros Especialistas</h3>

          <div className="row g-4">
            {data.trabajadores.map((t) => {
              const fotoTrabajador = t.fotoPerfilUrl ? `${baseUrl}${t.fotoPerfilUrl}` : "";

              return (
                <div key={t.idTrabajador} className="col-md-4">
                  <div
                    className="especialista-card"
                    style={{
                      position: "relative",
                      minHeight: "560px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    {t.destacado && (
                      <div
                        style={{
                          position: "absolute",
                          top: "18px",
                          right: "18px",
                          zIndex: 3,
                        }}
                      >
                        <span
                          style={{
                            background: "rgba(212,175,55,.15)",
                            border: "1px solid rgba(212,175,55,.35)",
                            color: "#d4af37",
                            padding: "8px 14px",
                            borderRadius: "999px",
                            fontWeight: 800,
                            fontSize: ".78rem",
                          }}
                        >
                          🏆 Verificado
                        </span>
                      </div>
                    )}

                    {fotoTrabajador ? (
                      <img src={fotoTrabajador} alt={t.nombre} className="especialista-img" />
                    ) : (
                      <div
                        className="especialista-img"
                        style={{
                          background: "rgba(212,175,55,.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "42px",
                          fontWeight: 800,
                          color: "#d4af37",
                        }}
                      >
                        {t.nombre?.charAt(0)?.toUpperCase() || "T"}
                      </div>
                    )}

                    <h4 className="mb-3">{t.nombre}</h4>

                    <div style={{ color: "#d4af37", fontWeight: 800, marginBottom: "6px" }}>
                      ⭐ 0.0
                    </div>

                    <div style={{ marginBottom: "18px", fontSize: "14px" }}>0 reseñas</div>

                    {t.descripcion && (
                      <p
                        style={{
                          color: "#cfcfcf",
                          fontSize: "14px",
                          lineHeight: "1.7",
                          minHeight: "72px",
                          marginBottom: "20px",
                        }}
                      >
                        ✂ {t.descripcion}
                      </p>
                    )}

                    <div style={{ fontWeight: 700, marginBottom: "28px" }}>
                      {t.totalServicios || 0} servicios realizados
                    </div>

                    <div className="mt-auto w-100">
                      <Link
                        to={`/trabajador-publico/${t.idTrabajador}`}
                        className="btn btn-gold w-100"
                      >
                        Ver perfil
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardDark>
      </div>

      <footer className="landing-footer-simple">
        <div className="footer-social">
          {(data.redesSociales || []).map((r) => (
            <a
              key={r.idRedSocial}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              aria-label={r.tipo}
            >
              {r.tipo === "facebook" && "f"}
              {r.tipo === "instagram" && "◎"}
              {r.tipo === "whatsapp" && "☎"}
              {r.tipo === "tiktok" && "♪"}
              {r.tipo === "youtube" && "▶"}
              {!["facebook", "instagram", "whatsapp", "tiktok", "youtube"].includes(r.tipo) && "🔗"}
            </a>
          ))}
        </div>

        <p>
          <strong>{data.negocio.nombre}</strong> | © 2026 Todos los derechos reservados
        </p>
      </footer>

      <div className="mobile-bottom-actions">
        <Link
          to={`/catalogo-servicios/${data.negocio.idNegocio}`}
          className="mobile-action-btn mobile-action-reserva"
        >
          Reservar
        </Link>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mobile-action-btn mobile-action-whatsapp"
        >
          WhatsApp
        </a>
      </div>

      {mostrarModalReserva && (
        <div className="modal-reserva-overlay">
          <div className="modal-reserva">
            {reservaConfirmada && datosReservaConfirmada ? (
              <>
                <div className="modal-success-header">
                  <h2>Reserva registrada</h2>
                  <p>
                    Tu cita fue guardada correctamente. Recibirás la confirmación por correo.
                  </p>
                </div>

                {datosReservaConfirmada.servicio?.imagenUrl && (
                  <img
                    src={`${baseUrl}${datosReservaConfirmada.servicio.imagenUrl}`}
                    alt={datosReservaConfirmada.servicio.nombre}
                    className="modal-success-img"
                  />
                )}

                <div className="modal-success-card">
                  <h4>{datosReservaConfirmada.servicio?.nombre}</h4>

                  <p>
                    {datosReservaConfirmada.servicio?.descripcionCorta ||
                      "Servicio profesional con atención personalizada."}
                  </p>

                  <div className="modal-info-row">
                    <span>Precio</span>
                    <b>S/ {Number(datosReservaConfirmada.servicio?.precioBase || 0).toFixed(2)}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Duración</span>
                    <b>{datosReservaConfirmada.servicio?.duracionMinutos || "-"} min</b>
                  </div>
                </div>

                <div className="modal-success-worker">
                  {datosReservaConfirmada.trabajador?.fotoPerfilUrl ? (
                    <img
                      src={`${baseUrl}${datosReservaConfirmada.trabajador.fotoPerfilUrl}`}
                      alt={datosReservaConfirmada.trabajador.nombre}
                    />
                  ) : (
                    <div className="modal-worker-placeholder">
                      {datosReservaConfirmada.trabajador?.nombre?.charAt(0)?.toUpperCase() || "T"}
                    </div>
                  )}

                  <div>
                    <p>Te atenderá</p>
                    <h5>{datosReservaConfirmada.trabajador?.nombre}</h5>
                  </div>
                </div>

                <div className="modal-success-details">
                  <div className="modal-info-row">
                    <span>Cliente</span>
                    <b>{datosReservaConfirmada.cliente}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Correo</span>
                    <b>{datosReservaConfirmada.correo}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Teléfono</span>
                    <b>{datosReservaConfirmada.telefono}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Fecha</span>
                    <b>{datosReservaConfirmada.fecha}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Hora</span>
                    <b>{datosReservaConfirmada.hora}</b>
                  </div>

                  <div className="modal-info-row">
                    <span>Estado</span>
                    <b className="text-gold">Pendiente</b>
                  </div>
                </div>

                <p className="modal-success-note">
                  También puedes enviar tu reserva por WhatsApp para una confirmación más rápida.
                </p>

                {datosReservaConfirmada?.whatsappUrl && (
                  <a
                    href={datosReservaConfirmada.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-dark-outline w-100 mb-2"
                  >
                    Confirmación WhatsApp
                  </a>
                )}

                <button className="btn btn-gold w-100" onClick={cerrarModal}>
                  Regresar al inicio
                </button>
              </>

            ) : (
              <>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h3 className="mb-1">Reservar cita</h3>
                    <p className="section-subtitle mb-0">Confirma los datos de tu atención</p>
                  </div>

                  <button className="btn btn-dark-outline btn-sm" onClick={cerrarModal}>
                    ✕
                  </button>
                </div>

                <div
                  className="mb-3"
                  style={{
                    background: "rgba(212,175,55,.08)",
                    border: "1px solid rgba(212,175,55,.18)",
                    borderRadius: "16px",
                    padding: "14px",
                  }}
                >
                  <strong style={{ color: "#d4af37" }}>{servicioSeleccionado?.nombre}</strong>

                  <div className="d-flex justify-content-between mt-2">
                    <span>Precio</span>
                    <b>S/ {Number(servicioSeleccionado?.precioBase || 0).toFixed(2)}</b>
                  </div>

                  {servicioSeleccionado?.duracionMinutos && (
                    <div className="d-flex justify-content-between mt-1">
                      <span>Duración</span>
                      <b>{servicioSeleccionado.duracionMinutos} min</b>
                    </div>
                  )}
                </div>

                <label className="form-label mb-2" style={{ color: "#d4af37" }}>
                  Especialista
                </label>

                <Swiper
                  modules={[FreeMode]}
                  spaceBetween={12}
                  slidesPerView={2.1}
                  freeMode={true}
                  breakpoints={{
                    576: { slidesPerView: 2.5 },
                    768: { slidesPerView: 3.2 },
                    1024: { slidesPerView: 3.5 },
                  }}
                  style={{ paddingBottom: "10px", marginBottom: "14px" }}
                >
                  {(data.trabajadores || []).map((t) => {
                    const fotoTrabajador = t.fotoPerfilUrl
                      ? `${baseUrl}${t.fotoPerfilUrl}`
                      : "";

                    const seleccionado =
                      Number(trabajadorSeleccionado) === Number(t.idTrabajador);

                    return (
                      <SwiperSlide key={t.idTrabajador}>
                        <button
                          type="button"
                          className={`worker-card ${seleccionado ? "selected" : ""}`}
                          onClick={() => {
                            setTrabajadorSeleccionado(String(t.idTrabajador));
                            setFechaReserva("");
                            setHoraReserva("");
                            setHorariosDisponibles([]);
                          }}
                        >
                          {fotoTrabajador ? (
                            <img
                              src={fotoTrabajador}
                              alt={t.nombre}
                              className="worker-photo"
                            />
                          ) : (
                            <div className="worker-photo-placeholder">
                              {t.nombre?.charAt(0)?.toUpperCase() || "T"}
                            </div>
                          )}

                          <div
                            className="worker-name"
                            title={t.nombre}
                          >
                            {t.nombre}
                          </div>

                          <div className="worker-status">
                            {seleccionado ? "Seleccionado" : "Elegir"}
                          </div>
                        </button>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>

                <div className="row g-3">
                  <div className="col-md-6">

                    <label className="form-label" style={{ color: "#d4af37" }}>
                      Fecha
                    </label>

                    <input
                      type="date"
                      className="form-control input-dark mb-3"
                      value={fechaReserva}
                      onChange={(e) => {
                        setFechaReserva(e.target.value);
                        setHoraReserva("");
                      }}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label" style={{ color: "#d4af37" }}>
                      Hora
                    </label>

                    <select
                      className="form-control input-dark mb-3"
                      value={horaReserva}
                      onChange={(e) => setHoraReserva(e.target.value)}
                      disabled={!trabajadorSeleccionado || !fechaReserva}
                    >
                      <option value="">
                        {!trabajadorSeleccionado
                          ? "Primero selecciona especialista"
                          : !fechaReserva
                            ? "Primero selecciona fecha"
                            : horariosDisponibles.length === 0
                              ? "Sin horarios disponibles"
                              : "Seleccionar horario"}
                      </option>

                      {horariosDisponibles.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="form-label" style={{ color: "#d4af37" }}>
                  Tus datos
                </label>

                <input
                  placeholder="Nombre completo"
                  className="form-control input-dark mb-3"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                />

                <input
                  placeholder="Teléfono / WhatsApp"
                  className="form-control input-dark mb-3"
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                />

                <input
                  placeholder="Correo"
                  className="form-control input-dark mb-3"
                  value={correoCliente}
                  onChange={(e) => setCorreoCliente(e.target.value)}
                />

                <textarea
                  placeholder="Comentario adicional opcional"
                  className="form-control input-dark mb-3"
                  rows="3"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-gold w-100"
                    onClick={confirmarReserva}
                    disabled={guardandoReserva}
                  >
                    {guardandoReserva ? "Registrando..." : "Confirmar reserva"}
                  </button>

                  <button
                    className="btn btn-dark-outline w-100"
                    onClick={cerrarModal}
                    disabled={guardandoReserva}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}