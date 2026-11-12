import { LocalNotifications } from "@capacitor/local-notifications";

const CHANNEL_ID = "easyhome_alerts";

let channelReady = false;

/**
 * Create the EasyHome notification channel once per install.
 * Android 8+ (API 26+) requires a notification channel before notifications
 * can be posted with a custom importance/sound. Failures are non-fatal — the
 * channel falls back to the system default behaviour.
 */
export async function ensureEasyHomeChannel() {
  if (channelReady) return;
  try {
    const { channels } = await LocalNotifications.getChannels();
    const existing = (Array.isArray(channels) ? channels : []).find(
      (item) => item && item.id === CHANNEL_ID
    );
    if (!existing) {
      await LocalNotifications.createChannel({
        channel: {
          id: CHANNEL_ID,
          name: "EasyHome Alerts",
          description: "Booking alerts from EasyHome",
          importance: 3,
          vibration: true,
        },
      });
    }
    channelReady = true;
  } catch (error) {
    console.warn("[EasyHome] Notification channel setup skipped:", error);
    channelReady = true;
  }
}

/**
 * Post a native system tray notification immediately (works even when the
 * app is in the background, provided the runtime permission is granted).
 */
export async function showEasyHomeNotification({ id, title, body, data }) {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display && display !== "granted") {
      const status = await LocalNotifications.requestPermissions();
      if (status && status.display && status.display !== "granted") {
        return false;
      }
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          extra: data,
          interruptionLevel: "active",
        },
      ],
    });
    return true;
  } catch (error) {
    console.warn("[EasyHome] Local notification failed:", error);
    return false;
  }
}

/**
 * Map a realtime Socket.io booking event to a tray notification copy.
 * Returns null for events that should not trigger a tray notification.
 */
export function notificationForEvent(event, payload = {}) {
  switch (event) {
    case "newBooking":
      return {
        id: 90001,
        title: "New booking request",
        body:
          payload.service || payload.trade
            ? `New ${payload.service || payload.trade} booking${payload.city ? ` in ${payload.city}` : ""}`
            : "A customer has requested your help nearby.",
      };
    case "jobAccepted":
      return {
        id: 90002,
        title: "Job accepted",
        body: payload.status ? `Booking status: ${payload.status}` : "A professional accepted the job.",
      };
    case "bookingStatusUpdate":
      return {
        id: 90003,
        title: "Booking update",
        body: `Status: ${payload.status || "updated"}`,
      };
    case "updateWorkerDashboard":
      return {
        id: 90004,
        title: "Worker dashboard update",
        body: payload.message || "You have a new update.",
      };
    case "updateCustomerDashboard":
      return {
        id: 90005,
        title: "Booking update",
        body: payload.message || "Your booking has a new update.",
      };
    default:
      return null;
  }
}

/**
 * Fire the native tray notification for a realtime event (best effort).
 */
export async function notifyRealtimeEvent(event, payload) {
  const copy = notificationForEvent(event, payload);
  if (!copy) return false;
  return showEasyHomeNotification({ ...copy, data: { event, ...(payload || {}) } });
}
