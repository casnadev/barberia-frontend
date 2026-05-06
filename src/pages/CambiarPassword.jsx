import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../services/api";
import authFetch from "../services/authFetch";
import Toast from "../components/ui/Toast";
import LogoAnimado from "../components/ui/LogoAnimado";

export default function CambiarPassword() {
  const navigate = useNavigate();

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");
  const [cargando, setCargando] = useState(false);

  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

  const redirigir = () => {
    const rol = String(usuario?.rol || "").toLowerCase();

    if (rol === "superadmin") {
      navigate("/superadmin", { replace: true });
      return;
    }

    if (rol === "admin") {
      navigate("/admin", { replace: true });
      return;
    }

    if (rol === "trabajador") {
      navigate("/trabajador", { replace: true });
      return;
    }

    navigate("/login", { replace: true });
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();

    setMensaje("");

    if (!passwordActual || !passwordNueva || !confirmarPassword) {
      setTipoMensaje("error");
      setMensaje("Completa todos los campos.");
      return;
    }

    if (passwordNueva.length < 6) {
      setTipoMensaje("error");
      setMensaje("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (passwordNueva !== confirmarPassword) {
      setTipoMensaje("error");
      setMensaje("Las nuevas contraseñas no coinciden.");
      return;
    }

    try {
      setCargando(true);

      const res = await authFetch(`${API_BASE}/Usuarios/cambiar-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          passwordActual,
          passwordNueva,
        }),
      });

      if (!res) return;

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.mensaje || "No se pudo actualizar la contraseña.");
        return;
      }

      const usuarioActualizado = {
        ...usuario,
        debeCambiarPassword: false,
      };

      localStorage.setItem(
        "usuario",
        JSON.stringify(usuarioActualizado)
      );

      setTipoMensaje("success");
      setMensaje("Contraseña actualizada correctamente.");

      setTimeout(() => {
        redirigir();
      }, 1000);
    } catch (error) {
      console.error(error);
      setTipoMensaje("error");
      setMensaje("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className="login-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "20px",
        backgroundImage:
          "linear-gradient(rgba(10,10,10,.82), rgba(10,10,10,.88)), url('https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1974&auto=format&fit=crop')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backdropFilter: "blur(3px)",
        }}
      />

      <div
        className="login-card"
        style={{
          position: "relative",
          zIndex: 5,
          width: "100%",
          maxWidth: "480px",
          background: "rgba(255,255,255,.93)",
          borderRadius: "32px",
          padding: "42px",
          boxShadow: "0 25px 80px rgba(0,0,0,.45)",
          border: "1px solid rgba(212,175,55,.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              margin: "0 auto 16px",
              width: "90px",
              height: "90px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogoAnimado width={90} height={90} />
          </div>
        </div>

        <div className="text-center mb-4">
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 900,
              color: "#c89b2c",
              marginBottom: "10px",
            }}
          >
            Actualiza tu contraseña
          </h1>

          <p
            style={{
              color: "#5f5f5f",
              fontWeight: 600,
              marginBottom: 0,
            }}
          >
            Por seguridad debes cambiar la contraseña temporal asignada.
          </p>
        </div>

        <form onSubmit={cambiarPassword}>
          <div className="mb-3">
            <label
              style={{
                color: "#b88918",
                fontWeight: 800,
                marginBottom: "8px",
                display: "block",
              }}
            >
              Contraseña actual
            </label>

            <input
              type="password"
              className="form-control"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              disabled={cargando}
              style={{
                height: "58px",
                borderRadius: "18px",
                border: "1px solid #e7e7e7",
                background: "#fff",
                fontWeight: 600,
                paddingInline: "18px",
              }}
            />
          </div>

          <div className="mb-3">
            <label
              style={{
                color: "#b88918",
                fontWeight: 800,
                marginBottom: "8px",
                display: "block",
              }}
            >
              Nueva contraseña
            </label>

            <input
              type="password"
              className="form-control"
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              disabled={cargando}
              style={{
                height: "58px",
                borderRadius: "18px",
                border: "1px solid #e7e7e7",
                background: "#fff",
                fontWeight: 600,
                paddingInline: "18px",
              }}
            />
          </div>

          <div className="mb-4">
            <label
              style={{
                color: "#b88918",
                fontWeight: 800,
                marginBottom: "8px",
                display: "block",
              }}
            >
              Confirmar nueva contraseña
            </label>

            <input
              type="password"
              className="form-control"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              disabled={cargando}
              style={{
                height: "58px",
                borderRadius: "18px",
                border: "1px solid #e7e7e7",
                background: "#fff",
                fontWeight: 600,
                paddingInline: "18px",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: "100%",
              height: "58px",
              borderRadius: "18px",
              border: "none",
              background:
                "linear-gradient(135deg,#c89b2c 0%, #e0bb52 100%)",
              color: "#111",
              fontWeight: 900,
              fontSize: "1rem",
              letterSpacing: ".3px",
              boxShadow: "0 15px 35px rgba(200,155,44,.35)",
            }}
          >
            {cargando ? "Actualizando..." : "Guardar nueva contraseña"}
          </button>
        </form>
      </div>

      <Toast
        mensaje={mensaje}
        tipo={tipoMensaje}
        onClose={() => setMensaje("")}
      />
    </div>
  );
}