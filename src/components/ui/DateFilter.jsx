import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function DateFilter({
  label,
  value,
  onChange,
  minDate = null,
}) {
  const parseFechaInput = (valor) => {
    if (!valor || typeof valor !== "string") return null;

    const partes = valor.split("-");
    if (partes.length !== 3) return null;

    const [anio, mes, dia] = partes.map(Number);
    const fecha = new Date(anio, mes - 1, dia);

    return isNaN(fecha.getTime()) ? null : fecha;
  };

  const formatFechaInput = (fecha) => {
    if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return "";

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  };

  return (
    <div>
      <label
        className="form-label"
        style={{ color: "#d4af37", fontWeight: 600 }}
      >
        {label}
      </label>

      <DatePicker
        selected={parseFechaInput(value)}
        onChange={(date) => onChange(formatFechaInput(date))}
        dateFormat="dd/MM/yyyy"
        placeholderText="Selecciona fecha"
        className="form-control input-dark"
        isClearable
        minDate={minDate ? parseFechaInput(minDate) : null}
        autoComplete="off"
      />
    </div>
  );
}