import { useEffect, useState } from "react";
import API_BASE from "../../services/api";
import authFetch from "../../services/authFetch";

import CardDark from "../../components/ui/CardDark";
import PageHeader from "../../components/ui/PageHeader";
import GoldBadge from "../../components/ui/GoldBadge";

const diasBase = [
    { diaSemana: 1, nombre: "Lunes" },
    { diaSemana: 2, nombre: "Martes" },
    { diaSemana: 3, nombre: "Miércoles" },
    { diaSemana: 4, nombre: "Jueves" },
    { diaSemana: 5, nombre: "Viernes" },
    { diaSemana: 6, nombre: "Sábado" },
    { diaSemana: 7, nombre: "Domingo" },
];

export default function MiDisponibilidad() {
    const [dias, setDias] = useState(
        diasBase.map((d) => ({
            ...d,
            horaInicio: "09:00",
            horaFin: "18:00",
            intervaloMinutos: 60,
            estado: false,
        }))
    );

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [bloqueos, setBloqueos] = useState([]);

    const [bloqueoForm, setBloqueoForm] = useState({
        fecha: "",
        horaInicio: "13:00",
        horaFin: "14:00",
        motivo: ""
    });

    const [guardandoBloqueo, setGuardandoBloqueo] = useState(false);

    useEffect(() => {
        const cargar = async () => {
            try {
                const res = await authFetch(`${API_BASE}/Disponibilidad/mi-disponibilidad`);
                if (!res) return;

                const data = await res.json();

                setDias((prev) =>
                    prev.map((dia) => {
                        const encontrado = data.find((x) => x.diaSemana === dia.diaSemana);

                        if (!encontrado) return dia;

                        return {
                            ...dia,
                            horaInicio: encontrado.horaInicio?.substring(0, 5) || "09:00",
                            horaFin: encontrado.horaFin?.substring(0, 5) || "18:00",
                            intervaloMinutos: encontrado.intervaloMinutos || 60,
                            estado: encontrado.estado,
                        };
                    })
                );
            } catch (err) {
                console.error(err);
                setError("Error al cargar disponibilidad");
            }
        };

        cargar();
        cargarBloqueos();
    }, []);

    const actualizarDia = (diaSemana, campo, valor) => {
        setDias((prev) =>
            prev.map((d) =>
                d.diaSemana === diaSemana
                    ? {
                        ...d,
                        [campo]: valor,
                    }
                    : d
            )
        );
    };

    const guardar = async () => {
        setMensaje("");
        setError("");

        const activos = dias.filter((d) => d.estado);

        if (activos.length === 0) {
            setError("Debes activar al menos un día de atención.");
            return;
        }

        try {
            setGuardando(true);

            const body = activos.map((d) => ({
                diaSemana: d.diaSemana,
                horaInicio: `${d.horaInicio}:00`,
                horaFin: `${d.horaFin}:00`,
                intervaloMinutos: Number(d.intervaloMinutos),
                estado: true,
            }));

            const res = await authFetch(`${API_BASE}/Disponibilidad/guardar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!res) return;

            const data = await res.json();

            if (!res.ok) {
                setError(data.mensaje || "No se pudo guardar la disponibilidad");
                return;
            }

            setMensaje(data.mensaje || "Disponibilidad actualizada correctamente");
        } catch (err) {
            console.error(err);
            setError("Error al guardar disponibilidad");
        } finally {
            setGuardando(false);
        }
    };

    const bloquearHorario = async () => {

        setMensaje("");
        setError("");

        if (
            !bloqueoForm.fecha ||
            !bloqueoForm.horaInicio ||
            !bloqueoForm.horaFin
        ) {
            setError("Completa los datos del bloqueo");
            return;
        }

        try {

            setGuardandoBloqueo(true);

            const res = await authFetch(
                `${API_BASE}/Disponibilidad/bloquear-horario`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        fecha: bloqueoForm.fecha,
                        horaInicio: `${bloqueoForm.horaInicio}:00`,
                        horaFin: `${bloqueoForm.horaFin}:00`,
                        motivo: bloqueoForm.motivo
                    })
                }
            );

            if (!res) return;

            const data = await res.json();

            if (!res.ok) {
                setError(data.mensaje);
                return;
            }

            setMensaje(data.mensaje);

            setBloqueoForm({
                fecha: "",
                horaInicio: "13:00",
                horaFin: "14:00",
                motivo: ""
            });

            cargarBloqueos();

        } catch (err) {
            console.error(err);
            setError("Error registrando bloqueo");
        }
        finally {
            setGuardandoBloqueo(false);
        }

    };

    const cargarBloqueos = async () => {

        try {

            const res = await authFetch(
                `${API_BASE}/Disponibilidad/mis-bloqueos`
            );

            if (!res) return;

            const data = await res.json();

            setBloqueos(data);

        } catch (err) {
            console.error(err);
        }

    };

    const eliminarBloqueo = async (id) => {

        try {

            const res = await authFetch(
                `${API_BASE}/Disponibilidad/eliminar-bloqueo/${id}`,
                {
                    method: "PATCH"
                }
            );

            if (!res) return;

            cargarBloqueos();

        } catch (err) {
            console.error(err);
        }

    };

    return (
        <div className="page-shell">
            <PageHeader
                title="Mi Disponibilidad"
                subtitle="Configura tus días y horarios de atención"
            />

            <div className="container py-4">
                {mensaje && <div className="alert alert-success">{mensaje}</div>}
                {error && <div className="alert alert-danger">{error}</div>}

                <CardDark>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4 className="section-title">Horario semanal</h4>
                            <p className="section-subtitle">
                                Los clientes solo podrán reservar en los horarios activos.
                            </p>
                        </div>

                        <GoldBadge>{dias.filter((d) => d.estado).length} días activos</GoldBadge>
                    </div>

                    <div className="row g-3">
                        {dias.map((d) => (
                            <div className="col-lg-6" key={d.diaSemana}>
                                <div
                                    className="p-3"
                                    style={{
                                        borderRadius: "18px",
                                        border: d.estado
                                            ? "1px solid rgba(212,175,55,0.35)"
                                            : "1px solid rgba(255,255,255,0.08)",
                                        background: d.estado
                                            ? "rgba(212,175,55,0.08)"
                                            : "rgba(255,255,255,0.03)",
                                    }}
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h5 className="mb-0">{d.nombre}</h5>

                                        <label style={{ color: "#d4af37", fontWeight: 700 }}>
                                            <input
                                                type="checkbox"
                                                checked={d.estado}
                                                onChange={(e) =>
                                                    actualizarDia(d.diaSemana, "estado", e.target.checked)
                                                }
                                                style={{ marginRight: "8px" }}
                                            />
                                            Atiendo
                                        </label>
                                    </div>

                                    <div className="row g-2">
                                        <div className="col-md-4">
                                            <label className="form-label" style={{ color: "#d4af37" }}>
                                                Inicio
                                            </label>
                                            <input
                                                type="time"
                                                className="form-control input-dark"
                                                value={d.horaInicio}
                                                disabled={!d.estado}
                                                onChange={(e) =>
                                                    actualizarDia(d.diaSemana, "horaInicio", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ color: "#d4af37" }}>
                                                Fin
                                            </label>
                                            <input
                                                type="time"
                                                className="form-control input-dark"
                                                value={d.horaFin}
                                                disabled={!d.estado}
                                                onChange={(e) =>
                                                    actualizarDia(d.diaSemana, "horaFin", e.target.value)
                                                }
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label" style={{ color: "#d4af37" }}>
                                                Intervalo
                                            </label>
                                            <select
                                                className="form-control input-dark"
                                                value={d.intervaloMinutos}
                                                disabled={!d.estado}
                                                onChange={(e) =>
                                                    actualizarDia(
                                                        d.diaSemana,
                                                        "intervaloMinutos",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value={30}>30 min</option>
                                                <option value={45}>45 min</option>
                                                <option value={60}>60 min</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="btn btn-gold w-100 mt-4"
                        onClick={guardar}
                        disabled={guardando}
                    >
                        {guardando ? "Guardando..." : "Guardar disponibilidad"}
                    </button>
                </CardDark>
                <CardDark className="mt-4">

                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4 className="section-title">
                                Bloqueos puntuales
                            </h4>

                            <p className="section-subtitle">
                                Almuerzo, descanso, vacaciones o pausas.
                            </p>
                        </div>

                        <GoldBadge>
                            {bloqueos.length} bloqueos
                        </GoldBadge>

                    </div>


                    <div className="row g-3">

                        <div className="col-md-3">
                            <label className="form-label" style={{ color: "#d4af37" }}>
                                Fecha
                            </label>

                            <input
                                type="date"
                                className="form-control input-dark"
                                value={bloqueoForm.fecha}
                                onChange={(e) =>
                                    setBloqueoForm({
                                        ...bloqueoForm,
                                        fecha: e.target.value
                                    })
                                }
                            />

                        </div>


                        <div className="col-md-3">
                            <label className="form-label" style={{ color: "#d4af37" }}>
                                Inicio
                            </label>

                            <input
                                type="time"
                                className="form-control input-dark"
                                value={bloqueoForm.horaInicio}
                                onChange={(e) =>
                                    setBloqueoForm({
                                        ...bloqueoForm,
                                        horaInicio: e.target.value
                                    })
                                }
                            />

                        </div>


                        <div className="col-md-3">
                            <label className="form-label" style={{ color: "#d4af37" }}>
                                Fin
                            </label>

                            <input
                                type="time"
                                className="form-control input-dark"
                                value={bloqueoForm.horaFin}
                                onChange={(e) =>
                                    setBloqueoForm({
                                        ...bloqueoForm,
                                        horaFin: e.target.value
                                    })
                                }
                            />

                        </div>


                        <div className="col-md-3">
                            <label className="form-label" style={{ color: "#d4af37" }}>
                                Motivo
                            </label>

                            <input
                                className="form-control input-dark"
                                value={bloqueoForm.motivo}
                                onChange={(e) =>
                                    setBloqueoForm({
                                        ...bloqueoForm,
                                        motivo: e.target.value
                                    })
                                }
                            />

                        </div>

                    </div>


                    <button
                        className="btn btn-gold mt-4"
                        onClick={bloquearHorario}
                        disabled={guardandoBloqueo}
                    >
                        {
                            guardandoBloqueo
                                ? "Guardando..."
                                : "Bloquear horario"
                        }
                    </button>


                    <hr style={{
                        borderColor: "rgba(255,255,255,.08)",
                        margin: "30px 0"
                    }} />


                    <div className="row g-3">

                        {
                            bloqueos.map(b => (

                                <div
                                    className="col-md-6"
                                    key={b.idBloqueo}
                                >

                                    <div
                                        className="p-3"
                                        style={{
                                            background: "rgba(255,255,255,.03)",
                                            borderRadius: "18px"
                                        }}
                                    >

                                        <h5>
                                            📌 {b.motivo || "Bloqueo"}
                                        </h5>

                                        <p>
                                            <b>Fecha:</b>
                                            {" "}
                                            {b.fecha?.substring(0, 10)}
                                        </p>

                                        <p>
                                            <b>Horario:</b>
                                            {" "}
                                            {b.horaInicio?.substring(0, 5)}
                                            -
                                            {b.horaFin?.substring(0, 5)}
                                        </p>

                                        <button
                                            className="btn btn-dark-outline"
                                            onClick={() =>
                                                eliminarBloqueo(
                                                    b.idBloqueo
                                                )
                                            }
                                        >
                                            Eliminar
                                        </button>

                                    </div>

                                </div>

                            ))
                        }

                        {
                            bloqueos.length === 0 &&
                            <p className="text-center">
                                Sin bloqueos activos.
                            </p>
                        }

                    </div>

                </CardDark>
            </div>
        </div>
    );
}