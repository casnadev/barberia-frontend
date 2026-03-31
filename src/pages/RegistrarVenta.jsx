import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../services/api";
import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";

const detalleVacio = {
  idServicio: "",
  idTrabajador: "",
  cantidad: 1,
  precioUnitario: 0,
};

function CampoLabel({ label, children }) {
  return (
    <div>
      <label
        className="form-label"
        style={{ color: "#d4af37", fontWeight: 600 }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function RegistrarVenta() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [venta, setVenta] = useState({
    idNegocio: 1,
    idUsuario: 1,
    detalles: [{ ...detalleVacio }],
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resTrabajadores, resServicios] = await Promise.all([
          fetch(`${API_BASE}/Trabajadores`),
          fetch(`${API_BASE}/Servicios`),
        ]);

        const [dataTrabajadores, dataServicios] = await Promise.all([
          resTrabajadores.json(),
          resServicios.json(),
        ]);

        setTrabajadores(dataTrabajadores);
        setServicios(dataServicios);
      } catch (err) {
        console.error(err);
        setError("Error al cargar datos");
      }
    };

    cargarDatos();
  }, []);

  const total = useMemo(
    () =>
      venta.detalles.reduce(
        (acc, d) => acc + Number(d.cantidad) * Number(d.precioUnitario),
        0
      ),
    [venta.detalles]
  );

  const actualizarDetalles = (detalles) =>
    setVenta((prev) => ({ ...prev, detalles }));

  const cambiarDetalle = (index, campo, valor) => {
    const detalles = [...venta.detalles];
    detalles[index][campo] = valor;

    if (campo === "idServicio") {
      const servicio = servicios.find((s) => s.idServicio === Number(valor));
      if (servicio) detalles[index].precioUnitario = servicio.precioBase;
    }

    actualizarDetalles(detalles);
  };

  const agregarDetalle = () =>
    actualizarDetalles([...venta.detalles, { ...detalleVacio }]);

  const eliminarDetalle = (index) => {
    if (venta.detalles.length === 1) return;
    actualizarDetalles(venta.detalles.filter((_, i) => i !== index));
  };

  const limpiarVenta = () =>
    setVenta((prev) => ({
      ...prev,
      detalles: [{ ...detalleVacio }],
    }));

    const guardarVenta = async (e) => {
  e.preventDefault();
  setMensaje("");
  setError("");

  const detalles = venta.detalles.map((d) => ({
    idServicio: Number(d.idServicio),
    idTrabajador: Number(d.idTrabajador),
    cantidad: Number(d.cantidad),
    precioUnitario: Number(d.precioUnitario),
  }));

  const hayErrores = detalles.some(
    (d) =>
      !d.idServicio ||
      !d.idTrabajador ||
      d.cantidad <= 0 ||
      d.precioUnitario <= 0
  );

  if (hayErrores) {
    setError("Completa correctamente todos los detalles de la venta.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/Ventas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idNegocio: venta.idNegocio,
        idUsuario: venta.idUsuario,
        detalles,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.mensaje || "Error al guardar venta");
      return;
    }

    setMensaje(`Venta registrada correctamente. Total: S/ ${data.total}`);
    limpiarVenta();
  } catch (err) {
    console.error(err);
    setError("Error al guardar venta");
  }
};
  
  return (
    <div className="page-shell">
      <PageHeader
        title="Registrar Venta"
        subtitle="Registra servicios, trabajadores y montos de una venta"
      />

      <div className="container-fluid py-4">
        {mensaje && <div className="alert alert-success">{mensaje}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <CardDark>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="section-title">Detalle de venta</h4>
              <p className="section-subtitle">
                Agrega uno o varios servicios a la venta
              </p>
            </div>
            <GoldBadge>{venta.detalles.length} ítems</GoldBadge>
          </div>

          <form onSubmit={guardarVenta}>
            {venta.detalles.map((d, i) => (
              <div
                key={i}
                style={{
                  background: "#141414",
                  border: "1px solid rgba(212, 175, 55, 0.18)",
                  borderRadius: "16px",
                  padding: "18px",
                  marginBottom: "16px",
                }}
              >
                <div className="row g-3">
                  <div className="col-md-4">
                    <CampoLabel label="Servicio">
                      <select
                        className="form-control input-dark"
                        value={d.idServicio}
                        onChange={(e) =>
                          cambiarDetalle(i, "idServicio", e.target.value)
                        }
                      >
                        <option value="">Seleccione</option>
                        {servicios.map((s) => (
                          <option key={s.idServicio} value={s.idServicio}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                    </CampoLabel>
                  </div>

                  <div className="col-md-3">
                    <CampoLabel label="Trabajador">
                      <select
                        className="form-control input-dark"
                        value={d.idTrabajador}
                        onChange={(e) =>
                          cambiarDetalle(i, "idTrabajador", e.target.value)
                        }
                      >
                        <option value="">Seleccione</option>
                        {trabajadores.map((t) => (
                          <option key={t.idTrabajador} value={t.idTrabajador}>
                            {t.nombre}
                          </option>
                        ))}
                      </select>
                    </CampoLabel>
                  </div>

                  <div className="col-md-2">
                    <CampoLabel label="Cantidad">
                      <input
                        type="number"
                        className="form-control input-dark"
                        value={d.cantidad}
                        onChange={(e) =>
                          cambiarDetalle(i, "cantidad", e.target.value)
                        }
                      />
                    </CampoLabel>
                  </div>

                  <div className="col-md-2">
                    <CampoLabel label="Precio">
                      <input
                        type="number"
                        className="form-control input-dark"
                        value={d.precioUnitario}
                        onChange={(e) =>
                          cambiarDetalle(i, "precioUnitario", e.target.value)
                        }
                      />
                    </CampoLabel>
                  </div>

                  <div className="col-md-1 d-flex align-items-end">
                    <button
                      type="button"
                      className="btn w-100"
                      onClick={() => eliminarDetalle(i)}
                      style={{
                        background: "#8b1e1e",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                        fontWeight: 700,
                      }}
                    >
                      X
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="d-flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                className="btn btn-dark-outline"
                onClick={agregarDetalle}
              >
                + Servicio
              </button>

              <button type="submit" className="btn btn-gold">
                Guardar Venta
              </button>
            </div>

            <div
              className="mt-4 p-3"
              style={{
                background: "rgba(212, 175, 55, 0.08)",
                borderRadius: "16px",
                border: "1px solid rgba(212, 175, 55, 0.22)",
                color: "#f3e7b3",
                fontSize: "1.1rem",
                fontWeight: 700,
              }}
            >
              Total: S/ {total.toFixed(2)}
            </div>
          </form>
        </CardDark>
      </div>
    </div>
  );
}

export default RegistrarVenta;