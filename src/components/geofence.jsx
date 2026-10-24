import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Loader2,
  MapPin,
  Navigation,
  X,
} from "lucide-react";
import "../styles/zones.css";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { OUT_OF_ZONE_MESSAGE, formatZoneDistance } from "../lib/zones";

export function OutOfZoneModal({
  open,
  onClose,
  onChangeLocation,
  cityName = "",
  state = "",
  nearestZone = "",
  distanceMeters = null,
  coords = null,
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setJoining(false);
      setError("");
      return;
    }
    setForm((current) => ({
      ...current,
      name: current.name || profile?.name || "",
      phone: current.phone || profile?.phone || "",
      email: current.email || profile?.email || "",
    }));
  }, [open, profile?.name, profile?.phone, profile?.email]);

  const nearestCopy = useMemo(() => {
    if (!nearestZone) return "";
    const distance = formatZoneDistance(distanceMeters);
    return distance
      ? `${nearestZone} is the nearest live zone, about ${distance} away.`
      : `The nearest live zone is ${nearestZone}.`;
  }, [nearestZone, distanceMeters]);

  if (!open) return null;

  const submitWaitlist = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").slice(-10))) {
      return setError("Enter a valid 10-digit mobile number.");
    }
    setSubmitting(true);
    try {
      await api.post("/public/waitlist", {
        name: form.name.trim(),
        phone: form.phone,
        email: form.email.trim(),
        cityName: cityName || profile?.city || "",
        state,
        lat: Number.isFinite(Number(coords?.lat)) ? Number(coords.lat) : null,
        lng: Number.isFinite(Number(coords?.lng)) ? Number(coords.lng) : null,
        message: form.message.trim(),
      });
      setDone(true);
      toast.success("You are on the list. We will notify you when we go live.");
    } catch (submitError) {
      setError(submitError.message || "Could not join the waitlist right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="zone-gate" role="dialog" aria-modal="true" aria-labelledby="zone-gate-title">
      <div className="zone-gate__glow" aria-hidden="true" />
      <div className="zone-gate__card">
        <button type="button" className="zone-gate__close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="zone-gate__mark" aria-hidden="true">
          <MapPin size={26} />
          <span className="zone-gate__ping" />
        </div>

        <p className="zone-gate__eyebrow">Service coverage</p>
        <h2 id="zone-gate-title">We are expanding to your neighbourhood</h2>
        <p className="zone-gate__message">{OUT_OF_ZONE_MESSAGE}</p>
        <p className="zone-gate__sub">
          {nearestCopy ||
            "Our verified professionals are currently live in selected service zones."}
        </p>

        {done ? (
          <div className="zone-gate__done">
            <CheckCircle2 size={30} />
            <div>
              <strong>You are on the waitlist</strong>
              <p>We will alert you as soon as EasyHome goes live around you.</p>
            </div>
          </div>
        ) : joining ? (
          <form className="zone-waitlist" onSubmit={submitWaitlist}>
            <div className="zone-waitlist__row">
              <label>
                <span>Full name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>
              <label>
                <span>Mobile number</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  placeholder="10-digit mobile"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </label>
            </div>
            <label>
              <span>Email <em>optional</em></span>
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </label>
            <label>
              <span>Anything we should know? <em>optional</em></span>
              <textarea
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder={`e.g. I need cleaning in ${cityName || "my area"}`}
                rows={2}
                maxLength={300}
              />
            </label>
            {error ? <p className="zone-gate__error">{error}</p> : null}
            <div className="zone-waitlist__actions">
              <button type="button" className="zone-btn zone-btn--ghost" onClick={() => setJoining(false)}>
                Back
              </button>
              <button type="submit" className="zone-btn zone-btn--primary" disabled={submitting}>
                {submitting ? <Loader2 size={17} className="spin" /> : <CheckCircle2 size={17} />}
                {submitting ? "Joining…" : "Confirm waitlist"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="zone-gate__actions">
              <button type="button" className="zone-btn zone-btn--primary" onClick={() => setJoining(true)}>
                <Compass size={18} /> Join the waitlist <ArrowRight size={16} />
              </button>
              <button type="button" className="zone-btn zone-btn--ghost" onClick={onChangeLocation}>
                <Navigation size={17} /> Change location
              </button>
            </div>
            <button type="button" className="zone-gate__browse" onClick={onClose}>
              Browse services instead
            </button>
          </>
        )}

        <p className="zone-gate__fineprint">
          Current location: {cityName || "Selected area"}{state ? `, ${state}` : ""}. You can
          join the waitlist now and update your location later.
        </p>
      </div>
    </div>,
    document.body,
  );
}
