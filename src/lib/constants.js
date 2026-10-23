export const SERVICE_META = {
  cleaning: {
    name: "Home Cleaning",
    icon: "sparkles",
    from: 299,
    tint: "#ffe680",
    ink: "#7a5c00",
    blurb: "Deep cleans, kitchens, bathrooms and move-in refresh.",
  },
  plumbing: {
    name: "Plumbing",
    icon: "wrench",
    from: 199,
    tint: "#dbeafe",
    ink: "#1d4ed8",
    blurb: "Leaks, taps, tanks, pipelines and fittings.",
  },
  electrical: {
    name: "Electrical",
    icon: "zap",
    from: 199,
    tint: "#fef3c7",
    ink: "#b45309",
    blurb: "Wiring, fans, lights, switches and inverters.",
  },
  carpentry: {
    name: "Carpentry",
    icon: "hammer",
    from: 249,
    tint: "#fde7d7",
    ink: "#9a3412",
    blurb: "Doors, hinges, furniture repair and fittings.",
  },
  appliance: {
    name: "Appliance Repair",
    icon: "plug-zap",
    from: 299,
    tint: "#e0e7ff",
    ink: "#4338ca",
    blurb: "AC, fridge, washing machine and geyser.",
  },
  salon: {
    name: "Salon & Beauty",
    icon: "scissors",
    from: 299,
    tint: "#fce7f3",
    ink: "#be185d",
    blurb: "At-home haircuts, grooming and facials.",
  },
  painting: {
    name: "Painting",
    icon: "paintbrush",
    from: 499,
    tint: "#dcfce7",
    ink: "#15803d",
    blurb: "Room painting, touch-ups and waterproofing.",
  },
  pest: {
    name: "Pest Control",
    icon: "bug",
    from: 399,
    tint: "#ecfccb",
    ink: "#4d7c0f",
    blurb: "Cockroaches, termites, mosquitoes and rodents.",
  },
  moving: {
    name: "Packers & Movers",
    icon: "truck",
    from: 999,
    tint: "#ffedd5",
    ink: "#c2410c",
    blurb: "Local shifting, packing and safe transport.",
  },
  tutoring: {
    name: "Home Tutoring",
    icon: "graduation-cap",
    from: 349,
    tint: "#ede9fe",
    ink: "#6d28d9",
    blurb: "Verified tutors for school, maths and science.",
  },
};

export const SERVICE_KEYS = Object.keys(SERVICE_META);

export const FALLBACK_SERVICES = SERVICE_KEYS.map((key, index) => ({
  id: key,
  key,
  name: SERVICE_META[key].name,
  icon: SERVICE_META[key].icon,
  fromPrice: SERVICE_META[key].from,
  description: SERVICE_META[key].blurb,
  order: index + 1,
  active: true,
}));

// Mirrors the seeded cities so a cold/offline first launch still has a
// working location picker. Live Firestore documents always take precedence.
export const FALLBACK_CITIES = [
  { id: "indore", name: "Indore", lat: 22.7196, lng: 75.8577, radiusKm: 30 },
  { id: "bhopal", name: "Bhopal", lat: 23.2599, lng: 77.4126, radiusKm: 30 },
  { id: "ujjain", name: "Ujjain", lat: 23.1765, lng: 75.7885, radiusKm: 25 },
  { id: "dewas", name: "Dewas", lat: 22.9676, lng: 76.0534, radiusKm: 20 },
  { id: "jaipur", name: "Jaipur", lat: 26.9124, lng: 75.7873, radiusKm: 35 },
  { id: "pune", name: "Pune", lat: 18.5204, lng: 73.8567, radiusKm: 35 },
  { id: "mumbai", name: "Mumbai", lat: 19.076, lng: 72.8777, radiusKm: 35 },
  { id: "delhi", name: "Delhi", lat: 28.6139, lng: 77.209, radiusKm: 35 },
];

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
  { to: "/admin/catalog", label: "Catalogue", icon: "layers" },
  { to: "/admin/revenue", label: "Revenue", icon: "wallet" },
  { to: "/admin/promos", label: "Promos", icon: "megaphone" },
  { to: "/admin/chats", label: "Support", icon: "messages-square" },
  { to: "/admin/settings", label: "Settings", icon: "settings" },
];

export const STATUS_TABS = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];
