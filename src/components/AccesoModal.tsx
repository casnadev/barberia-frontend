import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, LockKey, Check, SealCheck, EnvelopeSimple, Phone, Password } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { perfilService } from '@/services/perfilService'
import { authService } from '@/services/authService'

/**
 * Modal "Acceso": muestra cómo entra el usuario y le deja gestionar sus métodos.
 *  - Ingreso tradicional (correo + contraseña): activar/cambiar/desactivar.
 *    Activar es HÍBRIDO: si el correo ya está confirmado y no cambia -> inline;
 *    si es nuevo o sin confirmar -> pide un OTP al correo para confirmarlo.
 *    Desactivar conserva correo y contraseña; reactivar es un toque.
 *    Cambiar/crear contraseña se confirma con un código (OTP).
 *
 * Pensado mobile-first: bottom-sheet en móvil, corto y sin scroll de relleno.
 */
export function AccesoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'

  const [loading, setLoading] = useState(true)
  const [correoRegistrado, setCorreoRegistrado] = useState('')
  const [correoConfirmado, setCorreoConfirmado] = useState(false)
  const [telefonoConfirmado, setTelefonoConfirmado] = useState(false)
  const [telefono, setTelefono] = useState('')
  const [tienePassword, setTienePassword] = useState(false)
  const [activo, setActivo] = useState(false)

  // Ingreso tradicional
  const [correo, setCorreo] = useState('')
  const [pass, setPass] = useState('')
  const [passRep, setPassRep] = useState('')
  const [otpEnviado, setOtpEnviado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [busy, setBusy] = useState(false)

  // Cambiar contraseña (cuando ya está activo) — por código, igual que el PIN
  const [cambiarAbierto, setCambiarAbierto] = useState(false)
  const [cambiarOtpEnviado, setCambiarOtpEnviado] = useState(false)
  const [codigoCambiar, setCodigoCambiar] = useState('')
  const [passNueva, setPassNueva] = useState('')
  const [passNuevaRep, setPassNuevaRep] = useState('')

  useEffect(() => {
    if (!open) return
    let vivo = true
    setLoading(true)
    resetTransitorios()
    perfilService.getMiPerfil()
      .then((p: any) => {
        if (!vivo) return
        setCorreoRegistrado(p?.correo || '')
        setCorreo(p?.correo || '')
        setTelefono(p?.telefono || '')
        setCorreoConfirmado(Boolean(p?.correoConfirmado))
        setTelefonoConfirmado(Boolean(p?.telefonoConfirmado))
        setTienePassword(Boolean(p?.tienePassword))
        setActivo(Boolean(p?.ingresoTradicionalActivo))
      })
      .catch(() => toast.error('No se pudo cargar tu acceso'))
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [open])

  function resetTransitorios() {
    setPass(''); setPassRep(''); setOtpEnviado(false); setCodigo('')
    setCambiarAbierto(false); setCambiarOtpEnviado(false); setCodigoCambiar(''); setPassNueva(''); setPassNuevaRep('')
  }

  // ---- Ingreso tradicional: activar (híbrido) ----
  const requiereOtp = correo.trim().toLowerCase() !== correoRegistrado.toLowerCase() || !correoConfirmado
  const activar = async () => {
    if (!correo.trim()) return toast.error('Ingresa tu correo')
    if (pass.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')
    if (pass !== passRep) return toast.error('Las contraseñas no coinciden')

    // Correo nuevo/sin confirmar y aún sin código: enviamos OTP primero.
    if (requiereOtp && !otpEnviado) {
      setBusy(true)
      const r = await authService.accesoEnviarOtp(correo.trim())
      setBusy(false)
      if (r.ok) { setOtpEnviado(true); toast.success('Te enviamos un código a tu correo') }
      else toast.error(r.mensaje || 'No se pudo enviar el código')
      return
    }
    if (requiereOtp && !codigo.trim()) return toast.error('Ingresa el código que te enviamos')

    setBusy(true)
    const r = await authService.accesoActivar(correo.trim(), pass, requiereOtp ? codigo.trim() : undefined)
    setBusy(false)
    if (r.ok) {
      toast.success('Ingreso tradicional activado')
      setTienePassword(true); setActivo(true); setCorreoConfirmado(true)
      setCorreoRegistrado(correo.trim()); setPass(''); setPassRep(''); setOtpEnviado(false); setCodigo('')
    } else toast.error(r.mensaje || 'No se pudo activar')
  }

  // ---- Cambiar contraseña (ya activo) — por código, idéntico al PIN ----
  const enviarCodigoCambiar = async () => {
    const id = (correoRegistrado || telefono).trim()
    if (!id) return toast.error('No hay correo ni teléfono para enviar el código')
    setBusy(true)
    const r = await authService.solicitarPassword(id)
    setBusy(false)
    if (r.ok) { setCambiarOtpEnviado(true); toast.success('Código enviado') }
    else toast.error(r.mensaje || 'No se pudo enviar el código')
  }
  const guardarCambiarPass = async () => {
    if (!codigoCambiar.trim()) return toast.error('Ingresa el código que te enviamos')
    if (passNueva.length < 8) return toast.error('La nueva contraseña debe tener al menos 8 caracteres')
    if (passNueva !== passNuevaRep) return toast.error('Las contraseñas no coinciden')
    const id = (correoRegistrado || telefono).trim()
    setBusy(true)
    const r = await authService.establecerPassword(id, codigoCambiar.trim(), passNueva)
    setBusy(false)
    if (r.ok) { toast.success('Contraseña guardada'); setTienePassword(true); setActivo(true); setCambiarAbierto(false); setCambiarOtpEnviado(false); setCodigoCambiar(''); setPassNueva(''); setPassNuevaRep('') }
    else toast.error(r.mensaje || 'No se pudo guardar la contraseña')
  }

  const desactivar = async () => {
    setBusy(true)
    const r = await authService.accesoDesactivar()
    setBusy(false)
    if (r.ok) { toast.success('Ingreso tradicional desactivado'); setActivo(false) }
    else toast.error(r.mensaje || 'No se pudo desactivar')
  }
  const reactivar = async () => {
    setBusy(true)
    const r = await authService.accesoReactivar()
    setBusy(false)
    if (r.ok) { toast.success('Ingreso tradicional reactivado'); setActivo(true) }
    else toast.error(r.mensaje || 'No se pudo reactivar')
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md p-5 shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><LockKey size={20} weight="duotone" /></span>
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">Acceso</h3>
              <p className="text-xs text-gray-400">Así entras a tu cuenta. Puedes sumar más formas.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 -mt-0.5" aria-label="Cerrar"><X size={20} /></button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
        ) : (
          <div className="space-y-4">

            {/* CONTACTOS VERIFICADOS (correo / teléfono) */}
            {(correoRegistrado || telefono) && (
              <div className="border border-gray-100 rounded-xl p-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-gray-500">Tus contactos</p>
                {correoRegistrado && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <EnvelopeSimple size={17} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-800 truncate">{correoRegistrado}</span>
                    </span>
                    {correoConfirmado
                      ? <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0"><SealCheck size={13} weight="fill" /> Verificado</span>
                      : <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full shrink-0">Sin verificar</span>}
                  </div>
                )}
                {telefono && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <Phone size={17} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-800 truncate">{telefono}</span>
                    </span>
                    {telefonoConfirmado
                      ? <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0"><SealCheck size={13} weight="fill" /> Verificado</span>
                      : <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full shrink-0">Sin verificar</span>}
                  </div>
                )}
                <p className="text-[11px] text-gray-400">Verifícalos desde “Mi perfil”.</p>
              </div>
            )}

            {/* INGRESO TRADICIONAL */}
            <div className="border border-gray-100 rounded-xl p-3.5">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center shrink-0"><Password size={18} weight="duotone" /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Ingreso tradicional</span>
                    {tienePassword && activo && <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Check size={12} weight="bold" /> Activo</span>}
                    {tienePassword && !activo && <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Desactivado</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {correoRegistrado && <span className="inline-flex items-center gap-1"><EnvelopeSimple size={13} /> Correo</span>}
                    {correoRegistrado && telefono && <span className="text-gray-300">o</span>}
                    {telefono && <span className="inline-flex items-center gap-1"><Phone size={13} /> Teléfono</span>}
                    <span className="text-gray-300">+</span>
                    <span>contraseña</span>
                  </p>
                </div>
                {!cambiarAbierto && (
                  tienePassword && !activo
                    ? <button onClick={reactivar} disabled={busy} className="text-sm text-blue-600 font-medium px-2 py-1 hover:underline shrink-0 disabled:opacity-50">Reactivar</button>
                    : <button onClick={() => setCambiarAbierto(true)} className="text-sm text-blue-600 font-medium px-2 py-1 hover:underline shrink-0">{tienePassword ? 'Cambiar contraseña' : 'Crear contraseña'}</button>
                )}
              </div>

              {/* Crear / Cambiar contraseña → flujo por código, idéntico al PIN */}

              {cambiarAbierto && (
                <div className="mt-3 space-y-2">
                  {!cambiarOtpEnviado ? (
                    <>
                      <p className="text-xs text-gray-500">Te enviaremos un código a {correoRegistrado || telefono || 'tu contacto'} para confirmar.</p>
                      <div className="flex gap-2">
                        <button onClick={enviarCodigoCambiar} disabled={busy} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Enviando…' : 'Enviar código'}</button>
                        <button onClick={() => setCambiarAbierto(false)} className="px-3 text-sm text-gray-500">Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <input className={field} value={codigoCambiar} onChange={e => setCodigoCambiar(e.target.value)} inputMode="numeric" maxLength={6} />
                      <input className={field} type="password" value={passNueva} onChange={e => setPassNueva(e.target.value)} />
                      <input className={field} type="password" value={passNuevaRep} onChange={e => setPassNuevaRep(e.target.value)} />
                      <button onClick={guardarCambiarPass} disabled={busy} className="w-full bg-gray-900 hover:bg-black text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Guardando…' : (tienePassword ? 'Guardar contraseña' : 'Crear contraseña')}</button>
                    </>
                  )}
                </div>
              )}

              {/* Reactivar y Crear/Cambiar viven en el botón del header (vista = PIN) */}
            </div>

          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
