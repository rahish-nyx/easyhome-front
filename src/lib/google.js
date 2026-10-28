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
        callback: (response) => {
          if (response?.access_token) finish(resolve, response.access_token);
          else finish(reject, new Error("Google did not return an access token."));
        },
        error_callback: (googleError) => {
          const reason = googleError?.type || googleError?.message || "";
          finish(
            reject,
            new Error(
              reason === "popup_closed"
                ? "Google sign-in was closed before finishing."
                : "Google sign-in could not be completed.",
            ),
          );
        },
      });
      client.requestAccessToken({ prompt: "select_account" });
    } catch (error) {
      finish(reject, error);
    }
  });
}
