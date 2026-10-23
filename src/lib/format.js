const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function inr(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "₹0";
  return inrFormatter.format(number);
}

export function compactInr(value) {
  const number = Number(value) || 0;
  if (number >= 10000000) return `₹${(number / 10000000).toFixed(1)}Cr`;
  if (number >= 100000) return `₹${(number / 100000).toFixed(1)}L`;
  if (number >= 1000) return `₹${(number / 1000).toFixed(1)}k`;
  return `₹${Math.round(number)}`;
}

export function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function formatDate(value, options = {}) {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: options.year === false ? undefined : "numeric",
  });
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(value) {
  const date = toDate(value);
  if (!date) return "";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.round(seconds / 86400)}d ago`;
  return formatDate(date);
}

export function clockTime(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function daysLeft(value) {
  const date = toDate(value);
  if (!date) return 0;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}

export function isActiveUntil(value) {
  const date = toDate(value);
  return Boolean(date && date.getTime() > Date.now());
}

export function planLabel(plan) {
  if (plan === "quarterly") return "Quarterly Pro";
  if (plan === "yearly") return "Yearly Pro";
  if (plan === "monthly") return "Monthly Pro";
  return "Free";
}

export function maskPhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 2)}••••${digits.slice(-4)}`;
}

export function truncate(text = "", length = 120) {
  const value = String(text);
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

export function cx(...values) {
  return values.filter(Boolean).join(" ");
}

export function percent(value, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}
