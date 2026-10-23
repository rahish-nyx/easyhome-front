import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useCatalogue } from "./CatalogueContext";
import { api } from "../lib/api";

const LocationContext = createContext(null);
const STORAGE_KEY = "easyhome:city";

function readSavedCity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function LocationProvider({ children }) {
  const { cities } = useCatalogue();
  const [savedCity, setCityState] = useState(readSavedCity);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");

  // Resolve the first usable city during render so the header never flashes
  // "Choose city" while the catalogue is still warming up.
  const city = savedCity || cities[0] || null;

  useEffect(() => {
    if (savedCity || !cities.length) return;
    setCityState(cities[0]);
  }, [cities, savedCity]);

  const setCity = useCallback((next) => {
    if (!next) return;
    const safe = {
      id: next.id || next.name,
      name: next.name,
      lat: Number(next.lat) || null,
      lng: Number(next.lng) || null,
      radiusKm: Number(next.radiusKm) || 20,
    };
    setCityState(safe);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch {
      /* storage may be blocked */
    }
  }, []);

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
          maximumAge: 60000,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const result = await api.get(`/public/service-area?lat=${lat}&lng=${lng}`);

      if (!result.allowed) {
        const nearest = cities.find((item) => item.name === result.city);
        if (nearest) setCity(nearest);
        const message = result.message || "We are not in your area yet.";
        setError(message);
        throw new Error(message);
      }

      const matched = cities.find((item) => item.name === result.city);
      const next = matched || {
        id: result.cityId || result.city,
        name: result.city || "Current location",
        lat,
        lng,
        radiusKm: result.radiusKm || 20,
      };
      setCity(next);
      return next;
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
  }, [cities, setCity]);

  const value = useMemo(
    () => ({
      city,
      cities,
      setCity,
      detectLocation,
      detecting,
      error,
    }),
    [city, cities, setCity, detectLocation, detecting, error],
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
