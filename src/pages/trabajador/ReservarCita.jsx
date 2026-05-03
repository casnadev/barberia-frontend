import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import API_BASE from "../../services/api";

import CardDark from "../../components/ui/CardDark";
import GoldBadge from "../../components/ui/GoldBadge";

export default function ReservarCita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const idServicioSeleccionado = searchParams.get("servicio");
  const idNegocio = searchParams.get("negocio");

  const [servicios, setServicios] = useState([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [horarios, setHorarios] = useState([]);

  const [negocio, setNegocio] = useState(null);
  const [redesSociales, setRedesSociales] = useState([]);

  const [form, setForm] = useState({
    nombreCliente: "",
    telefonoCliente: "",
    correoCliente: "",
    idServicio: idServicioSeleccionado || "",
    fechaReserva: "",
    horaReserva: "",
  });

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [reservaConfirmada, setReservaConfirmada] = useState(false);
  const [datosReserva, setDatosReserva] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resServicios = await fetch(
          `${API_BASE}/Servicios/publicos-por-trabajador/${id}`
        );

        const dataServicios = await resServicios.json();

        if (!resServicios.ok) {
          setError(dataServicios.mensaje || "No se pudieron cargar los servicios");
          return;
        }

        setServicios(dataServicios || []);

        const servicio = (dataServicios || []).find(
          (s) => Number(s.idServicio) === Number(idServicioSeleccionado)
        );

        if (servicio) {
          setServicioSeleccionado(servicio);
          setForm((prev) => ({
            ...prev,
            idServicio: String(servicio.idServicio),
          }));
        }

        if (idNegocio) {
          const resNegocio = await fetch(`${API_BASE}/Negocios/publico/${idNegocio}`);

          if (resNegocio.ok) {
            const dataNegocio = await resNegocio.json();
            setNegocio(dataNegocio.negocio || null);
            setRedesSociales(dataNegocio.redesSociales || []);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Error de conexión al cargar datos de reserva");
      } finally {
        setLoadingInicial(false);
      }
    };

    cargarDatos();
  }, [id, idServicioSeleccionado, idNegocio]);

  useEffect(() => {
    if (!form.fechaReserva) {
      setHorarios([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingHorarios(true);
        setError("");
        setHorarios([]);

        const res = await fetch(
          `${API_BASE}/Reservas/horarios-disponibles/${id}?fecha=${form.fechaReserva}`
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data.mensaje || "No se pudieron cargar los horarios");
          return;
        }

        setHorarios(data || []);
      } catch (err) {
        console.error(err);
        setError("Error de conexión al cargar horarios");
      } finally {
        setLoadingHorarios(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [form.fechaReserva, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setMensaje("");
    setError("");

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "fechaReserva" ? { horaReserva: "" } : {}),
    }));
  };

  const reservar = async (e) => {
    e.preventDefault();

    setMensaje("");
    setError("");

    const nombreLimpio = form.nombreCliente.trim();
    const telefonoLimpio = form.telefonoCliente.trim();
    const correoLimpio = form.correoCliente.trim();

    if (!nombreLimpio) {
      setError("Ingresa tu nombre.");
      return;
    }

    if (!/^[0-9]{9}$/.test(telefonoLimpio)) {
      setError("Teléfono inválido. Debe tener 9 dígitos.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
      setError("Correo inválido.");
      return;
    }

    if (!form.idServicio) {
      setError("Selecciona un servicio.");
      return;
    }

    if (!form.fechaReserva || !form.horaReserva) {
      setError("Selecciona fecha y hora.");
      return;
    }

    const hoy = new Date();
    const fechaSeleccionada = new Date(form.fechaReserva);

    hoy.setHours(0, 0, 0, 0);
    fechaSeleccionada.setHours(0, 0, 0, 0);

    if (fechaSeleccionada < hoy) {
      setError("No puedes reservar en una fecha pasada.");
      return;
    }

    try {
      setLoading(true);

      const body = {
        idTrabajador: Number(id),
        idServicio: Number(form.idServicio),
        nombreCliente: nombreLimpio,
        telefonoCliente: telefonoLimpio,
        correoCliente: correoLimpio,
        fechaReserva: form.fechaReserva,
        horaReserva: `${form.horaReserva}:00`,
      };

      const res = await fetch(`${API_BASE}/Reservas/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo registrar la reserva");
        return;
      }

      const servicioFinal =
        servicioSeleccionado ||
        servicios.find((s) => Number(s.idServicio) === Number(form.idServicio));

      setDatosReserva({
        servicio: servicioFinal,
        cliente: nombreLimpio,
        telefono: telefonoLimpio,
        correo: correoLimpio,
        fecha: form.fechaReserva,
        hora: form.horaReserva,
        whatsappUrl: data.whatsappUrl,
      });

      setMensaje(data.mensaje || "Reserva registrada correctamente");
      setReservaConfirmada(true);
      setHorarios([]);
    } catch (err) {
      console.error(err);
      setError("Error de conexión al registrar la reserva");
    } finally {
      setLoading(false);
    }
  };

  const iconoRed = (tipo) => {
    switch (tipo) {
      case "facebook":
        return "f";
      case "instagram":
        return "◎";
      case "tiktok":
        return "♪";
      case "youtube":
        return "▶";
      case "whatsapp":
        return "☎";
      default:
        return "🔗";
    }
  };

  const volverInicio = () => {
    if (negocio?.slug) {
      navigate(`/negocio/${negocio.slug}`);
      return;
    }

    navigate(-1);
  };

  const renderFooter = () => (
    <footer className="landing-footer-simple">
      {redesSociales.length > 0 && (
        <div className="footer-social">
          {redesSociales.map((r) => (
            <a
              key={r.idRedSocial}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              aria-label={r.tipo}
            >
              {iconoRed(r.tipo)}
            </a>
          ))}
        </div>
      )}

      <p>
        <strong>{negocio?.nombre || "Negocio"}</strong> | © 2026 Todos los
        derechos reservados
      </p>
    </footer>
  );

  if (loadingInicial) {
    return (
      <div className="page-shell">
        <div className="container py-4">
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: "none",
              color: "#d4af37",
              fontWeight: "700",
              fontSize: "14px",
              marginBottom: "10px",
              cursor: "pointer",
            }}
          >
            ← Volver
          </button>

          <CardDark className="p-4 mb-2">
            <span className="paso-indicador mb-3">Paso 3 de 3</span>
            <h2 className="page-title mb-2">Reservar cita</h2>
            <p className="page-subtitle">Cargando datos de reserva...</p>
          </CardDark>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="container py-4">
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            color: "#d4af37",
            fontWeight: "700",
            fontSize: "14px",
            marginBottom: "10px",
            cursor: "pointer",
          }}
        >
          ← Volver
        </button>

        <CardDark className="p-4 mb-2">
          <span className="paso-indicador mb-3">Paso 3 de 3</span>

          <h2 className="page-title mb-2">Reservar cita</h2>

          <p className="page-subtitle">
            Completa tus datos para recibir la confirmación por correo.
          </p>
        </CardDark>
      </div>

      <div className="container pt-1 pb-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <CardDark className="p-4">
              {reservaConfirmada && datosReserva ? (
                <>
                  <div className="text-center mb-4">
                    <h3 className="section-title mb-2">Reserva registrada</h3>
                    <p className="section-subtitle">
                      Tu cita fue guardada correctamente. Recibirás la
                      confirmación por correo.
                    </p>
                  </div>

                  {mensaje && <div className="alert alert-success">{mensaje}</div>}

                  <div className="mb-3">
                    <GoldBadge>Estado: Pendiente</GoldBadge>
                  </div>

                  <div className="mb-3">
                    <h4 className="section-title mb-2">
                      {datosReserva.servicio?.nombre || "Servicio seleccionado"}
                    </h4>

                    <p className="section-subtitle">
                      {datosReserva.servicio?.descripcionCorta ||
                        "Servicio profesional con atención personalizada."}
                    </p>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Costo</span>
                      <strong style={{ color: "#d4af37" }}>
                        S/ {Number(datosReserva.servicio?.precioBase || 0).toFixed(2)}
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span>Duración</span>
                      <strong>
                        {datosReserva.servicio?.duracionMinutos
                          ? `${datosReserva.servicio.duracionMinutos} min`
                          : "No especificada"}
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span>Cliente</span>
                      <strong>{datosReserva.cliente}</strong>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span>Correo</span>
                      <strong>{datosReserva.correo}</strong>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span>Teléfono</span>
                      <strong>{datosReserva.telefono}</strong>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span>Fecha</span>
                      <strong>{datosReserva.fecha}</strong>
                    </div>

                    <div className="d-flex justify-content-between">
                      <span>Hora</span>
                      <strong>{datosReserva.hora}</strong>
                    </div>
                  </div>

                  {datosReserva?.whatsappUrl && (
                    <a
                      href={datosReserva.whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-dark-outline w-100 mt-3"
                    >
                      Enviar reserva por WhatsApp
                    </a>
                  )}

                  <button
                    className="btn btn-gold w-100 mt-2"
                    onClick={volverInicio}
                  >
                    Volver al inicio
                  </button>
                </>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                    <div>
                      <h4 className="section-title mb-1">Datos de la reserva</h4>
                      <p className="section-subtitle mb-0">
                        Confirma el horario y tus datos personales.
                      </p>
                    </div>

                    <GoldBadge>Reserva online</GoldBadge>
                  </div>

                  {error && <div className="alert alert-danger">{error}</div>}

                  <form onSubmit={reservar}>
                    <div className="mb-3">
                      <label className="form-label" style={{ color: "#d4af37" }}>
                        Servicio seleccionado
                      </label>

                      {servicioSeleccionado ? (
                        <div
                          className="p-3 rounded"
                          style={{ background: "rgba(212,175,55,.08)" }}
                        >
                          <h5 className="mb-2">{servicioSeleccionado.nombre}</h5>

                          <div className="d-flex justify-content-between mb-1">
                            <span>Costo</span>
                            <strong style={{ color: "#d4af37" }}>
                              S/ {Number(servicioSeleccionado.precioBase || 0).toFixed(2)}
                            </strong>
                          </div>

                          <div className="d-flex justify-content-between">
                            <span>Duración</span>
                            <strong>
                              {servicioSeleccionado.duracionMinutos
                                ? `${servicioSeleccionado.duracionMinutos} min`
                                : "No especificada"}
                            </strong>
                          </div>
                        </div>
                      ) : (
                        <select
                          name="idServicio"
                          className="form-control input-dark"
                          value={form.idServicio}
                          onChange={handleChange}
                        >
                          <option value="">Seleccione un servicio</option>

                          {servicios.map((s) => (
                            <option key={s.idServicio} value={s.idServicio}>
                              {s.nombre} - S/ {Number(s.precioBase || 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label" style={{ color: "#d4af37" }}>
                          Nombre
                        </label>

                        <input
                          name="nombreCliente"
                          className="form-control input-dark"
                          value={form.nombreCliente}
                          onChange={handleChange}
                          placeholder="Ejemplo: Carlos Pérez"
                          maxLength={120}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label" style={{ color: "#d4af37" }}>
                          Teléfono / WhatsApp
                        </label>

                        <input
                          name="telefonoCliente"
                          className="form-control input-dark"
                          value={form.telefonoCliente}
                          onChange={handleChange}
                          placeholder="Ejemplo: 987654321"
                          maxLength={9}
                          inputMode="numeric"
                        />
                      </div>

                      <div className="col-md-12">
                        <label className="form-label" style={{ color: "#d4af37" }}>
                          Correo para confirmación
                        </label>

                        <input
                          type="email"
                          name="correoCliente"
                          className="form-control input-dark"
                          value={form.correoCliente}
                          onChange={handleChange}
                          placeholder="ejemplo@correo.com"
                          maxLength={150}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label" style={{ color: "#d4af37" }}>
                          Fecha
                        </label>

                        <input
                          type="date"
                          name="fechaReserva"
                          className="form-control input-dark"
                          value={form.fechaReserva}
                          onChange={handleChange}
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label" style={{ color: "#d4af37" }}>
                          Hora disponible
                        </label>

                        <select
                          name="horaReserva"
                          className="form-control input-dark"
                          value={form.horaReserva}
                          onChange={handleChange}
                          disabled={!form.fechaReserva || loadingHorarios}
                        >
                          <option value="">
                            {!form.fechaReserva
                              ? "Primero selecciona una fecha"
                              : loadingHorarios
                              ? "Cargando horarios..."
                              : horarios.length === 0
                              ? "Sin horarios disponibles"
                              : "Seleccione una hora"}
                          </option>

                          {horarios.map((hora) => (
                            <option key={hora} value={hora}>
                              {hora}
                            </option>
                          ))}
                        </select>

                        {form.fechaReserva && !loadingHorarios && (
                          <small style={{ color: "#6b7280" }}>
                            {horarios.length} horarios disponibles para esta fecha.
                          </small>
                        )}
                      </div>
                    </div>

                    <button
                      className="btn btn-gold w-100 mt-4"
                      disabled={loading || loadingHorarios}
                    >
                      {loading ? "Reservando..." : "Confirmar reserva"}
                    </button>
                  </form>
                </>
              )}
            </CardDark>
          </div>
        </div>
      </div>

      {renderFooter()}
    </div>
  );
}