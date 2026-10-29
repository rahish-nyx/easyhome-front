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
  activeZones,
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
  const lat = coordinate(item?.lat ?? item?.latitude);
  const lng = coordinate(item?.lng ?? item?.longitude);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function coordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeAreas(areas) {
  return (Array.isArray(areas) ? areas : [])
    .map((area) => {
      if (typeof area === "string") return { name: area.trim() };
      const name = String(area?.name || area?.area || "").trim();
      if (!name) return null;
      return {
        name,
        lat: coordinate(area?.lat),
        lng: coordinate(area?.lng),
        radiusKm: Number(area?.radiusKm) || null,
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
  const cityLat = coordinate(city.cityLat ?? city.lat);
  const cityLng = coordinate(city.cityLng ?? city.lng);
  const lat = coordinate(area?.lat) ?? cityLat;
  const lng = coordinate(area?.lng) ?? cityLng;
  return {
    id: city.id || city.name,
    name: city.name || "Current location",
    state: city.state || "",
    area: area?.name || "",
    areaName: area?.name || "",
    localAreas,
    lat,
    lng,
    cityLat,
    cityLng,
    radiusKm: Number(area?.radiusKm) || Number(city.radiusKm) || 0,
    detected: Boolean(city.detected),
    locationSource: city.locationSource || "",
    requiresManualArea: Boolean(city.requiresManualArea),
  };
}

function nearestAreaName(city, lat, lng) {
  const areas = normalizeAreas(city?.localAreas || city?.areas).filter(
    (area) => pointOf(area) !== null,
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
  const availableCities = useMemo(() => {
    const liveZones = activeZones(zones);
    if (!zones.length) return cities;
    if (!liveZones.length) return [];

    const grouped = new Map();
    for (const zone of liveZones) {
      const name = String(zone.cityName || "").trim();
      if (!name) continue;
      const state = String(zone.state || "").trim();
      const key = `${name.toLowerCase()}|${state.toLowerCase()}`;
      const current = grouped.get(key) || {
        name,
        state,
        lat: zone.lat,
        lng: zone.lng,
        radiusKm: zone.radiusKm,
        localAreas: [],
      };
      if (zone.areaName) {
        current.localAreas.push({
          name: zone.areaName,
          lat: zone.lat,
          lng: zone.lng,
          radiusKm: zone.radiusKm,
        });
      }
      grouped.set(key, current);
    }

    return [...grouped.values()].map((liveCity) => {
      const configured = cities.find(
        (item) =>
          String(item.name || "").toLowerCase() === liveCity.name.toLowerCase() &&
          String(item.state || "").toLowerCase() === liveCity.state.toLowerCase(),
      );
      return {
        ...configured,
        ...liveCity,
        id: configured?.id || liveCity.name,
        lat: configured?.lat ?? liveCity.lat,
        lng: configured?.lng ?? liveCity.lng,
        cityLat: configured?.cityLat ?? configured?.lat ?? liveCity.lat,
        cityLng: configured?.cityLng ?? configured?.lng ?? liveCity.lng,
        radiusKm: liveCity.radiusKm || configured?.radiusKm || 0,
        localAreas: liveCity.localAreas.length
          ? liveCity.localAreas
          : normalizeAreas(configured?.localAreas || configured?.areas),
      };
    });
  }, [cities, zones]);

  const city = savedCity || safeCity(availableCities[0]) || null;

  useEffect(() => {
    if (savedCity || !availableCities.length) return;
    setCityState(safeCity(availableCities[0]));
  }, [availableCities, savedCity]);

  const point = useMemo(() => {
    const savedPoint = pointOf(coords);
    if (savedPoint) return savedPoint;
    if (city?.locationSource === "ip") return null;
    return pointOf(city);
  }, [coords, city]);

  const areas = useMemo(() => normalizeAreas(city?.localAreas), [city]);
  const states = useMemo(
    () =>
      Array.from(
        new Set(
          availableCities
            .map((item) => String(item.state || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [availableCities],
  );
  const citiesForState = useCallback(
    (state) =>
      availableCities.filter(
        (item) =>
          !state ||
          String(item.state || "").trim().toLowerCase() ===
            String(state || "").trim().toLowerCase(),
      ),
    [availableCities],
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
      setError("");
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
        locationSource: "manual",
      });
    },
    [city, areas, setCity],
  );

  const detectLocation = useCallback(async () => {
    setDetecting(true);
    setError("");

    try {
      let position = null;
      let ipLocation = null;
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== "granted") {
          const req = await Geolocation.requestPermissions();
          if (req.location !== "granted") throw new Error("Location permission denied.");
        }
        const geoPosition = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        });
        position = {
          coords: {
            latitude: geoPosition.coords.latitude,
            longitude: geoPosition.coords.longitude,
            accuracy: geoPosition.coords.accuracy,
          }
        };
      } catch (e) {
        try {
          if (!navigator.geolocation) {
            throw new Error("Geolocation is not supported by this device.");
          }
          position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            });
          });
        } catch (geolocationError) {
        try {
          ipLocation = await api.get("/public/ip-location");
        } catch {
          setError(
            "GPS is unavailable and automatic city lookup failed. Choose your state and city manually.",
          );
          return null;
        }
        if (!ipLocation?.available || !ipLocation.city) {
          setError(
            "GPS is unavailable and your network could not identify a city. Choose your state and city manually.",
          );
          return null;
        }
        console.info(
          "Using approximate IP location after geolocation failed:",
          geolocationError.code || "unsupported",
        );
      } // end catch (geolocationError)
      } // end catch (e)

      if (ipLocation) {
        const reportedCity = String(ipLocation.city).trim();
        const reportedState = String(ipLocation.state || "").trim();
        const matched = availableCities.find(
          (item) =>
            item.name.toLowerCase() === reportedCity.toLowerCase() &&
            (!reportedState ||
              !item.state ||
              item.state.toLowerCase() === reportedState.toLowerCase()),
        );
        const matchingZones = activeZones(zones).filter(
          (zone) =>
            String(zone.cityName || "").toLowerCase() ===
              reportedCity.toLowerCase() &&
            (!reportedState ||
              !String(zone.state || "") ||
              String(zone.state || "").toLowerCase() ===
                reportedState.toLowerCase()),
        );
        const requiresManualArea =
          matchingZones.some((zone) => zone.areaName) &&
          !matchingZones.some((zone) => !zone.areaName);
        const next = safeCity(
          matched
            ? {
                ...matched,
                area: "",
                areaName: "",
                locationSource: "ip",
                detected: true,
                requiresManualArea,
              }
            : {
                id: "ip-location",
                name: reportedCity,
                state: reportedState,
                locationSource: "ip",
                detected: true,
                requiresManualArea,
                lat: null,
                lng: null,
              },
        );
        const check = evaluateZones(zones, {
          cityName: next.name,
          state: next.state,
        });
        setCityState(next);
        writeJson(CITY_KEY, next);
        commitCoords(null, "ip");
        if (check.configured && !check.allowed && !requiresManualArea) {
          setZoneNotice({
            open: true,
            cityName: next.name,
            state: next.state,
            areaName: "",
            nearestZone: check.nearest?.zone?.cityName || "",
            distanceMeters: check.nearest?.distanceMeters ?? null,
            coords: null,
          });
        } else {
          setZoneNotice(null);
          dismissedKey.current = "";
        }
        return {
          ...next,
          locationSource: "ip",
          requiresManualArea,
          zoneAllowed: check.configured ? check.allowed : true,
        };
      }

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const exact = { lat, lng, accuracy: position.coords.accuracy };
      const [serviceAreaResponse, geocodeResponse] = await Promise.allSettled([
        api.get(`/public/service-area?lat=${lat}&lng=${lng}`),
        api.get(`/public/reverse-geocode?lat=${lat}&lng=${lng}`),
      ]);
      const result =
        serviceAreaResponse.status === "fulfilled"
          ? serviceAreaResponse.value
          : null;
      const address =
        geocodeResponse.status === "fulfilled"
          ? geocodeResponse.value?.address || null
          : null;
      const localLocationZone = evaluateZones(zones, { lat, lng });
      const reportedCity =
        result?.city ||
        localLocationZone.zone?.cityName ||
        address?.district ||
        address?.city ||
        address?.town ||
        address?.village ||
        "";
      const reportedState =
        result?.state || localLocationZone.zone?.state || address?.state || "";
      const matched = reportedCity
        ? availableCities.find(
            (item) =>
              item.name.toLowerCase() === String(reportedCity).toLowerCase() &&
              (!reportedState ||
                !item.state ||
                item.state.toLowerCase() === String(reportedState).toLowerCase()),
          ) || availableCities.find(
            (item) => item.name.toLowerCase() === String(reportedCity).toLowerCase(),
          )
        : null;
      const areaName =
        result?.areaName ||
        result?.zone?.areaName ||
        localLocationZone.zone?.areaName ||
        address?.locality ||
        address?.neighbourhood ||
        (matched ? nearestAreaName(matched, lat, lng) : "");
      const next = safeCity(
        matched
          ? {
              ...matched,
              locationSource: "gps",
              area: areaName,
              areaName,
              lat,
              lng,
              state: reportedState || matched.state || "",
            }
          : result?.allowed && result?.city
            ? {
                id: result.cityId || result.city,
                name: result.city,
                lat,
                lng,
                radiusKm: result.radiusKm || 20,
                state: reportedState,
                area: areaName,
                areaName,
                locationSource: "gps",
              }
            : {
                id: "current-location",
                name: reportedCity || "Current location",
                lat,
                lng,
                radiusKm: 0,
                state: reportedState,
                area: areaName,
                areaName,
                detected: true,
                locationSource: "gps",
              },
      );

      const local = localLocationZone;
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
        setError("");
        setZoneNotice(null);
        dismissedKey.current = "";
      }

      return {
        ...next,
        zoneAllowed: finalCheck.configured
          ? finalCheck.allowed
          : Boolean(result?.allowed),
      };
    } catch (locationError) {
      // If zones exist and a saved/manual city matches an active zone,
      // keep using it instead of blocking everything.
      const savedCity = readJson(CITY_KEY);
      const currentCity = savedCity || city;
      const message =
        locationError.message ||
        "Could not detect location automatically. Select your state and city manually.";
      if (currentCity) {
        setError(message);
        return {
          ...currentCity,
          zoneAllowed: true,
          zoneConfigured: zones?.length ? true : false,
          detected: false,
        };
      }
      setError(message);
      return null;
    } finally {
      setDetecting(false);
    }
  }, [availableCities, zones, commitCoords]);

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
    if (city.requiresManualArea) return;
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
      cities: availableCities,
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
      availableCities,
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
