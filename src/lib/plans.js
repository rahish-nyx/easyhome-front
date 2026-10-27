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
  cancellationMinutes: 7,
  proCancellationMinutes: 20,
};

export const DEFAULT_WORKER_RULES = {
  feesPct: 10,
  urgentFeePct: 10,
  cancellationMinutes: 7,
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
