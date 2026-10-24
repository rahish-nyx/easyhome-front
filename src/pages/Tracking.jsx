import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Compass,
  Headphones,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Radio,
  ShieldCheck,
  Star,
  Timer,
  UserRound,
} from "lucide-react";
import { doc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useLiveDoc } from "../hooks/useLive";
import { api } from "../lib/api";
import { distanceKm, distanceLabel, mapsUrl } from "../lib/geo";
import { formatDateTime } from "../lib/format";
import {
  INACTIVITY_MS,
  TRACKING_PHASES,
  TRACKING_META,
  trackingMeta,
} from "../lib/constants";
import { usePageMeta } from "../lib/usePageMeta";
import { Avatar, Badge, EmptyState, PageLoader } from "../components/ui";
import "../styles/tracking.css";

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapSrc(lat, lng) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return "";
  const latitude = Number(lat);
  const longitude = Number(lng);
  const delta = 0.012;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export default function Tracking() {
  usePageMeta(
    "Live job tracking",
    "Follow your EasyHome professional in real time with live status, distance, ETA and contact actions.",
  );

  const { id } = useParams();
  const { fbUser } = useAuth();
  const bookingRef = useMemo(() => (db && id ? doc(db, "bookings", id) : null), [id]);
  const live = useLiveDoc(bookingRef);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!id || !fbUser) return undefined;
    let active = true;
    api
      .get(`/bookings/${id}/tracking`)
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message || "Could not load tracking.");
      });
    return () => {
      active = false;
    };
  }, [id, fbUser, live.data?.trackingPhase, live.data?.workerId]);

  if (live.loading && !live.data && !snapshot) {
    return (
      <div className="page">
        <PageLoader label="Connecting to live tracking…" />
      </div>
    );
  }

  const booking = live.data || snapshot?.booking || null;
  if (!booking) {
    return (
      <div className="page">
        <EmptyState
          icon={Compass}
          title="Tracking not available"
          body={error || "This booking may have been cancelled or you do not have access."}
          action={
            <Link to="/bookings" className="btn btn--dark">
              Back to bookings
            </Link>
          }
        />
      </div>
    );
  }

  const tracking = snapshot?.tracking || {};
  const phase = booking.trackingPhase || tracking.phase || "";
  const meta = trackingMeta(phase, booking.status);
  const worker = tracking.worker || null;
  const workerName = booking.workerName || worker?.name || "EasyHome professional";
  const workerPhone = tracking.counterpartPhone || worker?.phone || "";
  const active = Boolean(booking.activeJob);
  const lastActivity =
    toDate(booking.lastUpdatedTimestamp) ||
    toDate(booking.lastLocationAt) ||
    toDate(booking.acceptedAt) ||
    toDate(booking.createdAt);
  const idleMinutes = lastActivity
    ? Math.max(0, Math.floor((now - lastActivity.getTime()) / 60000))
    : 0;
  const inactive = active && lastActivity && now - lastActivity.getTime() >= INACTIVITY_MS;
  const workerPoint =
    Number.isFinite(Number(booking.currentLat)) &&
    Number.isFinite(Number(booking.currentLng))
      ? { lat: Number(booking.currentLat), lng: Number(booking.currentLng) }
      : null;
  const targetPoint =
    Number.isFinite(Number(booking.location?.lat)) &&
    Number.isFinite(Number(booking.location?.lng))
      ? { lat: Number(booking.location.lat), lng: Number(booking.location.lng) }
      : null;
  const distance = distanceKm(workerPoint, targetPoint);
  const etaMinutes =
    distance === null || ["arrived", "working", "completed"].includes(phase)
      ? null
      : Math.max(1, Math.round((distance / 20) * 60));
  const mapPoint = workerPoint || targetPoint;
  const liveMap = mapSrc(mapPoint?.lat, mapPoint?.lng);
  const phaseIndex = TRACKING_PHASES.findIndex((item) => item.id === phase);
  const done = booking.status === "completed" || phase === "completed";
  const history = Array.isArray(booking.statusHistory)
    ? [...booking.statusHistory].reverse().slice(0, 8)
    : [];

  return (
    <div className="page track-page">
      <div className="track-topbar">
        <Link to="/bookings" className="track-back">
          <ArrowLeft size={16} /> My bookings
        </Link>
        <Badge tone={done ? "green" : inactive ? "red" : "blue"}>
          {done ? <CheckCircle2 size={11} /> : <Radio size={11} />}
          {done ? "Completed" : inactive ? "Checking on pro" : "Live"}
        </Badge>
      </div>

      <header className="track-hero">
        <div className="track-hero__copy">
          <p className="eyebrow">Booking #{booking.id?.slice(0, 8).toUpperCase()}</p>
          <h1>{meta.label}</h1>
          <p>{meta.hint || "Live updates will appear here automatically."}</p>
          <div className="track-hero__facts">
            <span>
              <Clock3 size={14} /> Updated {lastActivity ? formatDateTime(lastActivity) : "—"}
            </span>
            {booking.service ? (
              <span>
                <BadgeCheck size={14} /> {booking.service}
              </span>
            ) : null}
            {booking.area ? (
              <span>
                <MapPin size={14} /> {booking.area}
              </span>
            ) : null}
          </div>
        </div>
        <div className={`track-phase-orb${done ? " is-done" : ""}`}>
          {done ? <CheckCircle2 size={30} /> : <Navigation size={30} />}
          <span>{done ? "Job done" : phase === "working" ? "On site" : "Live route"}</span>
        </div>
      </header>

      {inactive ? (
        <div className="track-alert">
          <ShieldCheck size={18} />
          <div>
            <strong>We are checking on your professional</strong>
            <p>
              No new status update for {idleMinutes} minutes. Our team has been alerted and
              will follow up if needed.
            </p>
          </div>
        </div>
      ) : null}

      <div className="track-grid">
        <section className="track-card track-route">
          <div className="track-card__head">
            <div>
              <p className="eyebrow">Live location</p>
              <h2>{workerPoint ? "Your pro is on the map" : "Waiting for GPS"}</h2>
            </div>
            {workerPoint ? (
              <a
                href={mapsUrl(workerPoint.lat, workerPoint.lng, workerName)}
                target="_blank"
                rel="noreferrer"
                className="btn btn--ghost btn--sm"
              >
                Open maps <ArrowRight size={14} />
              </a>
            ) : null}
          </div>

          {liveMap ? (
            <div className="track-map">
              <iframe
                title="Live professional location"
                src={liveMap}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <span className="track-map__pulse" aria-hidden="true" />
              <span className="track-map__tag">
                <Radio size={12} /> {workerPoint ? "Worker GPS" : "Your location"}
              </span>
            </div>
          ) : (
            <div className="track-map track-map--empty">
              <MapPin size={26} />
              <p>Live GPS will appear once your professional starts the journey.</p>
            </div>
          )}

          <div className="track-metrics">
            <div>
              <span>Distance</span>
              <strong>
                {distance === null ? "—" : distanceLabel(distance)}
              </strong>
            </div>
            <div>
              <span>ETA</span>
              <strong>
                {done
                  ? "Completed"
                  : ["arrived", "working"].includes(phase)
                    ? "On site"
                    : etaMinutes === null
                      ? "Waiting"
                      : `${etaMinutes} min`}
              </strong>
            </div>
            <div>
              <span>Last GPS</span>
              <strong>
                {booking.lastLocationAt ? formatDateTime(toDate(booking.lastLocationAt)) : "—"}
              </strong>
            </div>
          </div>
        </section>

        <aside className="track-side">
          <section className="track-card track-pro">
            <div className="track-pro__top">
              <Avatar name={workerName} path={booking.workerPhotoPath || worker?.photoPath} size={56} />
              <div className="grow">
                <strong>{workerName}</strong>
                <p>
                  {worker?.service || booking.service}
                  {worker?.rating ? (
                    <span className="track-pro__rating">
                      <Star size={11} /> {Number(worker.rating).toFixed(1)}
                    </span>
                  ) : null}
                </p>
              </div>
              <span className={`track-pro__online${active && !done ? " is-on" : ""}`}>
                {active && !done ? "On job" : "EasyHome"}
              </span>
            </div>

            <div className="track-actions">
              {workerPhone ? (
                <a href={`tel:${workerPhone}`} className="track-action track-action--call">
                  <Phone size={18} />
                  <span>
                    <strong>Call pro</strong>
                    <small>Direct line</small>
                  </span>
                </a>
              ) : (
                <span className="track-action is-disabled">
                  <Phone size={18} />
                  <span>
                    <strong>Call pro</strong>
                    <small>Unlocks once assigned</small>
                  </span>
                </span>
              )}
              <Link
                to={`/chat?booking=${booking.id}`}
                className="track-action track-action--chat"
              >
                <MessageSquare size={18} />
                <span>
                  <strong>Chat support</strong>
                  <small>Quote, timing or help</small>
                </span>
              </Link>
            </div>

            <p className="track-pro__note">
              <ShieldCheck size={13} /> Contact details are shared only while your job is
              active.
            </p>
          </section>

          <section className="track-card track-timeline">
            <div className="track-card__head">
              <div>
                <p className="eyebrow">Status history</p>
                <h2>Every update, timestamped</h2>
              </div>
              <Timer size={18} />
            </div>

            <ol className="track-steps">
              {TRACKING_PHASES.map((step, index) => {
                const state =
                  done || (phaseIndex >= 0 && index < phaseIndex)
                    ? "is-done"
                    : index === phaseIndex
                      ? "is-current"
                      : "";
                return (
                  <li key={step.id} className={state}>
                    <span className="track-steps__dot">
                      {state === "is-done" ? <CheckCircle2 size={13} /> : index + 1}
                    </span>
                    <span>{step.label}</span>
                  </li>
                );
              })}
            </ol>

            {history.length ? (
              <div className="track-history">
                {history.map((entry, index) => (
                  <div key={`${entry.phase}-${entry.at || index}`} className="track-history__row">
                    <span className="track-history__dot" />
                    <div>
                      <strong>{entry.label || TRACKING_META[entry.phase]?.label || entry.phase}</strong>
                      <small>{formatDateTime(toDate(entry.at)) || "Just now"}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="tiny muted">Updates will appear as your pro progresses.</p>
            )}
          </section>

          <section className="track-card track-help">
            <div className="track-help__icon">
              <Headphones size={20} />
            </div>
            <div className="grow">
              <strong>Need help right now?</strong>
              <p>Our support team can reach the worker and update you.</p>
            </div>
            <Link
              to={`/chat?booking=${booking.id}`}
              className="btn btn--ghost btn--sm"
            >
              Support
            </Link>
          </section>
        </aside>
      </div>

      {!active && !done && booking.status === "pending" ? (
        <div className="track-pending">
          <UserRound size={20} />
          <div>
            <strong>Waiting for a verified professional</strong>
            <p>We will switch this page to live tracking the moment someone accepts.</p>
          </div>
          <Loader2 size={18} className="spin" />
        </div>
      ) : null}
    </div>
  );
}
