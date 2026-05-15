import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import Toast from "../components/ui/Toast";
import AvatarCircle from "../components/ui/AvatarCircle";
import AnimatedNumber from "../components/ui/AnimatedNumber";

import { getImageUrl } from "../utils/imageUrl";

import {
  CheckCircle2,
  CircleDollarSign,
  Minus,
  Plus,
  ReceiptText,
  Save,
  Scissors,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

const detalleVacio = {
  idServicio: "",
  idTrabajador: "",
  cantidad: 1,
  precioReferencial: 0,
};

const Modal = ({ abierto, titulo, children, onClose, ancho = "980px" }) => {
  if (!abierto) return null;

  return (
    <div className="venta-modal-backdrop">
      <div className="venta-modal" style={{ maxWidth: ancho }}>
        <div className="venta-modal-header">
          <h4>{titulo}</h4>

          <button type="button" className="venta-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="venta-modal-body">{children}</div>
      </div>
    </div>
  );
};

function RegistrarVenta() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [ventasDia, setVentasDia] = useState([]);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("success");

  const [guardando, setGuardando] = useState(false);
  const [loading, setLoading] = useState(true);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [detalleTemporal, setDetalleTemporal] = useState({ ...detalleVacio });

  const [venta, setVenta] = useState({
    detalles: [],
  });

  const obtenerFechaHoy = () => {
    const hoy = new Date();

    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(hoy.getDate()).padStart(2, "0")}`;
  };

  const leerJsonSeguro = async (res, valorDefecto) => {
    try {
      if (!res || !res.ok) return valorDefecto;
      return await res.json();
    } catch {
      return valorDefecto;
    }
  };

  const cargarVentasDia = async () => {
    try {
      const res = await authFetch(`${API_BASE}/Ventas/completas`);
      const data = await leerJsonSeguro(res, []);

      if (!res || !res.ok || !Array.isArray(data)) {
        setVentasDia([]);
        return;
      }

      const hoy = obtenerFechaHoy();

      const ventasHoy = data.filter((v) => {
        const fecha = v.fechaVenta ? String(v.fechaVenta).substring(0, 10) : "";
        return fecha === hoy;
      });

      setVentasDia(ventasHoy);
    } catch (err) {
      console.error(err);
      setVentasDia([]);
    }
  };

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError("");

        const [resTrabajadores, resServicios] = await Promise.all([
          authFetch(`${API_BASE}/Trabajadores`),
          authFetch(`${API_BASE}/Servicios`),
        ]);

        if (!resTrabajadores || !resServicios) return;

        const [dataTrabajadores, dataServicios] = await Promise.all([
          resTrabajadores.json().catch(() => []),
          resServicios.json().catch(() => []),
        ]);

        if (!resTrabajadores.ok) {
          setTipoMensaje("error");
          setError(dataTrabajadores?.mensaje || "No se pudieron cargar los trabajadores.");
          return;
        }

        if (!resServicios.ok) {
          setTipoMensaje("error");
          setError(dataServicios?.mensaje || "No se pudieron cargar los servicios.");
          return;
        }

        const trabajadoresOk = Array.isArray(dataTrabajadores) ? dataTrabajadores : [];
        const serviciosOk = Array.isArray(dataServicios) ? dataServicios : [];

        setTrabajadores(trabajadoresOk);
        setServicios(serviciosOk);

        if (trabajadoresOk.length === 1) {
          setDetalleTemporal((prev) => ({
            ...prev,
            idTrabajador: String(trabajadoresOk[0].idTrabajador),
          }));
        }

        await cargarVentasDia();
      } catch (err) {
        console.error(err);
        setTipoMensaje("error");
        setError("No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalReferencial = useMemo(
    () =>
      venta.detalles.reduce(
        (acc, d) =>
          acc + Number(d.cantidad || 0) * Number(d.precioReferencial || 0),
        0
      ),
    [venta.detalles]
  );

  const serviciosSeleccionados = useMemo(
    () => venta.detalles.filter((d) => d.idServicio).length,
    [venta.detalles]
  );

  const trabajadoresSeleccionados = useMemo(
    () => new Set(venta.detalles.map((d) => d.idTrabajador).filter(Boolean)).size,
    [venta.detalles]
  );

  const totalVentasDia = useMemo(
    () => ventasDia.reduce((acc, v) => acc + Number(v.total || v.subtotal || 0), 0),
    [ventasDia]
  );

  const ventasDiaAgrupadas = useMemo(() => {
    const mapa = new Map();

    ventasDia.forEach((v) => {
      const id = v.idVenta || `${v.fechaVenta}-${v.trabajador}-${v.servicio}`;

      const actual = mapa.get(id) || {
        idVenta: id,
        fechaVenta: v.fechaVenta,
        trabajador: v.trabajador || "Sin trabajador",
        total: 0,
        servicios: [],
      };

      actual.total += Number(v.total || v.subtotal || 0);

      if (v.servicio) {
        actual.servicios.push(v.servicio);
      }

      mapa.set(id, actual);
    });

    return Array.from(mapa.values()).sort(
      (a, b) => new Date(b.fechaVenta) - new Date(a.fechaVenta)
    );
  }, [ventasDia]);

  const obtenerServicio = (idServicio) => {
    return servicios.find((s) => Number(s.idServicio) === Number(idServicio));
  };

  const obtenerTrabajador = (idTrabajador) => {
    return trabajadores.find((t) => Number(t.idTrabajador) === Number(idTrabajador));
  };

  const obtenerImagenServicio = (servicio) => {
    const img = servicio?.imagenUrl || servicio?.ImagenUrl || "";
    return img ? getImageUrl(img) : "";
  };

  const obtenerFotoTrabajador = (trabajador) => {
    const foto =
      trabajador?.fotoPerfilUrl ||
      trabajador?.fotoUrl ||
      trabajador?.imagenUrl ||
      trabajador?.foto ||
      "";

    return foto ? getImageUrl(foto) : "";
  };

  const abrirModalDetalle = () => {
    setError("");
    setMensaje("");

    setDetalleTemporal({
      ...detalleVacio,
      idTrabajador: trabajadores.length === 1 ? String(trabajadores[0].idTrabajador) : "",
    });

    setModalDetalle(true);
  };

  const cerrarModalDetalle = () => {
    setModalDetalle(false);
    setDetalleTemporal({
      ...detalleVacio,
      idTrabajador: trabajadores.length === 1 ? String(trabajadores[0].idTrabajador) : "",
    });
  };

  const seleccionarServicio = (servicio) => {
    setDetalleTemporal((prev) => ({
      ...prev,
      idServicio: String(servicio.idServicio),
      precioReferencial: Number(servicio.precioBase || 0),
    }));
  };

  const seleccionarTrabajador = (trabajador) => {
    setDetalleTemporal((prev) => ({
      ...prev,
      idTrabajador: String(trabajador.idTrabajador),
    }));
  };

  const cambiarCantidadTemporal = (valor) => {
    const cantidad = Math.max(1, Number(valor || 1));

    setDetalleTemporal((prev) => ({
      ...prev,
      cantidad,
    }));
  };

  const sumarCantidad = () => {
    setDetalleTemporal((prev) => ({
      ...prev,
      cantidad: Number(prev.cantidad || 1) + 1,
    }));
  };

  const restarCantidad = () => {
    setDetalleTemporal((prev) => ({
      ...prev,
      cantidad: Math.max(1, Number(prev.cantidad || 1) - 1),
    }));
  };

  const agregarDetalleDesdeModal = () => {
    if (!detalleTemporal.idServicio || !detalleTemporal.idTrabajador) {
      setTipoMensaje("error");
      setError("Selecciona un servicio y quién atendió.");
      return;
    }

    if (Number(detalleTemporal.cantidad || 0) <= 0) {
      setTipoMensaje("error");
      setError("La cantidad debe ser mayor a cero.");
      return;
    }

    const servicio = obtenerServicio(detalleTemporal.idServicio);

    if (!servicio) {
      setTipoMensaje("error");
      setError("El servicio seleccionado ya no está disponible.");
      return;
    }

    const precioSeguro = Number(servicio.precioBase || detalleTemporal.precioReferencial || 0);

    if (precioSeguro <= 0) {
      setTipoMensaje("error");
      setError("El servicio seleccionado no tiene precio válido.");
      return;
    }

    setVenta((prev) => ({
      ...prev,
      detalles: [
        ...prev.detalles,
        {
          idServicio: String(detalleTemporal.idServicio),
          idTrabajador: String(detalleTemporal.idTrabajador),
          cantidad: Number(detalleTemporal.cantidad || 1),
          precioReferencial: precioSeguro,
        },
      ],
    }));

    setTipoMensaje("success");
    setMensaje("Servicio agregado a la venta.");
    cerrarModalDetalle();
  };

  const eliminarDetalle = (index) => {
    setVenta((prev) => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index),
    }));
  };

  const limpiarVenta = () =>
    setVenta({
      detalles: [],
    });

  const guardarVenta = async () => {
    if (guardando) return;

    setMensaje("");
    setError("");

    if (venta.detalles.length === 0) {
      setTipoMensaje("error");
      setError("Agrega al menos un servicio a la venta.");
      return;
    }

    const detalles = venta.detalles.map((d) => ({
      idServicio: Number(d.idServicio),
      idTrabajador: Number(d.idTrabajador),
      cantidad: Number(d.cantidad),
      precioUnitario: Number(d.precioReferencial || 0),
    }));

    const hayErrores = detalles.some(
      (d) =>
        !d.idServicio ||
        !d.idTrabajador ||
        !Number.isFinite(d.cantidad) ||
        d.cantidad <= 0 ||
        !Number.isFinite(d.precioUnitario) ||
        d.precioUnitario <= 0
    );

    if (hayErrores) {
      setTipoMensaje("error");
      setError("Revisa los servicios agregados antes de guardar.");
      return;
    }

    setGuardando(true);

    try {
      const res = await authFetch(`${API_BASE}/Ventas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detalles }),
      });

      if (!res) return;

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "No se pudo guardar la venta.");
        return;
      }

      const totalFinal = Number(data.total || totalReferencial || 0);

      setTipoMensaje("success");
      setMensaje(`Venta guardada correctamente. Total: S/ ${totalFinal.toFixed(2)}`);

      limpiarVenta();
      await cargarVentasDia();
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("No se pudo guardar la venta.");
    } finally {
      setGuardando(false);
    }
  };

  const servicioTemporal = obtenerServicio(detalleTemporal.idServicio);
  const trabajadorTemporal = obtenerTrabajador(detalleTemporal.idTrabajador);
  const totalTemporal =
    Number(detalleTemporal.cantidad || 0) * Number(detalleTemporal.precioReferencial || 0);

  return (
    <div className="page-shell venta-rapida-page">
      <div className="container-fluid py-4">
        <CardDark className="venta-rapida-header-card">
          <div className="venta-rapida-header-row">
            <div className="venta-rapida-header-copy">
              <PageHeader
                title="Venta rápida"
                subtitle="Registra servicios de clientes que llegaron sin reserva."
              />
            </div>

            <div className="venta-rapida-header-actions">
              <GoldBadge>{venta.detalles.length} servicios</GoldBadge>
              <GoldBadge>S/ {totalReferencial.toFixed(2)}</GoldBadge>

              <button
                type="button"
                className="btn btn-gold venta-mobile-add-btn"
                onClick={abrirModalDetalle}
                disabled={guardando || loading}
              >
                <Plus size={16} />
                Agregar servicio
              </button>
            </div>
          </div>
        </CardDark>

        <div className="venta-rapida-layout">
          <CardDark className="venta-rapida-main-card">
            <div className="venta-rapida-section-head">
              <div>
                <h4 className="section-title">Servicios de la venta</h4>
                <p className="section-subtitle">
                  Agrega lo que se realizó y quién atendió.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-gold venta-desktop-add-btn"
                onClick={abrirModalDetalle}
                disabled={guardando || loading}
              >
                <Plus size={16} />
                Agregar servicio
              </button>
            </div>

            {loading ? (
              <div className="venta-rapida-empty small">
                <Scissors size={34} />
                <p>Cargando servicios y trabajadores...</p>
              </div>
            ) : venta.detalles.length > 0 ? (
              <div className="venta-rapida-items">
                {venta.detalles.map((d, i) => {
                  const servicio = obtenerServicio(d.idServicio);
                  const trabajador = obtenerTrabajador(d.idTrabajador);
                  const imgServicio = obtenerImagenServicio(servicio);
                  const subtotal =
                    Number(d.cantidad || 0) * Number(d.precioReferencial || 0);

                  return (
                    <article
                      key={`${d.idServicio}-${d.idTrabajador}-${i}`}
                      className="venta-rapida-item"
                    >
                      <div className="venta-rapida-item-img">
                        {imgServicio ? (
                          <img src={imgServicio} alt={servicio?.nombre || "Servicio"} />
                        ) : (
                          <Scissors size={28} />
                        )}
                      </div>

                      <div className="venta-rapida-item-info">
                        <h5>{servicio?.nombre || "Servicio"}</h5>
                        <p>{trabajador?.nombre || "Sin trabajador"}</p>

                        <div className="venta-rapida-item-tags">
                          <span>Cant. {d.cantidad}</span>
                          <span>S/ {Number(d.precioReferencial || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="venta-rapida-item-right">
                        <b>S/ {subtotal.toFixed(2)}</b>

                        <button
                          type="button"
                          className="btn-action-danger"
                          onClick={() => eliminarDetalle(i)}
                          disabled={guardando}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="venta-hoy-panel">
                <div className="venta-hoy-head">
                  <div>
                    <h5>Ventas rápidas de hoy</h5>
                    <p>Servicios registrados hoy sin usar reserva.</p>
                  </div>

                  <GoldBadge>S/ {totalVentasDia.toFixed(2)}</GoldBadge>
                </div>

                {ventasDiaAgrupadas.length > 0 ? (
                  <div className="venta-hoy-grid">
                    {ventasDiaAgrupadas.map((v) => (
                      <article className="venta-hoy-card" key={v.idVenta}>
                        <div className="venta-hoy-icon">
                          <ReceiptText size={22} />
                        </div>

                        <div className="venta-hoy-info">
                          <span>Venta #{v.idVenta}</span>
                          <h6>{v.trabajador}</h6>
                          <p>
                            {v.servicios.length > 0
                              ? v.servicios.slice(0, 2).join(", ")
                              : "Servicios registrados"}
                          </p>
                        </div>

                        <b>S/ {Number(v.total || 0).toFixed(2)}</b>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="venta-hoy-empty">
                    <ReceiptText size={32} />
                    <h5>No hay ventas rápidas hoy</h5>
                    <p>Cuando guardes una venta, aparecerá aquí durante el día.</p>
                  </div>
                )}
              </div>
            )}
          </CardDark>

          <aside className="venta-rapida-side">
            <CardDark className="venta-rapida-total-card">
              <div className="venta-rapida-total-icon">
                <CircleDollarSign size={30} />
              </div>

              <span>Total de venta</span>

              <h2>
                <AnimatedNumber value={totalReferencial} prefix="S/ " decimals={2} />
              </h2>

              <p>Guarda la venta cuando termines de agregar los servicios.</p>

              <button
                type="button"
                className="btn btn-gold w-100"
                onClick={guardarVenta}
                disabled={
                  guardando ||
                  loading ||
                  venta.detalles.length === 0 ||
                  totalReferencial <= 0
                }
              >
                <Save size={16} />
                {guardando ? "Guardando..." : "Guardar venta"}
              </button>

              {venta.detalles.length > 0 && (
                <button
                  type="button"
                  className="btn btn-dark-outline w-100 mt-2"
                  onClick={limpiarVenta}
                  disabled={guardando}
                >
                  Limpiar venta
                </button>
              )}
            </CardDark>

            <div className="venta-rapida-mini-grid">
              <CardDark className="venta-rapida-mini-card">
                <Scissors size={22} />
                <span>Servicios</span>
                <b>{serviciosSeleccionados}</b>
              </CardDark>

              <CardDark className="venta-rapida-mini-card">
                <UserRound size={22} />
                <span>Atendieron</span>
                <b>{trabajadoresSeleccionados}</b>
              </CardDark>

              <CardDark className="venta-rapida-mini-card">
                <ReceiptText size={22} />
                <span>Hoy</span>
                <b>{ventasDiaAgrupadas.length}</b>
              </CardDark>
            </div>
          </aside>
        </div>

        <Modal abierto={modalDetalle} titulo="Agregar servicio" onClose={cerrarModalDetalle}>
          <div className="venta-modal-layout">
            <div className="venta-modal-main">
              <div className="venta-modal-block">
                <div className="venta-modal-block-head">
                  <div>
                    <h5>Elige el servicio</h5>
                    <p>Selecciona lo que se realizó al cliente.</p>
                  </div>

                  <GoldBadge>{servicios.length} disponibles</GoldBadge>
                </div>

                <div className="venta-servicios-grid">
                  {servicios.map((s) => {
                    const selected =
                      Number(detalleTemporal.idServicio) === Number(s.idServicio);
                    const img = obtenerImagenServicio(s);

                    return (
                      <button
                        key={s.idServicio}
                        type="button"
                        className={`venta-servicio-card ${selected ? "selected" : ""}`}
                        onClick={() => seleccionarServicio(s)}
                      >
                        <div className="venta-servicio-img">
                          {img ? <img src={img} alt={s.nombre} /> : <Scissors size={34} />}

                          {s.destacado && <span>Destacado</span>}
                        </div>

                        <div className="venta-servicio-info">
                          <h6 title={s.nombre}>{s.nombre}</h6>

                          <div>
                            <b>S/ {Number(s.precioBase || 0).toFixed(2)}</b>
                            {s.duracionMinutos && <small>{s.duracionMinutos} min</small>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="venta-modal-block">
                <div className="venta-modal-block-head">
                  <div>
                    <h5>¿Quién atendió?</h5>
                    <p>Puede ser un trabajador o el mismo dueño.</p>
                  </div>

                  <GoldBadge>{trabajadores.length} personas</GoldBadge>
                </div>

                <div className="venta-trabajadores-grid">
                  {trabajadores.map((t) => {
                    const selected =
                      Number(detalleTemporal.idTrabajador) === Number(t.idTrabajador);
                    const foto = obtenerFotoTrabajador(t);

                    return (
                      <button
                        key={t.idTrabajador}
                        type="button"
                        className={`venta-trabajador-card ${selected ? "selected" : ""}`}
                        onClick={() => seleccionarTrabajador(t)}
                      >
                        <AvatarCircle
                          src={foto}
                          alt={t.nombre}
                          fallback={t.nombre?.charAt(0)?.toUpperCase() || "T"}
                          selected={selected}
                          size="md"
                        />

                        <h6>{t.nombre}</h6>
                        <span>{selected ? "Seleccionado" : "Elegir"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="venta-modal-resumen">
              <CardDark className="venta-modal-resumen-card">
                <h5>Resumen</h5>

                <div className="venta-modal-selected">
                  <span>Servicio</span>
                  <b>{servicioTemporal?.nombre || "Sin seleccionar"}</b>
                </div>

                <div className="venta-modal-selected">
                  <span>Atendió</span>
                  <b>{trabajadorTemporal?.nombre || "Sin seleccionar"}</b>
                </div>

                <div className="venta-cantidad-control">
                  <span>Cantidad</span>

                  <div>
                    <button type="button" onClick={restarCantidad}>
                      <Minus size={14} />
                    </button>

                    <input
                      type="number"
                      min="1"
                      value={detalleTemporal.cantidad}
                      onChange={(e) => cambiarCantidadTemporal(e.target.value)}
                    />

                    <button type="button" onClick={sumarCantidad}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="venta-modal-total">
                  <span>Total</span>
                  <b>S/ {totalTemporal.toFixed(2)}</b>
                </div>

                <button
                  type="button"
                  className="btn btn-gold w-100"
                  onClick={agregarDetalleDesdeModal}
                >
                  <CheckCircle2 size={16} />
                  Agregar a la venta
                </button>

                <button
                  type="button"
                  className="btn btn-dark-outline w-100 mt-2"
                  onClick={cerrarModalDetalle}
                >
                  Cancelar
                </button>
              </CardDark>
            </div>
          </div>
        </Modal>
      </div>

      <Toast
        mensaje={mensaje || error}
        tipo={error ? "error" : tipoMensaje}
        onClose={() => {
          setMensaje("");
          setError("");
        }}
      />
    </div>
  );
}

export default RegistrarVenta;