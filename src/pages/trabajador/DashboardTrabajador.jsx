import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

import CardDark from "../../components/ui/CardDark";
import PageHeader from "../../components/ui/PageHeader";
import GoldBadge from "../../components/ui/GoldBadge";
import TableDark from "../../components/ui/TableDark";
import Toast from "../../components/ui/Toast";
import AnimatedNumber from "../../components/ui/AnimatedNumber";
import AvatarCircle from "../../components/ui/AvatarCircle";

import { getImageUrl } from "../../utils/imageUrl";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Scissors,
  Sparkles,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";

function KpiTrabajador({
  title,
  value,
  note,
  icon: KpiIcon,
  variant = "gold",
  money = true,
}) {
  const IconComponent = KpiIcon;

  return (
    <CardDark className={`trab-dash-kpi-card ${variant}`}>
      <div className="trab-dash-kpi-icon">
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

function DashboardTrabajador() {
  const [perfil, setPerfil] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const leerJsonSeguro = async (res, valorDefecto) => {
    try {
      if (!res || !res.ok) return valorDefecto;
      return await res.json();
    } catch {
      return valorDefecto;
    }
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError("");

      const perfilRes = await authFetch(`${API_BASE}/Trabajadores/mi-perfil`);

      if (!perfilRes || !perfilRes.ok) {
        throw new Error("No se pudo cargar el perfil del trabajador");
      }

      const perfilData = await leerJsonSeguro(perfilRes, null);

      const [pagosRes, serviciosRes] = await Promise.all([
        authFetch(`${API_BASE}/Trabajadores/mis-pagos`),
        authFetch(`${API_BASE}/Trabajadores/mis-servicios`),
      ]);

      const pagosData = await leerJsonSeguro(pagosRes, []);
      const serviciosData = await leerJsonSeguro(serviciosRes, []);

      setPerfil(perfilData);
      setPagos(Array.isArray(pagosData) ? pagosData : []);
      setServicios(Array.isArray(serviciosData) ? serviciosData : []);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar tu información.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoy = new Date().toLocaleDateString("en-CA");

  const serviciosHoy = useMemo(
    () =>
      servicios.filter((s) => {
        if (!s.fechaVenta) return false;
        return String(s.fechaVenta).slice(0, 10) === hoy;
      }),
    [servicios, hoy]
  );

  const pagosHoy = useMemo(
    () =>
      pagos.filter((p) => {
        if (!p.fechaPago) return false;
        return String(p.fechaPago).slice(0, 10) === hoy;
      }),
    [pagos, hoy]
  );

  const totalGeneradoHoy = useMemo(
    () => serviciosHoy.reduce((acc, s) => acc + Number(s.subtotal || 0), 0),
    [serviciosHoy]
  );

  const comisionPendiente = useMemo(
    () =>
      servicios.reduce(
        (acc, s) => acc + Number(s.montoComisionPendiente || 0),
        0
      ),
    [servicios]
  );

  const comisionGenerada = useMemo(
    () =>
      servicios.reduce(
        (acc, s) => acc + Number(s.montoComisionCalculado || 0),
        0
      ),
    [servicios]
  );

  const totalPagado = useMemo(
    () => pagos.reduce((acc, p) => acc + Number(p.montoPagado || 0), 0),
    [pagos]
  );

  const totalPagadoHoy = useMemo(
    () => pagosHoy.reduce((acc, p) => acc + Number(p.montoPagado || 0), 0),
    [pagosHoy]
  );

  const ultimosServicios = useMemo(() => {
    return [...servicios]
      .sort((a, b) => new Date(b.fechaVenta || 0) - new Date(a.fechaVenta || 0))
      .slice(0, 8);
  }, [servicios]);

  const ultimosPagos = useMemo(() => {
    return [...pagos]
      .sort((a, b) => new Date(b.fechaPago || 0) - new Date(a.fechaPago || 0))
      .slice(0, 6);
  }, [pagos]);

  const primerServicioHoy = useMemo(() => {
    return [...serviciosHoy].sort(
      (a, b) => new Date(b.fechaVenta || 0) - new Date(a.fechaVenta || 0)
    )[0];
  }, [serviciosHoy]);

  const fotoPerfil = useMemo(() => {
    const foto =
      perfil?.fotoPerfilUrl ||
      perfil?.fotoUrl ||
      perfil?.imagenUrl ||
      perfil?.foto ||
      "";

    return foto ? getImageUrl(foto) : "";
  }, [perfil]);

  if (loading) {
    return (
      <div className="page-shell trab-dash-page">
        <div className="container-fluid py-4">
          <CardDark className="trab-dash-header-card mb-4">
            <PageHeader
              title="Panel del trabajador"
              subtitle="Cargando tu información..."
            />
          </CardDark>

          <div className="trab-dash-skeleton-grid">
            <CardDark className="trab-dash-skeleton" />
            <CardDark className="trab-dash-skeleton" />
            <CardDark className="trab-dash-skeleton" />
            <CardDark className="trab-dash-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell trab-dash-page">
      <div className="container-fluid py-4">
        <CardDark className="trab-dash-header-card mb-4">
          <div className="trab-dash-header-row">
            <PageHeader
              title={`Hola, ${perfil?.nombre || "Trabajador"}`}
              subtitle="Revisa tus servicios, comisiones y pagos del día."
            />

            <div className="trab-dash-header-actions">
              <GoldBadge>{perfil?.porcentajeComision || 0}% comisión</GoldBadge>
              <GoldBadge>{serviciosHoy.length} servicios hoy</GoldBadge>
            </div>
          </div>
        </CardDark>

        {error && (
          <Toast
            mensaje={error}
            tipo="error"
            onClose={() => setError("")}
          />
        )}

        <section className="trab-dash-kpi-grid mb-4">
          <KpiTrabajador
            title="Servicios hoy"
            value={serviciosHoy.length}
            note="Trabajos registrados hoy"
            icon={Scissors}
            variant="info"
            money={false}
          />

          <KpiTrabajador
            title="Generado hoy"
            value={totalGeneradoHoy}
            note="Total de servicios atendidos"
            icon={TrendingUp}
            variant="gold"
          />

          <KpiTrabajador
            title="Comisión pendiente"
            value={comisionPendiente}
            note="Saldo por cobrar"
            icon={Clock}
            variant="warning"
          />

          <KpiTrabajador
            title="Pagado hoy"
            value={totalPagadoHoy}
            note="Pagos recibidos hoy"
            icon={Wallet}
            variant="success"
          />
        </section>

        <section className="trab-dash-actions-grid mb-4">
          <Link to="/trabajador/registrar" className="trab-dash-action-card">
            <div>
              <Scissors size={22} />
            </div>
            <h5>Registrar servicio</h5>
            <p>Marca un trabajo realizado sin salir de tu panel.</p>
          </Link>

          <Link to="/trabajador/reservas" className="trab-dash-action-card">
            <div>
              <CalendarDays size={22} />
            </div>
            <h5>Ver reservas</h5>
            <p>Revisa tus citas pendientes y atendidas.</p>
          </Link>

          <Link to="/trabajador/disponibilidad" className="trab-dash-action-card">
            <div>
              <Clock size={22} />
            </div>
            <h5>Mi horario</h5>
            <p>Ajusta disponibilidad y pausas puntuales.</p>
          </Link>

          <Link to="/trabajador/pagos" className="trab-dash-action-card">
            <div>
              <CreditCard size={22} />
            </div>
            <h5>Mis pagos</h5>
            <p>Consulta pagos recibidos y comisiones.</p>
          </Link>
        </section>

        <div className="trab-dash-main-grid">
          <CardDark className="trab-dash-profile-card">
            <div className="trab-dash-profile-top">
              <AvatarCircle
                src={fotoPerfil}
                alt={perfil?.nombre || "Trabajador"}
                fallback={perfil?.nombre?.charAt(0)?.toUpperCase() || "T"}
                size="lg"
              />

              <div>
                <span>Mi perfil</span>
                <h4>{perfil?.nombre || "Trabajador"}</h4>
                <p>{perfil?.telefono || "Teléfono no registrado"}</p>
              </div>
            </div>

            <div className="trab-dash-profile-badge">
              <Sparkles size={18} />
              {perfil?.porcentajeComision || 0}% de comisión asignada
            </div>

            <div className="trab-dash-profile-stats">
              <div>
                <span>Comisión generada</span>
                <b>S/ {comisionGenerada.toFixed(2)}</b>
              </div>

              <div>
                <span>Total recibido</span>
                <b className="success">S/ {totalPagado.toFixed(2)}</b>
              </div>

              <div>
                <span>Servicios totales</span>
                <b>{servicios.length}</b>
              </div>
            </div>
          </CardDark>

          <CardDark className="trab-dash-highlight-card">
            <div className="trab-dash-highlight-icon">
              <CheckCircle2 size={28} />
            </div>

            <span>Último servicio de hoy</span>

            {primerServicioHoy ? (
              <>
                <h4>{primerServicioHoy.servicio || "Servicio"}</h4>
                <p>
                  {primerServicioHoy.fechaVenta
                    ? new Date(primerServicioHoy.fechaVenta).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}{" "}
                  · Comisión S/{" "}
                  {Number(primerServicioHoy.montoComisionCalculado || 0).toFixed(2)}
                </p>
              </>
            ) : (
              <>
                <h4>Aún sin servicios hoy</h4>
                <p>Cuando completes un servicio, aparecerá aquí.</p>
              </>
            )}

            <Link to="/trabajador/registrar" className="btn btn-gold w-100 mt-3">
              Registrar nuevo servicio
            </Link>
          </CardDark>
        </div>

        <div className="trab-dash-list-grid mt-4">
          <CardDark className="trab-dash-list-card">
            <div className="trab-dash-section-head">
              <div>
                <h4 className="section-title">Últimos servicios</h4>
                <p className="section-subtitle">
                  Trabajos registrados recientemente.
                </p>
              </div>

              <GoldBadge>{servicios.length} registros</GoldBadge>
            </div>

            <div className="trab-dash-service-cards">
              {ultimosServicios.length > 0 ? (
                ultimosServicios.map((s, i) => (
                  <div className="trab-dash-service-card" key={`${s.fechaVenta}-${i}`}>
                    <div className="trab-dash-service-time">
                      {s.fechaVenta
                        ? new Date(s.fechaVenta).toLocaleDateString()
                        : "-"}
                    </div>

                    <div className="trab-dash-service-info">
                      <h5>{s.servicio || "Servicio"}</h5>
                      <p>
                        Subtotal S/ {Number(s.subtotal || 0).toFixed(2)} · Comisión S/{" "}
                        {Number(s.montoComisionCalculado || 0).toFixed(2)}
                      </p>
                    </div>

                    <span
                      className={`trab-dash-status ${
                        Number(s.montoComisionPendiente || 0) > 0 ? "pending" : "paid"
                      }`}
                    >
                      {s.estadoPago || (Number(s.montoComisionPendiente || 0) > 0 ? "Pendiente" : "Pagado")}
                    </span>
                  </div>
                ))
              ) : (
                <div className="trab-dash-empty">
                  <Scissors size={34} />
                  <p>Aún no registraste servicios.</p>
                </div>
              )}
            </div>

            <div className="trab-dash-table-wrap">
              <TableDark
                headers={[
                  "Fecha",
                  "Servicio",
                  "Subtotal",
                  "Comisión",
                  "Pendiente",
                  "Estado",
                ]}
              >
                {ultimosServicios.length > 0 ? (
                  ultimosServicios.slice(0, 6).map((s, i) => (
                    <tr key={i}>
                      <td>
                        {s.fechaVenta
                          ? new Date(s.fechaVenta).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="trab-dash-table-name">{s.servicio || "-"}</td>
                      <td>S/ {Number(s.subtotal || 0).toFixed(2)}</td>
                      <td className="trab-dash-success-cell">
                        S/ {Number(s.montoComisionCalculado || 0).toFixed(2)}
                      </td>
                      <td className="trab-dash-warning-cell">
                        S/ {Number(s.montoComisionPendiente || 0).toFixed(2)}
                      </td>
                      <td>{s.estadoPago || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      Aún no registraste servicios.
                    </td>
                  </tr>
                )}
              </TableDark>
            </div>
          </CardDark>

          <CardDark className="trab-dash-list-card">
            <div className="trab-dash-section-head">
              <div>
                <h4 className="section-title">Últimos pagos</h4>
                <p className="section-subtitle">
                  Pagos realizados por el administrador.
                </p>
              </div>

              <GoldBadge>{pagos.length} pagos</GoldBadge>
            </div>

            <div className="trab-dash-payment-cards">
              {ultimosPagos.length > 0 ? (
                ultimosPagos.map((p, i) => (
                  <div className="trab-dash-payment-card" key={`${p.fechaPago}-${i}`}>
                    <div>
                      <h5>S/ {Number(p.montoPagado || 0).toFixed(2)}</h5>
                      <span>
                        {p.fechaPago ? new Date(p.fechaPago).toLocaleString() : "-"}
                      </span>
                      <p>{p.observacion || "Pago registrado"}</p>
                    </div>

                    <div className="trab-dash-payment-icon">
                      <Wallet size={20} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="trab-dash-empty">
                  <Wallet size={34} />
                  <p>Aún no tienes pagos registrados.</p>
                </div>
              )}
            </div>

            <div className="trab-dash-table-wrap">
              <TableDark headers={["Fecha", "Monto", "Observación"]}>
                {ultimosPagos.length > 0 ? (
                  ultimosPagos.slice(0, 5).map((p, i) => (
                    <tr key={i}>
                      <td>
                        {p.fechaPago
                          ? new Date(p.fechaPago).toLocaleString()
                          : "-"}
                      </td>
                      <td className="trab-dash-success-cell">
                        S/ {Number(p.montoPagado || 0).toFixed(2)}
                      </td>
                      <td>{p.observacion || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center py-4">
                      Aún no tienes pagos registrados.
                    </td>
                  </tr>
                )}
              </TableDark>
            </div>
          </CardDark>
        </div>
      </div>
    </div>
  );
}

export default DashboardTrabajador;
