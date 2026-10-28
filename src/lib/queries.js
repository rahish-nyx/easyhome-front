/**
 * Lightweight REST descriptors used by `useLiveQuery`/`useLiveDoc`.
 *
 * The app no longer keeps an open Firestore listener per collection. Each
 * descriptor is a plain object: `{ key, path, select }` where `path` is an API
 * route and `select` optionally names the array/property to read from the
 * JSON response.
 */
export const liveQuery = (path, select = "") =>
  path ? { key: `${select || "data"}:${path}`, path, select } : null;

export const liveDoc = (path, select = "") =>
  path ? { key: `doc:${select || ""}:${path}`, path, select } : null;

export const qServices = () => liveQuery("/public/bootstrap", "services");
export const qCities = () => liveQuery("/public/bootstrap", "cities");
export const qServiceZones = () => liveQuery("/public/bootstrap", "zones");
export const qPromos = () => liveQuery("/public/bootstrap", "promos");
export const qFooterLinks = () => liveQuery("/public/bootstrap", "footerLinks");
export const appSettingsRef = () => liveDoc("/public/bootstrap", "settings");

export const qUrgent = () => liveQuery("/urgent", "jobs");

export const qWorkers = (serviceKey = "", count = 12) => {
  const params = new URLSearchParams();
  if (serviceKey) params.set("serviceKey", serviceKey);
  params.set("limit", String(count));
  return liveQuery(`/workers?${params.toString()}`, "workers");
};

export const qBookingsForCustomer = (uid) =>
  uid ? liveQuery("/bookings", "bookings") : null;

export const qBookingsForWorker = (uid) =>
  uid ? liveQuery("/worker/bookings", "bookings") : null;

export const qJobFeed = (serviceKey, workerId) => {
  if (!workerId) return null;
  const params = new URLSearchParams();
  if (serviceKey) params.set("serviceKey", serviceKey);
  return liveQuery(`/worker/job-feed?${params.toString()}`, "jobs");
};

export const qNotifications = (uid) =>
  uid ? liveQuery("/notifications", "notifications") : null;

export const qReviews = (workerId) =>
  workerId ? liveQuery(`/workers/${encodeURIComponent(workerId)}`, "reviews") : null;

export const qChatMessages = (uid) =>
  uid ? liveQuery("/chat/messages", "messages") : null;

export const chatThreadRef = (uid) =>
  uid ? liveDoc(`/chat/thread`, "thread") : null;

export const qAdminChats = () => liveQuery("/admin/chats", "chats");

export const bookingRef = (id) =>
  id ? liveDoc(`/bookings/${encodeURIComponent(id)}`, "booking") : null;

export const publicWorkerRef = (id) =>
  id ? liveDoc(`/workers/${encodeURIComponent(id)}`, "worker") : null;
