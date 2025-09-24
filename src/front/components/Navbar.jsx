import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoImage from "../assets/img/logo.png";

export const Navbar = () => {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  // Efecto: mantiene el navbar fijo arriba al hacer scroll
  useEffect(() => {
    const el = document.getElementById("app-navbar");
    if (!el) return;
    el.classList.add("position-fixed", "top-0", "w-100", "shadow-sm");
    el.style.zIndex = "1050";
    document.body.style.paddingTop = `${el.offsetHeight}px`;
    return () => {
      el.classList.remove("position-fixed", "top-0", "w-100", "shadow-sm");
      document.body.style.paddingTop = null;
    };
  }, []);

  return (
    <nav
      id="app-navbar"
      className="navbar navbar-expand-lg navbar-light navbar-glass"
      style={{ background: "#fff" }}
    >
      <div className="container">
        {/* Solo logo, sin texto WePlaceIt */}
        <Link to="/" className="navbar-brand mb-0 h1 d-flex align-items-center gap-2 brand-hover">
          <img
            src={logoImage}
            alt="Weplaceit Logo"
            style={{
              height: "69px",         // <-- aumenta el tamaño del logo
              borderRadius: "12px",
            }}
          />
        </Link>

        {/* Toggler (móvil) */}
        <button
          className="navbar-toggler border-0 shadow-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Links */}
        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-2">
            {localStorage.getItem("token") ? (
              <>
                <li className="nav-item">
                  <Link to="/profile" className="btn btn-primary btn-pill ms-lg-2">
                    Mi perfil
                  </Link>
                </li>
                <li className="nav-item">
                  <button className="btn btn-danger btn-pill ms-lg-2" onClick={logout}>
                    Cerrar sesión
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link to="/login" className="btn btn-primary btn-pill ms-lg-2">
                    Iniciar sesión
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/signup" className="btn btn-outline-primary btn-pill ms-lg-2">
                    Registrarse
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};
