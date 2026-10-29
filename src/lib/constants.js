import { WORK_CATEGORIES } from "./catalog";
import { DEFAULT_CUSTOMER_RULES, DEFAULT_WORKER_RULES } from "./plans";

const CATALOG_TINTS = [
  ["#ffe680", "#7a5c00"],
  ["#dbeafe", "#1d4ed8"],
  ["#fef3c7", "#b45309"],
  ["#fde7d7", "#9a3412"],
  ["#e0e7ff", "#4338ca"],
  ["#fce7f3", "#be185d"],
  ["#dcfce7", "#15803d"],
  ["#ecfccb", "#4d7c0f"],
  ["#ffedd5", "#c2410c"],
  ["#ede9fe", "#6d28d9"],
  ["#cffafe", "#0e7490"],
  ["#fae8ff", "#a21caf"],
];

export const SERVICE_META = Object.fromEntries(
  WORK_CATEGORIES.map((item, index) => {
    const [tint, ink] = CATALOG_TINTS[index % CATALOG_TINTS.length];
    return [
      item.key,
      {
        name: item.name,
        icon: item.icon,
        from: item.fromPrice,
        tint,
        ink,
        blurb: item.description,
      },
    ];
  }),
);

// Legacy bookings and seeded documents may still use the old "pest" key.
SERVICE_META.pest = {
  ...SERVICE_META["pest-control"],
  name: "Pest Control",
};

export const SERVICE_KEYS = Object.keys(SERVICE_META);

export const FALLBACK_SERVICES = WORK_CATEGORIES.map((item, index) => ({
  id: item.key,
  key: item.key,
  name: item.name,
  icon: item.icon,
  fromPrice: item.fromPrice,
  description: item.description,
  order: index + 1,
  active: true,
}));

// Default promo campaigns used on first paint or when the server has no promos configured yet.
export const DEFAULT_PROMOS = [
  {
    id: "promo-welcome",
    title: "Flat ₹100 Off Your First Service",
    subtitle: "Use code WELCOME100 on cleaning, repairs or installations.",
    kicker: "Welcome Offer",
    ctaText: "Book now",
    ctaLink: "/services",
    couponCode: "WELCOME100",
    discountType: "flat",
    discountValue: 100,
    theme: "yellow",
    active: true,
    order: 1,
    placement: "customer_home",
  },
  {
    id: "promo-pro-membership",
    title: "EasyHome Pro Membership",
    subtitle: "Get priority pro dispatch and zero urgent-job surcharges starting at ₹199/mo.",
    kicker: "Membership",
    ctaText: "Explore Pro",
    ctaLink: "/subscription",
    theme: "dark",
    active: true,
    order: 2,
    placement: "customer_home",
  },
  {
    id: "promo-seasonal-care",
    title: "Seasonal Deep Clean & AC Service",
    subtitle: "Verified experts at transparent fixed rates. Pay only after the job is done.",
    kicker: "Trending Services",
    ctaText: "View services",
    ctaLink: "/services",
    theme: "blue",
    active: true,
    order: 3,
    placement: "customer_home",
  },
  {
    id: "promo-worker-join",
    title: "Are you a skilled technician?",
    subtitle: "Join EasyHome Pro, get verified, and receive direct jobs with transparent payouts.",
    kicker: "Work With Us",
    ctaText: "Apply now",
    ctaLink: "/auth?role=worker",
    theme: "blue",
    active: true,
    order: 1,
    placement: "worker_dashboard",
  },
];

// Default footer structure. The admin console can override or deactivate these
// records; this copy is used for the first paint and whenever the API is
// unreachable, so the storefront never renders an empty footer.
export const DEFAULT_FOOTER_LINKS = [
  { id: "footer-about", label: "About us", href: "/legal/about", group: "company", order: 1, active: true },
  { id: "footer-faq", label: "FAQ", href: "/faq", group: "support", order: 1, active: true },
  { id: "footer-terms", label: "Terms and Conditions", href: "/legal/terms", group: "legal", order: 1, active: true },
  { id: "footer-privacy", label: "Privacy policy", href: "/legal/privacy", group: "legal", order: 2, active: true },
  { id: "footer-refunds", label: "Refund & cancellation policy", href: "/legal/refunds", group: "legal", order: 3, active: true },
  { id: "footer-disclaimer", label: "Disclaimer", href: "/legal/disclaimer", group: "legal", order: 4, active: true },
  { id: "footer-support", label: "Help & support", href: "/chat", group: "support", order: 2, active: true },
  { id: "footer-refer", label: "Refer & Earn", href: "/refer", group: "support", order: 3, active: true },
  { id: "footer-become-pro", label: "Become a pro", href: "/auth?role=worker", group: "professionals", order: 1, active: true },
  { id: "footer-worker", label: "Worker dashboard", href: "/worker", group: "professionals", order: 2, active: true },
  { id: "footer-membership", label: "EasyHome Pro", href: "/subscription", group: "professionals", order: 3, active: true },
];

// Business defaults used when the settings document is missing or offline.
export const DEFAULT_SETTINGS = {
  commissionPct: 10,
  subscriptionPrice: 199,
  customerPlans: { monthly: 199, quarterly: 537, yearly: 1910 },
  workerPlans: { monthly: 250, quarterly: 675, yearly: 2400 },
  customerRules: { ...DEFAULT_CUSTOMER_RULES },
  workerRules: { ...DEFAULT_WORKER_RULES },
  customerBenefits: [
    "Active priority worker matching",
    "No 10% urgent-job extra charge",
    "24A-7 priority support",
    "Free cancellation for 20 minutes (7 for non-Pro)",
    "Verified Pro badge",
  ],
  workerBenefits: [
    "0% fees on every job",
    "Priority job feed",
    "Verified Pro badge",
    "Weekly payout support",
  ],
};

export const STATUS_META = {
  pending: {
    label: "Finding a pro",
    tone: "amber",
    hint: "We are matching you with verified workers nearby.",
  },
  accepted: {
    label: "Worker assigned",
    tone: "blue",
    hint: "Confirm the final price to unlock contact details.",
  },
  ongoing: {
    label: "In progress",
    tone: "blue",
    hint: "Your pro is on the job.",
  },
  completed: {
    label: "Completed",
    tone: "green",
    hint: "Confirm payment and rate your pro.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "red",
    hint: "This booking was cancelled.",
  },
};

export const TRACKING_PHASES = [
  { id: "assigned", label: "Assigned", short: "Assigned" },
  { id: "en_route", label: "En route", short: "En route" },
  { id: "arrived", label: "Arrived", short: "Arrived" },
  { id: "working", label: "Work in progress", short: "Working" },
  { id: "completed", label: "Completed", short: "Completed" },
];

export const TRACKING_META = {
  requested: { label: "Requested", tone: "amber", hint: "Waiting for a professional to accept." },
  assigned: { label: "Assigned", tone: "blue", hint: "A professional has accepted your job." },
  en_route: { label: "En route", tone: "blue", hint: "Your professional is on the way." },
  arrived: { label: "Arrived", tone: "blue", hint: "Your professional has reached the location." },
  working: { label: "Work in progress", tone: "blue", hint: "The job is in progress." },
  completed: { label: "Completed", tone: "green", hint: "The job is complete." },
  cancelled: { label: "Cancelled", tone: "red", hint: "This job was cancelled." },
};

export const INACTIVITY_MS = 10 * 60 * 1000;

export function trackingMeta(phase, status = "") {
  return (
    TRACKING_META[phase] ||
    STATUS_META[status] || {
      label: status || "Pending",
      tone: "amber",
      hint: "",
    }
  );
}

export function trackingIndex(phase) {
  const index = TRACKING_PHASES.findIndex((item) => item.id === phase);
  return index < 0 ? 0 : index;
}

export const URGENCY = {
  normal: { label: "Normal", hint: "Within 24 hours" },
  urgent: { label: "Urgent", hint: "As soon as possible" },
};

export const PLANS = [
  {
    id: "monthly",
    label: "Monthly",
    months: 1,
    discount: 0,
    badge: "",
    blurb: "Try Pro, cancel anytime.",
  },
  {
    id: "quarterly",
    label: "Quarterly",
    months: 3,
    discount: 0.1,
    badge: "Save 10%",
    blurb: "Best for regular bookings.",
  },
  {
    id: "yearly",
    label: "Yearly",
    months: 12,
    discount: 0.2,
    badge: "Save 20%",
    blurb: "Lowest price per month.",
  },
];

export const ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: "layout-dashboard", end: true },
  { to: "/admin/approvals", label: "Approvals", icon: "shield-check" },
  { to: "/admin/users", label: "Users", icon: "users" },
  { to: "/admin/bookings", label: "Bookings", icon: "calendar-check" },
  { to: "/admin/tracking", label: "Live tracking", icon: "navigation" },
  { to: "/admin/catalog", label: "Catalogue", icon: "layers" },
  { to: "/admin/home-folders", label: "Home folders", icon: "home" },
  { to: "/admin/zones", label: "Service zones", icon: "map-pin" },
  { to: "/admin/revenue", label: "Revenue", icon: "wallet" },
  { to: "/admin/promos", label: "Promos", icon: "megaphone" },
  { to: "/admin/footer", label: "Footer links", icon: "link" },
  { to: "/admin/broadcast", label: "Broadcast", icon: "send" },
  { to: "/admin/chats", label: "Support", icon: "messages-square" },
  { to: "/admin/referrals", label: "Referrals", icon: "gift" },
  { to: "/admin/settings", label: "Settings", icon: "settings" },
];

export const STATUS_TABS = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];
