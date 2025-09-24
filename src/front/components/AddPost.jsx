// src/front/pages/AddPost.jsx
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ImagePicker from "./ImagePicker.jsx";

export default function AddPost() {
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { store } = useGlobalReducer();

  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    direction: "",
    description: "",
    price: "",
    capacity: "",
    bathrooms: "",
    area_sqm: "",
    floor: "",
    available_hours: "24/7",
    // Amenidades
    wifi: false,
    parking: false,
    air_conditioning: false,
    kitchen: false,
    workspace: false,
    projector: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthToken = () => {
    const t =
      store?.token ||
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("auth_token");
    return t?.trim();
  };

  useEffect(() => {
    if (!getAuthToken()) setError("No hay sesión. Inicia sesión para publicar.");
    else setError(null);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ 
      ...p, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!backendUrl) return setError("Configura VITE_BACKEND_URL en tu .env");

    const token = getAuthToken();
    if (!token) return setError("No hay sesión. Inicia sesión para publicar.");

    if (!formData.title?.trim()) return setError("El título es obligatorio.");
    if (!formData.direction?.trim()) return setError("La dirección es obligatoria.");
    if (!formData.description?.trim()) return setError("La descripción es obligatoria.");
    if (!formData.price?.toString().trim()) return setError("El precio por día es obligatorio.");
    if (!formData.capacity?.toString().trim()) return setError("La capacidad es obligatoria.");
    if (!formData.bathrooms?.toString().trim()) return setError("El número de baños es obligatorio.");

    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("title", formData.title);
      fd.append("address", formData.direction);       // Backend acepta address/direction
      fd.append("description", formData.description);
      fd.append("price_per_day", formData.price);
      fd.append("capacity", formData.capacity);
      fd.append("bathrooms", formData.bathrooms);
      fd.append("area_sqm", formData.area_sqm || "");
      fd.append("floor", formData.floor || "");
      fd.append("available_hours", formData.available_hours || "24/7");
      
      // Amenidades (checkboxes)
      fd.append("wifi", formData.wifi ? "true" : "false");
      fd.append("parking", formData.parking ? "true" : "false");
      fd.append("air_conditioning", formData.air_conditioning ? "true" : "false");
      fd.append("kitchen", formData.kitchen ? "true" : "false");
      fd.append("workspace", formData.workspace ? "true" : "false");
      fd.append("projector", formData.projector ? "true" : "false");
      
      images.forEach((f) => fd.append("images", f));

      const res = await fetch(`${backendUrl}/api/new-space`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data?.msg || data?.error || "Publicación fallida");

      alert("Espacio publicado correctamente");
      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="glass rounded-4 shadow-lg p-4">
            <h2 className="fw-bold mb-4 text-primary text-center">
              Publica tu espacio
            </h2>
            <form onSubmit={handleSubmit} autoComplete="off">
              {/* Imágenes */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Sube tus imágenes
                </label>
                <ImagePicker images={images} setImages={setImages} max={12} maxMb={8} />
                <div className="form-text">
                  Máx. 12 imágenes, 8MB c/u
                </div>
              </div>
              {/* Título */}
              <div className="mb-3">
                <label htmlFor="inputtitle" className="form-label fw-semibold">
                  Título
                </label>
                <input
                  type="text"
                  name="title"
                  id="inputtitle"
                  className="form-control"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ej: Sala de reuniones moderna"
                  maxLength={60}
                  required
                />
              </div>
              {/* Dirección */}
              <div className="mb-3">
                <label htmlFor="inputDirection" className="form-label fw-semibold">
                  Dirección
                </label>
                <input
                  type="text"
                  name="direction"
                  id="inputDirection"
                  className="form-control"
                  value={formData.direction}
                  onChange={handleChange}
                  placeholder="Ej: Calle Falsa 123, Madrid"
                  maxLength={255}
                  required
                />
              </div>
              {/* Descripción */}
              <div className="mb-3">
                <label htmlFor="inputDescription" className="form-label fw-semibold">
                  Descripción
                </label>
                <textarea
                  className="form-control"
                  name="description"
                  id="inputDescription"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe tu espacio, servicios, ambiente..."
                  required
                />
              </div>
              {/* Precio/Día */}
              <div className="mb-3">
                <label htmlFor="inputPrice" className="form-label fw-semibold">
                  Precio/Día
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="price"
                  id="inputPrice"
                  className="form-control"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Ej: 100"
                  required
                />
              </div>
              {/* Capacidad */}
              <div className="mb-3">
                <label htmlFor="inputCapacity" className="form-label fw-semibold">
                  Capacidad
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  name="capacity"
                  id="inputCapacity"
                  className="form-control"
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder="Ej: 10"
                  required
                />
              </div>

              {/* Baños */}
              <div className="mb-3">
                <label htmlFor="inputBathrooms" className="form-label fw-semibold">
                  Número de baños
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  name="bathrooms"
                  id="inputBathrooms"
                  className="form-control"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  placeholder="Ej: 2"
                  required
                />
              </div>

              {/* Fila con Área y Piso */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="inputArea" className="form-label fw-semibold">
                    Área (m²)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    name="area_sqm"
                    id="inputArea"
                    className="form-control"
                    value={formData.area_sqm}
                    onChange={handleChange}
                    placeholder="Ej: 50"
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="inputFloor" className="form-label fw-semibold">
                    Piso
                  </label>
                  <input
                    type="number"
                    name="floor"
                    id="inputFloor"
                    className="form-control"
                    value={formData.floor}
                    onChange={handleChange}
                    placeholder="Ej: 2"
                  />
                </div>
              </div>

              {/* Horario disponible */}
              <div className="mb-3">
                <label htmlFor="inputHours" className="form-label fw-semibold">
                  Horario disponible
                </label>
                <input
                  type="text"
                  name="available_hours"
                  id="inputHours"
                  className="form-control"
                  value={formData.available_hours}
                  onChange={handleChange}
                  placeholder="Ej: 9:00 - 18:00 o 24/7"
                />
              </div>

              {/* Amenidades */}
              <div className="mb-4">
                <label className="form-label fw-semibold mb-3">Amenidades</label>
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="wifi"
                        id="wifi"
                        checked={formData.wifi}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="wifi">
                        <i className="bi bi-wifi me-2"></i>WiFi
                      </label>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="parking"
                        id="parking"
                        checked={formData.parking}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="parking">
                        <i className="bi bi-car-front me-2"></i>Parking
                      </label>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="air_conditioning"
                        id="air_conditioning"
                        checked={formData.air_conditioning}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="air_conditioning">
                        <i className="bi bi-snow me-2"></i>Aire acondicionado
                      </label>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="kitchen"
                        id="kitchen"
                        checked={formData.kitchen}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="kitchen">
                        <i className="bi bi-egg-fried me-2"></i>Cocina
                      </label>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="workspace"
                        id="workspace"
                        checked={formData.workspace}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="workspace">
                        <i className="bi bi-laptop me-2"></i>Área de trabajo
                      </label>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="projector"
                        id="projector"
                        checked={formData.projector}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="projector">
                        <i className="bi bi-display me-2"></i>Proyector
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              {/* Errores + botón */}
              <div className="d-flex justify-content-between align-items-center mt-4">
                {error && (
                  <div className="text-danger fw-semibold">
                    <i className="bi bi-exclamation-triangle me-2" />
                    {error}
                  </div>
                )}
                <button
                  className="btn btn-success btn-lg px-4"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Publicando...
                    </>
                  ) : (
                    "Publicar espacio"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
