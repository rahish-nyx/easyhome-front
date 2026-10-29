import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export const PRODUCTION_API_URL = "https://easyhome-back.vercel.app/api";

function resolveApiBase(value) {
  const raw = String(value || "").trim();
  const isNative =
    typeof window !== "undefined" &&
    (Capacitor?.isNativePlatform?.() ||
      window.location.protocol === "capacitor:" ||
      window.location.protocol === "file:" ||
      window.location.hostname === "localhost");

  // When running inside native mobile APK or standalone shell
  if (isNative) {
    // If an explicit network IP (e.g. http://192.168.1.5:5000/api or 10.0.2.2:5000) was configured for local testing, use it
    if (raw && /^https?:\/\//i.test(raw) && !raw.includes("localhost") && !raw.includes("127.0.0.1")) {
      return raw.replace(/\/+$/, "");
    }
    // Never let Android APK try to call localhost/relative /api — always use production live backend
    return PRODUCTION_API_URL;
  }

  if (!raw) return "/api";
  // fetch() resolves a bare hostname against the app origin, so a value like
  // "api.example.com" silently calls the frontend instead of the API. Only
  // accept absolute URLs or root-relative paths, and fall back to the
  // same-origin proxy (see vercel.json) for anything else.
  if (!/^https?:\/\//i.test(raw) && !raw.startsWith("/")) return "/api";
  return raw.replace(/\/+$/, "");
}

export const API_BASE = resolveApiBase(import.meta.env.VITE_API_URL);

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
    const response = await fetch(`${API_BASE}/auth/refresh`, {
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
    const response = await fetch(`${API_BASE}${path}`, {
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
    const response = await fetch(`${API_BASE}${path}`, { headers });
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
