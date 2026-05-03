import React, { useEffect, useState } from "react";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";

import CardDark from "../components/ui/CardDark";
import GoldBadge from "../components/ui/GoldBadge";
import AvatarCircle from "../components/ui/AvatarCircle";
import { Pencil, Image, Key, Trash2 } from "lucide-react";

function Trabajadores() {
  const [lista, setLista] = useState([]);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [destacado, setDestacado] = useState(false);

  const [editando, setEditando] = useState(null);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [trabajadorAcceso, setTrabajadorAcceso] = useState(null);
  const [correoAcceso, setCorreoAcceso] = useState("");
  const [passwordAcceso, setPasswordAcceso] = useState("");

  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [imagenTrabajo, setImagenTrabajo] = useState(null);
  const [descripcionTrabajo, setDescripcionTrabajo] = useState("");
  const [imagenesTrabajo, setImagenesTrabajo] = useState([]);

  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoTrabajo, setSubiendoTrabajo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [creandoAcceso, setCreandoAcceso] = useState(false);

  useEffect(() => {
    cargarInicial();
  }, []);

  const obtenerUrl = (ruta) => {
    if (!ruta) return "";
    return `${API_BASE.replace("/api", "")}${ruta}`;
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
      setError("");

      const res = await authFetch(`${API_BASE}/Trabajadores`);
      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "Error cargando trabajadores");
        return;
      }

      setLista(data || []);
    } catch (err) {
      console.error(err);
      setError("Error cargando trabajadores");
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

      setImagenesTrabajo(data || []);
    } catch (err) {
      console.error(err);
      setImagenesTrabajo([]);
    }
  };

  const limpiar = () => {
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
    setImagenTrabajo(null);
    setDescripcionTrabajo("");
    setImagenesTrabajo([]);
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
      limpiar();
      await recargarTrabajadores();
    } catch (err) {
      console.error(err);
      setError("Error en el servidor");
    } finally {
      setGuardando(false);
    }
  };

  const editar = async (t) => {
    setEditando(t.idTrabajador);
    setTrabajadorSeleccionado(t);
    setNombre(t.nombre || "");
    setTelefono(t.telefono || "");
    setPorcentaje(t.porcentajeComision ?? "");
    setDescripcion(t.descripcion || "");
    setEspecialidad(t.especialidad || "");
    setExperiencia(t.experiencia || "");
    setDestacado(!!t.destacado);
    setFotoPerfil(null);

    await cargarImagenesTrabajador(t.idTrabajador);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

  const seleccionarParaImagenes = async (t) => {
    setTrabajadorSeleccionado(t);
    setEditando(null);
    await cargarImagenesTrabajador(t.idTrabajador);
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
      const res = await authFetch(
        `${API_BASE}/Trabajadores/imagenes/${idImagen}`,
        {
          method: "DELETE",
        }
      );

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

  const crearAcceso = async () => {
    setMensaje("");
    setError("");

    if (!trabajadorAcceso) return;

    const correoLimpio = correoAcceso.trim().toLowerCase();
    const passwordLimpio = passwordAcceso.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
      setError("Correo inválido.");
      return;
    }

    if (passwordLimpio.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
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
          password: passwordLimpio,
        }),
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo crear el acceso");
        return;
      }

      setMensaje("Acceso vinculado correctamente");
      setTrabajadorAcceso(null);
      setCorreoAcceso("");
      setPasswordAcceso("");
    } catch (err) {
      console.error(err);
      setError("Error al crear acceso");
    } finally {
      setCreandoAcceso(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="container-fluid py-4">
        <CardDark className="mb-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h1
                className="page-title mb-1"
                style={{ color: "#d4af37", fontWeight: 900 }}
              >
                Gestión de Trabajadores
              </h1>

              <p
                className="page-subtitle"
                style={{ color: "#111827", fontWeight: 700 }}
              >
                Administra perfiles públicos, portafolio, accesos y trabajadores destacados.
              </p>
            </div>

            <GoldBadge>{lista.length} trabajadores activos</GoldBadge>
          </div>
        </CardDark>

        {mensaje && <div className="alert alert-success shadow-sm">{mensaje}</div>}
        {error && <div className="alert alert-danger shadow-sm">{error}</div>}

        <div className="row g-4">
          <div className="col-lg-4">
            <CardDark>
              <div className="mb-4">
                <h4 className="section-title">
                  {editando ? "Editar Trabajador" : "Nuevo Trabajador"}
                </h4>

                <p className="section-subtitle">
                  Completa los datos que verá el cliente en el perfil público.
                </p>
              </div>

              <div className="mb-3">
                <label className="label-gold">Nombre completo</label>
                <input
                  className="form-control input-dark"
                  value={nombre}
                  maxLength={120}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="label-gold">Teléfono</label>
                <input
                  className="form-control input-dark"
                  value={telefono}
                  maxLength={9}
                  inputMode="numeric"
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>

              <div className="mb-3">
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

              <div className="mb-3">
                <label className="label-gold">Especialidad</label>
                <input
                  className="form-control input-dark"
                  value={especialidad}
                  maxLength={150}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  placeholder="Ejemplo: Cortes clásicos, fades y barba"
                />
              </div>

              <div className="mb-3">
                <label className="label-gold">Experiencia</label>
                <input
                  className="form-control input-dark"
                  value={experiencia}
                  maxLength={150}
                  onChange={(e) => setExperiencia(e.target.value)}
                  placeholder="Ejemplo: 3 años de experiencia"
                />
              </div>

              <div className="mb-3">
                <label className="label-gold">Biografía pública</label>
                <textarea
                  rows="3"
                  className="form-control input-dark"
                  value={descripcion}
                  maxLength={500}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción que verá el cliente en el perfil público"
                />
              </div>

              <div className="form-check form-switch mb-4">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={destacado}
                  onChange={(e) => setDestacado(e.target.checked)}
                  id="swDestacado"
                />

                <label
                  className="form-check-label fw-bold"
                  htmlFor="swDestacado"
                  style={{ color: "#c9a227" }}
                >
                  Trabajador destacado ⭐
                </label>
              </div>

              <div className="mb-4">
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

              <div className="d-flex gap-2">
                <button
                  className="btn btn-gold w-100"
                  onClick={guardar}
                  disabled={subiendoFoto || guardando}
                >
                  {subiendoFoto || guardando
                    ? "Procesando..."
                    : editando
                    ? "Actualizar"
                    : "Registrar"}
                </button>

                <button className="btn btn-dark-outline" onClick={limpiar}>
                  Limpiar
                </button>
              </div>
            </CardDark>
          </div>

          <div className="col-lg-8">
            <CardDark>
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                  <h4 className="section-title">Lista de Trabajadores</h4>
                  <p className="section-subtitle">
                    Vista rápida de estado, especialidad, comisión y acciones.
                  </p>
                </div>
              </div>

              <div className="row g-3">
                {lista.map((t) => (
                  <div className="col-md-6 col-xl-4" key={t.idTrabajador}>
                    <div
                      className="worker-card h-100"
                      style={{
                        textAlign: "left",
                        minHeight: "100%",
                      }}
                    >
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <AvatarCircle
                          src={obtenerUrl(t.fotoPerfilUrl)}
                          alt={t.nombre}
                          fallback={t.nombre?.charAt(0)?.toUpperCase() || "T"}
                          selected={t.destacado}
                          size="md"
                        />

                        <div style={{ minWidth: 0 }}>
                          <h5
                            className="mb-1 truncate-one-line"
                            title={t.nombre}
                          >
                            {t.nombre}
                          </h5>

                          {t.destacado ? (
                            <span className="table-pill">⭐ Destacado</span>
                          ) : (
                            <span className="badge bg-light text-secondary">
                              Estándar
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="section-subtitle mb-3">
                        {t.descripcion || "Sin biografía pública registrada."}
                      </p>

                      <div className="modal-success-details mb-3">
                        <div className="modal-info-row">
                          <span>Especialidad</span>
                          <b>{t.especialidad || "No especificada"}</b>
                        </div>

                        <div className="modal-info-row">
                          <span>Experiencia</span>
                          <b>{t.experiencia || "No especificada"}</b>
                        </div>

                        <div className="modal-info-row">
                          <span>Comisión</span>
                          <b>{t.porcentajeComision || 0}%</b>
                        </div>
                      </div>

                      <div className="actions-grid">
                        <button
                          className="btn-action-dark"
                          onClick={() => editar(t)}
                        >
                          <Pencil size={16} />
                          <span>Editar</span>
                        </button>

                        <button
                          className="btn-action-dark"
                          onClick={() => seleccionarParaImagenes(t)}
                        >
                          <Image size={16} />
                          <span>Imágenes</span>
                        </button>

                        <button
                          className="btn-action-dark"
                          onClick={() => setTrabajadorAcceso(t)}
                        >
                          <Key size={16} />
                          <span>Acceso</span>
                        </button>

                        <button
                          className="btn-action-danger"
                          onClick={() => eliminar(t.idTrabajador)}
                        >
                          <Trash2 size={16} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {lista.length === 0 && (
                <p className="text-center section-subtitle py-4">
                  Aún no tienes trabajadores registrados.
                </p>
              )}

              {trabajadorAcceso && (
                <div
                  className="mt-4 p-4 animate-fade-in"
                  style={{
                    background: "#f9fafb",
                    borderRadius: "18px",
                    border: "1px solid #c9a22733",
                  }}
                >
                  <h5 className="section-title mb-3">
                    🔑 Crear acceso: {trabajadorAcceso.nombre}
                  </h5>

                  <div className="row g-3">
                    <div className="col-md-5">
                      <label className="label-gold">Email</label>
                      <input
                        className="form-control input-dark"
                        value={correoAcceso}
                        onChange={(e) => setCorreoAcceso(e.target.value)}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="label-gold">Password</label>
                      <input
                        type="password"
                        className="form-control input-dark"
                        value={passwordAcceso}
                        onChange={(e) => setPasswordAcceso(e.target.value)}
                      />
                    </div>

                    <div className="col-md-3 d-flex align-items-end">
                      <button
                        className="btn btn-gold w-100"
                        onClick={crearAcceso}
                        disabled={creandoAcceso}
                      >
                        {creandoAcceso ? "Creando..." : "Vincular"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {trabajadorSeleccionado && (
                <div className="mt-4 animate-fade-in">
                  <hr className="module-separator" />

                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <div>
                      <h5 className="section-title mb-1">
                        📸 Portafolio: {trabajadorSeleccionado.nombre}
                      </h5>

                      <p className="section-subtitle">
                        Agrega trabajos reales que aparecerán en el perfil público.
                      </p>
                    </div>

                    <GoldBadge>{imagenesTrabajo.length} / 10</GoldBadge>
                  </div>

                  <div className="row g-2 mb-4">
                    <div className="col-md-5">
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
                    </div>

                    <div className="col-md-5">
                      <input
                        className="form-control input-dark"
                        placeholder="¿Qué trabajo es?"
                        value={descripcionTrabajo}
                        maxLength={200}
                        onChange={(e) => setDescripcionTrabajo(e.target.value)}
                      />
                    </div>

                    <div className="col-md-2">
                      <button
                        className="btn btn-gold w-100"
                        onClick={subirImagenTrabajo}
                        disabled={subiendoTrabajo || imagenesTrabajo.length >= 10}
                      >
                        {subiendoTrabajo ? "..." : "Subir"}
                      </button>
                    </div>
                  </div>

                  {imagenesTrabajo.length >= 10 && (
                    <p className="section-subtitle mb-3">
                      Has alcanzado el límite recomendado de 10 trabajos para el perfil público.
                    </p>
                  )}

                  <div className="row g-3">
                    {imagenesTrabajo.map((img) => (
                      <div className="col-md-4" key={img.idImagen}>
                        <div className="card-image-work">
                          <img
                            className="img-work"
                            src={obtenerUrl(img.urlImagen)}
                            alt="trabajo"
                          />

                          <div className="p-2">
                            <p className="small text-muted mb-2 text-truncate">
                              {img.descripcion}
                            </p>

                            <button
                              className="btn btn-sm btn-outline-danger w-100"
                              onClick={() => eliminarImagenTrabajo(img.idImagen)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardDark>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Trabajadores;