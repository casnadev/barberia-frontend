export async function urlToBase64(url) {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("No se pudo cargar el logo:", response.status, response.statusText);
      return null;
    }

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve({
          base64: reader.result,
          mimeType: blob.type,
        });
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("No se pudo convertir logo a base64:", error);
    return null;
  }
}

export function getBranding() {
  const nombreNegocio = localStorage.getItem("nombreNegocio") || "Mi Negocio";
  const logoNegocio = localStorage.getItem("logoNegocio") || "";
  return { nombreNegocio, logoNegocio };
}