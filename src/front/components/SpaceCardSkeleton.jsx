// src/components/SpaceCardSkeleton.jsx
import React from "react";

const SpaceCardSkeleton = () => {
  return (
    <div className="card h-100 position-relative" style={{ width: "18rem", maxWidth: "100%", overflow: "visible" }}>
      {/* Skeleton image */}
      <div 
        className="placeholder-glow" 
        style={{ width: "100%", height: "200px", backgroundColor: "#f8f9fa" }}
      >
        <div className="placeholder w-100 h-100"></div>
      </div>

      {/* Skeleton body */}
      <div className="card-body d-flex flex-column">
        <div className="placeholder-glow">
          <div className="placeholder col-8 mb-2"></div>
          <div className="placeholder col-6 mb-2"></div>
          <div className="placeholder col-12 mb-2"></div>
          <div className="placeholder col-10 mb-3"></div>
        </div>

        {/* Skeleton chips */}
        <div className="d-flex flex-wrap gap-1 mb-2 placeholder-glow">
          <span className="placeholder col-3" style={{ height: "24px", borderRadius: "12px" }}></span>
          <span className="placeholder col-2" style={{ height: "24px", borderRadius: "12px" }}></span>
          <span className="placeholder col-4" style={{ height: "24px", borderRadius: "12px" }}></span>
        </div>

        {/* Skeleton buttons */}
        <div className="mt-auto pt-2 d-flex justify-content-between align-items-start border-top">
          <div className="placeholder-glow">
            <div className="placeholder col-12" style={{ width: "84px", height: "32px" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceCardSkeleton;