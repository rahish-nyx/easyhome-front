import { useEffect, useRef } from "react";
import { playNotificationSound } from "../lib/sound";

/**
 * Plays the chime only for unread notifications that arrive after the first
 * successful load, so opening the app never fires a burst of old alerts.
 */
export function useNotificationSound(items, { loading = false, userId = "", enabled = true } = {}) {
  const seen = useRef(null);

  useEffect(() => {
    seen.current = null;
  }, [userId]);

  useEffect(() => {
    if (!enabled || loading) return;
    const unread = (Array.isArray(items) ? items : [])
      .filter((item) => !item.read)
      .map((item) => item.id)
      .filter(Boolean);

    if (!seen.current) {
      seen.current = new Set(unread);
      return;
    }

    const fresh = unread.filter((id) => !seen.current.has(id));
    for (const id of unread) seen.current.add(id);
    if (fresh.length) playNotificationSound();
  }, [items, loading, enabled, userId]);
}
