import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Small async-data hook for REST endpoints (admin panel, earnings, etc.).
 * `deps` controls automatic refetch; `run` allows manual refresh.
 */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({
    data: null,
    loading: immediate,
    error: null,
  });
  const fnRef = useRef(fn);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Keep the latest callback without reading/writing a ref during render.
  useEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback(async (...args) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fnRef.current(...args);
      if (mounted.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (mounted.current) setState({ data: null, loading: false, error });
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!immediate) return;
    run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, run, setData: (data) => setState({ data, loading: false, error: null }) };
}
