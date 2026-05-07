import { useEffect, useState, useCallback, useMemo } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import PageHeader from "../components/ui/PageHeader";
import Toast from "../components/ui/Toast";
import GoldBadge from "../components/ui/GoldBadge";

import { getImageUrl, getBusinessCacheKeys } from "../utils/imageUrl";
import {
  Building2,
  Camera,
  ExternalLink,
  Globe,
  ImagePlus,
  Link as LinkIcon,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const Modal = ({ abierto, titulo, children, onClose, ancho = "760px" }) => {
  if (!abierto) return null;

  return (
    <div className="config-modal-backdrop">
      <div className="config-modal" style={{ maxWidth: ancho }}>
        <div className="config-modal-header">
          <h4>{titulo}</h4>

          <button className="config-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="config-modal-body">{children}</div>
      </div>
    </div>
  );
};

export default function ConfiguracionNegocio() {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

  const cacheKeys = useMemo(
    () => getBusinessCacheKeys(usuario?.idNegocio),
    [usuario?.idNegocio]
  );

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

  const [modalDatos, setModalDatos] = useState(false);
  const [modalLogo, setModalLogo] = useState(false);
  const [modalRedes, setModalRedes] = useState(false);
  const [modalCarrusel, setModalCarrusel] = useState(false);

  const logoActual = negocio?.logoUrl ? getImageUrl(negocio.logoUrl) : "";

  const cargarImagenesCarrusel = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/Negocios/mis-imagenes-carrusel`);
      if (res && res.ok) {
        const data = await res.json();
        setImagenesCarrusel(data || []);
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

        if (!res.ok) {
          throw new Error(data.mensaje || "No se pudo cargar el negocio.");
        }

        setNegocio(data);
        setNombre(data.nombre || "");
        setTelefono(data.telefono || "");
        setDireccion(data.direccion || "");
        setWhatsappNegocio(data.whatsappNegocio || "");
        setSlug(data.slug || "");

        localStorage.setItem(cacheKeys.logo, data.logoUrl || "");
        localStorage.setItem(cacheKeys.nombre, data.nombre || "");
        localStorage.setItem(cacheKeys.slug, data.slug || "");

        window.dispatchEvent(new Event("logo-negocio-actualizado"));
        window.dispatchEvent(new Event("nombre-negocio-actualizado"));
      } catch (err) {
        setTipoMensaje("error");
        setError(err.message || "Error al cargar la información del negocio");
      }
    };

    cargarNegocio();
    cargarImagenesCarrusel();
    cargarRedes();
  }, [
    cacheKeys.logo,
    cacheKeys.nombre,
    cacheKeys.slug,
    cargarImagenesCarrusel,
    cargarRedes,
  ]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const mostrarError = (msg) => {
    setTipoMensaje("error");
    setError(msg);
  };

  const mostrarSuccess = (msg) => {
    setTipoMensaje("success");
    setMensaje(msg);
  };

  const validarImagen = (archivo) => {
    if (!archivo) return false;

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
    const maxMB = 3;

    if (!tiposPermitidos.includes(archivo.type)) {
      mostrarError("Solo se permiten imágenes JPG, PNG o WEBP.");
      return false;
    }

    if (archivo.size > maxMB * 1024 * 1024) {
      mostrarError(`La imagen no debe superar ${maxMB} MB.`);
      return false;
    }

    return true;
  };

  const seleccionarLogo = (e) => {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    if (!validarImagen(archivo)) {
      e.target.value = "";
      return;
    }

    if (preview) URL.revokeObjectURL(preview);

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

      if (!res.ok) {
        throw new Error(data.mensaje || "Error al subir logo");
      }

      const nuevaRuta = data.logoUrl || "";

      mostrarSuccess("Logo actualizado correctamente");

      setNegocio((prev) => ({
        ...(prev || {}),
        logoUrl: nuevaRuta,
      }));

      localStorage.setItem(cacheKeys.logo, nuevaRuta);
      window.dispatchEvent(new Event("logo-negocio-actualizado"));

      setLogo(null);
      setPreview("");
      setModalLogo(false);
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
          telefono: telefono.trim(),
          direccion: direccion.trim(),
          whatsappNegocio: whatsappNegocio.trim(),
          slug: slug.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.mensaje || "Error al actualizar");
      }

      mostrarSuccess("Datos actualizados correctamente");

      setNegocio((prev) => ({
        ...(prev || {}),
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        whatsappNegocio: whatsappNegocio.trim(),
        slug: slug.trim(),
      }));

      localStorage.setItem(cacheKeys.nombre, nombre.trim());
      localStorage.setItem(cacheKeys.slug, slug.trim());

      window.dispatchEvent(new Event("nombre-negocio-actualizado"));
      setModalDatos(false);
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

      if (!res.ok) {
        throw new Error(data.mensaje || "No se pudo guardar la red social");
      }

      mostrarSuccess(editandoRedId ? "Red social actualizada" : "Red social agregada");

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
    setModalRedes(true);
  };

  const eliminarRed = async (id) => {
    if (!window.confirm("¿Eliminar esta red social?")) return;

    try {
      const res = await authFetch(`${API_BASE}/Negocios/redes-sociales/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.mensaje || "No se pudo eliminar la red social");
      }

      mostrarSuccess("Red social eliminada");

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

    if (!validarImagen(imagenCarrusel)) return;

    try {
      setSubiendoCarrusel(true);

      const formData = new FormData();
      formData.append("imagen", imagenCarrusel);
      formData.append("descripcion", descripcionImagen.trim());

      const res = await authFetch(`${API_BASE}/Negocios/subir-imagen-carrusel`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.mensaje || "No se pudo subir la imagen");
      }

      mostrarSuccess("Imagen agregada correctamente");

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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.mensaje || "Error al actualizar");
      }

      mostrarSuccess("Imagen actualizada");

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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.mensaje || "No se pudo eliminar");
      }

      mostrarSuccess("Imagen eliminada");

      cargarImagenesCarrusel();
    } catch (error) {
      mostrarError(error.message);
    }
  };

  const abrirModalRedes = () => {
    limpiarFormularioRed();
    setModalRedes(true);
  };

  const abrirModalLogo = () => {
    setLogo(null);
    setPreview("");
    setModalLogo(true);
  };

  const publicUrl = slug ? `/negocio/${slug}` : "Sin slug configurado";

  return (
    <div className="page-shell config-page">
      <div className="container-fluid py-4">
        <CardDark className="mb-4 config-header-card">
          <div className="config-header-row">
            <PageHeader
              title="Configuración"
              subtitle="Administra identidad, imagen pública, redes y carrusel de tu negocio."
            />

            <div className="config-header-actions">
              <GoldBadge>{redes.length} redes</GoldBadge>
              <GoldBadge>{imagenesCarrusel.length} imágenes</GoldBadge>
            </div>
          </div>
        </CardDark>

        <div className="config-overview-grid">
          <CardDark className="config-main-card">
            <div className="config-business-top">
              <div className="config-logo-orb">
                {logoActual ? (
                  <img src={logoActual} alt="Logo del negocio" />
                ) : (
                  <Building2 size={38} />
                )}
              </div>

              <div className="config-business-info">
                <h3>{negocio?.nombre || nombre || "Mi negocio"}</h3>
                <p>{direccion || "Dirección no configurada"}</p>

                <div className="config-business-badges">
                  <span>{telefono || "Sin teléfono"}</span>
                  <span>{whatsappNegocio || "Sin WhatsApp"}</span>
                </div>
              </div>
            </div>

            <div className="config-public-link">
              <div>
                <span>Link público</span>
                <b>{publicUrl}</b>
              </div>

              {slug && (
                <a
                  href={`/negocio/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-dark-outline"
                >
                  <ExternalLink size={15} />
                  Ver
                </a>
              )}
            </div>

            <div className="config-action-grid">
              <button className="config-action-card" onClick={() => setModalDatos(true)}>
                <Building2 size={22} />
                <span>Datos</span>
                <b>Editar negocio</b>
              </button>

              <button className="config-action-card" onClick={abrirModalLogo}>
                <Camera size={22} />
                <span>Logo</span>
                <b>Actualizar imagen</b>
              </button>

              <button className="config-action-card" onClick={abrirModalRedes}>
                <Globe size={22} />
                <span>Redes</span>
                <b>Gestionar enlaces</b>
              </button>

              <button className="config-action-card" onClick={() => setModalCarrusel(true)}>
                <ImagePlus size={22} />
                <span>Carrusel</span>
                <b>Fotos públicas</b>
              </button>
            </div>
          </CardDark>

          <CardDark className="config-preview-card">
            <div className="config-section-head">
              <div>
                <h4 className="section-title">Vista rápida</h4>
                <p className="section-subtitle">
                  Revisa cómo está quedando la identidad pública.
                </p>
              </div>
            </div>

            <div className="config-preview-phone">
              <div className="config-preview-cover">
                {imagenesCarrusel[0]?.urlImagen ? (
                  <img
                    src={getImageUrl(imagenesCarrusel[0].urlImagen)}
                    alt={imagenesCarrusel[0].descripcion || "Imagen destacada"}
                  />
                ) : (
                  <div className="config-preview-cover-empty">
                    <ImagePlus size={30} />
                  </div>
                )}
              </div>

              <div className="config-preview-body">
                <div className="config-preview-logo">
                  {logoActual ? (
                    <img src={logoActual} alt="Logo" />
                  ) : (
                    <Building2 size={22} />
                  )}
                </div>

                <h5>{nombre || "Nombre del negocio"}</h5>
                <p>{direccion || "Dirección del negocio"}</p>

                <div className="config-preview-socials">
                  {redes.slice(0, 5).map((red) => (
                    <span key={red.idRedSocial}>{iconoRed(red.tipo)}</span>
                  ))}

                  {redes.length === 0 && <small>Sin redes configuradas</small>}
                </div>
              </div>
            </div>
          </CardDark>
        </div>

        <CardDark className="mt-4 config-carousel-card">
          <div className="config-section-head">
            <div>
              <h4 className="section-title">Carrusel público</h4>
              <p className="section-subtitle">
                Imágenes visibles en la landing pública del negocio.
              </p>
            </div>

            <button className="btn btn-gold" onClick={() => setModalCarrusel(true)}>
              <Plus size={16} />
              Gestionar carrusel
            </button>
          </div>

          <div className="config-carousel-strip">
            {imagenesCarrusel.length === 0 ? (
              <div className="config-empty-card">
                <ImagePlus size={30} />
                <p>Aún no hay imágenes en el carrusel.</p>
              </div>
            ) : (
              imagenesCarrusel.map((img) => (
                <div className="config-carousel-item" key={img.idImagen}>
                  <img
                    src={getImageUrl(img.urlImagen)}
                    alt={img.descripcion || "Imagen carrusel"}
                  />
                  <span>{img.descripcion || "Sin descripción"}</span>
                </div>
              ))
            )}
          </div>
        </CardDark>

        <CardDark className="mt-4 config-social-card">
          <div className="config-section-head">
            <div>
              <h4 className="section-title">Redes sociales</h4>
              <p className="section-subtitle">
                Enlaces visibles para tus clientes.
              </p>
            </div>

            <button className="btn btn-gold" onClick={abrirModalRedes}>
              <Plus size={16} />
              Agregar red
            </button>
          </div>

          <div className="config-social-grid">
            {redes.length === 0 ? (
              <div className="config-empty-card">
                <Globe size={30} />
                <p>No hay redes sociales registradas.</p>
              </div>
            ) : (
              redes.map((red) => (
                <div className="config-social-item" key={red.idRedSocial}>
                  <div className="config-social-icon">{iconoRed(red.tipo)}</div>

                  <div className="config-social-info">
                    <b>{red.tipo}</b>
                    <a href={red.url} target="_blank" rel="noreferrer">
                      {red.url}
                    </a>
                    <span>{red.activo ? "Activo" : "Oculto"} · Orden {red.orden}</span>
                  </div>

                  <div className="config-social-actions">
                    <button className="btn-action-dark" onClick={() => editarRed(red)}>
                      <Pencil size={15} />
                    </button>

                    <button
                      className="btn-action-danger"
                      onClick={() => eliminarRed(red.idRedSocial)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardDark>

        <Modal
          abierto={modalDatos}
          titulo="Datos del negocio"
          onClose={() => setModalDatos(false)}
          ancho="760px"
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="label-gold">Nombre</label>
              <input
                className="form-control input-dark"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="label-gold">Teléfono</label>
              <input
                className="form-control input-dark"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="label-gold">WhatsApp</label>
              <input
                className="form-control input-dark"
                value={whatsappNegocio}
                onChange={(e) => setWhatsappNegocio(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="label-gold">Link público</label>
              <input
                className="form-control input-dark"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="barberia-styles"
              />
            </div>

            <div className="col-12">
              <label className="label-gold">Dirección</label>
              <input
                className="form-control input-dark"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 flex-wrap">
            <button className="btn btn-dark-outline" onClick={() => setModalDatos(false)}>
              Cancelar
            </button>

            <button className="btn btn-gold" onClick={guardarDatos} disabled={guardando}>
              <Save size={16} />
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </Modal>

        <Modal
          abierto={modalLogo}
          titulo="Logo del negocio"
          onClose={() => setModalLogo(false)}
          ancho="680px"
        >
          <div className="config-logo-modal-preview">
            {preview || logoActual ? (
              <img src={preview || logoActual} alt="Logo" />
            ) : (
              <span>Sin logo</span>
            )}
          </div>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="form-control input-dark mt-3"
            onChange={seleccionarLogo}
          />

          <div className="d-flex justify-content-end gap-2 mt-4 flex-wrap">
            <button
              className="btn btn-dark-outline"
              onClick={() => {
                setLogo(null);
                setPreview("");
              }}
            >
              Limpiar
            </button>

            <button className="btn btn-gold" onClick={subirLogo} disabled={subiendo}>
              <Upload size={16} />
              {subiendo ? "Subiendo..." : "Guardar logo"}
            </button>
          </div>
        </Modal>

        <Modal
          abierto={modalRedes}
          titulo={editandoRedId ? "Editar red social" : "Redes sociales"}
          onClose={() => setModalRedes(false)}
          ancho="820px"
        >
          <div className="row g-2 mb-3">
            <div className="col-md-3">
              <label className="label-gold">Red</label>
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
              <label className="label-gold">Enlace</label>
              <input
                className="form-control input-dark"
                placeholder="https://..."
                value={urlRed}
                onChange={(e) => setUrlRed(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="label-gold">Orden</label>
              <input
                type="number"
                className="form-control input-dark"
                value={ordenRed}
                onChange={(e) => setOrdenRed(e.target.value)}
                placeholder="Orden"
              />
            </div>

            <div className="col-md-2">
              <label className="label-gold">Estado</label>
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

          <div className="d-flex justify-content-end gap-2 mb-4 flex-wrap">
            {editandoRedId && (
              <button className="btn btn-dark-outline" onClick={limpiarFormularioRed}>
                Cancelar edición
              </button>
            )}

            <button className="btn btn-gold" onClick={guardarRed} disabled={guardandoRed}>
              <Save size={16} />
              {guardandoRed ? "Guardando..." : editandoRedId ? "Actualizar red" : "Agregar red"}
            </button>
          </div>

          <div className="config-modal-list">
            {redes.length === 0 ? (
              <p className="section-subtitle text-center mb-0">
                No hay redes sociales registradas.
              </p>
            ) : (
              redes.map((red) => (
                <div className="config-social-item" key={red.idRedSocial}>
                  <div className="config-social-icon">{iconoRed(red.tipo)}</div>

                  <div className="config-social-info">
                    <b>{red.tipo}</b>
                    <a href={red.url} target="_blank" rel="noreferrer">
                      {red.url}
                    </a>
                    <span>{red.activo ? "Activo" : "Oculto"} · Orden {red.orden}</span>
                  </div>

                  <div className="config-social-actions">
                    <button className="btn-action-dark" onClick={() => editarRed(red)}>
                      <Pencil size={15} />
                    </button>

                    <button
                      className="btn-action-danger"
                      onClick={() => eliminarRed(red.idRedSocial)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>

        <Modal
          abierto={modalCarrusel}
          titulo="Carrusel público"
          onClose={() => setModalCarrusel(false)}
          ancho="920px"
        >
          <div className="row g-2 mb-4">
            <div className="col-md-5">
              <label className="label-gold">Imagen</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="form-control input-dark"
                onChange={(e) => setImagenCarrusel(e.target.files?.[0] || null)}
              />
            </div>

            <div className="col-md-5">
              <label className="label-gold">Descripción</label>
              <input
                className="form-control input-dark"
                placeholder="Descripción"
                value={descripcionImagen}
                onChange={(e) => setDescripcionImagen(e.target.value)}
              />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button
                className="btn btn-gold w-100"
                onClick={subirImagenCarrusel}
                disabled={subiendoCarrusel}
              >
                <Upload size={16} />
                {subiendoCarrusel ? "..." : "Subir"}
              </button>
            </div>
          </div>

          <div className="config-modal-carousel-grid">
            {imagenesCarrusel.length === 0 ? (
              <div className="config-empty-card">
                <ImagePlus size={30} />
                <p>Aún no hay imágenes en el carrusel.</p>
              </div>
            ) : (
              imagenesCarrusel.map((img) => (
                <div key={img.idImagen} className="config-image-card-pro">
                  <img
                    src={getImageUrl(img.urlImagen)}
                    alt={img.descripcion || "Imagen carrusel"}
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

                  <div className="d-flex gap-2 mt-2">
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
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      </div>

      <Toast
        mensaje={mensaje || error}
        tipo={error ? "error" : tipoMensaje}
        onClose={() => {
          setMensaje("");
          setError("");
        }}
      />
    </div>
  );
}
