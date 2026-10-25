import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { doc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useLocation } from "../context/LocationContext";
import { useToast } from "../context/ToastContext";
import { useLiveDoc } from "../hooks/useLive";
import { api } from "../lib/api";
import { inr } from "../lib/format";
import { SERVICE_META } from "../lib/constants";
import { OUT_OF_ZONE_MESSAGE, evaluateZones } from "../lib/zones";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Avatar,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from "../components/ui";
import { ImageUpload, ServiceIcon } from "../components/common";

export default function Booking() {
  usePageMeta(
    "Book a home service",
    "Describe the job, set a budget and get matched with a verified EasyHome professional.",
  );

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { services } = useCatalogue();
  const {
    city,
    zones,
    coords: savedCoords,
    setCoords: setGlobalCoords,
    showZoneNotice,
    openPicker,
  } = useLocation();
  const { profile, fbUser, emailVerified, isPremium, resendVerification } = useAuth();

  const initialKey = params.get("service") || "";
  const preferredWorkerId = params.get("worker") || "";
  const initialUrgency = params.get("urgency") === "urgent" ? "urgent" : "normal";

  const [serviceKey, setServiceKey] = useState(initialKey || services[0]?.key || "");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState(
    [city?.areaName, city?.name, profile?.addresses?.[0]?.area]
      .filter(Boolean)
      .join(", "),
  );
  const [phone, setPhone] = useState(profile?.phone || "");
  const [budget, setBudget] = useState("");
  const [urgency, setUrgency] = useState(initialUrgency);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const service =
    services.find((item) => item.key === serviceKey) ||
    services[0] || {
      key: initialKey || "cleaning",
      name: SERVICE_META[initialKey]?.name || "Home service",
      fromPrice: SERVICE_META[initialKey]?.from || 199,
      icon: SERVICE_META[initialKey]?.icon || "wrench",
    };
  const minimum = Math.max(99, Number(service.fromPrice) || 199);
  const budgetAmount = Math.max(minimum, Number(budget) || minimum);
  const urgentFee =
    urgency === "urgent" && !isPremium
      ? Math.round(budgetAmount * 0.1)
      : 0;
  const estimatedTotal = budgetAmount + urgentFee;

  const workerRef = useMemo(
    () => (preferredWorkerId && db ? doc(db, "workersPublic", preferredWorkerId) : null),
    [preferredWorkerId],
  );
  const workerState = useLiveDoc(workerRef);
  const preferredWorker = workerState.data;

  useEffect(() => {
    if (!serviceKey && services.length) setServiceKey(services[0].key);
  }, [serviceKey, services]);

  // A stale budget from a previous (cheaper/expensive) service is a classic
  // source of rejected bookings — reset it whenever the trade changes.
  useEffect(() => {
    setBudget(String(minimum));
  }, [minimum]);

  useEffect(() => {
    if (!profile?.phone) return;
    setPhone((current) => current || profile.phone);
  }, [profile?.phone]);

  useEffect(() => {
    if (!city?.name) return;
    setArea(
      (current) =>
        current ||
        [city.areaName, city.name].filter(Boolean).join(", "),
    );
  }, [city?.name, city?.areaName]);

  const captureLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("This device does not support location.");
      return;
    }
    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
        });
      });
      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy || 0),
      };
      setCoords(point);
      setGlobalCoords(point, "gps");

      const check = evaluateZones(zones, {
        lat: point.lat,
        lng: point.lng,
        cityName: city?.name,
        state: city?.state,
        areaName: city?.areaName,
      });
      if (check.configured && !check.allowed) {
        showZoneNotice(check, point);
        toast.error(OUT_OF_ZONE_MESSAGE);
        return;
      }
      toast.success("Location pinned. We will match pros around you.");
    } catch (error) {
      toast.error(
        error.code === 1
          ? "Location permission denied. Enter your area manually."
          : "Could not get your location. Try again.",
      );
    } finally {
      setLocating(false);
    }
  };

  const clearLocation = () => {
    setCoords(null);
    setGlobalCoords(null);
  };

  const bookingPoint =
    coords ||
    (savedCoords?.source === "gps" && Number.isFinite(Number(savedCoords.lat))
      ? savedCoords
      : null);

  const currentZoneCheck = useMemo(
    () =>
      evaluateZones(zones, {
        lat: bookingPoint?.lat ?? city?.lat,
        lng: bookingPoint?.lng ?? city?.lng,
        cityName: city?.name,
        state: city?.state,
        areaName: city?.areaName,
      }),
    [
      zones,
      bookingPoint?.lat,
      bookingPoint?.lng,
      city?.lat,
      city?.lng,
      city?.name,
      city?.state,
      city?.areaName,
    ],
  );

  const validate = () => {
    const next = {};
    if (!serviceKey) next.service = "Choose a service.";
    if (description.trim().length < 10) {
      next.description = "Add at least 10 characters so the pro knows what to bring.";
    }
    if (area.trim().length < 2) next.area = "Tell us the area or address.";
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, "").slice(-10))) {
      next.phone = "Enter a valid 10-digit Indian mobile number.";
    }
    const amount = Number(budget);
    if (!Number.isFinite(amount) || amount < minimum) {
      next.budget = `The minimum budget for ${service.name} is ${inr(minimum)}.`;
    }
    if (amount > 100000) next.budget = "The maximum budget is ₹1,00,000.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!emailVerified) {
      toast.error("Verify your email before booking. Check your inbox or resend below.");
      return;
    }
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    if (currentZoneCheck.configured && !currentZoneCheck.allowed) {
      showZoneNotice(currentZoneCheck, bookingPoint || city);
      toast.error(OUT_OF_ZONE_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("service", service.name);
      form.append("serviceKey", service.key);
      form.append("description", description.trim());
      form.append("area", area.trim());
      form.append("phone", phone.replace(/\D/g, "").slice(-10));
      form.append("budget", String(Math.round(Number(budget))));
      form.append("urgency", urgency);
      form.append("addressLabel", addressLabel);
      if (preferredWorkerId) form.append("preferredWorkerId", preferredWorkerId);
      if (city?.name) form.append("city", city.name);
      if (city?.state) form.append("state", city.state);
      if (city?.areaName) form.append("areaName", city.areaName);
      if (bookingPoint) {
        form.append("lat", String(bookingPoint.lat));
        form.append("lng", String(bookingPoint.lng));
      }
      if (image) form.append("image", image);

      const result = await api.upload("/bookings", form);
      toast.success("Request sent. Matching you with a verified pro now.");
      navigate(`/bookings?created=${result.booking?.id || ""}`);
    } catch (error) {
      toast.error(error.message);
      if (error.code === "EMAIL_NOT_VERIFIED") {
        toast.info("Verify your email, then try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">New request · 60 seconds</p>
          <h1>Tell us what needs fixing.</h1>
          <p>
            A verified pro will accept your request, quote a final price and confirm before
            starting. Pay only after the job is done.
          </p>
        </div>
        <Link to="/services" className="btn btn--ghost btn--sm">
          Browse services <ArrowRight size={15} />
        </Link>
      </div>

      {!emailVerified ? (
        <div className="inline-error" style={{ background: "var(--amber-soft)", color: "var(--amber)", marginBottom: 18 }}>
          <AlertTriangle size={18} />
          <div className="grow">
            <strong>Verify your email to confirm bookings</strong>
            <p style={{ color: "var(--amber)" }}>
              We sent a link to <strong>{fbUser?.email}</strong>. This protects customers and
              workers from fake requests.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            loading={resending}
            onClick={async () => {
              setResending(true);
              try {
                await resendVerification();
                toast.success("Verification email sent again.");
              } catch (error) {
                toast.error(error.message);
              } finally {
                setResending(false);
              }
            }}
          >
            Resend
          </Button>
        </div>
      ) : null}

      {currentZoneCheck.configured ? (
        currentZoneCheck.allowed ? (
          <div className="service-zone-banner is-live">
            <ShieldCheck size={19} />
            <div className="grow">
              <strong>
                Live in {currentZoneCheck.zone?.cityName || city?.name || "your area"}
              </strong>
              <p>Verified professionals are available around this location.</p>
            </div>
          </div>
        ) : (
          <div className="service-zone-banner is-blocked">
            <AlertTriangle size={20} />
            <div className="grow">
              <strong>We are not live in this location yet</strong>
              <p>{OUT_OF_ZONE_MESSAGE}</p>
            </div>
            <div className="service-zone-banner__actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => showZoneNotice(currentZoneCheck, bookingPoint || city)}
              >
                Join waitlist
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={openPicker}>
                Change location
              </button>
            </div>
          </div>
        )
      ) : null}

      <form onSubmit={submit} className="booking-layout">
        <div className="card booking-form-card">
          <div className="form-section">
            <h2 className="form-section__title">
              <span className="form-section__num">1</span> What do you need?
            </h2>
            <div className="form-grid">
              <Field label="Service" htmlFor="service" error={errors.service} required>
                <Select
                  id="service"
                  value={serviceKey}
                  onChange={(event) => setServiceKey(event.target.value)}
                >
                  {services.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.name} — from {inr(item.fromPrice || SERVICE_META[item.key]?.from || 199)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Address label" htmlFor="addressLabel">
                <Select
                  id="addressLabel"
                  value={addressLabel}
                  onChange={(event) => setAddressLabel(event.target.value)}
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>

              <Field
                label="Describe the job"
                htmlFor="description"
                hint={`${description.length}/600 · mention size, access and materials`}
                error={errors.description}
                required
                className="span-2"
              >
                <Textarea
                  id="description"
                  value={description}
                  maxLength={600}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Example: 2BHK deep clean before moving in. Kitchen chimney and two bathrooms need extra attention. Lift available."
                />
              </Field>

              <Field label="Area / address" htmlFor="area" error={errors.area} required className="span-2">
                <Input
                  id="area"
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                  placeholder="House / flat, street, locality, landmark"
                />
              </Field>
            </div>

            <div className="location-capture" style={{ marginTop: 12 }}>
              <MapPin size={15} />
              <span className="grow">
                {bookingPoint
                  ? `Pinned${
                      Number.isFinite(Number(bookingPoint.accuracy))
                        ? ` ±${Math.round(bookingPoint.accuracy)} m`
                        : ""
                    } · ${Number(bookingPoint.lat).toFixed(4)}, ${Number(bookingPoint.lng).toFixed(4)}`
                  : city?.name
                    ? `Serving in ${city.name}. Pin your exact location for faster matching.`
                    : "Pin your exact location for faster matching."}
              </span>
              {bookingPoint ? (
                <button type="button" className="btn btn--ghost btn--sm" onClick={clearLocation}>
                  <X size={14} /> Clear
                </button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={locating}
                onClick={captureLocation}
                icon={Crosshair}
              >
                {bookingPoint ? "Update location" : "Use my location"}
              </Button>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section__title">
              <span className="form-section__num">2</span> Budget & urgency
            </h2>
            <div className="form-grid">
              <Field
                label="Your budget (₹)"
                htmlFor="budget"
                hint={`Minimum ${inr(minimum)} for ${service.name}. You can adjust after the pro quotes.`}
                error={errors.budget}
                required
              >
                <Input
                  id="budget"
                  type="number"
                  inputMode="numeric"
                  min={minimum}
                  max={100000}
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                />
              </Field>
              <Field label="Contact number" htmlFor="phone" error={errors.phone} required>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="10-digit mobile number"
                />
              </Field>
            </div>

            <div className="urgency-grid" style={{ marginTop: 14 }}>
              {[
                {
                  id: "normal",
                  title: "Normal",
                  sub: "Within 24 hours · standard rate",
                },
                {
                  id: "urgent",
                  title: "Urgent",
                  sub: isPremium
                    ? "ASAP · 10% priority fee waived for members"
                    : "ASAP · priority dispatch + 10% fee",
                },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`urgency-option${urgency === option.id ? " is-active" : ""}`}
                  onClick={() => setUrgency(option.id)}
                >
                  <strong>{option.title}</strong>
                  <small>{option.sub}</small>
                </button>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <ImageUpload
                value={image}
                onChange={setImage}
                label="Add a photo (optional)"
                hint="A picture helps the pro bring the right tools. Up to 5 MB."
              />
            </div>
          </div>

          {preferredWorkerId ? (
            <div className="form-section">
              <h2 className="form-section__title">
                <span className="form-section__num">3</span> Preferred professional
              </h2>
              {preferredWorker ? (
                <div className="row row--between" style={{ gap: 12, flexWrap: "wrap" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar
                      name={preferredWorker.name}
                      path={preferredWorker.photoPath}
                      size={44}
                    />
                    <div>
                      <strong style={{ fontSize: 14 }}>{preferredWorker.name}</strong>
                      <p className="tiny muted">
                        {preferredWorker.service} · {preferredWorker.area}
                      </p>
                    </div>
                  </div>
                  <Link to={`/workers/${preferredWorker.id}`} className="btn btn--outline btn--sm">
                    View profile
                  </Link>
                </div>
              ) : (
                <div className="row small muted">
                  <Loader2 size={15} className="spin" /> Loading preferred pro…
                </div>
              )}
              <p className="tiny muted" style={{ marginTop: 8 }}>
                This request will be sent to {preferredWorker?.name || "this professional"} first.
                If they cannot take it, matching continues with other verified pros.
              </p>
            </div>
          ) : null}
        </div>

        <aside className="card booking-summary">
          <div className="booking-summary__service">
            <span className="booking-summary__icon">
              <ServiceIcon service={service} size={48} iconSize={23} />
            </span>
            <div>
              <strong style={{ fontSize: 15 }}>{service.name}</strong>
              <p className="tiny muted">{urgency === "urgent" ? "Urgent dispatch" : "Standard visit"}</p>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="summary-row">
              <span>Service</span>
              <strong>{service.name}</strong>
            </div>
            <div className="summary-row">
              <span>City</span>
              <strong>{city?.name || "—"}</strong>
            </div>
            <div className="summary-row">
              <span>Area</span>
              <strong style={{ maxWidth: "60%", textAlign: "right" }}>{area || "—"}</strong>
            </div>
            <div className="summary-row">
              <span>Coverage</span>
              <strong
                style={{
                  color: currentZoneCheck.allowed ? "var(--green)" : "var(--red)",
                }}
              >
                {currentZoneCheck.configured
                  ? currentZoneCheck.allowed
                    ? "Live"
                    : "Not yet"
                  : "Available"}
              </strong>
            </div>
            <div className="summary-row">
              <span>Urgency</span>
              <strong>{urgency === "urgent" ? "ASAP" : "Within 24h"}</strong>
            </div>
            <div className="summary-row">
              <span>Your budget</span>
              <strong>{inr(budget || minimum)}</strong>
            </div>
            {urgency === "urgent" ? (
              <div className="summary-row">
                <span>Urgent priority fee</span>
                <strong style={{ color: urgentFee ? "var(--red)" : "var(--green)" }}>
                  {urgentFee ? inr(urgentFee) : "Waived"}
                </strong>
              </div>
            ) : null}
            {urgency === "urgent" ? (
              <div className="summary-row">
                <span>Estimated total</span>
                <strong>{inr(estimatedTotal)}</strong>
              </div>
            ) : null}
          </div>

          <div className="summary-total">
            <span>Agreed price</span>
            <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
              after quote
            </span>
          </div>

          <div className="summary-note">
            <ShieldCheck size={16} style={{ flexShrink: 0, color: "var(--green)" }} />
            <span>
              No advance payment. The final price is agreed in the app before work starts.
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="btn--block"
            loading={submitting}
            disabled={
              !emailVerified ||
              (currentZoneCheck.configured && !currentZoneCheck.allowed)
            }
            icon={Send}
            style={{ marginTop: 14 }}
          >
            Send request
          </Button>

          {!emailVerified ? (
            <p className="tiny muted" style={{ marginTop: 8, textAlign: "center" }}>
              Verify your email above to enable booking.
            </p>
          ) : currentZoneCheck.configured && !currentZoneCheck.allowed ? (
            <p className="tiny muted" style={{ marginTop: 8, textAlign: "center" }}>
              Booking is blocked until you choose a live service location.
            </p>
          ) : (
            <p className="tiny muted" style={{ marginTop: 8, textAlign: "center" }}>
              You will be notified the moment a pro accepts.
            </p>
          )}

          <div className="row" style={{ justifyContent: "center", gap: 12, marginTop: 14 }}>
            <span className="tiny muted row" style={{ gap: 4 }}>
              <BadgeCheck size={12} /> ID-verified
            </span>
            <span className="tiny muted row" style={{ gap: 4 }}>
              <Wallet size={12} /> Pay after
            </span>
            <span className="tiny muted row" style={{ gap: 4 }}>
              <Phone size={12} /> Private contact
            </span>
          </div>
        </aside>
      </form>

      <section className="section">
        <div className="urgent-placeholder">
          {[
            {
              icon: CheckCircle2,
              title: "Matched with one pro",
              body: "No bidding wars. One verified professional takes ownership of your booking.",
            },
            {
              icon: Sparkles,
              title: "Price agreed first",
              body: "Accept the quote or send one counter-offer before any work begins.",
            },
            {
              icon: ShieldCheck,
              title: "Support included",
              body: "Something off? EasyHome support steps in for every confirmed job.",
            },
          ].map((item) => (
            <div className="urgent-mini" key={item.title}>
              <span className="urgent-mini__icon">
                <item.icon size={20} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.body}</small>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
