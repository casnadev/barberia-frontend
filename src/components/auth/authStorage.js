export function getAuthData() {
  const token = localStorage.getItem("token");

  let usuario = null;

  try {
    usuario = JSON.parse(localStorage.getItem("usuario") || "null");
  } catch {
    usuario = null;
  }

  return { token, usuario };
}

export function clearAuthData() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}