import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

/**
 * Cached API polling replaces Firestore listeners.
 *
 * Every hook keeps its last good payload in a module-level cache so navigating
 * between pages never flashes an empty screen. Polling is paused while the tab
 * is hidden and resumes immediately on focus.
 */
const queryCache = new Map();
const docCache = new Map();

const VISIBLE_INTERVAL_MS = 5000;
const HIDDEN_INTERVAL_MS = 20000;

function selectValue(payload, select) {
  if (!select) return payload;
  return payload?.[select] ?? null;
}

function isDocument(descriptor) {
  return descriptor?.key?.startsWith("doc:");
}

export function useLiveQuery(queryRef) {
  const key = queryRef?.key || "";
  const cached = key ? queryCache.get(key) : null;
  const [state, setState] = useState(() => ({
    data: cached?.data || [],
    loading: Boolean(key) && !cached,
    error: null,
    fromCache: Boolean(cached),
  }));
  const inFlight = useRef(false);

  useEffect(() => {
    if (!queryRef?.path) {
      setState({ data: [], loading: false, error: null, fromCache: false });
      return undefined;
    }

    let active = true;
    const existing = queryCache.get(queryRef.key);
    setState((prev) => ({
      ...prev,
      data: existing?.data || prev.data,
      loading: !(existing?.data || prev.data.length),
      error: null,
    }));

    const load = async () => {
      if (!active || inFlight.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      inFlight.current = true;
      try {
        const payload = await api.get(queryRef.path);
        if (!active) return;
        const data = selectValue(payload, queryRef.select);
        const next = Array.isArray(data) ? data : [];
        queryCache.set(queryRef.key, { data: next, at: Date.now() });
        setState({ data: next, loading: false, error: null, fromCache: false });
      } catch (error) {
        if (!active) return;
        setState((prev) => ({ ...prev, loading: false, error }));
      } finally {
        inFlight.current = false;
      }
    };

    load();
    let timer = window.setInterval(
      load,
      typeof document !== "undefined" && document.visibilityState === "hidden"
        ? HIDDEN_INTERVAL_MS
        : VISIBLE_INTERVAL_MS,
    );

    const onVisibility = () => {
      window.clearInterval(timer);
      if (document.visibilityState === "visible") load();
      timer = window.setInterval(
        load,
        document.visibilityState === "hidden"
          ? HIDDEN_INTERVAL_MS
          : VISIBLE_INTERVAL_MS,
      );
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [queryRef?.key, queryRef?.path, queryRef?.select]);

  return state;
}

export function useLiveDoc(docRef) {
  const key = docRef?.key || "";
  const cached = key ? docCache.get(key) : null;
  const [state, setState] = useState(() => ({
    data: cached?.data || null,
    loading: Boolean(key) && !cached,
    error: null,
    fromCache: Boolean(cached),
  }));
  const inFlight = useRef(false);

  useEffect(() => {
    if (!docRef?.path) {
      setState({ data: null, loading: false, error: null, fromCache: false });
      return undefined;
    }

    let active = true;
    const existing = docCache.get(docRef.key);
    setState((prev) => ({
      ...prev,
      data: existing?.data || prev.data,
      loading: !(existing?.data || prev.data),
      error: null,
    }));

    const load = async () => {
      if (!active || inFlight.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      inFlight.current = true;
      try {
        const payload = await api.get(docRef.path);
        if (!active) return;
        const data = selectValue(payload, docRef.select);
        docCache.set(docRef.key, { data: data || null, at: Date.now() });
        setState({ data: data || null, loading: false, error: null, fromCache: false });
      } catch (error) {
        if (!active) return;
        setState((prev) => ({ ...prev, loading: false, error }));
      } finally {
        inFlight.current = false;
      }
    };

    load();
    let timer = window.setInterval(
      load,
      typeof document !== "undefined" && document.visibilityState === "hidden"
        ? HIDDEN_INTERVAL_MS
        : VISIBLE_INTERVAL_MS,
    );

    const onVisibility = () => {
      window.clearInterval(timer);
      if (document.visibilityState === "visible") load();
      timer = window.setInterval(
        load,
        document.visibilityState === "hidden"
          ? HIDDEN_INTERVAL_MS
          : VISIBLE_INTERVAL_MS,
      );
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [docRef?.key, docRef?.path, docRef?.select]);

  return state;
}

/** Drop cached private data when the signed-in account changes. */
export function clearLiveCache() {
  queryCache.clear();
  docCache.clear();
}

export { isDocument };
