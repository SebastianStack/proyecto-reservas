import { useRef, useState, useCallback } from "react";
import "./ImagePicker.css";

export default function ImagePicker({ 
  images, 
  setImages, 
  onImagesChange, 
  max = 12, 
  maxMb = 8,
  disabled = false 
}) {
  const inputRef = useRef(null);
  const [processing, setProcessing] = useState(false);

  const allow = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  // Función unificada para actualizar imágenes
  const updateImages = useCallback((newImages) => {
    if (setImages) {
      setImages(newImages);
    }
    if (onImagesChange) {
      onImagesChange(newImages);
    }
  }, [setImages, onImagesChange]);

  // Función para comprimir imagen
  const compressImage = useCallback((file, maxSizeKB = 800) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calcular dimensiones manteniendo aspect ratio
        const maxWidth = 1200;
        const maxHeight = 800;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob con calidad ajustada
        canvas.toBlob(resolve, 'image/jpeg', 0.85);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const addFiles = async (fileList) => {
    const incoming = Array.from(fileList || []);
    const accepted = [];
    
    setProcessing(true);

    for (const f of incoming) {
      if (!allow.includes(f.type)) continue;
      if (f.size > maxMb * 1024 * 1024) {
        // Intentar comprimir si es muy grande
        try {
          const compressed = await compressImage(f);
          if (compressed.size <= maxMb * 1024 * 1024) {
            const compressedFile = new File([compressed], f.name, { type: 'image/jpeg' });
            accepted.push(Object.assign(compressedFile, { preview: URL.createObjectURL(compressed) }));
          }
        } catch (error) {
          console.warn('Error comprimiendo imagen:', error);
        }
        continue;
      }
      // guardamos un preview para mostrar
      accepted.push(Object.assign(f, { preview: URL.createObjectURL(f) }));
    }

    const merged = [...images, ...accepted].slice(0, max);
    updateImages(merged);
    setProcessing(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  };

  const removeAt = (idx) => {
    const imageToRemove = images[idx];
    // Solo revocar URL si es un objeto File con preview
    if (imageToRemove?.preview) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    const newImages = images.filter((_, i) => i !== idx);
    updateImages(newImages);
  };

  return (
    <div className="mb-3">
      <div
        className={`border rounded p-3 text-center bg-light ${disabled ? 'image-picker-disabled' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{ cursor: disabled ? "not-allowed" : "pointer" }}
      >
        <div className="fw-semibold">Sube tus imágenes</div>
        <div className="small text-muted">
          Arrastra y suelta o haz clic (máx. {max} imágenes, {maxMb}MB c/u)
        </div>
        {processing && (
          <div className="mt-2">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Procesando...</span>
            </div>
            <span className="small text-primary">Procesando imágenes...</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {images.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mt-2">
          {images.map((f, i) => {
            // Determinar la URL de la imagen
            let imageUrl;
            if (f.preview) {
              // Archivo nuevo con preview
              imageUrl = f.preview;
            } else if (f.url) {
              // Objeto del backend con formato {image_id, space_id, url}
              imageUrl = f.url;
            } else if (f.image_url) {
              // Otro formato posible con image_url
              imageUrl = f.image_url;
            } else if (typeof f === "string") {
              // URL directa como string
              imageUrl = f;
            } else {
              // Fallback para formatos no reconocidos
              imageUrl = "";
            }
            
            return (
              <div key={i} className="image-container">
                <img
                  src={imageUrl}
                  alt={`img-${i}`}
                  width={100}
                  height={100}
                  style={{ objectFit: "cover" }}
                  className="rounded border image-preview"
                  onError={(e) => {
                    console.error("Error cargando imagen:", imageUrl);
                    e.target.style.display = 'none';
                  }}
                />
                {!disabled && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm position-absolute image-delete-btn"
                    aria-label="Eliminar imagen"
                    onClick={() => removeAt(i)}
                    title="Eliminar imagen"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
