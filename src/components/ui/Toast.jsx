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

  return (
    <div className={`toast-pro toast-${tipo}`}>
      {mensaje}
    </div>
  );
}

export default Toast;