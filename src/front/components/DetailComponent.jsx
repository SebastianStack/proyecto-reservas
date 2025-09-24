import React, { useMemo, useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";

// Utils
const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const toLocalISO = (d) => new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0,10);
const todayISO = () => toLocalISO(new Date());
const addDaysISO = (iso, days) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate()+days); return toLocalISO(d); };
const diffDaysISO = (aISO,bISO) => Math.max(0, Math.round((new Date(`${bISO}T00:00:00`) - new Date(`${aISO}T00:00:00`))/(1000*60*60*24)));

export default memo(function DetailComponentCoverHalfPlus(props) {
  const {
    space_id,
    title = "Espacio portada premium",
    description = "Descripción no disponible.",
    address = "Dirección no disponible",
    capacity = 0,
    price_per_day = 0,
    images = [],
    // Nuevos campos agregados
    bathrooms = null,
    area_sqm = null,
    floor = null,
    available_hours = "24/7",
    wifi = false,
    parking = false,
    air_conditioning = false,
    kitchen = false,
    workspace = false,
    projector = false,
    // Campos antiguos (mantenidos para compatibilidad)
    amenities = [],
    fees = { limpieza: 0, servicio: 0 },
    rating = 4.8,
    reviews = 32,
  } = props;

  const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
  const navigate = useNavigate();

  // Generar amenidades basadas en los nuevos campos
  const realAmenities = useMemo(() => {
    const amenitiesList = [];
    if (wifi) amenitiesList.push("Wi-Fi");
    if (parking) amenitiesList.push("Parking");
    if (air_conditioning) amenitiesList.push("Aire acondicionado");
    if (kitchen) amenitiesList.push("Cocina");
    if (workspace) amenitiesList.push("Área de trabajo");
    if (projector) amenitiesList.push("Proyector");
    
    // Si no hay amenidades nuevas, usar las antiguas para compatibilidad
    return amenitiesList.length > 0 ? amenitiesList : amenities;
  }, [wifi, parking, air_conditioning, kitchen, workspace, projector, amenities]);

  // Galería
  const gallery = useMemo(() => {
    const list = (Array.isArray(images) ? images : [])
      .map((it) => (typeof it === "string" ? it : it?.url))
      .filter(Boolean);
    return list.length ? list : [
      "https://placehold.co/1600x900?text=Portada",
      "https://placehold.co/1200x900?text=Vista+2",
      "https://placehold.co/1200x900?text=Vista+3",
      "https://placehold.co/1200x900?text=Vista+4",
    ];
  }, [images]);

  const [heroIdx, setHeroIdx] = useState(0);
  const heroImage = gallery[heroIdx];

  // Fechas / totales
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(addDaysISO(todayISO(), 1));
  const nights = diffDaysISO(checkIn, checkOut);
  const base = nights * Number(price_per_day || 0);
  const extra = (Number(fees?.limpieza||0) + Number(fees?.servicio||0)) * (nights > 0 ? 1 : 0);
  const total = base + extra;

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [msgType, setMsgType] = useState("success");
  
  // Estado para el modal de imagen
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  async function handleReserve() {
    setMsg(null);
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    if (!checkIn || !checkOut) { setMsgType("danger"); setMsg("Selecciona fechas de entrada y salida."); return; }
    if (checkOut <= checkIn) { setMsgType("danger"); setMsg("La salida debe ser posterior a la entrada."); return; }

    setBusy(true);
    try {
      const res = await fetch(`${API}/api/space/${String(space_id)}/new-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ check_in: checkIn, check_out: checkOut }),
      });

      if (res.status === 401) throw new Error("No autorizado. Inicia sesión.");
      if (res.status === 404) throw new Error("Espacio no encontrado.");
      if (res.status === 409) throw new Error("No disponible en esas fechas.");
      if (!res.ok) {
        let m = "No se pudo crear la reserva.";
        try { const j = await res.json(); m = j?.msg || j?.error || m; } catch {}
        throw new Error(m);
      }

      const data = await res.json();
      setMsgType("success");
      setMsg(`¡Reserva creada! ${data?.total_days ?? nights} noche(s) • Total: ${EUR.format(data?.total_price ?? total)}`);
      setTimeout(() => navigate("/profile"), 800);
    } catch (e) {
      setMsgType("danger"); setMsg(e?.message || "Error al reservar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* HERO SECTION - IMAGEN Y TÍTULO */}
      <div className="position-relative">
        <img
          src={heroImage}
          alt={`Portada de ${title}`}
          className="w-100"
          style={{ 
            height: "60vh",
            objectFit: "cover",
            objectPosition: "center",
            cursor: "pointer"
          }}
          onClick={(e) => {
            console.log("Click en imagen, abriendo modal");
            e.preventDefault();
            setCurrentImageIndex(heroIdx);
            setShowImageModal(true);
          }}
          onError={(e) => {
            e.target.src = "https://placehold.co/1600x900?text=Imagen+no+disponible";
          }}
        />
        
        {/* Flechas de navegación entre imágenes */}
        {gallery.length > 1 && (
          <>
            <button
              className="btn btn-light position-absolute top-50 start-0 translate-middle-y ms-3"
              style={{ 
                borderRadius: "50%",
                width: "50px",
                height: "50px",
                opacity: 0.8,
                zIndex: 10
              }}
              onClick={(e) => {
                e.stopPropagation();
                setHeroIdx(prev => prev === 0 ? gallery.length - 1 : prev - 1);
              }}
            >
              <i className="bi bi-chevron-left fs-5"></i>
            </button>
            
            <button
              className="btn btn-light position-absolute top-50 end-0 translate-middle-y me-3"
              style={{ 
                borderRadius: "50%",
                width: "50px",
                height: "50px",
                opacity: 0.8,
                zIndex: 10
              }}
              onClick={(e) => {
                e.stopPropagation();
                setHeroIdx(prev => prev === gallery.length - 1 ? 0 : prev + 1);
              }}
            >
              <i className="bi bi-chevron-right fs-5"></i>
            </button>
            
            {/* Indicadores de imágenes */}
            <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4">
              <div className="d-flex gap-2">
                {gallery.map((_, index) => (
                  <button
                    key={index}
                    className={`btn p-0 ${
                      index === heroIdx 
                        ? 'bg-white' 
                        : 'bg-white bg-opacity-50'
                    }`}
                    style={{ 
                      width: "12px", 
                      height: "12px", 
                      borderRadius: "50%",
                      border: "none",
                      zIndex: 10
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHeroIdx(index);
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
        

        
        {/* Overlay oscuro */}
        <div 
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{ 
            background: "rgba(0,0,0,0.4)",
            pointerEvents: "none"
          }}
        />
        
        {/* Contenido sobre la imagen */}
        <div className="position-absolute bottom-0 start-0 w-100 p-4 p-md-5 text-white">
          <div className="container">
            <div className="row">
              <div className="col-lg-8">
                <h1 className="display-4 fw-bold mb-3 text-shadow">{title}</h1>
                <div className="d-flex align-items-center mb-3">
                  <i className="bi bi-geo-alt me-2 fs-5"></i>
                  <span className="fs-5">{address}</span>
                </div>
                <div className="d-flex flex-wrap gap-3">
                  <div className="bg-white bg-opacity-90 text-dark px-3 py-2 rounded-pill">
                    <i className="bi bi-people me-1"></i>
                    {capacity} personas
                  </div>
                  {area_sqm && (
                    <div className="bg-white bg-opacity-90 text-dark px-3 py-2 rounded-pill">
                      <i className="bi bi-rulers me-1"></i>
                      {area_sqm} m²
                    </div>
                  )}
                  {bathrooms && (
                    <div className="bg-white bg-opacity-90 text-dark px-3 py-2 rounded-pill">
                      <i className="bi bi-house me-1"></i>
                      {bathrooms} baño{bathrooms > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="container py-5">
        <div className="row g-4">
          {/* COLUMNA IZQUIERDA - DESCRIPCIÓN Y AMENIDADES */}
          <div className="col-lg-8">
            {/* Descripción */}
            <div className="bg-white rounded-3 shadow-sm p-4 mb-4">
              <h2 className="h4 fw-bold mb-3 text-dark">Acerca de este espacio</h2>
              <p className="text-secondary lh-base mb-0" style={{ fontSize: "1.1rem" }}>
                {description}
              </p>
            </div>

            {/* Amenidades */}
            <div className="bg-white rounded-3 shadow-sm p-4">
              <h3 className="h4 fw-bold mb-4 text-dark">
                <i className="bi bi-stars me-2 text-primary"></i>
                Lo que incluye
              </h3>
              <div className="row g-3">
                {realAmenities.length > 0 ? (
                  realAmenities.map((amenity, i) => (
                    <div key={i} className="col-sm-6">
                      <div className="d-flex align-items-center p-3 bg-light rounded-2">
                        <i className="bi bi-check-circle-fill text-success me-3 fs-5"></i>
                        <span className="fw-medium">{amenity}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-12">
                    <p className="text-muted mb-0">No se han especificado amenidades</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA - RESERVA */}
          <div className="col-lg-4">
            <div className="sticky-top" style={{ top: "2rem" }}>
              <div className="bg-white rounded-3 shadow-lg border p-4">
                {/* Precio */}
                <div className="text-center mb-4">
                  <div className="display-6 fw-bold text-primary mb-1">
                    {EUR.format(Number(price_per_day))}
                  </div>
                  <small className="text-muted">por día</small>
                </div>

                {/* Formulario de reserva */}
                <div className="border rounded-3 p-3 mb-3">
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-uppercase">Check-in</label>
                      <input
                        type="date"
                        className="form-control"
                        min={todayISO()}
                        value={checkIn}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCheckIn(v);
                          if (v >= checkOut) setCheckOut(addDaysISO(v, 1));
                        }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold text-uppercase">Check-out</label>
                      <input
                        type="date"
                        className="form-control"
                        min={addDaysISO(checkIn, 1)}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Desglose de precio */}
                <div className="border-top pt-3 mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span>{EUR.format(Number(price_per_day))} × {nights} días</span>
                    <span className="fw-medium">{EUR.format(base)}</span>
                  </div>
                  {!!fees?.limpieza && (
                    <div className="d-flex justify-content-between mb-2">
                      <span>Limpieza</span>
                      <span className="fw-medium">{EUR.format(fees.limpieza)}</span>
                    </div>
                  )}
                  {!!fees?.servicio && (
                    <div className="d-flex justify-content-between mb-2">
                      <span>Servicio</span>
                      <span className="fw-medium">{EUR.format(fees.servicio)}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="border-top pt-3 mb-3">
                  <div className="d-flex justify-content-between">
                    <span className="fw-bold">Total</span>
                    <span className="fw-bold fs-5 text-primary">{EUR.format(total)}</span>
                  </div>
                </div>

                {/* Mensaje de estado */}
                {msg && (
                  <div className={`alert alert-${msgType} py-2 mb-3`} role="alert">
                    {msg}
                  </div>
                )}

                {/* Botón de reserva */}
                <button
                  type="button"
                  className="btn btn-primary btn-lg w-100 fw-semibold"
                  onClick={handleReserve}
                  disabled={busy}
                  style={{ 
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    border: "none",
                    borderRadius: "0.75rem"
                  }}
                >
                  {busy ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Reservando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-calendar-check me-2" />
                      Reservar ahora
                    </>
                  )}
                </button>

                <div className="text-center mt-3">
                  <small className="text-muted">
                    <i className="bi bi-shield-check me-1"></i>
                    Confirmación inmediata
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE IMAGEN COMPLETA */}
      {showImageModal && (
        <div 
          className="modal fade show d-block"
          style={{ 
            backgroundColor: "rgba(0,0,0,0.9)",
            zIndex: 1050 
          }}
          onClick={() => setShowImageModal(false)}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content bg-transparent border-0">
              <div className="modal-body p-0 position-relative">
                {/* Botón cerrar */}
                <button
                  type="button"
                  className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
                  style={{ zIndex: 1051 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImageModal(false);
                  }}
                />
                
                {/* Imagen principal */}
                <img
                  src={gallery[currentImageIndex]}
                  alt={`${title} - Imagen ${currentImageIndex + 1}`}
                  className="w-100 h-auto rounded-3"
                  style={{ 
                    maxHeight: "90vh",
                    objectFit: "contain"
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                
                {/* Navegación entre imágenes */}
                {gallery.length > 1 && (
                  <>
                    {/* Botón anterior */}
                    <button
                      className="btn btn-light btn-lg position-absolute top-50 start-0 translate-middle-y ms-3"
                      style={{ 
                        borderRadius: "50%",
                        width: "60px",
                        height: "60px",
                        opacity: 0.8
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => 
                          prev === 0 ? gallery.length - 1 : prev - 1
                        );
                      }}
                    >
                      <i className="bi bi-chevron-left fs-4"></i>
                    </button>
                    
                    {/* Botón siguiente */}
                    <button
                      className="btn btn-light btn-lg position-absolute top-50 end-0 translate-middle-y me-3"
                      style={{ 
                        borderRadius: "50%",
                        width: "60px",
                        height: "60px",
                        opacity: 0.8
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => 
                          prev === gallery.length - 1 ? 0 : prev + 1
                        );
                      }}
                    >
                      <i className="bi bi-chevron-right fs-4"></i>
                    </button>
                    
                    {/* Indicadores de imágenes */}
                    <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3">
                      <div className="d-flex gap-2">
                        {gallery.map((_, index) => (
                          <button
                            key={index}
                            className={`btn p-0 ${
                              index === currentImageIndex 
                                ? 'bg-white' 
                                : 'bg-white bg-opacity-50'
                            }`}
                            style={{ 
                              width: "12px", 
                              height: "12px", 
                              borderRadius: "50%",
                              border: "none"
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(index);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {/* Contador de imágenes */}
                <div className="position-absolute top-0 start-0 m-3">
                  <span className="badge bg-dark bg-opacity-75 fs-6 px-3 py-2">
                    {currentImageIndex + 1} / {gallery.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
