export default async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    localStorage.removeItem("usuario");
    window.location.href = "/login";
    return null;
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/login";
    return null;
  }

  return res;
}