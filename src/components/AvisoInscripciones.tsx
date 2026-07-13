import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { getActiveTenant } from '@/services/apiClient'
import { fidelizacionService } from '@/services/fidelizacionService'

/** Cada cuánto se pregunta si alguien se inscribió (ms). */
const INTERVALO = 45_000
/** Ventana que se consulta (min). Cubre el hueco si la pestaña estuvo dormida. */
const VENTANA_MIN = 60

const claveVistos = (tenant: string) => `barberpe:inscripciones-vistas:${tenant}`

/**
 * AVISO DE INSCRIPCIÓN (Entrega 1).
 *
 * Cuando un cliente escanea el CARTEL del local y se inscribe, el barbero que
 * está en caja necesita enterarse en el momento — porque el flujo acordado es:
 * el cliente a pie se inscribe ANTES de cerrar la venta (opción A), y así los
 * puntos entran solos, sin lógica retroactiva.
 *
 *   "👤 Carlos se unió al programa — ya puedes asignarle esta venta"
 *
 * Detalles:
 *  • Solo avisa de altas por QR del local (Origen = QrLocal). Un cliente creado
 *    en la propia venta rápida NO genera aviso: sería ruido.
 *  • Recuerda a quién ya avisó en localStorage, por sede, para no repetir el
 *    toast en cada refresco ni al cambiar de página.
 *  • Si el endpoint falla, calla y sigue: un aviso jamás puede romper el panel.
 *
 * Se monta en el AdminShell (Admin) y en el panel del Trabajador.
 */
export function AvisoInscripciones() {
  const { user } = useAuthStore()
  const vistos = useRef<Set<number>>(new Set())
  const iniciado = useRef(false)

  const rol = user?.rol
  const habilitado = rol === 'Admin' || rol === 'Trabajador' || rol === 'SuperAdmin'

  useEffect(() => {
    if (!habilitado) return

    const tenant = getActiveTenant() || 'default'
    const clave = claveVistos(tenant)

    // Restauramos los ya avisados (para no repetir el toast tras un F5).
    try {
      const guardado = localStorage.getItem(clave)
      if (guardado) vistos.current = new Set<number>(JSON.parse(guardado))
    } catch { /* storage lleno o bloqueado: seguimos sin memoria */ }

    let vivo = true

    const revisar = async () => {
      const lista = await fidelizacionService.inscripcionesRecientes(VENTANA_MIN)
      if (!vivo || lista.length === 0) return

      const nuevos = lista.filter((i) => !vistos.current.has(i.idCliente))

      // PRIMERA pasada tras montar: solo memorizamos. Si no, al abrir el panel
      // saldrían de golpe todos los toasts de la última hora.
      if (!iniciado.current) {
        iniciado.current = true
        lista.forEach((i) => vistos.current.add(i.idCliente))
        persistir(clave)
        return
      }

      nuevos.forEach((i) => {
        vistos.current.add(i.idCliente)
        const nombre = (i.nombreCliente || '').trim().split(' ')[0] || 'Un cliente'
        toast.success(`👤 ${nombre} se unió al programa`, {
          description: 'Ya puedes asignarle esta venta y sus puntos entran solos.',
          duration: 9000,
        })
      })

      if (nuevos.length > 0) persistir(clave)
    }

    const persistir = (k: string) => {
      try {
        // Solo los últimos 200: no dejamos crecer el storage sin límite.
        const arr = Array.from(vistos.current).slice(-200)
        localStorage.setItem(k, JSON.stringify(arr))
      } catch { /* no pasa nada si no se puede guardar */ }
    }

    revisar()
    const t = setInterval(revisar, INTERVALO)
    return () => { vivo = false; clearInterval(t) }
  }, [habilitado])

  // No pinta nada: solo dispara toasts.
  return null
}

/** Export por defecto para importarlo sin llaves si hiciera falta. */
export default AvisoInscripciones
