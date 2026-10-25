import { getDistance } from "geolib";

function hasCoords(point) {
  return (
    point &&
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
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
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

function textIncludes(haystack, needle) {
  const text = String(haystack || "").toLowerCase();
  const term = String(needle || "").trim().toLowerCase();
  return Boolean(text && term && text.includes(term));
}

function workerCity(worker) {
  return String(worker?.city || worker?.cityName || "").trim();
}

function workerState(worker) {
  return String(worker?.state || worker?.stateName || "").trim();
}

function workerArea(worker) {
  return String(worker?.areaName || "").trim();
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
export function workerInServiceArea(worker, location) {
  if (!worker || worker.online !== true) return false;
  if (!location) return true;

  const city = String(location.name || location.cityName || "").trim();
  const state = String(location.state || location.stateName || "").trim();
  const area = String(location.areaName || location.area || "").trim();

  if (city) {
    const ownCity = workerCity(worker);
    if (ownCity) {
      if (!sameText(ownCity, city)) return false;
    } else if (!textIncludes(worker?.area, city)) {
      return false;
    }
  }

  if (state) {
    const ownState = workerState(worker);
    if (ownState && !sameText(ownState, state)) return false;
  }

  if (area) {
    const ownArea = workerArea(worker);
    if (ownArea && !sameText(ownArea, area)) return false;
  }

  const exactArea = Boolean(
    area && workerArea(worker) && sameText(workerArea(worker), area),
  );
  const distance = distanceKm(location, worker);
  const radius = Number(location.radiusKm) || 0;
  if (distance !== null && radius > 0 && !exactArea) {
    return distance <= radius;
  }

  return true;
}

/** Worker-side job feed filter. Mirrors the server-side booking match. */
export function jobMatchesWorker(worker, job) {
  if (!worker || !job) return false;

  const city = jobCity(job);
  const state = jobState(job);
  const area = jobArea(job);

  if (city) {
    const ownCity = workerCity(worker);
    if (ownCity) {
      if (!sameText(ownCity, city)) return false;
    } else if (!textIncludes(worker?.area, city)) {
      return false;
    }
  }

  if (state) {
    const ownState = workerState(worker);
    if (ownState && !sameText(ownState, state)) return false;
  }

  if (area) {
    const ownArea = workerArea(worker);
    if (ownArea && !sameText(ownArea, area)) return false;
  }

  const exactArea = Boolean(
    area && workerArea(worker) && sameText(workerArea(worker), area),
  );
  const distance = distanceKm(worker, job);
  const radius = Number(worker?.radiusKm) || 25;
  if (distance !== null && !exactArea) {
    return distance <= radius;
  }

  return Boolean(city || area || distance !== null);
}

/** Public urgent-job cards are limited to the customer's selected location. */
export function jobInServiceArea(job, location) {
  if (!job) return false;
  if (!location) return true;

  const city = String(location.name || location.cityName || "").trim();
  const state = String(location.state || location.stateName || "").trim();
  const area = String(location.areaName || location.area || "").trim();

  if (city) {
    const ownCity = jobCity(job);
    if (ownCity) {
      if (!sameText(ownCity, city)) return false;
    } else if (!textIncludes(job?.area, city)) {
      return false;
    }
  }

  if (state) {
    const ownState = jobState(job);
    if (ownState && !sameText(ownState, state)) return false;
  }

  if (area) {
    const ownArea = jobArea(job);
    if (ownArea && !sameText(ownArea, area)) return false;
  }

  if (!jobCity(job) && !jobArea(job)) {
    const distance = distanceKm(location, job);
    const radius = Number(location.radiusKm) || 0;
    if (distance === null || radius <= 0) return false;
    return distance <= radius;
  }

  return true;
}
