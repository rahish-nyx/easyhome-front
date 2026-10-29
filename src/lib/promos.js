import { inr } from "./format";

export const PROMO_SESSION_KEY = "easyhome:promo-code";

export function normalizePromoCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export function promoIsLive(promo, now = Date.now()) {
  if (!promo || promo.active === false) return false;
  const starts = promo.startsAt ? new Date(promo.startsAt).getTime() : 0;
  const ends = promo.endsAt ? new Date(promo.endsAt).getTime() : 0;
  if (Number.isFinite(starts) && starts > now) return false;
  if (Number.isFinite(ends) && ends > 0 && ends < now) return false;
  return true;
}

export function promoHasDiscount(promo) {
  if (!promo || promo.placement === "worker_dashboard") return false;
  const type = String(promo.discountType || "");
  const value = Number(promo.discountValue) || 0;
  return (
    Boolean(normalizePromoCode(promo.couponCode)) &&
    (type === "percentage" || type === "flat") &&
    value > 0
  );
}

export function promoAppliesToService(promo, service, folders = []) {
  if (!promo) return false;
  if (!service) return true;

  const targetService = String(promo.targetServiceId || "").trim();
  if (targetService) {
    const aliases = [service.id, service._id, service.key]
      .map((value) => String(value || ""))
      .filter(Boolean);
    if (!aliases.includes(targetService)) return false;
  }

  const targetFolder = String(promo.targetFolderId || "").trim();
  if (targetFolder) {
    const aliases = [service.folderId, service.folder]
      .map((value) => String(value || ""))
      .filter(Boolean);
    if (aliases.includes(targetFolder)) return true;

    const folder = (folders || []).find(
      (item) =>
        String(item.id || "") === targetFolder ||
        String(item.name || "") === targetFolder,
    );
    return Boolean(
      folder &&
        service.key &&
        Array.isArray(folder.serviceKeys) &&
        folder.serviceKeys.includes(service.key),
    );
  }

  return true;
}

export function calculatePromoDiscount(promo, basePrice) {
  const base = Math.max(0, Math.round(Number(basePrice) || 0));
  if (!promo || !base) return 0;
  const type = String(promo.discountType || "");
  const value = Math.max(0, Number(promo.discountValue) || 0);
  if (type === "percentage") {
    return Math.min(base, Math.round((base * Math.min(value, 100)) / 100));
  }
  if (type === "flat") {
    return Math.min(base, Math.round(value));
  }
  return 0;
}

export function promoDiscountShort(promo) {
  if (!promo) return "";
  const value = Math.max(0, Number(promo.discountValue) || 0);
  return promo.discountType === "percentage"
    ? `-${value}%`
    : `-${inr(value)}`;
}

export function promoDiscountLabel(promo) {
  if (!promo) return "";
  const value = Math.max(0, Number(promo.discountValue) || 0);
  return promo.discountType === "percentage"
    ? `${value}% off`
    : `${inr(value)} off`;
}

export function withPromoCode(path, code, parameter = "promo") {
  const normalized = normalizePromoCode(code);
  const value = String(path || "");
  if (!normalized || !value.startsWith("/")) return value;

  const url = new URL(value, "https://easyhome.local");
  if (url.searchParams.has("promo") || url.searchParams.has("code")) {
    return value;
  }
  url.searchParams.set(parameter, normalized);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function promoLink(promo) {
  const path = promo?.ctaLink || "/services";
  if (!promoHasDiscount(promo)) return path;
  const checkout = /^\/(?:book|checkout)(?:[/?#]|$)/i.test(path);
  return withPromoCode(path, promo.couponCode, checkout ? "code" : "promo");
}
