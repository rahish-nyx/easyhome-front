import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useCatalogue } from "./CatalogueContext";
import { api } from "../lib/api";
import { DEFAULT_PROMOS } from "../lib/constants";
import {
  PROMO_SESSION_KEY,
  normalizePromoCode,
  promoHasDiscount,
  promoIsLive,
} from "../lib/promos";

const PromoContext = createContext(null);

function readStoredCode() {
  if (typeof window === "undefined") return "";
  try {
    return normalizePromoCode(window.sessionStorage.getItem(PROMO_SESSION_KEY));
  } catch {
    return "";
  }
}

function storeCode(code) {
  if (typeof window === "undefined") return;
  try {
    if (code) window.sessionStorage.setItem(PROMO_SESSION_KEY, code);
    else window.sessionStorage.removeItem(PROMO_SESSION_KEY);
  } catch {
    /* Storage can be unavailable in private mode. */
  }
}

export function PromoProvider({ children }) {
  const { promos: cataloguePromos, promosLoading } = useCatalogue();
  const [params, setParams] = useSearchParams();
  const [remotePromos, setRemotePromos] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(true);
  const [code, setCode] = useState(readStoredCode);

  const incomingCode = normalizePromoCode(
    params.get("promo") || params.get("code") || "",
  );

  useEffect(() => {
    if (!incomingCode) return;
    setCode(incomingCode);
    storeCode(incomingCode);
  }, [incomingCode]);

  const refreshPromos = useCallback(async () => {
    setRemoteLoading(true);
    try {
      const data = await api.get("/public/promos", { timeout: 10000 });
      setRemotePromos(Array.isArray(data?.promos) ? data.promos : []);
    } catch {
      // The catalogue payload is still a valid fallback when the live coupon
      // endpoint is temporarily unavailable.
      setRemotePromos(null);
    } finally {
      setRemoteLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPromos();
  }, [refreshPromos]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshPromos();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [refreshPromos]);

  const promos =
    (remotePromos && remotePromos.length ? remotePromos : null) ??
    (cataloguePromos && cataloguePromos.length ? cataloguePromos : null) ??
    DEFAULT_PROMOS;

  const activePromo = useMemo(() => {
    if (!code) return null;
    return (
      promos.find(
        (promo) =>
          normalizePromoCode(promo.couponCode) === code &&
          promoHasDiscount(promo) &&
          promoIsLive(promo) &&
          promo.placement !== "worker_dashboard",
      ) || null
    );
  }, [code, promos]);

  const loading =
    Boolean(code) &&
    ((remoteLoading && remotePromos === null) ||
      (promosLoading && !promos.length));

  const status = !code
    ? "idle"
    : activePromo
      ? "active"
      : loading
        ? "loading"
        : "invalid";

  const applyCode = useCallback(
    (next) => {
      const normalized = normalizePromoCode(next);
      setCode(normalized);
      storeCode(normalized);
      if (normalized) refreshPromos();
      if (params.has("promo") || params.has("code")) {
        const nextParams = new URLSearchParams(params);
        nextParams.delete("promo");
        nextParams.delete("code");
        if (normalized) nextParams.set("promo", normalized);
        setParams(nextParams, { replace: true });
      }
      return normalized;
    },
    [params, refreshPromos, setParams],
  );

  const clearPromo = useCallback(() => {
    setCode("");
    storeCode("");
    if (params.has("promo") || params.has("code")) {
      const next = new URLSearchParams(params);
      next.delete("promo");
      next.delete("code");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const value = useMemo(
    () => ({
      code,
      activePromo,
      promos,
      status,
      loading,
      applyCode,
      clearPromo,
      refreshPromos,
    }),
    [
      code,
      activePromo,
      promos,
      status,
      loading,
      applyCode,
      clearPromo,
      refreshPromos,
    ],
  );

  return <PromoContext.Provider value={value}>{children}</PromoContext.Provider>;
}

export function usePromo() {
  const context = useContext(PromoContext);
  if (!context) throw new Error("usePromo must be used inside PromoProvider");
  return context;
}
