import { useEffect, useRef, useState } from "react";
import API_BASE from "../services/api";
import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";

function Dashboard() {
  const [dashboard, setDashboard] = useState({
    totalDia: 0,
    topTrabajadores: [],
  });

  const [comisiones, setComisiones] = useState([]);
  const [ventasPorDia, setVentasPorDia] = useState([]);

  const [error, setError] = useState("");
  const [mensajePago, setMensajePago] = useState("");
  const [tipoMensajePago, setTipoMensajePago] = useState("info");

  const [montosPago, setMontosPago] = useState({});
  const [procesandoPago, setProcesandoPago] = useState(null);

  const [modalConfirmacion, setModalConfirmacion] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState(null);
  const [textoConfirmacion, setTextoConfirmacion] = useState("");

  const [animarCards, setAnimarCards] = useState(false);

  const resumenRef = useRef(null);

  const chartColors = {
    gold: "#d4af37",
    white: "#f5f5f5",
    axis: "#cfcfcf",
    grid: "#333",
    dark: "#111",
    border: "rgba(212,175,55,0.25)",
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: chartColors.dark,
      border: `1px solid ${chartColors.border}`,
      borderRadius: "10px",
      color: chartColors.white,
    },
    labelStyle: { color: chartColors.gold },
    itemStyle: { color: chartColors.white },
  };

  const legendStyle = {
    wrapperStyle: {
      color: chartColors.white,
      paddingTop: "10px",
    },
  };

  useEffect(() => {
    const cargarDashboard = async () => {
      try {
        const [resDashboard, resComisiones, resVentasPorDia] = await Promise.all([
          fetch(`${API_BASE}/Ventas/dashboard`),
          fetch(`${API_BASE}/Ventas/comisiones-por-trabajador`),
          fetch(`${API_BASE}/Ventas/ventas-por-dia`),
        ]);

        const [dataDashboard, dataComisiones, dataVentasPorDia] =
          await Promise.all([
            resDashboard.json(),
            resComisiones.json(),
            resVentasPorDia.json(),
          ]);

        setDashboard(dataDashboard);
        setComisiones(dataComisiones);
        setVentasPorDia(dataVentasPorDia);
      } catch (err) {
        console.error(err);
        setError("Error al cargar el dashboard");
      }
    };

    cargarDashboard();
  }, []);

  const refrescarComisiones = async () => {
    try {
      const resComisiones = await fetch(
        `${API_BASE}/Ventas/comisiones-por-trabajador`
      );
      const dataComisiones = await resComisiones.json();
      setComisiones(dataComisiones);

      setAnimarCards(true);
      setTimeout(() => {
        setAnimarCards(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("Error al refrescar comisiones");
    }
  };

  const irAResumenDashboard = () => {
    if (!resumenRef.current) return;

    const esMobile = window.innerWidth < 768;
    const offset = esMobile ? 100 : 40;

    const top =
      resumenRef.current.getBoundingClientRect().top +
      window.pageYOffset -
      offset;

    window.scrollTo({
      top,
      behavior: "smooth",
    });
  };

  const cambiarMontoPago = (idTrabajador, valor) => {
    setMontosPago((prev) => ({
      ...prev,
      [idTrabajador]: valor,
    }));
  };

  const obtenerMontoPago = (idTrabajador) => {
    return Number(montosPago[idTrabajador] || 0);
  };

  const pagarParcial = async (idTrabajador, totalPendiente) => {
    const monto = Number(montosPago[idTrabajador] || 0);

    if (!monto || isNaN(monto)) {
      setTipoMensajePago("error");
      setMensajePago("Ingresa un monto válido para el pago parcial.");
      return;
    }

    if (monto <= 0) {
      setTipoMensajePago("error");
      setMensajePago("El monto debe ser mayor a 0.");
      return;
    }

    if (monto > totalPendiente) {
      setTipoMensajePago("error");
      setMensajePago(
        `El monto no puede exceder lo pendiente: S/ ${Number(totalPendiente).toFixed(2)}`
      );
      return;
    }

    setProcesandoPago(idTrabajador);

    try {
      const res = await fetch(`${API_BASE}/Ventas/pago-parcial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idTrabajador,
          monto,
          observacion: "Pago parcial desde sistema",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTipoMensajePago("error");
        setMensajePago(data.mensaje || "Error al registrar pago parcial");
        return;
      }

      setTipoMensajePago("success");
      setMensajePago(
        `✅ Pago parcial registrado: S/ ${Number(data.totalPagado).toFixed(2)}`
      );

      setMontosPago((prev) => ({
        ...prev,
        [idTrabajador]: "",
      }));

      await refrescarComisiones();

      setTimeout(() => {
        irAResumenDashboard();
      }, 150);
    } catch (err) {
      console.error(err);
      setTipoMensajePago("error");
      setMensajePago("Error de conexión");
    } finally {
      setProcesandoPago(null);
    }
  };

  const pagarTodo = async (idTrabajador, totalPendiente) => {
    if (totalPendiente <= 0) {
      setTipoMensajePago("error");
      setMensajePago("No hay monto pendiente para pagar.");
      return;
    }

    setProcesandoPago(idTrabajador);

    try {
      const res = await fetch(
        `${API_BASE}/Ventas/pagar-comisiones/${idTrabajador}`,
        {
          method: "PATCH",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setTipoMensajePago("error");
        setMensajePago(data.mensaje || "Error al pagar comisiones");
        return;
      }

      setTipoMensajePago("success");
      setMensajePago(
        `✅ Pago total realizado: S/ ${Number(data.totalPagado).toFixed(2)}`
      );

      setMontosPago((prev) => ({
        ...prev,
        [idTrabajador]: "",
      }));

      await refrescarComisiones();

      setTimeout(() => {
        irAResumenDashboard();
      }, 150);
    } catch (err) {
      console.error(err);
      setTipoMensajePago("error");
      setMensajePago("Error de conexión");
    } finally {
      setProcesandoPago(null);
    }
  };

  const saldoPendienteTotal = comisiones.reduce(
    (acc, item) => acc + Number(item.totalComisionPendiente || 0),
    0
  );

  const totalComisionesPagadas = comisiones.reduce(
    (acc, item) => acc + Number(item.totalComisionPagada || 0),
    0
  );

  const abrirConfirmacion = (texto, accion) => {
    setTextoConfirmacion(texto);
    setAccionPendiente(() => accion);
    setModalConfirmacion(true);
  };

  const cerrarConfirmacion = () => {
    setModalConfirmacion(false);
    setAccionPendiente(null);
    setTextoConfirmacion("");
  };

  const confirmarAccion = () => {
    if (accionPendiente) {
      accionPendiente();
    }
    cerrarConfirmacion();
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Bienvenido, Nader"
        subtitle="Control de ventas, rendimiento y movimiento diario del negocio"
      />

      <div className="container-fluid py-4">
        {error && <div className="alert alert-danger">{error}</div>}

        {mensajePago && (
          <div
            className="mb-4 px-4 py-3"
            style={{
              borderRadius: "16px",
              fontWeight: 600,
              background:
                tipoMensajePago === "success"
                  ? "rgba(34, 197, 94, 0.12)"
                  : "rgba(248, 113, 113, 0.12)",
              border:
                tipoMensajePago === "success"
                  ? "1px solid rgba(34, 197, 94, 0.35)"
                  : "1px solid rgba(248, 113, 113, 0.35)",
              color: tipoMensajePago === "success" ? "#bbf7d0" : "#fecaca",
              boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
            }}
          >
            {mensajePago}
          </div>
        )}

        <div id="resumen-dashboard" ref={resumenRef} className="row g-4 mb-4">
          <div className="col-lg-4 col-md-6">
            <CardDark className="h-100">
              <p
                className="text-uppercase fw-semibold mb-2"
                style={{
                  color: "#c9a227",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                }}
              >
                Ventas del día
              </p>

              <h2
                className="fw-bold mb-3"
                style={{
                  fontSize: "2.4rem",
                  color: "#ffffff",
                }}
              >
                S/ {Number(dashboard.totalDia || 0).toFixed(2)}
              </h2>

              <div
                className="p-3"
                style={{
                  background: "rgba(212, 175, 55, 0.08)",
                  borderRadius: "16px",
                  border: "1px solid rgba(212, 175, 55, 0.22)",
                  color: "#f3e7b3",
                }}
              >
                Rendimiento diario actualizado en tiempo real
              </div>
            </CardDark>
          </div>

          <div className="col-lg-4 col-md-6">
            <CardDark
              className="h-100"
              style={{
                transform: animarCards ? "scale(1.05)" : "scale(1)",
                boxShadow: animarCards
                  ? "0 0 25px rgba(212,175,55,0.5), 0 20px 45px rgba(0,0,0,0.42)"
                  : undefined,
                border: animarCards
                  ? "1px solid rgba(212,175,55,0.65)"
                  : undefined,
              }}
            >
              <p
                className="text-uppercase fw-semibold mb-2"
                style={{
                  color: "#f4d35e",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                }}
              >
                Saldo pendiente
              </p>

              <h2
                className="fw-bold mb-3"
                style={{
                  fontSize: "2.4rem",
                  color: "#ffffff",
                }}
              >
                <AnimatedNumber value={saldoPendienteTotal} prefix="S/ " duration={1400} />
              </h2>

              <div
                className="p-3"
                style={{
                  background: "rgba(244, 211, 94, 0.08)",
                  borderRadius: "16px",
                  border: "1px solid rgba(244, 211, 94, 0.22)",
                  color: "#f8e7a1",
                }}
              >
                Total de comisiones pendientes por pagar
              </div>
            </CardDark>
          </div>

          <div className="col-lg-4 col-md-12">
            <CardDark
              className="h-100"
              style={{
                transform: animarCards ? "scale(1.05)" : "scale(1)",
                boxShadow: animarCards
                  ? "0 0 25px rgba(212,175,55,0.5), 0 20px 45px rgba(0,0,0,0.42)"
                  : undefined,
                border: animarCards
                  ? "1px solid rgba(212,175,55,0.65)"
                  : undefined,
              }}
            >
              <p
                className="text-uppercase fw-semibold mb-2"
                style={{
                  color: "#4ade80",
                  fontSize: "0.85rem",
                  letterSpacing: "1px",
                }}
              >
                Comisiones pagadas
              </p>

              <h2
                className="fw-bold mb-3"
                style={{
                  fontSize: "2.4rem",
                  color: "#ffffff",
                }}
              >
                <AnimatedNumber value={totalComisionesPagadas} prefix="S/ " duration={1400} />
              </h2>

              <div
                className="p-3"
                style={{
                  background: "rgba(74, 222, 128, 0.08)",
                  borderRadius: "16px",
                  border: "1px solid rgba(74, 222, 128, 0.22)",
                  color: "#b7f7c9",
                }}
              >
                Total abonado a trabajadores
              </div>
            </CardDark>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-12">
            <CardDark>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="section-title">Top trabajadores</h4>
                  <p className="section-subtitle">
                    Ranking de ingresos generados
                  </p>
                </div>

                <GoldBadge>
                  {dashboard.topTrabajadores?.length || 0} en ranking
                </GoldBadge>
              </div>

              {dashboard.topTrabajadores?.length > 0 ? (
                <div id="top-trabajadores-mobile" className="row g-3">
                  {dashboard.topTrabajadores.map((item, index) => (
                    <div className="col-lg-4 col-md-6" key={index}>
                      <div
                        className="h-100 p-4"
                        style={{
                          borderRadius: "18px",
                          background:
                            index === 0
                              ? "linear-gradient(135deg, #d4af37, #f5deb3)"
                              : index === 1
                              ? "linear-gradient(135deg, #2b2b2b, #3b3b3b)"
                              : "linear-gradient(135deg, #4a3513, #7a5a1c)",
                          color: index === 0 ? "#111" : "#fff",
                          boxShadow: "0 12px 24px rgba(0,0,0,0.25)",
                        }}
                      >
                        <div className="mb-2">
                          <span
                            className="px-2 py-1"
                            style={{
                              background:
                                index === 0
                                  ? "rgba(0,0,0,0.12)"
                                  : "rgba(255,255,255,0.12)",
                              borderRadius: "10px",
                              fontSize: "0.85rem",
                              fontWeight: 700,
                            }}
                          >
                            {index + 1}° puesto
                          </span>
                        </div>

                        <h5 className="fw-bold mb-2">{item.trabajador}</h5>

                        <p className="mb-1" style={{ opacity: 0.85 }}>
                          Total generado
                        </p>

                        <h4 className="fw-bold mb-0">
                          S/ {Number(item.totalGenerado || 0).toFixed(2)}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="section-subtitle mb-0">
                  No hay datos disponibles.
                </p>
              )}
            </CardDark>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <CardDark className="h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="section-title">Ventas por trabajador</h4>
                  <p className="section-subtitle">
                    Comparación de ingresos generados
                  </p>
                </div>
                <GoldBadge>{comisiones.length} datos</GoldBadge>
              </div>

              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={comisiones}>
                    <defs>
                      <linearGradient
                        id="ventasTrabajadorGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#f4d35e" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#d4af37"
                          stopOpacity={0.85}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.grid}
                    />
                    <XAxis dataKey="trabajador" stroke={chartColors.axis} />
                    <YAxis stroke={chartColors.axis} />
                    <Tooltip {...tooltipStyle} />
                    <Legend {...legendStyle} />

                    <Bar
                      dataKey="totalGenerado"
                      name="Total generado"
                      fill="url(#ventasTrabajadorGradient)"
                      radius={[8, 8, 0, 0]}
                      animationDuration={900}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardDark>
          </div>

          <div className="col-lg-6">
            <CardDark className="h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="section-title">Comisiones</h4>
                  <p className="section-subtitle">
                    Pendiente vs pagado por trabajador
                  </p>
                </div>
                <GoldBadge>{comisiones.length} datos</GoldBadge>
              </div>

              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={comisiones}>
                    <defs>
                      <linearGradient
                        id="pendienteGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#f8e16c" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#d4af37"
                          stopOpacity={0.85}
                        />
                      </linearGradient>

                      <linearGradient
                        id="pagadaGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#22c55e"
                          stopOpacity={0.85}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.grid}
                    />
                    <XAxis dataKey="trabajador" stroke={chartColors.axis} />
                    <YAxis stroke={chartColors.axis} />
                    <Tooltip {...tooltipStyle} />
                    <Legend {...legendStyle} />

                    <Bar
                      dataKey="totalComisionPendiente"
                      name="Pendiente"
                      fill="url(#pendienteGradient)"
                      radius={[8, 8, 0, 0]}
                      animationDuration={900}
                    />
                    <Bar
                      dataKey="totalComisionPagada"
                      name="Pagada"
                      fill="url(#pagadaGradient)"
                      radius={[8, 8, 0, 0]}
                      animationDuration={900}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardDark>
          </div>
        </div>

        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="section-title">Ventas por día</h4>
              <p className="section-subtitle">
                Evolución diaria de ingresos registrados
              </p>
            </div>

            <GoldBadge>{ventasPorDia.length} días</GoldBadge>
          </div>

          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <AreaChart data={ventasPorDia}>
                <defs>
                  <linearGradient
                    id="ventasDiaArea"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#c084fc" stopOpacity={0.45} />
                    <stop
                      offset="100%"
                      stopColor="#c084fc"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.grid}
                />
                <XAxis
                  dataKey="fecha"
                  stroke={chartColors.axis}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                />
                <YAxis stroke={chartColors.axis} />
                <Tooltip
                  {...tooltipStyle}
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                  formatter={(value) => [
                    `S/ ${Number(value).toFixed(2)}`,
                    "Ventas",
                  ]}
                />
                <Legend {...legendStyle} />

                <Area
                  type="monotone"
                  dataKey="total"
                  name="Ventas del día"
                  stroke="#c084fc"
                  strokeWidth={3}
                  fill="url(#ventasDiaArea)"
                  dot={{ r: 4, fill: "#c084fc" }}
                  activeDot={{ r: 6 }}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardDark>

        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="section-title">Comisiones por trabajador</h4>
              <p className="section-subtitle">
                Resumen de comisiones pendientes y pagadas
              </p>
            </div>

            <GoldBadge>{comisiones.length} trabajadores</GoldBadge>
          </div>

          <TableDark
            headers={[
              "Trabajador",
              "Total generado",
              "Comisión pendiente",
              "Comisión pagada",
              "Acciones",
            ]}
          >
            {comisiones.length > 0 ? (
              comisiones.map((c, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 600 }}>{c.trabajador}</td>
                  <td>S/ {Number(c.totalGenerado).toFixed(2)}</td>
                  <td style={{ color: "#f0cf73", fontWeight: 700 }}>
                    S/ {Number(c.totalComisionPendiente).toFixed(2)}
                  </td>
                  <td style={{ color: "#86efac", fontWeight: 700 }}>
                    S/ {Number(c.totalComisionPagada).toFixed(2)}
                  </td>
                  <td style={{ minWidth: "260px" }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Monto"
                      className="form-control input-dark mb-2"
                      value={montosPago[c.idTrabajador] || ""}
                      onChange={(e) =>
                        cambiarMontoPago(c.idTrabajador, e.target.value)
                      }
                      disabled={c.totalComisionPendiente <= 0}
                    />

                    <div className="d-flex gap-2 mb-2">
                      <button
                        className="btn btn-sm"
                        disabled={
                          procesandoPago === c.idTrabajador ||
                          c.totalComisionPendiente <= 0 ||
                          !obtenerMontoPago(c.idTrabajador) ||
                          obtenerMontoPago(c.idTrabajador) <= 0 ||
                          obtenerMontoPago(c.idTrabajador) >
                            c.totalComisionPendiente
                        }
                        onClick={() =>
                          abrirConfirmacion(
                            `¿Confirmar pago parcial a ${c.trabajador}?`,
                            () =>
                              pagarParcial(
                                c.idTrabajador,
                                c.totalComisionPendiente
                              )
                          )
                        }
                        style={{
                          background:
                            procesandoPago === c.idTrabajador
                              ? "#555"
                              : c.totalComisionPendiente > 0 &&
                                  obtenerMontoPago(c.idTrabajador) > 0 &&
                                  obtenerMontoPago(c.idTrabajador) <=
                                    c.totalComisionPendiente
                                ? "#d4af37"
                                : "#333",
                          color: "#111",
                          fontWeight: 700,
                          border: "none",
                          cursor:
                            procesandoPago === c.idTrabajador
                              ? "wait"
                              : c.totalComisionPendiente > 0 &&
                                  obtenerMontoPago(c.idTrabajador) > 0 &&
                                  obtenerMontoPago(c.idTrabajador) <=
                                    c.totalComisionPendiente
                                ? "pointer"
                                : "not-allowed",
                        }}
                      >
                        {procesandoPago === c.idTrabajador
                          ? "Procesando..."
                          : "Parcial"}
                      </button>

                      <button
                        className="btn btn-sm"
                        disabled={
                          procesandoPago === c.idTrabajador ||
                          c.totalComisionPendiente <= 0
                        }
                        onClick={() =>
                          abrirConfirmacion(
                            `¿Pagar todo lo pendiente a ${c.trabajador}?`,
                            () =>
                              pagarTodo(
                                c.idTrabajador,
                                c.totalComisionPendiente
                              )
                          )
                        }
                        style={{
                          background:
                            procesandoPago === c.idTrabajador
                              ? "#555"
                              : c.totalComisionPendiente > 0
                                ? "#22c55e"
                                : "#333",
                          color: "#fff",
                          fontWeight: 700,
                          border: "none",
                          cursor:
                            procesandoPago === c.idTrabajador
                              ? "wait"
                              : c.totalComisionPendiente > 0
                                ? "pointer"
                                : "not-allowed",
                        }}
                      >
                        {procesandoPago === c.idTrabajador
                          ? "Procesando..."
                          : "Todo"}
                      </button>
                    </div>

                    {obtenerMontoPago(c.idTrabajador) >
                      c.totalComisionPendiente && (
                      <small style={{ color: "#f87171" }}>
                        El monto excede lo pendiente
                      </small>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  No hay comisiones registradas
                </td>
              </tr>
            )}
          </TableDark>
        </CardDark>

        {modalConfirmacion && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "420px",
                background: "#111",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: "20px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
                padding: "24px",
              }}
            >
              <h4
                style={{
                  color: "#d4af37",
                  marginBottom: "12px",
                  fontWeight: 800,
                }}
              >
                Confirmar acción
              </h4>

              <p
                style={{
                  color: "#f5f5f5",
                  marginBottom: "20px",
                  lineHeight: 1.5,
                }}
              >
                {textoConfirmacion}
              </p>

              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-dark-outline"
                  onClick={cerrarConfirmacion}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={confirmarAccion}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;