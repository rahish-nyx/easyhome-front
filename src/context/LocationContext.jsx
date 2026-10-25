import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getDistance } from "geolib";
import { useCatalogue } from "./CatalogueContext";
import { api } from "../lib/api";
import {
  evaluateZones,
  normalizeZone,
} from "../lib/zones";

const LocationContext = createContext(null);
const CITY_KEY = "easyhome:city";
const COORDS_KEY = "easyhome:coords";

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be blocked */
  }
}

function pointOf(item) {
  const lat = Number(item?.lat ?? item?.latitude);
  const lng = Number(item?.lng ?? item?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function normalizeAreas(areas) {
  return (Array.isArray(areas) ? areas : [])
    .map((area) => {
      if (typeof area === "string") return { name: area.trim() };
      const name = String(area?.name || area?.area || "").trim();
      if (!name) return null;
      return {
        name,
        lat: Number.isFinite(Number(area?.lat)) ? Number(area.lat) : null,
        lng: Number.isFinite(Number(area?.lng)) ? Number(area.lng) : null,
      };
    })
    .filter(Boolean);
}

function safeCity(city) {
  if (!city) return null;
  const localAreas = normalizeAreas(city.localAreas || city.areas);
  const areaName = String(city.areaName || city.area || "").trim();
  const area =
    localAreas.find(
      (item) => item.name.toLowerCase() === areaName.toLowerCase(),
    ) || (areaName ? { name: areaName, lat: null, lng: null } : null);
  const cityLat = Number(city.cityLat ?? city.lat);
  const cityLng = Number(city.cityLng ?? city.lng);
  const lat = Number.isFinite(Number(area?.lat)) ? Number(area.lat) : cityLat;
  const lng = Number.isFinite(Number(area?.lng)) ? Number(area.lng) : cityLng;
  return {
    id: city.id || city.name,
    name: city.name || "Current location",
    state: city.state || "",
    area: area?.name || "",
    areaName: area?.name || "",
    localAreas,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    cityLat: Number.isFinite(cityLat) ? cityLat : null,
    cityLng: Number.isFinite(cityLng) ? cityLng : null,
    radiusKm: Number(city.radiusKm) || 0,
    detected: Boolean(city.detected),
  };
}

function nearestAreaName(city, lat, lng) {
  const areas = normalizeAreas(city?.localAreas || city?.areas).filter(
    (area) => Number.isFinite(Number(area.lat)) && Number.isFinite(Number(area.lng)),
  );
  if (!areas.length) return normalizeAreas(city?.localAreas || city?.areas)[0]?.name || "";
  const ranked = areas
    .map((area) => ({
      area,
      meters: getDistance(
        { latitude: Number(area.lat), longitude: Number(area.lng) },
        { latitude: Number(lat), longitude: Number(lng) },
      ),
    }))
    .sort((a, b) => a.meters - b.meters);
  return ranked[0]?.area?.name || "";
}

function apiZone(zone) {
  if (!zone) return null;
  return normalizeZone({
    ...zone,
    latitude: zone.latitude ?? zone.lat,
    longitude: zone.longitude ?? zone.lng,
    isActive: zone.isActive !== false,
  });
}

export function LocationProvider({ children }) {
  const { cities, zones } = useCatalogue();
  const [savedCity, setCityState] = useState(() => safeCity(readJson(CITY_KEY)));
  const [coords, setCoordsState] = useState(() => {
    const saved = readJson(COORDS_KEY);
    return pointOf(saved) ? { ...pointOf(saved), at: saved?.at || null } : null;
  });
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [zoneNotice, setZoneNotice] = useState(null);
  const dismissedKey = useRef("");

  // Resolve the first usable city during render so the header never flashes
  // "Choose city" while the catalogue is still warming up.
  const city = savedCity || safeCity(cities[0]) || null;

  useEffect(() => {
    if (savedCity || !cities.length) return;
    setCityState(safeCity(cities[0]));
  }, [cities, savedCity]);

  const point = useMemo(() => {
    const savedPoint = pointOf(coords);
    if (savedPoint) return savedPoint;
    return pointOf(city);
  }, [coords, city]);

  const areas = useMemo(() => normalizeAreas(city?.localAreas), [city]);
  const states = useMemo(
    () =>
      Array.from(
        new Set(cities.map((item) => String(item.state || "").trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [cities],
  );
  const citiesForState = useCallback(
    (state) =>
      cities.filter(
        (item) =>
          !state ||
          String(item.state || "").trim().toLowerCase() ===
            String(state || "").trim().toLowerCase(),
      ),
    [cities],
  );

  const localCheck = useMemo(
    () =>
      evaluateZones(zones, {
        lat: point?.lat,
        lng: point?.lng,
        cityName: city?.name,
        state: city?.state,
        areaName: city?.areaName || city?.area || "",
      }),
    [zones, point, city],
  );

  // Local zone state is authoritative. A stale API response must never keep a
  // disabled area live after an admin switches it off.
  const zoneCheck = localCheck;

  const checkKey = city
    ? `${city.id || city.name}:${city.areaName || ""}:${point?.lat ?? ""}:${point?.lng ?? ""}`
    : "";

  const commitCoords = useCallback((nextPoint, source = "gps") => {
    if (!nextPoint) {
      setCoordsState(null);
      writeJson(COORDS_KEY, null);
      return;
    }
    const safe = {
      lat: Number(nextPoint.lat),
      lng: Number(nextPoint.lng),
      accuracy: Number.isFinite(Number(nextPoint.accuracy))
        ? Number(nextPoint.accuracy)
        : null,
      source,
      at: new Date().toISOString(),
    };
    setCoordsState(safe);
    writeJson(COORDS_KEY, safe);
  }, []);

  const setCity = useCallback(
    (next) => {
      const safe = safeCity(next);
      if (!safe) return;
      setCityState(safe);
      writeJson(CITY_KEY, safe);
      const nextPoint = pointOf(safe);
      if (nextPoint) commitCoords(nextPoint, "city");
      else commitCoords(null);

      const check = evaluateZones(zones, {
        lat: nextPoint?.lat,
        lng: nextPoint?.lng,
        cityName: safe.name,
        state: safe.state,
        areaName: safe.areaName || safe.area || "",
      });
      if (check.configured && !check.allowed) {
        setZoneNotice({
          open: true,
          cityName: safe.name,
          state: safe.state,
          areaName: safe.areaName || "",
          nearestZone: check.nearest?.zone?.cityName || "",
          distanceMeters: check.nearest?.distanceMeters ?? null,
          coords: nextPoint,
        });
      } else if (check.allowed) {
        setZoneNotice(null);
      }
    },
    [zones, commitCoords],
  );

  const setArea = useCallback(
    (areaName) => {
      if (!city) return;
      const area = areas.find(
        (item) => item.name.toLowerCase() === String(areaName || "").toLowerCase(),
      );
      setCity({
        ...city,
        area: area?.name || areaName,
        areaName: area?.name || areaName,
        lat: area?.lat ?? city.cityLat ?? city.lat,
        lng: area?.lng ?? city.cityLng ?? city.lng,
      });
    },
    [city, areas, setCity],
  );

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      throw new Error("This device does not support location.");
    }
    setDetecting(true);
    setError("");

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const exact = { lat, lng, accuracy: position.coords.accuracy };
      let result = null;
      try {
        result = await api.get(`/public/service-area?lat=${lat}&lng=${lng}`);
      } catch {
        // The local zones cache still provides an immediate answer offline.
      }

      const matched = result?.city
        ? cities.find(
            (item) =>
              item.name.toLowerCase() === String(result.city).toLowerCase() &&
              (!result.state ||
                !item.state ||
                item.state.toLowerCase() === String(result.state).toLowerCase()),
          ) || cities.find(
            (item) => item.name.toLowerCase() === String(result.city).toLowerCase(),
          )
        : null;
      const areaName =
        result?.areaName ||
        (matched ? nearestAreaName(matched, lat, lng) : "");
      const next = safeCity(
        matched
          ? {
              ...matched,
              area: areaName,
              areaName,
              lat,
              lng,
              state: result?.state || matched.state || "",
            }
          : result?.allowed && result?.city
            ? {
                id: result.cityId || result.city,
                name: result.city,
                lat,
                lng,
                radiusKm: result.radiusKm || 20,
                state: result.state || "",
                area: areaName,
                areaName,
              }
            : {
                id: "current-location",
                name: "Current location",
                lat,
                lng,
                radiusKm: 0,
                state: result?.state || "",
                area: areaName,
                areaName,
                detected: true,
              },
      );

      const local = evaluateZones(zones, {
        lat,
        lng,
        cityName: next?.name,
        state: next?.state,
        areaName: next?.areaName,
      });
      const apiResultZone = apiZone(result?.zone);
      const remote = result
        ? {
            configured: Boolean(result.configured),
            allowed: Boolean(result.allowed),
            zone: apiResultZone,
            nearest: result.nearestZone
              ? {
                  zone: { cityName: result.nearestZone },
                  distanceMeters: result.distanceMeters,
                }
              : null,
            distanceMeters: result.distanceMeters ?? null,
            message: result.message || "",
          }
        : null;

      setCityState(next);
      writeJson(CITY_KEY, next);
      commitCoords(exact, "gps");

      const finalCheck =
        local.configured
          ? local
          : remote?.configured
            ? remote
            : local;

      if (finalCheck.configured && !finalCheck.allowed) {
        setError("");
        setZoneNotice({
          open: true,
          cityName: next?.name === "Current location" ? "" : next?.name || "",
          state: next?.state || "",
          nearestZone:
            finalCheck.nearest?.zone?.cityName ||
            result?.nearestZone ||
            "",
          distanceMeters:
            finalCheck.nearest?.distanceMeters ?? result?.distanceMeters ?? null,
          coords: exact,
        });
      } else {
        setZoneNotice(null);
        dismissedKey.current = "";
      }

      return { ...next, zoneAllowed: !finalCheck.configured || finalCheck.allowed };
    } catch (locationError) {
      if (locationError.code === 1) {
        const message = "Location permission denied. Pick your city manually.";
        setError(message);
        throw new Error(message);
      }
      throw locationError;
    } finally {
      setDetecting(false);
    }
  }, [cities, zones, commitCoords]);

  const openPicker = useCallback(() => {
    setPickerOpen(true);
    setZoneNotice(null);
  }, []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const dismissZoneNotice = useCallback(() => {
    dismissedKey.current = checkKey;
    setZoneNotice(null);
  }, [checkKey]);

  const showZoneNotice = useCallback(
    (check = zoneCheck, nextPoint = point) => {
      setZoneNotice({
        open: true,
        cityName: city?.name === "Current location" ? "" : city?.name || "",
        state: city?.state || check?.zone?.state || "",
        areaName: city?.areaName || "",
        nearestZone: check?.nearest?.zone?.cityName || "",
        distanceMeters: check?.nearest?.distanceMeters ?? null,
        coords: nextPoint,
      });
    },
    [zoneCheck, point, city],
  );

  // On app open, or after a zone is activated/deactivated by an admin, tell the
  // customer once if their saved city is outside every live operating zone.
  useEffect(() => {
    if (!city || !zoneCheck.configured || zoneCheck.allowed) return;
    if (dismissedKey.current === checkKey) return;
    setZoneNotice({
      open: true,
      cityName: city.name === "Current location" ? "" : city.name,
      state: city.state || zoneCheck.zone?.state || "",
      areaName: city.areaName || "",
      nearestZone: zoneCheck.nearest?.zone?.cityName || "",
      distanceMeters: zoneCheck.nearest?.distanceMeters ?? null,
      coords: point,
    });
  }, [city, zoneCheck, checkKey, point]);

  const value = useMemo(
    () => ({
      city,
      cities,
      states,
      citiesForState,
      areas,
      zones,
      coords,
      point,
      zoneCheck,
      zoneNotice,
      setCity,
      setArea,
      setCoords: commitCoords,
      detectLocation,
      detecting,
      error,
      pickerOpen,
      openPicker,
      closePicker,
      dismissZoneNotice,
      showZoneNotice,
    }),
    [
      city,
      cities,
      states,
      citiesForState,
      areas,
      zones,
      coords,
      point,
      zoneCheck,
      zoneNotice,
      setCity,
      setArea,
      commitCoords,
      detectLocation,
      detecting,
      error,
      pickerOpen,
      openPicker,
      closePicker,
      dismissZoneNotice,
      showZoneNotice,
    ],
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocation must be used inside LocationProvider");
  return context;
}
