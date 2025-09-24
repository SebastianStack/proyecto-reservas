import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoImage from "../assets/img/logo.png";

export const Navbar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

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

  // Efecto: cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen) {
        const navbar = document.getElementById("app-navbar");
        if (navbar && !navbar.contains(event.target)) {
          setIsMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Efecto: cerrar menú al cambiar el tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) { // Bootstrap lg breakpoint
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
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
          onClick={toggleMenu}
          aria-controls="navbarContent"
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Links */}
        <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`} id="navbarContent">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-2">
            {localStorage.getItem("token") ? (
              <>
                <li className="nav-item">
                  <Link 
                    to="/profile" 
                    className="btn btn-primary btn-pill ms-lg-2"
                    onClick={closeMenu}
                  >
                    Mi perfil
                  </Link>
                </li>
                <li className="nav-item">
                  <button 
                    className="btn btn-danger btn-pill ms-lg-2" 
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                  >
                    Cerrar sesión
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link 
                    to="/login" 
                    className="btn btn-primary btn-pill ms-lg-2"
                    onClick={closeMenu}
                  >
                    Iniciar sesión
                  </Link>
                </li>
                <li className="nav-item">
                  <Link 
                    to="/signup" 
                    className="btn btn-outline-primary btn-pill ms-lg-2"
                    onClick={closeMenu}
                  >
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
