const STORAGE_KEY = "easyhome.referral";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_PATTERN = /^[A-Za-z0-9]{6,12}$/;

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !CODE_PATTERN.test(parsed.code || "")) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - Number(parsed.at || 0) > MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Remember a friend's code from `?ref=CODE` until the visitor signs up. */
export function captureReferral(search = "") {
  try {
    const params = new URLSearchParams(search);
    const code = (params.get("ref") || "").trim();
    if (!CODE_PATTERN.test(code)) return "";
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code: code.toUpperCase(), at: Date.now() }),
    );
    return code.toUpperCase();
  } catch {
    return "";
  }
}

export function pendingReferralCode() {
  return readStored()?.code || "";
}

/** Save a code typed by the customer at sign-up, with the same 30-day TTL. */
export function storeReferralCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return "";
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code, at: Date.now() }),
    );
    return code;
  } catch {
    return "";
  }
}

export function clearReferralCode() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private browsing; referral capture is optional.
  }
}
