import { getDistance } from "geolib";

export const OUT_OF_ZONE_MESSAGE =
  "We are expanding fast! We'll be in your area soon.";

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function zonePoint(zone) {
  const lat = numberOrNull(zone?.latitude ?? zone?.lat);
  const lng = numberOrNull(zone?.longitude ?? zone?.lng);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

export function zoneRadiusKm(zone) {
  return Math.max(0.5, Number(zone?.radiusKm) || 10);
}

export function normalizeZone(zone) {
  if (!zone) return null;
  const point = zonePoint(zone);
  if (!point) return null;
  return {
    ...zone,
    ...point,
    areaName: String(zone.areaName || zone.area || "").trim(),
    latitude: point.lat,
    longitude: point.lng,
    radiusKm: zoneRadiusKm(zone),
    isActive: zone.isActive !== false,
  };
}

function sameText(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function cityMatches(zone, cityName, state = "") {
  if (!cityName) return true;
  if (!sameText(zone.cityName, cityName)) return false;
  if (state && zone.state && !sameText(zone.state, state)) return false;
  return true;
}

export function candidateZones(zones, { cityName, state, areaName } = {}) {
  const active = activeZones(zones);
  if (!cityName) return active;
  const cityZones = active.filter((zone) => cityMatches(zone, cityName, state));
  const areaZones = cityZones.filter((zone) => zone.areaName);
  if (areaName) {
    if (areaZones.length) {
      return areaZones.filter((zone) => sameText(zone.areaName, areaName));
    }
    return cityZones.filter((zone) => !zone.areaName);
  }
  return areaZones.length ? areaZones : cityZones;
}

export function zoneForArea(zones, cityName, state, areaName) {
  return (
    candidateZones(zones, { cityName, state, areaName }).find(
      (zone) => !areaName || sameText(zone.areaName, areaName),
    ) || null
  );
}

export function activeZones(zones) {
  return (zones || []).map(normalizeZone).filter((zone) => zone?.isActive);
}

export function zoneDistanceMeters(zone, point) {
  const origin = zonePoint(zone);
  const lat = numberOrNull(point?.lat ?? point?.latitude);
  const lng = numberOrNull(point?.lng ?? point?.longitude);
  if (!origin || lat === null || lng === null) return null;
  return getDistance(origin, { latitude: lat, longitude: lng });
}

export function isInsideZone(zone, point) {
  const distance = zoneDistanceMeters(zone, point);
  if (distance === null) return false;
  return distance <= zoneRadiusKm(zone) * 1000;
}

export function nearestZone(zones, point) {
  const ranked = activeZones(zones)
    .map((zone) => ({
      zone,
      distanceMeters: zoneDistanceMeters(zone, point),
    }))
    .filter((item) => item.distanceMeters !== null)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
  return ranked[0] || null;
}

export function zoneForCity(zones, cityName, state = "", areaName = "") {
  return zoneForArea(zones, cityName, state, areaName);
}

export function cityZone(zones, city) {
  if (!city) return null;
  const direct = zoneForArea(
    zones,
    city.name,
    city.state || "",
    city.areaName || city.area || "",
  );
  if (direct) return direct;
  const point = { lat: city.lat, lng: city.lng };
  return activeZones(zones).find((zone) => isInsideZone(zone, point)) || null;
}

export function evaluateZones(zones, { lat, lng, cityName, state, areaName } = {}) {
  const active = activeZones(zones);
  if (!active.length) {
    return {
      configured: false,
      allowed: true,
      zone: null,
      nearest: null,
      distanceMeters: null,
      message: "",
    };
  }

  const candidates = candidateZones(active, { cityName, state, areaName });
  const latitude = numberOrNull(lat);
  const longitude = numberOrNull(lng);
  const hasPoint = latitude !== null && longitude !== null;

  if (hasPoint) {
    const point = { lat: latitude, lng: longitude };
    const inside = candidates
      .filter((zone) => isInsideZone(zone, point))
      .sort(
        (a, b) =>
          (zoneDistanceMeters(a, point) || 0) - (zoneDistanceMeters(b, point) || 0),
      );
    if (inside.length) {
      return {
        configured: true,
        allowed: true,
        zone: inside[0],
        nearest: { zone: inside[0], distanceMeters: zoneDistanceMeters(inside[0], point) },
        distanceMeters: zoneDistanceMeters(inside[0], point),
        message: `We serve ${inside[0].areaName || inside[0].cityName || "your area"}.`,
      };
    }
    const nearest = nearestZone(candidates.length ? candidates : active, point);
    return {
      configured: true,
      allowed: false,
      reason: "coordinates_outside_zones",
      zone: null,
      nearest,
      distanceMeters: nearest?.distanceMeters ?? null,
      message: OUT_OF_ZONE_MESSAGE,
    };
  }

  const match = candidates.find((zone) => {
    if (!cityName) return false;
    if (!sameText(zone.cityName, cityName)) return false;
    if (state && zone.state && !sameText(zone.state, state)) return false;
    if (areaName && zone.areaName && !sameText(zone.areaName, areaName)) return false;
    return true;
  });
  if (match) {
    return {
      configured: true,
      allowed: true,
      zone: match,
      nearest: null,
      distanceMeters: 0,
      message: `We serve ${match.areaName || match.cityName || "your area"}.`,
    };
  }

  return {
    configured: true,
    allowed: false,
    reason: "location_missing",
    zone: null,
    nearest: null,
    distanceMeters: null,
    message: OUT_OF_ZONE_MESSAGE,
  };
}

export function formatZoneDistance(distanceMeters) {
  if (!Number.isFinite(Number(distanceMeters))) return "";
  const km = Number(distanceMeters) / 1000;
  if (km < 1) return `${Math.round(Number(distanceMeters))} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
