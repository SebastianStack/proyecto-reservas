import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";

export default function ReserveButton({ spaceId, onBooked }) {
  const navigate = useNavigate();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

  // Utilidades de fecha seguras en local
  function todayDate() {
    return new Date();
  }
  
  function addDaysToDate(date, days) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }
  
  function dateToISO(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return null;
    }
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  // Estado UI
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState(todayDate());
  const [checkOut, setCheckOut] = useState(addDaysToDate(todayDate(), 1));
  const [loading, setLoading] = useState(false);
  const [inlineMsg, setInlineMsg] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Posición del popover (fixed)
  const anchorRef = useRef(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 });

  function placePopover() {
    const btn = anchorRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const desiredWidth = 300;
    const gap = 8;

    let left = rect.left;
    // Ajuste si se sale por la derecha
    if (left + desiredWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - desiredWidth - 8);
    }

    // Por defecto, debajo del botón
    let top = rect.bottom + gap;

    // Si hubiera poco espacio abajo, intenta arriba
    const popEl = popRef.current;
    const approxHeight = popEl ? popEl.offsetHeight : 220;
    if (top + approxHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - approxHeight - gap);
    }

    setPos({ top: top, left: left, width: desiredWidth });
  }

  useEffect(function () {
    if (!open) return;
    placePopover();
    function onScrollOrResize() { placePopover(); }
    function onDocClick(e) {
      if (!anchorRef.current || !popRef.current) return;
      if (anchorRef.current.contains(e.target)) return;
      if (popRef.current.contains(e.target)) return;
      setOpen(false);
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    document.addEventListener("mousedown", onDocClick);

    return function () {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  async function handleReserve() {
    setInlineMsg(null);
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    if (!checkIn || !checkOut) { setInlineMsg("Selecciona check-in y check-out."); return; }
    if (checkOut <= checkIn) { setInlineMsg("La fecha de salida debe ser posterior a la de entrada."); return; }

    const checkInISO = dateToISO(checkIn);
    const checkOutISO = dateToISO(checkOut);
    
    if (!checkInISO || !checkOutISO) { 
      setInlineMsg("Fechas inválidas. Por favor selecciona fechas válidas."); 
      return; 
    }

    setLoading(true);
    try {
      const url = backendUrl + "/api/space/" + String(spaceId) + "/new-booking";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ check_in: checkInISO, check_out: checkOutISO })
      });

      if (res.status === 401) throw new Error("No autorizado. Inicia sesión.");
      if (res.status === 404) throw new Error("Espacio no encontrado.");
      if (res.status === 409) throw new Error("El espacio no está disponible en esas fechas.");
      if (res.status === 400) {
        const b = await res.json().catch(function(){ return {}; });
        throw new Error(b && b.msg ? b.msg : "Datos inválidos.");
      }
      if (!res.ok) {
        const txt = await res.text().catch(function(){ return ""; });
        throw new Error(txt || ("Error " + res.status));
      }

      const data = await res.json();
      const dias = data && data.total_days ? String(data.total_days) : "";
      const total = data && data.total_price ? String(data.total_price) : "";
      setToastMsg("Reserva creada: " + dias + " día(s) · Total: " + total + " €");
      setOpen(false);
      if (typeof onBooked === "function") onBooked(data);
    } catch (e) {
      setInlineMsg(e && e.message ? e.message : "Error al reservar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className="btn btn-primary btn-sm"
        onClick={function () { setOpen(!open); }}
        style={{ minWidth: 84 }}
      >
        {open ? "Cerrar" : "Reservar"}
      </button>

      {/* Popover en portal (position: fixed) */}
      {open && createPortal(
        <div
          ref={popRef}
          className="card p-2 shadow"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 2000
          }}
        >
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label mb-1">Check-in</label>
              <DatePicker
                selected={checkIn}
                onChange={(date) => {
                  setCheckIn(date);
                  if (date && checkOut && date >= checkOut) {
                    setCheckOut(addDaysToDate(date, 1));
                  }
                }}
                minDate={new Date()}
                dateFormat="dd/MM/yyyy"
                className="form-control form-control-sm"
                placeholderText="Elige una fecha"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                todayButton="Hoy"
                popperPlacement="bottom"
              />
            </div>
            <div className="col-6">
              <label className="form-label mb-1">Check-out</label>
              <DatePicker
                selected={checkOut}
                onChange={(date) => setCheckOut(date)}
                minDate={checkIn ? addDaysToDate(checkIn, 1) : addDaysToDate(new Date(), 1)}
                dateFormat="dd/MM/yyyy"
                className="form-control form-control-sm"
                placeholderText="Elige una fecha"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                todayButton="Hoy"
                popperPlacement="bottom"
              />
            </div>
          </div>

          <button
            type="button"
            className="btn btn-success btn-sm mt-2 w-100"
            onClick={handleReserve}
            disabled={loading}
          >
            {loading ? "Reservando..." : "Confirmar reserva"}
          </button>

          {inlineMsg && <div className="alert alert-warning mt-2 mb-0 p-2">{inlineMsg}</div>}
        </div>,
        document.body
      )}

      {/* Toast de éxito */}
      {toastMsg && createPortal(
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 2100 }}>
          <div className="toast show text-bg-success" role="alert" aria-live="assertive" aria-atomic="true">
            <div className="d-flex">
              <div className="toast-body">{toastMsg}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                aria-label="Close"
                onClick={function () { setToastMsg(null); }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
