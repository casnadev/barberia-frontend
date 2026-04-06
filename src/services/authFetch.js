const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    alert("Tu sesión ha expirado. Inicia sesión nuevamente.");
    window.location.href = "/login";
    return;
  }

  return response;
};

export default authFetch;