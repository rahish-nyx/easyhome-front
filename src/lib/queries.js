import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const ready = () => Boolean(db);

export const qServices = () =>
  ready() ? query(collection(db, "services"), orderBy("order", "asc")) : null;

export const qCities = () =>
  ready() ? query(collection(db, "cities"), orderBy("name", "asc")) : null;

export const qServiceZones = () =>
  ready() ? query(collection(db, "service_zones")) : null;

export const qPromos = () =>
  ready() ? query(collection(db, "promos"), orderBy("order", "asc")) : null;

export const qFooterLinks = () =>
  ready() ? query(collection(db, "footer_links")) : null;

export const appSettingsRef = () =>
  ready() ? doc(db, "settings", "app") : null;

export const qUrgent = (count = 12) =>
  ready()
    ? query(
        collection(db, "urgentPublic"),
        orderBy("createdAt", "desc"),
        limit(count),
      )
    : null;

export const qWorkers = (serviceKey = "", count = 12) => {
  if (!ready()) return null;
  const base = collection(db, "workersPublic");
  if (serviceKey) {
    return query(
      base,
      where("serviceKey", "==", serviceKey),
      orderBy("rating", "desc"),
      limit(count),
    );
  }
  return query(base, orderBy("rating", "desc"), limit(count));
};

export const qBookingsForCustomer = (uid) =>
  ready()
    ? query(
        collection(db, "bookings"),
        where("customerId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(60),
      )
    : null;

export const qBookingsForWorker = (uid) =>
  ready()
    ? query(
        collection(db, "bookings"),
        where("workerId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(80),
      )
    : null;

export const qJobFeed = (serviceKey, workerId, count = 30) =>
  ready() && serviceKey && workerId
    ? query(
        collection(db, "jobFeed"),
        where("serviceKey", "==", serviceKey),
        where("status", "==", "open"),
        where("workerId", "==", workerId),
        orderBy("createdAt", "desc"),
        limit(count),
      )
    : null;

export const qNotifications = (uid) =>
  ready()
    ? query(
        collection(db, "notifications"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(30),
      )
    : null;

export const qReviews = (workerId, count = 10) =>
  ready()
    ? query(
        collection(db, "reviews"),
        where("workerId", "==", workerId),
        orderBy("createdAt", "desc"),
        limit(count),
      )
    : null;

export const qChatMessages = (uid) =>
  ready() && uid
    ? query(
        collection(db, "chatThreads", uid, "messages"),
        orderBy("createdAt", "asc"),
        limit(150),
      )
    : null;

export const chatThreadRef = (uid) =>
  ready() && uid ? doc(db, "chatThreads", uid) : null;

export const qAdminChats = () =>
  ready()
    ? query(collection(db, "chatThreads"), orderBy("lastAt", "desc"), limit(60))
    : null;
