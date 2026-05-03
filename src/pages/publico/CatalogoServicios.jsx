import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_BASE from "../../services/api";

import CardDark from "../../components/ui/CardDark";

export default function CatalogoServicios() {
  const { idNegocio } = useParams();
  const navigate = useNavigate();

  const [servicios, setServicios] = useState([]);
  const [negocio, setNegocio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarServicios = async () => {
      try {
        const res = await fetch(`${API_BASE}/Negocios/publico/${idNegocio}`);

        if (!res.ok) {
          throw new Error("No se pudo cargar el catálogo de servicios");
        }

        const data = await res.json();

        setNegocio(data.negocio || null);
        setServicios(data.servicios || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (idNegocio) cargarServicios();
  }, [idNegocio]);

  const elegirServicio = (idServicio) => {
    navigate(`/catalogo-trabajadores/${idNegocio}?servicio=${idServicio}`);
  };

  // ✅ LOADING CORRECTO (SIN PARPADEO FEO)
  if (loading) {
    return (
      <div className="page-shell">
        <div className="container py-4">

          {/* 🔥 BOTÓN VOLVER (VISIBLE SIEMPRE) */}
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
            <span className="paso-indicador mb-3">Paso 1 de 3</span>

            <h2 className="page-title mb-2">Elige tu servicio</h2>

            <p className="page-subtitle">
              Cargando servicios disponibles...
            </p>
          </CardDark>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">

      <div className="container py-4">

        {/* 🔥 BOTÓN VOLVER ARRIBA (FIJO Y VISIBLE) */}
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
          <span className="paso-indicador mb-3">Paso 1 de 3</span>

          <h2 className="page-title mb-2">Elige tu servicio</h2>

          <p className="page-subtitle">
            {negocio?.nombre
              ? `Selecciona el servicio que deseas reservar en ${negocio.nombre}.`
              : "Selecciona el servicio que deseas reservar."}
          </p>
        </CardDark>
      </div>

      <div className="container pt-1 pb-4">
        <div className="row g-4">
          {servicios.length > 0 ? (
            servicios.map((s) => {
              const imagen = s.imagenUrl
                ? `${API_BASE.replace("/api", "")}${s.imagenUrl}`
                : null;

              return (
                <div key={s.idServicio} className="col-md-6 col-lg-4">
                  <CardDark className="h-100 d-flex flex-column p-3">

                    {imagen ? (
                      <img
                        src={imagen}
                        alt={s.nombre}
                        style={{
                          width: "100%",
                          height: "200px",
                          objectFit: "cover",
                          borderRadius: "16px",
                          marginBottom: "14px",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "200px",
                          borderRadius: "16px",
                          marginBottom: "14px",
                          background: "rgba(212,175,55,.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "50px",
                          color: "#d4af37",
                        }}
                      >
                        ✂
                      </div>
                    )}

                    <h4 className="section-title mb-2">{s.nombre}</h4>

                    <p className="section-subtitle" style={{ minHeight: "48px" }}>
                      {s.descripcionCorta ||
                        "Servicio profesional con atención personalizada."}
                    </p>

                    <div className="mt-3 mb-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Costo</span>
                        <strong style={{ color: "#d4af37" }}>
                          S/ {Number(s.precioBase || 0).toFixed(2)}
                        </strong>
                      </div>

                      <div className="d-flex justify-content-between">
                        <span>Duración</span>
                        <strong>
                          {s.duracionMinutos
                            ? `${s.duracionMinutos} min`
                            : "No especificada"}
                        </strong>
                      </div>
                    </div>

                    <button
                      className="btn btn-gold w-100 mt-auto"
                      onClick={() => elegirServicio(s.idServicio)}
                    >
                      Elegir servicio
                    </button>

                  </CardDark>
                </div>
              );
            })
          ) : (
            <div className="col-12">
              <CardDark className="p-5 text-center">
                <p className="mb-0">No hay servicios disponibles.</p>
              </CardDark>
            </div>
          )}
        </div>
      </div>

      <footer className="landing-footer-simple">
        <p>
          <strong>{negocio?.nombre || "Negocio"}</strong> | © 2026 Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}