import { WORK_CATEGORIES } from "./catalog";

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

// Mirrors the seeded cities so a cold/offline first launch still has a
// working State -> City -> Local Area picker. Live Firestore documents win.
export const FALLBACK_CITIES = [
  {
    id: "indore",
    name: "Indore",
    state: "Madhya Pradesh",
    lat: 22.7196,
    lng: 75.8577,
    radiusKm: 30,
    localAreas: ["Vijay Nagar", "Palasia", "Sapna Sangeeta", "Bhawarkuan", "Rau", "Mhow", "Annapurna", "Sudama Nagar", "Scheme 78", "Airport Road"],
  },
  {
    id: "bhopal",
    name: "Bhopal",
    state: "Madhya Pradesh",
    lat: 23.2599,
    lng: 77.4126,
    radiusKm: 30,
    localAreas: ["MP Nagar", "Arera Colony", "Kolar Road", "Habibganj", "Ayodhya Bypass", "Bairagarh", "Shahpura", "BHEL"],
  },
  {
    id: "ujjain",
    name: "Ujjain",
    state: "Madhya Pradesh",
    lat: 23.1765,
    lng: 75.7885,
    radiusKm: 25,
    localAreas: ["Freeganj", "Mahakal", "Nanakheda", "Ramghat", "Agar Road", "Dewas Gate"],
  },
  {
    id: "dewas",
    name: "Dewas",
    state: "Madhya Pradesh",
    lat: 22.9676,
    lng: 76.0534,
    radiusKm: 20,
    localAreas: ["Bank Colony", "Bhopal Road", "Ujjain Road", "Industrial Area"],
  },
  {
    id: "jaipur",
    name: "Jaipur",
    state: "Rajasthan",
    lat: 26.9124,
    lng: 75.7873,
    radiusKm: 35,
    localAreas: ["Malviya Nagar", "Vaishali Nagar", "C-Scheme", "Mansarovar", "Jagatpura", "Tonk Road", "Amer", "Sanganer"],
  },
  {
    id: "pune",
    name: "Pune",
    state: "Maharashtra",
    lat: 18.5204,
    lng: 73.8567,
    radiusKm: 35,
    localAreas: ["Koregaon Park", "Baner", "Hinjewadi", "Kothrud", "Viman Nagar", "Wakad", "Hadapsar", "Pimpri"],
  },
  {
    id: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    lat: 19.076,
    lng: 72.8777,
    radiusKm: 35,
    localAreas: ["Andheri", "Bandra", "Powai", "Borivali", "Dadar", "Thane", "Navi Mumbai", "Malad"],
  },
  {
    id: "nagpur",
    name: "Nagpur",
    state: "Maharashtra",
    lat: 21.1458,
    lng: 79.0882,
    radiusKm: 30,
    localAreas: ["Dharampeth", "Sadar", "Civil Lines", "Manish Nagar", "Wardha Road"],
  },
  {
    id: "delhi",
    name: "Delhi",
    state: "Delhi",
    lat: 28.6139,
    lng: 77.209,
    radiusKm: 35,
    localAreas: ["Saket", "Dwarka", "Rohini", "Lajpat Nagar", "Karol Bagh", "Mayur Vihar", "Vasant Kunj", "Pitampura"],
  },
  {
    id: "gurugram",
    name: "Gurugram",
    state: "Haryana",
    lat: 28.4595,
    lng: 77.0266,
    radiusKm: 30,
    localAreas: ["DLF Phase 3", "Sector 29", "Sohna Road", "Golf Course Road", "New Gurugram"],
  },
  {
    id: "noida",
    name: "Noida",
    state: "Uttar Pradesh",
    lat: 28.5355,
    lng: 77.391,
    radiusKm: 30,
    localAreas: ["Sector 18", "Sector 62", "Greater Noida", "Indirapuram", "Noida Extension"],
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    state: "Karnataka",
    lat: 12.9716,
    lng: 77.5946,
    radiusKm: 40,
    localAreas: ["Indiranagar", "Koramangala", "Whitefield", "HSR Layout", "Jayanagar", "Hebbal", "Electronic City", "Rajajinagar"],
  },
  {
    id: "mysuru",
    name: "Mysuru",
    state: "Karnataka",
    lat: 12.2958,
    lng: 76.6394,
    radiusKm: 25,
    localAreas: ["Vijayanagar", "Kuvempu Nagar", "Jayalakshmipuram", "Hebbal"],
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    state: "Telangana",
    lat: 17.385,
    lng: 78.4867,
    radiusKm: 40,
    localAreas: ["Gachibowli", "Madhapur", "Kondapur", "Banjara Hills", "Jubilee Hills", "Kukatpally", "Secunderabad", "LB Nagar"],
  },
  {
    id: "chennai",
    name: "Chennai",
    state: "Tamil Nadu",
    lat: 13.0827,
    lng: 80.2707,
    radiusKm: 35,
    localAreas: ["T. Nagar", "Adyar", "Velachery", "Anna Nagar", "OMR", "Porur", "Mylapore", "Tambaram"],
  },
  {
    id: "kolkata",
    name: "Kolkata",
    state: "West Bengal",
    lat: 22.5726,
    lng: 88.3639,
    radiusKm: 35,
    localAreas: ["Salt Lake", "New Town", "Ballygunge", "Park Street", "Howrah", "Garia", "Behala", "Dum Dum"],
  },
  {
    id: "ahmedabad",
    name: "Ahmedabad",
    state: "Gujarat",
    lat: 23.0225,
    lng: 72.5714,
    radiusKm: 35,
    localAreas: ["Navrangpura", "Satellite", "Bopal", "Maninagar", "Prahlad Nagar", "SG Highway", "Gandhinagar", "Vastrapur"],
  },
  {
    id: "lucknow",
    name: "Lucknow",
    state: "Uttar Pradesh",
    lat: 26.8467,
    lng: 80.9462,
    radiusKm: 30,
    localAreas: ["Gomti Nagar", "Hazratganj", "Aliganj", "Indira Nagar", "Alambagh", "Jankipuram", "Chinhat", "Aminabad"],
  },
  {
    id: "chandigarh",
    name: "Chandigarh",
    state: "Chandigarh",
    lat: 30.7333,
    lng: 76.7794,
    radiusKm: 25,
    localAreas: ["Sector 17", "Sector 22", "Sector 35", "Mohali", "Panchkula", "Zirakpur"],
  },
  {
    id: "kochi",
    name: "Kochi",
    state: "Kerala",
    lat: 9.9312,
    lng: 76.2673,
    radiusKm: 30,
    localAreas: ["Fort Kochi", "Kakkanad", "Edappally", "Vyttila", "Palarivattom", "Aluva"],
  },
  {
    id: "goa",
    name: "Goa",
    state: "Goa",
    lat: 15.2993,
    lng: 74.124,
    radiusKm: 40,
    localAreas: ["Panaji", "Calangute", "Margao", "Anjuna", "Candolim"],
  },
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
  { to: "/admin/zones", label: "Service zones", icon: "map-pin" },
  { to: "/admin/revenue", label: "Revenue", icon: "wallet" },
  { to: "/admin/promos", label: "Promos", icon: "megaphone" },
  { to: "/admin/broadcast", label: "Broadcast", icon: "send" },
  { to: "/admin/chats", label: "Support", icon: "messages-square" },
  { to: "/admin/settings", label: "Settings", icon: "settings" },
];

export const STATUS_TABS = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];
