import React from "react";
import { Link } from "react-router-dom";

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="footer-glass border-0 mt-auto"
      style={{
        background: "#fff",
        boxShadow: "0 2px 24px rgba(56,189,248,0.08)",
        borderRadius: "24px 24px 0 0",
      }}
    >
      <div className="container py-4">
        <div className="row gy-3 align-items-center">
          {/* Marca */}
          <div className="col-md-4 text-center text-md-start">
            <Link
              to="/"
              className="navbar-brand mb-0 h1 footer-brand"
              style={{ color: "#0c0e0eff", fontWeight: 700 }}
            >
              WePlaceIt
            </Link>
          </div>

          {/* Redes */}
          <div className="col-md-4 ms-md-auto text-center text-md-end">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="social-link me-2"
              aria-label="Twitter"
              title="Twitter"
              style={{ fontSize: "1.5em", color: "#2563eb" }}
            >
              <i className="bi bi-twitter"></i>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="social-link me-2"
              aria-label="GitHub"
              title="GitHub"
              style={{ fontSize: "1.5em", color: "#2563eb" }}
            >
              <i className="bi bi-github"></i>
            </a>
            <a
              href="mailto:contacto@tuapp.com"
              className="social-link"
              aria-label="Email"
              title="Email"
              style={{ fontSize: "1.5em", color: "#2563eb" }}
            >
              <i className="bi bi-envelope"></i>
            </a>
          </div>
        </div>

        <hr
          className="footer-sep my-4"
          style={{ borderColor: "#e0e7ff" }}
        />

        <div className="d-flex justify-content-between flex-column flex-sm-row align-items-center gap-2">
          <small className="text-muted" style={{ fontSize: "1em" }}>
            © {year} WePlaceIt. Todos los derechos reservados.
          </small>
          <div className="d-flex gap-3">
            <Link
              to="/terminos"
              className="footer-link"
              style={{ color: "#2563eb", fontWeight: 500 }}
            >
              Términos
            </Link>
            <Link
              to="/privacidad"
              className="footer-link"
              style={{ color: "#2563eb", fontWeight: 500 }}
            >
              Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
