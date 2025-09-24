// src/services/api.js
const BASE = import.meta.env.VITE_BACKEND_URL;

function authHeaders() {
  const token = localStorage.getItem("token") || "";
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.msg || data?.error || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

export async function getProfile() {
  const res = await fetch(`${BASE}/api/profile`, {
    headers: { ...authHeaders() },
  });
  return handle(res); // => { message, current_user: { owned_spaces, bookings, ... } }
}

export async function deleteSpace(spaceId) {
  const res = await fetch(`${BASE}/api/space/${spaceId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handle(res); // => { msg: "Espacio eliminado correctamente." }
}

export async function deleteBooking(bookingId) {
  const res = await fetch(`${BASE}/api/my-booking/${bookingId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handle(res); // => { msg: "Reserva eliminada correctamente." }
}


