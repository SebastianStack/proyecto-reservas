import React, { useState, useEffect } from "react";
import ImagePicker from "./ImagePicker";

const EditSpaceModal = ({ 
  space, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price_per_day: "",
    address: "",
    capacity: "",
    // Amenidades
    wifi: false,
    parking: false,
    air_conditioning: false,
    kitchen: false,
    workspace: false,
    projector: false,
    // Información adicional
    area_sqm: "",
    floor: "",
    bathrooms: 1,
    available_hours: "24/7",
    images: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (space && isOpen) {
      setFormData({
        title: space.title || "",
        description: space.description || "",
        price_per_day: space.price_per_day || "",
        address: space.address || "",
        capacity: space.capacity || "",
        // Amenidades
        wifi: space.wifi || false,
        parking: space.parking || false,
        air_conditioning: space.air_conditioning || false,
        kitchen: space.kitchen || false,
        workspace: space.workspace || false,
        projector: space.projector || false,
        // Información adicional
        area_sqm: space.area_sqm || "",
        floor: space.floor || "",
        bathrooms: space.bathrooms || 1,
        available_hours: space.available_hours || "24/7",
        images: space.images || []
      });
      setError("");
    }
  }, [space, isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImagesChange = (newImages) => {
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validaciones básicas
      if (!formData.title.trim()) {
        throw new Error("El título es obligatorio");
      }
      if (!formData.description.trim()) {
        throw new Error("La descripción es obligatoria");
      }
      if (!formData.address.trim()) {
        throw new Error("La dirección es obligatoria");
      }
      if (!formData.price_per_day || formData.price_per_day <= 0) {
        throw new Error("El precio debe ser mayor a 0");
      }
      if (!formData.capacity || formData.capacity <= 0) {
        throw new Error("La capacidad debe ser mayor a 0");
      }
      if (!formData.bathrooms || formData.bathrooms <= 0) {
        throw new Error("El número de baños debe ser mayor a 0");
      }

      await onSave(space.space_id, formData);
      onClose();
    } catch (err) {
      setError(err.message || "Error al actualizar el espacio");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Editar Espacio</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={handleClose}
              disabled={loading}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {/* Título */}
              <div className="mb-3">
                <label htmlFor="title" className="form-label">
                  Título del espacio *
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="Ej: Oficina moderna en el centro"
                />
              </div>

              {/* Descripción */}
              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  Descripción *
                </label>
                <textarea
                  className="form-control"
                  id="description"
                  name="description"
                  rows="4"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="Describe tu espacio, características, ubicación..."
                />
              </div>

              {/* Precio */}
              <div className="mb-3">
                <label htmlFor="price_per_day" className="form-label">
                  Precio por día (€) *
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="price_per_day"
                  name="price_per_day"
                  value={formData.price_per_day}
                  onChange={handleInputChange}
                  required
                  min="1"
                  step="0.01"
                  disabled={loading}
                  placeholder="50.00"
                />
              </div>

              {/* Dirección */}
              <div className="mb-3">
                <label htmlFor="address" className="form-label">
                  Dirección *
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="Ej: Calle Principal 123, Madrid"
                />
              </div>

              {/* Capacidad y información básica */}
              <div className="row">
                <div className="col-md-4">
                  <div className="mb-3">
                    <label htmlFor="capacity" className="form-label">
                      Capacidad *
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="capacity"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      required
                      min="1"
                      disabled={loading}
                      placeholder="10"
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label htmlFor="bathrooms" className="form-label">
                      Baños *
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="bathrooms"
                      name="bathrooms"
                      value={formData.bathrooms}
                      onChange={handleInputChange}
                      required
                      min="1"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label htmlFor="area_sqm" className="form-label">
                      Área (m²)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="area_sqm"
                      name="area_sqm"
                      value={formData.area_sqm}
                      onChange={handleInputChange}
                      min="1"
                      disabled={loading}
                      placeholder="50"
                    />
                  </div>
                </div>
              </div>

              {/* Piso y horarios */}
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="floor" className="form-label">
                      Piso
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="floor"
                      name="floor"
                      value={formData.floor}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder="1"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="available_hours" className="form-label">
                      Horario disponible
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="available_hours"
                      name="available_hours"
                      value={formData.available_hours}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder="9:00-18:00"
                    />
                  </div>
                </div>
              </div>

              {/* Amenidades */}
              <div className="mb-4">
                <label className="form-label fw-bold">Amenidades</label>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="wifi"
                        name="wifi"
                        checked={formData.wifi}
                        onChange={handleInputChange}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="wifi">
                        WiFi
                      </label>
                    </div>
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="parking"
                        name="parking"
                        checked={formData.parking}
                        onChange={handleInputChange}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="parking">
                        Parking
                      </label>
                    </div>
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="air_conditioning"
                        name="air_conditioning"
                        checked={formData.air_conditioning}
                        onChange={handleInputChange}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="air_conditioning">
                        Aire acondicionado
                      </label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="kitchen"
                        name="kitchen"
                        checked={formData.kitchen}
                        onChange={handleInputChange}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="kitchen">
                        Cocina
                      </label>
                    </div>
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="workspace"
                        name="workspace"
                        checked={formData.workspace}
                        onChange={handleInputChange}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="workspace">
                        Área de trabajo
                      </label>
                    </div>
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="projector"
                        name="projector"
                        checked={formData.projector}
                        onChange={handleInputChange}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="projector">
                        Proyector
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Imágenes */}
              <div className="mb-3">
                <label className="form-label">Imágenes del espacio</label>
                <ImagePicker
                  images={formData.images}
                  onImagesChange={handleImagesChange}
                  disabled={loading}
                  max={5}
                />
                <div className="form-text">
                  Puedes subir hasta 5 imágenes. Formatos: JPG, PNG, WebP
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditSpaceModal;