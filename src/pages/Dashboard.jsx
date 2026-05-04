import { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";

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

  const [resumenFinanciero, setResumenFinanciero] = useState({
    totalVentas: 0,
    totalPagos: 0,
    totalGastos: 0,
    utilidad: 0,
  });

  const [loadingResumen, setLoadingResumen] = useState(true);
  const [loadingComisiones, setLoadingComisiones] = useState(true);
  const [loadingVentasDia, setLoadingVentasDia] = useState(true);

  const [error, setError] = useState("");
  const [mensajePago, setMensajePago] = useState("");
  const [tipoMensajePago, setTipoMensajePago] = useState("info");

  const [montosPago, setMontosPago] = useState({});
  const [procesandoPago, setProcesandoPago] = useState(null);
  const [reservasPendientes, setReservasPendientes] = useState(0);

  const [modalConfirmacion, setModalConfirmacion] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState(null);
  const [textoConfirmacion, setTextoConfirmacion] = useState("");

  const resumenRef = useRef(null);

  const [nombreNegocio, setNombreNegocio] = useState(
    localStorage.getItem("nombreNegocio") || ""
  );

  let usuario = null;

  try {
    usuario = JSON.parse(localStorage.getItem("usuario") || "null");
  } catch {
    usuario = null;
  }

  const utilidad = Number(resumenFinanciero.utilidad || 0);
  const esPositivo = utilidad > 0;
  const esNegativo = utilidad < 0;
  const esCero = utilidad === 0;

  const esMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const chartColors = {
    gold: "#d4af37",
    goldSoft: "#f0cf73",
    axis: "#b8b8b8",
    grid: "rgba(255,255,255,0.08)",
    text: "#f5f5f5",
    muted: "#9ca3af",
    border: "rgba(212,175,55,0.18)",
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "#111111",
      border: `1px solid ${chartColors.border}`,
      borderRadius: "14px",
      color: "#f5f5f5",
      boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
    },
    labelStyle: { color: "#f0cf73" },
    itemStyle: { color: "#f5f5f5" },
  };

  const legendStyle = {
    wrapperStyle: {
      color: chartColors.text,
      paddingTop: "10px",
    },
  };

  const leerJsonSeguro = async (res, valorDefecto) => {
    try {
      if (!res || !res.ok) return valorDefecto;
      return await res.json();
    } catch {
      return valorDefecto;
    }
  };

  const obtenerFechaHoy = () => {
    const hoy = new Date();

    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(hoy.getDate()).padStart(2, "0")}`;
  };

  const refrescarResumenFinanciero = async () => {
    try {
      const fechaHoy = obtenerFechaHoy();

      const res = await authFetch(
        `${API_BASE}/Ventas/resumen-financiero?desde=${fechaHoy}&hasta=${fechaHoy}`
      );

      const data = await leerJsonSeguro(res, null);

      if (!res || !res.ok || !data) {
        setError("Error al cargar resumen financiero");
        return;
      }

      setResumenFinanciero(data);
    } catch (err) {
      console.error(err);
      setError("Error al refrescar resumen financiero");
    }
  };

  const refrescarComisiones = async () => {
    try {
      setLoadingComisiones(true);

      const resComisiones = await authFetch(`${API_BASE}/Ventas/comisiones-dia`);
      const dataComisiones = await leerJsonSeguro(resComisiones, []);

      setComisiones(Array.isArray(dataComisiones) ? dataComisiones : []);
    } catch (err) {
      console.error(err);
      setError("Error al refrescar comisiones");
    } finally {
      setLoadingComisiones(false);
    }
  };

  useEffect(() => {
    const cargarResumen = async () => {
      try {
        setLoadingResumen(true);

        const resDashboard = await authFetch(`${API_BASE}/Ventas/dashboard`);
        const dataDashboard = await leerJsonSeguro(resDashboard, null);

        if (!resDashboard || !resDashboard.ok || !dataDashboard) {
          setError("Error al cargar el resumen del dashboard");
          return;
        }

        setDashboard(dataDashboard);
      } catch (err) {
        console.error(err);
        setError("Error al cargar el resumen del dashboard");
      } finally {
        setLoadingResumen(false);
      }
    };

    cargarResumen();
  }, []);

  useEffect(() => {
    const cargarReservasPendientes = async () => {
      try {
        const res = await authFetch(`${API_BASE}/Reservas/mis-reservas`);
        const data = await leerJsonSeguro(res, []);

        const pendientes = Array.isArray(data)
          ? data.filter((r) => String(r.estado || "").toLowerCase() === "pendiente")
              .length
          : 0;

        setReservasPendientes(pendientes);
      } catch (err) {
        console.error(err);
        setError("Error al cargar reservas pendientes");
      }
    };

    cargarReservasPendientes();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      await refrescarComisiones();
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const cargarResumenFinanciero = async () => {
      try {
        const fechaHoy = obtenerFechaHoy();

        const res = await authFetch(
          `${API_BASE}/Ventas/resumen-financiero?desde=${fechaHoy}&hasta=${fechaHoy}`
        );

        const data = await leerJsonSeguro(res, null);

        if (!res || !res.ok || !data) {
          setError("Error al cargar resumen financiero");
          return;
        }

        setResumenFinanciero(data);
      } catch (err) {
        console.error(err);
        setError("Error al cargar resumen financiero");
      }
    };

    cargarResumenFinanciero();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoadingVentasDia(true);

        const resVentasPorDia = await authFetch(
          `${API_BASE}/Ventas/ventas-por-dia`
        );

        const dataVentasPorDia = await leerJsonSeguro(resVentasPorDia, []);

        setVentasPorDia(Array.isArray(dataVentasPorDia) ? dataVentasPorDia : []);
      } catch (err) {
        console.error(err);
        setError("Error al cargar ventas por día");
      } finally {
        setLoadingVentasDia(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const actualizarNombre = () => {
      setNombreNegocio(localStorage.getItem("nombreNegocio") || "");
    };

    window.addEventListener("nombre-negocio-actualizado", actualizarNombre);

    return () => {
      window.removeEventListener("nombre-negocio-actualizado", actualizarNombre);
    };
  }, []);

  useEffect(() => {
    const cargarNegocio = async () => {
      try {
        const res = await authFetch(`${API_BASE}/Negocios/mi-negocio`);
        const data = await leerJsonSeguro(res, null);

        if (!res || !res.ok || !data) return;

        localStorage.setItem("slugNegocio", data.slug || "");
        localStorage.setItem("nombreNegocio", data.nombre || "");

        setNombreNegocio(data.nombre || "");
      } catch (err) {
        console.error("Error cargando negocio:", err);
      }
    };

    cargarNegocio();
  }, []);

  const irAResumenDashboard = () => {
    if (!resumenRef.current) return;

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

  const irSitioPublico = () => {
    const slug = localStorage.getItem("slugNegocio");

    if (!slug) {
      alert("No se pudo obtener el link público del negocio.");
      return;
    }

    window.open(`/negocio/${slug}`, "_blank");
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
        `El monto no puede exceder lo pendiente: S/ ${Number(
          totalPendiente
        ).toFixed(2)}`
      );
      return;
    }

    setProcesandoPago(idTrabajador);

    try {
      const res = await authFetch(`${API_BASE}/Ventas/pago-parcial`, {
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

      const data = await leerJsonSeguro(res, {});

      if (!res || !res.ok) {
        setTipoMensajePago("error");
        setMensajePago(data.mensaje || "Error al registrar pago parcial");
        return;
      }

      setTipoMensajePago("success");
      setMensajePago(
        `✅ Pago parcial registrado: S/ ${Number(data.totalPagado || monto).toFixed(
          2
        )}`
      );

      setMontosPago((prev) => ({
        ...prev,
        [idTrabajador]: "",
      }));

      await refrescarComisiones();
      await refrescarResumenFinanciero();

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
      const res = await authFetch(
        `${API_BASE}/Ventas/pagar-comisiones/${idTrabajador}`,
        {
          method: "PATCH",
        }
      );

      const data = await leerJsonSeguro(res, {});

      if (!res || !res.ok) {
        setTipoMensajePago("error");
        setMensajePago(data.mensaje || "Error al pagar comisiones");
        return;
      }

      setTipoMensajePago("success");
      setMensajePago(
        `✅ Pago total realizado: S/ ${Number(
          data.totalPagado || totalPendiente
        ).toFixed(2)}`
      );

      setMontosPago((prev) => ({
        ...prev,
        [idTrabajador]: "",
      }));

      await refrescarComisiones();
      await refrescarResumenFinanciero();

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

  const ventasPorDiaProcesadas = useMemo(() => {
    const nombresDias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    const hoy = new Date();
    const diaActual = hoy.getDay();
    const ajusteLunes = diaActual === 0 ? 6 : diaActual - 1;

    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - ajusteLunes);
    inicioSemana.setHours(0, 0, 0, 0);

    const semana = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(inicioSemana);
      fecha.setDate(inicioSemana.getDate() + i);
      fecha.setHours(0, 0, 0, 0);

      return {
        dia: nombresDias[i],
        fechaReal: fecha.toLocaleDateString("es-PE"),
        fechaBase: fecha.getTime(),
        total: 0,
      };
    });

    if (ventasPorDia && ventasPorDia.length > 0) {
      ventasPorDia.forEach((item) => {
        const fechaItem = new Date(item.fecha);
        fechaItem.setHours(0, 0, 0, 0);

        const encontrado = semana.find(
          (d) => d.fechaBase === fechaItem.getTime()
        );

        if (encontrado) {
          encontrado.total += Number(item.total || 0);
        }
      });
    }

    return semana.map(({ dia, fechaReal, total }) => ({
      dia,
      fechaReal,
      total,
    }));
  }, [ventasPorDia]);

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
        title={nombreNegocio || `Bienvenido, ${usuario?.nombre || "Usuario"}`}
        subtitle="Control diario de ventas, rendimiento y movimiento del negocio"
      />

      <div className="container-fluid pt-2 pb-3 d-flex justify-content-between align-items-center">
        <div className="section-subtitle">Vista pública del negocio</div>

        <button type="button" className="btn btn-gold" onClick={irSitioPublico}>
          🌐 Ver sitio
        </button>
      </div>

      <div className="container-fluid py-3 dashboard-admin-container">
        <style>{`
          .dashboard-admin-container {
            max-width: 100%;
          }

          .dashboard-admin-layout {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .dashboard-four-cols {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 1rem;
          }

          .dashboard-two-cols {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
          }

          .dashboard-full-row {
            width: 100%;
          }

          .dashboard-chart-box {
            width: 100%;
            height: 280px;
          }

          .dashboard-chart-box-large {
            width: 100%;
            height: 290px;
          }

          .dashboard-table-compact {
            max-height: 300px;
            overflow-y: auto;
            overflow-x: auto;
          }

          .dashboard-kpi-value {
            font-size: 2.35rem;
            font-weight: 900;
            color: #f5f5f5;
            margin-bottom: 1rem;
          }

          .dashboard-kpi-note {
            padding: 14px;
            border-radius: 16px;
            background: rgba(212,175,55,0.08);
            border: 1px solid rgba(212,175,55,0.16);
            color: #d1d5db;
            font-weight: 600;
          }

          .dashboard-worker-card {
            border-radius: 20px;
            padding: 22px;
            height: 100%;
            border: 1px solid rgba(212,175,55,0.18);
            background:
              radial-gradient(circle at top left, rgba(212,175,55,.18), transparent 32%),
              linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
            box-shadow: 0 14px 30px rgba(0,0,0,.25);
          }

          .dashboard-worker-rank {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(212,175,55,.14);
            color: #f0cf73;
            font-weight: 800;
            font-size: .85rem;
          }

          .dashboard-avatar-circle {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #d4af37, #f0cf73);
            color: #111;
            font-weight: 900;
            box-shadow: 0 8px 18px rgba(212,175,55,.25);
          }

          .chart-scroll-mobile {
            overflow-x: auto;
            overflow-y: hidden;
          }

          .chart-legend-mobile {
            margin-top: 12px;
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            color: #d1d5db;
            font-size: .9rem;
          }

          .chart-legend-item {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }

          .chart-legend-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
          }

          @media (min-width: 1200px) {
            .dashboard-admin-layout,
            .dashboard-four-cols,
            .dashboard-two-cols {
              gap: 0.85rem;
            }

            .dashboard-chart-box {
              height: 250px;
            }

            .dashboard-chart-box-large {
              height: 260px;
            }

            .dashboard-table-compact {
              max-height: 260px;
            }
          }

          @media (max-width: 1200px) {
            .dashboard-four-cols {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          @media (max-width: 992px) {
            .dashboard-four-cols {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .dashboard-two-cols {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 576px) {
            .dashboard-four-cols {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        {error && <div className="alert alert-danger">{error}</div>}

        {mensajePago && (
          <div
            className="mb-4 px-4 py-3"
            style={{
              borderRadius: "16px",
              fontWeight: 700,
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

        <div className="dashboard-admin-layout">
          <section
            id="resumen-dashboard"
            ref={resumenRef}
            className="dashboard-full-row"
          >
            <div className="dashboard-four-cols">
              <CardDark className="h-100 kpi-card-pro">
                <p className="section-subtitle mb-2">Ventas del día</p>
                <h2 className="dashboard-kpi-value">
                  {loadingResumen
                    ? "Cargando..."
                    : `S/ ${Number(
                        resumenFinanciero.totalVentas || dashboard.totalDia || 0
                      ).toFixed(2)}`}
                </h2>
                <div className="dashboard-kpi-note">
                  Rendimiento diario actualizado en tiempo real
                </div>
              </CardDark>

              <CardDark className="h-100 kpi-card-pro success">
                <p className="section-subtitle mb-2">Pagos del día</p>
                <h2 className="dashboard-kpi-value">
                  S/ {Number(resumenFinanciero.totalPagos || 0).toFixed(2)}
                </h2>
                <div className="dashboard-kpi-note">
                  Total pagado hoy a trabajadores
                </div>
              </CardDark>

              <CardDark className="h-100 kpi-card-pro purple">

                <p className="section-subtitle mb-2">Gastos del día</p>
                <h2 className="dashboard-kpi-value">
                  S/ {Number(resumenFinanciero.totalGastos || 0).toFixed(2)}
                </h2>
                <div className="dashboard-kpi-note">
                  Total de egresos registrados hoy
                </div>
              </CardDark>

              <CardDark className="h-100 kpi-card-pro info">

                <p className="section-subtitle mb-2">Utilidad del día</p>
                <h2
                  className="dashboard-kpi-value"
                  style={{
                    color: esPositivo
                      ? "#86efac"
                      : esNegativo
                      ? "#fca5a5"
                      : "#f5f5f5",
                  }}
                >
                  S/ {Number(resumenFinanciero.utilidad || 0).toFixed(2)}
                </h2>
                <div className="dashboard-kpi-note">
                  {esPositivo && "Ganancia del negocio hoy"}
                  {esNegativo && "Pérdida del negocio hoy"}
                  {esCero && "Sin ganancia ni pérdida hoy"}
                </div>
              </CardDark>

              <CardDark className="h-100 kpi-card-pro">
                <p className="section-subtitle mb-2">Reservas pendientes</p>
                <h2 className="dashboard-kpi-value">{reservasPendientes}</h2>
                <div className="dashboard-kpi-note">
                  Citas pendientes por confirmar
                </div>

                {reservasPendientes > 0 && (
                  <div
                    style={{
                      marginTop: "14px",
                      color: "#38bdf8",
                      fontWeight: 800,
                    }}
                  >
                    🔔 Atención requerida
                  </div>
                )}
              </CardDark>
            </div>
          </section>

          <section className="dashboard-full-row">
            <CardDark>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="section-title">Top trabajadores del día</h4>
                  <p className="section-subtitle">
                    Ranking diario de ingresos generados
                  </p>
                </div>

                <GoldBadge>
                  {dashboard.topTrabajadores?.length || 0} en ranking
                </GoldBadge>
              </div>

              {loadingResumen ? (
                <p className="section-subtitle mb-0">Cargando ranking...</p>
              ) : dashboard.topTrabajadores?.length > 0 ? (
                <div className="row g-3">
                  {dashboard.topTrabajadores.map((item, index) => (
                    <div className="col-lg-4 col-md-6" key={index}>
                      <div className="dashboard-worker-card">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <span className="dashboard-worker-rank">
                            #{index + 1} puesto
                          </span>

                          <div className="dashboard-avatar-circle">
                            {String(item.trabajador || "T")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        </div>

                        <h5 className="section-title mb-2">
                          {item.trabajador}
                        </h5>

                        <p className="section-subtitle mb-1">
                          Total generado hoy
                        </p>

                        <h4 style={{ color: "#f0cf73", fontWeight: 900 }}>
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
          </section>

          <section className="dashboard-two-cols">
            <CardDark className="h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="section-title">Ventas por trabajador</h4>
                  <p className="section-subtitle">
                    Comparación diaria de ingresos generados
                  </p>
                </div>

                <GoldBadge>{comisiones.length} datos</GoldBadge>
              </div>

              {loadingComisiones ? (
                <p className="section-subtitle mb-0">Cargando gráfico...</p>
              ) : (
                <div className="chart-scroll-mobile">
                  <div
                    className="dashboard-chart-box"
                    style={{
                      width: esMobile
                        ? `${Math.max(comisiones.length * 90, 360)}px`
                        : "100%",
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comisiones}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={chartColors.grid}
                        />
                        <XAxis
                          dataKey="trabajador"
                          stroke={chartColors.axis}
                          interval={0}
                          tick={{ fontSize: 12, fill: chartColors.axis }}
                        />
                        <YAxis
                          stroke={chartColors.axis}
                          tick={{ fill: chartColors.axis }}
                        />
                        <Tooltip {...tooltipStyle} />
                        {!esMobile && <Legend {...legendStyle} />}
                        <Bar
                          dataKey="totalGenerado"
                          name="Total generado hoy"
                          fill="#d4af37"
                          radius={[8, 8, 0, 0]}
                          animationDuration={900}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardDark>

            <CardDark className="h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="section-title">Comisiones del día</h4>
                  <p className="section-subtitle">
                    Pendiente vs pagado por trabajador
                  </p>
                </div>

                <GoldBadge>{comisiones.length} datos</GoldBadge>
              </div>

              {loadingComisiones ? (
                <p className="section-subtitle mb-0">Cargando gráfico...</p>
              ) : (
                <div className="chart-scroll-mobile">
                  <div
                    className="dashboard-chart-box"
                    style={{
                      width: esMobile
                        ? `${Math.max(comisiones.length * 90, 360)}px`
                        : "100%",
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comisiones}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={chartColors.grid}
                        />
                        <XAxis
                          dataKey="trabajador"
                          stroke={chartColors.axis}
                          interval={0}
                          tick={{ fontSize: 12, fill: chartColors.axis }}
                        />
                        <YAxis
                          stroke={chartColors.axis}
                          tick={{ fill: chartColors.axis }}
                        />
                        <Tooltip {...tooltipStyle} />
                        {!esMobile && <Legend {...legendStyle} />}
                        <Bar
                          dataKey="totalComisionPendiente"
                          name="Pendiente hoy"
                          fill="#f0cf73"
                          radius={[8, 8, 0, 0]}
                          animationDuration={900}
                        />
                        <Bar
                          dataKey="totalComisionPagada"
                          name="Pagada hoy"
                          fill="#22c55e"
                          radius={[8, 8, 0, 0]}
                          animationDuration={900}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardDark>
          </section>

          <section className="dashboard-full-row">
            <CardDark>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="section-title">Ventas por día</h4>
                  <p className="section-subtitle">
                    Evolución semanal de ingresos registrados
                  </p>
                </div>

                <GoldBadge>{ventasPorDia.length} días</GoldBadge>
              </div>

              {loadingVentasDia ? (
                <p className="section-subtitle mb-0">
                  Cargando evolución diaria...
                </p>
              ) : (
                <div className="dashboard-chart-box-large">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ventasPorDiaProcesadas}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={chartColors.grid}
                      />
                      <XAxis
                        dataKey="dia"
                        stroke={chartColors.axis}
                        tick={{ fill: chartColors.axis }}
                        interval={0}
                        minTickGap={0}
                      />
                      <YAxis
                        stroke={chartColors.axis}
                        tick={{ fill: chartColors.axis }}
                      />
                      <Tooltip
                        {...tooltipStyle}
                        labelFormatter={(value, payload) => {
                          if (payload && payload.length > 0) {
                            return `${value} - ${payload[0].payload.fechaReal}`;
                          }

                          return value;
                        }}
                        formatter={(value) => [
                          `S/ ${Number(value).toFixed(2)}`,
                          "Ventas",
                        ]}
                      />
                      <Legend {...legendStyle} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Gráfico semanal"
                        stroke="#c084fc"
                        strokeWidth={3}
                        fill="rgba(192,132,252,0.20)"
                        dot={{ r: 4, fill: "#c084fc" }}
                        activeDot={{ r: 6 }}
                        animationDuration={1000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardDark>
          </section>

          <section className="dashboard-full-row">
            <CardDark>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="section-title">
                    Comisiones del día por trabajador
                  </h4>
                  <p className="section-subtitle">
                    Resumen diario de comisiones pendientes y pagadas
                  </p>
                </div>

                <GoldBadge>{comisiones.length} trabajadores</GoldBadge>
              </div>

              <div className="dashboard-table-compact">
                <TableDark
                  headers={[
                    "Trabajador",
                    "Total generado",
                    "Comisión pendiente",
                    "Comisión pagada",
                    "Acciones",
                  ]}
                >
                  {loadingComisiones ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        Cargando comisiones...
                      </td>
                    </tr>
                  ) : comisiones.length > 0 ? (
                    comisiones.map((c, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: 700 }}>{c.trabajador}</td>
                        <td>S/ {Number(c.totalGenerado || 0).toFixed(2)}</td>
                        <td style={{ color: "#f0cf73", fontWeight: 800 }}>
                          S/{" "}
                          {Number(c.totalComisionPendiente || 0).toFixed(2)}
                        </td>
                        <td style={{ color: "#86efac", fontWeight: 800 }}>
                          S/ {Number(c.totalComisionPagada || 0).toFixed(2)}
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
                              className="btn btn-sm btn-gold"
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
                                  c.totalComisionPendiente > 0
                                    ? "#22c55e"
                                    : "#333",
                                color: "#fff",
                                fontWeight: 800,
                                border: "none",
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
              </div>
            </CardDark>
          </section>
        </div>

        {modalConfirmacion && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              padding: "20px",
            }}
          >
            <CardDark
              style={{
                width: "100%",
                maxWidth: "420px",
              }}
            >
              <h4 className="section-title mb-3">Confirmar acción</h4>

              <p className="section-subtitle" style={{ lineHeight: 1.6 }}>
                {textoConfirmacion}
              </p>

              <div className="d-flex gap-2 justify-content-end mt-4">
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
            </CardDark>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;