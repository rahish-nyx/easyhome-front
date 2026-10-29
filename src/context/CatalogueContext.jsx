import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "../lib/api";
import { FALLBACK_SERVICES, DEFAULT_FOOTER_LINKS, DEFAULT_SETTINGS } from "../lib/constants";
import {
  DEFAULT_CUSTOMER_RULES,
  DEFAULT_WORKER_RULES,
  normalisePlanGroup,
} from "../lib/plans";

const CatalogueContext = createContext(null);

// The catalogue is almost static. Keep it in localStorage for 15 minutes and
// let the API's in-memory/CDN cache absorb repeat requests so the dashboard
// does not hit MongoDB for every page view.
const CACHE_KEY = "easyhome:catalogue:v5";
const CACHE_TTL_MS = 15 * 60 * 1000;

// First paint comes from the bundled 181-category catalogue and footer copy,
// so the storefront works instantly (and offline) before the API replies.
const STATIC_CATALOGUE = {
  services: FALLBACK_SERVICES,
  folders: [],
  cities: [],
  zones: [],
  promos: [],
  footerLinks: DEFAULT_FOOTER_LINKS,
  hiddenFooterHrefs: [],
  settings: null,
  version: 2,
  fetchedAt: null,
};

function readCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Validate the shape so a partially-written cache cannot leave empty menus.
    if (
      !data ||
      !Array.isArray(data.services) ||
      !Array.isArray(data.folders) ||
      !Array.isArray(data.cities) ||
      !Array.isArray(data.zones) ||
      !Array.isArray(data.footerLinks)
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function isCacheFresh(cache) {
  const cachedAt = Number(cache?.cachedAt);
  return Number.isFinite(cachedAt) && Date.now() - cachedAt < CACHE_TTL_MS;
}

function writeCache(data) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...data, cachedAt: Date.now() }),
    );
  } catch {
    /* Storage can be unavailable in private mode; the in-memory copy works. */
  }
}

function normalizePayload(payload) {
  return {
    services: Array.isArray(payload?.services) ? payload.services : [],
    folders: Array.isArray(payload?.folders) ? payload.folders : [],
    cities: Array.isArray(payload?.cities) ? payload.cities : [],
    zones: Array.isArray(payload?.zones) ? payload.zones : [],
    promos: Array.isArray(payload?.promos) ? payload.promos : [],
    footerLinks: Array.isArray(payload?.footerLinks) ? payload.footerLinks : [],
    hiddenFooterHrefs: Array.isArray(payload?.hiddenFooterHrefs)
      ? payload.hiddenFooterHrefs
      : [],
    settings:
      payload?.settings && typeof payload.settings === "object"
        ? payload.settings
        : null,
    version: payload?.version || 2,
    fetchedAt: payload?.fetchedAt || new Date().toISOString(),
  };
}

function normaliseSettings(data) {
  const merged = { ...DEFAULT_SETTINGS, ...(data || {}) };
  const legacyCommission = Number(merged.commissionPct);
  merged.customerPlans = normalisePlanGroup(
    merged.customerPlans,
    Number(merged.subscriptionPrice) || DEFAULT_SETTINGS.customerPlans.monthly,
  );
  merged.workerPlans = normalisePlanGroup(
    merged.workerPlans,
    DEFAULT_SETTINGS.workerPlans.monthly,
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
    merged.customerBenefits = [...DEFAULT_SETTINGS.customerBenefits];
  }
  if (!Array.isArray(merged.workerBenefits) || !merged.workerBenefits.length) {
    merged.workerBenefits = [...DEFAULT_SETTINGS.workerBenefits];
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

function visiblePromos(promos, now) {
  return promos.filter((promo) => {
    if (promo.active === false) return false;
    const starts =
      promo.startsAt?.toDate?.() ||
      (promo.startsAt ? new Date(promo.startsAt) : null);
    const ends =
      promo.endsAt?.toDate?.() ||
      (promo.endsAt ? new Date(promo.endsAt) : null);
    if (starts && !Number.isNaN(starts.getTime()) && starts.getTime() > now) {
      return false;
    }
    if (ends && !Number.isNaN(ends.getTime()) && ends.getTime() < now) {
      return false;
    }
    return true;
  });
}

export function CatalogueProvider({ children }) {
  const [initial] = useState(() => {
    const cached = readCache();
    return { cached, fresh: isCacheFresh(cached) };
  });
  const [catalogue, setCatalogue] = useState(initial.cached || STATIC_CATALOGUE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlightRef = useRef(false);
  const hasDataRef = useRef(true);

  useEffect(() => {
    hasDataRef.current = Boolean(catalogue);
  }, [catalogue]);

  const loadCatalogue = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!hasDataRef.current) setLoading(true);
    setError("");

    try {
      const payload = await api.get("/public/bootstrap");
      const next = normalizePayload(payload);
      if (!next.services.length) next.services = FALLBACK_SERVICES;
      if (!next.footerLinks.length) next.footerLinks = DEFAULT_FOOTER_LINKS;
      setCatalogue(next);
      hasDataRef.current = true;
      writeCache(next);
    } catch (err) {
      // The last successful catalogue stays on screen when a refresh fails.
      setError(err?.message || "Could not refresh the catalogue.");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initial.fresh) loadCatalogue();

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!isCacheFresh(readCache())) loadCatalogue();
    };
    const onStorage = (event) => {
      if (event.key !== CACHE_KEY || !event.newValue) return;
      const next = readCache();
      if (!next) return;
      setCatalogue(next);
      hasDataRef.current = true;
      setLoading(false);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, [initial.fresh, loadCatalogue]);

  // A stable clock keeps promo expiry deterministic during render while still
  // letting a banner roll over without a page reload.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const services = useMemo(() => {
    const source = catalogue?.services?.length
      ? catalogue.services
      : FALLBACK_SERVICES;
    return source.filter((service) => service.active !== false);
  }, [catalogue]);

  const cities = useMemo(
    () => (catalogue?.cities || []).filter((city) => city.active !== false),
    [catalogue],
  );

  const folders = useMemo(
    () =>
      (catalogue?.folders || [])
        .filter((folder) => folder && folder.isLive !== false)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
    [catalogue],
  );

  const zones = useMemo(
    () => (catalogue?.zones || []).filter(Boolean),
    [catalogue],
  );

  const promos = useMemo(
    () => visiblePromos(catalogue?.promos || [], now),
    [catalogue, now],
  );

  const footerLinks = useMemo(
    () =>
      (catalogue?.footerLinks?.length
        ? catalogue.footerLinks
        : DEFAULT_FOOTER_LINKS
      )
        .filter((link) => link.active !== false)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
    [catalogue],
  );

  const settings = useMemo(
    () => normaliseSettings(catalogue?.settings),
    [catalogue],
  );

  const value = useMemo(
    () => ({
      services,
      servicesLoading: loading,
      servicesError: error || null,
      folders,
      foldersLoading: loading,
      cities,
      citiesLoading: loading,
      zones,
      zonesLoading: loading,
      promos,
      promosLoading: loading,
      footerLinks,
      footerLinksLoading: loading,
      settings,
      settingsLoading: loading,
      catalogueUpdatedAt: catalogue?.fetchedAt || null,
      refreshCatalogue: loadCatalogue,
    }),
    [
      services,
      loading,
      error,
      folders,
      cities,
      zones,
      promos,
      footerLinks,
      settings,
      catalogue,
      loadCatalogue,
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
