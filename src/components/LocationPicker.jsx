import { useState, useEffect } from "react";

const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://easyhome-back.onrender.com";

function distanceMeters(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function radiusMeters(city) {
  const radius = Number(city.serviceRadius);
  if (!Number.isFinite(radius) || radius <= 0) return 10000;
  return radius <= 500 ? radius * 1000 : radius;
}

export default function LocationPicker({ onLocationSet }) {
  const [cities, setCities] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/cities`)
      .then((r) => r.json())
      .then((d) => setCities(Array.isArray(d) ? d : []))
      .catch(() => setCities([]));
  }, []);

  // ✅ AUTO-DETECT GPS
  function detectLocation() {
    setDetecting(true);
    setError("");

    if (!navigator.geolocation) {
      setError("GPS not supported on this device");
      setDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        // Find nearest city from our list
        if (cities.length > 0) {
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
            setSelected(nearest);
            onLocationSet({
              city: nearest.name,
              lat: Number(nearest.lat),
              lng: Number(nearest.lng),
            });
          } else {
            // No city match — use raw coordinates
            onLocationSet({
              city: "Current Location",
              lat: latitude,
              lng: longitude,
            });
          }
        } else {
          onLocationSet({
            city: "Current Location",
            lat: latitude,
            lng: longitude,
          });
        }

        setDetecting(false);
      },
      (err) => {
        setError("Could not detect location. Please select manually.");
        setDetecting(false);
      },
    );
  }

  // ✅ MANUAL CITY SELECT
  function selectCity(city) {
    setSelected(city);
    onLocationSet({ city: city.name, lat: city.lat, lng: city.lng });
  }

  return (
    <div className="location-picker">
      <div className="location-header">
        <span style={{ fontSize: "20px" }}>📍</span>
        <div>
          <p style={{ fontWeight: "bold", fontSize: "14px" }}>
            {selected ? selected.name || selected.city : "Set Your Location"}
          </p>
          <p style={{ fontSize: "11px", color: "#888" }}>
            {selected ? "Tap to change" : "Required to show nearby services"}
          </p>
        </div>
      </div>

      {/* AUTO DETECT */}
      <button
        className="btn primary"
        style={{ marginTop: "10px" }}
        onClick={detectLocation}
        disabled={detecting}
      >
        {detecting ? "Detecting..." : "📡 Auto-Detect My Location"}
      </button>

      {error && (
        <p className="error-msg" style={{ marginTop: "8px" }}>
          {error}
        </p>
      )}

      {/* MANUAL SELECT */}
      {cities.length > 0 && (
        <>
          <p
            style={{
              textAlign: "center",
              color: "#aaa",
              fontSize: "12px",
              margin: "10px 0",
            }}
          >
            — or select manually —
          </p>
          <div className="city-grid">
            {cities.map((city) => (
              <div
                key={city._id}
                className={`city-chip ${selected?.name === city.name ? "active" : ""}`}
                onClick={() => selectCity(city)}
              >
                📍 {city.name}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
