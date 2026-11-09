import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_THRESHOLD = 70;

/**
 * Native-feeling pull-to-refresh for the mobile apps.
 *
 * Engages only when the page is scrolled to the very top, tracks the finger
 * drag (with a small rubber-band resistance), and fires the caller's refresh
 * callback once the user releases past the threshold.
 *
 * Returns:
 *  - pullDistance: current pull offset in px (0 when idle)
 *  - refreshing:    true while the refresh callback is running
 *  - triggerRefresh: manual refresh entry (e.g. from a UI button)
 */
export function usePullToRefresh(onRefresh, { threshold = DEFAULT_THRESHOLD, enabled = true } = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pulling = useRef(false);
  const thresholdRef = useRef(threshold);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  const triggerRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefreshRef.current?.();
    } catch {
      /* surface errors through the dashboard's own toast handling */
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [refreshing]);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleStart = (event) => {
      if (refreshing) return;
      const touch = event.touches && event.touches[0];
      if (!touch) return;
      const scrollTop =
        (typeof window !== "undefined" && (window.scrollY || window.pageYOffset || document.documentElement?.scrollTop || 0)) || 0;
      if (scrollTop > 6) {
        pulling.current = false;
        return;
      }
      pulling.current = true;
      startY.current = touch.clientY;
      setPullDistance(0);
    };

    const handleMove = (event) => {
      if (!pulling.current || startY.current == null) return;
      const touch = event.touches && event.touches[0];
      if (!touch) return;
      const deltaY = touch.clientY - startY.current;
      if (deltaY <= 0) {
        setPullDistance(0);
        startY.current = touch.clientY;
        return;
      }
      const next = deltaY * 0.55;
      setPullDistance(Math.min(next, thresholdRef.current));
    };

    const handleEnd = (event) => {
      if (!pulling.current) return;
      pulling.current = false;
      const touch = event.changedTouches && event.changedTouches[0];
      const deltaY = startY.current != null && touch ? touch.clientY - startY.current : 0;
      startY.current = null;
      const pulledEnough = deltaY * 0.55 >= thresholdRef.current - 0.5;
      if (pulledEnough) {
        void triggerRefresh();
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener("touchstart", handleStart, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleEnd, { passive: true });
    window.addEventListener("touchcancel", handleEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleStart);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
    };
  }, [enabled, refreshing, triggerRefresh]);

  return { pullDistance, refreshing, setPullDistance, triggerRefresh };
}

export default usePullToRefresh;
