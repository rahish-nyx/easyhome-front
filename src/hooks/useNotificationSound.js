import { useEffect, useRef } from "react";
import { playNotificationSound } from "../lib/sound";

/**
 * Plays the chime and triggers OS system notification (with sound/vibration)
 * for unread notifications that arrive after the first successful load,
 * working seamlessly even when the APK/app is minimized or in background.
 */
export function useNotificationSound(items, { loading = false, userId = "", enabled = true } = {}) {
  const seen = useRef(null);

  useEffect(() => {
    seen.current = null;
  }, [userId]);

  useEffect(() => {
    if (!enabled || loading) return;
    const itemList = Array.isArray(items) ? items : [];
    const unread = itemList
      .filter((item) => !item.read)
      .map((item) => item.id)
      .filter(Boolean);

    if (!seen.current) {
      seen.current = new Set(unread);
      return;
    }

    const freshIds = unread.filter((id) => !seen.current.has(id));
    for (const id of unread) seen.current.add(id);

    if (freshIds.length) {
      playNotificationSound();

      // Trigger OS system notification with sound & vibration
      if (typeof window !== "undefined" && "Notification" in window) {
        const freshItems = itemList.filter((item) => freshIds.includes(item.id));
        const triggerSystemNotification = () => {
          freshItems.forEach((item) => {
            const title = item.title || "EasyHome Notification";
            const body = item.body || item.message || "You have a new update";
            const icon = "/icon-192.png";

            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready
                .then((reg) => {
                  reg.showNotification(title, {
                    body,
                    icon,
                    badge: icon,
                    vibrate: [200, 100, 200, 100, 200],
                    tag: `easyhome-notif-${item.id || Date.now()}`,
                    data: { url: item.href || "/" },
                  });
                })
                .catch(() => {
                  try {
                    new Notification(title, {
                      body,
                      icon,
                      tag: `easyhome-notif-${item.id || Date.now()}`,
                      vibrate: [200, 100, 200, 100, 200],
                    });
                  } catch (e) {
                    /* system notification blocked */
                  }
                });
            } else {
              try {
                new Notification(title, {
                  body,
                  icon,
                  tag: `easyhome-notif-${item.id || Date.now()}`,
                  vibrate: [200, 100, 200, 100, 200],
                });
              } catch (e) {
                /* system notification blocked */
              }
            }
          });
        };

        if (Notification.permission === "granted") {
          triggerSystemNotification();
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") triggerSystemNotification();
          });
        }
      }
    }
  }, [items, loading, enabled, userId]);
}

