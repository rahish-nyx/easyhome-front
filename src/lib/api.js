import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export const PRODUCTION_API_URL = "https://easyhome-back.vercel.app/api";
const API_OVERRIDE_KEY = "easyhome:apiBase";

function isNativeShell() {
  if (typeof window === "undefined") return false;
  return Boolean(
    Capacitor?.isNativePlatform?.() ||
      window.location.protocol === "capacitor:" ||
      window.location.protocol === "file:",
  );
}

function readApiOverride() {
  if (typeof window === "undefined") return "";
  try {
    const stored = window.localStorage.getItem(API_OVERRIDE_KEY) || "";
    if (stored) return stored;
  } catch {
    /* storage can be blocked */
  }
  return String(window.__EASYHOME_API_BASE__ || "");
}

function normalizeBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function resolveApiBase(value) {
  const raw = normalizeBase(value);
  const override = normalizeBase(readApiOverride());
  const native = isNativeShell();

  // A runtime override is how the Android app points at a LAN development
  // server without rebuilding: localStorage.setItem("easyhome:apiBase",
  // "http://192.168.1.20:5000/api").
  if (override && /^https?:\/\//i.test(override)) return override;

  if (native) {
    // An explicit non-loopback absolute URL (LAN IP or production) wins.
    if (raw && /^https?:\/\//i.test(raw) && !/localhost|127\.0\.0\.1/i.test(raw)) {
      return raw;
    }
    // A relative /api in the native shell would resolve against the WebView
    // origin (https://localhost), so always use the production API instead.
    return PRODUCTION_API_URL;
  }

  // Browser: use the configured absolute URL, a root-relative proxy, or the
  // Vite/Vercel same-origin proxy. Bare hostnames are not valid fetch bases.
  if (!raw) return "/api";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return "/api";
}

export function getApiBase() {
  return resolveApiBase(import.meta.env.VITE_API_URL);
}

export function setApiBaseOverride(value) {
  if (typeof window === "undefined") return getApiBase();
  try {
    const next = normalizeBase(value);
    if (next) window.localStorage.setItem(API_OVERRIDE_KEY, next);
    else window.localStorage.removeItem(API_OVERRIDE_KEY);
  } catch {
    /* storage can be blocked */
  }
  return getApiBase();
}

export const API_BASE = getApiBase();

const TOKEN_KEY = "easyhome:token";

function readStoredToken() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

let accessToken = readStoredToken();

// Asynchronously hydrate from native Android Preferences if localStorage was wiped
if (typeof window !== "undefined" && !accessToken && Capacitor?.isNativePlatform?.()) {
  Preferences.get({ key: TOKEN_KEY })
    .then(({ value }) => {
      if (value && !accessToken) {
        accessToken = value;
        try {
          window.localStorage.setItem(TOKEN_KEY, value);
        } catch {
          /* ignore */
        }
      }
    })
    .catch(() => {});
}

export function getToken() {
  return accessToken;
}

export function setToken(token) {
  accessToken = String(token || "");
  if (typeof window === "undefined") return;
  try {
    if (accessToken) window.localStorage.setItem(TOKEN_KEY, accessToken);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* Storage can be unavailable in private mode. */
  }
  if (Capacitor?.isNativePlatform?.()) {
    if (accessToken) {
      Preferences.set({ key: TOKEN_KEY, value: accessToken }).catch(() => {});
    } else {
      Preferences.remove({ key: TOKEN_KEY }).catch(() => {});
    }
  }
}

export function clearToken() {
  setToken("");
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = "ERROR", details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function authHeaders() {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function refreshAccessToken() {
  if (!accessToken) return false;
  try {
    const response = await fetch(`${getApiBase()}/auth/refresh`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) return false;
    const data = await response.json().catch(() => null);
    if (!data?.token) return false;
    setToken(data.token);
    return true;
  } catch {
    return false;
  }
}

async function request(
  path,
  { method = "GET", body, form, timeout = 20000, retry = true } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const headers = authHeaders();

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${getApiBase()}${path}`, {
      method,
      headers,
      body: payload,
      signal: controller.signal,
    });

    if (response.status === 204) return null;

    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    const data = isJson ? await response.json() : null;

    if (response.status === 401 && retry && path !== "/auth/refresh") {
      if (await refreshAccessToken()) {
        clearTimeout(timer);
        return request(path, { method, body, form, timeout, retry: false });
      }
      setToken("");
    }

    if (!response.ok) {
      throw new ApiError(data?.error || `Request failed (${response.status})`, {
        status: response.status,
        code: data?.code || "REQUEST_FAILED",
        details: data?.details,
      });
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError("The request took too long. Check your connection and try again.", {
        code: "TIMEOUT",
      });
    }
    if (error instanceof ApiError) throw error;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    throw new ApiError(
      offline
        ? "You are offline. Your saved data is still available."
        : "We could not reach EasyHome. Please try again.",
      { code: "NETWORK" },
    );
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  del: (path, body, options) => request(path, { ...options, method: "DELETE", body }),
  upload: (path, form, options) => request(path, { ...options, method: "POST", form }),
  uploadPatch: (path, form, options) => request(path, { ...options, method: "PATCH", form }),

  /** Fetch a protected binary (e.g. KYC) and return an object URL. */
  async blob(path) {
    const headers = authHeaders();
    const response = await fetch(`${getApiBase()}${path}`, { headers });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new ApiError(data?.error || "Could not load this file.", {
        status: response.status,
        code: data?.code || "BLOB_FAILED",
      });
    }
    return URL.createObjectURL(await response.blob());
  },
};
