import React, { memo, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import ImageURL from "../assets/img/no-photo.png";
import FavoriteIcon from "./FavoriteIcon";

export const SpaceCard = ({
  spaceId,
  images,
  title,
  description,
  price,
  children,
  onToggleFavorite,
  initiallyFavorite = false,
  redirection,
  chips,
  wifi,
  parking,
  air_conditioning,
  kitchen,
  workspace,
  projector,
  capacity,
  area_sqm,
  bathrooms,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imgs = images && images.length 
    ? images.map((img) => (typeof img === "string" ? img : img.url))
    : [ImageURL];

  const _title = title || "Título por defecto";
  const _description = description || "Descripción por defecto del espacio.";
  
  const _chips = useMemo(() => {
    const amenities = [];
    
    if (wifi) amenities.push(" WiFi");
    if (parking) amenities.push(" Parking");
    if (air_conditioning) amenities.push(" A/C");
    if (kitchen) amenities.push(" Cocina");
    if (workspace) amenities.push(" Workspace");
    if (projector) amenities.push(" Proyector");
    if (capacity) amenities.push(` ${capacity} personas`);
    if (area_sqm) amenities.push(` ${area_sqm}m`);
    if (bathrooms) amenities.push(` ${bathrooms} baño${bathrooms > 1 ? 's' : ''}`);
    
    return amenities.length > 0 ? amenities : (chips || ["Espacio disponible"]);
  }, [wifi, parking, air_conditioning, kitchen, workspace, projector, capacity, area_sqm, bathrooms, chips]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
  }, []);

  const _price = typeof price === "number" ? `${price}€/día` : price || `${(Math.random() * 100).toFixed(0)}€/día`;
  const _link = redirection || `/detail/${spaceId ?? ""}`;

  const carouselId = "carousel-" + _title.replace(/\s+/g, "-").toLowerCase() + "-" + Math.floor(Math.random() * 10000);

  return (
    <div className="card h-100 position-relative" style={{ width: "18rem", maxWidth: "100%", overflow: "visible" }}>
      <div id={carouselId} className="carousel slide" data-bs-ride="carousel">
        <div className="carousel-inner" style={{ maxHeight: "100%", overflow: "hidden" }}>
          {imgs.map((image, idx) => (
            <div key={idx} className={`carousel-item ${idx === 0 ? "active" : ""}`}>
              <img
                src={imageError ? ImageURL : image}
                className="d-block w-100"
                style={{ 
                  width: "300px", 
                  height: "200px", 
                  objectFit: "cover",
                  transition: "opacity 0.3s ease",
                  opacity: imageLoaded ? 1 : 0.8,
                }}
                alt={`Slide ${idx}`}
                loading={idx === 0 ? "eager" : "lazy"}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          ))}
        </div>
        
        {imgs.length > 1 && (
          <>
            <button 
              className="carousel-control-prev" 
              type="button" 
              data-bs-target={`#${carouselId}`} 
              data-bs-slide="prev"
              style={{
                background: "rgba(255,255,255,0.8)",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                opacity: "0.8"
              }}
            >
              <i className="bi bi-chevron-left text-dark fs-5" aria-hidden="true"></i>
              <span className="visually-hidden">Previous</span>
            </button>
            <button 
              className="carousel-control-next" 
              type="button" 
              data-bs-target={`#${carouselId}`} 
              data-bs-slide="next"
              style={{
                background: "rgba(255,255,255,0.8)",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                opacity: "0.8"
              }}
            >
              <i className="bi bi-chevron-right text-dark fs-5" aria-hidden="true"></i>
              <span className="visually-hidden">Next</span>
            </button>
          </>
        )}
      </div>

      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{_title}</h5>
        <h6 className="card-subtitle mb-2 text-muted">{_price}</h6>
        <p className="card-text line-clamp-3">{_description}</p>

        <div className="d-flex flex-wrap gap-1 mb-2">
          {_chips.slice(0, 4).map((chip, i) => (
            <span key={i} className="badge bg-light text-dark border" style={{ fontSize: "0.75rem" }}>
              {chip}
            </span>
          ))}
          {_chips.length > 4 && (
            <span className="badge bg-secondary" style={{ fontSize: "0.75rem" }}>
              +{_chips.length - 4} más
            </span>
          )}
        </div>

        <div className="mt-auto pt-2 d-flex justify-content-between align-items-start border-top flex-nowrap spacecard-actions">
          <div className="d-flex gap-2 flex-nowrap">{children}</div>

          <div className="d-flex gap-2">
            <Link to={_link} className="btn btn-primary btn-sm" style={{ minWidth: 84 }}>
              Ver más
            </Link>
          </div>

          <div className="d-flex gap-2">
            <FavoriteIcon
              initiallyActive={initiallyFavorite}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(SpaceCard);
