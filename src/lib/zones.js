import { getDistance } from "geolib";

export const OUT_OF_ZONE_MESSAGE =
  "We are not live in your location yet! Our services will get to your location soon.";

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
    latitude: point.lat,
    longitude: point.lng,
    radiusKm: zoneRadiusKm(zone),
    isActive: zone.isActive !== false,
  };
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

export function zoneForCity(zones, cityName, state = "") {
  const wantedCity = String(cityName || "").trim().toLowerCase();
  const wantedState = String(state || "").trim().toLowerCase();
  if (!wantedCity) return null;
  return (
    activeZones(zones).find((zone) => {
      const zoneCity = String(zone.cityName || "").trim().toLowerCase();
      const zoneState = String(zone.state || "").trim().toLowerCase();
      if (zoneCity !== wantedCity) return false;
      if (wantedState && zoneState && zoneState !== wantedState) return false;
      return true;
    }) || null
  );
}

export function cityZone(zones, city) {
  if (!city) return null;
  const direct = zoneForCity(zones, city.name, city.state || "");
  if (direct) return direct;
  const point = { lat: city.lat, lng: city.lng };
  return activeZones(zones).find((zone) => isInsideZone(zone, point)) || null;
}

export function evaluateZones(zones, { lat, lng, cityName, state } = {}) {
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

  const latitude = numberOrNull(lat);
  const longitude = numberOrNull(lng);
  const hasPoint = latitude !== null && longitude !== null;

  if (hasPoint) {
    const point = { lat: latitude, lng: longitude };
    const inside = active
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
        message: `We serve ${inside[0].cityName || "your area"}.`,
      };
    }
    const nearest = nearestZone(active, point);
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

  const match = zoneForCity(active, cityName, state);
  if (match) {
    return {
      configured: true,
      allowed: true,
      zone: match,
      nearest: null,
      distanceMeters: 0,
      message: `We serve ${match.cityName || "your area"}.`,
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
