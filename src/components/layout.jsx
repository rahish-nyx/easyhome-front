import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  ChevronDown,
  Crown,
  Home,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Search,
  Shield,
  Sparkles,
  User,
  WifiOff,
  X,
} from "lucide-react";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";
import { useLocation as useCity } from "../context/LocationContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useOnline } from "../hooks/useDevice";
import { Avatar, Badge, Button, IconButton, Modal, Spinner } from "./ui";
import { NotificationBell } from "./common";
import { OutOfZoneModal } from "./geofence";
import { cx } from "../lib/format";
import { cityZone } from "../lib/zones";

/* --------------------------------- Brand --------------------------------- */

export function Logo({ compact = false, dark = false }) {
  return (
    <Link to="/" className={cx("brand", dark && "brand--dark")} aria-label="EasyHome home">
      <span className="brand__badge">
        <img src={logo} alt="" width="38" height="38" />
      </span>
      {compact ? null : (
        <span className="brand__name" style={dark ? { color: "#fff" } : undefined}>
          Easy<em>Home</em>
        </span>
      )}
    </Link>
  );
}

/* ------------------------------- Offline bar ------------------------------ */

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      <WifiOff size={14} />
      You are offline — showing saved data. Changes will sync when you reconnect.
    </div>
  );
}

/* --------------------------------- Header --------------------------------- */

export function SiteHeader() {
  const { profile, fbUser, isAdmin, isWorker, isPremium, logout } = useAuth();
  const { city, openPicker } = useCity();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <span className="header-divider" />
          <button type="button" className="city-btn" onClick={openPicker}>
            <span className="city-btn__icon">
              <MapPin size={17} />
            </span>
            <span className="city-btn__copy">
              <span className="city-btn__label">Serving in</span>
              <span className="city-btn__value">
                {city?.name || "Choose city"} <ChevronDown size={13} />
              </span>
            </span>
          </button>

          <nav className="header-nav" aria-label="Main navigation">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/services">Services</NavLink>
            <NavLink to="/bookings">My bookings</NavLink>
            <NavLink to="/subscription">Membership</NavLink>
          </nav>

          <div className="header-actions">
            {fbUser ? (
              <>
                <NotificationBell />
                <div className="user-menu" ref={menuRef}>
                  <button
                    type="button"
                    className="user-btn"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                  >
                    <Avatar name={profile?.name} path={profile?.photoPath} size={34} />
                    <span className="user-btn__copy">
                      <span className="user-btn__name">{profile?.name || "Account"}</span>
                      <span className="user-btn__role">
                        {isWorker ? "EasyHome Pro" : isPremium ? "Pro member" : "Customer"}
                      </span>
                    </span>
                    {isPremium ? (
                      <span title="Pro member" style={{ color: "#b88600", display: "grid", placeItems: "center" }}>
                        <Crown size={15} />
                      </span>
                    ) : null}
                    <ChevronDown size={15} style={{ color: "var(--muted)" }} />
                  </button>

                  {menuOpen ? (
                    <div className="menu" role="menu">
                      <div className="menu__head">
                        <p className="menu__name">{profile?.name || "EasyHome account"}</p>
                        <p className="menu__email">{profile?.email || fbUser.email}</p>
                      </div>
                      <Link className="menu__item" to="/profile" onClick={() => setMenuOpen(false)}>
                        <User size={16} /> My profile
                      </Link>
                      <Link className="menu__item" to="/bookings" onClick={() => setMenuOpen(false)}>
                        <CalendarCheck size={16} /> My bookings
                      </Link>
                      <Link className="menu__item" to="/subscription" onClick={() => setMenuOpen(false)}>
                        <Crown size={16} /> Membership
                      </Link>
                      {isWorker ? (
                        <Link className="menu__item" to="/worker" onClick={() => setMenuOpen(false)}>
                          <BriefcaseBusiness size={16} /> Worker dashboard
                        </Link>
                      ) : (
                        <Link className="menu__item" to="/auth?role=worker" onClick={() => setMenuOpen(false)}>
                          <Sparkles size={16} /> Become a pro
                        </Link>
                      )}
                      {isAdmin ? (
                        <>
                          <div className="menu__sep" />
                          <Link className="menu__item" to="/admin" onClick={() => setMenuOpen(false)}>
                            <Shield size={16} /> Admin console
                          </Link>
                        </>
                      ) : null}
                      <div className="menu__sep" />
                      <button type="button" className="menu__item menu__item--danger" onClick={handleLogout}>
                        <LogOut size={16} /> Sign out
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Link to="/auth" className="btn btn--ghost btn--sm">
                  Sign in
                </Link>
                <Link to="/auth?role=worker" className="btn btn--dark btn--sm user-join">
                  Join as a pro
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

/* -------------------------------- City modal ------------------------------ */

export function CityModal({ open, onClose }) {
  const { city, cities, zones, setCity, detectLocation, detecting, error } = useCity();
  const [localError, setLocalError] = useState("");

  const handleDetect = async () => {
    setLocalError("");
    try {
      const next = await detectLocation();
      if (next) onClose?.();
    } catch (detectError) {
      setLocalError(detectError.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose your city"
      subtitle="We match verified pros inside your live service zone."
      size="sm"
    >
      <button type="button" className="city-detect" onClick={handleDetect} disabled={detecting}>
        {detecting ? <Spinner size={16} /> : <span aria-hidden="true">📍</span>}
        <span className="grow">
          {detecting ? "Detecting your location…" : "Use my current location"}
        </span>
      </button>

      {localError || error ? (
        <p className="small" style={{ color: "var(--red)", marginBottom: 12 }}>
          {localError || error}
        </p>
      ) : null}

      {cities.length ? (
        <div className="city-list">
          {cities.map((item) => {
            const live = cityZone(zones, item);
            const status = zones.length === 0 ? null : live ? "Live" : "Coming soon";
            return (
              <button
                key={item.id}
                type="button"
                className={cx(
                  "city-option",
                  city?.name === item.name && "is-active",
                  status === "Coming soon" && "is-soon",
                )}
                onClick={() => {
                  setCity(item);
                  onClose?.();
                }}
              >
                <span className="city-option__name">{item.name}</span>
                <span
                  className={cx(
                    "city-option__status",
                    status === "Live" && "is-live",
                    status === "Coming soon" && "is-soon",
                  )}
                >
                  {status || (city?.name === item.name ? "✓" : "")}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="small muted">
          City list is being set up. Ask an admin to add service areas in the admin console.
        </p>
      )}

      <p className="small muted" style={{ marginTop: 16 }}>
        Not in the list? We are expanding fast — try “Use my current location”.
      </p>
    </Modal>
  );
}

/* ------------------------------- Bottom nav ------------------------------- */

export function BottomNav() {
  const { fbUser, isWorker } = useAuth();
  const items = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/services", label: "Services", icon: LayoutGrid },
    { to: "/bookings", label: "Bookings", icon: CalendarCheck },
    {
      to: fbUser ? (isWorker ? "/worker" : "/profile") : "/auth",
      label: fbUser ? (isWorker ? "Work" : "Profile") : "Sign in",
      icon: fbUser ? (isWorker ? BriefcaseBusiness : User) : User,
    },
  ];

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end={item.end}
          className={({ isActive }) => cx("bottom-nav__item", isActive && "is-active")}
        >
          <item.icon size={21} aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/* ---------------------------------- Footer -------------------------------- */

export function SiteFooter() {
  const { services, cities } = useCatalogue();

  return (
    <footer className="site-footer">
      <div className="recruit">
        <div>
          <h2 className="recruit__title">Are you a skilled worker?</h2>
          <p className="recruit__sub">
            Join EasyHome, get verified, and receive local jobs with transparent payouts.
            No shop, no leads to buy — just work.
          </p>
        </div>
        <Link to="/auth?role=worker" className="btn btn--primary btn--lg">
          Join EasyHome
        </Link>
      </div>

      <div className="footer-main">
        <div className="footer-brand">
          <Logo />
          <p>
            Verified home-service professionals for cleaning, repairs, beauty and more.
            Book in under a minute — pay only after the job is done.
          </p>
          <div className="row row--wrap" style={{ marginTop: 14 }}>
            <Badge tone="green" dot>
              Verified pros
            </Badge>
            <Badge tone="yellow">Same-day service</Badge>
          </div>
        </div>

        <div className="footer-col">
          <h2>Services</h2>
          {services.slice(0, 6).map((service) => (
            <Link key={service.id} to={`/services/${service.key}`}>
              {service.name}
            </Link>
          ))}
        </div>

        <div className="footer-col">
          <h2>Company</h2>
          <Link to="/legal/about">About us</Link>
          <Link to="/legal/terms">Terms of service</Link>
          <Link to="/legal/privacy">Privacy policy</Link>
          <Link to="/legal/refunds">Refund policy</Link>
          <Link to="/chat">Help &amp; support</Link>
        </div>

        <div className="footer-col">
          <h2>For professionals</h2>
          <Link to="/auth?role=worker">Become a pro</Link>
          <Link to="/worker">Worker dashboard</Link>
          <Link to="/subscription">EasyHome Pro</Link>
          <Link to="/admin">Admin console</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} EasyHome. All rights reserved.</span>
        <div className="footer-cities" aria-label="Service cities">
          {cities.slice(0, 7).map((item) => (
            <span key={item.id}>{item.name}</span>
          ))}
        </div>
        <span>Made for Indian homes 🇮🇳</span>
      </div>
    </footer>
  );
}

/* ---------------------------------- Shell --------------------------------- */

export function CustomerLayout() {
  const location = useLocation();
  const {
    pickerOpen,
    closePicker,
    zoneNotice,
    dismissZoneNotice,
    openPicker,
  } = useCity();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <>
      <OfflineBanner />
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
      <BottomNav />
      <CityModal open={pickerOpen} onClose={closePicker} />
      <OutOfZoneModal
        open={Boolean(zoneNotice?.open)}
        onClose={dismissZoneNotice}
        onChangeLocation={openPicker}
        cityName={zoneNotice?.cityName || ""}
        state={zoneNotice?.state || ""}
        nearestZone={zoneNotice?.nearestZone || ""}
        distanceMeters={zoneNotice?.distanceMeters ?? null}
        coords={zoneNotice?.coords || null}
      />
    </>
  );
}

/* ------------------------------- Page header ------------------------------ */

export function PageHead({ eyebrow, title, subtitle, action }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------- Empty page ------------------------------ */

export function SimpleHeader({ children }) {
  return (
    <div className="site-header">
      <div className="header-inner">
        <Logo />
        <div className="header-actions">{children}</div>
      </div>
    </div>
  );
}
