// src/pages/Home.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import SpaceCard from "../components/SpaceCard.jsx";
import SpaceCardSkeleton from "../components/SpaceCardSkeleton.jsx";
import ReserveButton from "../components/ReserveButton.jsx";
import { useSpaces } from "../hooks/useApi.js";
import { useInfiniteScroll } from "../hooks/useIntersectionObserver.js";
import portadaImg from "../assets/img/portada.jpg";

export const Home = () => {
  const navigate = useNavigate();
  const { spaces, loading, error, refetch } = useSpaces();
  const heroImg = portadaImg;
  const API = import.meta.env.VITE_BACKEND_URL; // Definir API al inicio

  const [favSet, setFavSet] = useState(() => new Set());
  const [displayCount, setDisplayCount] = useState(12); // Mostrar inicialmente 12 espacios

  // Asegurar que spaces sea un array
  const safeSpaces = Array.isArray(spaces) ? spaces : [];

  // Memoizar espacios visibles para evitar recalculos
  const visibleSpaces = useMemo(() => {
    return safeSpaces.slice(0, displayCount);
  }, [safeSpaces, displayCount]);

  // Función para cargar más espacios con scroll infinito
  const loadMoreSpaces = useCallback(async () => {
    setDisplayCount(prev => Math.min(prev + 12, safeSpaces.length));
  }, [safeSpaces.length]);

  const { targetRef: scrollTargetRef, isFetching } = useInfiniteScroll(
    loadMoreSpaces, 
    displayCount < safeSpaces.length
  );

  const loadFavoritesIfLogged = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/user/get-favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("No se pudieron cargar los favoritos.");
      const data = await res.json();
      const ids = new Set((data.favorites || []).map((s) => s.space_id));
      setFavSet(ids);
    } catch (err) {
      console.error(err);
    }
  }, [API]);

  useEffect(() => {
    document.title = "Weplaceit - Home";
    loadFavoritesIfLogged();
    window.scrollTo(0, 0);
  }, [loadFavoritesIfLogged]);

  const handleToggleFavorite = useCallback(async (spaceId, nextState) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      throw new Error("Debes iniciar sesión para usar favoritos.");
    }

    if (nextState) {
      const res = await fetch(`${API}/api/user/create-favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ space_id: spaceId }),
      });
      if (res.status === 201 || res.status === 409) {
        setFavSet((prev) => {
          const n = new Set(prev);
          n.add(spaceId);
          return n;
        });
        return;
      }
      let msg = "Error al guardar favorito.";
      try {
        const j = await res.json();
        msg = j?.msg || j?.error || msg;
      } catch {}
      throw new Error(msg);
    } else {
      const res = await fetch(`${API}/api/user/delete-favorite-by-space/${spaceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFavSet((prev) => {
          const n = new Set(prev);
          n.delete(spaceId);
          return n;
        });
        return;
      }
      let msg = "No se pudo quitar de favoritos.";
      try {
        const j = await res.json();
        msg = j?.msg || j?.error || msg;
      } catch {}
      throw new Error(msg);
    }
  }, [navigate, API]);

  return (
    <div className="home-bg">
      {/* Portada hero */}
      <section
        className="w-100 d-flex align-items-center justify-content-center"
        style={{
          minHeight: "26rem",
          backgroundImage: `url(${heroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          borderRadius: "0 0 32px 32px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
        }}
      >
        <div className="container">
          <div className="row align-items-center g-4" style={{ minHeight: "26rem" }}>
            <div className="col-lg-6 mx-auto text-center">
              <span
                className="btn btn-primary btn-lg fw-bold mb-3"
                style={{ cursor: "default", border: "none", pointerEvents: "none", background: "#3b82f6" }}
              >
                ¡Bienvenido!
              </span>
                {/* Solo se muestra el mensaje de bienvenida */}
            </div>
          </div>
        </div>
      </section>

      {/* Novedades */}
      <section className="container py-5">
        <div
          className="rounded-4 shadow-lg p-4 mb-5"
          style={{
            background: "#ffffffff",
            boxShadow: "0 4px 32px rgba(0, 0, 0, 1)",
          }}
        >
          <div className="row align-items-center mb-4">
            <div className="col-12">
              <h2 className="w-100 mb-5 fw-bold text-center" style={{ color: "#111314ff" }}>
                Novedades
              </h2>
            </div>
          </div>
          
          {loading ? (
            <div className="row g-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="col-xl-3 col-md-6 col-sm-12 d-flex justify-content-center align-items-stretch"
                >
                  <SpaceCardSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="row g-4">
                {visibleSpaces.length > 0 ? (
                  visibleSpaces.map((space) => (
                    <div
                      key={space.space_id}
                      className="col-xl-3 col-md-6 col-sm-12 d-flex justify-content-center align-items-stretch"
                    >
                      <SpaceCard
                        spaceId={space.space_id}
                        title={space.title}
                        description={space.description}
                        price={space.price_per_day}
                        images={space.images}
                        // Amenidades
                        wifi={space.wifi}
                        parking={space.parking}
                        air_conditioning={space.air_conditioning}
                        kitchen={space.kitchen}
                        workspace={space.workspace}
                        projector={space.projector}
                        // Información adicional
                        capacity={space.capacity}
                        area_sqm={space.area_sqm}
                        bathrooms={space.bathrooms}
                        initiallyFavorite={favSet.has(space.space_id)}
                        onToggleFavorite={(next) => handleToggleFavorite(space.space_id, next)}
                      >
                        <ReserveButton spaceId={space.space_id} />
                      </SpaceCard>
                    </div>
                  ))
                ) : (
                  <p className="text-center" style={{ color: "#94a3b8" }}>
                    No hay espacios disponibles en este momento.
                  </p>
                )}
              </div>
              
              {/* Indicador de scroll infinito */}
              {displayCount < safeSpaces.length && (
                <div className="text-center mt-4" ref={scrollTargetRef}>
                  {isFetching ? (
                    <div className="d-flex justify-content-center align-items-center py-4">
                      <div className="spinner-border text-primary me-2" role="status">
                        <span className="visually-hidden">Cargando...</span>
                      </div>
                      <span className="text-muted">Cargando más espacios...</span>
                    </div>
                  ) : (
                    <div className="text-muted py-4">
                      <i className="bi bi-arrow-down me-2"></i>
                      Desplázate para cargar más espacios ({safeSpaces.length - displayCount} restantes)
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
