import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLiveDoc, useLiveQuery } from "../hooks/useLive";
import { api } from "../lib/api";
import { appSettingsRef, qCities, qPromos, qServiceZones, qServices } from "../lib/queries";
import { FALLBACK_CITIES, FALLBACK_SERVICES } from "../lib/constants";

const CatalogueContext = createContext(null);

const SETTINGS_DEFAULTS = {
  commissionPct: 10,
  subscriptionPrice: 199,
  customerBenefits: [
    "Priority worker matching",
    "Discounted service visits",
    "24×7 priority support",
    "Free cancellation up to 1 hour",
  ],
  workerBenefits: [
    "0% commission on every job",
    "Top placement in search",
    "Free urgent-job priority",
    "Verified Pro badge",
  ],
  supportPhone: "",
  maintenanceMode: false,
  announcement: { title: "", body: "", active: false },
};

export function CatalogueProvider({ children }) {
  const servicesQuery = useMemo(() => qServices(), []);
  const citiesQuery = useMemo(() => qCities(), []);
  const zonesQuery = useMemo(() => qServiceZones(), []);
  const promosQuery = useMemo(() => qPromos(), []);
  const settingsRef = useMemo(() => appSettingsRef(), []);

  const servicesState = useLiveQuery(servicesQuery);
  const citiesState = useLiveQuery(citiesQuery);
  const zonesState = useLiveQuery(zonesQuery);
  const promosState = useLiveQuery(promosQuery);
  const settingsState = useLiveDoc(settingsRef);

  // If Firestore reads are still denied (rules not released yet) or the
  // listener fails offline, use the API's index-free bootstrap as a
  // read-only fallback. Live documents always win once they arrive.
  const [bootstrap, setBootstrap] = useState(null);
  const needsBootstrap = useMemo(
    () =>
      !bootstrap &&
      Boolean(
        servicesState.error ||
          citiesState.error ||
          zonesState.error ||
          promosState.error ||
          settingsState.error,
      ),
    [
      bootstrap,
      servicesState.error,
      citiesState.error,
      zonesState.error,
      promosState.error,
      settingsState.error,
    ],
  );

  useEffect(() => {
    if (!needsBootstrap) return undefined;
    let active = true;
    api
      .get("/public/bootstrap")
      .then((data) => {
        if (active && data) setBootstrap(data);
      })
      .catch(() => {
        /* offline or API unavailable: hardcoded fallbacks still render */
      });
    return () => {
      active = false;
    };
  }, [needsBootstrap]);

  // A stable clock keeps promo expiry deterministic during render while still
  // letting a banner roll over without a page reload.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const promos = useMemo(() => {
    const source = promosState.data.length
      ? promosState.data
      : promosState.error
        ? bootstrap?.promos || []
        : [];
    return source.filter((promo) => {
      if (promo.active === false) return false;
      const starts = promo.startsAt?.toDate?.() || (promo.startsAt ? new Date(promo.startsAt) : null);
      const ends = promo.endsAt?.toDate?.() || (promo.endsAt ? new Date(promo.endsAt) : null);
      if (starts && !Number.isNaN(starts.getTime()) && starts.getTime() > now) return false;
      if (ends && !Number.isNaN(ends.getTime()) && ends.getTime() < now) return false;
      return true;
    });
  }, [promosState.data, promosState.error, bootstrap, now]);

  // Keep the storefront usable on a cold/offline start or if the ruleset is
  // still being deployed. Live documents always win once they arrive.
  const services = useMemo(() => {
    const source = servicesState.data.length
      ? servicesState.data
      : bootstrap?.services?.length
        ? bootstrap.services
        : FALLBACK_SERVICES;
    return source.filter((service) => service.active !== false);
  }, [servicesState.data, bootstrap]);
  const cities = useMemo(() => {
    const source = citiesState.data.length
      ? citiesState.data
      : bootstrap?.cities?.length
        ? bootstrap.cities
        : FALLBACK_CITIES;
    return source.filter((city) => city.active !== false);
  }, [citiesState.data, bootstrap]);

  const zones = useMemo(() => {
    const source = zonesState.data.length
      ? zonesState.data
      : zonesState.error
        ? bootstrap?.zones || []
        : [];
    return source.filter((zone) => zone && zone.isActive !== false);
  }, [zonesState.data, zonesState.error, bootstrap]);

  const settings = useMemo(
    () => ({
      ...SETTINGS_DEFAULTS,
      ...(settingsState.data || (settingsState.error ? bootstrap?.settings : null) || {}),
    }),
    [settingsState.data, settingsState.error, bootstrap],
  );

  const value = useMemo(
    () => ({
      services,
      servicesLoading: servicesState.loading,
      servicesError: servicesState.error,
      cities,
      citiesLoading: citiesState.loading,
      zones,
      zonesLoading: zonesState.loading,
      promos,
      promosLoading: promosState.loading,
      settings,
      settingsLoading: settingsState.loading,
    }),
    [
      services,
      servicesState.loading,
      servicesState.error,
      cities,
      citiesState.loading,
      zones,
      zonesState.loading,
      promos,
      promosState.loading,
      settings,
      settingsState.loading,
    ],
  );

  return (
    <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>
  );
}

export function useCatalogue() {
  const context = useContext(CatalogueContext);
  if (!context) throw new Error("useCatalogue must be used inside CatalogueProvider");
  return context;
}
