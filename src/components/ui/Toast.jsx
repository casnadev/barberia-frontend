import { useEffect } from "react";

function Toast({ mensaje, tipo = "success", onClose }) {
  useEffect(() => {
    if (!mensaje) return;

    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [mensaje, onClose]);

  if (!mensaje) return null;

  const estilos = {
    success: {
      background: "rgba(34,197,94,0.15)",
      border: "1px solid rgba(34,197,94,0.4)",
      color: "#bbf7d0",
    },
    error: {
      background: "rgba(248,113,113,0.15)",
      border: "1px solid rgba(248,113,113,0.4)",
      color: "#fecaca",
    },
    info: {
      background: "rgba(59,130,246,0.15)",
      border: "1px solid rgba(59,130,246,0.4)",
      color: "#bfdbfe",
    },
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "14px 18px",
        borderRadius: "12px",
        fontWeight: 600,
        zIndex: 3000,
        backdropFilter: "blur(10px)",
        boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        animation: "fadeIn 0.3s ease",
        maxWidth: "320px",
        ...estilos[tipo],
      }}
    >
      {mensaje}
    </div>
  );
}

export default Toast;