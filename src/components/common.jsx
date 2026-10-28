import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  CloudUpload,
  Crown,
  IndianRupee,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Ticket,
  Trash2,
  Wrench,
  X,
  Users,
  Wallet,
} from "lucide-react";
import { API_BASE } from "../lib/api";
import { api } from "../lib/api";
import { mediaUrl } from "../lib/media";
import { cx, inr, isActiveUntil, timeAgo } from "../lib/format";
import { STATUS_META, SERVICE_META } from "../lib/constants";
import { iconFor } from "../lib/iconMap";
import { useAuth } from "../context/AuthContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useToast } from "../context/ToastContext";
import { useInstallPrompt } from "../hooks/useDevice";
import { qNotifications } from "../lib/queries";
import { useLiveQuery } from "../hooks/useLive";
import { useNotificationSound } from "../hooks/useNotificationSound";
import { Avatar, Badge, Button, IconButton, Modal, PageLoader, Spinner } from "./ui";
import logo from "../assets/logo.png";

/* ------------------------------- Service icon ----------------------------- */

export function ServiceIcon({
  service,
  icon,
  size = 44,
  className = "",
  style,
  iconSize,
}) {
  const key = icon || service?.icon || SERVICE_META[service?.key]?.icon || "wrench";
  const tint =
    service?.tint || SERVICE_META[service?.key]?.tint || "var(--yellow-soft)";
  const ink = service?.ink || SERVICE_META[service?.key]?.ink || "var(--yellow-ink)";
  return (
    <span
      className={cx("service-icon", className)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(10, Math.round(size * 0.3)),
        background: tint,
        color: ink,
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      {createElement(iconFor(key), {
        size: iconSize || Math.round(size * 0.5),
        strokeWidth: 1.8,
      })}
    </span>
  );
}

/* ------------------------------- Service grid ----------------------------- */

export function ServiceGrid({ services, className = "" }) {
  if (!services.length) return null;
  return (
    <div className={cx("service-grid", className)}>
      {services.map((service, index) => {
        const meta = SERVICE_META[service.key] || {};
        return (
          <Link
            key={service.id || service.key}
            to={`/services/${service.key}`}
            className={cx("service-tile", index === 0 && "service-tile--popular")}
            style={{
              "--tile-tint": service.tint || meta.tint || "var(--yellow-soft)",
              "--tile-ink": service.ink || meta.ink || "var(--yellow-ink)",
            }}
          >
            {index === 0 ? <span className="service-tile__pop">POPULAR</span> : null}
            <span className="service-tile__icon">
              <ServiceIcon icon={service.icon} service={service} size={46} iconSize={23} />
            </span>
            <span className="service-tile__name">{service.name}</span>
            <span className="service-tile__sub">
              {service.subheading || meta.blurb || "Verified local professional"}
            </span>
            <span className="service-tile__from">from {inr(service.fromPrice || meta.from || 199)}</span>
          </Link>
        );
      })}
    </div>
  );
}

/* --------------------------------- Search --------------------------------- */

export function SearchBar({
  placeholder = "Search “AC repair”, “deep cleaning”…",
  autoFocus = false,
  className = "",
  onSubmit,
}) {
  const { services } = useCatalogue();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const term = value.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!term) return [];
    return services
      .filter((service) => {
        const meta = SERVICE_META[service.key] || {};
        return `${service.name} ${service.description || ""} ${meta.blurb || ""}`
          .toLowerCase()
          .includes(term);
      })
      .slice(0, 6);
  }, [services, term]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!term) return;
    setOpen(false);
    if (onSubmit) onSubmit(value.trim());
    else go(`/search?q=${encodeURIComponent(value.trim())}`);
  };

  return (
    <form
      ref={boxRef}
      className={cx("searchbar", className)}
      role="search"
      onSubmit={submit}
      autoComplete="off"
    >
      <div className="searchbar__box">
        <Search size={20} className="searchbar__icon" aria-hidden="true" />
        <input
          className="searchbar__input"
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          aria-label="Search home services"
        />
        {value ? (
          <button
            type="button"
            className="searchbar__clear"
            onClick={() => {
              setValue("");
              setOpen(false);
            }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        ) : null}
        <button type="submit" className="searchbar__submit">
          <span>Search</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {open && term ? (
        <div className="searchbar__suggest" role="listbox">
          {matches.length ? (
            matches.map((service) => (
              <button
                key={service.id || service.key}
                type="button"
                className="searchbar__suggest-item"
                onClick={() => go(`/services/${service.key}`)}
              >
                <ServiceIcon service={service} size={32} iconSize={16} className="searchbar__suggest-icon" />
                <span className="searchbar__suggest-copy">
                  <span className="searchbar__suggest-name">{service.name}</span>
                  <span className="searchbar__suggest-sub">
                    from {inr(service.fromPrice || SERVICE_META[service.key]?.from || 199)} · verified pros
                  </span>
                </span>
                <ChevronRight size={16} className="muted" />
              </button>
            ))
          ) : (
            <div className="searchbar__suggest-item" style={{ cursor: "default" }}>
              <span className="searchbar__suggest-copy">
                <span className="searchbar__suggest-name">No exact service match</span>
                <span className="searchbar__suggest-sub">Try “cleaning”, “plumbing” or “AC”.</span>
              </span>
            </div>
          )}
          <button
            type="button"
            className="searchbar__suggest-item"
            style={{ color: "var(--blue)" }}
            onClick={() => go(`/search?q=${encodeURIComponent(value.trim())}`)}
          >
            <Search size={16} />
            <span className="searchbar__suggest-name">See all results for “{value.trim()}”</span>
          </button>
        </div>
      ) : null}
    </form>
  );
}

/* ------------------------------ Promo carousel ---------------------------- */

export function PromoCarousel({ promos }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setActive(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [promos.length]);

  useEffect(() => {
    if (promos.length < 2 || paused) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setActive((current) => {
        const next = (current + 1) % promos.length;
        const track = trackRef.current;
        if (track) {
          const child = track.children[next];
          track.scrollTo({ left: child?.offsetLeft || 0, behavior: "smooth" });
        }
        return next;
      });
    }, 5600);
    return () => clearInterval(timer);
  }, [promos.length, paused]);

  if (!promos.length) return null;

  return (
    <div className="promo-strip">
      <div
        className="promo-track"
        ref={trackRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onScroll={(event) => {
          const track = event.currentTarget;
          const children = Array.from(track.children);
          const closest = children.reduce(
            (best, child, index) =>
              Math.abs(child.offsetLeft - track.scrollLeft) <
              Math.abs(children[best].offsetLeft - track.scrollLeft)
                ? index
                : best,
            0,
          );
          setActive(closest);
        }}
        aria-roledescription="carousel"
        aria-label="Offers"
      >
        {promos.map((promo, index) => {
          const image = mediaUrl(promo.imagePath);
          const theme = promo.theme || "yellow";
          const isImage = Boolean(image);
          const embedHtml = String(promo.embedHtml || "").trim();
          if (embedHtml) {
            return (
              <div
                key={promo.id}
                className={cx("promo", "promo--embed", `promo--${theme}`)}
              >
                <div
                  className="promo__embed"
                  dangerouslySetInnerHTML={{ __html: embedHtml }}
                />
              </div>
            );
          }
          const content = (
            <>
              {isImage ? (
                <>
                  <img className="promo__image" src={image} alt="" loading={index === 0 ? "eager" : "lazy"} />
                  <span className="promo__overlay" />
                </>
              ) : (
                <span className="promo__blob" aria-hidden="true" />
              )}
              <div className="promo__content" style={isImage ? { color: "#fff" } : undefined}>
                <span className="promo__kicker">
                  {promo.kicker || "EasyHome offer"}
                </span>
                <span className="promo__title">{promo.title}</span>
                {promo.subtitle ? <span className="promo__sub">{promo.subtitle}</span> : null}
                {promo.ctaText ? (
                  <span className="promo__cta">
                    {promo.ctaText} <ArrowRight size={14} />
                  </span>
                ) : null}
              </div>
            </>
          );
          const href = promo.ctaLink || "/services";
          const className = cx("promo", `promo--${isImage ? "dark" : theme}`);
          return href.startsWith("/") ? (
            <Link key={promo.id} to={href} className={className}>
              {content}
            </Link>
          ) : (
            <a key={promo.id} href={href} className={className} target="_blank" rel="noreferrer">
              {content}
            </a>
          );
        })}
      </div>

      {promos.length > 1 ? (
        <div className="promo-dots">
          {promos.map((promo, index) => (
            <button
              key={promo.id}
              type="button"
              className={index === active ? "is-active" : ""}
              aria-label={`Go to offer ${index + 1}`}
              onClick={() => {
                setActive(index);
                const child = trackRef.current?.children[index];
                trackRef.current?.scrollTo({ left: child?.offsetLeft || 0, behavior: "smooth" });
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------- Rating ---------------------------------- */

export function RatingStars({ value = 0, size = 14, showValue = false, count }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="rating-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          strokeWidth={1.8}
          fill={star <= Math.round(rating) ? "currentColor" : "none"}
          opacity={star <= Math.round(rating) ? 1 : 0.35}
        />
      ))}
      {showValue ? (
        <strong style={{ marginLeft: 4, fontSize: size - 1, color: "var(--ink)" }}>
          {rating ? rating.toFixed(1) : "New"}
        </strong>
      ) : null}
      {count !== undefined ? (
        <span className="tiny muted" style={{ marginLeft: 3 }}>
          ({count})
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------ Notification ------------------------------ */

const NOTIF_ICONS = {
  new_job: BriefcaseBusiness,
  job_accepted: BadgeCheck,
  job_started: Clock3,
  job_completed: Check,
  price: IndianRupee,
  payment: Wallet,
  subscription: Crown,
  review: Star,
  chat: Bell,
  worker_approved: BadgeCheck,
  worker_rejected: CircleAlert,
  worker_suspended: ShieldCheck,
  kyc: ShieldCheck,
  announcement: Sparkles,
};

export function NotificationBell() {
  const { fbUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const wrapRef = useRef(null);
  const query = useMemo(() => (fbUser ? qNotifications(fbUser.uid) : null), [fbUser]);
  const { data: items, loading } = useLiveQuery(query);
  useNotificationSound(items, {
    loading,
    userId: fbUser?.uid || "",
    enabled: Boolean(fbUser),
  });
  const unread = items.filter((item) => !item.read).length;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const markRead = async () => {
    if (!unread) return;
    setMarking(true);
    try {
      await api.patch("/notifications/read");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setMarking(false);
    }
  };

  const removeNotification = async (event, id) => {
    event.stopPropagation();
    event.preventDefault();
    try {
      await api.del(`/notifications/${id}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (!fbUser) return null;

  return (
    <div className="user-menu" ref={wrapRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open && unread) markRead();
        }}
        style={{ position: "relative" }}
      >
        <Bell size={19} />
        {unread ? (
          <span className="icon-btn__badge">{unread > 9 ? "9+" : unread}</span>
        ) : null}
      </button>

      {open ? (
        <div className="menu" style={{ width: 330, padding: 0, overflow: "hidden" }} role="menu">
          <div className="menu__head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="menu__name">Notifications</p>
              <p className="menu__email">{unread ? `${unread} unread` : "You are all caught up"}</p>
            </div>
            {unread ? (
              <button
                type="button"
                className="btn btn--link"
                style={{ fontSize: 11.5 }}
                onClick={markRead}
                disabled={marking}
              >
                Mark read
              </button>
            ) : null}
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto", padding: 6 }}>
            {loading && !items.length ? (
              <div style={{ display: "grid", placeItems: "center", padding: 22 }}>
                <Spinner size={18} />
              </div>
            ) : items.length ? (
              items.map((item) => {
                const Icon = NOTIF_ICONS[item.type] || Bell;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className="list-row list-row--button notif-row"
                    onClick={() => {
                      setOpen(false);
                      if (item.link?.startsWith("/")) navigate(item.link);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setOpen(false);
                      if (item.link?.startsWith("/")) navigate(item.link);
                    }}
                    style={item.read ? undefined : { background: "var(--yellow-soft)" }}
                  >
                    <span className="list-row__icon">
                      <Icon size={17} />
                    </span>
                    <span className="list-row__copy">
                      <span className="list-row__title">{item.title}</span>
                      <span className="list-row__sub" style={{ whiteSpace: "normal" }}>
                        {item.body}
                      </span>
                      <span className="tiny muted" style={{ marginTop: 2 }}>
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="notif-row__remove"
                      aria-label={`Remove notification: ${item.title}`}
                      title="Remove"
                      onClick={(event) => removeNotification(event, item.id)}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="small muted" style={{ padding: 20, textAlign: "center" }}>
                No notifications yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Booking status ---------------------------- */

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, tone: "neutral" };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const TIMELINE = [
  { id: "pending", label: "Requested" },
  { id: "accepted", label: "Pro assigned" },
  { id: "ongoing", label: "In progress" },
  { id: "completed", label: "Completed" },
];

export function BookingTimeline({ booking }) {
  if (!booking) return null;
  if (booking.status === "cancelled") {
    return (
      <div className="booking-timeline">
        <span className="timeline-step is-done">Requested</span>
        <span className="timeline-step is-done" style={{ color: "var(--red)" }}>
          Cancelled
        </span>
      </div>
    );
  }
  const current = TIMELINE.findIndex((step) => step.id === booking.status);
  return (
    <div className="booking-timeline">
      {TIMELINE.map((step, index) => (
        <span key={step.id} className={cx("timeline-step", index <= current && "is-done")}>
          {step.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------- Empty section ---------------------------- */

export function UrgentMini({ job }) {
  return (
    <div className="urgent-mini">
      <span className="urgent-mini__icon">
        <ServiceIcon service={{ key: job.serviceKey }} size={42} iconSize={20} />
      </span>
      <span className="grow">
        <strong>{job.service}</strong>
        <small>
          {job.area || "Nearby"} · {inr(job.budget)}
        </small>
      </span>
      <Badge tone="red">Urgent</Badge>
    </div>
  );
}

/* -------------------------------- Worker card ----------------------------- */

export function WorkerCard({ worker, onBook }) {
  const name = worker.name || "EasyHome Pro";
  const isPro =
    isActiveUntil(worker.premiumUntil) ||
    (worker.isPremium === true && !worker.premiumUntil);
  return (
    <article className="worker-card">
      {isPro ? (
        <span className="worker-card__pro">
          <Badge tone="yellow">
            <BadgeCheck size={11} /> Verified Pro
          </Badge>
        </span>
      ) : null}
      <div className="worker-card__head">
        <Avatar name={name} path={worker.photoPath} size={48} ring={isPro} />
        <div style={{ minWidth: 0 }}>
          <Link to={`/workers/${worker.id}`} className="worker-card__name">
            {name}
            {worker.kycStatus === "verified" ? (
              <BadgeCheck size={15} style={{ color: "var(--blue)" }} aria-label="ID verified" />
            ) : null}
          </Link>
          <p className="worker-card__service">
            {worker.service || SERVICE_META[worker.serviceKey]?.name || "Home services"}
          </p>
        </div>
      </div>

      <div className="worker-card__stats">
        <span>
          <RatingStars value={worker.rating} size={12} showValue />
        </span>
        <span>
          <BriefcaseBusiness size={12} /> {worker.jobsCompleted || 0} jobs
        </span>
        <span>
          <span className={cx("online-dot", worker.online === false && "online-dot--off")} />
          {worker.online === false ? "Offline" : "Online"}
        </span>
      </div>

      <div className="worker-card__foot">
        <span className="worker-card__price">
          {inr(worker.pricePerWork || 199)} <small>starting</small>
        </span>
        {onBook ? (
          <Button size="sm" variant="dark" onClick={() => onBook(worker)}>
            Book
          </Button>
        ) : (
          <Link to={`/book?service=${worker.serviceKey || ""}&worker=${worker.id}`} className="btn btn--dark btn--sm">
            Book
          </Link>
        )}
      </div>
    </article>
  );
}

/* ------------------------------ Image upload ------------------------------ */

export function ImageUpload({
  value,
  onChange,
  existingUrl = "",
  accept = "image/*",
  label = "Add a photo",
  hint = "JPG or PNG, up to 4 MB",
  className = "",
}) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!value) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const shown = preview || existingUrl;

  return (
    <label className={cx("upload", className)}>
      <input
        type="file"
        accept={accept}
        onChange={(event) => onChange?.(event.target.files?.[0] || null)}
      />
      {shown ? (
        <img className="upload__preview" src={shown} alt="Selected preview" />
      ) : (
        <span className="upload__icon">
          <CloudUpload size={20} />
        </span>
      )}
      <span className="upload__copy grow">
        <strong>{value ? value.name : label}</strong>
        <small>{hint}</small>
      </span>
      {value ? (
        <span
          className="icon-btn icon-btn--sm"
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.preventDefault();
            onChange?.(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onChange?.(null);
            }
          }}
          aria-label="Remove selected image"
        >
          <Trash2 size={15} />
        </span>
      ) : null}
    </label>
  );
}

/* ------------------------------ Protected route --------------------------- */

export function ProtectedRoute({ children, adminOnly = false, role }) {
  const { fbUser, isAdmin, isWorker, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!fbUser) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (role === "customer" && isWorker) return <Navigate to="/worker" replace />;
  if (role === "worker" && !isWorker) return <Navigate to="/" replace />;
  return children;
}

/* -------------------------------- Install --------------------------------- */

export function InstallCard({ className = "" }) {
  const { canInstall, promptInstall, installed } = useInstallPrompt();
  const toast = useToast();

  if (installed) {
    return (
      <div className={cx("install-card", className)}>
        <span className="install-card__icon">
          <Check size={20} />
        </span>
        <div className="grow">
          <strong style={{ fontSize: 13.5 }}>EasyHome is installed</strong>
          <p className="small muted">Launch it from your home screen — even offline.</p>
        </div>
      </div>
    );
  }

  if (!canInstall) return null;

  return (
    <div className={cx("install-card", className)}>
      <span className="install-card__icon">
        <img src={logo} alt="" width="28" height="28" style={{ borderRadius: 8 }} />
      </span>
      <div className="grow">
        <strong style={{ fontSize: 13.5 }}>Install the EasyHome app</strong>
        <p className="small muted">Fast, full-screen and available offline.</p>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          const accepted = await promptInstall();
          if (accepted) toast.success("Installed. Find EasyHome on your home screen.");
        }}
      >
        Install
      </Button>
    </div>
  );
}

/* --------------------------------- Setup ---------------------------------- */

export function SetupScreen() {
  const toast = useToast();
  const snippet = `  VITE_FIREBASE_API_KEY=...
  VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=your-project
  VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`;

  return (
    <div className="setup">
      <div className="setup__card">
        <div className="setup__logo">
          <span>
            <img src={logo} alt="" />
          </span>
          EasyHome
        </div>
        <p className="eyebrow">One-minute setup</p>
        <h1>Connect your Firebase project</h1>
        <p>
          The app shell is ready. Add your Firebase web credentials to start using live data,
          authentication and offline caching.
        </p>

        <div className="setup__steps">
          <div className="setup__step">
            Create a Firebase project and enable <strong>Email/Password</strong> and{" "}
            <strong>Google</strong> sign-in.
          </div>
          <div className="setup__step">
            Create a <strong>Firestore</strong> database for the live catalogue and bookings.
          </div>
          <div className="setup__step">
            Copy <code>.env.example</code> → <code>.env.local</code> and paste your web app keys.
          </div>
          <div className="setup__step">
            Configure Cloudinary credentials in the backend environment to enable image uploads.
          </div>
        </div>

        <pre className="setup__code">{snippet}</pre>

        <div className="row" style={{ marginTop: 18 }}>
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(snippet);
                toast.success("Template copied.");
              } catch {
                toast.error("Copy failed. Select the text manually.");
              }
            }}
          >
            Copy template
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload after saving
          </Button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Misc ----------------------------------- */

export function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="summary-row">
      <span className="row" style={{ gap: 7 }}>
        {Icon ? <Icon size={14} /> : null}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

export function Metric({ icon: Icon, label, value, tone = "plain" }) {
  return (
    <div className={`stat stat--${tone}`}>
      <div className="stat__top">
        <span className="stat__label">{label}</span>
        {Icon ? (
          <span className="stat__icon">
            <Icon size={17} />
          </span>
        ) : null}
      </div>
      <strong className="stat__value">{value}</strong>
    </div>
  );
}

export function PriceTag({ amount, suffix = "budget" }) {
  return (
    <span className="row" style={{ gap: 4, fontWeight: 800 }}>
      <IndianRupee size={14} />
      {Number(amount) || 0} <small className="muted">{suffix}</small>
    </span>
  );
}

export function EmptyPrompt({ icon: Icon = BookOpen, title, body, action }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}

export function MiniStat({ icon: Icon = Users, label, value }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <span className="empty__icon" style={{ width: 38, height: 38, margin: 0, borderRadius: 12 }}>
        <Icon size={17} />
      </span>
      <div>
        <strong style={{ display: "block", fontSize: 15 }}>{value}</strong>
        <span className="tiny muted">{label}</span>
      </div>
    </div>
  );
}

export { API_BASE };
