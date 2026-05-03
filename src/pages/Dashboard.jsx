import { useEffect, useRef, useState, useMemo } from "react";
import API_BASE from "../services/api";
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
import authFetch from "../services/authFetch";

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

  const esMobile =
    typeof window !== "undefined" && window.innerWidth < 768;

  const chartColors = {
    gold: "#c9a227",
    white: "#111827",
    axis: "#6b7280",
    grid: "#e5e7eb",
    dark: "#fff",
    border: "rgba(15,23,42,0.08)",
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "#ffffff",
      border: `1px solid ${chartColors.border}`,
      borderRadius: "10px",
      color: "#111827",
      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
    },
    labelStyle: { color: "#111827" },
    itemStyle: { color: "#111827" },
  };

  const legendStyle = {
    wrapperStyle: {
      color: chartColors.white,
      paddingTop: "10px",
    },
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

      if (!res) return;

      if (!res.ok) {
        const textoError = await res.text();
        console.error("Error resumen financiero:", textoError);
        setError("Error al cargar resumen financiero");
        return;
      }

      const data = await res.json();
      setResumenFinanciero(data);
    } catch (err) {
      console.error(err);
      setError("Error al refrescar resumen financiero");
    }
  };

  const refrescarComisiones = async () => {
    try {
      setLoadingComisiones(true);

      const resComisiones = await authFetch(
        `${API_BASE}/Ventas/comisiones-dia`
      );

      if (!resComisiones) return;

      const dataComisiones = await resComisiones.json();
      setComisiones(dataComisiones);
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

        if (!resDashboard) return;

        if (!resDashboard.ok) {
          const textoError = await resDashboard.text();
          console.error("Error dashboard:", textoError);
          setError("Error al cargar el resumen del dashboard");
          return;
        }

        const dataDashboard = await resDashboard.json();
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

        if (!res) return;

        const data = await res.json();

        const pendientes = data.filter(
          (r) => r.estado === "Pendiente"
        ).length;

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

        if (!res) return;

        if (!res.ok) {
          const textoError = await res.text();
          console.error("Error resumen financiero:", textoError);
          setError("Error al cargar resumen financiero");
          return;
        }

        const data = await res.json();
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

        if (!resVentasPorDia) return;

        const dataVentasPorDia = await resVentasPorDia.json();
        setVentasPorDia(dataVentasPorDia);
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

  useEffect(() => {
    const cargarNegocio = async () => {
      try {
        const res = await authFetch(`${API_BASE}/Negocios/mi-negocio`);

        if (!res) return;

        const data = await res.json();

        if (!res.ok) return;

        localStorage.setItem("slugNegocio", data.slug || "");
        localStorage.setItem("nombreNegocio", data.nombre || "");

        setNombreNegocio(data.nombre || "");
      } catch (err) {
        console.error("Error cargando negocio:", err);
      }
    };

    cargarNegocio();
  }, []);

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

      if (!res) return;

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

      if (!res) return;

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
        <div style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
          Vista pública del negocio
        </div>

        <button
          type="button"
          className="btn btn-gold"
          onClick={irSitioPublico}
        >
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

          @media (min-width: 1200px) {
            .dashboard-admin-layout {
              gap: 0.85rem;
            }

            .dashboard-four-cols {
              gap: 0.85rem;
            }

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

        <div className="dashboard-admin-layout">
          <section
            id="resumen-dashboard"
            ref={resumenRef}
            className="dashboard-full-row"
          >
            <div className="dashboard-four-cols">
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
                    color: "#6b7280",
                  }}
                >
                  {loadingResumen
                    ? "Cargando..."
                    : `S/ ${Number(
                      resumenFinanciero.totalVentas || dashboard.totalDia || 0
                    ).toFixed(2)}`}
                </h2>

                <div
                  className="p-3"
                  style={{
                    background: "rgba(201, 162, 39, 0.08)",
                    borderRadius: "16px",
                    border: "1px solid rgba(201, 162, 39, 0.18)",
                    color: "#8b6f10",
                  }}
                >
                  Rendimiento diario actualizado en tiempo real
                </div>
              </CardDark>

              <CardDark className="h-100">
                <p
                  className="text-uppercase fw-semibold mb-2"
                  style={{
                    color: "#f4d35e",
                    fontSize: "0.85rem",
                    letterSpacing: "1px",
                  }}
                >
                  Pagos del día
                </p>

                <h2
                  className="fw-bold mb-3"
                  style={{
                    fontSize: "2.4rem",
                    color: "#6b7280",
                  }}
                >
                  S/ {Number(resumenFinanciero.totalPagos || 0).toFixed(2)}
                </h2>

                <div
                  className="p-3"
                  style={{
                    background: "rgba(245, 158, 11, 0.08)",
                    borderRadius: "16px",
                    border: "1px solid rgba(245, 158, 11, 0.18)",
                    color: "#92400e",
                  }}
                >
                  Total pagado hoy a trabajadores
                </div>
              </CardDark>

              <CardDark className="h-100">
                <p
                  className="text-uppercase fw-semibold mb-2"
                  style={{
                    color: "#f87171",
                    fontSize: "0.85rem",
                    letterSpacing: "1px",
                  }}
                >
                  Gastos del día
                </p>

                <h2
                  className="fw-bold mb-3"
                  style={{
                    fontSize: "2.4rem",
                    color: "#6b7280",
                  }}
                >
                  S/ {Number(resumenFinanciero.totalGastos || 0).toFixed(2)}
                </h2>

                <div
                  className="p-3"
                  style={{
                    background: "rgba(239, 68, 68, 0.08)",
                    borderRadius: "16px",
                    border: "1px solid rgba(239, 68, 68, 0.18)",
                    color: "#991b1b",
                  }}
                >
                  Total de egresos registrados hoy
                </div>
              </CardDark>

              <CardDark className="h-100">
                <p
                  className="text-uppercase fw-semibold mb-2"
                  style={{
                    color:
                      Number(resumenFinanciero.utilidad || 0) >= 0
                        ? "#4ade80"
                        : "#f87171",
                    fontSize: "0.85rem",
                    letterSpacing: "1px",
                  }}
                >
                  Utilidad del día
                </p>

                <h2
                  className="fw-bold mb-3"
                  style={{
                    fontSize: "2.4rem",
                    color: "#6b7280",
                  }}
                >
                  S/ {Number(resumenFinanciero.utilidad || 0).toFixed(2)}
                </h2>

                <div
                  className="p-3"
                  style={{
                    background: esPositivo
                      ? "rgba(34, 197, 94, 0.08)"
                      : esNegativo
                        ? "rgba(239, 68, 68, 0.08)"
                        : "rgba(156, 163, 175, 0.08)",

                    border: esPositivo
                      ? "1px solid rgba(34, 197, 94, 0.2)"
                      : esNegativo
                        ? "1px solid rgba(239, 68, 68, 0.2)"
                        : "1px solid rgba(156, 163, 175, 0.2)",

                    color: esPositivo
                      ? "#166534"
                      : esNegativo
                        ? "#991b1b"
                        : "#374151",

                    borderRadius: "16px",
                  }}
                >
                  {esPositivo && "Ganancia del negocio hoy"}
                  {esNegativo && "Pérdida del negocio hoy"}
                  {esCero && "Sin ganancia ni pérdida hoy"}
                </div>
              </CardDark>

              <CardDark className="h-100">
                <p
                  className="text-uppercase fw-semibold mb-2"
                  style={{
                    color: "#38bdf8",
                    fontSize: "0.85rem",
                    letterSpacing: "1px",
                  }}
                >
                  Reservas pendientes
                </p>

                <h2
                  className="fw-bold mb-3"
                  style={{
                    fontSize: "2.4rem",
                    color: "#6b7280",
                  }}
                >
                  {reservasPendientes}
                </h2>

                <div
                  className="p-3"
                  style={{
                    background: "rgba(56,189,248,.08)",
                    borderRadius: "16px",
                    border: "1px solid rgba(56,189,248,.18)",
                    color: "#075985",
                  }}
                >
                  Citas pendientes por confirmar
                </div>

                {reservasPendientes > 0 && (
                  <div
                    style={{
                      marginTop: "14px",
                      color: "#0ea5e9",
                      fontWeight: 700,
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
                          Total generado hoy
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
                <>
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
                          <defs>
                            <linearGradient
                              id="ventasTrabajadorGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#f4d35e"
                                stopOpacity={1}
                              />
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
                          <XAxis
                            dataKey="trabajador"
                            stroke={chartColors.axis}
                            interval={0}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis stroke={chartColors.axis} />
                          <Tooltip {...tooltipStyle} />
                          {!esMobile && <Legend {...legendStyle} />}

                          <Bar
                            dataKey="totalGenerado"
                            name="Total generado hoy"
                            fill="url(#ventasTrabajadorGradient)"
                            radius={[8, 8, 0, 0]}
                            animationDuration={900}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {esMobile && (
                    <div className="chart-legend-mobile">
                      <span className="chart-legend-item">
                        <span
                          className="chart-legend-color"
                          style={{ background: "#d4af37" }}
                        ></span>
                        Total generado hoy
                      </span>
                    </div>
                  )}
                </>
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
                <>
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
                          <defs>
                            <linearGradient
                              id="pendienteGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#f8e16c"
                                stopOpacity={1}
                              />
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
                              <stop
                                offset="0%"
                                stopColor="#4ade80"
                                stopOpacity={1}
                              />
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
                          <XAxis
                            dataKey="trabajador"
                            stroke={chartColors.axis}
                            interval={0}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis stroke={chartColors.axis} />
                          <Tooltip {...tooltipStyle} />
                          {!esMobile && <Legend {...legendStyle} />}

                          <Bar
                            dataKey="totalComisionPendiente"
                            name="Pendiente hoy"
                            fill="url(#pendienteGradient)"
                            radius={[8, 8, 0, 0]}
                            animationDuration={900}
                          />

                          <Bar
                            dataKey="totalComisionPagada"
                            name="Pagada hoy"
                            fill="url(#pagadaGradient)"
                            radius={[8, 8, 0, 0]}
                            animationDuration={900}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {esMobile && (
                    <div className="chart-legend-mobile">
                      <span className="chart-legend-item">
                        <span
                          className="chart-legend-color"
                          style={{ background: "#f8e16c" }}
                        ></span>
                        Pendiente hoy
                      </span>

                      <span className="chart-legend-item">
                        <span
                          className="chart-legend-color"
                          style={{ background: "#22c55e" }}
                        ></span>
                        Pagada hoy
                      </span>
                    </div>
                  )}
                </>
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
                      <defs>
                        <linearGradient
                          id="ventasDiaArea"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#c084fc"
                            stopOpacity={0.45}
                          />
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
                        dataKey="dia"
                        stroke={chartColors.axis}
                        interval={0}
                        minTickGap={0}
                      />
                      <YAxis stroke={chartColors.axis} />
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
                        fill="url(#ventasDiaArea)"
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
              </div>
            </CardDark>
          </section>
        </div>

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