// src/pages/Profile.jsx
import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect, useCallback } from "react";

import AuthService from "../services/AuthService";
import { UserCard } from "../components/UserCard";
import SpaceCard from "../components/SpaceCard";
import EditSpaceModal from "../components/EditSpaceModal";
import OptimizedSpaceList from "../components/OptimizedSpaceList";

const AVATAR_FALLBACK =
  "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export const Profile = () => {
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  // Perfil
  const [userData, setUserData] = useState(null);
  const [userSpaces, setUserSpaces] = useState([]);     // mis publicaciones
  const [userBookings, setUserBookings] = useState([]); // mis reservas realizadas
  const [userFavorites, setUserFavorites] = useState([]); // mis favoritos
  const [loading, setLoading] = useState(true);

  // Solicitudes pendientes (reservas sobre mis espacios => traen nombre y foto del huésped)
  const [ownerPending, setOwnerPending] = useState([]);
  const [ownerLoading, setOwnerLoading] = useState(true);
  const [ownerError, setOwnerError] = useState(null);
  const [actingBookingId, setActingBookingId] = useState(null);

  // avisos globales
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  // loading states para botones eliminar
  const [deletingSpaceId, setDeletingSpaceId] = useState(null);
  const [deletingBookingId, setDeletingBookingId] = useState(null);

  // estado para edición de perfil
  const [editing, setEditing] = useState(false);

  // Estados para modal de edición de espacios
  const [editingSpace, setEditingSpace] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Estado para paneles abiertos/cerrados
  const [openPanels, setOpenPanels] = useState({
    reservas: true,
    espacios: true,
    favoritos: true,
    solicitudes: true,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchProfileData();
    loadOwnerPending();
    AuthService.verifyToken(navigate).then((result) => {
      if (!result.valid) console.log("Comprobar Token", result.msg);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfileData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${API}/api/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
      });

      if (!response.ok) {
        if (response.status === 401) navigate("/login");
        return;
      }

      const { current_user } = await response.json();
      setUserData(current_user);
      setUserSpaces(current_user.owned_spaces || []);
      setUserBookings(current_user.bookings || []);
      setUserFavorites(
        current_user.favorite_spaces || current_user.favorites || []
      );
    } catch (err) {
      console.error("Error fetching profile data:", err);
      setError("No se pudo cargar el perfil.");
    } finally {
      setLoading(false);
    }
  }, [API, navigate]);

  // -----------------------------
  // Cargar solicitudes (mis espacios) con datos del huésped
  // -----------------------------
  async function loadOwnerPending() {
    const token = localStorage.getItem("token");
    if (!token) return;

    setOwnerLoading(true);
    setOwnerError(null);
    try {
      // Debes tener este endpoint en tu backend
      // Devuelve reservas "pending" sobre espacios cuyo owner es el usuario actual,
      // con guest {username, first_name, last_name, image_url} y space {title}
      const res = await fetch(`${API}/api/owner/pending-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("No se pudo cargar solicitudes.");
      const data = await res.json();
      setOwnerPending(data?.bookings || []);
    } catch (e) {
      console.error(e);
      setOwnerError("No se pudo cargar solicitudes.");
    } finally {
      setOwnerLoading(false);
    }
  }

  async function handleOwnerDecision(bookingId, action /* 'accept'|'reject' */) {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    setActingBookingId(bookingId);
    setError(null);
    setNotice(null);

    try {
      const url =
        action === "accept"
          ? `${API}/api/booking/${bookingId}/accept`
          : `${API}/api/booking/${bookingId}/reject`;

      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.msg || data?.error || "Acción no realizada.");
      }

      // actualiza la tabla local
      setOwnerPending((prev) => prev.filter((b) => b.booking_id !== bookingId));
      setNotice(data?.msg || (action === "accept" ? "Reserva aceptada." : "Reserva rechazada."));
    } catch (e) {
      setError(e.message || "No se pudo procesar la acción.");
    } finally {
      setActingBookingId(null);
    }
  }

  // -----------------------------
  // Helpers de formato
  // -----------------------------
  function fmtDate(iso) {
    if (!iso) return "-";
    try {
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function badgeForStatus(status) {
    const s = String(status || "").toLowerCase();
    if (s === "confirmed") return "success";
    if (s === "pending") return "warning";
    if (s === "cancelled" || s === "canceled") return "secondary";
    return "secondary";
  }

  function prettyJoined(iso) {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("es-ES", { year: "numeric", month: "long" });
    } catch {
      return "-";
    }
  }

  const spacesCount   = userData?.owned_spaces_count ?? (userSpaces?.length || 0);
  const bookingsCount = userData?.bookings_count    ?? (userBookings?.length || 0);

  // --------------------------------------------
  // Acciones: eliminar espacio y eliminar reserva
  // --------------------------------------------
  async function handleDeleteSpace(spaceId) {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    const ok = window.confirm("¿Seguro que quieres eliminar este espacio?");
    if (!ok) return;

    setError(null);
    setNotice(null);
    setDeletingSpaceId(spaceId);

    try {
      const res = await fetch(`${API}/api/space/${spaceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.msg || data?.error || "No se pudo eliminar el espacio.");
      }

      setUserSpaces((prev) => (prev || []).filter((s) => s.space_id !== spaceId));
      setNotice(data?.msg || "Espacio eliminado correctamente.");
    } catch (err) {
      setError(err.message || "Error al eliminar el espacio.");
    } finally {
      setDeletingSpaceId(null);
    }
  }

  // Funciones para editar espacios
  // ------------------------------
  function handleEditSpace(space) {
    setEditingSpace(space);
    setShowEditModal(true);
  }

  function handleCloseEditModal() {
    setShowEditModal(false);
    setEditingSpace(null);
  }

  async function handleSaveSpace(spaceId, formData) {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const API = import.meta.env.VITE_BACKEND_URL;
    
    // Crear FormData para manejar archivos
    const data = new FormData();
    
    // Campos básicos
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("price_per_day", formData.price_per_day);
    data.append("address", formData.address);
    
    // Campos de detalles
    data.append("capacity", formData.capacity || "");
    data.append("bathrooms", formData.bathrooms || "");
    data.append("area_sqm", formData.area_sqm || "");
    data.append("floor", formData.floor || "");
    data.append("available_hours", formData.available_hours || "");
    
    // Amenidades (checkboxes)
    data.append("wifi", formData.wifi ? "true" : "false");
    data.append("parking", formData.parking ? "true" : "false");
    data.append("air_conditioning", formData.air_conditioning ? "true" : "false");
    data.append("kitchen", formData.kitchen ? "true" : "false");
    data.append("workspace", formData.workspace ? "true" : "false");
    data.append("projector", formData.projector ? "true" : "false");
    
    // Debug: Log de los datos que se van a enviar
    console.log("🔍 Datos a enviar al backend:", {
      title: formData.title,
      address: formData.address,
      description: formData.description,
      price_per_day: formData.price_per_day,
      capacity: formData.capacity,
      bathrooms: formData.bathrooms,
      area_sqm: formData.area_sqm,
      floor: formData.floor,
      available_hours: formData.available_hours,
      wifi: formData.wifi,
      parking: formData.parking,
      air_conditioning: formData.air_conditioning,
      kitchen: formData.kitchen,
      workspace: formData.workspace,
      projector: formData.projector
    });
    
    // Agregar imágenes con manejo mejorado
    formData.images.forEach((image) => {
      if (image instanceof File) {
        // Archivo nuevo
        data.append("images", image);
      } else if (typeof image === "string") {
        // URL simple como string
        data.append("existing_images", image);
      } else if (image && image.url) {
        // Objeto con url (formato del backend SpaceImages)
        data.append("existing_images", image.url);
      } else if (image && image.image_url) {
        // Objeto con image_url (otro formato posible)
        data.append("existing_images", image.image_url);
      }
    });
    
    try {
      const res = await fetch(`${API}/api/space/${spaceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      const result = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(result?.msg || result?.error || "Error al actualizar el espacio");
      }

      // Actualizar la lista de espacios del usuario
      setUserSpaces((prev) => 
        prev.map((space) => 
          space.space_id === spaceId 
            ? { ...space, ...formData, images: result.space?.images || formData.images }
            : space
        )
      );
      
      setNotice("Espacio actualizado correctamente");
    } catch (error) {
      console.error("Error al actualizar espacio:", error);
      throw error;
    }
  }

  async function handleDeleteBooking(bookingId) {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    const ok = window.confirm("¿Seguro que quieres cancelar/eliminar esta reserva?");
    if (!ok) return;

    setError(null);
    setNotice(null);
    setDeletingBookingId(bookingId);

    try {
      const res = await fetch(`${API}/api/my-booking/${bookingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.msg || data?.error || "No se pudo eliminar la reserva.");
      }

      setUserBookings((prev) => (prev || []).filter((b) => b.booking_id !== bookingId));
      setNotice(data?.msg || "Reserva eliminada correctamente.");
    } catch (err) {
      setError(err.message || "Error al eliminar la reserva.");
    } finally {
      setDeletingBookingId(null);
    }
  }

  // ------------------------------------------------------
  // FAVORITOS: eliminar / volver a añadir desde el perfil
  // ------------------------------------------------------
  async function toggleFavoriteFromProfile(spaceId, nextState) {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); throw new Error("Debes iniciar sesión."); }

    // quitar
    if (!nextState) {
      const res = await fetch(`${API}/api/user/delete-favorite-by-space/${spaceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let msg = "No se pudo quitar de favoritos.";
        try {
          const j = await res.json();
          msg = j?.msg || j?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      setUserFavorites((prev) => (prev || []).filter((s) => s.space_id !== spaceId));
      setNotice("Eliminado de favoritos.");
      return;
    }

    // añadir
    const res = await fetch(`${API}/api/user/create-favorite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ space_id: spaceId }),
    });

    if (!(res.status === 201 || res.status === 409)) {
      let msg = "No se pudo añadir a favoritos.";
      try {
        const j = await res.json();
        msg = j?.msg || j?.error || msg;
      } catch {}
      throw new Error(msg);
    }

    // si no estaba ya en pantalla, intenta sumarlo (si lo encuentras entre tus espacios)
    setUserFavorites((prev) => {
      const exists = (prev || []).some((s) => s.space_id === spaceId);
      if (exists) return prev;
      const fromOwned = (userSpaces || []).find((s) => s.space_id === spaceId);
      return fromOwned ? [...prev, fromOwned] : prev;
    });
    setNotice("Añadido a favoritos.");
  }

  async function handleProfileUpdate(formData) {
    setError(null);
    setNotice(null);
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/api/profile`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.msg || data?.error || "No se pudo actualizar el perfil.");
      return;
    }
    setNotice("Perfil actualizado correctamente.");
    fetchProfileData(); // <-- recarga datos actualizados
  }

  // Formulario de edición (puedes usar un modal o inline)
  const EditProfileForm = (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await handleProfileUpdate(fd);
        setEditing(false); // Oculta el formulario al guardar
      }}
    >
      <div className="row g-3">
        <div className="col-md-4 text-center">
          <img
            src={userData?.image_url || AVATAR_FALLBACK}
            alt="Avatar"
            className="rounded-circle mb-2"
            style={{ width: 96, height: 96, objectFit: "cover" }}
          />
          <input
            type="file"
            name="profile_image"
            accept="image/*"
            className="form-control mt-2"
          />
        </div>
        <div className="col-md-8">
          <div className="form-group mb-2">
            <label className="form-label">Nombre</label>
            <input
              name="first_name"
              defaultValue={userData?.first_name}
              className="form-control"
              required
            />
          </div>
          <div className="form-group mb-2">
            <label className="form-label">Apellido</label>
            <input
              name="last_name"
              defaultValue={userData?.last_name}
              className="form-control"
              required
            />
          </div>
          <div className="form-group mb-2">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              defaultValue={userData?.email}
              className="form-control"
              disabled
            />
          </div>
        </div>
      </div>
      <div className="d-flex justify-content-end gap-2 mt-4">
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          Guardar cambios
        </button>
      </div>
    </form>
  );

  // Función para alternar panel
  const togglePanel = (panel) =>
    setOpenPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));

  return (
    <div className="container py-4">
      {/* Aviso de error o éxito */}
      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          <i className="bi bi-exclamation-triangle me-2" /> {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success mb-3" role="alert">
          <i className="bi bi-check-circle me-2" /> {notice}
        </div>
      )}

      {/* Tarjeta de perfil */}
      <div className="glass p-4 rounded-4 shadow-sm mb-4 d-flex align-items-center gap-4 flex-wrap position-relative" style={{ minHeight: 140 }}>
        <div style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          width: 8,
          background: "linear-gradient(180deg,#6366f1 0%,#38bdf8 100%)",
          borderRadius: "1.25rem 0 0 1.25rem"
        }} />
        <div className="user-avatar-wrapper ms-3">
          <img
            src={userData?.image_url || AVATAR_FALLBACK}
            alt="Avatar"
            className="user-avatar"
          />
        </div>
        <div className="flex-grow-1 ms-2">
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="user-name">
              {userData?.first_name} {userData?.last_name}
            </span>
            <button
              className="btn btn-link p-0"
              title="Editar nombre"
              onClick={() => setEditing(true)}
            >
              <i className="bi bi-pencil"></i>
            </button>
          </div>
          <div className="user-username mb-1">
            @{userData?.username}
            <button
              className="btn btn-link p-0 ms-1"
              title="Editar usuario"
              onClick={() => setEditing(true)}
            >
              <i className="bi bi-pencil"></i>
            </button>
          </div>
          <div className="user-email mb-1">
            {userData?.email}
            <button
              className="btn btn-link p-0 ms-1"
              title="Editar email"
              onClick={() => setEditing(true)}
            >
              <i className="bi bi-pencil"></i>
            </button>
          </div>
          <span className="badge bg-secondary mt-2">
            Miembro desde {userData?.created_at?.slice(0, 10) || "?"}
          </span>
        </div>
        <div>
          <button
            className="btn btn-success btn-lg"
            onClick={() => navigate("/add-post")}
          >
            Publicar Espacio
          </button>
        </div>
      </div>

      {/* Formulario de edición modal/inline */}
      {editing && (
        <div className="glass p-4 rounded-4 shadow-sm mb-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              await handleProfileUpdate(fd);
              setEditing(false);
            }}
          >
            <div className="row g-3">
              <div className="col-md-4 text-center">
                <img
                  src={userData?.image_url || AVATAR_FALLBACK}
                  alt="Avatar"
                  className="user-avatar mb-2"
                />
                <input
                  type="file"
                  name="profile_image"
                  accept="image/*"
                  className="form-control mt-2"
                />
              </div>
              <div className="col-md-8">
                <div className="form-group mb-2">
                  <label className="form-label">Nombre</label>
                  <input
                    name="first_name"
                    defaultValue={userData?.first_name}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group mb-2">
                  <label className="form-label">Apellido</label>
                  <input
                    name="last_name"
                    defaultValue={userData?.last_name}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group mb-2">
                  <label className="form-label">Usuario</label>
                  <input
                    name="username"
                    defaultValue={userData?.username}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group mb-2">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={userData?.email}
                    className="form-control"
                    disabled
                  />
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Panel: Favoritos guardados */}
      <div className="mb-3 rounded-4 shadow-sm border-0 glass">
        <div
          className="profile-panel-title"
          style={{ cursor: "pointer" }}
          onClick={() => togglePanel("favoritos")}
        >
          <span>Favoritos guardados</span>
          <i className={`bi ${openPanels.favoritos ? "bi-chevron-up" : "bi-chevron-down"}`} />
        </div>
        {openPanels.favoritos && (
          <div className="px-4 pb-4">
            {userFavorites && userFavorites.length > 0 ? (
              <OptimizedSpaceList
                spaces={userFavorites}
                onToggleFavorite={toggleFavoriteFromProfile}
                userFavorites={userFavorites}
                showActions={false}
              />
            ) : (
              <p className="mb-0 w-100 text-center">No tienes espacios favoritos/guardados todavía.</p>
            )}
          </div>
        )}
      </div>

      {/* Panel: Mis reservas */}
      <div className="mb-3 rounded-4 shadow-sm border-0 glass">
        <div className="profile-panel-title" style={{ cursor: "pointer" }} onClick={() => togglePanel("reservas")}>
          <span>Mis reservas</span>
          <i className={`bi ${openPanels.reservas ? "bi-chevron-up" : "bi-chevron-down"}`} />
        </div>
        {openPanels.reservas && (
          <div className="px-4 pb-4">
            {loading ? (
              <div className="placeholder-wave">
                <div className="placeholder col-12 mb-2" style={{ height: 40 }}></div>
                <div className="placeholder col-10 mb-2" style={{ height: 40 }}></div>
                <div className="placeholder col-8" style={{ height: 40 }}></div>
              </div>
            ) : userBookings && userBookings.length > 0 ? (
              <div className="table-responsive rounded-4 border profile-table-wrap">
                <table className="table table-hover align-middle mb-0 profile-table">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>#</th>
                      <th>Espacio</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Días</th>
                      <th>Total (€)</th>
                      <th>Estado</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userBookings.map((b) => (
                      <tr key={b.booking_id} className="row-soft">
                        <td className="fw-semibold">{b.booking_id}</td>
                        <td>{b.space?.title || `#${b.space_id}`}</td>
                        <td>{fmtDate(b.check_in)}</td>
                        <td>{fmtDate(b.check_out)}</td>
                        <td>{b.total_days}</td>
                        <td className="fw-semibold">
                          {Number(b.total_price).toFixed(2)}
                        </td>
                        <td>
                          <span
                            className={`badge badge-soft bg-${badgeForStatus(
                              b.status
                            )}-subtle text-${badgeForStatus(b.status)} text-capitalize`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="text-end d-flex gap-2 justify-content-end">
                          <Link
                            to={`/detail/${b.space_id}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            Ver espacio
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteBooking(b.booking_id)}
                            disabled={deletingBookingId === b.booking_id}
                            title="Cancelar / eliminar reserva"
                          >
                            {deletingBookingId === b.booking_id ? (
                              <>
                                <span
                                  className="spinner-border spinner-border-sm me-1"
                                  role="status"
                                  aria-hidden="true"
                                ></span>
                                Eliminando…
                              </>
                            ) : (
                              <>
                                <i className="bi bi-trash me-1" />
                                Eliminar
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state glass-soft p-4 p-md-5 rounded-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h5 className="mb-1">Aún no tienes reservas</h5>
                  <p className="mb-0 text-muted">Explora y reserva tu primer espacio.</p>
                </div>
                <Link to="/" className="btn btn-primary btn-lg shadow-hover">
                  Buscar espacios
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel: Mis espacios disponibles */}
      <div className="mb-3 rounded-4 shadow-sm border-0 glass">
        <div className="profile-panel-title" style={{ cursor: "pointer" }} onClick={() => togglePanel("espacios")}>
          <span>Mis espacios disponibles</span>
          <i className={`bi ${openPanels.espacios ? "bi-chevron-up" : "bi-chevron-down"}`} />
        </div>
        {openPanels.espacios && (
          <div className="px-4 pb-4">
            {loading ? (
              <div className="scroll-mask d-flex flex-row overflow-auto gap-3 p-3">
                <div className="placeholder col-3" style={{ height: 220 }}></div>
                <div className="placeholder col-3" style={{ height: 220 }}></div>
                <div className="placeholder col-3" style={{ height: 220 }}></div>
              </div>
            ) : userSpaces && userSpaces.length > 0 ? (
              <OptimizedSpaceList
                spaces={userSpaces}
                onEditSpace={handleEditSpace}
                onDeleteSpace={handleDeleteSpace}
                onToggleFavorite={toggleFavoriteFromProfile}
                deletingSpaceId={deletingSpaceId}
                userFavorites={userFavorites}
                showActions={true}
              />
            ) : (
              <p className="text-center mb-0">
                No tienes espacios disponibles.{" "}
                <Link to="/addplace">¡Crea tu espacio ahora!</Link>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Panel: Solicitudes de reserva */}
      <div className="mb-3 rounded-4 shadow-sm border-0 glass">
        <div className="profile-panel-title" style={{ cursor: "pointer" }} onClick={() => togglePanel("solicitudes")}>
          <span>Solicitudes de reserva (mis espacios)</span>
          <i className={`bi ${openPanels.solicitudes ? "bi-chevron-up" : "bi-chevron-down"}`} />
        </div>
        {openPanels.solicitudes && (
          <div className="px-4 pb-4">
            {ownerLoading ? (
              <div className="placeholder-wave">
                <div className="placeholder col-12 mb-2" style={{ height: 40 }}></div>
                <div className="placeholder col-10 mb-2" style={{ height: 40 }}></div>
              </div>
            ) : ownerError ? (
              <p className="text-danger">{ownerError}</p>
            ) : ownerPending.length === 0 ? (
              <p className="mb-0">No tienes solicitudes pendientes.</p>
            ) : (
              <div className="table-responsive rounded-4 border profile-table-wrap">
                <table className="table table-hover align-middle mb-0 profile-table">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>#</th>
                      <th>Espacio</th>
                      <th>Huésped</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Días</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerPending.map((b) => {
                      const g = b.guest || {};
                      const displayName =
                        (g.first_name || g.last_name)
                          ? `${g.first_name || ""} ${g.last_name || ""}`.trim()
                          : (g.username || "Invitado");
                      const avatar = g.image_url || AVATAR_FALLBACK;

                      return (
                        <tr key={b.booking_id} className="row-soft">
                          <td className="fw-semibold">{b.booking_id}</td>
                          <td>{b.space?.title || `#${b.space_id}`}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <img
                                src={avatar}
                                alt={displayName}
                                className="rounded-circle border"
                                style={{ width: 36, height: 36, objectFit: "cover" }}
                              />
                              <div className="d-flex flex-column">
                                <span className="fw-semibold">{displayName}</span>
                                {g.username && (
                                  <small className="text-muted">@{g.username}</small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{fmtDate(b.check_in)}</td>
                          <td>{fmtDate(b.check_out)}</td>
                          <td>{b.total_days ?? b.days ?? "-"}</td>
                          <td className="text-end">
                            <div className="btn-group">
                              <button
                                className="btn btn-success btn-sm"
                                disabled={actingBookingId === b.booking_id}
                                onClick={() => handleOwnerDecision(b.booking_id, "accept")}
                              >
                                {actingBookingId === b.booking_id ? (
                                  <span className="spinner-border spinner-border-sm" />
                                ) : (
                                  <><i className="bi bi-check-circle me-1" /> Aceptar</>
                                )}
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                disabled={actingBookingId === b.booking_id}
                                onClick={() => handleOwnerDecision(b.booking_id, "reject")}
                              >
                                {actingBookingId === b.booking_id ? (
                                  <span className="spinner-border spinner-border-sm" />
                                ) : (
                                  <><i className="bi bi-x-circle me-1" /> Rechazar</>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de edición de espacios */}
      <EditSpaceModal
        space={editingSpace}
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        onSave={handleSaveSpace}
      />

    </div>
  );
};

export default Profile;
