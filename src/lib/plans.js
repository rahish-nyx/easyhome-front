export const PLAN_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };

export const DEFAULT_CUSTOMER_PLANS = {
  monthly: 199,
  quarterly: 537,
  yearly: 1910,
};

export const DEFAULT_WORKER_PLANS = {
  monthly: 250,
  quarterly: 675,
  yearly: 2400,
};

export const DEFAULT_CUSTOMER_RULES = {
  urgentFeePct: 10,
  cancellationMinutes: 5,
  proCancellationMinutes: 5,
};

export const DEFAULT_WORKER_RULES = {
  feesPct: 10,
  urgentFeePct: 10,
  cancellationMinutes: 5,
};

function planPrice(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.round(number);
}

export function normalisePlanGroup(group, fallbackMonthly) {
  const monthly = planPrice(group?.monthly, fallbackMonthly);
  return {
    monthly,
    quarterly: planPrice(group?.quarterly, Math.round(monthly * 3 * 0.9)),
    yearly: planPrice(group?.yearly, Math.round(monthly * 12 * 0.8)),
  };
}

export function rolePlans(settings, role) {
  const isWorker = role === "worker";
  const monthlyFallback = isWorker
    ? DEFAULT_WORKER_PLANS.monthly
    : Number(settings?.subscriptionPrice) || DEFAULT_CUSTOMER_PLANS.monthly;
  return normalisePlanGroup(
    isWorker ? settings?.workerPlans : settings?.customerPlans,
    monthlyFallback,
  );
}

export function subscriptionAmount(settings, role, plan) {
  const plans = rolePlans(settings, role);
  return plans[plan] ?? plans.monthly;
}

function planPromoWindowOpen(promo, now = Date.now()) {
  const starts = promo?.startsAt ? new Date(promo.startsAt).getTime() : 0;
  const ends = promo?.endsAt ? new Date(promo.endsAt).getTime() : 0;
  if (Number.isFinite(starts) && starts > now) return false;
  if (Number.isFinite(ends) && ends > 0 && ends < now) return false;
  return true;
}

/**
 * Resolves an active admin-configured promotional discount for a membership plan.
 * Returns null when no promo is active for the plan or when it is outside its offer window.
 */
export function planPromo(settings, role, plan) {
  const promos =
    role === "worker"
      ? settings?.workerPlanPromos
      : settings?.customerPlanPromos;
  const promo = promos?.[plan];
  if (
    !promo ||
    promo.active !== true ||
    !planPromoWindowOpen(promo)
  ) {
    return null;
  }
  return { type: promo.type, value: Number(promo.value) || 0 };
}

/**
 * Returns { base, price, promo } for a role/plan, applying the active promo when
 * one exists. Mirrors the server-side `subscriptionPriceWithPromo`.
 */
export function planPriceWithPromo(settings, role, plan) {
  const plans = rolePlans(settings, role);
  const base = Number(plans[plan] ?? plans.monthly) || 0;
  const promos =
    role === "worker"
      ? settings?.workerPlanPromos
      : settings?.customerPlanPromos;
  const promo = planPromo(settings, role, plan);
  const rawPromo = promos?.[plan];
  if (!promo) return { base, price: base, promo: null };
  let price = base;
  if (promo.type === "percentage") {
    price = Math.round((base * (100 - Math.min(100, promo.value))) / 100);
  } else if (promo.type === "flat") {
    price = Math.max(0, Math.round(promo.value));
  }
  price = Math.max(0, price);
  return {
    base,
    price,
    promo: rawPromo
      ? {
          ...rawPromo,
          type: promo.type,
          value: promo.value,
          saved: Math.max(0, base - price),
        }
      : { ...promo, saved: Math.max(0, base - price) },
  };
}

export function workerFeePct(settings) {
  const value = Number(settings?.workerRules?.feesPct ?? settings?.commissionPct);
  return Number.isFinite(value) ? value : 0;
}

export function customerRules(settings) {
  return { ...DEFAULT_CUSTOMER_RULES, ...(settings?.customerRules || {}) };
}

export function workerRules(settings) {
  return {
    ...DEFAULT_WORKER_RULES,
    feesPct: workerFeePct(settings),
    ...(settings?.workerRules || {}),
  };
}
