import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { perfilService } from '@/services/perfilService'
import { panelTrabajadorService } from '@/services/panelTrabajadorService'
import { miCuentaService } from '@/services/miCuentaService'

/**
 * Sincroniza los datos de la sesión (nombre, correo, teléfono, foto) contra el
 * servidor UNA vez por carga de app.
 *
 * Por qué (Tarea 1): el AccountMenu muestra `user.nombreCompleto`, que se guarda
 * al hacer login y queda cacheado en localStorage. Si el Admin cambia el perfil
 * del usuario (p. ej. renombra a un Trabajador), ese cambio se veía en todo el
 * sistema —que lee fresco de la API— pero NO en el menú, porque la sesión seguía
 * con el valor viejo hasta re-loguear. Este hook cierra ese hueco: al cargar la
 * app refresca el perfil y, si algún dato visible cambió, actualiza la sesión y
 * avisa de forma sutil. Aplica a Admin y Trabajador (y también Cliente).
 */
export function useSessionSync() {
  const user = useAuthStore((s) => s.user)
  const yaCorrio = useRef(false)

  useEffect(() => {
    if (!user || yaCorrio.current) return
    yaCorrio.current = true
    let cancel = false

    ;(async () => {
      try {
        let fresco: { nombreCompleto?: string; correo?: string; telefono?: string; urlFotoPerfil?: string | null } | null = null

        if (user.rol === 'Trabajador') {
          const p = await panelTrabajadorService.getMiPerfil()
          fresco = { nombreCompleto: p?.nombreCompleto, correo: p?.correo, telefono: p?.telefono, urlFotoPerfil: p?.urlFotoPerfil ?? null }
        } else if (user.rol === 'Admin') {
          const p = await perfilService.getMiPerfil()
          fresco = { nombreCompleto: p?.nombreCompleto, correo: p?.correo, telefono: p?.telefono, urlFotoPerfil: p?.urlFotoPerfil ?? null }
        } else if (user.rol === 'Cliente') {
          const p = await miCuentaService.getMiPerfil(user.id).catch(() => null)
          fresco = { nombreCompleto: (p as any)?.nombreCompleto, correo: (p as any)?.correo, telefono: (p as any)?.telefono, urlFotoPerfil: (p as any)?.urlFotoPerfil ?? null }
        }
        if (!fresco || cancel) return

        const actual = useAuthStore.getState().user
        if (!actual) return

        // Solo contamos como "cambio" cuando había un valor previo NO vacío y el
        // nuevo difiere (evita falsos positivos por campos que faltaban en el
        // login, como el teléfono).
        const cambio = (nuevo?: string, viejo?: string) => !!nuevo && !!viejo && nuevo !== viejo
        const cambios: string[] = []
        if (cambio(fresco.nombreCompleto, actual.nombreCompleto)) cambios.push('nombre')
        if (cambio(fresco.correo, actual.correo)) cambios.push('correo')
        if (cambio(fresco.telefono, actual.telefono)) cambios.push('teléfono')

        const fotoNueva = fresco.urlFotoPerfil ?? null
        const fotoDistinta = actual.urlFotoPerfil === undefined || fotoNueva !== (actual.urlFotoPerfil ?? null)

        // Actualiza la sesión si algo cambió (o si la foto aún no estaba resuelta).
        if (cambios.length || fotoDistinta) {
          useAuthStore.getState().setUser({
            ...actual,
            nombreCompleto: fresco.nombreCompleto || actual.nombreCompleto,
            correo: fresco.correo || actual.correo,
            telefono: fresco.telefono ?? actual.telefono,
            urlFotoPerfil: fotoNueva,
          })
        }

        // Aviso sutil SOLO si cambió un dato visible (no en la primera resolución
        // de la foto). Para el Trabajador atribuimos el cambio al administrador.
        if (cambios.length) {
          const quien = user.rol === 'Trabajador' ? 'tu administrador' : 'un administrador'
          const lista = cambios.length === 1 ? `Tu ${cambios[0]}` : `Tus datos (${cambios.join(', ')})`
          toast(`${lista} fue actualizado por ${quien}.`, { duration: 6000, icon: 'ℹ️' })
        }
      } catch {
        /* silencioso: nunca romper la sesión por el sync */
      }
    })()

    return () => { cancel = true }
    // Solo depende de la identidad de la sesión.
  }, [user?.id, user?.rol]) // eslint-disable-line react-hooks/exhaustive-deps
}
