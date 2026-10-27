import { useEffect, useState } from "react";
import { api } from "../lib/api";

const CACHE_PREFIX = "easyhome:workers:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(serviceKey, limit) {
  return `${CACHE_PREFIX}:${serviceKey || "all"}:${limit}`;
}

function readCache(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.workers)) return null;
    const cachedAt = Number(data.cachedAt) || 0;
    if (!cachedAt) return null;
    return { workers: data.workers, cachedAt };
  } catch {
    return null;
  }
}

function writeCache(key, workers) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ workers, cachedAt: Date.now() }),
    );
  } catch {
    // A full or disabled localStorage should never break the directory.
  }
}

/**
 * Cache-first public worker directory. This replaces one Firestore listener
 * per Search/Services view with an API request that the server and browser
 * both cache. Listings are allowed to be a few minutes old.
 */
export function useCachedWorkers(serviceKey = "", limit = 24) {
  const key = cacheKey(serviceKey, limit);
  const [state, setState] = useState(() => {
    const cached = readCache(key);
    return {
      key,
      data: cached?.workers || [],
      loading: !cached,
      error: null,
    };
  });

  useEffect(() => {
    const cached = readCache(key);
    const fresh = cached && Date.now() - cached.cachedAt < CACHE_TTL_MS;
    if (fresh) {
      setState({ key, data: cached.workers, loading: false, error: null });
      return undefined;
    }

    let active = true;
    setState((previous) => {
      const fallback = previous.key === key ? previous.data : [];
      const data = fallback.length ? fallback : cached?.workers || [];
      return { key, data, loading: data.length === 0, error: null };
    });

    const params = new URLSearchParams({ limit: String(limit) });
    if (serviceKey) params.set("serviceKey", serviceKey);

    api
      .get(`/public/workers?${params.toString()}`)
      .then((result) => {
        const workers = Array.isArray(result?.workers) ? result.workers : [];
        writeCache(key, workers);
        if (active) {
          setState({ key, data: workers, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!active) return;
        setState((previous) => ({
          key,
          data: previous.key === key ? previous.data : [],
          loading: false,
          error: error?.message || "Could not load professionals.",
        }));
      });

    return () => {
      active = false;
    };
  }, [key, serviceKey, limit]);

  if (state.key !== key) {
    const cached = readCache(key);
    return {
      data: cached?.workers || [],
      loading: !cached,
      error: null,
    };
  }
  return state;
}
