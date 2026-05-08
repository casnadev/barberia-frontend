import { useEffect, useMemo, useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

import CardDark from "../../components/ui/CardDark";
import PageHeader from "../../components/ui/PageHeader";
import GoldBadge from "../../components/ui/GoldBadge";
import Toast from "../../components/ui/Toast";
import AnimatedNumber from "../../components/ui/AnimatedNumber";

import { getImageUrl } from "../../utils/imageUrl";

import {
  CheckCircle2,
  Minus,
  Plus,
  ReceiptText,
  Save,
  Scissors,
  Sparkles,
} from "lucide-react";

export default function RegistrarServicio() {
  const [servicios, setServicios] = useState([]);
  const [idServicio, setIdServicio] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoServicios, setCargandoServicios] = useState(true);

  useEffect(() => {
    cargarServicios();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leerJsonSeguro = async (res, valorDefecto) => {
    try {
      if (!res) return valorDefecto;
      return await res.json();
    } catch {
      return valorDefecto;
    }
  };

  const cargarServicios = async () => {
    try {
      setCargandoServicios(true);
      setError("");

      const res = await authFetch(`${API_BASE}/Servicios`);

      if (!res) return;

      const data = await leerJsonSeguro(res, []);

      if (!res.ok) {
        setError(data.mensaje || "No se pudieron cargar los servicios.");
        return;
      }

      setServicios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los servicios.");
    } finally {
      setCargandoServicios(false);
    }
  };

  const servicioSeleccionado = useMemo(() => {
    return servicios.find((x) => Number(x.idServicio) === Number(idServicio));
  }, [servicios, idServicio]);

  const total = useMemo(() => {
    return Number(cantidad || 0) * Number(precio || 0);
  }, [cantidad, precio]);

  const obtenerImagenServicio = (servicio) => {
    const img = servicio?.imagenUrl || servicio?.ImagenUrl || "";
    return img ? getImageUrl(img) : "";
  };

  const seleccionarServicio = (servicio) => {
    setIdServicio(String(servicio.idServicio));
    setPrecio(Number(servicio.precioBase || 0));
    setMensaje("");
    setError("");
  };

  const cambiarCantidad = (valor) => {
    const numero = Math.max(1, Number(valor || 1));
    setCantidad(numero);
  };

  const restarCantidad = () => {
    setCantidad((prev) => Math.max(1, Number(prev || 1) - 1));
  };

  const sumarCantidad = () => {
    setCantidad((prev) => Number(prev || 1) + 1);
  };

  const limpiarFormulario = () => {
    setCantidad(1);
    setIdServicio("");
    setPrecio("");
  };

  const guardarServicio = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMensaje("");
    setError("");

    const idServicioNumero = Number(idServicio);
    const cantidadNumero = Number(cantidad);
    const precioNumero = Number(precio);

    if (!idServicioNumero) {
      setError("Selecciona un servicio.");
      setLoading(false);
      return;
    }

    if (!cantidadNumero || cantidadNumero <= 0) {
      setError("La cantidad debe ser mayor a cero.");
      setLoading(false);
      return;
    }

    if (!precioNumero || precioNumero <= 0) {
      setError("El precio debe ser mayor a cero.");
      setLoading(false);
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/Trabajadores/registrar-servicio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          detalles: [
            {
              idServicio: idServicioNumero,
              idTrabajador: 0,
              cantidad: cantidadNumero,
              precioUnitario: precioNumero,
            },
          ],
        }),
      });

      const data = await leerJsonSeguro(res, {});

      if (!res || !res.ok) {
        setError(data.mensaje || "No se pudo registrar el servicio.");
        return;
      }

      setMensaje(data.mensaje || "Servicio registrado correctamente.");
      limpiarFormulario();
    } catch (err) {
      console.error(err);
      setError("No se pudo registrar el servicio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell trab-serv-page">
      <div className="container-fluid py-4">
        <CardDark className="trab-serv-header-card mb-4">
          <div className="trab-serv-header-row">
            <PageHeader
              title="Registrar servicio"
              subtitle="Marca el servicio que acabas de atender para que se registre tu comisión."
            />

            <div className="trab-serv-header-actions">
              <GoldBadge>{servicios.length} servicios</GoldBadge>
              <GoldBadge>S/ {total.toFixed(2)}</GoldBadge>
            </div>
          </div>
        </CardDark>

        <div className="trab-serv-layout">
          <CardDark className="trab-serv-main-card">
            <div className="trab-serv-section-head">
              <div>
                <h4 className="section-title">Elige el servicio realizado</h4>
                <p className="section-subtitle">
                  Selecciona una opción y confirma el registro.
                </p>
              </div>

              {servicioSeleccionado && (
                <GoldBadge>{servicioSeleccionado.nombre}</GoldBadge>
              )}
            </div>

            {cargandoServicios ? (
              <div className="trab-serv-empty">
                <Scissors size={34} />
                <p>Cargando servicios...</p>
              </div>
            ) : servicios.length > 0 ? (
              <div className="trab-serv-carousel">
                {servicios.map((s) => {
                  const selected = Number(idServicio) === Number(s.idServicio);
                  const img = obtenerImagenServicio(s);

                  return (
                    <button
                      key={s.idServicio}
                      type="button"
                      className={`trab-serv-card ${selected ? "selected" : ""}`}
                      onClick={() => seleccionarServicio(s)}
                    >
                      <div className="trab-serv-img">
                        {img ? (
                          <img src={img} alt={s.nombre} />
                        ) : (
                          <Scissors size={34} />
                        )}

                        {selected && (
                          <span>
                            <CheckCircle2 size={14} />
                            Elegido
                          </span>
                        )}
                      </div>

                      <div className="trab-serv-info">
                        <h5 title={s.nombre}>{s.nombre}</h5>
                        <p>{s.descripcionCorta || "Servicio disponible"}</p>

                        <div>
                          <b>S/ {Number(s.precioBase || 0).toFixed(2)}</b>
                          {s.duracionMinutos && <small>{s.duracionMinutos} min</small>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="trab-serv-empty">
                <ReceiptText size={34} />
                <h5>No hay servicios disponibles</h5>
                <p>Cuando el administrador agregue servicios, aparecerán aquí.</p>
              </div>
            )}
          </CardDark>

          <CardDark className="trab-serv-summary-card">
            <div className="trab-serv-summary-icon">
              <Sparkles size={30} />
            </div>

            <span>Servicio seleccionado</span>

            <h3>{servicioSeleccionado?.nombre || "Aún no elegido"}</h3>

            <div className="trab-serv-summary-box">
              <div>
                <span>Precio</span>
                <b>S/ {Number(precio || 0).toFixed(2)}</b>
              </div>

              <div>
                <span>Cantidad</span>

                <div className="trab-serv-qty">
                  <button type="button" onClick={restarCantidad} disabled={loading}>
                    <Minus size={14} />
                  </button>

                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => cambiarCantidad(e.target.value)}
                    disabled={loading}
                  />

                  <button type="button" onClick={sumarCantidad} disabled={loading}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="trab-serv-total">
              <span>Total</span>
              <h2>
                <AnimatedNumber value={total} prefix="S/ " decimals={2} />
              </h2>
            </div>

            <form onSubmit={guardarServicio}>
              <button
                className="btn btn-gold w-100"
                disabled={loading || !idServicio || total <= 0}
              >
                <Save size={16} />
                {loading ? "Guardando..." : "Registrar servicio"}
              </button>

              {(idServicio || precio) && (
                <button
                  type="button"
                  className="btn btn-dark-outline w-100 mt-2"
                  onClick={limpiarFormulario}
                  disabled={loading}
                >
                  Limpiar
                </button>
              )}
            </form>

            <p className="trab-serv-note">
              Este registro se reflejará en ventas, dashboard y pagos del trabajador.
            </p>
          </CardDark>
        </div>
      </div>

      <Toast
        mensaje={mensaje || error}
        tipo={error ? "error" : "success"}
        onClose={() => {
          setMensaje("");
          setError("");
        }}
      />
    </div>
  );
}
