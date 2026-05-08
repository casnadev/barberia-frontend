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
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  ReceiptText,
  Search,
  Wallet,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [6, 10, 15, 25];

function Paginador({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mis-pagos-pagination">
      <div className="mis-pagos-pagination-info">
        Mostrando <b>{from}</b> - <b>{to}</b> de <b>{total}</b>
      </div>

      <div className="mis-pagos-pagination-controls">
        <select
          className="form-control input-dark mis-pagos-page-size"
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

        <span className="mis-pagos-page-number">
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

function KpiPago({
  title,
  value,
  note,
  icon: KpiIcon,
  variant = "gold",
  money = true,
}) {
  const IconComponent = KpiIcon;

  return (
    <CardDark className={`mis-pagos-kpi-card ${variant}`}>
      <div className="mis-pagos-kpi-icon">
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

export default function MisPagos() {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroObservacion, setFiltroObservacion] = useState("");
  const [filtroRapidoActivo, setFiltroRapidoActivo] = useState("");
  const [limpiandoActivo, setLimpiandoActivo] = useState(false);

  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    cargarPagos();

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

  const cargarPagos = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await authFetch(`${API_BASE}/Trabajadores/mis-pagos`);

      if (!res) return;

      const data = await leerJsonSeguro(res, []);

      if (!res.ok) {
        setError(data.mensaje || "No se pudieron cargar tus pagos.");
        return;
      }

      setPagos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar tus pagos.");
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
    setFiltroObservacion("");
    setFiltroRapidoActivo("");
    setPagina(1);

    setLimpiandoActivo(true);

    setTimeout(() => {
      setLimpiandoActivo(false);
    }, 400);

    setMensaje("Filtros restablecidos.");
  };

  const pagosFiltrados = useMemo(() => {
    return pagos.filter((p) => {
      const fechaPago = p.fechaPago ? new Date(p.fechaPago) : null;

      if (fechaDesde && fechaPago) {
        const desde = new Date(`${fechaDesde}T00:00:00`);
        if (fechaPago < desde) return false;
      }

      if (fechaHasta && fechaPago) {
        const hasta = new Date(`${fechaHasta}T23:59:59.999`);
        if (fechaPago > hasta) return false;
      }

      if (filtroObservacion.trim()) {
        if (
          !String(p.observacion || "")
            .toLowerCase()
            .includes(filtroObservacion.toLowerCase())
        ) {
          return false;
        }
      }

      return true;
    });
  }, [pagos, fechaDesde, fechaHasta, filtroObservacion]);

  const pagosOrdenados = useMemo(() => {
    return [...pagosFiltrados].sort(
      (a, b) => new Date(b.fechaPago || 0) - new Date(a.fechaPago || 0)
    );
  }, [pagosFiltrados]);

  const pagosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * pageSize;
    return pagosOrdenados.slice(inicio, inicio + pageSize);
  }, [pagosOrdenados, pagina, pageSize]);

  useEffect(() => {
    setPagina(1);
  }, [fechaDesde, fechaHasta, filtroObservacion]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(pagosOrdenados.length / pageSize));
    if (pagina > maxPage) setPagina(maxPage);
  }, [pagosOrdenados.length, pageSize, pagina]);

  const total = useMemo(
    () => pagosFiltrados.reduce((a, p) => a + Number(p.montoPagado || 0), 0),
    [pagosFiltrados]
  );

  const pagoPromedio = useMemo(() => {
    if (pagosFiltrados.length === 0) return 0;
    return total / pagosFiltrados.length;
  }, [pagosFiltrados.length, total]);

  const mayorPago = useMemo(() => {
    if (pagosFiltrados.length === 0) return 0;

    return Math.max(...pagosFiltrados.map((p) => Number(p.montoPagado || 0)));
  }, [pagosFiltrados]);

  const hoy = obtenerFechaLocal(new Date());

  const pagosHoy = useMemo(() => {
    return pagos.filter((p) => String(p.fechaPago || "").slice(0, 10) === hoy);
  }, [pagos, hoy]);

  const totalHoy = useMemo(
    () => pagosHoy.reduce((a, p) => a + Number(p.montoPagado || 0), 0),
    [pagosHoy]
  );

  if (loading) {
    return (
      <div className="page-shell mis-pagos-page">
        <div className="container-fluid py-4">
          <CardDark className="mis-pagos-header-card">
            <PageHeader
              title="Mis pagos"
              subtitle="Cargando pagos recibidos..."
            />
          </CardDark>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell mis-pagos-page">
      <div className="container-fluid py-4">
        <CardDark className="mis-pagos-header-card mb-4">
          <div className="mis-pagos-header-row">
            <PageHeader
              title="Mis pagos"
              subtitle="Revisa los pagos realizados por el administrador."
            />

            <div className="mis-pagos-header-actions">
              <GoldBadge>{pagosFiltrados.length} pagos</GoldBadge>
              <GoldBadge>S/ {total.toFixed(2)} recibido</GoldBadge>
            </div>
          </div>
        </CardDark>

        <CardDark className="mis-pagos-filter-card mb-4">
          <div className="mis-pagos-section-head">
            <div>
              <h4 className="section-title">Filtros</h4>
              <p className="section-subtitle">
                Busca tus pagos por fecha u observación.
              </p>
            </div>

            <div className="mis-pagos-search-badge">
              <Search size={16} />
              {filtroObservacion ? "Búsqueda activa" : "Sin búsqueda"}
            </div>
          </div>

          <div className="mis-pagos-quick-filters">
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

          <div className="mis-pagos-filter-grid">
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
              <label className="label-gold">Observación</label>
              <input
                className="form-control input-dark"
                placeholder="Buscar observación"
                value={filtroObservacion}
                maxLength={120}
                onChange={(e) => {
                  setFiltroObservacion(e.target.value);
                  setFiltroRapidoActivo("");
                }}
              />
            </div>

            <div className="filtro-item">
              <label className="label-gold">Vista</label>
              <input
                className="form-control input-dark"
                value="Pagos recibidos"
                disabled
              />
            </div>
          </div>
        </CardDark>

        <section className="mis-pagos-kpi-grid mb-4">
          <KpiPago
            title="Total recibido"
            value={total}
            note="Pagos filtrados"
            icon={Wallet}
            variant="success"
          />

          <KpiPago
            title="Recibido hoy"
            value={totalHoy}
            note={`${pagosHoy.length} pagos hoy`}
            icon={CalendarDays}
            variant="gold"
          />

          <KpiPago
            title="Pago promedio"
            value={pagoPromedio}
            note="Promedio por pago"
            icon={Banknote}
            variant="info"
          />

          <KpiPago
            title="Mayor pago"
            value={mayorPago}
            note="Pago más alto filtrado"
            icon={ReceiptText}
            variant="purple"
          />
        </section>

        <CardDark className="mis-pagos-section-card">
          <div className="mis-pagos-section-head">
            <div>
              <h4 className="section-title">Historial de pagos</h4>
              <p className="section-subtitle">
                Cada pago registrado viene del módulo de pagos del administrador.
              </p>
            </div>

            <GoldBadge>{pagosOrdenados.length} registros</GoldBadge>
          </div>

          <div className="mis-pagos-mobile-cards">
            {pagosPaginados.length > 0 ? (
              pagosPaginados.map((p, i) => (
                <div className="mis-pagos-history-card" key={`${p.fechaPago}-${i}`}>
                  <div className="mis-pagos-history-top">
                    <div>
                      <h5>S/ {Number(p.montoPagado || 0).toFixed(2)}</h5>
                      <span>
                        {p.fechaPago ? new Date(p.fechaPago).toLocaleString() : "-"}
                      </span>
                    </div>

                    <div className="mis-pagos-history-icon">
                      <Wallet size={20} />
                    </div>
                  </div>

                  <div className="mis-pagos-history-info">
                    <span>Observación</span>
                    <p>{p.observacion || "Pago registrado"}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="mis-pagos-empty-card">
                <Wallet size={34} />
                <p>No hay pagos registrados.</p>
              </div>
            )}
          </div>

          <div className="mis-pagos-table-wrap">
            <TableDark headers={["Fecha", "Monto", "Observación"]}>
              {pagosPaginados.length > 0 ? (
                pagosPaginados.map((p, i) => (
                  <tr key={`${p.fechaPago}-${i}`}>
                    <td>
                      {p.fechaPago ? new Date(p.fechaPago).toLocaleString() : "-"}
                    </td>
                    <td className="mis-pagos-success-cell">
                      S/ {Number(p.montoPagado || 0).toFixed(2)}
                    </td>
                    <td>{p.observacion || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center py-4">
                    No hay pagos registrados.
                  </td>
                </tr>
              )}
            </TableDark>
          </div>

          <Paginador
            page={pagina}
            pageSize={pageSize}
            total={pagosOrdenados.length}
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
