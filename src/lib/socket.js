import { io } from "socket.io-client";
import { notifyRealtimeEvent } from "./notifications";

const SOCKET_URL = String(import.meta.env.VITE_SOCKET_URL || "https://easyhome-back.vercel.app");
const SOCKET_PATH = String(import.meta.env.VITE_SOCKET_PATH || "/socket.io");

let socket = null;

/**
 * Shared Socket.io client for the EasyHome mobile apps.
 * The worker/customer dashboards subscribe to booking events and refetch
 * their live data when they arrive.
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("newBooking", (payload) => {
      window.dispatchEvent(new CustomEvent("easyhome:newBooking", { detail: payload }));
      notifyRealtimeEvent("newBooking", payload);
    });
    socket.on("jobAccepted", (payload) => {
      window.dispatchEvent(new CustomEvent("easyhome:jobAccepted", { detail: payload }));
      notifyRealtimeEvent("jobAccepted", payload);
    });
    socket.on("bookingStatusUpdate", (payload) => {
      window.dispatchEvent(new CustomEvent("easyhome:bookingStatusUpdate", { detail: payload }));
      notifyRealtimeEvent("bookingStatusUpdate", payload);
    });
    socket.on("updateWorkerDashboard", (payload) => {
      window.dispatchEvent(new CustomEvent("easyhome:updateWorkerDashboard", { detail: payload }));
      notifyRealtimeEvent("updateWorkerDashboard", payload);
    });
    socket.on("updateCustomerDashboard", (payload) => {
      window.dispatchEvent(new CustomEvent("easyhome:updateCustomerDashboard", { detail: payload }));
      notifyRealtimeEvent("updateCustomerDashboard", payload);
    });
  }
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

/**
 * Join the realtime rooms for the signed-in account (`user_<uid>`) and the
 * worker pool (`workers`) so booking events reach this device instantly.
 * Safe to call repeatedly — the server keeps room membership idempotent.
 */
export function joinRealtime(userId, role) {
  const socket = getSocket();
  if (!socket) return;
  const join = (id, r) =>
    socket.emit("join", { userId: id, role: r });
  if (socket.connected) {
    join(userId, role);
    return;
  }
  socket.once("connect", () => join(userId, role));
}
