import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../services/api";
import Toast from "../components/ui/Toast";
import LogoAnimado from "../components/ui/LogoAnimado";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token") || "";

  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");
  const [cargando, setCargando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setMensaje("");

    if (!token) {
      setTipoMensaje("error");
      setMensaje("El enlace no es válido.");
      return;
    }

    if (passwordNueva.length < 6) {
      setTipoMensaje("error");
      setMensaje("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (passwordNueva !== confirmar) {
      setTipoMensaje("error");
      setMensaje("Las contraseñas no coinciden.");
      return;
    }

    try {
      setCargando(true);

      const res = await fetch(`${API_BASE}/Auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, passwordNueva }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.mensaje || "No se pudo actualizar la contraseña.");
        return;
      }

      setTipoMensaje("success");
      setMensaje(data.mensaje || "Contraseña actualizada correctamente.");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch {
      setTipoMensaje("error");
      setMensaje("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-premium-page">
      <div className="auth-premium-card">
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

        <h1>Nueva contraseña</h1>
        <p>Crea una nueva contraseña para recuperar el acceso a Barber.pe.</p>

        <form onSubmit={guardar}>
          <label>Nueva contraseña</label>
          <input
            type="password"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            disabled={cargando}
          />

          <label>Confirmar contraseña</label>
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            disabled={cargando}
          />

          <button type="submit" disabled={cargando}>
            {cargando ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>

        <Link className="auth-link" to="/login">
          Volver al login
        </Link>
      </div>

      <Toast
        mensaje={mensaje}
        tipo={tipoMensaje}
        onClose={() => setMensaje("")}
      />
    </div>
  );
}