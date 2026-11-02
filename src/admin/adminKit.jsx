import { Link } from "react-router-dom";
import { useEffect } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertTriangle,
  ArrowUpRight,
  CircleCheck,
  CircleX,
  Clock3,
  Compass,
  Inbox,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Avatar, Button, Input, Modal, Spinner } from "../components/ui";
import { cx, formatDate, inr, timeAgo } from "../lib/format";
import { distanceKm } from "../lib/geo";

/* ---------------------------------- Page --------------------------------- */

export function AdminPage({ eyebrow, title, subtitle, actions, children, className = "" }) {
  return (
    <div className={cx("adm-page", className)}>
      <header className="adm-page__head">
        <div className="adm-page__copy">
          {eyebrow ? <p className="adm-eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {subtitle ? <p className="adm-page__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="adm-page__actions">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClass = "",
  flush = false,
}) {
  return (
    <section className={cx("adm-panel", className)}>
      {title || action ? (
        <header className="adm-panel__head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action ? <div className="adm-panel__action">{action}</div> : null}
        </header>
      ) : null}
      <div className={cx("adm-panel__body", flush && "adm-panel__body--flush", bodyClass)}>
        {children}
      </div>
    </section>
  );
}

/* ---------------------------------- Stats -------------------------------- */

const STAT_TONES = {
  yellow: "adm-stat--yellow",
  green: "adm-stat--green",
  blue: "adm-stat--blue",
  red: "adm-stat--red",
  purple: "adm-stat--purple",
  plain: "",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "plain",
  to,
  onClick,
}) {
  const inner = (
    <>
      <div className="adm-stat__top">
        <span>{label}</span>
        {Icon ? (
          <span className="adm-stat__icon">
            <Icon size={17} />
          </span>
        ) : null}
      </div>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cx("adm-stat", STAT_TONES[tone])}>
        {inner}
      </Link>
    );
  }

  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={cx("adm-stat", STAT_TONES[tone], onClick && "adm-stat--button")}
      onClick={onClick}
    >
      {inner}
    </Tag>
  );
}

/* --------------------------------- Badges -------------------------------- */

const STATUS_MAP = {
  pending: { label: "Pending", tone: "amber" },
  accepted: { label: "Assigned", tone: "blue" },
  ongoing: { label: "In progress", tone: "blue" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
  approved: { label: "Approved", tone: "green" },
  service_completed: { label: "Needs review", tone: "blue" },
  verified: { label: "Verified", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  suspended: { label: "Suspended", tone: "red" },
  paid: { label: "Paid", tone: "blue" },
  active: { label: "Active", tone: "green" },
  expired: { label: "Expired", tone: "muted" },
  not_submitted: { label: "No ID", tone: "muted" },
  online: { label: "Online", tone: "green" },
  offline: { label: "Offline", tone: "muted" },
  urgent: { label: "Urgent", tone: "red" },
  normal: { label: "Normal", tone: "muted" },
  customer: { label: "Customer", tone: "muted" },
  worker: { label: "Worker", tone: "blue" },
  admin: { label: "Admin", tone: "purple" },
};

export function statusLabel(status) {
  return STATUS_MAP[status]?.label || status || "Unknown";
}

export function StatusPill({ status, label, tone }) {
  const meta = STATUS_MAP[status] || {};
  const resolvedTone = tone || meta.tone || "muted";
  return (
    <span className={cx("adm-pill", `adm-pill--${resolvedTone}`)}>
      <span className="adm-pill__dot" />
      {label || meta.label || status}
    </span>
  );
}

/* --------------------------------- Toolbar ------------------------------- */

export function SegTabs({ items, value, onChange, className = "" }) {
  return (
    <div className={cx("adm-tabs", className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          className={value === item.id ? "is-active" : ""}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count !== undefined ? <em>{item.count}</em> : null}
        </button>
      ))}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder = "Search…", onClear }) {
  return (
    <label className="adm-search">
      <Search size={16} />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && onClear ? (
        <button type="button" onClick={onClear} aria-label="Clear search">
          <CircleX size={14} />
        </button>
      ) : null}
    </label>
  );
}

export function Toggle({ checked, onChange, disabled = false, label, hint }) {
  return (
    <label className={cx("adm-toggle-row", disabled && "is-disabled")}>
      <span className="adm-toggle-copy">
        {label ? <strong>{label}</strong> : null}
        {hint ? <small>{hint}</small> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || "Toggle"}
        className={cx("adm-switch", checked && "is-on")}
        onClick={() => onChange?.(!checked)}
        disabled={disabled}
      >
        <span />
      </button>
    </label>
  );
}

/* --------------------------------- Charts -------------------------------- */

export function RevenueChart({ months = [], height = 200, showCommission = true }) {
  const max = Math.max(
    1,
    ...months.map((month) => Number(month.amount) || 0),
    ...months.map(
      (month) => (Number(month.subscriptions) || 0) + (Number(month.commissions) || 0),
    ),
  );

  return (
    <div className="adm-chart">
      <div className="adm-chart__legend">
        <span>
          <i className="is-sub" /> Memberships
        </span>
        {showCommission ? (
          <span>
            <i className="is-com" /> Fees
          </span>
        ) : null}
      </div>
      <div className="adm-chart__plot" style={{ height }}>
        {months.map((month) => {
          const subscriptions = Number(month.subscriptions) || 0;
          const commissions = Number(month.commissions) || 0;
          const total = subscriptions + commissions;
          return (
            <div className="adm-chart__col" key={month.key || month.label}>
              <span className="adm-chart__value">{total ? inr(total) : ""}</span>
              <div className="adm-chart__bar-wrap">
                {showCommission && commissions ? (
                  <span
                    className="adm-chart__bar is-com"
                    style={{ height: `${Math.max(2, (commissions / max) * 100)}%` }}
                    title={`Fees ${inr(commissions)}`}
                  />
                ) : null}
                {subscriptions ? (
                  <span
                    className="adm-chart__bar is-sub"
                    style={{ height: `${Math.max(2, (subscriptions / max) * 100)}%` }}
                    title={`Memberships ${inr(subscriptions)}`}
                  />
                ) : null}
                {!total ? <span className="adm-chart__bar is-empty" /> : null}
              </div>
              <span className="adm-chart__label">{month.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MiniBars({ values = [], tone = "yellow" }) {
  const max = Math.max(1, ...values);
  return (
    <span className="adm-minibars">
      {values.map((value, index) => (
        <i
          key={`${value}-${index}`}
          className={`adm-minibars__bar is-${tone}`}
          style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
        />
      ))}
    </span>
  );
}

/* ---------------------------------- Map ---------------------------------- */

const MAP_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function pinIcon(tone, label) {
  return L.divIcon({
    className: "adm-pin",
    html: `<span class="adm-pin__dot is-${tone}"></span><span class="adm-pin__label">${label}</span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

const PIN_CENTER = pinIcon("center", "Area centre");
const PIN_SECONDARY = pinIcon("secondary", "Customer");
const JOB_PINS = {
  pending: pinIcon("pending", "Pending"),
  active: pinIcon("active", "Active"),
  done: pinIcon("done", "Completed"),
  cancelled: pinIcon("cancelled", "Cancelled"),
};

function jobTone(status) {
  if (status === "accepted" || status === "ongoing") return "active";
  if (status === "completed") return "done";
  if (status === "cancelled") return "cancelled";
  return "pending";
}

function normalizePoint(source) {
  if (!source) return null;
  const lat = Number(source.location?.lat ?? source.lat);
  const lng = Number(source.location?.lng ?? source.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return null;
  }
  return { ...source, lat, lng };
}

function FitView({ signature, center, radiusKm, points }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    const lat = Number(center.lat);
    const lng = Number(center.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const bounds = L.latLng(lat, lng).toBounds(
      Math.max(1200, Number(radiusKm || 10) * 2000),
    );
    points.forEach((point) => bounds.extend([point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [26, 26], maxZoom: 15 });
    // signature captures the exact points/radius so polling re-renders cannot
    // re-centre the map while an admin is panning around.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);

  return null;
}

export function CoverageMap({
  center,
  radiusKm = 10,
  jobs = [],
  secondary = null,
  onSelectJob,
  className = "",
}) {
  const lat = Number(center?.lat);
  const lng = Number(center?.lng);
  const hasCenter = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  const points = jobs.map(normalizePoint).filter(Boolean);
  const secondPoint = normalizePoint(secondary);
  const signature = JSON.stringify({
    c: hasCenter ? [lat, lng] : null,
    r: radiusKm,
    p: points.map((point) => [point.id, point.lat, point.lng]),
    s: secondPoint ? [secondPoint.lat, secondPoint.lng] : null,
  });

  return (
    <div className={cx("adm-map", className)}>
      {hasCenter ? (
        <MapContainer
          key="coverage"
          center={[lat, lng]}
          zoom={13}
          minZoom={4}
          maxZoom={18}
          scrollWheelZoom={false}
          className="adm-map__canvas"
        >
          <TileLayer url={MAP_TILES} attribution="&copy; OpenStreetMap contributors" />
          <Circle
            center={[lat, lng]}
            radius={Math.max(200, Number(radiusKm) * 1000)}
            pathOptions={{
              color: "#ffd60a",
              weight: 1.5,
              opacity: 0.75,
              fillColor: "#ffd60a",
              fillOpacity: 0.06,
            }}
          />
          <Marker position={[lat, lng]} icon={PIN_CENTER}>
            <Tooltip direction="top" offset={[0, -8]}>
              {center?.name || "Area centre"}
            </Tooltip>
          </Marker>
          {secondPoint ? (
            <Marker position={[secondPoint.lat, secondPoint.lng]} icon={PIN_SECONDARY}>
              <Tooltip direction="top" offset={[0, -8]}>
                {secondPoint.name || "Customer location"}
              </Tooltip>
            </Marker>
          ) : null}
          {points.map((job) => (
            <Marker
              key={job.id}
              position={[job.lat, job.lng]}
              icon={JOB_PINS[jobTone(job.status)] || JOB_PINS.pending}
              eventHandlers={
                onSelectJob ? { click: () => onSelectJob(job) } : undefined
              }
            >
              <Popup>
                <strong>{job.service || "Booking"}</strong>
                <br />
                {job.area || job.location?.area || "—"}
                <br />
                <span style={{ textTransform: "capitalize" }}>{job.status || "pending"}</span>
                {onSelectJob ? <div className="adm-pin__hint">Open booking details</div> : null}
              </Popup>
            </Marker>
          ))}
          <FitView
            signature={signature}
            center={hasCenter ? { lat, lng } : null}
            radiusKm={radiusKm}
            points={[secondPoint, ...points].filter(Boolean)}
          />
        </MapContainer>
      ) : (
        <div className="adm-map__empty">
          <Compass size={26} />
          <strong>Select a city</strong>
          <span>Choose a city to preview live coverage.</span>
        </div>
      )}
      <div className="adm-map__hud">
        <span className="adm-map__hud-title">
          <MapPin size={13} /> {center?.name || "No city selected"}
        </span>
        <span className="adm-map__hud-pill">{radiusKm} km</span>
      </div>
      <div className="adm-map__jobs">
        <span>
          <Sparkles size={12} /> {jobs.length} active job{jobs.length === 1 ? "" : "s"} in radius
        </span>
      </div>
    </div>
  );
}

export function jobsWithinRadius(jobs, center, radiusKm) {
  if (!center) return [];
  return jobs.filter((job) => {
    const point = job.location || { lat: job.lat, lng: job.lng };
    const km = distanceKm(center, point);
    return km === null || km <= Number(radiusKm);
  });
}

/* --------------------------------- States -------------------------------- */

export function EmptyBlock({ icon: Icon = Inbox, title, body, action, className = "" }) {
  return (
    <div className={cx("adm-empty", className)}>
      <span className="adm-empty__icon">
        <Icon size={22} />
      </span>
      <strong>{title}</strong>
      {body ? <p>{body}</p> : null}
      {action}
    </div>
  );
}

export function PageError({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="adm-error">
      <span>
        <AlertTriangle size={18} />
      </span>
      <div className="grow">
        <strong>Could not load this section</strong>
        <p>{error.message || String(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingBlock({ label = "Loading…" }) {
  return (
    <div className="adm-loading">
      <Loader2 className="spin" size={22} />
      <span>{label}</span>
    </div>
  );
}

/* -------------------------------- Modals --------------------------------- */

export function ConfirmModal({
  open,
  onClose,
  title,
  subtitle,
  confirmLabel = "Confirm",
  loading = false,
  tone = "danger",
  onConfirm,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "primary" : "primary"}
            onClick={onConfirm}
            loading={loading}
            className={tone === "danger" ? "adm-danger-btn" : ""}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

export function ReasonModal({
  open,
  onClose,
  title,
  subtitle,
  label = "Reason",
  placeholder = "Explain the decision so the user knows what to fix.",
  hint,
  value,
  onChange,
  onSubmit,
  loading = false,
  confirmLabel = "Submit",
  tone = "danger",
  optional = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            loading={loading}
            className={tone === "danger" ? "adm-danger-btn" : ""}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="stack">
        <label className="field">
          <span className="field__label">
            {label}
            {!optional ? <em>*</em> : null}
          </span>
          <textarea
            className="input"
            rows={4}
            maxLength={300}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
          {hint ? <span className="field__hint">{hint}</span> : null}
        </label>
      </div>
    </Modal>
  );
}

/* --------------------------------- Utility ------------------------------- */

export function PersonCell({ name, email, photoPath, meta, admin, size = 36 }) {
  return (
    <div className="adm-person">
      <Avatar name={name} path={photoPath} size={size} ring={admin} />
      <div>
        <strong>{name || "Unnamed"}</strong>
        <span>{email || meta || "—"}</span>
      </div>
    </div>
  );
}

export function TimeCell({ value, showDate = true }) {
  return (
    <span className="adm-time" title={showDate ? formatDate(value) : undefined}>
      <Clock3 size={12} />
      {timeAgo(value) || "—"}
    </span>
  );
}

export function KeyValue({ label, value, tone }) {
  return (
    <div className="adm-kv">
      <span>{label}</span>
      <strong className={tone ? `adm-kv--${tone}` : ""}>{value ?? "—"}</strong>
    </div>
  );
}

export function ViewLink({ to, children = "View" }) {
  return (
    <Link to={to} className="adm-view-link">
      {children} <ArrowUpRight size={13} />
    </Link>
  );
}

export function SpinnerInline() {
  return <Spinner size={14} />;
}

export function CheckLine({ children }) {
  return (
    <span className="adm-checkline">
      <CircleCheck size={13} /> {children}
    </span>
  );
}

export function WarningLine({ children }) {
  return (
    <span className="adm-checkline adm-checkline--warn">
      <ShieldAlert size={13} /> {children}
    </span>
  );
}
