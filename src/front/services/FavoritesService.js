// src/services/FavoritesService.js
const API = import.meta.env.VITE_BACKEND_URL;

const FavoritesService = {
  async add(spaceId) {
    const token = localStorage.getItem("token");
    if (!token) return { ok: false, status: 401, msg: "No autenticado" };

    const res = await fetch(`${API}/api/user/create-favorite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ space_id: spaceId }),
    });

    let data = null;
    try { data = await res.json(); } catch (_) {}

    if (res.ok) {
      return { ok: true, status: res.status, data, msg: data?.msg || "Guardado en favoritos" };
    }

    // 409 => ya existía; lo tratamos como éxito para marcar el icono
    if (res.status === 409) {
      return { ok: true, status: 409, data, msg: data?.msg || "Ya estaba en favoritos" };
    }

    return { ok: false, status: res.status, data, msg: data?.msg || data?.error || "Error al guardar" };
  },
};

export default FavoritesService;
