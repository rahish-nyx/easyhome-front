import { useEffect, useRef, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  AtSign,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  Camera,
  ChevronDown,
  Crown,
  Gift,
  Globe,
  Home,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Play,
  Search,
  Send,
  Shield,
  ThumbsUp,
  User,
  WifiOff,
  X,
} from "lucide-react";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";
import { useLocation as useCity } from "../context/LocationContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useOnline, useStandalone } from "../hooks/useDevice";
import { Avatar, Badge, Button, IconButton, Modal, Spinner } from "./ui";
import { NotificationBell } from "./common";
import { OutOfZoneModal } from "./geofence";
import { cx } from "../lib/format";
import { activeZones, cityZone, zoneForArea } from "../lib/zones";

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
  const location = useLocation();

  // Keep guests on the account-choice page first, but remember where they came
  // from so sign-in can return them to the page they were browsing.
  const returnNext =
    location.pathname !== "/" && !location.pathname.startsWith("/auth")
      ? `${location.pathname}${location.search}`
      : "";
  const authHref = (extra = {}) => {
    const nextParams = new URLSearchParams(extra);
    if (returnNext) nextParams.set("next", returnNext);
    const query = nextParams.toString();
    return query ? `/auth?${query}` : "/auth";
  };

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
                {city?.areaName
                  ? `${city.areaName}, ${city.name}`
                  : city?.name || "Choose city"}{" "}
                <ChevronDown size={13} />
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
            <NavLink to="/refer">Refer &amp; Earn</NavLink>
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
                      <Link className="menu__item" to="/refer" onClick={() => setMenuOpen(false)}>
                        <Gift size={16} /> Refer &amp; Earn
                      </Link>
                      {isWorker ? (
                        <Link className="menu__item" to="/worker" onClick={() => setMenuOpen(false)}>
                          <BriefcaseBusiness size={16} /> Worker dashboard
                        </Link>
                      ) : null}
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
                <Link to={authHref()} className="btn btn--ghost btn--sm">
                  Sign in
                </Link>
                <Link to={authHref({ mode: "signup" })} className="btn btn--dark btn--sm user-join">
                  Create account
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

function areaList(city) {
  return (city?.localAreas || [])
    .map((area) =>
      typeof area === "string"
        ? { name: area }
        : { ...area, name: String(area?.name || area?.area || "").trim() },
    )
    .filter((area) => area.name);
}

export function CityModal({ open, onClose }) {
  const {
    city,
    cities,
    states,
    citiesForState,
    setCity,
    detectLocation,
    detecting,
    zones,
    error: locationError,
  } = useCity();
  const currentCity = cities.find(
    (item) =>
      String(item.name || "").toLowerCase() ===
      String(city?.name || "").toLowerCase(),
  );
  const [localError, setLocalError] = useState("");
  const [selectedState, setSelectedState] = useState(
    city?.state || currentCity?.state || "",
  );
  const [selectedCity, setSelectedCity] = useState(currentCity?.name || "");
  const [selectedArea, setSelectedArea] = useState(
    currentCity ? city?.areaName || "" : "",
  );

  useEffect(() => {
    if (!open) return;
    const savedCity = cities.find(
      (item) =>
        String(item.name || "").toLowerCase() ===
        String(city?.name || "").toLowerCase(),
    );
    setLocalError("");
    setSelectedState(city?.state || savedCity?.state || states[0] || "");
    setSelectedCity(savedCity?.name || "");
    setSelectedArea(savedCity ? city?.areaName || "" : "");
  }, [open, city?.state, city?.name, city?.areaName, cities, states]);

  const stateCities = citiesForState(selectedState);
  const cityObject = stateCities.find((item) => item.name === selectedCity);
  const active = activeZones(zones);
  const cityActiveZones = active.filter(
    (zone) =>
      String(zone.cityName || "").toLowerCase() ===
      String(cityObject?.name || "").toLowerCase(),
  );
  const hasAreaZones = cityActiveZones.some((zone) => zone.areaName);
  const hasCityWideZone = cityActiveZones.some((zone) => !zone.areaName);
  const cityAreas = areaList(cityObject).filter((area) => {
    if (!hasAreaZones) return true;
    return cityActiveZones.some(
      (zone) =>
        String(zone.areaName || "").toLowerCase() ===
        String(area.name || "").toLowerCase(),
    );
  });

  const handleDetect = async () => {
    setLocalError("");
    try {
      const next = await detectLocation();
      if (next?.requiresManualArea) {
        const matchingCity = cities.find(
          (item) =>
            item.name.toLowerCase() === next.name.toLowerCase() &&
            (!next.state ||
              String(item.state || "").toLowerCase() ===
                next.state.toLowerCase()),
        );
        setSelectedState(next.state || matchingCity?.state || "");
        setSelectedCity(matchingCity?.name || "");
        setSelectedArea("");
        setLocalError(
          "GPS was unavailable. IP identifies only your city; choose a live local area to confirm coverage.",
        );
      } else if (next) {
        onClose?.();
      } else {
        setLocalError(
          locationError ||
            "Current-location detection is unavailable. Choose your state and city manually.",
        );
      }
    } catch (detectError) {
      setLocalError(detectError.message);
    }
  };

  const chooseState = (state) => {
    setLocalError("");
    setSelectedState(state);
    setSelectedCity("");
    setSelectedArea("");
  };

  const chooseCity = (name) => {
    setLocalError("");
    const item = stateCities.find((cityItem) => cityItem.name === name);
    if (!item) {
      setSelectedCity("");
      setSelectedArea("");
      return;
    }
    const areas = areaList(item);
    const cityZones = active.filter(
      (zone) =>
        String(zone.cityName || "").toLowerCase() ===
        String(item.name || "").toLowerCase(),
    );
    const hasCityAreaZones = cityZones.some((zone) => zone.areaName);
    const liveAreas = hasCityAreaZones
      ? areas.filter((area) =>
          cityZones.some(
            (zone) =>
              String(zone.areaName || "").toLowerCase() ===
              String(area.name || "").toLowerCase(),
          ),
        )
      : areas;
    setLocalError("");
    setSelectedCity(item.name);
    setSelectedArea(liveAreas[0]?.name || "");
  };

  const saveSelection = (areaOverride = null) => {
    if (!cityObject) {
      setLocalError("Choose a state and district first.");
      return;
    }
    const area =
      areaOverride ||
      cityAreas.find((item) => item.name === selectedArea) ||
      null;
    if (hasAreaZones && !cityAreas.length) {
      setLocalError(
        "We are expanding fast! We'll be in your area soon. No active local area is available right now.",
      );
      return;
    }
    if (cityAreas.length && !area) {
      setLocalError("Choose a local area to finish saving your location.");
      return;
    }
    setLocalError("");
    setCity({
      ...cityObject,
      area: area?.name || "",
      areaName: area?.name || "",
      lat: area?.lat ?? cityObject.lat,
      lng: area?.lng ?? cityObject.lng,
    });
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose your location"
      subtitle="Pick your state, district and local area so we can match verified pros in exactly the right place."
      size="md"
    >
      <button type="button" className="city-detect" onClick={handleDetect} disabled={detecting}>
        {detecting ? <Spinner size={16} /> : <MapPin size={16} />}
        <span className="grow">
          {detecting
            ? "Detecting your location…"
            : "Use my current location (auto-detects state, district and area)"}
        </span>
      </button>

      {localError ? (
        <p className="small" style={{ color: "var(--red)", marginBottom: 12 }}>
          {localError}
        </p>
      ) : null}

      {states.length ? (
        <div className="city-select-grid">
          <label className="city-field" htmlFor="city-state">
            <span>State</span>
            <select
              id="city-state"
              value={selectedState}
              onChange={(event) => chooseState(event.target.value)}
            >
              <option value="">Select state</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>

          <label className="city-field" htmlFor="city-district">
            <span>District / city</span>
            <select
              id="city-district"
              value={selectedCity}
              onChange={(event) => chooseCity(event.target.value)}
              disabled={!selectedState || !stateCities.length}
            >
              <option value="">
                {selectedState
                  ? stateCities.length
                    ? "Select district"
                    : "No active districts"
                  : "Choose a state first"}
              </option>
              {stateCities.map((item) => {
                const live = cityZone(zones, item);
                const status = zones.length === 0 ? "" : live ? " · Live" : " · Coming soon";
                return (
                  <option key={item.id || item.name} value={item.name}>
                    {item.name}
                    {status}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      ) : (
        <p className="small muted" style={{ marginBottom: 12 }}>
          Locations are being set up. Try “Use my current location”.
        </p>
      )}

      {cityObject ? (
        <>
          <div className="city-area-head">
            <strong>Local area</strong>
            <span className="tiny muted">
              {selectedState}
              {selectedCity ? ` · ${selectedCity}` : ""}
            </span>
          </div>

          <div className="city-list city-list--grid">
            {cityAreas.length ? (
              cityAreas.map((area) => {
                const live =
                  zones.length === 0 ||
                  hasCityWideZone ||
                  Boolean(zoneForArea(zones, cityObject.name, cityObject.state, area.name));
                return (
                  <button
                    key={area.name}
                    type="button"
                    className={cx(
                      "city-option",
                      selectedArea === area.name && "is-active",
                      !live && "is-soon",
                    )}
                    onClick={() => {
                      setSelectedArea(area.name);
                      saveSelection(area);
                    }}
                  >
                    <span className="city-option__name">{area.name}</span>
                    <span
                      className={cx(
                        "city-option__status",
                        live && "is-live",
                        !live && "is-soon",
                      )}
                    >
                      {zones.length === 0 ? "Select" : live ? "Live" : "Coming soon"}
                    </span>
                  </button>
                );
              })
            ) : (
              <button
                type="button"
                className="city-option is-active"
                onClick={() => saveSelection()}
              >
                <span className="city-option__name">{cityObject.name}</span>
                <span className="city-option__status">City-wide</span>
              </button>
            )}
          </div>

          {hasAreaZones && !selectedArea ? (
            <p className="small muted" style={{ marginTop: 10 }}>
              Choose an area to see live availability.
            </p>
          ) : null}

          <button
            type="button"
            className="btn btn--primary btn--block"
            style={{ marginTop: 16 }}
            onClick={() => saveSelection()}
          >
            Save this location
          </button>
        </>
      ) : (
        <p className="small muted" style={{ marginTop: 14 }}>
          Choose a state and district to see local areas.
        </p>
      )}

      <p className="small muted" style={{ marginTop: 16 }}>
        We are expanding fast! We&apos;ll be in your area soon. If your district is
        missing, try “Use my current location” or contact support.
      </p>
    </Modal>
  );
}

/* ------------------------------- Bottom nav ------------------------------- */

export function BottomNav() {
  const { fbUser, isWorker } = useAuth();
  const location = useLocation();
  const returnNext =
    location.pathname !== "/" && !location.pathname.startsWith("/auth")
      ? `${location.pathname}${location.search}`
      : "";
  const items = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/services", label: "Services", icon: LayoutGrid },
    { to: "/bookings", label: "Bookings", icon: CalendarCheck },
    {
      to: fbUser
        ? isWorker
          ? "/worker"
          : "/profile"
        : returnNext
          ? `/auth?next=${encodeURIComponent(returnNext)}`
          : "/auth",
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

const SOCIAL_ICONS = {
  facebook: ThumbsUp,
  instagram: Camera,
  youtube: Play,
  linkedin: BriefcaseBusiness,
  x: AtSign,
  twitter: AtSign,
  whatsapp: MessageCircle,
  whatsappbusiness: MessageCircle,
  telegram: Send,
  website: Globe,
  web: Globe,
};

function FooterSocialLink({ item }) {
  const Icon = SOCIAL_ICONS[String(item.icon || "").toLowerCase()] || Globe;
  const external = /^https:\/\//i.test(item.href || "");
  const content = (
    <>
      <Icon size={16} aria-hidden="true" />
      <span>{item.label}</span>
    </>
  );
  return external ? (
    <a
      href={item.href}
      className="footer-social__link"
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <Link to={item.href} className="footer-social__link">
      {content}
    </Link>
  );
}

export function SiteFooter() {
  const { services, footerLinks, zones } = useCatalogue();
  const serviceLinks = footerLinks.filter((item) => item.group === "services");
  const socialLinks = footerLinks.filter((item) => item.group === "social");
  const liveCities = Array.from(
    new Set(
      zones
        .filter((zone) => zone.isActive !== false)
        .map((zone) => String(zone.cityName || "").trim())
        .filter(Boolean),
    ),
  );
  const footerGroups = [
    { id: "legal", label: "Legal" },
    { id: "professionals", label: "For professionals" },
  ];

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
          {serviceLinks.length
            ? serviceLinks.map((item) => (
                <Link key={item.id} to={item.href}>
                  {item.label}
                </Link>
              ))
            : services.slice(0, 6).map((service) => (
                <Link key={service.id} to={`/services/${service.key}`}>
                  {service.name}
                </Link>
              ))}
          {!serviceLinks.length ? (
            <Link to="/services" className="footer-col__more">
              …and many more
            </Link>
          ) : null}
        </div>

        {footerGroups.map((group) => {
          const links = footerLinks.filter((item) =>
            group.id === "legal"
              ? ["company", "legal", "support"].includes(item.group)
              : item.group === group.id,
          );
          if (!links.length) return null;
          return (
            <div className="footer-col" key={group.id}>
              <h2>{group.label}</h2>
              {links.map((item) => (
                <Link key={item.id} to={item.href}>
                  {item.label}
                </Link>
              ))}
              {group.id === "legal" &&
              !links.some((item) => item.href === "/refer") ? (
                <Link to="/refer">Refer &amp; Earn</Link>
              ) : null}
            </div>
          );
        })}
      </div>

      {socialLinks.length ? (
        <div className="footer-social">
          <h2>Follow EasyHome</h2>
          <div className="footer-social__links">
            {socialLinks.map((item) => (
              <FooterSocialLink key={item.id} item={item} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} EasyHome. All rights reserved.</span>
        <div className="footer-cities" aria-label="Service cities">
          {liveCities.slice(0, 7).map((name) => (
            <span key={name}>{name}</span>
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
  const standalone = useStandalone();
  const { isWorker } = useAuth();
  const {
    pickerOpen,
    closePicker,
    zoneNotice,
    dismissZoneNotice,
    openPicker,
    zones,
  } = useCity();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  // Customer and professional sessions stay separate. Public legal pages are
  // safe for anyone; every other customer route sends a professional back to
  // their own console (support gets its own worker-safe route).
  if (
    isWorker &&
    !location.pathname.startsWith("/legal/") &&
    location.pathname !== "/faq" &&
    !location.pathname.startsWith("/workers/")
  ) {
    return (
      <Navigate
        to={location.pathname === "/chat" ? "/worker/support" : "/worker"}
        replace
      />
    );
  }

  return (
    <>
      <OfflineBanner />
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      {standalone ? null : <SiteFooter />}
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
        liveZones={zones}
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
