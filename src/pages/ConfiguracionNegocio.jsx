import { useEffect, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";
import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import Toast from "../components/ui/Toast";

export default function ConfiguracionNegocio() {
  const [negocio, setNegocio] = useState(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");

  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("success");
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const logoActual = negocio?.logoUrl
    ? `${API_BASE.replace("/api", "")}${negocio.logoUrl}`
    : "";

  useEffect(() => {
    const cargarNegocio = async () => {
      try {
        const res = await authFetch(`${API_BASE}/Negocios/mi-negocio`);
        if (!res) return;

        const data = await res.json();

        setNegocio(data);
        setNombre(data.nombre || "");
        setTelefono(data.telefono || "");
        setDireccion(data.direccion || "");

        localStorage.setItem("logoNegocio", data.logoUrl || "");
        localStorage.setItem("nombreNegocio", data.nombre || "");
      } catch (err) {
        console.error(err);
        setTipoMensaje("error");
        setError("Error al cargar la información del negocio");
      }
    };

    cargarNegocio();
  }, []);

  const seleccionarLogo = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setLogo(archivo);
    setPreview(URL.createObjectURL(archivo));
    setMensaje("");
    setError("");
  };

  const subirLogo = async () => {
    setMensaje("");
    setError("");

    if (!logo) {
      setTipoMensaje("error");
      setError("Selecciona una imagen para subir.");
      return;
    }

    try {
      setSubiendo(true);

      const formData = new FormData();
      formData.append("logo", logo);

      const res = await authFetch(`${API_BASE}/Negocios/subir-logo`, {
        method: "POST",
        body: formData,
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "No se pudo subir el logo");
        return;
      }

      setTipoMensaje("success");
      setMensaje("Logo actualizado correctamente");
      setNegocio((prev) => ({
        ...prev,
        logoUrl: data.logoUrl,
      }));

      localStorage.setItem("logoNegocio", data.logoUrl);
      window.dispatchEvent(new Event("logo-negocio-actualizado"));

      setLogo(null);
      setPreview("");
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error al subir el logo");
    } finally {
      setSubiendo(false);
    }
  };

  const guardarDatos = async () => {
    setMensaje("");
    setError("");

    if (!nombre.trim()) {
      setTipoMensaje("error");
      setError("El nombre del negocio es obligatorio.");
      return;
    }

    try {
      setGuardando(true);

      const res = await authFetch(`${API_BASE}/Negocios/actualizar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono,
          direccion,
        }),
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "No se pudo actualizar el negocio");
        return;
      }

      const nombreActualizado = nombre.trim();

      setTipoMensaje("success");
      setMensaje("Datos del negocio actualizados correctamente");
      setNegocio((prev) => ({
        ...prev,
        nombre: nombreActualizado,
        telefono,
        direccion,
      }));

      localStorage.setItem("nombreNegocio", nombreActualizado);
      window.dispatchEvent(new Event("nombre-negocio-actualizado"));
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error al actualizar el negocio");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Configuración del negocio"
        subtitle="Administra la identidad y datos principales de tu negocio"
      />

      <div className="container-fluid py-4">
        <div className="row g-4">
          <div className="col-lg-6">
            <CardDark className="h-100">
              <h4 className="section-title mb-4">Datos del negocio</h4>

              <div className="mb-3">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  Nombre del negocio
                </label>
                <input
                  className="form-control input-dark"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  Teléfono
                </label>
                <input
                  className="form-control input-dark"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  Dirección
                </label>
                <input
                  className="form-control input-dark"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-gold"
                  onClick={guardarDatos}
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </CardDark>
          </div>

          <div className="col-lg-6">
            <CardDark className="h-100">
              <h4 className="section-title mb-4">Logo del negocio</h4>

              <div
                style={{
                  background: "#111",
                  border: "1px solid rgba(212,175,55,0.18)",
                  borderRadius: "18px",
                  minHeight: "220px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                  marginBottom: "20px",
                }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview logo"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "180px",
                      objectFit: "contain",
                    }}
                  />
                ) : logoActual ? (
                  <img
                    src={logoActual}
                    alt="Logo actual"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "180px",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span style={{ color: "#999" }}>Sin logo</span>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  Seleccionar imagen
                </label>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  className="form-control input-dark"
                  onChange={seleccionarLogo}
                />
              </div>

              <div
                style={{
                  color: "#b8b8b8",
                  fontSize: "0.9rem",
                  marginBottom: "18px",
                }}
              >
                Formatos: PNG, JPG, JEPG o WEBP, Cuadrado 400x400 px y menor a 300 KB
              </div>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-gold"
                  onClick={subirLogo}
                  disabled={subiendo}
                >
                  {subiendo ? "Subiendo..." : "Guardar logo"}
                </button>

                <button
                  className="btn btn-dark-outline"
                  onClick={() => {
                    setLogo(null);
                    setPreview("");
                    setMensaje("");
                    setError("");
                  }}
                >
                  Limpiar
                </button>
              </div>
            </CardDark>
          </div>
        </div>
      </div>

      <Toast
        mensaje={mensaje || error}
        tipo={tipoMensaje}
        onClose={() => {
          setMensaje("");
          setError("");
        }}
      />
    </div>
  );
}