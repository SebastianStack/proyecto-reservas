// src/components/FavoriteIcon.jsx
import React, { useState, useEffect } from "react";

export default function FavoriteIcon({
  initiallyActive = false,
  onToggleFavorite,           // (next: boolean) => Promise<void>
  className = "",
}) {
  const [active, setActive] = useState(initiallyActive);
  const [busy, setBusy] = useState(false);

  // si el padre cambia el valor inicial (p.ej. recarga de favoritos)
  useEffect(() => {
    setActive(initiallyActive);
  }, [initiallyActive]);

  async function toggleFavorite() {
    if (busy) return;
    const next = !active;

    // optimista
    setActive(next);
    setBusy(true);
    try {
      await onToggleFavorite?.(next);
    } catch (e) {
      // revertir si falla
      setActive(!next);
      console.error("Favorite error:", e?.message || e);
      alert(e?.message || "No se pudo actualizar favoritos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={busy}
      className={`btn btn-sm ${active ? "btn-danger" : "btn-outline-danger"} ${className}`}
      title={active ? "Quitar de favoritos" : "Añadir a favoritos"}
      aria-pressed={active}
    >
      <i className={active ? "bi bi-heart-fill" : "bi bi-heart"} />
    </button>
  );
}
