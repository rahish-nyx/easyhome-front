import { getDistance } from "geolib";
import { isInsideZone, zoneRadiusKm } from "./zones";

function hasCoords(point) {
  return (
    point &&
    point.lat !== null &&
    point.lat !== undefined &&
    point.lat !== "" &&
    point.lng !== null &&
    point.lng !== undefined &&
    point.lng !== "" &&
    Number.isFinite(Number(point.lat)) &&
    Number.isFinite(Number(point.lng))
  );
}

/** Distance in kilometres, or null when coordinates are missing. */
export function distanceKm(a, b) {
  if (!hasCoords(a) || !hasCoords(b)) return null;
  const meters = getDistance(
    { latitude: Number(a.lat), longitude: Number(a.lng) },
    { latitude: Number(b.lat), longitude: Number(b.lng) },
  );
  return meters / 1000;
}

export function distanceLabel(km) {
  if (km === null || km === undefined) return "";
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

/** One-tap navigation to the device's default maps app. */
export function mapsUrl(lat, lng, label = "") {
  if (
    lat === null ||
    lat === undefined ||
    lat === "" ||
    lng === null ||
    lng === undefined ||
    lng === "" ||
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lng))
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label || "EasyHome")}`;
  }
  const destination = `${Number(lat)},${Number(lng)}`;
  const place = label ? `&destination_place_id=&travelmode=driving` : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}${place}`;
}

export function circleKmToLatDelta(km) {
  return Number(km) / 111.32;
}

export function circleKmToLngDelta(km, lat) {
  const cos = Math.cos((Number(lat) * Math.PI) / 180);
  return Number(km) / (111.32 * (Math.abs(cos) < 0.1 ? 0.1 : cos));
}

/* ------------------------------ Service areas ----------------------------- */

export function sameText(a, b) {
  return (
    String(a || "").trim().toLowerCase() ===
    String(b || "").trim().toLowerCase()
  );
}

function workerCity(worker) {
  const city = String(worker?.city || worker?.cityName || "").trim();
  if (city) return city;
  const areaParts = String(worker?.area || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return areaParts.length > 1
    ? areaParts[areaParts.length - 1]
    : areaParts[0] || "";
}

function workerState(worker) {
  return String(worker?.state || worker?.stateName || "").trim();
}

function workerArea(worker) {
  const areaName = String(worker?.areaName || "").trim();
  if (areaName) return areaName;
  const areaParts = String(worker?.area || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return areaParts.length > 1 ? areaParts.slice(0, -1).join(", ") : "";
}

function jobCity(job) {
  return String(job?.cityName || job?.city || "").trim();
}

function jobState(job) {
  return String(job?.stateName || job?.state || "").trim();
}

function jobArea(job) {
  return String(job?.areaName || "").trim();
}

/**
 * Customer-side availability check. A worker is shown only when they are
 * online, approved (public docs are approval-gated), and inside the selected
 * city/local area.
 */
export function workerInServiceArea(worker, location, zone = null) {
  if (!worker || worker.online !== true) return false;
  if (!location) return false;

  const city = String(location.name || location.cityName || "").trim();
  const state = String(location.state || location.stateName || "").trim();
  const area = String(location.areaName || location.area || "").trim();

  if (!city) return false;

  if (city) {
    const ownCity = workerCity(worker);
    if (!ownCity || !sameText(ownCity, city)) return false;
  }

  if (state) {
    const ownState = workerState(worker);
    if (!ownState || !sameText(ownState, state)) return false;
  }

  if (area) {
    const ownArea = workerArea(worker);
    if (!ownArea || !sameText(ownArea, area)) return false;
  }

  if (zone) {
    if (
      zone.isActive !== true ||
      !sameText(zone.cityName, city) ||
      (state && !sameText(zone.state, state)) ||
      (zone.areaName && !sameText(zone.areaName, area)) ||
      !isInsideZone(zone, location) ||
      !isInsideZone(zone, worker)
    ) {
      return false;
    }
  }

  const distance = distanceKm(location, worker);
  const radius = zone
    ? zoneRadiusKm(zone)
    : Number(location.radiusKm) || 0;
  if (radius > 0 && (distance === null || distance > radius)) {
    return false;
  }

  return true;
}

/** Worker-side job feed filter. Mirrors the server-side booking match. */
export function jobMatchesWorker(worker, job) {
  if (!worker || !job) return false;

  const city = jobCity(job);
  const state = jobState(job);
  const area = jobArea(job);

  if (!city || !state) return false;

  const ownCity = workerCity(worker);
  if (!ownCity || !sameText(ownCity, city)) return false;

  const ownState = workerState(worker);
  if (!ownState || !sameText(ownState, state)) return false;

  if (area) {
    const ownArea = workerArea(worker);
    if (!ownArea || !sameText(ownArea, area)) return false;
  }

  const target =
    job.lat !== null &&
    job.lat !== undefined &&
    job.lng !== null &&
    job.lng !== undefined
      ? job
      : {
          lat: job.serviceZoneLatitude,
          lng: job.serviceZoneLongitude,
        };
  const distance = distanceKm(worker, target);
  const radius = Number(worker?.radiusKm) || 25;
  const zoneRadius = Number(job.serviceZoneRadiusKm) || radius;
  if (distance === null || distance > Math.min(radius, zoneRadius)) return false;

  if (
    job.serviceZoneLatitude !== null &&
    job.serviceZoneLatitude !== undefined &&
    job.serviceZoneLongitude !== null &&
    job.serviceZoneLongitude !== undefined &&
    job.serviceZoneLatitude !== "" &&
    job.serviceZoneLongitude !== ""
  ) {
    const centerDistance = distanceKm(worker, {
      lat: job.serviceZoneLatitude,
      lng: job.serviceZoneLongitude,
    });
    if (centerDistance === null || centerDistance > zoneRadius) return false;
  }

  return true;
}

/** Public urgent-job cards are limited to the customer's selected location. */
export function jobInServiceArea(job, location, zone = null) {
  if (!job) return false;
  if (!location) return false;
  if (
    zone &&
    (zone.isActive !== true || job.serviceZoneId !== zone.id)
  ) {
    return false;
  }

  const city = String(location.name || location.cityName || "").trim();
  const state = String(location.state || location.stateName || "").trim();
  const area = String(location.areaName || location.area || "").trim();

  if (!city) return false;
  const ownCity = jobCity(job);
  if (!ownCity || !sameText(ownCity, city)) return false;

  if (state) {
    const ownState = jobState(job);
    if (!ownState || !sameText(ownState, state)) return false;
  }

  if (area) {
    const ownArea = jobArea(job);
    if (!ownArea || !sameText(ownArea, area)) return false;
  }

  const radius = zone
    ? zoneRadiusKm(zone)
    : Number(location.radiusKm) || 0;
  if (radius > 0) {
    const distance = distanceKm(location, job);
    if (distance === null || distance > radius) return false;
  }

  return true;
}
