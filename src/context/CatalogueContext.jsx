import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLiveDoc, useLiveQuery } from "../hooks/useLive";
import { api } from "../lib/api";
import {
  appSettingsRef,
  qCities,
  qFooterLinks,
  qPromos,
  qServiceZones,
  qServices,
} from "../lib/queries";
import { FALLBACK_SERVICES } from "../lib/constants";
import {
  DEFAULT_CUSTOMER_RULES,
  DEFAULT_WORKER_RULES,
  normalisePlanGroup,
} from "../lib/plans";

const CatalogueContext = createContext(null);

const CACHE_KEY = "easyhome:catalogue:v2";

const SETTINGS_DEFAULTS = {
  commissionPct: 10,
  subscriptionPrice: 199,
  customerPlans: { monthly: 199, quarterly: 537, yearly: 1910 },
  workerPlans: { monthly: 250, quarterly: 675, yearly: 2400 },
  customerRules: { ...DEFAULT_CUSTOMER_RULES },
  workerRules: { ...DEFAULT_WORKER_RULES },
  customerBenefits: [
    "Active priority worker matching",
    "No 10% urgent-job extra charge",
    "24×7 priority support",
    "Free cancellation for 20 minutes (7 for non-Pro)",
    "Verified Pro badge",
  ],
  workerBenefits: [
    "0% fees on every job",
    "Top placement in search",
    "Free urgent-job priority",
    "Verified Pro badge",
  ],
  supportPhone: "",
  maintenanceMode: false,
  announcement: { title: "", body: "", active: false },
};

function readCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(patch) {
  if (typeof window === "undefined") return;
  try {
    const current = readCache() || {};
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...current, ...patch, cachedAt: Date.now() }),
    );
  } catch {
    /* Storage can be unavailable in private mode; live data still works. */
  }
}

function normaliseSettings(data) {
  const merged = { ...SETTINGS_DEFAULTS, ...(data || {}) };
  const legacyCommission = Number(merged.commissionPct);
  merged.customerPlans = normalisePlanGroup(
    merged.customerPlans,
    Number(merged.subscriptionPrice) || SETTINGS_DEFAULTS.customerPlans.monthly,
  );
  merged.workerPlans = normalisePlanGroup(
    merged.workerPlans,
    SETTINGS_DEFAULTS.workerPlans.monthly,
  );
  merged.subscriptionPrice = merged.customerPlans.monthly;
  merged.customerRules = {
    ...DEFAULT_CUSTOMER_RULES,
    ...(merged.customerRules || {}),
  };
  merged.workerRules = {
    ...DEFAULT_WORKER_RULES,
    feesPct: Number.isFinite(legacyCommission)
      ? legacyCommission
      : DEFAULT_WORKER_RULES.feesPct,
    ...(merged.workerRules || {}),
  };
  merged.commissionPct = merged.workerRules.feesPct;
  const benefits = Array.isArray(merged.customerBenefits)
    ? merged.customerBenefits
    : [];
  if (benefits.length) {
    const replacements = {
      "Priority matching": "Active priority worker matching",
      "Priority worker matching": "Active priority worker matching",
      "Discounted service visits": "No 10% urgent-job extra charge",
      "Member pricing": "No 10% urgent-job extra charge",
      "No 10% extra charge on urgent jobs": "No 10% urgent-job extra charge",
      "No 10% urgent-job fee": "No 10% urgent-job extra charge",
      "No urgent-job fee": "No 10% urgent-job extra charge",
      "Free cancellation up to 1 hour": "Free cancellation for 20 minutes (7 for non-Pro)",
      "Free cancellation up to 20 minutes": "Free cancellation for 20 minutes (7 for non-Pro)",
      "Free cancellation up to 7 minutes": "Free cancellation for 20 minutes (7 for non-Pro)",
      "20-minute free cancellation": "Free cancellation for 20 minutes (7 for non-Pro)",
      "24x7 priority support": "24×7 priority support",
    };
    const normalized = benefits.map((benefit) => replacements[benefit] || benefit);
    if (!normalized.some((benefit) => /verified pro badge/i.test(benefit))) {
      normalized.push("Verified Pro badge");
    }
    merged.customerBenefits = [...new Set(normalized)];
  } else {
    merged.customerBenefits = [...SETTINGS_DEFAULTS.customerBenefits];
  }
  if (!Array.isArray(merged.workerBenefits) || !merged.workerBenefits.length) {
    merged.workerBenefits = [...SETTINGS_DEFAULTS.workerBenefits];
  } else {
    merged.workerBenefits = [
      ...new Set(
        merged.workerBenefits.map((benefit) =>
          /^0% commission on every job$/i.test(benefit)
            ? "0% fees on every job"
            : benefit,
        ),
      ),
    ];
  }
  return merged;
}

export function CatalogueProvider({ children }) {
  const servicesQuery = useMemo(() => qServices(), []);
  const citiesQuery = useMemo(() => qCities(), []);
  const zonesQuery = useMemo(() => qServiceZones(), []);
  const promosQuery = useMemo(() => qPromos(), []);
  const footerLinksQuery = useMemo(() => qFooterLinks(), []);
  const settingsRef = useMemo(() => appSettingsRef(), []);

  const servicesState = useLiveQuery(servicesQuery);
  const citiesState = useLiveQuery(citiesQuery);
  const zonesState = useLiveQuery(zonesQuery);
  const promosState = useLiveQuery(promosQuery);
  const footerLinksState = useLiveQuery(footerLinksQuery);
  const settingsState = useLiveDoc(settingsRef);
  const [catalogueCache] = useState(readCache);

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
          footerLinksState.error ||
          settingsState.error,
      ),
    [
      bootstrap,
      servicesState.error,
      citiesState.error,
      zonesState.error,
      promosState.error,
      footerLinksState.error,
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
      : promosState.error || promosState.loading
        ? catalogueCache?.promos?.length
          ? catalogueCache.promos
          : bootstrap?.promos || []
        : [];
    return source.filter((promo) => {
      if (promo.active === false) return false;
      const starts = promo.startsAt?.toDate?.() || (promo.startsAt ? new Date(promo.startsAt) : null);
      const ends = promo.endsAt?.toDate?.() || (promo.endsAt ? new Date(promo.endsAt) : null);
      if (starts && !Number.isNaN(starts.getTime()) && starts.getTime() > now) return false;
      if (ends && !Number.isNaN(ends.getTime()) && ends.getTime() < now) return false;
      return true;
    });
  }, [
    promosState.data,
    promosState.error,
    promosState.loading,
    bootstrap,
    catalogueCache,
    now,
  ]);
  const footerLinks = useMemo(() => {
    const cachedLinks = catalogueCache?.footerLinks?.length
      ? catalogueCache.footerLinks
      : null;
    const source = footerLinksState.error
      ? cachedLinks || bootstrap?.footerLinks || []
      : footerLinksState.loading
        ? cachedLinks || []
        : footerLinksState.data;
    return source
      .filter((link) => link.active !== false)
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }, [
    footerLinksState.data,
    footerLinksState.error,
    footerLinksState.loading,
    bootstrap,
    catalogueCache,
  ]);

  // Keep the storefront usable on a cold/offline start or if the ruleset is
  // still being deployed. Live documents always win once they arrive.
  const services = useMemo(() => {
    const source = servicesState.data.length
      ? servicesState.data
      : catalogueCache?.services?.length
        ? catalogueCache.services
        : bootstrap?.services?.length
          ? bootstrap.services
          : FALLBACK_SERVICES;
    return source.filter((service) => service.active !== false);
  }, [servicesState.data, bootstrap, catalogueCache]);
  const cities = useMemo(() => {
    // Only admin-active locations may appear in customer dropdowns. There is
    // no hardcoded city list: live zone data (or a cached bootstrap response)
    // is the only source, so the public picker never advertises a city that
    // admins have not published.
    const source = citiesState.data.length
      ? citiesState.data
      : citiesState.error || citiesState.loading
        ? catalogueCache?.cities?.length
          ? catalogueCache.cities
          : bootstrap?.cities || []
        : [];
    return source.filter((city) => city.active !== false);
  }, [
    citiesState.data,
    citiesState.loading,
    citiesState.error,
    bootstrap,
    catalogueCache,
  ]);

  const zones = useMemo(() => {
    const source = zonesState.data.length
      ? zonesState.data
      : zonesState.error || zonesState.loading
        ? catalogueCache?.zones?.length
          ? catalogueCache.zones
          : bootstrap?.zones || []
        : [];
    return source.filter(Boolean);
  }, [
    zonesState.data,
    zonesState.error,
    zonesState.loading,
    bootstrap,
    catalogueCache,
  ]);

  const settings = useMemo(
    () =>
      normaliseSettings(
        settingsState.data ||
          (settingsState.error || settingsState.loading
            ? catalogueCache?.settings || bootstrap?.settings
            : null),
      ),
    [
      settingsState.data,
      settingsState.error,
      settingsState.loading,
      bootstrap,
      catalogueCache,
    ],
  );

  // Warm the local cache after live data arrives. This keeps the shell, menu
  // and catalogue instant on the next launch while Firestore reconnects.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const patch = { settings };
      if (servicesState.data.length) patch.services = servicesState.data;
      if (citiesState.data.length) patch.cities = citiesState.data;
      if (zonesState.data.length) patch.zones = zonesState.data;
      if (promosState.data.length) patch.promos = promosState.data;
      if (footerLinksState.data.length) {
        patch.footerLinks = footerLinksState.data;
      }
      writeCache(patch);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    servicesState.data,
    citiesState.data,
    zonesState.data,
    promosState.data,
    footerLinksState.data,
    settings,
  ]);

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
      footerLinks,
      footerLinksLoading: footerLinksState.loading,
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
      footerLinks,
      footerLinksState.loading,
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
