import React, { useEffect, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import GoldBadge from "../components/ui/GoldBadge";
import AvatarCircle from "../components/ui/AvatarCircle";
import PageHeader from "../components/ui/PageHeader";
import Toast from "../components/ui/Toast";

import { getImageUrl } from "../utils/imageUrl";

import {
  Pencil,
  Image,
  Key,
  Trash2,
  Plus,
  X,
  Upload,
  UserRound,
} from "lucide-react";

const Modal = ({ abierto, titulo, children, onClose, ancho = "760px" }) => {
  if (!abierto) return null;

  return (
    <div className="trab-modal-backdrop">
      <div className="trab-modal" style={{ maxWidth: ancho }}>
        <div className="trab-modal-header">
          <h4>{titulo}</h4>

          <button
            type="button"
            className="trab-modal-close"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="trab-modal-body">{children}</div>
      </div>
    </div>
  );
};

function Trabajadores() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [destacado, setDestacado] = useState(false);

  const [editando, setEditando] = useState(null);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [trabajadorAcceso, setTrabajadorAcceso] = useState(null);

  const [modalTrabajador, setModalTrabajador] = useState(false);
  const [modalImagenes, setModalImagenes] = useState(false);
  const [modalAcceso, setModalAcceso] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [correoAcceso, setCorreoAcceso] = useState("");

  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [imagenTrabajo, setImagenTrabajo] = useState(null);
  const [descripcionTrabajo, setDescripcionTrabajo] = useState("");
  const [imagenesTrabajo, setImagenesTrabajo] = useState([]);

  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoTrabajo, setSubiendoTrabajo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [creandoAcceso, setCreandoAcceso] = useState(false);
  const [reseteandoAcceso, setReseteandoAcceso] = useState(false);

  useEffect(() => {
    cargarInicial();
  }, []);

  const obtenerUrl = (ruta) => {
    return ruta ? getImageUrl(ruta) : "";
  };

  const validarImagen = (archivo) => {
    if (!archivo) return true;

    const permitidos = ["image/jpeg", "image/png", "image/webp"];
    const maxMB = 3;

    if (!permitidos.includes(archivo.type)) {
      setError("Solo se permiten imágenes JPG, PNG o WEBP.");
      return false;
    }

    if (archivo.size > maxMB * 1024 * 1024) {
      setError(`La imagen no debe superar ${maxMB} MB.`);
      return false;
    }

    return true;
  };

  const cargarInicial = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await authFetch(`${API_BASE}/Trabajadores`);
      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "Error cargando trabajadores");
        return;
      }

      setLista(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Error cargando trabajadores");
    } finally {
      setLoading(false);
    }
  };

  const recargarTrabajadores = cargarInicial;

  const cargarImagenesTrabajador = async (id) => {
    try {
      const res = await authFetch(`${API_BASE}/Trabajadores/${id}/imagenes`);
      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setImagenesTrabajo([]);
        return;
      }

      setImagenesTrabajo(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setImagenesTrabajo([]);
    }
  };

  const limpiarFormulario = () => {
    setEditando(null);
    setTrabajadorSeleccionado(null);
    setNombre("");
    setTelefono("");
    setPorcentaje("");
    setDescripcion("");
    setEspecialidad("");
    setExperiencia("");
    setDestacado(false);
    setFotoPerfil(null);
  };

  const cerrarModalTrabajador = () => {
    limpiarFormulario();
    setModalTrabajador(false);
  };

  const abrirCrearTrabajador = () => {
    setMensaje("");
    setError("");
    limpiarFormulario();
    setModalTrabajador(true);
  };

  const abrirEditarTrabajador = (t) => {
    setMensaje("");
    setError("");

    setEditando(t.idTrabajador);
    setTrabajadorSeleccionado(t);
    setNombre(t.nombre || "");
    setTelefono(t.telefono || "");
    setPorcentaje(t.porcentajeComision ?? "");
    setDescripcion(t.descripcion || "");
    setEspecialidad(t.especialidad || "");
    setExperiencia(t.experiencia || "");
    setDestacado(Boolean(t.destacado));
    setFotoPerfil(null);

    setModalTrabajador(true);
  };

  const guardar = async () => {
    setMensaje("");
    setError("");

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();
    const porcentajeNumero = Number(porcentaje || 0);

    if (!nombreLimpio) {
      setError("Nombre obligatorio.");
      return;
    }

    if (telefonoLimpio && !/^[0-9]{9}$/.test(telefonoLimpio)) {
      setError("El teléfono debe tener 9 dígitos.");
      return;
    }

    if (porcentajeNumero < 0 || porcentajeNumero > 100) {
      setError("La comisión debe estar entre 0 y 100.");
      return;
    }

    if (fotoPerfil && !validarImagen(fotoPerfil)) return;

    const payload = {
      nombre: nombreLimpio,
      telefono: telefonoLimpio,
      porcentajeComision: porcentajeNumero,
      descripcion: descripcion.trim(),
      especialidad: especialidad.trim(),
      experiencia: experiencia.trim(),
      destacado,
    };

    try {
      setGuardando(true);

      let response;

      if (editando) {
        response = await authFetch(`${API_BASE}/Trabajadores/${editando}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await authFetch(`${API_BASE}/Trabajadores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setError(data.mensaje || "Error guardando trabajador");
        return;
      }

      const idGuardado =
        editando || data?.data?.idTrabajador || data?.idTrabajador;

      if (fotoPerfil && idGuardado) {
        await subirFotoPerfil(idGuardado, false);
      }

      setMensaje(editando ? "Trabajador actualizado." : "Trabajador registrado.");
      cerrarModalTrabajador();
      await recargarTrabajadores();
    } catch (err) {
      console.error(err);
      setError("Error en el servidor");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm("¿Desactivar trabajador?")) return;

    try {
      const res = await authFetch(`${API_BASE}/Trabajadores/desactivar/${id}`, {
        method: "PATCH",
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo desactivar trabajador");
        return;
      }

      setMensaje("Desactivado correctamente");
      await recargarTrabajadores();
    } catch (err) {
      console.error(err);
      setError("Error al desactivar trabajador");
    }
  };

  const abrirImagenes = async (t) => {
    setMensaje("");
    setError("");
    setTrabajadorSeleccionado(t);
    setImagenTrabajo(null);
    setDescripcionTrabajo("");
    await cargarImagenesTrabajador(t.idTrabajador);
    setModalImagenes(true);
  };

  const cerrarImagenes = () => {
    setModalImagenes(false);
    setTrabajadorSeleccionado(null);
    setImagenTrabajo(null);
    setDescripcionTrabajo("");
    setImagenesTrabajo([]);
  };

  const subirFotoPerfil = async (idTrabajador, mostrar = true) => {
    if (!fotoPerfil) return;
    if (!validarImagen(fotoPerfil)) return;

    try {
      setSubiendoFoto(true);

      const form = new FormData();
      form.append("archivo", fotoPerfil);

      const res = await authFetch(
        `${API_BASE}/Trabajadores/subir-foto/${idTrabajador}`,
        {
          method: "POST",
          body: form,
        }
      );

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo subir la foto");
        return;
      }

      if (mostrar) setMensaje("Foto actualizada");
      setFotoPerfil(null);
    } catch (err) {
      console.error(err);
      setError("Error al subir foto");
    } finally {
      setSubiendoFoto(false);
    }
  };

  const subirImagenTrabajo = async () => {
    setMensaje("");
    setError("");

    if (!trabajadorSeleccionado) {
      setError("Selecciona un trabajador.");
      return;
    }

    if (!imagenTrabajo) {
      setError("Selecciona una imagen de trabajo.");
      return;
    }

    if (!validarImagen(imagenTrabajo)) return;

    if (imagenesTrabajo.length >= 10) {
      setError("Solo puedes registrar hasta 10 imágenes por trabajador.");
      return;
    }

    try {
      setSubiendoTrabajo(true);

      const form = new FormData();
      form.append("archivo", imagenTrabajo);
      form.append("descripcion", descripcionTrabajo.trim());

      const res = await authFetch(
        `${API_BASE}/Trabajadores/subir-trabajo/${trabajadorSeleccionado.idTrabajador}`,
        {
          method: "POST",
          body: form,
        }
      );

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo subir la imagen");
        return;
      }

      setMensaje("Trabajo agregado");
      setImagenTrabajo(null);
      setDescripcionTrabajo("");
      await cargarImagenesTrabajador(trabajadorSeleccionado.idTrabajador);
    } catch (err) {
      console.error(err);
      setError("Error al subir imagen");
    } finally {
      setSubiendoTrabajo(false);
    }
  };

  const eliminarImagenTrabajo = async (idImagen) => {
    if (!trabajadorSeleccionado) return;
    if (!window.confirm("¿Eliminar imagen?")) return;

    try {
      const res = await authFetch(`${API_BASE}/Trabajadores/imagenes/${idImagen}`, {
        method: "DELETE",
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo eliminar la imagen");
        return;
      }

      await cargarImagenesTrabajador(trabajadorSeleccionado.idTrabajador);
    } catch (err) {
      console.error(err);
      setError("Error al eliminar imagen");
    }
  };

  const abrirAcceso = (t) => {
    setMensaje("");
    setError("");
    setTrabajadorAcceso(t);
    setCorreoAcceso("");
    setModalAcceso(true);
  };

  const cerrarAcceso = () => {
    setTrabajadorAcceso(null);
    setCorreoAcceso("");
    setModalAcceso(false);
  };

  const obtenerIdUsuarioAcceso = (t) => {
    return (
      t?.idUsuarioAcceso ||
      t?.idUsuario ||
      t?.idUsuarioTrabajador ||
      t?.usuario?.idUsuario ||
      null
    );
  };

  const crearAcceso = async () => {
    setMensaje("");
    setError("");

    if (!trabajadorAcceso) return;

    const correoLimpio = correoAcceso.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
      setError("Correo inválido.");
      return;
    }

    try {
      setCreandoAcceso(true);

      const res = await authFetch(`${API_BASE}/Usuarios/crear-acceso-trabajador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idTrabajador: trabajadorAcceso.idTrabajador,
          correo: correoLimpio,
        }),
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo crear el acceso");
        return;
      }

      setMensaje(
        "Acceso creado correctamente. Se envió la contraseña temporal al correo."
      );

      cerrarAcceso();
      await recargarTrabajadores();
    } catch (err) {
      console.error(err);
      setError("Error al crear acceso");
    } finally {
      setCreandoAcceso(false);
    }
  };

  const resetearAcceso = async () => {
    setMensaje("");
    setError("");

    const idUsuario = obtenerIdUsuarioAcceso(trabajadorAcceso);

    if (!idUsuario) {
      setError(
        "No se encontró el usuario de acceso de este trabajador. Si aún no tiene acceso, créalo primero."
      );
      return;
    }

    if (!window.confirm("¿Generar nueva contraseña temporal y enviarla al correo?")) {
      return;
    }

    try {
      setReseteandoAcceso(true);

      const res = await authFetch(`${API_BASE}/Usuarios/resetear-password/${idUsuario}`, {
        method: "POST",
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo resetear el acceso");
        return;
      }

      setMensaje("Nueva contraseña temporal enviada al correo.");
      cerrarAcceso();
    } catch (err) {
      console.error(err);
      setError("Error al resetear acceso");
    } finally {
      setReseteandoAcceso(false);
    }
  };

  const renderSkeleton = () => (
    <div className="trabajadores-grid">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div className="trabajador-card-wrap" key={item}>
          <div className="trabajador-card-pro trabajador-card-skeleton">
            <div className="trabajador-skeleton-top">
              <div className="trabajador-skeleton-avatar" />
              <div>
                <div className="trabajador-skeleton-line long" />
                <div className="trabajador-skeleton-line short" />
              </div>
            </div>

            <div className="trabajador-skeleton-line full" />
            <div className="trabajador-skeleton-line full" />
            <div className="trabajador-skeleton-actions">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page-shell trabajadores-page">
      <div className="container-fluid trabajadores-container">
        <CardDark className="trabajadores-header-card">
          <div className="trabajadores-header-row">
            <div className="trabajadores-header-title">
              <PageHeader
                title="Gestión de Trabajadores"
                subtitle="Administra perfiles públicos, portafolio, accesos y trabajadores destacados."
              />
            </div>

            <div className="trabajadores-header-actions">
              <GoldBadge>{lista.length} activos</GoldBadge>

              <button
                type="button"
                className="btn btn-gold trabajadores-add-btn"
                onClick={abrirCrearTrabajador}
              >
                <Plus size={17} />
                <span>Nuevo trabajador</span>
              </button>
            </div>
          </div>
        </CardDark>

        <Toast mensaje={mensaje} tipo="success" onClose={() => setMensaje("")} />
        <Toast mensaje={error} tipo="error" onClose={() => setError("")} />

        <CardDark className="trabajadores-list-card">
          <div className="trabajadores-list-head">
            <div>
              <h4 className="section-title">Lista de trabajadores</h4>
              <p className="section-subtitle">
                Estado, especialidad, comisión y acciones principales.
              </p>
            </div>
          </div>

          {loading ? (
            renderSkeleton()
          ) : lista.length > 0 ? (
            <div className="trabajadores-grid">
              {lista.map((t) => (
                <div className="trabajador-card-wrap" key={t.idTrabajador}>
                  <article className="trabajador-card-pro">
                    <div className="trabajador-card-top">
                      <AvatarCircle
                        src={obtenerUrl(t.fotoPerfilUrl)}
                        alt={t.nombre}
                        fallback={t.nombre?.charAt(0)?.toUpperCase() || "T"}
                        selected={t.destacado}
                        size="md"
                      />

                      <div className="trabajador-card-main">
                        <div className="trabajador-card-title-row">
                          <h5 title={t.nombre}>{t.nombre}</h5>

                          {t.destacado ? (
                            <span className="trabajador-pill destacado">Destacado</span>
                          ) : (
                            <span className="trabajador-pill normal">Estándar</span>
                          )}
                        </div>

                        <p>
                          {t.descripcion || "Sin biografía pública registrada."}
                        </p>
                      </div>
                    </div>

                    <div className="trabajador-info-grid">
                      <div>
                        <span>Especialidad</span>
                        <b>{t.especialidad || "No especificada"}</b>
                      </div>

                      <div>
                        <span>Experiencia</span>
                        <b>{t.experiencia || "No especificada"}</b>
                      </div>

                      <div>
                        <span>Comisión</span>
                        <b>{t.porcentajeComision || 0}%</b>
                      </div>
                    </div>

                    <div className="trabajador-actions-grid">
                      <button
                        type="button"
                        className="btn-action-dark"
                        onClick={() => abrirEditarTrabajador(t)}
                      >
                        <Pencil size={16} />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        className="btn-action-dark"
                        onClick={() => abrirImagenes(t)}
                      >
                        <Image size={16} />
                        <span>Imágenes</span>
                      </button>

                      <button
                        type="button"
                        className="btn-action-dark"
                        onClick={() => abrirAcceso(t)}
                      >
                        <Key size={16} />
                        <span>Acceso</span>
                      </button>

                      <button
                        type="button"
                        className="btn-action-danger"
                        onClick={() => eliminar(t.idTrabajador)}
                      >
                        <Trash2 size={16} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          ) : (
            <div className="trabajadores-empty-state">
              <UserRound size={42} />
              <h4>Aún no tienes trabajadores</h4>
              <p>Agrega tu primer profesional para mostrarlo en tu landing pública.</p>

              <button
                type="button"
                className="btn btn-gold"
                onClick={abrirCrearTrabajador}
              >
                <Plus size={17} />
                Nuevo trabajador
              </button>
            </div>
          )}
        </CardDark>

        <Modal
          abierto={modalTrabajador}
          titulo={editando ? "Editar trabajador" : "Nuevo trabajador"}
          onClose={cerrarModalTrabajador}
        >
          <div className="trab-form-grid">
            <div>
              <label className="label-gold">Nombre completo</label>
              <input
                className="form-control input-dark"
                value={nombre}
                maxLength={120}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div>
              <label className="label-gold">Teléfono</label>
              <input
                className="form-control input-dark"
                value={telefono}
                maxLength={9}
                inputMode="numeric"
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div>
              <label className="label-gold">% Comisión</label>
              <input
                className="form-control input-dark"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
              />
            </div>

            <div>
              <label className="label-gold">Especialidad</label>
              <input
                className="form-control input-dark"
                value={especialidad}
                maxLength={150}
                onChange={(e) => setEspecialidad(e.target.value)}
                placeholder="Fades, barba..."
              />
            </div>

            <div>
              <label className="label-gold">Experiencia</label>
              <input
                className="form-control input-dark"
                value={experiencia}
                maxLength={150}
                onChange={(e) => setExperiencia(e.target.value)}
                placeholder="3 años"
              />
            </div>

            <div className="trab-form-switch">
              <label className="label-gold">Estado destacado</label>

              <label className="trab-switch-box" htmlFor="swDestacadoModal">
                <input
                  type="checkbox"
                  checked={destacado}
                  onChange={(e) => setDestacado(e.target.checked)}
                  id="swDestacadoModal"
                />
                <span>{destacado ? "Destacado ⭐" : "Estándar"}</span>
              </label>
            </div>

            <div className="trab-form-full">
              <label className="label-gold">Biografía pública</label>
              <textarea
                rows="3"
                className="form-control input-dark"
                value={descripcion}
                maxLength={500}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción que verá el cliente"
              />
            </div>

            <div className="trab-form-full">
              <label className="label-gold">Foto de perfil</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="form-control input-dark"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;

                  if (file && !validarImagen(file)) {
                    e.target.value = "";
                    return;
                  }

                  setFotoPerfil(file);
                }}
              />
            </div>
          </div>

          <div className="trab-modal-actions">
            <button
              type="button"
              className="btn btn-dark-outline"
              onClick={cerrarModalTrabajador}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-gold"
              onClick={guardar}
              disabled={subiendoFoto || guardando}
            >
              {subiendoFoto || guardando
                ? "Procesando..."
                : editando
                  ? "Actualizar"
                  : "Registrar"}
            </button>
          </div>
        </Modal>

        <Modal
          abierto={modalImagenes}
          titulo={
            trabajadorSeleccionado
              ? `Portafolio: ${trabajadorSeleccionado.nombre}`
              : "Portafolio"
          }
          onClose={cerrarImagenes}
          ancho="920px"
        >
          <div className="trab-portfolio-head">
            <p className="section-subtitle">
              Agrega trabajos reales que aparecerán en el perfil público.
            </p>

            <GoldBadge>{imagenesTrabajo.length} / 10</GoldBadge>
          </div>

          <div className="trab-upload-grid">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="form-control input-dark"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;

                if (file && !validarImagen(file)) {
                  e.target.value = "";
                  return;
                }

                setImagenTrabajo(file);
              }}
            />

            <input
              className="form-control input-dark"
              placeholder="¿Qué trabajo es?"
              value={descripcionTrabajo}
              maxLength={200}
              onChange={(e) => setDescripcionTrabajo(e.target.value)}
            />

            <button
              type="button"
              className="btn btn-gold"
              onClick={subirImagenTrabajo}
              disabled={subiendoTrabajo || imagenesTrabajo.length >= 10}
            >
              <Upload size={16} />
              {subiendoTrabajo ? "Subiendo..." : "Subir"}
            </button>
          </div>

          {imagenesTrabajo.length >= 10 && (
            <p className="section-subtitle mb-3">
              Has alcanzado el límite recomendado de 10 trabajos para el perfil público.
            </p>
          )}

          {imagenesTrabajo.length > 0 ? (
            <div className="trab-portfolio-grid">
              {imagenesTrabajo.map((img) => (
                <article className="card-image-work" key={img.idImagen}>
                  <img
                    className="img-work"
                    src={obtenerUrl(img.urlImagen)}
                    alt={img.descripcion || "trabajo"}
                  />

                  <div className="trab-portfolio-info">
                    <p title={img.descripcion}>{img.descripcion || "Trabajo realizado"}</p>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger w-100"
                      onClick={() => eliminarImagenTrabajo(img.idImagen)}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="trabajadores-empty-state compact">
              <Image size={34} />
              <h4>Sin imágenes</h4>
              <p>Aún no hay imágenes para este trabajador.</p>
            </div>
          )}
        </Modal>

        <Modal
          abierto={modalAcceso}
          titulo={
            trabajadorAcceso
              ? `Acceso: ${trabajadorAcceso.nombre}`
              : "Acceso del trabajador"
          }
          onClose={cerrarAcceso}
          ancho="620px"
        >
          <p className="section-subtitle">
            Ingresa el correo del trabajador. El sistema generará una contraseña temporal
            y la enviará por Gmail.
          </p>

          <div className="trab-access-form">
            <label className="label-gold">Correo del trabajador</label>

            <input
              className="form-control input-dark"
              value={correoAcceso}
              onChange={(e) => setCorreoAcceso(e.target.value)}
              placeholder="trabajador@gmail.com"
            />
          </div>

          <div className="trab-access-details">
            <div>
              <span>Trabajador</span>
              <b>{trabajadorAcceso?.nombre}</b>
            </div>

            <div>
              <span>Acción</span>
              <b>Crear acceso y enviar contraseña temporal</b>
            </div>
          </div>

          <div className="trab-modal-actions three">
            <button
              type="button"
              className="btn btn-dark-outline"
              onClick={cerrarAcceso}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-dark-outline"
              onClick={resetearAcceso}
              disabled={reseteandoAcceso}
              title="Disponible si el trabajador ya tiene usuario vinculado."
            >
              {reseteandoAcceso ? "Enviando..." : "Resetear"}
            </button>

            <button
              type="button"
              className="btn btn-gold"
              onClick={crearAcceso}
              disabled={creandoAcceso}
            >
              {creandoAcceso ? "Creando..." : "Crear acceso"}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default Trabajadores;