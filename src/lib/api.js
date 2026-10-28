function resolveApiBase(value) {
  const raw = String(value || "").trim();
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
