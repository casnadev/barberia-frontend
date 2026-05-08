import { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import GoldBadge from "../components/ui/GoldBadge";
import TableDark from "../components/ui/TableDark";
import Toast from "../components/ui/Toast";
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

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Coins,
  ExternalLink,
  ReceiptText,
  Trophy,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

const ModalConfirmacion = ({ abierto, texto, onCancel, onConfirm }) => {
  if (!abierto) return null;

  return (
    <div className="dash-modal-backdrop">
      <div className="dash-modal">
        <div className="dash-modal-header">
          <h4>Confirmar acción</h4>

          <button className="dash-modal-close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="dash-modal-body">
          <p className="section-subtitle dash-modal-text">{texto}</p>

          <div className="dash-modal-actions">
            <button type="button" className="btn btn-dark-outline" onClick={onCancel}>
              Cancelar
            </button>

            <button type="button" className="btn btn-gold" onClick={onConfirm}>
              <CheckCircle2 size={16} />
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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

  const [esMobile, setEsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
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

  const chartColors = {
    gold: "#d4af37",
    goldSoft: "#f0cf73",
    green: "#16a34a",
    red: "#dc2626",
    purple: "#8b5cf6",
    blue: "#2563eb",
    axis: "#6b7280",
    grid: "rgba(15,23,42,0.08)",
    text: "#111827",
    muted: "#6b7280",
    border: "rgba(212,175,55,0.22)",
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "#ffffff",
      border: `1px solid ${chartColors.border}`,
      borderRadius: "14px",
      color: "#111827",
      boxShadow: "0 14px 30px rgba(15,23,42,0.18)",
    },
    labelStyle: { color: "#8b6f10", fontWeight: 900 },
    itemStyle: { color: "#111827", fontWeight: 700 },
  };

  const legendStyle = {
    wrapperStyle: {
      color: chartColors.text,
      paddingTop: "10px",
      fontWeight: 700,
    },
  };

  useEffect(() => {
    const onResize = () => {
      setEsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

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
        `Pago parcial registrado: S/ ${Number(data.totalPagado || monto).toFixed(
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
        `Pago total realizado: S/ ${Number(
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

  const topTrabajadores = dashboard.topTrabajadores || [];

  const totalPendienteComisiones = useMemo(() => {
    return comisiones.reduce(
      (sum, c) => sum + Number(c.totalComisionPendiente || 0),
      0
    );
  }, [comisiones]);

  const totalPagadoComisiones = useMemo(() => {
    return comisiones.reduce(
      (sum, c) => sum + Number(c.totalComisionPagada || 0),
      0
    );
  }, [comisiones]);

  const KpiCard = ({
    title,
    value,
    note,
    variant = "gold",
    icon: KpiIcon,
    loading = false,
    prefix = "S/ ",
    decimals = 2,
    isMoney = true,
    alert = false,
  }) => {
    const numericValue = Number(value || 0);

    return (
      <CardDark className={`dash-kpi-card ${variant} ${alert ? "alert" : ""}`}>
        <div className="dash-kpi-top">

          <div className="dash-kpi-icon">
            {KpiIcon && <KpiIcon size={22} />}
          </div>

          {alert && <span className="dash-kpi-alert-dot" />}
        </div>

        <p>{title}</p>

        <h2>
          {loading ? (
            "Cargando..."
          ) : isMoney ? (
            <AnimatedNumber
              value={numericValue}
              prefix={prefix}
              decimals={decimals}
              duration={850}
            />
          ) : (
            <AnimatedNumber
              value={numericValue}
              decimals={0}
              duration={850}
            />
          )}
        </h2>

        <div className="dash-kpi-note">{note}</div>
      </CardDark>
    );
  };

  return (
    <div className="page-shell dashboard-page">
      <div className="container-fluid py-4">
        <CardDark className="mb-4 dash-header-card">
          <div className="dash-header-row">
            <PageHeader
              title={nombreNegocio || `Bienvenido, ${usuario?.nombre || "Usuario"}`}
              subtitle="Control diario de ventas, comisiones, reservas y utilidad del negocio."
            />

            <div className="dash-header-actions">
              <GoldBadge>{obtenerFechaHoy()}</GoldBadge>

              <button type="button" className="btn btn-gold" onClick={irSitioPublico}>
                <ExternalLink size={16} />
                Ver sitio público
              </button>
            </div>
          </div>
        </CardDark>

        <Toast mensaje={error} tipo="error" onClose={() => setError("")} />
        <Toast
          mensaje={mensajePago}
          tipo={tipoMensajePago === "success" ? "success" : "error"}
          onClose={() => setMensajePago("")}
        />

        <div className="dashboard-admin-container">
          <div className="dashboard-admin-layout">
            <section
              id="resumen-dashboard"
              ref={resumenRef}
              className="dashboard-full-row"
            >
              <div className="dashboard-kpi-grid">
                <KpiCard
                  title="Ventas del día"
                  value={resumenFinanciero.totalVentas || dashboard.totalDia || 0}
                  note="Ingresos generados hoy"
                  variant="gold"
                  icon={TrendingUp}
                  loading={loadingResumen}
                />

                <KpiCard
                  title="Pagos del día"
                  value={resumenFinanciero.totalPagos || 0}
                  note="Comisiones pagadas hoy"
                  variant="success"
                  icon={Wallet}
                />

                <KpiCard
                  title="Gastos del día"
                  value={resumenFinanciero.totalGastos || 0}
                  note="Egresos registrados hoy"
                  variant="danger"
                  icon={ReceiptText}
                />

                <KpiCard
                  title="Utilidad del día"
                  value={resumenFinanciero.utilidad || 0}
                  note={
                    esPositivo
                      ? "Ganancia neta del día"
                      : esNegativo
                        ? "Pérdida registrada hoy"
                        : esCero
                          ? "Sin ganancia ni pérdida"
                          : "Sin datos"
                  }
                  variant={esNegativo ? "danger" : esPositivo ? "success" : "neutral"}
                  icon={Banknote}
                />

                <KpiCard
                  title="Reservas pendientes"
                  value={reservasPendientes}
                  note={reservasPendientes > 0 ? "Citas por confirmar" : "Sin pendientes"}
                  variant="info"
                  icon={CalendarClock}
                  isMoney={false}
                  alert={reservasPendientes > 0}
                />
              </div>
            </section>

            <section className="dashboard-quick-grid">
              <CardDark className="dash-mini-summary">
                <div>
                  <span>Total pendiente</span>
                  <b>S/ {Number(totalPendienteComisiones || 0).toFixed(2)}</b>
                </div>
                <ArrowDownCircle size={28} />
              </CardDark>

              <CardDark className="dash-mini-summary success">
                <div>
                  <span>Total pagado</span>
                  <b>S/ {Number(totalPagadoComisiones || 0).toFixed(2)}</b>
                </div>
                <ArrowUpCircle size={28} />
              </CardDark>

              <CardDark className="dash-mini-summary info">
                <div>
                  <span>Trabajadores con comisión</span>
                  <b>{comisiones.length}</b>
                </div>
                <Coins size={28} />
              </CardDark>
            </section>

            <section className="dashboard-full-row">
              <CardDark className="dash-section-card">
                <div className="dash-section-head">
                  <div>
                    <h4 className="section-title">Top trabajadores del día</h4>
                    <p className="section-subtitle">Ranking diario de ingresos generados.</p>
                  </div>

                  <GoldBadge>{topTrabajadores.length} en ranking</GoldBadge>
                </div>

                {loadingResumen ? (
                  <p className="section-subtitle mb-0">Cargando ranking...</p>
                ) : topTrabajadores.length > 0 ? (
                  <div className="dashboard-worker-grid">
                    {topTrabajadores.slice(0, 6).map((item, index) => (
                      <div className="dashboard-worker-card-pro" key={index}>
                        <div className="dashboard-worker-medal">
                          <Trophy size={18} />
                          #{index + 1}
                        </div>

                        <div className="dashboard-avatar-circle">
                          {String(item.trabajador || "T").charAt(0).toUpperCase()}
                        </div>

                        <div className="dashboard-worker-info">
                          <h5 title={item.trabajador}>{item.trabajador}</h5>
                          <p>Total generado hoy</p>
                          <b>S/ {Number(item.totalGenerado || 0).toFixed(2)}</b>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="section-subtitle mb-0">No hay datos disponibles.</p>
                )}
              </CardDark>
            </section>

            <section className="dashboard-two-cols">
              <CardDark className="h-100 dash-section-card">
                <div className="dash-section-head">
                  <div>
                    <h4 className="section-title">Ventas por trabajador</h4>
                    <p className="section-subtitle">Comparación diaria de ingresos generados.</p>
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
                        width: esMobile ? `${Math.max(comisiones.length * 92, 380)}px` : "100%",
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comisiones}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                          <XAxis
                            dataKey="trabajador"
                            stroke={chartColors.axis}
                            interval={0}
                            tick={{ fontSize: 12, fill: chartColors.axis }}
                          />
                          <YAxis stroke={chartColors.axis} tick={{ fill: chartColors.axis }} />
                          <Tooltip {...tooltipStyle} />
                          {!esMobile && <Legend {...legendStyle} />}
                          <Bar
                            dataKey="totalGenerado"
                            name="Total generado hoy"
                            fill="#d4af37"
                            radius={[10, 10, 0, 0]}
                            animationDuration={900}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardDark>

              <CardDark className="h-100 dash-section-card">
                <div className="dash-section-head">
                  <div>
                    <h4 className="section-title">Comisiones del día</h4>
                    <p className="section-subtitle">Pendiente vs pagado por trabajador.</p>
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
                        width: esMobile ? `${Math.max(comisiones.length * 92, 380)}px` : "100%",
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comisiones}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                          <XAxis
                            dataKey="trabajador"
                            stroke={chartColors.axis}
                            interval={0}
                            tick={{ fontSize: 12, fill: chartColors.axis }}
                          />
                          <YAxis stroke={chartColors.axis} tick={{ fill: chartColors.axis }} />
                          <Tooltip {...tooltipStyle} />
                          {!esMobile && <Legend {...legendStyle} />}
                          <Bar
                            dataKey="totalComisionPendiente"
                            name="Pendiente hoy"
                            fill="#f0cf73"
                            radius={[10, 10, 0, 0]}
                            animationDuration={900}
                          />
                          <Bar
                            dataKey="totalComisionPagada"
                            name="Pagada hoy"
                            fill="#16a34a"
                            radius={[10, 10, 0, 0]}
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
              <CardDark className="dash-section-card">
                <div className="dash-section-head">
                  <div>
                    <h4 className="section-title">Ventas por día</h4>
                    <p className="section-subtitle">Evolución semanal de ingresos registrados.</p>
                  </div>

                  <GoldBadge>{ventasPorDia.length} días</GoldBadge>
                </div>

                {loadingVentasDia ? (
                  <p className="section-subtitle mb-0">Cargando evolución diaria...</p>
                ) : (
                  <div className="dashboard-chart-box-large">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ventasPorDiaProcesadas}>
                        <defs>
                          <linearGradient id="ventasGold" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d4af37" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#d4af37" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis
                          dataKey="dia"
                          stroke={chartColors.axis}
                          tick={{ fill: chartColors.axis }}
                          interval={0}
                          minTickGap={0}
                        />
                        <YAxis stroke={chartColors.axis} tick={{ fill: chartColors.axis }} />
                        <Tooltip
                          {...tooltipStyle}
                          labelFormatter={(value, payload) => {
                            if (payload && payload.length > 0) {
                              return `${value} - ${payload[0].payload.fechaReal}`;
                            }

                            return value;
                          }}
                          formatter={(value) => [`S/ ${Number(value).toFixed(2)}`, "Ventas"]}
                        />
                        <Legend {...legendStyle} />
                        <Area
                          type="monotone"
                          dataKey="total"
                          name="Gráfico semanal"
                          stroke="#d4af37"
                          strokeWidth={3}
                          fill="url(#ventasGold)"
                          dot={{ r: 4, fill: "#d4af37" }}
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
              <CardDark className="dash-section-card">
                <div className="dash-section-head">
                  <div>
                    <h4 className="section-title">Pago de comisiones del día</h4>
                    <p className="section-subtitle">Registra pagos parciales o liquida todo lo pendiente.</p>
                  </div>

                  <GoldBadge>{comisiones.length} trabajadores</GoldBadge>
                </div>

                <div className="dashboard-payments-mobile">
                  {loadingComisiones ? (
                    <p className="section-subtitle mb-0">Cargando comisiones...</p>
                  ) : comisiones.length > 0 ? (
                    comisiones.map((c, index) => (
                      <div className="dash-payment-card" key={index}>
                        <div className="dash-payment-head">
                          <div>
                            <h5>{c.trabajador}</h5>
                            <span>Total generado: S/ {Number(c.totalGenerado || 0).toFixed(2)}</span>
                          </div>

                          <b>S/ {Number(c.totalComisionPendiente || 0).toFixed(2)}</b>
                        </div>

                        <div className="dash-payment-mini-grid">
                          <div>
                            <span>Pendiente</span>
                            <b className="warning">S/ {Number(c.totalComisionPendiente || 0).toFixed(2)}</b>
                          </div>

                          <div>
                            <span>Pagada</span>
                            <b className="success">S/ {Number(c.totalComisionPagada || 0).toFixed(2)}</b>
                          </div>
                        </div>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Monto parcial"
                          className="form-control input-dark"
                          value={montosPago[c.idTrabajador] || ""}
                          onChange={(e) => cambiarMontoPago(c.idTrabajador, e.target.value)}
                          disabled={c.totalComisionPendiente <= 0}
                        />

                        {obtenerMontoPago(c.idTrabajador) > c.totalComisionPendiente && (
                          <small className="dash-payment-error">El monto excede lo pendiente</small>
                        )}

                        <div className="dash-payment-actions">
                          <button
                            className="btn btn-gold"
                            disabled={
                              procesandoPago === c.idTrabajador ||
                              c.totalComisionPendiente <= 0 ||
                              !obtenerMontoPago(c.idTrabajador) ||
                              obtenerMontoPago(c.idTrabajador) <= 0 ||
                              obtenerMontoPago(c.idTrabajador) > c.totalComisionPendiente
                            }
                            onClick={() =>
                              abrirConfirmacion(
                                `¿Confirmar pago parcial a ${c.trabajador}?`,
                                () => pagarParcial(c.idTrabajador, c.totalComisionPendiente)
                              )
                            }
                          >
                            {procesandoPago === c.idTrabajador ? "Procesando..." : "Parcial"}
                          </button>

                          <button
                            className="btn dash-pay-all-btn"
                            disabled={procesandoPago === c.idTrabajador || c.totalComisionPendiente <= 0}
                            onClick={() =>
                              abrirConfirmacion(
                                `¿Pagar todo lo pendiente a ${c.trabajador}?`,
                                () => pagarTodo(c.idTrabajador, c.totalComisionPendiente)
                              )
                            }
                          >
                            {procesandoPago === c.idTrabajador ? "Procesando..." : "Todo"}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="section-subtitle mb-0">No hay comisiones registradas.</p>
                  )}
                </div>

                <div className="dashboard-table-compact">
                  <TableDark
                    headers={[
                      "Trabajador",
                      "Total generado",
                      "Pendiente",
                      "Pagada",
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
                          <td className="dash-table-worker">{c.trabajador}</td>
                          <td>S/ {Number(c.totalGenerado || 0).toFixed(2)}</td>
                          <td className="dash-text-warning">
                            S/ {Number(c.totalComisionPendiente || 0).toFixed(2)}
                          </td>
                          <td className="dash-text-success">
                            S/ {Number(c.totalComisionPagada || 0).toFixed(2)}
                          </td>
                          <td className="dash-table-actions-cell">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Monto"
                              className="form-control input-dark mb-2"
                              value={montosPago[c.idTrabajador] || ""}
                              onChange={(e) => cambiarMontoPago(c.idTrabajador, e.target.value)}
                              disabled={c.totalComisionPendiente <= 0}
                            />

                            <div className="dash-table-actions">
                              <button
                                className="btn btn-sm btn-gold"
                                disabled={
                                  procesandoPago === c.idTrabajador ||
                                  c.totalComisionPendiente <= 0 ||
                                  !obtenerMontoPago(c.idTrabajador) ||
                                  obtenerMontoPago(c.idTrabajador) <= 0 ||
                                  obtenerMontoPago(c.idTrabajador) > c.totalComisionPendiente
                                }
                                onClick={() =>
                                  abrirConfirmacion(
                                    `¿Confirmar pago parcial a ${c.trabajador}?`,
                                    () => pagarParcial(c.idTrabajador, c.totalComisionPendiente)
                                  )
                                }
                              >
                                {procesandoPago === c.idTrabajador ? "Procesando..." : "Parcial"}
                              </button>

                              <button
                                className="btn btn-sm dash-pay-all-btn"
                                disabled={procesandoPago === c.idTrabajador || c.totalComisionPendiente <= 0}
                                onClick={() =>
                                  abrirConfirmacion(
                                    `¿Pagar todo lo pendiente a ${c.trabajador}?`,
                                    () => pagarTodo(c.idTrabajador, c.totalComisionPendiente)
                                  )
                                }
                              >
                                {procesandoPago === c.idTrabajador ? "Procesando..." : "Todo"}
                              </button>
                            </div>

                            {obtenerMontoPago(c.idTrabajador) > c.totalComisionPendiente && (
                              <small className="dash-payment-error">El monto excede lo pendiente</small>
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

          <ModalConfirmacion
            abierto={modalConfirmacion}
            texto={textoConfirmacion}
            onCancel={cerrarConfirmacion}
            onConfirm={confirmarAccion}
          />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
