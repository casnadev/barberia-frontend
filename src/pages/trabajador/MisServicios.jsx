import { useEffect, useMemo, useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

import CardDark from "../../components/ui/CardDark";
import PageHeader from "../../components/ui/PageHeader";
import GoldBadge from "../../components/ui/GoldBadge";
import TableDark from "../../components/ui/TableDark";
import Toast from "../../components/ui/Toast";
import DateFilter from "../../components/ui/DateFilter";
import AnimatedNumber from "../../components/ui/AnimatedNumber";

import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  ReceiptText,
  Scissors,
  Search,
  Wallet,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [6, 10, 15, 25];

function Paginador({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mis-serv-pagination">
      <div className="mis-serv-pagination-info">
        Mostrando <b>{from}</b> - <b>{to}</b> de <b>{total}</b>
      </div>

      <div className="mis-serv-pagination-controls">
        <select
          className="form-control input-dark mis-serv-page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} por página
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-dark-outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>

        <span className="mis-serv-page-number">
          {page} / {totalPages}
        </span>

        <button
          type="button"
          className="btn btn-dark-outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function KpiServicio({
  title,
  value,
  note,
  icon: KpiIcon,
  variant = "gold",
  money = true,
}) {
  const IconComponent = KpiIcon;

  return (
    <CardDark className={`mis-serv-kpi-card ${variant}`}>
      <div className="mis-serv-kpi-icon">
        {IconComponent && <IconComponent size={22} />}
      </div>

      <p>{title}</p>

      <h2>
        {money ? (
          <AnimatedNumber value={Number(value || 0)} prefix="S/ " decimals={2} />
        ) : (
          <AnimatedNumber value={Number(value || 0)} decimals={0} />
        )}
      </h2>

      <span>{note}</span>
    </CardDark>
  );
}

export default function MisServicios() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroServicio, setFiltroServicio] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroRapidoActivo, setFiltroRapidoActivo] = useState("");
  const [limpiandoActivo, setLimpiandoActivo] = useState(false);

  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const leerJsonSeguro = async (res, valorDefecto) => {
    try {
      if (!res) return valorDefecto;
      return await res.json();
    } catch {
      return valorDefecto;
    }
  };

  useEffect(() => {
    cargarServicios();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarServicios = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await authFetch(`${API_BASE}/Trabajadores/mis-servicios`);

      if (!res) return;

      const data = await leerJsonSeguro(res, []);

      if (!res.ok) {
        setError(data.mensaje || "No se pudieron cargar tus servicios.");
        return;
      }

      setServicios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar tus servicios.");
    } finally {
      setLoading(false);
    }
  };

  const obtenerFechaLocal = (fecha) => {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(fecha.getDate()).padStart(2, "0")}`;
  };

  const aplicarFiltroHoy = () => {
    const hoy = obtenerFechaLocal(new Date());

    setFechaDesde(hoy);
    setFechaHasta(hoy);
    setFiltroRapidoActivo("hoy");
    setPagina(1);
  };

  const aplicarFiltroSemana = () => {
    const hoy = new Date();
    const dia = hoy.getDay();
    const ajuste = dia === 0 ? 6 : dia - 1;

    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ajuste);

    setFechaDesde(obtenerFechaLocal(lunes));
    setFechaHasta(obtenerFechaLocal(hoy));
    setFiltroRapidoActivo("semana");
    setPagina(1);
  };

  const aplicarFiltroMes = () => {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    setFechaDesde(obtenerFechaLocal(inicio));
    setFechaHasta(obtenerFechaLocal(hoy));
    setFiltroRapidoActivo("mes");
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setFiltroServicio("");
    setFiltroEstado("");
    setFiltroRapidoActivo("");
    setPagina(1);

    setLimpiandoActivo(true);

    setTimeout(() => {
      setLimpiandoActivo(false);
    }, 400);

    setMensaje("Filtros restablecidos.");
  };

  const serviciosFiltrados = useMemo(() => {
    return servicios.filter((s) => {
      const fechaVenta = s.fechaVenta ? new Date(s.fechaVenta) : null;

      if (fechaDesde && fechaVenta) {
        const desde = new Date(`${fechaDesde}T00:00:00`);
        if (fechaVenta < desde) return false;
      }

      if (fechaHasta && fechaVenta) {
        const hasta = new Date(`${fechaHasta}T23:59:59.999`);
        if (fechaVenta > hasta) return false;
      }

      if (filtroServicio.trim()) {
        if (
          !String(s.servicio || "")
            .toLowerCase()
            .includes(filtroServicio.toLowerCase())
        ) {
          return false;
        }
      }

      if (filtroEstado) {
        if (String(s.estadoPago || "").toLowerCase() !== filtroEstado.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [servicios, fechaDesde, fechaHasta, filtroServicio, filtroEstado]);

  const serviciosOrdenados = useMemo(() => {
    return [...serviciosFiltrados].sort(
      (a, b) => new Date(b.fechaVenta || 0) - new Date(a.fechaVenta || 0)
    );
  }, [serviciosFiltrados]);

  const serviciosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * pageSize;
    return serviciosOrdenados.slice(inicio, inicio + pageSize);
  }, [serviciosOrdenados, pagina, pageSize]);

  useEffect(() => {
    setPagina(1);
  }, [fechaDesde, fechaHasta, filtroServicio, filtroEstado]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(serviciosOrdenados.length / pageSize));
    if (pagina > maxPage) setPagina(maxPage);
  }, [serviciosOrdenados.length, pageSize, pagina]);

  const totalSubtotal = useMemo(
    () => serviciosFiltrados.reduce((acc, s) => acc + Number(s.subtotal || 0), 0),
    [serviciosFiltrados]
  );

  const totalComision = useMemo(
    () =>
      serviciosFiltrados.reduce(
        (acc, s) => acc + Number(s.montoComisionCalculado || 0),
        0
      ),
    [serviciosFiltrados]
  );

  const totalPagado = useMemo(
    () =>
      serviciosFiltrados.reduce(
        (acc, s) => acc + Number(s.montoComisionPagado || 0),
        0
      ),
    [serviciosFiltrados]
  );

  const totalPendiente = useMemo(
    () =>
      serviciosFiltrados.reduce(
        (acc, s) => acc + Number(s.montoComisionPendiente || 0),
        0
      ),
    [serviciosFiltrados]
  );

  const estadosDisponibles = useMemo(() => {
    return Array.from(
      new Set(servicios.map((s) => s.estadoPago).filter(Boolean))
    );
  }, [servicios]);

  if (loading) {
    return (
      <div className="page-shell mis-serv-page">
        <div className="container-fluid py-4">
          <CardDark className="mis-serv-header-card">
            <PageHeader
              title="Mis servicios"
              subtitle="Cargando tu historial..."
            />
          </CardDark>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell mis-serv-page">
      <div className="container-fluid py-4">
        <CardDark className="mis-serv-header-card mb-4">
          <div className="mis-serv-header-row">
            <PageHeader
              title="Mis servicios"
              subtitle="Historial de servicios registrados con tus comisiones y pagos."
            />

            <div className="mis-serv-header-actions">
              <GoldBadge>{serviciosFiltrados.length} registros</GoldBadge>
              <GoldBadge>S/ {totalComision.toFixed(2)} comisión</GoldBadge>
            </div>
          </div>
        </CardDark>

        <CardDark className="mis-serv-filter-card mb-4">
          <div className="mis-serv-section-head">
            <div>
              <h4 className="section-title">Filtros</h4>
              <p className="section-subtitle">
                Revisa tus servicios por fecha, nombre o estado de pago.
              </p>
            </div>

            <div className="mis-serv-search-badge">
              <Search size={16} />
              {filtroServicio || filtroEstado ? "Búsqueda activa" : "Sin búsqueda"}
            </div>
          </div>

          <div className="mis-serv-quick-filters">
            <button
              className={`btn ${filtroRapidoActivo === "hoy" ? "btn-gold" : "btn-dark-outline"}`}
              onClick={aplicarFiltroHoy}
            >
              Hoy
            </button>

            <button
              className={`btn ${filtroRapidoActivo === "semana" ? "btn-gold" : "btn-dark-outline"}`}
              onClick={aplicarFiltroSemana}
            >
              Semana
            </button>

            <button
              className={`btn ${filtroRapidoActivo === "mes" ? "btn-gold" : "btn-dark-outline"}`}
              onClick={aplicarFiltroMes}
            >
              Mes
            </button>

            <button
              className={`btn ${limpiandoActivo ? "btn-gold" : "btn-dark-outline"}`}
              onClick={limpiarFiltros}
            >
              <Eraser size={16} />
              {limpiandoActivo ? "Limpiando..." : "Limpiar"}
            </button>
          </div>

          <div className="mis-serv-filter-grid">
            <div className="filtro-item">
              <DateFilter
                label="Desde"
                value={fechaDesde}
                onChange={(valor) => {
                  setFechaDesde(valor);
                  setFiltroRapidoActivo("");
                }}
              />
            </div>

            <div className="filtro-item">
              <DateFilter
                label="Hasta"
                value={fechaHasta}
                onChange={(valor) => {
                  setFechaHasta(valor);
                  setFiltroRapidoActivo("");
                }}
                minDate={fechaDesde}
              />
            </div>

            <div className="filtro-item">
              <label className="label-gold">Servicio</label>
              <input
                className="form-control input-dark"
                placeholder="Buscar servicio"
                value={filtroServicio}
                maxLength={120}
                onChange={(e) => {
                  setFiltroServicio(e.target.value);
                  setFiltroRapidoActivo("");
                }}
              />
            </div>

            <div className="filtro-item">
              <label className="label-gold">Estado</label>
              <select
                className="form-control input-dark"
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setFiltroRapidoActivo("");
                }}
              >
                <option value="">Todos</option>
                {estadosDisponibles.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardDark>

        <section className="mis-serv-kpi-grid mb-4">
          <KpiServicio
            title="Total generado"
            value={totalSubtotal}
            note="Servicios filtrados"
            icon={Banknote}
            variant="gold"
          />

          <KpiServicio
            title="Comisión generada"
            value={totalComision}
            note="Comisión calculada"
            icon={Scissors}
            variant="info"
          />

          <KpiServicio
            title="Comisión pagada"
            value={totalPagado}
            note="Ya recibido"
            icon={Wallet}
            variant="success"
          />

          <KpiServicio
            title="Pendiente"
            value={totalPendiente}
            note="Saldo por cobrar"
            icon={Clock}
            variant="warning"
          />
        </section>

        <CardDark className="mis-serv-section-card">
          <div className="mis-serv-section-head">
            <div>
              <h4 className="section-title">Historial</h4>
              <p className="section-subtitle">
                Cada servicio registrado alimenta tus comisiones y pagos.
              </p>
            </div>

            <GoldBadge>{serviciosOrdenados.length} servicios</GoldBadge>
          </div>

          <div className="mis-serv-mobile-cards">
            {serviciosPaginados.length > 0 ? (
              serviciosPaginados.map((s, i) => {
                const pendiente = Number(s.montoComisionPendiente || 0);

                return (
                  <div className="mis-serv-history-card" key={`${s.fechaVenta}-${i}`}>
                    <div className="mis-serv-history-top">
                      <div>
                        <h5>{s.servicio || "Servicio"}</h5>
                        <span>
                          {s.fechaVenta ? new Date(s.fechaVenta).toLocaleString() : "-"}
                        </span>
                      </div>

                      <b>S/ {Number(s.subtotal || 0).toFixed(2)}</b>
                    </div>

                    <div className="mis-serv-history-grid">
                      <div>
                        <span>Cantidad</span>
                        <b>{s.cantidad}</b>
                      </div>

                      <div>
                        <span>Comisión</span>
                        <b>S/ {Number(s.montoComisionCalculado || 0).toFixed(2)}</b>
                      </div>

                      <div>
                        <span>Pagado</span>
                        <b className="success">
                          S/ {Number(s.montoComisionPagado || 0).toFixed(2)}
                        </b>
                      </div>

                      <div>
                        <span>Pendiente</span>
                        <b className={pendiente > 0 ? "warning" : "success"}>
                          S/ {pendiente.toFixed(2)}
                        </b>
                      </div>
                    </div>

                    <span className={`mis-serv-status ${pendiente > 0 ? "pending" : "paid"}`}>
                      {s.estadoPago || (pendiente > 0 ? "Pendiente" : "Pagado")}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="mis-serv-empty-card">
                <ReceiptText size={34} />
                <p>Aún no registraste servicios.</p>
              </div>
            )}
          </div>

          <div className="mis-serv-table-wrap">
            <TableDark
              headers={[
                "Fecha",
                "Servicio",
                "Cantidad",
                "Subtotal",
                "Comisión",
                "Pagado",
                "Pendiente",
                "Estado",
              ]}
            >
              {serviciosPaginados.length > 0 ? (
                serviciosPaginados.map((s, i) => {
                  const pendiente = Number(s.montoComisionPendiente || 0);

                  return (
                    <tr key={`${s.fechaVenta}-${i}`}>
                      <td>
                        {s.fechaVenta ? new Date(s.fechaVenta).toLocaleString() : "-"}
                      </td>
                      <td className="mis-serv-table-name">{s.servicio || "-"}</td>
                      <td>{s.cantidad}</td>
                      <td>S/ {Number(s.subtotal || 0).toFixed(2)}</td>
                      <td className="mis-serv-info-cell">
                        S/ {Number(s.montoComisionCalculado || 0).toFixed(2)}
                      </td>
                      <td className="mis-serv-success-cell">
                        S/ {Number(s.montoComisionPagado || 0).toFixed(2)}
                      </td>
                      <td className={pendiente > 0 ? "mis-serv-warning-cell" : "mis-serv-success-cell"}>
                        S/ {pendiente.toFixed(2)}
                      </td>
                      <td>
                        <span className={`mis-serv-status ${pendiente > 0 ? "pending" : "paid"}`}>
                          {s.estadoPago || (pendiente > 0 ? "Pendiente" : "Pagado")}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    Aún no registraste servicios.
                  </td>
                </tr>
              )}
            </TableDark>
          </div>

          <Paginador
            page={pagina}
            pageSize={pageSize}
            total={serviciosOrdenados.length}
            onPageChange={setPagina}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPagina(1);
            }}
          />
        </CardDark>

        <Toast
          mensaje={mensaje || error}
          tipo={error ? "error" : "success"}
          onClose={() => {
            setMensaje("");
            setError("");
          }}
        />
      </div>
    </div>
  );
}
