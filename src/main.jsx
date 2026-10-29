import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import App from "./App.jsx";
import "./styles/app.css";

// Configure mobile APK native shell
if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
  document.documentElement.classList.add(
    "is-native",
    "is-mobile-app",
    `platform-${Capacitor.getPlatform()}`,
  );
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
