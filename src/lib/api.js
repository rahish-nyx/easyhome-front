export const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, { status = 0, code = "ERROR", details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let authGetter = null;

/** Injected once by AuthProvider to avoid a circular import. */
export function bindAuth(getter) {
  authGetter = getter;
}

async function authHeaders() {
  const user = authGetter?.();
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request(path, { method = "GET", body, form, timeout = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const headers = { ...(await authHeaders()) };

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
    throw new ApiError(
      navigator.onLine
        ? "We could not reach EasyHome. Please try again."
        : "You are offline. Your saved data is still available.",
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
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE}${path}`, { headers });
    if (!response.ok) {
      throw new ApiError("Could not load this file.", { status: response.status });
    }
    return URL.createObjectURL(await response.blob());
  },
};
