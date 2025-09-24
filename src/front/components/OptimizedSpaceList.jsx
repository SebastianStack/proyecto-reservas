// src/components/OptimizedSpaceList.jsx
import React, { memo, useCallback, useMemo } from 'react';
import SpaceCard from './SpaceCard';

const OptimizedSpaceList = memo(({
  spaces,
  onEditSpace,
  onDeleteSpace,
  onToggleFavorite,
  deletingSpaceId,
  userFavorites,
  showActions = false
}) => {
  // Memoizar las cartas para evitar re-renders innecesarios
  const renderedSpaces = useMemo(() => {
    if (!spaces || spaces.length === 0) return null;
    
    return spaces.map((space) => (
      <div 
        key={space.space_id} 
        className="flex-shrink-0 profile-card-container" 
        style={{ width: 288 }}
      >
        <div className="position-relative">
          {showActions && (
            <div className="position-absolute" style={{ top: 8, right: 8, zIndex: 2 }}>
              <button
                className="btn btn-sm btn-warning me-1"
                style={{ opacity: 0.92 }}
                onClick={() => onEditSpace?.(space)}
                title="Editar espacio"
              >
                <i className="bi bi-pencil" />
              </button>
              <button
                className="btn btn-sm btn-danger"
                style={{ opacity: 0.92 }}
                onClick={() => onDeleteSpace?.(space.space_id)}
                disabled={deletingSpaceId === space.space_id}
                title="Eliminar espacio"
              >
                {deletingSpaceId === space.space_id ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <i className="bi bi-trash" />
                )}
              </button>
            </div>
          )}
          
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
          initiallyFavorite={
            userFavorites?.some((fav) => fav.space_id === space.space_id) || false
          }
          onToggleFavorite={(next) => onToggleFavorite?.(space.space_id, next)}
        />
        </div>
      </div>
    ));
  }, [spaces, showActions, onEditSpace, onDeleteSpace, onToggleFavorite, deletingSpaceId, userFavorites]);

  return (
    <div className="scroll-mask d-flex flex-row overflow-auto gap-3 p-3">
      {renderedSpaces}
    </div>
  );
});

OptimizedSpaceList.displayName = 'OptimizedSpaceList';

export default OptimizedSpaceList;