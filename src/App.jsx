import { useState, useEffect, useRef } from "react";
import "./App.css";

import Hero from "./components/Hero";
import Services from "./components/Services";
import UrgentJobs from "./components/UrgentJobs";
import WorkersList from "./components/WorkersList";
import HowItWorks from "./components/HowItWorks";
import BottomNav from "./components/BottomNav";
import AuthPage from "./components/AuthPage";
import ProfilePage from "./components/ProfilePage";
import NotificationBell from "./components/NotificationBell";
import CitySelector from "./components/CitySelector";
import AdminPanel from "./components/AdminPanel";
import ChatPage from "./components/ChatPage";
import RatingStars from "./components/RatingStars";
import InstallPrompt from "./components/InstallPrompt";
import SearchResults from "./components/SearchResults";
import SubscriptionPage from "./components/SubscriptionPage";
import EasyHomeLogo from "./components/EasyHomeLogo";
import { Hand, MapPin, PhoneCall, User } from "lucide-react";

const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://easyhome-back.onrender.com";

const DEFAULT_SERVICES = [
  { name: "Plumber", icon: "🔧" },
  { name: "Electrician", icon: "⚡" },
  { name: "Tutor", icon: "📚" },
  { name: "Cleaner", icon: "🧹" },
  { name: "AC Repair", icon: "❄️" },
  { name: "Carpenter", icon: "🔨" },
];

function mediaSrc(value) {
  if (!value) return "";
  if (value.startsWith("data:") || value.startsWith("http")) return value;
  if (value.startsWith("/uploads/")) return `${API}${value}`;
  return `${API}/uploads/${value}`;
}

if (
  typeof document !== "undefined" &&
  !document.getElementById("eh-logo-css")
) {
  const s = document.createElement("style");
  s.id = "eh-logo-css";
  s.textContent = `
    @keyframes logo-float {
      0%,100% { transform: translateY(0) rotate(0deg); }
      40%      { transform: translateY(-4px) rotate(-6deg); }
      70%      { transform: translateY(-2px) rotate(4deg); }
    }
    @keyframes logo-shine {
      0%,60%  { opacity:0; transform:translateX(-100%); }
      75%     { opacity:1; }
      100%    { opacity:0; transform:translateX(200%); }
    }
  `;
  document.head.appendChild(s);
}

function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
}

// ══════════════════════════════════════════════════════════
// ✅ GEOFENCE GATE — shown once on app open to check area
// ══════════════════════════════════════════════════════════
function GeofenceGate({ onAllowed }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  function checkLocation() {
    setChecking(true);
    setError("");
    if (!navigator.geolocation) {
      setError(
        "GPS not supported on this device. Please use a different device.",
      );
      setChecking(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`${API}/check-service-area`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });
          const data = await res.json();
          if (data.allowed) {
            onAllowed({
              lat: latitude,
              lng: longitude,
              city: data.city || "Your Area",
            });
          } else {
            setError(
              data.message ||
                "EasyHome is not available in your area yet. We are expanding soon!",
            );
          }
        } catch {
          setError(
            "Cannot verify your service area right now. Please try again.",
          );
        }
        setChecking(false);
      },
      () => {
        setError(
          "Could not detect your location. Please enable GPS and try again.",
        );
        setChecking(false);
      },
      { timeout: 10000 },
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#fff8f0,#fff)",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <div
          style={{
            width: "80px",
            height: "80px",
            background: "linear-gradient(135deg,#ff7a18,#ff4500)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 8px 24px rgba(255,69,0,0.3)",
          }}
        >
          <span style={{ fontSize: "36px" }}>📍</span>
        </div>
        <h2
          style={{
            fontWeight: 900,
            fontSize: "clamp(20px,4vw,26px)",
            margin: "0 0 10px",
            color: "#1a1a1a",
          }}
        >
          Easy<span style={{ color: "#ff4500" }}>Home</span>
        </h2>
        <p
          style={{
            color: "#555",
            fontSize: "15px",
            margin: "0 0 8px",
            fontWeight: 600,
          }}
        >
          Home Services Near You
        </p>
        <p
          style={{
            color: "#888",
            fontSize: "13px",
            margin: "0 0 28px",
            lineHeight: 1.6,
          }}
        >
          We need your location to check if EasyHome services are available in
          your area.
        </p>
        {error && (
          <div
            style={{
              background: "#ffe6e6",
              border: "1px solid #ffb3b3",
              borderRadius: "12px",
              padding: "14px 16px",
              marginBottom: "20px",
              textAlign: "left",
            }}
          >
            <p
              style={{
                color: "#c62828",
                fontSize: "13px",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              ⛔ {error}
            </p>
          </div>
        )}
        <button
          onClick={checkLocation}
          disabled={checking}
          style={{
            width: "100%",
            padding: "15px",
            background: checking
              ? "#ccc"
              : "linear-gradient(135deg,#ff7a18,#ff4500)",
            color: "white",
            border: "none",
            borderRadius: "14px",
            cursor: checking ? "default" : "pointer",
            fontWeight: 800,
            fontSize: "16px",
            boxShadow: checking ? "none" : "0 6px 20px rgba(255,69,0,0.35)",
            fontFamily: "inherit",
          }}
        >
          {checking ? "Checking your location..." : "📡 Check My Location"}
        </button>
        <p
          style={{
            color: "#ccc",
            fontSize: "11px",
            marginTop: "16px",
            lineHeight: 1.6,
          }}
        >
          Your location is only used to verify service availability. It is not
          stored.
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COMMISSION PAYMENT
// ══════════════════════════════════════════════════════════
function CommissionPayment({ job, adminUpi, qrCodeUrl, onDone }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commStatus, setCommStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${API}/commission/${job._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setCommStatus(d))
      .catch(() => {});
  }, [job._id]);

  async function submitPayment() {
    if (!note.trim()) {
      alert("Please enter your Transaction ID or payment note");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/commission/paid/${job._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ screenshotNote: note }),
      });
      if (res.ok) {
        setCommStatus({ status: "paid" });
        onDone?.();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    navigator.clipboard?.writeText(adminUpi).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const commission = job.commission || 0;
  if (commStatus?.status === "approved") return null;

  return (
    <div
      style={{
        background: "linear-gradient(135deg,#fff3e0,#ffe8cc)",
        border: "2px solid #ff9800",
        borderRadius: "14px",
        padding: "16px",
        marginTop: "12px",
        animation: "fadeInUp 0.4s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h5 style={{ color: "#e65100", margin: 0 }}>⚠️ Commission Due</h5>
        <span style={{ fontWeight: "900", color: "#e65100", fontSize: "20px" }}>
          ₹{commission}
        </span>
      </div>
      {commStatus?.status === "paid" ? (
        <div
          style={{
            textAlign: "center",
            padding: "12px",
            background: "#e8f5e9",
            borderRadius: "10px",
          }}
        >
          <p
            style={{
              color: "#2e7d32",
              fontWeight: "bold",
              margin: 0,
              fontSize: "13px",
            }}
          >
            ✅ Payment submitted — awaiting admin approval
          </p>
          <p style={{ color: "#888", fontSize: "11px", marginTop: "4px" }}>
            You can accept new jobs once approved
          </p>
        </div>
      ) : (
        <>
          {qrCodeUrl && (
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <img
                src={mediaSrc(qrCodeUrl)}
                alt="Payment QR"
                style={{
                  width: "clamp(120px,30vw,150px)",
                  height: "clamp(120px,30vw,150px)",
                  borderRadius: "10px",
                  border: "2px solid #ff9800",
                }}
              />
              <p style={{ fontSize: "11px", color: "#888", marginTop: "6px" }}>
                Scan to pay
              </p>
            </div>
          )}
          <div
            style={{
              background: "white",
              borderRadius: "10px",
              padding: "12px",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
              border: "1px solid #ffd0a0",
            }}
          >
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: "10px", color: "#aaa", margin: "0 0 2px" }}>
                Pay to UPI
              </p>
              <p
                style={{
                  fontWeight: "700",
                  color: "#ff4500",
                  fontSize: "clamp(13px,3.5vw,15px)",
                  margin: 0,
                  wordBreak: "break-all",
                }}
              >
                {adminUpi}
              </p>
            </div>
            <button
              onClick={handleCopy}
              style={{
                background: copied
                  ? "linear-gradient(135deg,#28a745,#20c053)"
                  : "linear-gradient(135deg,#ff7a18,#ff4500)",
                color: "white",
                border: "none",
                padding: "7px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "700",
                flexShrink: 0,
                transition: "all 0.25s",
              }}
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fff8f0",
              borderRadius: "8px",
              padding: "10px 12px",
              marginBottom: "10px",
              border: "1px solid #ffd0a0",
            }}
          >
            <span style={{ fontSize: "13px", color: "#666" }}>
              10% Commission
            </span>
            <span
              style={{ fontWeight: "900", color: "#e65100", fontSize: "18px" }}
            >
              ₹{commission}
            </span>
          </div>
          <input
            placeholder="Transaction ID or payment note *required"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ marginBottom: "10px" }}
          />
          <button
            onClick={submitPayment}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px",
              background: submitting
                ? "#ccc"
                : "linear-gradient(135deg,#ff9800,#e65100)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: submitting ? "default" : "pointer",
              fontWeight: "700",
              fontSize: "14px",
            }}
          >
            {submitting ? "Submitting..." : "✅ I Have Paid Commission"}
          </button>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("home");
  const [heroSearch, setHeroSearch] = useState("");
  const searchInputRef = useRef(null);

  // ✅ No first-screen location gate
  const [locationVerified, setLocationVerified] = useState(true);

  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const userName = localStorage.getItem("userName");
    return token ? { role, name: userName } : null;
  });
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [urgentJobs, setUrgentJobs] = useState([]);
  const [urgentWorkers, setUrgentWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [mySub, setMySub] = useState(null);
  const [userCity, setUserCity] = useState(() => {
    const saved = localStorage.getItem("userCity");
    return saved ? JSON.parse(saved) : null;
  });

  // ✅ When geofence passes — save location and mark verified
  function handleLocationAllowed(locationData) {
    sessionStorage.setItem("locationVerified", "true");
    setLocationVerified(true);
    if (!userCity && locationData) {
      const city = {
        name: locationData.city || "Your Area",
        lat: locationData.lat,
        lng: locationData.lng,
      };
      setUserCity(city);
      localStorage.setItem("userCity", JSON.stringify(city));
    }
  }

  // Location gate removed from first landing page
  // if (!locationVerified) {
  //   return <GeofenceGate onAllowed={handleLocationAllowed} />;
  // }

  function focusHeroSearch() {
    setPage("home");
    setHeroSearch("");
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 120);
  }

  function requireLogin(action) {
    if (user) {
      action();
    } else {
      setPendingAction(() => action);
      setShowLoginPopup(true);
    }
  }

  function handleLogin(role, name, id) {
    setUser({ role, name });
    localStorage.setItem("role", role);
    localStorage.setItem("userName", name);
    if (id) {
      localStorage.setItem("workerId", id);
      localStorage.setItem("customerId", id);
    }
    setShowLoginPopup(false);
    if (pendingAction) {
      setTimeout(() => {
        pendingAction();
        setPendingAction(null);
      }, 100);
      return;
    }
    if (role === "worker") setPage("worker");
    else setPage("home");
  }

  function handleLogout() {
    localStorage.clear();
    setUser(null);
    setPage("home");
    setMySub(null);
  }
  function handleNameUpdate(newName) {
    setUser((p) => ({ ...p, name: newName }));
    localStorage.setItem("userName", newName);
  }
  function handleCitySet(city) {
    setUserCity(city);
    localStorage.setItem("userCity", JSON.stringify(city));
  }
  function handleBookWorker(worker) {
    requireLogin(() => {
      setSelectedWorker(worker);
      setPage("booking");
    });
  }

  function handleAcceptUrgentJob(job) {
    requireLogin(() => {
      authFetch(`${API}/bookings`)
        .then((r) => r.json())
        .then(async (all) => {
          const match = all.find(
            (b) =>
              b.description === job.title &&
              b.location === job.location &&
              b.status === "pending",
          );
          if (match) {
            const token = localStorage.getItem("token");
            await fetch(`${API}/booking/${match._id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({}),
            });
            alert("Urgent Job Accepted ✅");
            fetchBookings();
            fetchUrgentJobs();
          } else {
            alert("Job no longer available ❌");
          }
        })
        .catch(() => alert("Something went wrong ❌"));
    });
  }

  const fetchBookings = () =>
    authFetch(`${API}/bookings`)
      .then((r) => r.json())
      .then((d) => setBookings(Array.isArray(d) ? d : []))
      .catch(() => setBookings([]));
  const fetchServices = () =>
    fetch(`${API}/services`)
      .then((r) => r.json())
      .then((d) => setServices(Array.isArray(d) ? d : DEFAULT_SERVICES))
      .catch(() => setServices(DEFAULT_SERVICES));
  const fetchWorkers = () =>
    fetch(`${API}/workers`)
      .then((r) => r.json())
      .then((d) => setWorkers(Array.isArray(d) ? d : []))
      .catch(() => setWorkers([]));
  const fetchUrgentJobs = () =>
    fetch(`${API}/urgent`)
      .then((r) => r.json())
      .then((d) => setUrgentJobs(Array.isArray(d) ? d : []))
      .catch(() => setUrgentJobs([]));
  const fetchUrgentWorkers = () =>
    fetch(`${API}/urgent-workers`)
      .then((r) => r.json())
      .then((d) => setUrgentWorkers(Array.isArray(d) ? d : []))
      .catch(() => setUrgentWorkers([]));

  function loadMySub() {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API}/subscription/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setMySub)
      .catch(() => {});
  }

  useEffect(() => {
    fetchServices();
    fetchWorkers();
    fetchUrgentJobs();
    fetchUrgentWorkers();
    if (user) {
      fetchBookings();
      loadMySub();
    }
  }, [user]);

  const navProps = {
    role: user?.role,
    onSearchClick: focusHeroSearch,
    setPage: (p) => {
      if (p === "admin") {
        setPage("admin");
        return;
      }
      if (
        (p === "booking" ||
          p === "profile" ||
          p === "worker" ||
          p === "chat" ||
          p === "subscription") &&
        !user
      ) {
        setShowLoginPopup(true);
      } else {
        setPage(p);
      }
    },
  };

  if (page === "admin") return <AdminPanel />;

  if (page === "subscription" && user)
    return (
      <>
        <SubscriptionPage user={user} onBack={() => setPage("home")} />
        <BottomNav {...navProps} />
      </>
    );

  if (page === "chat" && user)
    return (
      <>
        <ChatPage user={user} />
        <BottomNav {...navProps} />
      </>
    );

  if (page === "booking" && user)
    return (
      <Booking
        goBack={() => {
          setSelectedWorker(null);
          setPage("home");
        }}
        refresh={fetchBookings}
        prefilledWorker={selectedWorker}
        userCity={userCity}
      />
    );

  if (page === "worker" && user)
    return (
      <>
        <Worker
          goBack={() => setPage("home")}
          refresh={fetchBookings}
          user={user}
          userCity={userCity}
        />
        <BottomNav {...navProps} />
      </>
    );

  if (page === "profile" && user)
    return (
      <>
        <ProfilePage
          user={user}
          onLogout={handleLogout}
          onNameUpdate={handleNameUpdate}
        />
        <BottomNav {...navProps} />
      </>
    );

  return (
    <>
      <Home
        goToBooking={() => requireLogin(() => setPage("booking"))}
        bookings={bookings}
        services={services}
        workers={workers}
        urgentJobs={urgentJobs}
        urgentWorkers={urgentWorkers}
        user={user}
        onLogout={handleLogout}
        onBookWorker={handleBookWorker}
        onAcceptUrgentJob={handleAcceptUrgentJob}
        onLoginClick={() => setShowLoginPopup(true)}
        userCity={userCity}
        onCitySet={handleCitySet}
        heroSearch={heroSearch}
        onHeroSearch={setHeroSearch}
        mySub={mySub}
        onGoToSubscription={() => requireLogin(() => setPage("subscription"))}
        fetchBookings={fetchBookings}
        searchInputRef={searchInputRef}
      />
      <BottomNav {...navProps} />
      <InstallPrompt />
      {showLoginPopup && (
        <div className="modal-overlay" onClick={() => setShowLoginPopup(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowLoginPopup(false)}
              style={{
                position: "absolute",
                top: "14px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#888",
              }}
            >
              ✕
            </button>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "40px" }}>👋</span>
              <h3 style={{ marginTop: "8px" }}>Login to Continue</h3>
              <p style={{ color: "#888", fontSize: "13px" }}>
                Create an account or login to book services
              </p>
            </div>
            <AuthPage onLogin={handleLogin} isPopup={true} />
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════════════════
function Home({
  goToBooking,
  bookings,
  services,
  workers,
  urgentJobs,
  urgentWorkers,
  user,
  onLogout,
  onBookWorker,
  onAcceptUrgentJob,
  onLoginClick,
  userCity,
  onCitySet,
  heroSearch,
  onHeroSearch,
  mySub,
  onGoToSubscription,
  fetchBookings,
  searchInputRef,
}) {
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [hiddenBookings, setHiddenBookings] = useState([]);
  const filteredBookings = bookings.filter(
    (b) => !hiddenBookings.includes(b._id),
  );
  const visibleBookings = showAllBookings
    ? filteredBookings
    : filteredBookings.slice(0, 3);
  const isSubActive = mySub?.status === "active";
  function hideBooking(id) {
    setHiddenBookings((p) => [...p, id]);
  }

  return (
    <div className="container">
      {/* ─── HEADER ─── */}
      <div className="user-header">
        {user ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(8px,1.5vw,12px)",
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <EasyHomeLogo compact />
              <div
                style={{
                  width: "1px",
                  height: "28px",
                  background: "#e8e8e8",
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "clamp(12px,1.4vw,15px)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <Hand
                    size={16}
                    style={{ marginBottom: "-2px" }}
                    color="#ff4500"
                  />{" "}
                  Hey, <strong>{user.name}</strong>
                  {isSubActive && (
                    <span
                      style={{
                        marginLeft: "6px",
                        fontSize: "clamp(9px,1vw,11px)",
                        background: "linear-gradient(135deg,#ffd700,#ff9500)",
                        color: "white",
                        padding: "2px 7px",
                        borderRadius: "20px",
                        fontWeight: "bold",
                      }}
                    >
                      👑 Premium
                    </span>
                  )}
                </p>
                <CitySelector currentCity={userCity} onCitySet={onCitySet} />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: "clamp(6px,1.2vw,10px)",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <NotificationBell user={user} />
              <button
                onClick={onGoToSubscription}
                style={{
                  background: isSubActive
                    ? "linear-gradient(135deg,#ffd700,#ff9500)"
                    : "linear-gradient(135deg,#ff7a18,#ff3c00)",
                  color: "white",
                  border: "none",
                  padding: "clamp(6px,1vw,9px) clamp(10px,1.5vw,14px)",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "clamp(10px,1.1vw,13px)",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                  boxShadow: isSubActive
                    ? "0 2px 8px rgba(255,165,0,0.4)"
                    : "0 2px 8px rgba(255,60,0,0.3)",
                  transition: "all 0.22s",
                }}
              >
                {isSubActive ? "👑 Premium" : "💳 Subscribe"}
              </button>
              <button className="logout-btn" onClick={onLogout}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(8px,1.5vw,14px)",
              }}
            >
              <EasyHomeLogo />
              <CitySelector currentCity={userCity} onCitySet={onCitySet} />
            </div>
            <div
              style={{
                display: "flex",
                gap: "clamp(6px,1.2vw,10px)",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <button
                onClick={onLoginClick}
                style={{
                  background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
                  color: "white",
                  border: "none",
                  padding: "clamp(7px,1.1vw,10px) clamp(10px,1.5vw,14px)",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "clamp(10px,1.1vw,13px)",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                }}
              >
                💳 Subscribe
              </button>
              <button
                className="btn primary"
                style={{
                  width: "auto",
                  padding: "clamp(7px,1.1vw,10px) clamp(14px,2vw,18px)",
                  marginTop: 0,
                  fontSize: "clamp(12px,1.3vw,14px)",
                  whiteSpace: "nowrap",
                }}
                onClick={onLoginClick}
              >
                Login
              </button>
            </div>
          </>
        )}
      </div>

      <Hero
        onSearch={onHeroSearch}
        searchQuery={heroSearch}
        searchInputRef={searchInputRef}
      />

      {heroSearch && (
        <SearchResults
          query={heroSearch}
          workers={workers}
          services={services}
          onBookWorker={onBookWorker}
          onSelectService={() => {
            onHeroSearch("");
            goToBooking();
          }}
          user={user}
        />
      )}

      {!heroSearch && (
        <>
          <Services data={services} onSelect={goToBooking} />
          <UrgentJobs
            data={urgentJobs}
            urgentWorkers={urgentWorkers}
            onPost={goToBooking}
            role={user?.role}
            onBookWorker={onBookWorker}
            onAcceptJob={onAcceptUrgentJob}
          />
          <WorkersList
            data={workers}
            role={user?.role}
            onBookWorker={onBookWorker}
            userCity={userCity}
          />
          <HowItWorks />
        </>
      )}

      {user && filteredBookings.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
            }}
          >
            <h3 className="section-title" style={{ marginTop: 0 }}>
              {user.role === "customer" ? "Your Bookings" : "Matching Jobs"}
            </h3>
            {filteredBookings.length > 3 && (
              <span
                onClick={() => setShowAllBookings((p) => !p)}
                style={{
                  color: "#ff7a18",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {showAllBookings
                  ? "Show Less ▲"
                  : `See All (${filteredBookings.length}) ▼`}
              </span>
            )}
          </div>
          {visibleBookings.map((b) => (
            <BookingCard
              key={b._id}
              b={b}
              user={user}
              hideBooking={hideBooking}
              fetchBookings={fetchBookings}
            />
          ))}
          {!showAllBookings && filteredBookings.length > 3 && (
            <p
              onClick={() => setShowAllBookings(true)}
              style={{
                textAlign: "center",
                color: "#ff7a18",
                cursor: "pointer",
                fontSize: "13px",
                marginTop: "8px",
              }}
            >
              +{filteredBookings.length - 3} more — tap to see all
            </p>
          )}
        </>
      )}

      {!user && (
        <div className="guest-cta">
          <h3>Ready to book a service?</h3>
          <p>Join thousands of happy customers</p>
          <button
            className="btn"
            style={{
              background: "white",
              color: "#ff3c00",
              width: "auto",
              padding: "10px 28px",
              marginTop: 0,
            }}
            onClick={onLoginClick}
          >
            Get Started 🚀
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// BOOKING CARD
// ══════════════════════════════════════════════════════════
function BookingCard({ b, user, hideBooking, fetchBookings }) {
  const [customerOffer, setCustomerOffer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [offerSubmitted, setOfferSubmitted] = useState(!!b.customerSetPrice);
  const token = localStorage.getItem("token");

  async function submitOffer() {
    if (!customerOffer || Number(customerOffer) < 1) {
      alert("Enter valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/booking/${b._id}/customer-offer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ price: Number(customerOffer) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      setOfferSubmitted(true);
      fetchBookings();
    } catch {
      alert("Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="glass-card" style={{ position: "relative" }}>
      <button className="card-close-btn" onClick={() => hideBooking(b._id)}>
        ✕
      </button>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4>{b.service}</h4>
        <span className={`status ${b.status}`}>{b.status}</span>
      </div>
      <p style={{ margin: "6px 0" }}>{b.description}</p>
      <div
        style={{
          background: b.finalPriceConfirmed ? "#f0fff4" : "#fff8f0",
          borderRadius: "12px",
          padding: "12px",
          margin: "8px 0",
          border: `1px solid ${b.finalPriceConfirmed ? "#b2f5c8" : "#ffd0a0"}`,
        }}
      >
        {b.finalPriceConfirmed ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "11px",
                  color: "green",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                ✅ Final Price
              </p>
              <p style={{ fontSize: "10px", color: "#888", margin: "2px 0 0" }}>
                Confirmed by Worker
              </p>
            </div>
            <span
              style={{ fontWeight: "bold", color: "#ff3c00", fontSize: "20px" }}
            >
              ₹{b.confirmedPrice}
            </span>
          </div>
        ) : b.workerSetPrice ? (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#ff7a18",
                  fontWeight: "600",
                }}
              >
                ⏳ Worker's Price
              </span>
              <span
                style={{
                  fontWeight: "bold",
                  color: "#ff3c00",
                  fontSize: "16px",
                }}
              >
                ₹{b.workerSetPrice}
              </span>
            </div>
            {offerSubmitted ? (
              <div
                style={{
                  background: "#f0f8ff",
                  borderRadius: "8px",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "12px", color: "#007bff", margin: 0 }}>
                  💬 Your offer: ₹{b.customerSetPrice || customerOffer} —
                  Waiting for worker
                </p>
              </div>
            ) : (
              <div>
                <p
                  style={{ fontSize: "11px", color: "#888", margin: "0 0 6px" }}
                >
                  Counter-offer (once only):
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="number"
                    value={customerOffer}
                    onChange={(e) => setCustomerOffer(e.target.value)}
                    placeholder="₹ Your offer"
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      fontSize: "13px",
                      margin: 0,
                    }}
                  />
                  <button
                    onClick={submitOffer}
                    disabled={submitting}
                    style={{
                      padding: "8px 14px",
                      background: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "13px",
                    }}
                  >
                    {submitting ? "..." : "Offer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>
                Estimated Price
              </p>
              <p style={{ fontSize: "10px", color: "#aaa", margin: "2px 0 0" }}>
                Worker will confirm final
              </p>
            </div>
            <span
              style={{ fontWeight: "bold", color: "#ff3c00", fontSize: "18px" }}
            >
              ₹{b.finalPrice}
            </span>
          </div>
        )}
      </div>
      <p style={{ margin: "4px 0" }}>
        ⚡ {b.urgency === "urgent" ? "Urgent 🚨" : "Normal"}
      </p>
      <p style={{ margin: "4px 0" }}>📍 {b.location}</p>
      {b.worker && <p style={{ margin: "4px 0" }}>✅ Worker: {b.worker}</p>}
      {b.image && (
        <img
          src={mediaSrc(b.image)}
          className="job-img"
          alt="booking"
        />
      )}
      {b.status === "completed" && b.workerId && user?.role === "customer" && (
        <RatingStars booking={b} user={user} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// BOOKING FORM
// ══════════════════════════════════════════════════════════
function Booking({ goBack, refresh, prefilledWorker, userCity }) {
  const MIN_WORK_PRICE = 200;
  const [desc, setDesc] = useState("");
  const [service, setService] = useState(prefilledWorker?.service || "");
  const [location, setLocation] = useState(userCity?.name || "");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  // ✅ min 200, renamed to pricePerWork
  const [pricePerWork, setPricePerWork] = useState(
    Math.max(MIN_WORK_PRICE, prefilledWorker?.pricePerHour || MIN_WORK_PRICE),
  );
  const [urgency, setUrgency] = useState("normal");
  const [loading, setLoading] = useState(false);

  // ✅ Location required — track if set
  const [locationSet, setLocationSet] = useState(!!userCity?.name);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [manualLocInput, setManualLocInput] = useState("");

  function handleImage(e) {
    const file = e.target.files[0];
    setImage(file);
    if (file) setPreview(URL.createObjectURL(file));
  }

  function detectMyLocation() {
    setDetectingLoc(true);
    if (!navigator.geolocation) {
      alert("GPS not supported");
      setDetectingLoc(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const locName = userCity?.name || "My Current Location";
        setLocation(locName);
        if (!userCity?.lat || !userCity?.lng) {
          localStorage.setItem(
            "userCity",
            JSON.stringify({
              name: locName,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          );
        }
        setLocationSet(true);
        setDetectingLoc(false);
      },
      () => {
        alert("Could not detect location. Please type it manually.");
        setDetectingLoc(false);
      },
    );
  }

  function handleManualLocation(val) {
    setManualLocInput(val);
    setLocation(val);
    if (val.length > 2) setLocationSet(true);
    else setLocationSet(false);
  }

  function handleSubmit() {
    if (!locationSet || !location) {
      alert("Please set your location first 📍");
      return;
    }

    if (!desc || !service || !phone) {
      alert("Please fill all fields ❌");
      return;
    }

    const price = Number(pricePerWork);
    if (!Number.isFinite(price) || price < MIN_WORK_PRICE) {
      alert(`Minimum price per work is ₹${MIN_WORK_PRICE}`);
      setPricePerWork(MIN_WORK_PRICE);
      return;
    }

    const submitBooking = (lat, lng) => {
      const formData = new FormData();
      formData.append("description", desc);
      formData.append("service", service);
      formData.append("location", location);
      formData.append("phone", phone);
      formData.append("pricePerHour", price);
      formData.append("urgency", urgency);

      if (image) formData.append("image", image);
      if (lat !== null && lng !== null) {
        formData.append("lat", lat);
        formData.append("lng", lng);
      }

      const token = localStorage.getItem("token");
      setLoading(true);

      fetch(`${API}/booking`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            alert(data.error);
            return;
          }

          alert("Service Booked ✅");
          refresh();
          goBack();
        })
        .catch(() => alert("Booking Failed ❌"))
        .finally(() => setLoading(false));
    };

    if (userCity?.lat && userCity?.lng) {
      submitBooking(Number(userCity.lat), Number(userCity.lng));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        submitBooking(position.coords.latitude, position.coords.longitude),
      () => submitBooking(null, null),
    );
  }
  // ✅ per work pricing
  const estimatedPrice =
    urgency === "urgent"
      ? Math.round(Number(pricePerWork) * 1.1)
      : Number(pricePerWork);

  return (
    <div className="container">
      <button
        className="btn dark"
        onClick={goBack}
        style={{ width: "auto", padding: "9px 18px" }}
      >
        ⬅ Back
      </button>
      <h2 style={{ marginTop: "16px" }}>Book a Service</h2>

      {/* ✅ Location section — required before booking */}
      {locationSet ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "12px",
            background: "#f0fff4",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #b2f5c8",
          }}
        >
          <MapPin size={16} color="green" />
          <p
            style={{
              fontSize: "13px",
              color: "green",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            {location} — Location set ✅
          </p>
          <button
            onClick={() => {
              setLocationSet(false);
              setLocation("");
              setManualLocInput("");
            }}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <div
          style={{
            background: "#fff8f0",
            border: "1.5px solid #ffd0a0",
            borderRadius: "12px",
            padding: "14px 16px",
            marginTop: "12px",
          }}
        >
          <p
            style={{
              fontWeight: "700",
              color: "#e65100",
              margin: "0 0 6px",
              fontSize: "14px",
            }}
          >
            📍 Location Required
          </p>
          <p
            style={{
              color: "#888",
              fontSize: "12px",
              margin: "0 0 10px",
              lineHeight: 1.6,
            }}
          >
            Set your location before booking so the worker knows where to come.
          </p>
          <button
            onClick={detectMyLocation}
            disabled={detectingLoc}
            style={{
              width: "100%",
              padding: "10px",
              background: detectingLoc
                ? "#ccc"
                : "linear-gradient(135deg,#ff7a18,#ff4500)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: detectingLoc ? "default" : "pointer",
              fontWeight: "700",
              fontSize: "13px",
              fontFamily: "inherit",
              marginBottom: "8px",
            }}
          >
            {detectingLoc ? "Detecting..." : "📡 Detect My Location"}
          </button>
          <input
            placeholder="Or type your area / neighbourhood"
            value={manualLocInput}
            onChange={(e) => handleManualLocation(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              fontSize: "13px",
              fontFamily: "inherit",
              boxSizing: "border-box",
              margin: 0,
            }}
          />
        </div>
      )}

      {prefilledWorker && (
        <div className="prefilled-banner">
          <div
            className="modal-avatar"
            style={{ width: "36px", height: "36px", fontSize: "13px" }}
          >
            {prefilledWorker.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: "bold", fontSize: "13px", margin: 0 }}>
              {prefilledWorker.name}
            </p>
            {/* ✅ per work label */}
            <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>
              {prefilledWorker.service} • ₹{prefilledWorker.pricePerHour}/work
            </p>
          </div>
        </div>
      )}

      <input type="file" accept="image/*" onChange={handleImage} />
      {preview && <img src={preview} className="preview-img" alt="preview" />}
      <textarea
        placeholder="Describe your problem..."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <select value={service} onChange={(e) => setService(e.target.value)}>
        <option value="">Select Service</option>
        <option>Plumber</option>
        <option>Electrician</option>
        <option>Tutor</option>
        <option>Cleaner</option>
        <option>AC Repair</option>
        <option>Carpenter</option>
      </select>
      <input
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      {/* ✅ Min 200, per work */}
      <input
        type="number"
        value={pricePerWork}
        min={MIN_WORK_PRICE}
        onBlur={() => {
          const price = Number(pricePerWork);
          if (!Number.isFinite(price) || price < MIN_WORK_PRICE) {
            setPricePerWork(MIN_WORK_PRICE);
          }
        }}
        onChange={(e) => setPricePerWork(e.target.value)}
        placeholder={`Your budget per work (₹ min ${MIN_WORK_PRICE})`}
      />

      <div style={{ marginTop: "12px", display: "flex", gap: "10px" }}>
        {["normal", "urgent"].map((u) => (
          <label
            key={u}
            className={`urgency-option ${urgency === u ? "selected" : ""}`}
            onClick={() => setUrgency(u)}
          >
            {u === "urgent" ? "🚨 Urgent (+10%)" : "🕐 Normal"}
          </label>
        ))}
      </div>
      <div
        style={{
          background: "#fff8f0",
          borderRadius: "12px",
          padding: "14px",
          marginTop: "12px",
          border: "1px solid #ffd0a0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "13px", color: "#888" }}>
            Your Estimated Budget
          </span>
          {/* ✅ per work — no /hr */}
          <span
            style={{ fontWeight: "bold", fontSize: "20px", color: "#ff3c00" }}
          >
            ₹{estimatedPrice}
          </span>
        </div>
        <p style={{ fontSize: "11px", color: "#aaa", margin: "6px 0 0" }}>
          ⚡ Worker sets the final price after accepting — you can counter-offer
          once
        </p>
      </div>
      <button className="btn success" onClick={handleSubmit} disabled={loading}>
        {loading ? "Booking..." : "Book Now ✅"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// WORKER PANEL
// ══════════════════════════════════════════════════════════
function Worker({ goBack, refresh, user, userCity }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentPopup, setPaymentPopup] = useState(null);
  const [workerUpi, setWorkerUpi] = useState("");
  const [isWorkerSubscribed, setIsWorkerSubscribed] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [hiddenJobs, setHiddenJobs] = useState([]);
  const [adminUpi, setAdminUpi] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  // ✅ Worker location state
  const [workerLocation, setWorkerLocation] = useState(userCity);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [showLocPrompt, setShowLocPrompt] = useState(!userCity);

  useEffect(() => {
    loadJobs();
    loadWorkerProfile();
    fetch(`${API}/settings`)
      .then((r) => r.json())
      .then((d) => {
        setAdminUpi(d.adminUpi || "");
        setQrCodeUrl(d.qrCodeUrl || "");
      })
      .catch(() => {});
  }, []);

  function loadJobs() {
    const token = localStorage.getItem("token");
    fetch(`${API}/bookings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setJobs(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }
  function loadWorkerProfile() {
    const token = localStorage.getItem("token");
    fetch(`${API}/worker/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setWorkerUpi(data.upiId || "");
        setIsWorkerSubscribed(
          data.isSubscribed && new Date(data.subscriptionEnd) > new Date(),
        );
        localStorage.setItem("workerService", data.service || "");
        // If worker already has lat/lng saved, mark location as set
        if (data.lat && data.lng) {
          setWorkerLocation({
            name: data.location || "Set",
            lat: data.lat,
            lng: data.lng,
          });
          setShowLocPrompt(false);
        }
      });
  }
  function updateJobState(id, updates) {
    setJobs((p) => p.map((j) => (j._id === id ? { ...j, ...updates } : j)));
  }
  function hideJob(id) {
    setHiddenJobs((p) => [...p, id]);
  }

  // ✅ Detect worker location and save to profile
  function detectWorkerLocation() {
    setDetectingLoc(true);
    if (!navigator.geolocation) {
      alert("GPS not supported");
      setDetectingLoc(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          name: userCity?.name || "My Location",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setWorkerLocation(loc);
        setShowLocPrompt(false);
        setDetectingLoc(false);
        // Save lat/lng to worker profile
        const token = localStorage.getItem("token");
        fetch(`${API}/worker/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        }).catch(() => {});
      },
      () => {
        alert("Could not detect location. Please enable GPS.");
        setDetectingLoc(false);
      },
    );
  }

  async function acceptJob(id) {
    // ✅ Must have location set before accepting
    if (!workerLocation) {
      setShowLocPrompt(true);
      alert("Please set your location before accepting jobs 📍");
      return;
    }
    const token = localStorage.getItem("token");
    if (!isWorkerSubscribed) {
      const checkRes = await fetch(`${API}/worker/can-accept`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const checkData = await checkRes.json();
      if (!checkData.canAccept) {
        alert(
          "❌ You have a pending commission payment.\n\nPay your 10% commission first to accept new jobs.\n\nGo to your Completed jobs section to pay.",
        );
        return;
      }
    }
    fetch(`${API}/booking/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    }).then(() => {
      updateJobState(id, { status: "accepted", worker: user.name });
      refresh();
    });
  }

  function startJob(id) {
    const token = localStorage.getItem("token");
    fetch(`${API}/booking/${id}/start`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }).then(() => updateJobState(id, { status: "ongoing" }));
  }
  function completeJob(id) {
    const token = localStorage.getItem("token");
    fetch(`${API}/booking/${id}/complete`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }).then(() => {
      updateJobState(id, { status: "completed" });
      const job = jobs.find((j) => j._id === id);
      setPaymentPopup({ ...job, status: "completed" });
    });
  }
  function markPayment(id, paymentMode) {
    const token = localStorage.getItem("token");
    fetch(`${API}/booking/${id}/payment`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentMode }),
    }).then(() => {
      updateJobState(id, { paymentDone: true, paymentMode });
      setPaymentPopup(null);
      alert("Payment Received ✅");
      refresh();
      loadJobs();
    });
  }

  const visibleJobs = jobs.filter((j) => !hiddenJobs.includes(j._id));
  const pendingJobs = visibleJobs.filter((j) => j.status === "pending");
  const acceptedJobs = visibleJobs.filter((j) => j.status === "accepted");
  const ongoingJobs = visibleJobs.filter((j) => j.status === "ongoing");
  const allCompleted = visibleJobs.filter((j) => j.status === "completed");
  const completedJobs = showAllCompleted
    ? allCompleted
    : allCompleted.slice(0, 3);

  function JobCard({ job, showPhone }) {
    const [editingPrice, setEditingPrice] = useState(false);
    const [newPrice, setNewPrice] = useState(
      job.workerSetPrice || job.finalPrice || "",
    );
    const [saving, setSaving] = useState(false);
    const token = localStorage.getItem("token");
    const phoneVisible = showPhone && job.finalPriceConfirmed;

    async function setPrice() {
      if (!newPrice || Number(newPrice) < 1) {
        alert("Enter valid price");
        return;
      }
      setSaving(true);
      try {
        const res = await fetch(`${API}/booking/${job._id}/set-price`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ price: Number(newPrice) }),
        });
        if (res.ok) {
          setEditingPrice(false);
          loadJobs();
        }
      } finally {
        setSaving(false);
      }
    }
    async function confirmPrice(price) {
      const res = await fetch(`${API}/booking/${job._id}/confirm-price`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ price }),
      });
      if (res.ok) {
        alert("Price confirmed ✅ Phone number revealed!");
        loadJobs();
      }
    }

    return (
      <div className="glass-card" style={{ position: "relative" }}>
        <button className="card-close-btn" onClick={() => hideJob(job._id)}>
          ✕
        </button>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h4>{job.service}</h4>
          <span className={`status ${job.status}`}>{job.status}</span>
        </div>
        <p style={{ marginTop: "6px", marginBottom: "6px" }}>
          {job.description}
        </p>
        <div
          style={{
            background: job.finalPriceConfirmed ? "#f0fff4" : "#f9f9f9",
            borderRadius: "12px",
            padding: "12px",
            margin: "8px 0",
            border: `1px solid ${job.finalPriceConfirmed ? "#b2f5c8" : "#eee"}`,
          }}
        >
          {job.finalPriceConfirmed ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontSize: "12px",
                    color: "green",
                    fontWeight: "bold",
                  }}
                >
                  ✅ Final Price Confirmed
                </span>
                <span
                  style={{
                    fontWeight: "bold",
                    color: "#ff3c00",
                    fontSize: "18px",
                  }}
                >
                  ₹{job.confirmedPrice}
                </span>
              </div>
              {isWorkerSubscribed ? (
                <p
                  style={{
                    fontSize: "11px",
                    color: "green",
                    margin: "6px 0 0",
                  }}
                >
                  👑 Premium: No commission — Full ₹{job.confirmedPrice} to you
                </p>
              ) : job.commission > 0 ? (
                <div
                  style={{ marginTop: "6px", fontSize: "11px", color: "#888" }}
                >
                  <span>10% commission: -₹{job.commission}</span>
                  <span
                    style={{
                      marginLeft: "10px",
                      color: "#28a745",
                      fontWeight: "bold",
                    }}
                  >
                    You receive: ₹{job.workerReceives}
                  </span>
                </div>
              ) : null}
            </div>
          ) : job.status === "accepted" ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "12px", color: "#888" }}>
                  Customer's Budget
                </span>
                <span style={{ fontWeight: "bold", color: "#888" }}>
                  ₹{job.finalPrice}
                </span>
              </div>
              {!editingPrice ? (
                <button
                  onClick={() => setEditingPrice(true)}
                  style={{
                    width: "100%",
                    padding: "9px",
                    background: "#fff8f0",
                    border: "1px solid #ffd0a0",
                    borderRadius: "10px",
                    cursor: "pointer",
                    color: "#ff3c00",
                    fontWeight: "bold",
                    fontSize: "13px",
                  }}
                >
                  ✏️ Set Your Final Price
                </button>
              ) : (
                <div>
                  <div
                    style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
                  >
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="₹ Final price"
                      style={{
                        flex: 1,
                        padding: "9px",
                        borderRadius: "10px",
                        border: "1px solid #ddd",
                        fontSize: "14px",
                        fontWeight: "bold",
                        margin: 0,
                      }}
                    />
                    <button
                      onClick={setPrice}
                      disabled={saving}
                      style={{
                        padding: "9px 16px",
                        background: "#ff3c00",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      {saving ? "..." : "Set"}
                    </button>
                  </div>
                  {job.customerSetPrice && !job.finalPriceConfirmed && (
                    <div
                      style={{
                        background: "#f0f8ff",
                        borderRadius: "10px",
                        padding: "10px",
                        marginTop: "8px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#007bff",
                          margin: "0 0 6px",
                          fontWeight: "bold",
                        }}
                      >
                        💬 Customer's offer: ₹{job.customerSetPrice}
                      </p>
                      <button
                        onClick={() => confirmPrice(job.customerSetPrice)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          background: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "12px",
                        }}
                      >
                        ✅ Accept ₹{job.customerSetPrice}
                      </button>
                    </div>
                  )}
                  {job.workerSetPrice && (
                    <button
                      onClick={() => confirmPrice(job.workerSetPrice)}
                      style={{
                        width: "100%",
                        padding: "9px",
                        background: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "13px",
                        marginTop: "6px",
                      }}
                    >
                      ✅ Confirm ₹{job.workerSetPrice} as Final
                    </button>
                  )}
                </div>
              )}
              <p
                style={{
                  fontSize: "10px",
                  color: "#aaa",
                  margin: "8px 0 0",
                  textAlign: "center",
                }}
              >
                🔒 Customer phone shown after price confirmation
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: "#888" }}>Estimated</span>
              <span style={{ fontWeight: "bold", color: "#ff3c00" }}>
                ₹{job.finalPrice}
              </span>
            </div>
          )}
        </div>
        <p style={{ margin: "4px 0" }}>
          ⚡ {job.urgency === "urgent" ? "Urgent 🚨" : "Normal"}
        </p>
        <p style={{ margin: "4px 0" }}>📍 {job.location}</p>
        {phoneVisible ? (
          <p
            style={{
              background: "#f0fff4",
              border: "1px solid #b2f5c8",
              borderRadius: "8px",
              padding: "6px 10px",
              fontWeight: "bold",
              margin: "6px 0",
            }}
          >
            📞 {job.phone}
          </p>
        ) : showPhone && !job.finalPriceConfirmed ? (
          <p
            style={{
              fontSize: "12px",
              color: "#aaa",
              fontStyle: "italic",
              margin: "4px 0",
            }}
          >
            🔒 Confirm price to reveal phone number
          </p>
        ) : null}
        {job.image && (
          <img
            src={mediaSrc(job.image)}
            className="job-img"
            alt="job"
          />
        )}
        <div style={{ marginTop: "10px" }}>
          {job.status === "pending" && (
            <button className="btn primary" onClick={() => acceptJob(job._id)}>
              ✅ Accept Job
            </button>
          )}
          {job.status === "accepted" && job.finalPriceConfirmed && (
            <button className="btn success" onClick={() => startJob(job._id)}>
              🚀 Start Job — I've Reached
            </button>
          )}
          {job.status === "accepted" && !job.finalPriceConfirmed && (
            <p
              style={{
                fontSize: "12px",
                color: "#aaa",
                textAlign: "center",
                padding: "6px 0",
              }}
            >
              ⏳ Set & confirm price first
            </p>
          )}
          {job.status === "ongoing" && (
            <button
              className="btn"
              style={{ background: "#6c63ff", color: "white" }}
              onClick={() => completeJob(job._id)}
            >
              🏁 Mark as Completed
            </button>
          )}
          {job.status === "completed" &&
            (job.paymentDone ? (
              <p
                style={{ color: "green", fontWeight: "bold", marginTop: "8px" }}
              >
                ✅ Payment Received ({job.paymentMode})
              </p>
            ) : (
              <button
                className="btn primary"
                onClick={() => setPaymentPopup(job)}
              >
                💰 Collect Payment
              </button>
            ))}
        </div>
        {job.status === "completed" &&
          job.paymentDone &&
          !isWorkerSubscribed &&
          job.commission > 0 && (
            <CommissionPayment
              job={job}
              adminUpi={adminUpi}
              qrCodeUrl={qrCodeUrl}
              onDone={loadJobs}
            />
          )}
      </div>
    );
  }

  return (
    <div className="container">
      <div className="user-header">
        <div>
          <h2 style={{ margin: 0 }}>Worker Panel 🔧</h2>
          <p style={{ color: "#888", fontSize: "13px", margin: "2px 0 0" }}>
            Hi <strong>{user.name}</strong>
            {isWorkerSubscribed && (
              <span
                style={{
                  marginLeft: "8px",
                  background: "linear-gradient(135deg,#ffd700,#ff9500)",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "20px",
                  fontSize: "10px",
                  fontWeight: "bold",
                }}
              >
                👑 Premium
              </span>
            )}
          </p>
          {workerLocation && (
            <p style={{ fontSize: "12px", color: "green", margin: "2px 0 0" }}>
              📍 {workerLocation.name || "Location set"} ✅
            </p>
          )}
        </div>
        <NotificationBell user={user} />
      </div>

      {/* ✅ Location prompt — shown until worker sets location */}
      {showLocPrompt && (
        <div
          style={{
            background: "#fff8f0",
            border: "1.5px solid #ffd0a0",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <p
            style={{
              fontWeight: "700",
              color: "#e65100",
              margin: "0 0 6px",
              fontSize: "14px",
            }}
          >
            📍 Set Your Location First
          </p>
          <p
            style={{
              color: "#888",
              fontSize: "12px",
              margin: "0 0 12px",
              lineHeight: 1.6,
            }}
          >
            You need to set your location before you can accept jobs. This helps
            customers find workers nearby.
          </p>
          <button
            onClick={detectWorkerLocation}
            disabled={detectingLoc}
            style={{
              width: "100%",
              padding: "12px",
              background: detectingLoc
                ? "#ccc"
                : "linear-gradient(135deg,#ff7a18,#ff4500)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: detectingLoc ? "default" : "pointer",
              fontWeight: "700",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
          >
            {detectingLoc ? "Detecting..." : "📡 Detect My Location"}
          </button>
        </div>
      )}

      {loading && (
        <p style={{ textAlign: "center", color: "#aaa", padding: "20px" }}>
          Loading jobs...
        </p>
      )}
      {pendingJobs.length > 0 && (
        <>
          <h3 className="section-title">🟡 Pending ({pendingJobs.length})</h3>
          {pendingJobs.map((job) => (
            <JobCard key={job._id} job={job} showPhone={false} />
          ))}
        </>
      )}
      {acceptedJobs.length > 0 && (
        <>
          <h3 className="section-title">✅ Accepted ({acceptedJobs.length})</h3>
          {acceptedJobs.map((job) => (
            <JobCard key={job._id} job={job} showPhone={true} />
          ))}
        </>
      )}
      {ongoingJobs.length > 0 && (
        <>
          <h3 className="section-title">🔵 Ongoing ({ongoingJobs.length})</h3>
          {ongoingJobs.map((job) => (
            <JobCard key={job._id} job={job} showPhone={true} />
          ))}
        </>
      )}
      {allCompleted.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
            }}
          >
            <h3 className="section-title" style={{ marginTop: 0 }}>
              🏁 Completed ({allCompleted.length})
            </h3>
            {allCompleted.length > 3 && (
              <span
                onClick={() => setShowAllCompleted((p) => !p)}
                style={{
                  color: "#ff7a18",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {showAllCompleted ? "Show Less ▲" : "See All ▼"}
              </span>
            )}
          </div>
          {completedJobs.map((job) => (
            <JobCard key={job._id} job={job} showPhone={true} />
          ))}
          {!showAllCompleted && allCompleted.length > 3 && (
            <p
              onClick={() => setShowAllCompleted(true)}
              style={{
                textAlign: "center",
                color: "#ff7a18",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              +{allCompleted.length - 3} more
            </p>
          )}
        </>
      )}
      {!loading && visibleJobs.length === 0 && (
        <p className="empty-msg">No jobs available yet.</p>
      )}

      {paymentPopup && (
        <div className="modal-overlay" onClick={() => setPaymentPopup(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "48px" }}>💰</span>
              <h3 style={{ marginTop: "8px" }}>Collect Payment</h3>
            </div>
            <div className="modal-details">
              <div className="modal-row">
                <span>Service</span>
                <strong>{paymentPopup.service}</strong>
              </div>
              <div className="modal-row">
                <span>Amount</span>
                <strong style={{ color: "#ff3c00", fontSize: "18px" }}>
                  ₹{paymentPopup.confirmedPrice || paymentPopup.finalPrice}
                </strong>
              </div>
              {isWorkerSubscribed ? (
                <div className="modal-row">
                  <span>Commission</span>
                  <strong style={{ color: "green" }}>None 👑 Premium</strong>
                </div>
              ) : paymentPopup.commission > 0 ? (
                <>
                  <div className="modal-row">
                    <span>Commission (10%)</span>
                    <strong style={{ color: "#e65100" }}>
                      -₹{paymentPopup.commission}
                    </strong>
                  </div>
                  <div className="modal-row">
                    <span>You Receive</span>
                    <strong style={{ color: "green" }}>
                      ₹{paymentPopup.workerReceives}
                    </strong>
                  </div>
                </>
              ) : null}
              <div className="modal-row">
                <span>Location</span>
                <strong>{paymentPopup.location}</strong>
              </div>
            </div>
            <p style={{ fontWeight: "bold", marginBottom: "10px" }}>
              Select Payment Mode:
            </p>
            <button
              className="btn success"
              onClick={() => markPayment(paymentPopup._id, "cash")}
            >
              💵 Cash Received
            </button>
            <button
              className="btn primary"
              style={{ marginTop: "10px" }}
              onClick={() => markPayment(paymentPopup._id, "online")}
            >
              📲 UPI Received
            </button>
            {workerUpi && (
              <div className="upi-box">
                <p style={{ fontSize: "12px", color: "#888" }}>Your UPI:</p>
                <p style={{ fontWeight: "bold", fontSize: "16px" }}>
                  {workerUpi}
                </p>
              </div>
            )}
            <button
              className="btn dark"
              style={{ marginTop: "10px" }}
              onClick={() => setPaymentPopup(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
