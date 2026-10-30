import { Capacitor } from "@capacitor/core";

const SCRIPT_ID = "google-identity-services";

let scriptPromise = null;

function loadScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Google sign-in.")));
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("Could not load Google sign-in. Check your connection."));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Opens the Google account chooser and returns an OAuth access token that the
 * API verifies against Google's userinfo endpoint.
 *
 * Works in the browser and in the Capacitor WebView (which loads the hosted
 * frontend). Google blocks embedded WebViews for full OAuth redirects, but the
 * token popup is attempted anyway so the app can show a precise error instead
 * of silently disabling the button.
 */
export async function requestGoogleAccessToken() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw Object.assign(
      new Error("Google sign-in is not configured for this deployment yet."),
      { code: "GOOGLE_NOT_CONFIGURED" },
    );
  }

  await loadScript();

  const origin =
    typeof window !== "undefined" ? window.location.origin : "this app";

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    let client;
    try {
      client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        ux_mode: "popup",
        callback: (response) => {
          if (response?.access_token) {
            finish(resolve, response.access_token);
            return;
          }
          finish(
            reject,
            Object.assign(
              new Error(
                response?.error === "access_denied"
                  ? "Google sign-in was cancelled."
                  : "Google did not return an access token.",
              ),
              { code: response?.error || "GOOGLE_TOKEN_MISSING" },
            ),
          );
        },
        error_callback: (googleError) => {
          const reason = String(
            googleError?.type || googleError?.message || "",
          ).toLowerCase();
          let message = "Google sign-in could not be completed.";
          if (reason.includes("origin") || reason.includes("mismatch")) {
            message = `Google sign-in is not authorized for ${origin}. Add this exact origin under Google Cloud Console → APIs & Services → Credentials → OAuth client → Authorized JavaScript origins.`;
          } else if (reason.includes("popup")) {
            message =
              "Your browser blocked the Google sign-in window. Allow popups for EasyHome, or use email and password.";
          } else if (reason.includes("cancel") || reason.includes("closed")) {
            message = "Google sign-in was closed before finishing.";
          }
          finish(
            reject,
            Object.assign(new Error(message), {
              code: reason || "GOOGLE_POPUP_FAILED",
            }),
          );
        },
      });
      client.requestAccessToken({ prompt: "select_account" });
    } catch (error) {
      finish(
        reject,
        Object.assign(
          new Error(
            Capacitor.isNativePlatform()
              ? "Google sign-in is unavailable in this app build. Use email and password, or open EasyHome in Chrome."
              : "Google sign-in could not be started.",
          ),
          { code: "GOOGLE_START_FAILED", cause: error },
        ),
      );
    }
  });
}
