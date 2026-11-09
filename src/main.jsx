import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import App from "./App.jsx";
import "./styles/app.css";

// Configure mobile APK native shell
if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
  const appMode =
    import.meta.env?.VITE_APP_MODE ||
    (document.documentElement.classList.contains("app-worker")
      ? "worker"
      : document.documentElement.classList.contains("app-customer")
        ? "customer"
        : "customer");
  document.documentElement.classList.add("is-native", "is-mobile-app", `platform-${Capacitor.getPlatform()}`);
  if (appMode === "worker") {
    // Pro Worker APK: force the professional console context.
    document.documentElement.classList.add("app-worker");
  } else if (appMode === "customer") {
    // Customer APK: force the customer context (hides worker login paths).
    document.documentElement.classList.add("app-customer");
  }
  try {
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: "#ffffff" }).catch(() => {});
  } catch (err) {
    console.warn("[EasyHome] StatusBar init error:", err);
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Only reload for a genuine update, never for the first install.
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[EasyHome] Service worker registration failed:", error);
    });
  });
}
