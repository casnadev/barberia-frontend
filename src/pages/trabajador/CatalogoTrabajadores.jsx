import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import API_BASE from "../../services/api";

import CardDark from "../../components/ui/CardDark";
import GoldBadge from "../../components/ui/GoldBadge";

export default function CatalogoTrabajadores() {
  const { idNegocio } = useParams();
  const navigate = useNavigate();

  const [trabajadores, setTrabajadores] = useState([]);
  const [negocio, setNegocio] = useState(null);
  const [redesSociales, setRedesSociales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroRating, setFiltroRating] = useState("todos");
  const [orden, setOrden] = useState("rating");

  const [searchParams] = useSearchParams();
  const idServicio = searchParams.get("servicio");

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resTrabajadores, resNegocio] = await Promise.all([
          fetch(`${API_BASE}/Trabajadores/catalogo-publico/${idNegocio}`),
          fetch(`${API_BASE}/Negocios/publico/${idNegocio}`),
        ]);

        if (!resTrabajadores.ok) {
          throw new Error("Error al cargar trabajadores");
        }

        const dataTrabajadores = await resTrabajadores.json();
        setTrabajadores(dataTrabajadores || []);

        if (resNegocio.ok) {
          const dataNegocio = await resNegocio.json();
          setNegocio(dataNegocio.negocio || null);
          setRedesSociales(dataNegocio.redesSociales || []);
        }
      } catch (err) {
        console.error("Error fetching trabajadores:", err);
      } finally {
        setLoading(false);
      }
    };

    if (idNegocio) cargar();
  }, [idNegocio]);

  const trabajadoresProcesados = useMemo(() => {
    let data = [...trabajadores];

    if (filtroRating === "4") {
      data = data.filter((t) => Number(t.calificacionPromedio || 0) >= 4);
    } else if (filtroRating === "45") {
      data = data.filter((t) => Number(t.calificacionPromedio || 0) >= 4.5);
    }

    data.sort((a, b) => {
      if (orden === "rating") {
        return Number(b.calificacionPromedio || 0) - Number(a.calificacionPromedio || 0);
      }

      if (orden === "servicios") {
        return Number(b.totalServiciosRealizados || 0) - Number(a.totalServiciosRealizados || 0);
      }

      if (orden === "nombre") {
        return (a.nombre || "").localeCompare(b.nombre || "");
      }

      return 0;
    });

    return data;
  }, [trabajadores, filtroRating, orden]);

  const destacados = useMemo(() => {
    return trabajadoresProcesados
      .filter(
        (t) =>
          t.distincion ||
          Number(t.calificacionPromedio || 0) >= 4.8 ||
          Number(t.totalServiciosRealizados || 0) >= 50
      )
      .slice(0, 3);
  }, [trabajadoresProcesados]);

  const obtenerBadgeExtra = (t) => {
    if (t.distincion) return `🏆 ${t.distincion}`;
    if (Number(t.calificacionPromedio || 0) >= 4.8) return "⭐ Mejor valorado";
    if (Number(t.totalServiciosRealizados || 0) >= 50) return "🔥 Más solicitado";
    return null;
  };

  const iconoRed = (tipo) => {
    switch (tipo) {
      case "facebook":
        return "f";
      case "instagram":
        return "◎";
      case "tiktok":
        return "♪";
      case "youtube":
        return "▶";
      case "whatsapp":
        return "☎";
      default:
        return "🔗";
    }
  };

  const renderHeader = (subtitulo) => (
    <div className="container py-4">
      <button
        onClick={() => navigate(-1)}
        style={{
          background: "none",
          border: "none",
          color: "#d4af37",
          fontWeight: "700",
          fontSize: "14px",
          marginBottom: "10px",
          cursor: "pointer",
        }}
      >
        ← Volver
      </button>

      <CardDark className="p-4 mb-2">
        <span className="paso-indicador mb-3">Paso 2 de 3</span>

        <h2 className="page-title mb-2">Elige tu barbero</h2>

        <p className="page-subtitle">{subtitulo}</p>
      </CardDark>
    </div>
  );

  const renderFooter = () => (
    <footer className="landing-footer-simple">
      {redesSociales.length > 0 && (
        <div className="footer-social">
          {redesSociales.map((r) => (
            <a
              key={r.idRedSocial}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              aria-label={r.tipo}
            >
              {iconoRed(r.tipo)}
            </a>
          ))}
        </div>
      )}

      <p>
        <strong>{negocio?.nombre || "Negocio"}</strong> | © 2026 Todos los derechos reservados
      </p>
    </footer>
  );

  const renderCard = (t) => {
    const baseUrl = API_BASE.replace("/api", "");
    const foto = t.fotoPerfilUrl
      ? `${baseUrl}${t.fotoPerfilUrl.startsWith("/") ? "" : "/"}${t.fotoPerfilUrl}`
      : "https://via.placeholder.com/400x400?text=Sin+Foto";

    const badgeExtra = obtenerBadgeExtra(t);

    return (
      <div className="col-md-6 col-lg-4" key={t.idTrabajador}>
        <CardDark className="h-100 d-flex flex-column text-center p-4">
          <div
            style={{
              height: "42px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            {badgeExtra && (
              <span
                style={{
                  background: "rgba(212,175,55,.14)",
                  border: "1px solid rgba(212,175,55,.35)",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  color: "#d4af37",
                  fontWeight: 700,
                  fontSize: ".82rem",
                }}
              >
                {badgeExtra}
              </span>
            )}
          </div>

          <div className="position-relative d-inline-block mx-auto">
            <img
              src={foto}
              alt={t.nombre}
              style={{
                width: "150px",
                height: "150px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "4px solid #d4af37",
              }}
            />
          </div>

          <h3 className="mt-4 mb-2">{t.nombre}</h3>

          <h5 style={{ color: "#f0cf73", marginBottom: "4px" }}>
            ⭐ {Number(t.calificacionPromedio || 0).toFixed(1)}
          </h5>

          <p className="text-muted small" style={{ marginBottom: "20px" }}>
            {t.totalResenas || 0} reseñas
          </p>

          <p style={{ minHeight: "72px", lineHeight: "1.6", marginBottom: "20px" }}>
            {t.descripcion || "Profesional disponible para atención."}
          </p>

          <p style={{ marginBottom: "28px" }}>
            <b style={{ color: "#d4af37" }}>{t.totalServiciosRealizados || 0}</b>{" "}
            servicios realizados
          </p>

          <div className="mt-auto">
            <Link
              to={`/reservar/${t.idTrabajador}?servicio=${idServicio}&negocio=${idNegocio}`}
              className="btn btn-gold w-100"
            >
              Elegir barbero
            </Link>

          </div>
        </CardDark>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page-shell">
        {renderHeader("Cargando profesionales disponibles...")}
      </div>
    );
  }

  return (
    <div className="page-shell">
      {renderHeader(
        negocio?.nombre
          ? `Selecciona el barbero que prefieras en ${negocio.nombre}.`
          : "Selecciona el barbero que prefieras."
      )}

      <div className="container pt-1 pb-4">
        {destacados.length > 0 && (
          <section className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <h3 className="section-title">Destacados</h3>
                <p className="section-subtitle">Profesionales con mejor desempeño</p>
              </div>

              <GoldBadge>{destacados.length} destacados</GoldBadge>
            </div>

            <div className="row g-4">{destacados.map(renderCard)}</div>
          </section>
        )}

        <CardDark className="mb-4 p-4">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label" style={{ color: "#d4af37" }}>
                Filtrar por calificación
              </label>

              <select
                className="form-select input-dark"
                value={filtroRating}
                onChange={(e) => setFiltroRating(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="4">Desde 4.0 estrellas</option>
                <option value="45">Desde 4.5 estrellas</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label" style={{ color: "#d4af37" }}>
                Ordenar por
              </label>

              <select
                className="form-select input-dark"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
              >
                <option value="rating">Mejor calificación</option>
                <option value="servicios">Más servicios realizados</option>
                <option value="nombre">Nombre</option>
              </select>
            </div>
          </div>
        </CardDark>

        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h3 className="section-title">Todos los profesionales</h3>
            <p className="section-subtitle">Selecciona el trabajador que prefieras</p>
          </div>

          <GoldBadge>{trabajadoresProcesados.length} resultados</GoldBadge>
        </div>

        <div className="row g-4">
          {trabajadoresProcesados.length > 0 ? (
            trabajadoresProcesados.map(renderCard)
          ) : (
            <div className="col-12">
              <CardDark className="p-5 text-center">
                <p className="mb-0">No hay profesionales que coincidan con el filtro.</p>
              </CardDark>
            </div>
          )}
        </div>
      </div>

      {renderFooter()}
    </div>
  );
}