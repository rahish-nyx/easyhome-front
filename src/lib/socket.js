import { io } from "socket.io-client";

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
    });
    socket.on("jobAccepted", (payload) => {
      window.dispatchEvent(new CustomEvent("easyhome:jobAccepted", { detail: payload }));
    });
    socket.on("bookingStatusUpdate", (payload) => {
      window.dispatchEvent(new CustomEvent("easyhome:bookingStatusUpdate", { detail: payload }));
    });
    socket.on("updateWorkerDashboard", (payload) => {
      window.dispatchEvent(new CustomEvent("easyhome:updateWorkerDashboard", { detail: payload }));
    });
    socket.on("updateCustomerDashboard", (payload) => {
      window.dispatchEvent(new CustomEvent("easyhome:updateCustomerDashboard", { detail: payload }));
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
