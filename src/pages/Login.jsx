import { useState } from "react";
import API_BASE from "../services/api";
import { useNavigate } from "react-router-dom";
import Toast from "../components/ui/Toast";
import LogoAnimado from "../components/ui/LogoAnimado";
const LOGIN_BACKGROUND =
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1600&q=80";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const navigate = useNavigate();

  const redireccionarPorRol = (rol, debeCambiarPassword) => {
    if (debeCambiarPassword) {
      navigate("/cambiar-password", { replace: true });
      return;
    }

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

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setTipoMensaje("error");
    setError("Rol no autorizado.");
  };

  const login = async (e) => {
    e.preventDefault();
    setError("");

    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio || !password.trim()) {
      setTipoMensaje("error");
      setError("Ingresa correo y contraseña.");
      return;
    }

    setCargando(true);

    try {
      const res = await fetch(`${API_BASE}/Auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correo: correoLimpio,
          password,
        }),
      });

      let data = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setTipoMensaje("error");
        setError(data.mensaje || "Correo o contraseña incorrectos.");
        return;
      }

      if (!data.token) {
        setTipoMensaje("error");
        setError("No se recibió token de acceso.");
        return;
      }

      const rol = String(data.rol || "").trim().toLowerCase();
      const debeCambiarPassword = Boolean(data.debeCambiarPassword);

      const usuario = {
        idUsuario: data.idUsuario,
        idNegocio: data.idNegocio,
        idTrabajador: data.idTrabajador,
        nombre: data.nombre,
        correo: data.correo,
        rol,
        debeCambiarPassword,
      };

      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(usuario));

      redireccionarPorRol(rol, debeCambiarPassword);
    } catch (err) {
      console.error(err);
      setTipoMensaje("error");
      setError("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className="login-page"
      style={{
        minHeight: "100vh",
        backgroundImage: `linear-gradient(135deg, rgba(8,8,8,.82), rgba(12,12,12,.62)), url(${LOGIN_BACKGROUND})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <form
        className="login-card"
        onSubmit={login}
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "rgba(255, 252, 245, 0.95)",
          border: "1px solid rgba(212, 175, 55, 0.35)",
          borderRadius: "28px",
          padding: "34px",
          boxShadow: "0 24px 70px rgba(0,0,0,.35)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="login-header text-center mb-4">
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

          <h1
            style={{
              color: "#d4af37",
              fontWeight: 900,
              marginBottom: "8px",
              letterSpacing: "-0.5px",
            }}
          >
            Bienvenido
          </h1>

          <p
            style={{
              color: "#6b7280",
              marginBottom: 0,
              fontWeight: 600,
            }}
          >
            Accede a tu panel de Barber.pe
          </p>
        </div>

        <div className="mb-3">
          <label
            className="form-label"
            style={{ color: "#8b6f10", fontWeight: 800 }}
          >
            Correo
          </label>

          <input
            type="email"
            className="form-control"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="Email Here"
            autoComplete="username"
            disabled={cargando}
            style={{
              borderRadius: "16px",
              padding: "13px 15px",
              border: "1px solid rgba(17,24,39,.12)",
              background: "#fff",
              color: "#111827",
              fontWeight: 600,
            }}
          />
        </div>

        <div className="mb-2">
          <label
            className="form-label"
            style={{ color: "#8b6f10", fontWeight: 800 }}
          >
            Contraseña
          </label>

          <div style={{ position: "relative" }}>
            <input
              type={mostrarPassword ? "text" : "password"}
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password Here"
              autoComplete="current-password"
              disabled={cargando}
              style={{
                borderRadius: "16px",
                padding: "13px 92px 13px 15px",
                border: "1px solid rgba(17,24,39,.12)",
                background: "#fff",
                color: "#111827",
                fontWeight: 600,
              }}
            />

            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              disabled={cargando}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: "#b88a1e",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {mostrarPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <div
          style={{
            color: "#6b7280",
            fontSize: "0.88rem",
            marginBottom: "20px",
            marginTop: "10px",
            lineHeight: 1.45,
          }}
        >
          ¿Olvidaste tu contraseña? Solicita al administrador restablecer tu
          acceso.
        </div>

        <button
          type="submit"
          className="btn w-100"
          disabled={cargando}
          style={{
            borderRadius: "18px",
            padding: "13px 18px",
            background: cargando
              ? "#9ca3af"
              : "linear-gradient(135deg, #d4af37, #f4d35e)",
            color: "#111",
            fontWeight: 900,
            border: "none",
            boxShadow: "0 14px 30px rgba(212,175,55,.30)",
          }}
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>

        <div
          className="text-center mt-4"
          style={{
            color: "#9ca3af",
            fontSize: "0.8rem",
            fontWeight: 700,
          }}
        >
          Barber.pe SaaS • Gestión profesional para barberías
        </div>
      </form>

      <Toast mensaje={error} tipo={tipoMensaje} onClose={() => setError("")} />
    </div>
  );
}