import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";

const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://easyhome-back.onrender.com";

function distanceMeters(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function radiusMeters(city) {
  const r = Number(city.serviceRadius);
  if (!Number.isFinite(r) || r <= 0) return 10000;
  return r <= 500 ? r * 1000 : r; // admin enters KM, server stores meters
}

export default function CitySelector({ onCitySet, currentCity }) {
  const [cities, setCities] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch(`${API}/cities`)
      .then((r) => r.json())
      .then((d) => setCities(Array.isArray(d) ? d : []))
      .catch(() => setCities([]));
  }, []);

  function verifyAndSet(city, latitude, longitude) {
    const dist = distanceMeters(
      { lat: latitude, lng: longitude },
      { lat: Number(city.lat), lng: Number(city.lng) },
    );

    if (dist > radiusMeters(city)) {
      setError(`You are outside ${city.name}'s service radius.`);
      return false;
    }

    onCitySet({ name: city.name, lat: latitude, lng: longitude });
    setShow(false);
    return true;
  }

  function detectLocation() {
    setDetecting(true);
    setError("");

    if (!navigator.geolocation) {
      setError("GPS not supported");
      setDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        let nearest = null;
        let minDist = Infinity;

        cities.forEach((city) => {
          const dist = distanceMeters(
            { lat: latitude, lng: longitude },
            { lat: Number(city.lat), lng: Number(city.lng) },
          );
          if (dist < minDist) {
            minDist = dist;
            nearest = city;
          }
        });

        if (nearest) {
          onCitySet({
            name: nearest.name,
            lat: Number(nearest.lat),
            lng: Number(nearest.lng),
          });
          setShow(false);
        } else {
          setError("EasyHome is not available at your current location yet.");
        }

        setDetecting(false);
      },
      () => {
        setError("Could not detect. Please enable GPS.");
        setDetecting(false);
      },
    );
  }

  function selectCity(city) {
    setError("");
    onCitySet({
      name: city.name,
      lat: Number(city.lat),
      lng: Number(city.lng),
    });
    setShow(false);
  }

  return (
    <>
      <div
        onClick={() => setShow(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          cursor: "pointer",
        }}
      >
        <MapPin size={16} color="#ff3c00" />
        <span
          style={{ fontSize: "13px", fontWeight: "bold", color: "#ff3c00" }}
        >
          {currentCity?.name || "Set Location"}
        </span>
      </div>

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShow(false)}
              style={{
                position: "absolute",
                top: "14px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
              }}
            >
              X
            </button>

            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <MapPin size={36} color="#ff3c00" />
              <h3>Select Your City</h3>
              <p style={{ color: "#888", fontSize: "13px" }}>
                We'll show services available in your area
              </p>
            </div>

            <button
              onClick={detectLocation}
              disabled={detecting}
              className="btn primary"
            >
              {detecting ? "Detecting..." : "Use My Current Location"}
            </button>

            {error && <p style={{ color: "red", fontSize: "12px" }}>{error}</p>}

            <div className="city-grid">
              {cities.map((city) => (
                <div
                  key={city._id}
                  className={`city-chip ${currentCity?.name === city.name ? "active" : ""}`}
                  onClick={() => selectCity(city)}
                >
                  <MapPin size={14} color="#ff3c00" /> {city.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
