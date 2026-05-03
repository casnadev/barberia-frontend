import { useEffect, useState, useCallback } from "react";
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
  const [whatsappNegocio, setWhatsappNegocio] = useState("");
  const [slug, setSlug] = useState("");

  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("success");

  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [subiendoCarrusel, setSubiendoCarrusel] = useState(false);

  const [imagenesCarrusel, setImagenesCarrusel] = useState([]);
  const [imagenCarrusel, setImagenCarrusel] = useState(null);
  const [descripcionImagen, setDescripcionImagen] = useState("");

  const [redes, setRedes] = useState([]);
  const [tipoRed, setTipoRed] = useState("facebook");
  const [urlRed, setUrlRed] = useState("");
  const [ordenRed, setOrdenRed] = useState(0);
  const [activoRed, setActivoRed] = useState(true);
  const [editandoRedId, setEditandoRedId] = useState(null);
  const [guardandoRed, setGuardandoRed] = useState(false);

  const logoActual = negocio?.logoUrl
    ? `${API_BASE.replace("/api", "")}${negocio.logoUrl}`
    : "";

  const cargarImagenesCarrusel = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/Negocios/mis-imagenes-carrusel`);
      if (res && res.ok) {
        const data = await res.json();
        setImagenesCarrusel(data);
      }
    } catch (error) {
      console.error("Error carrusel:", error);
    }
  }, []);

  const cargarRedes = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/Negocios/mis-redes-sociales`);
      if (res && res.ok) {
        const data = await res.json();
        setRedes(data || []);
      }
    } catch (error) {
      console.error("Error redes sociales:", error);
    }
  }, []);

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
        setWhatsappNegocio(data.whatsappNegocio || "");
        setSlug(data.slug || "");

        localStorage.setItem("logoNegocio", data.logoUrl || "");
        localStorage.setItem("nombreNegocio", data.nombre || "");
      } catch {
        setTipoMensaje("error");
        setError("Error al cargar la información del negocio");
      }
    };

    cargarNegocio();
    cargarImagenesCarrusel();
    cargarRedes();
  }, [cargarImagenesCarrusel, cargarRedes]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const mostrarError = (msg) => {
    setTipoMensaje("error");
    setError(msg);
  };

  const seleccionarLogo = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setLogo(archivo);
    setPreview(URL.createObjectURL(archivo));
  };

  const subirLogo = async () => {
    if (!logo) return mostrarError("Selecciona una imagen para subir.");

    try {
      setSubiendo(true);
      const formData = new FormData();
      formData.append("logo", logo);

      const res = await authFetch(`${API_BASE}/Negocios/subir-logo`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || "Error al subir logo");

      setTipoMensaje("success");
      setMensaje("Logo actualizado correctamente");
      setNegocio((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      localStorage.setItem("logoNegocio", data.logoUrl);
      window.dispatchEvent(new Event("logo-negocio-actualizado"));
      setLogo(null);
      setPreview("");
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  const guardarDatos = async () => {
    if (!nombre.trim()) return mostrarError("El nombre es obligatorio.");

    try {
      setGuardando(true);
      const res = await authFetch(`${API_BASE}/Negocios/actualizar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono,
          direccion,
          whatsappNegocio,
          slug,
        }),
      });

      if (!res.ok) throw new Error("Error al actualizar");

      setTipoMensaje("success");
      setMensaje("Datos actualizados correctamente");
      localStorage.setItem("nombreNegocio", nombre.trim());
      window.dispatchEvent(new Event("nombre-negocio-actualizado"));
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const limpiarFormularioRed = () => {
    setTipoRed("facebook");
    setUrlRed("");
    setOrdenRed(0);
    setActivoRed(true);
    setEditandoRedId(null);
  };

  const guardarRed = async () => {
    if (!tipoRed.trim()) return mostrarError("Selecciona una red social.");
    if (!urlRed.trim()) return mostrarError("Ingresa el enlace de la red social.");

    try {
      setGuardandoRed(true);

      const payload = {
        tipo: tipoRed,
        url: urlRed.trim(),
        activo: activoRed,
        orden: Number(ordenRed) || 0,
      };

      const endpoint = editandoRedId
        ? `${API_BASE}/Negocios/redes-sociales/${editandoRedId}`
        : `${API_BASE}/Negocios/redes-sociales`;

      const method = editandoRedId ? "PUT" : "POST";

      const res = await authFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || "No se pudo guardar la red social");

      setTipoMensaje("success");
      setMensaje(editandoRedId ? "Red social actualizada" : "Red social agregada");
      limpiarFormularioRed();
      cargarRedes();
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setGuardandoRed(false);
    }
  };

  const editarRed = (red) => {
    setEditandoRedId(red.idRedSocial);
    setTipoRed(red.tipo || "facebook");
    setUrlRed(red.url || "");
    setOrdenRed(red.orden || 0);
    setActivoRed(Boolean(red.activo));
  };

  const eliminarRed = async (id) => {
    if (!window.confirm("¿Eliminar esta red social?")) return;

    try {
      const res = await authFetch(`${API_BASE}/Negocios/redes-sociales/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || "No se pudo eliminar la red social");

      setTipoMensaje("success");
      setMensaje("Red social eliminada");
      cargarRedes();

      if (editandoRedId === id) {
        limpiarFormularioRed();
      }
    } catch (err) {
      mostrarError(err.message);
    }
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
      case "web":
        return "🔗";
      default:
        return "🔗";
    }
  };

  const subirImagenCarrusel = async () => {
    if (!imagenCarrusel) return mostrarError("Selecciona una imagen.");

    try {
      setSubiendoCarrusel(true);
      const formData = new FormData();
      formData.append("imagen", imagenCarrusel);
      formData.append("descripcion", descripcionImagen);

      const res = await authFetch(`${API_BASE}/Negocios/subir-imagen-carrusel`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("No se pudo subir la imagen");

      setTipoMensaje("success");
      setMensaje("Imagen agregada correctamente");
      setImagenCarrusel(null);
      setDescripcionImagen("");
      cargarImagenesCarrusel();
    } catch (error) {
      mostrarError(error.message);
    } finally {
      setSubiendoCarrusel(false);
    }
  };

  const actualizarImagenCarrusel = async (img) => {
    try {
      const res = await authFetch(
        `${API_BASE}/Negocios/actualizar-imagen-carrusel/${img.idImagen}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            descripcion: img.descripcion,
            orden: Number(img.orden || 0),
          }),
        }
      );

      if (!res.ok) throw new Error("Error al actualizar");

      setTipoMensaje("success");
      setMensaje("Imagen actualizada");
      cargarImagenesCarrusel();
    } catch (error) {
      mostrarError(error.message);
    }
  };

  const eliminarImagenCarrusel = async (id) => {
    if (!window.confirm("¿Eliminar imagen del carrusel?")) return;

    try {
      const res = await authFetch(`${API_BASE}/Negocios/eliminar-imagen-carrusel/${id}`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("No se pudo eliminar");

      setTipoMensaje("success");
      setMensaje("Imagen eliminada");
      cargarImagenesCarrusel();
    } catch (error) {
      mostrarError(error.message);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader title="Configuración" subtitle="Administra la identidad de tu negocio" />

      <div className="container-fluid py-4">
        <div className="row g-4">
          <div className="col-lg-6">
            <CardDark className="h-100">
              <h4 className="section-title mb-4">Datos del negocio</h4>

              <div className="mb-3">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  Nombre
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

              <div className="mb-3">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  WhatsApp
                </label>
                <input
                  className="form-control input-dark"
                  value={whatsappNegocio}
                  onChange={(e) => setWhatsappNegocio(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  Dirección
                </label>
                <input
                  className="form-control input-dark"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ color: "#d4af37" }}>
                  Link público
                </label>
                <input
                  className="form-control input-dark"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="barberia-styles"
                />
              </div>

              <button className="btn btn-gold w-100" onClick={guardarDatos} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>

              <hr className="my-4" />

              <h4 className="section-title mb-3">Redes sociales</h4>

              <div className="row g-2 mb-3">
                <div className="col-md-3">
                  <select
                    className="form-control input-dark"
                    value={tipoRed}
                    onChange={(e) => setTipoRed(e.target.value)}
                  >
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="web">Web</option>
                  </select>
                </div>

                <div className="col-md-5">
                  <input
                    className="form-control input-dark"
                    placeholder="https://..."
                    value={urlRed}
                    onChange={(e) => setUrlRed(e.target.value)}
                  />
                </div>

                <div className="col-md-2">
                  <input
                    type="number"
                    className="form-control input-dark"
                    value={ordenRed}
                    onChange={(e) => setOrdenRed(e.target.value)}
                    placeholder="Orden"
                  />
                </div>

                <div className="col-md-2">
                  <select
                    className="form-control input-dark"
                    value={activoRed ? "true" : "false"}
                    onChange={(e) => setActivoRed(e.target.value === "true")}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Oculto</option>
                  </select>
                </div>
              </div>

              <div className="d-flex gap-2 mb-3">
                <button className="btn btn-gold" onClick={guardarRed} disabled={guardandoRed}>
                  {guardandoRed ? "Guardando..." : editandoRedId ? "Actualizar red" : "Agregar red"}
                </button>

                {editandoRedId && (
                  <button className="btn btn-dark-outline" onClick={limpiarFormularioRed}>
                    Cancelar
                  </button>
                )}
              </div>

              <div className="table-responsive">
                <table className="table-dark-pro">
                  <thead>
                    <tr>
                      <th>Red</th>
                      <th>Enlace</th>
                      <th>Orden</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {redes.length === 0 ? (
                      <tr>
                        <td colSpan="5">No hay redes sociales registradas.</td>
                      </tr>
                    ) : (
                      redes.map((red) => (
                        <tr key={red.idRedSocial}>
                          <td>
                            <span className="table-pill">
                              {iconoRed(red.tipo)} {red.tipo}
                            </span>
                          </td>

                          <td>
                            <a href={red.url} target="_blank" rel="noreferrer">
                              {red.url}
                            </a>
                          </td>

                          <td>{red.orden}</td>

                          <td>
                            <span className="table-pill">
                              {red.activo ? "Activo" : "Oculto"}
                            </span>
                          </td>

                          <td>
                            <div className="actions-grid">
                              <button
                                className="btn-action-dark"
                                onClick={() => editarRed(red)}
                              >
                                Editar
                              </button>

                              <button
                                className="btn-action-danger"
                                onClick={() => eliminarRed(red.idRedSocial)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <hr className="my-4" />

              <h4 className="section-title mb-4">Carrusel Público</h4>

              <input
                type="file"
                accept="image/*"
                className="form-control input-dark mb-2"
                onChange={(e) => setImagenCarrusel(e.target.files[0])}
              />

              <input
                className="form-control input-dark mb-2"
                placeholder="Descripción"
                value={descripcionImagen}
                onChange={(e) => setDescripcionImagen(e.target.value)}
              />

              <button
                className="btn btn-gold mb-4 w-100"
                onClick={subirImagenCarrusel}
                disabled={subiendoCarrusel}
              >
                {subiendoCarrusel ? "Subiendo..." : "Agregar al carrusel"}
              </button>

              <div className="row g-3">
                {imagenesCarrusel.map((img) => (
                  <div key={img.idImagen} className="col-md-6">
                    <div
                      className="p-2"
                      style={{
                        background: "#111",
                        border: "1px solid rgba(212,175,55,.12)",
                        borderRadius: "16px",
                      }}
                    >
                      <img
                        src={`${API_BASE.replace("/api", "")}${img.urlImagen}`}
                        alt=""
                        style={{
                          width: "100%",
                          height: "120px",
                          objectFit: "cover",
                          borderRadius: "12px",
                        }}
                      />

                      <input
                        className="form-control form-control-sm input-dark mt-2"
                        value={img.descripcion || ""}
                        onChange={(e) =>
                          setImagenesCarrusel((prev) =>
                            prev.map((x) =>
                              x.idImagen === img.idImagen
                                ? { ...x, descripcion: e.target.value }
                                : x
                            )
                          )
                        }
                      />

                      <div className="d-flex gap-1 mt-2">
                        <button
                          className="btn btn-sm btn-gold w-100"
                          onClick={() => actualizarImagenCarrusel(img)}
                        >
                          OK
                        </button>

                        <button
                          className="btn btn-sm btn-dark-outline w-100"
                          onClick={() => eliminarImagenCarrusel(img.idImagen)}
                        >
                          X
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardDark>
          </div>

          <div className="col-lg-6">
            <CardDark className="h-100 text-center">
              <h4 className="section-title mb-4">Logo</h4>

              <div
                className="logo-preview-container mb-4"
                style={{
                  background: "#111",
                  border: "1px solid rgba(212,175,55,0.18)",
                  borderRadius: "18px",
                  height: "250px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {preview || logoActual ? (
                  <img
                    src={preview || logoActual}
                    alt="Logo"
                    style={{
                      maxWidth: "90%",
                      maxHeight: "200px",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span className="text-muted">Sin logo</span>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                className="form-control input-dark mb-3"
                onChange={seleccionarLogo}
              />

              <div className="d-flex gap-2">
                <button className="btn btn-gold flex-grow-1" onClick={subirLogo} disabled={subiendo}>
                  {subiendo ? "Subiendo..." : "Guardar logo"}
                </button>

                <button
                  className="btn btn-dark-outline"
                  onClick={() => {
                    setLogo(null);
                    setPreview("");
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