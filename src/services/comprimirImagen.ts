import imageCompression from 'browser-image-compression'

const esHeic = (file: File): boolean =>
  /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)

const renombrarJpg = (nombre: string) => nombre.replace(/\.[^.]+$/, '') + '.jpg'

const OPCIONES = {
  maxSizeMB: 1.2,            // objetivo ~700 KB (subidas rápidas en datos móviles)
  maxWidthOrHeight: 1920,    // suficiente para web; el backend luego baja a 1280
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  initialQuality: 0.82,
}

async function aJpeg(file: File): Promise<File> {
  const out = await imageCompression(file, OPCIONES)
  // Forzamos nombre y tipo JPEG (algunos navegadores conservan el tipo de origen).
  return new File([out], renombrarJpg(file.name), { type: 'image/jpeg' })
}

async function heicAJpeg(file: File): Promise<File> {
  // Carga perezosa y OPCIONAL: si heic2any no está instalado, esto lanza y el
  // llamador cae al archivo original. Instálalo para soportar HEIC fuera de iOS.
  // @ts-ignore - dependencia opcional
  const mod: any = await import(/* @vite-ignore */ 'heic2any')
  const heic2any = mod.default ?? mod
  const res = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
  const blob: Blob = Array.isArray(res) ? res[0] : res
  return new File([blob], renombrarJpg(file.name), { type: 'image/jpeg' })
}

/**
 * Comprime y normaliza una imagen en el navegador ANTES de subirla:
 *  - Reescala a máx. 1600px y baja a ~0.7 MB → subidas rápidas en datos móviles
 *    (adiós a los timeouts con fotos de 5–10 MB).
 *  - Convierte HEIC/HEIF (fotos de iPhone) a JPEG, que el backend sí acepta.
 * Nunca lanza: ante cualquier fallo devuelve el archivo original tal cual.
 */
export async function comprimirImagen(file: File): Promise<File> {
  // GIF (posiblemente animado) y archivos que no son imagen: no se tocan.
  if (file.type === 'image/gif') return file
  if (!/^image\//i.test(file.type) && !esHeic(file)) return file

  try {
    // En WebKit (iOS Safari/Chrome) el canvas decodifica HEIC → esto funciona directo.
    return await aJpeg(file)
  } catch {
    // Fuera de WebKit, un HEIC no se puede dibujar en canvas → lo convierte heic2any.
    if (esHeic(file)) {
      try { return await aJpeg(await heicAJpeg(file)) } catch { /* cae al final */ }
    }
    return file   // último recurso: subir el original (el backend dará un mensaje claro)
  }
}