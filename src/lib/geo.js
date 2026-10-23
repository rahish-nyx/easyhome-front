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
