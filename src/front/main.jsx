import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";

// Estilos globales de tu app
import "./index.css";

// Bootstrap + Icons (instala con: npm i bootstrap bootstrap-icons)
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "react-datepicker/dist/react-datepicker.css";


import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { StoreProvider } from "./hooks/useGlobalReducer";
import { BackendURL } from "./components/BackendURL";

const Main = () => {
  // Inicializa tooltips de Bootstrap (para botones con data-bs-toggle="tooltip")
  useEffect(() => {
    if (typeof window !== "undefined" && window.bootstrap) {
      const els = Array.from(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
      );
      const instances = els.map((el) => new window.bootstrap.Tooltip(el));
      return () => instances.forEach((t) => t.dispose());
    }
  }, []);

  // Registrar Service Worker para caché
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registrado exitosamente:', registration);
        })
        .catch((error) => {
          console.log('SW falló al registrarse:', error);
        });
    }
  }, []);

  // Si no está configurado el backend, muestra el configurador
  if (!import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BACKEND_URL === "") {
    return (
      <React.StrictMode>
        <BackendURL />
      </React.StrictMode>
    );
  }

  return (
    <React.StrictMode>
      <StoreProvider>
        <RouterProvider router={router} />
      </StoreProvider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<Main />);
