import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gift, MessageCircle, Send, Trash2, ChevronDown, Heart, Share2,
  Image as ImageIcon, Smile, Flag, CornerDownRight, ShieldCheck, Clock, Tag,
  MoreVertical, Download, X, Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { novedadesService } from '@/services/novedadesService'
import { useAuthStore } from '@/store/authStore'
import { STICKERS } from '@/components/stickers'
import styles from '@/styles/PublicSedeDetail.module.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.100.25:55692'
const img = (u?: string | null) => {
  if (!u || u === 'string') return ''
  return /^(https?:|data:|blob:)/.test(u) ? u : `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`
}

// Fecha corta (comentarios): "4 jun"
const fechaCorta = (s?: string | null) => {
  if (!s) return ''
  try { return new Date(s).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) } catch { return '' }
}
// Fecha + hora (publicación del flyer): "4 jun, 18:30"
const fechaHora = (s?: string | null) => {
  if (!s) return ''
  try {
    const d = new Date(s)
    return `${d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
  } catch { return '' }
}

const etiquetaVigencia = (fechaExpiracion?: string | null): string => {
  if (!fechaExpiracion) return ''
  const fin = new Date(fechaExpiracion).getTime()
  const dias = Math.ceil((fin - Date.now()) / 86_400_000)
  if (dias < 0) return 'Finalizada'
  if (dias === 0) return 'Vence hoy'
  if (dias === 1) return 'Termina mañana'
  if (dias <= 7) return `Termina en ${dias} días`
  return ''
}

const colorTipo = (tipo?: string, brand = '#2855F6') =>
  tipo === 'Evento' ? '#7c3aed' : tipo === 'Aviso' ? '#0891b2' : brand

// ── Una fila de comentario (soporta respuestas anidadas de 1 nivel) ──────────
function Comentario({ c, brand, esCliente, onResponder, onBorrar, onReportar, onAbrirImagen, anidado = false }: any) {
  return (
    <div className={styles.cmt} style={anidado ? { marginLeft: 38 } : undefined}>
      <div className={styles.cmtAvatar} style={c.esRespuestaAdmin ? { background: brand, color: '#fff' } : undefined}>
        {c.esRespuestaAdmin
          ? <ShieldCheck width={16} height={16} />
          : img(c.urlFotoCliente)
            ? <img src={img(c.urlFotoCliente)} alt={c.nombreCliente} />
            : <span>{(c.nombreCliente || '?').trim().charAt(0).toUpperCase()}</span>}
      </div>
      <div className={styles.cmtBody}>
        <div className={styles.cmtHead}>
          <span className={styles.cmtName}>
            {c.nombreCliente}
            {c.esRespuestaAdmin && (
              <span style={{ marginLeft: 6, fontSize: 11, color: brand, fontWeight: 700 }}>· Local</span>
            )}
          </span>
          <span className={styles.cmtDate}>{fechaCorta(c.fechaCreacion)}</span>
        </div>

        {c.comentario && <p className={styles.cmtText}>{c.comentario}</p>}

        {/* Adjunto: sticker (emoji grande), foto o gif */}
        {c.tipoAdjunto === 'Sticker' && c.urlImagen && (
          <div style={{ fontSize: 44, lineHeight: 1.1 }}>{String(c.urlImagen).replace(/^\/+/, '')}</div>
        )}
        {(c.tipoAdjunto === 'Imagen' || c.tipoAdjunto === 'Gif') && c.urlImagen && (
          <button type="button" onClick={() => onAbrirImagen?.(c)} title="Ver imagen"
            style={{ border: 'none', background: 'none', padding: 0, marginTop: 6, cursor: 'pointer', display: 'inline-block' }}>
            <img src={img(c.urlImagen)} alt="adjunto" loading="lazy" style={chatImg} />
          </button>
        )}

        {c.estadoModeracion === 'Pendiente' && (
          <span style={{ fontSize: 11, color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Clock width={12} height={12} /> Tu foto está en revisión
          </span>
        )}

        {/* Acciones del comentario */}
        <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
          {esCliente && !anidado && !c.esRespuestaAdmin && (
            <button onClick={() => onResponder(c)} style={accBtn(brand)}>
              <CornerDownRight width={13} height={13} /> Responder
            </button>
          )}
          {!c.esMio && (
            <button onClick={() => onReportar(c)} style={accBtn('#9ca3af')}>
              <Flag width={13} height={13} /> Reportar
            </button>
          )}
        </div>
      </div>
      {c.esMio && (
        <button className={styles.cmtDel} onClick={() => onBorrar(c.idComentario)} aria-label="Eliminar comentario">
          <Trash2 width={15} height={15} />
        </button>
      )}
    </div>
  )
}

const accBtn = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
  color, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
})

/**
 * Flyer de una promo: imagen, fecha+hora, vigencia, corazones, compartir, botón
 * "Lo quiero" e hilo de comentarios (texto, foto, sticker y respuestas).
 */
export function FlyerNovedad({ novedad, brand = '#2855F6', idSede }: any) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [comentarios, setComentarios] = useState<any[]>([])
  const [abierto, setAbierto] = useState(false)
  const [cargado, setCargado] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [stickersOpen, setStickersOpen] = useState(false)
  const [respondiendoA, setRespondiendoA] = useState<any>(null)

  const [corazones, setCorazones] = useState<number>(novedad.totalCorazones ?? 0)
  const [yoDiCorazon, setYoDiCorazon] = useState<boolean>(!!novedad.yoDiCorazon)

  const [verImagen, setVerImagen] = useState<any>(null) // comentario cuya foto se ve en grande
  const [menuFoto, setMenuFoto] = useState(false)

  const esCliente = user?.rol === 'Cliente'
  const tipoColor = colorTipo(novedad.tipo, brand)
  const vig = etiquetaVigencia(novedad.fechaExpiracion)

  const cargar = async () => {
    try { setComentarios(await novedadesService.comentarios(novedad.idNovedad)) }
    catch { /* noop */ }
    finally { setCargado(true) }
  }
  const toggle = () => {
    const n = !abierto
    setAbierto(n)
    if (n && !cargado) cargar()
  }

  const totalVisibles = comentarios.reduce((acc, c) => acc + 1 + (c.respuestas?.length || 0), 0)

  // ── Corazón ────────────────────────────────────────────────────────────────
  const toggleCorazon = async () => {
    setYoDiCorazon((v) => !v)
    setCorazones((n) => n + (yoDiCorazon ? -1 : 1))
    try {
      const r = await novedadesService.reaccionar(novedad.idNovedad)
      setCorazones(r.totalCorazones)
      setYoDiCorazon(r.yoDiCorazon)
    } catch {
      setYoDiCorazon((v) => !v)
      setCorazones((n) => n + (yoDiCorazon ? 1 : -1))
    }
  }

  // ── Compartir (móvil: menú nativo; PC: copia enlace) ─────────────────────────
  const compartir = async () => {
    const url = window.location.href
    const datos = { title: novedad.titulo, text: novedad.cuerpo, url }
    try {
      if (navigator.share) { await navigator.share(datos); return }
      await navigator.clipboard.writeText(url)
      toast.success('Enlace copiado')
    } catch { /* cancelado */ }
  }

  // ── "Lo quiero" ────────────────────────────────────────────────────────────
  const loQuiero = () => {
    novedadesService.registrarClic(novedad.idNovedad)
    if (novedad.tipoAccion === 'Enlace' && novedad.urlAccion) {
      window.open(novedad.urlAccion, '_blank', 'noopener')
      return
    }
    const ids = (novedad.servicios || []).map((s: any) => s.idServicio).join(',')
    const qs = new URLSearchParams()
    qs.set('promo', String(novedad.idNovedad))
    if (ids) qs.set('servicios', ids)
    const destino = idSede ? `/reservar/${idSede}?${qs}` : `/reservar?${qs}`
    navigate(destino)
  }

  // ── Comentar (texto / foto / sticker) ────────────────────────────────────────
  const enviarTexto = async () => {
    const t = texto.trim()
    if (!t || enviando) return
    setEnviando(true)
    try {
      const nuevo = await novedadesService.comentar(novedad.idNovedad, {
        comentario: t,
        idComentarioPadre: respondiendoA?.idComentario,
      })
      insertarComentario(nuevo)
      setTexto('')
      setRespondiendoA(null)
      toast.success('¡Gracias por tu comentario!')
    } catch {
      toast.error('No se pudo enviar el comentario')
    } finally {
      setEnviando(false)
    }
  }

  const enviarSticker = async (emoji: string) => {
    setStickersOpen(false)
    try {
      const nuevo = await novedadesService.comentar(novedad.idNovedad, {
        urlImagen: emoji,
        tipoAdjunto: 'Sticker',
        idComentarioPadre: respondiendoA?.idComentario,
      })
      insertarComentario(nuevo)
      setRespondiendoA(null)
      toast.success('¡Sticker enviado!')
    } catch {
      toast.error('No se pudo enviar el sticker')
    }
  }

  const elegirFoto = () => { setStickersOpen(false); fileRef.current?.click() }
  const subirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Selecciona una imagen'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no debe superar 5MB'); return }
    setSubiendo(true)
    try {
      const ruta = await novedadesService.subirImagen(file)
      if (!ruta) { toast.error('No se pudo subir la foto'); return }
      const nuevo = await novedadesService.comentar(novedad.idNovedad, {
        comentario: texto.trim() || undefined,
        urlImagen: ruta,
        tipoAdjunto: 'Imagen',
        idComentarioPadre: respondiendoA?.idComentario,
      })
      insertarComentario(nuevo)
      setTexto('')
      setRespondiendoA(null)
      toast.success(nuevo?.estadoModeracion === 'Pendiente'
        ? 'Foto enviada: quedará visible cuando el local la apruebe'
        : '¡Foto publicada!')
    } catch {
      toast.error('No se pudo subir la foto')
    } finally {
      setSubiendo(false)
    }
  }

  const insertarComentario = (nuevo: any) => {
    if (!nuevo) return
    if (nuevo.idComentarioPadre) {
      setComentarios((cs) => cs.map((c) =>
        c.idComentario === nuevo.idComentarioPadre
          ? { ...c, respuestas: [...(c.respuestas || []), nuevo] }
          : c))
    } else {
      setComentarios((cs) => [{ ...nuevo, respuestas: [] }, ...cs])
    }
  }

  const borrar = async (id: number) => {
    try {
      await novedadesService.eliminarComentario(id)
      setComentarios((cs) =>
        cs.filter((x) => x.idComentario !== id)
          .map((c) => ({ ...c, respuestas: (c.respuestas || []).filter((r: any) => r.idComentario !== id) })))
    } catch { /* noop */ }
  }

  const reportar = async (c: any) => {
    try {
      await novedadesService.reportar(c.idComentario)
      toast.success('Gracias, lo revisaremos')
    } catch {
      toast.error('No se pudo reportar')
    }
  }

  // ── Visor de imagen (guardar / compartir / reportar) ─────────────────────────
  const cerrarVisor = () => { setVerImagen(null); setMenuFoto(false) }

  const guardarFoto = async () => {
    setMenuFoto(false)
    const url = img(verImagen?.urlImagen)
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `foto_${verImagen?.idComentario || Date.now()}.jpg`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
      toast.success('Foto guardada')
    } catch {
      window.open(url, '_blank', 'noopener') // fallback: abre la foto para guardarla a mano
    }
  }

  const compartirFoto = async () => {
    setMenuFoto(false)
    const url = img(verImagen?.urlImagen)
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      const file = new File([blob], 'foto.jpg', { type: blob.type || 'image/jpeg' })
      if ((navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] as any })
        return
      }
      if (navigator.share) { await navigator.share({ url }); return }
      await navigator.clipboard.writeText(url)
      toast.success('Enlace copiado')
    } catch { /* cancelado o sin permisos */ }
  }

  return (
    <div className={styles.flyer}>
      {img(novedad.urlImagen) && (
        <button className={styles.flyerImg} onClick={toggle} aria-label={novedad.titulo}>
          <img src={img(novedad.urlImagen)} alt={novedad.titulo} loading="lazy" />
        </button>
      )}
      <div className={styles.flyerBody}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className={styles.flyerTag} style={{ color: tipoColor, background: `${tipoColor}14`, marginBottom: 0 }}>
            <Gift width={14} height={14} /> {novedad.tipo || 'Promo'}
          </span>
          {novedad.destacado && (
            <span style={destacadoBadge}>
              <Star width={12} height={12} fill="currentColor" /> Destacado
            </span>
          )}
          {vig && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock width={13} height={13} /> {vig}
            </span>
          )}
          {/* Fecha + hora de publicación */}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock width={12} height={12} /> {fechaHora(novedad.fechaCreacion)}
          </span>
        </div>

        <h3 className={styles.flyerTitle}>{novedad.titulo}</h3>
        <p className={styles.flyerText}>{novedad.cuerpo}</p>

        {/* Precio promo / descuento */}
        {(novedad.precioPromo != null || novedad.descuentoPorcentaje != null) && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, color: tipoColor, marginBottom: 8 }}>
            <Tag width={15} height={15} />
            {novedad.precioPromo != null ? `S/ ${Number(novedad.precioPromo).toFixed(2)}` : ''}
            {novedad.descuentoPorcentaje != null ? `  -${novedad.descuentoPorcentaje}%` : ''}
          </div>
        )}

        {/* Barra de acciones: corazón · compartir · Lo quiero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={toggleCorazon} style={accBtn(yoDiCorazon ? '#ef4444' : '#6b7280')} aria-label="Me gusta">
            <Heart width={20} height={20} fill={yoDiCorazon ? '#ef4444' : 'none'} />
            <span style={{ fontWeight: 700 }}>{corazones}</span>
          </button>
          <button onClick={compartir} style={accBtn('#6b7280')} aria-label="Compartir">
            <Share2 width={19} height={19} /> Compartir
          </button>
          {novedad.tipoAccion && novedad.tipoAccion !== 'Ninguna' && (
            <button
              onClick={loQuiero}
              style={{
                marginLeft: 'auto', background: tipoColor, color: '#fff', border: 'none',
                borderRadius: 999, padding: '8px 18px', fontWeight: 800, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <Gift width={16} height={16} /> {novedad.textoBoton || 'Lo quiero'}
            </button>
          )}
        </div>

        <button className={styles.flyerToggle} onClick={toggle}>
          <MessageCircle width={16} height={16} />
          {totalVisibles > 0 ? `${totalVisibles} comentario${totalVisibles === 1 ? '' : 's'}` : 'Comentarios'}
          <ChevronDown width={16} height={16} className={`${styles.flyerChevron} ${abierto ? styles.flyerChevronOpen : ''}`} />
        </button>

        <AnimatePresence initial={false}>
          {abierto && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div className={styles.cmtZone}>
                {esCliente ? (
                  <div className={styles.cmtComposer}>
                    {respondiendoA && (
                      <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <CornerDownRight width={13} height={13} /> Respondiendo a {respondiendoA.nombreCliente}
                        <button onClick={() => setRespondiendoA(null)} style={{ ...accBtn('#ef4444'), marginLeft: 4 }}>Cancelar</button>
                      </div>
                    )}
                    <textarea
                      className={styles.cmtInput}
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder="Escribe un comentario..."
                      maxLength={500}
                      rows={2}
                    />

                    {/* Selector de stickers EN LÍNEA (no flotante → no se recorta) */}
                    {stickersOpen && (
                      <div style={stickerGrid}>
                        {STICKERS.map((s) => (
                          <button key={s} type="button" onClick={() => enviarSticker(s)} style={stickerBtn} aria-label={`Sticker ${s}`}>{s}</button>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" onClick={elegirFoto} disabled={subiendo} style={iconBtn} aria-label="Adjuntar foto" title="Adjuntar foto">
                        <ImageIcon width={18} height={18} />
                      </button>
                      <button type="button" onClick={() => setStickersOpen((o) => !o)} style={{ ...iconBtn, ...(stickersOpen ? { background: `${brand}1a`, color: brand } : null) }} aria-label="Stickers" title="Stickers">
                        <Smile width={18} height={18} />
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={subirFoto} />

                      <button className={styles.cmtSend} style={{ background: brand, marginLeft: 'auto' }}
                        onClick={enviarTexto} disabled={enviando || !texto.trim()}>
                        <Send width={16} height={16} /> {respondiendoA ? 'Responder' : 'Comentar'}
                      </button>
                    </div>
                    {subiendo && <span style={{ fontSize: 12, color: '#6b7280' }}>Subiendo foto…</span>}
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                      Las fotos se publican tras una breve revisión del local. Los stickers son al instante.
                    </p>
                  </div>
                ) : user ? (
                  <div style={{ fontSize: 13, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px' }}>
                    <ShieldCheck width={15} height={15} style={{ verticalAlign: -2, marginRight: 4, color: brand }} />
                    Como local, respondes y moderas los comentarios desde <b>Clientes → Moderación</b>.
                  </div>
                ) : (
                  <button className={styles.cmtLogin} style={{ borderColor: brand, color: brand }} onClick={() => navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))}>
                    <Gift width={16} height={16} /> Inicia sesión para comentar
                  </button>
                )}

                <div className={styles.cmtList}>
                  {cargado && comentarios.length === 0 && (
                    <p className={styles.cmtEmpty}>Sé el primero en comentar 🎉</p>
                  )}
                  {comentarios.map((c) => (
                    <div key={c.idComentario}>
                      <Comentario c={c} brand={brand} esCliente={esCliente}
                        onResponder={setRespondiendoA} onBorrar={borrar} onReportar={reportar} onAbrirImagen={setVerImagen} />
                      {(c.respuestas || []).map((r: any) => (
                        <Comentario key={r.idComentario} c={r} brand={brand} esCliente={esCliente}
                          onResponder={setRespondiendoA} onBorrar={borrar} onReportar={reportar} onAbrirImagen={setVerImagen} anidado />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Visor de imagen tipo modal: X para cerrar (izquierda) + menú de 3 puntos */}
      {verImagen && (
        <div onClick={cerrarVisor} style={visorOverlay}>
          <div style={visorTop} onClick={(e) => e.stopPropagation()}>
            <button onClick={cerrarVisor} style={visorIcon} aria-label="Cerrar"><X width={22} height={22} /></button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuFoto((o) => !o)} style={visorIcon} aria-label="Más opciones"><MoreVertical width={22} height={22} /></button>
              {menuFoto && (
                <div style={visorMenu} onClick={(e) => e.stopPropagation()}>
                  <button style={visorMenuItem} onClick={guardarFoto}><Download width={16} height={16} /> Guardar en el teléfono</button>
                  <button style={visorMenuItem} onClick={compartirFoto}><Share2 width={16} height={16} /> Compartir foto</button>
                  <button style={{ ...visorMenuItem, color: '#ef4444' }} onClick={() => { const c = verImagen; cerrarVisor(); reportar(c) }}><Flag width={16} height={16} /> Reportar foto</button>
                </div>
              )}
            </div>
          </div>
          <img src={img(verImagen.urlImagen)} alt="foto" onClick={(e) => e.stopPropagation()} style={visorImg} />
        </div>
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: '#f3f4f6', border: 'none', borderRadius: 10, width: 38, height: 38,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#374151',
}
// Badge "Destacado": mismo formato que .flyerTag (fuente, padding, gap, radius)
// para alinear con el tag "Promo". El margen inferior lo da la fila. Pill dorado.
const destacadoBadge: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontSize: 12, fontWeight: 700, lineHeight: 1, color: '#fff',
  padding: '4px 10px', borderRadius: 999,
  background: 'linear-gradient(135deg, #f59e0b, #f97316)',
  boxShadow: '0 2px 6px rgba(245,158,11,.35)',
}
// Miniatura ESTÁNDAR de chat: mismo tamaño para todas (recorta al centro con
// object-fit cover). Al tocarla se abre la imagen completa en otra pestaña.
const chatImg: React.CSSProperties = {
  width: 200, height: 150, objectFit: 'cover', borderRadius: 12,
  display: 'block', cursor: 'pointer', background: '#f3f4f6',
}
// ── Visor de imagen (lightbox) ───────────────────────────────────────────────
const visorOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.92)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const visorTop: React.CSSProperties = {
  position: 'fixed', top: 12, left: 12, right: 12, zIndex: 1001,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
const visorIcon: React.CSSProperties = {
  width: 42, height: 42, borderRadius: 999, border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,.15)', color: '#fff',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
const visorMenu: React.CSSProperties = {
  position: 'absolute', top: 48, right: 0, background: '#fff', borderRadius: 14,
  boxShadow: '0 12px 30px rgba(0,0,0,.3)', padding: 6, width: 230, zIndex: 1002,
}
const visorMenuItem: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none',
  border: 'none', cursor: 'pointer', padding: '10px 12px', borderRadius: 10,
  fontSize: 14, fontWeight: 600, color: '#374151', textAlign: 'left',
}
const visorImg: React.CSSProperties = {
  maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8,
}
// Grid de stickers EN LÍNEA: ocupa el ancho del composer, hace wrap y scrollea
// si hay muchos. Al no ser position:absolute, no lo recorta el contenedor.
const stickerGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 4,
  background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 8,
  margin: '8px 0', maxHeight: 160, overflowY: 'auto',
}
const stickerBtn: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', padding: 4, borderRadius: 8,
  lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
