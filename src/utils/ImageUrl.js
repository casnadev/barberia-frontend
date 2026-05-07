import API_BASE from "../services/api";

export function getImageUrl(ruta) {
  if (!ruta) return "";

  if (ruta.startsWith("http://") || ruta.startsWith("https://")) {
    return ruta;
  }

  const base = API_BASE.replace(/\/api\/?$/, "");
  const rutaLimpia = ruta.startsWith("/") ? ruta : `/${ruta}`;

  return `${base}${rutaLimpia}`;
}

export function getBusinessCacheKeys(idNegocio) {
  const id = idNegocio || "default";

  return {
    logo: `barber_logo_negocio_${id}`,
    nombre: `barber_nombre_negocio_${id}`,
    slug: `barber_slug_negocio_${id}`,
  };
}