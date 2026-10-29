import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Crosshair,
  IndianRupee,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useLocation } from "../context/LocationContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { SERVICE_META } from "../lib/constants";
import { Button, Field, Input, Select, Textarea } from "../components/ui";

export default function WorkerApply({ existing, onCancel }) {
  const { profile, refreshClaims } = useAuth();
  const { services } = useCatalogue();
  const { city, cities, states, citiesForState } = useLocation();
  const toast = useToast();

  const base = existing || profile || {};
  const [form, setForm] = useState({
    name: base.name || "",
    phone: base.phone || "",
    serviceKey: "",
    secondaryServiceKey: "",
    optionalServiceKey: "",
    state: base.state || city?.state || "",
    city: base.city || city?.name || "",
    areaName: base.areaName || city?.areaName || "",
    pricePerWork: "",
    bio: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [zonePickerOpen, setZonePickerOpen] = useState(false);
  const [zones, setZones] = useState([]);
  const [zoneLoading, setZoneLoading] = useState(false);
  const selectedCityForZone = cities.find(
    (item) => item.name === form.city && (!form.state || item.state?.toLowerCase() === String(form.state).toLowerCase()),
  );

  useEffect(() => {
    if (!form.serviceKey && services.length) {
      setForm((prev) => ({ ...prev, serviceKey: services[0].key }));
    }
  }, [services, form.serviceKey]);

  const stateCities = citiesForState(form.state);
  const selectedCity = cities.find(
    (item) =>
      item.name === form.city &&
      (!form.state ||
        !item.state ||
        item.state.toLowerCase() === String(form.state).toLowerCase()),
  );
  const areaOptions = (selectedCity?.localAreas || [])
    .map((area) => (typeof area === "string" ? area : area?.name))
    .filter(Boolean);

  const set = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const chooseState = (state) => {
    const nextCity = citiesForState(state)[0];
    const nextArea = (nextCity?.localAreas || [])
      .map((area) => (typeof area === "string" ? area : area?.name))
      .filter(Boolean)[0];
    setForm((prev) => ({
      ...prev,
      state,
      city: nextCity?.name || "",
      areaName: nextArea || "",
    }));
  };

  const chooseCity = (name) => {
    const nextCity = cities.find((item) => item.name === name);
    const nextArea = (nextCity?.localAreas || [])
      .map((area) => (typeof area === "string" ? area : area?.name))
      .filter(Boolean)[0];
    setForm((prev) => ({
      ...prev,
      city: name,
      state: nextCity?.state || prev.state,
      areaName: nextArea || "",
    }));
  };

  const capture = async () => {
    if (!navigator.geolocation) {
      toast.error("This device does not support location.");
      return;
    }
    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      setCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      toast.success("Location captured. This helps match nearby jobs.");
    } catch {
      toast.error("Location permission was not granted. You can still apply.");
    } finally {
      setLocating(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.name.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!form.serviceKey) {
      setError("Choose your trade.");
      return;
    }
    if (!form.state.trim() || !form.city.trim() || !form.areaName.trim()) {
      setError("Choose your state, city and local area.");
      return;
    }

    setBusy(true);
    try {
      const service = services.find((item) => item.key === form.serviceKey);
      await api.post("/auth/worker/apply", {
        name: form.name.trim(),
        phone: form.phone,
        service: service?.name || SERVICE_META[form.serviceKey]?.name || form.serviceKey,
        serviceKey: form.serviceKey,
        trades: [
          form.serviceKey,
          ...(form.secondaryServiceKey ? [form.secondaryServiceKey] : []),
          ...(form.optionalServiceKey ? [form.optionalServiceKey] : []),
        ].filter(Boolean),
        area: `${form.areaName.trim()}, ${form.city.trim()}`,
        areaName: form.areaName.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pricePerWork: Number(form.pricePerWork) || 199,
        bio: form.bio.trim(),
        lat: coords?.lat ?? selectedCity?.lat ?? city?.lat ?? null,
        lng: coords?.lng ?? selectedCity?.lng ?? city?.lng ?? null,
      });
      await refreshClaims();
      toast.success("Application submitted. We will review it shortly.");
      onCancel?.();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wk-panel wk-panel--apply">
      <div className="wk-panel__head">
        <p className="wk-eyebrow">
          <Sparkles size={13} /> Worker application
        </p>
        <h2>Apply in two minutes.</h2>
        <p>
          Tell us your trade and the area you serve. Our team reviews every application before
          your profile goes live.
        </p>
      </div>

      <div className="wk-apply-steps">
        <span className="is-done">
          <BadgeCheck size={14} /> Account created
        </span>
        <span>
          <BriefcaseBusiness size={14} /> Trade details
        </span>
        <span>
          <ShieldCheck size={14} /> Team review
        </span>
      </div>

      {error ? (
        <div className="wk-alert wk-alert--error" role="alert">
          {error}
        </div>
      ) : null}

      <form className="wk-form" onSubmit={submit}>
        <div className="wk-form-grid">
          <Field label="Full name" htmlFor="apply-name" required>
            <Input
              id="apply-name"
              value={form.name}
              maxLength={80}
              onChange={set("name")}
              placeholder="Raees Khan"
              required
            />
          </Field>
          <Field label="Mobile number" htmlFor="apply-phone" required>
            <Input
              id="apply-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                }))
              }
              placeholder="9876543210"
              required
            />
          </Field>
          <Field label="Your trade (required)" htmlFor="apply-service" required>
            <Select id="apply-service" value={form.serviceKey} onChange={set("serviceKey")}>
              <option value="">Select trade…</option>
              {services.map((service) => (
                <option key={service.key} value={service.key}>
                  {service.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Second trade (optional)" htmlFor="apply-service-2">
            <Select id="apply-service-2" value={form.secondaryServiceKey} onChange={set("secondaryServiceKey")}>
              <option value="">— None —</option>
              {services.map((service) => (
                <option key={service.key} value={service.key}>
                  {service.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Third trade (optional)" htmlFor="apply-service-3">
            <Select id="apply-service-3" value={form.optionalServiceKey} onChange={set("optionalServiceKey")}>
              <option value="">— None —</option>
              {services.map((service) => (
                <option key={service.key} value={service.key}>
                  {service.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Starting price (₹)" htmlFor="apply-price">
            <Input
              id="apply-price"
              type="number"
              min={0}
              max={100000}
              value={form.pricePerWork}
              onChange={set("pricePerWork")}
              placeholder="299"
            />
          </Field>
          <Field label="State" htmlFor="apply-state" required>
            <Select id="apply-state" value={form.state} onChange={(event) => chooseState(event.target.value)}>
              <option value="">Select a state…</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
              {form.state && !states.includes(form.state) ? (
                <option value={form.state}>{form.state}</option>
              ) : null}
            </Select>
          </Field>
          <Field label="City" htmlFor="apply-city" required>
            <Select id="apply-city" value={form.city} onChange={(event) => chooseCity(event.target.value)}>
              <option value="">Select a city…</option>
              {stateCities.map((item) => (
                <option key={item.id || item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
              {form.city && !stateCities.some((item) => item.name === form.city) ? (
                <option value={form.city}>{form.city}</option>
              ) : null}
            </Select>
          </Field>
          <Field
            label="Local area"
            htmlFor="apply-area"
            hint="The neighbourhood you can reach for jobs."
            required
            className="wk-span-2"
          >
            <Select
              id="apply-area"
              value={form.areaName}
              onChange={set("areaName")}
            >
              <option value="">Select a local area…</option>
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
              {form.areaName && !areaOptions.includes(form.areaName) ? (
                <option value={form.areaName}>{form.areaName}</option>
              ) : null}
            </Select>
          </Field>
          <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              className="btn-link"
              onClick={async () => {
                setZonePickerOpen(true);
                setZoneLoading(true);
                try {
                  const res = await api.get("/public/bootstrap");
                  const data = await res.json?.() || res;
                  setZones((data.zones || []).filter((z) => z.isActive !== false));
                } catch {
                  setZones([]);
                } finally {
                  setZoneLoading(false);
                }
              }}
            >
              Change service zone
            </button>
            {form.areaName && (
              <span style={{ fontSize: 13, color: "#555" }}>
                {form.areaName}{form.city ? `, ${form.city}` : ""}
              </span>
            )}
          </div>
          {zonePickerOpen && (
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, background: "#f8f9fa", marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontSize: 14 }}>Select service zone</strong>
                <button type="button" onClick={() => { setZonePickerOpen(false); setZones([]); }} style={{ fontSize: 12 }}>
                  Close
                </button>
              </div>
              {zoneLoading ? (
                <div style={{ fontSize: 13, color: "#777" }}>Loading zones…</div>
              ) : zones.length === 0 ? (
                <div style={{ fontSize: 13, color: "#777" }}>No zones available.</div>
              ) : (
                <div style={{ maxHeight: 220, overflow: "auto" }}>
                  {zones.map((z) => (
                    <button
                      key={z.id || z.name}
                      type="button"
                      style={{ display: "block", width: "100%", textAlign: "left", padding: 8, border: "none", background: "transparent", borderBottom: "1px solid #eee", cursor: "pointer", fontSize: 13 }}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          city: z.city || z.name || prev.city,
                          state: z.state || prev.state,
                          areaName: z.name || z.area || prev.areaName,
                        }));
                        setZonePickerOpen(false);
                        setZones([]);
                      }}
                    >
                      <strong>{z.name || z.area}</strong>
                      {z.city ? ` — ${z.city}` : ""}{z.state ? `, ${z.state}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <Field
            label="Short bio (optional)"
            htmlFor="apply-bio"
            hint={`${form.bio.length}/400 — experience, specialties, languages`}
            className="wk-span-2"
          >
            <Textarea
              id="apply-bio"
              rows={3}
              maxLength={400}
              value={form.bio}
              onChange={set("bio")}
              placeholder="8 years of plumbing experience. Specialise in leak detection and bathroom fittings. Hindi and English."
            />
          </Field>
        </div>

        <button type="button" className="wk-location-btn" onClick={capture} disabled={locating}>
          <Crosshair size={16} />
          {locating
            ? "Capturing location…"
            : coords
              ? `Location pinned · ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`
              : "Pin my location (optional)"}
        </button>

        <div className="wk-apply-perks">
          <span>
            <CheckCircle2 size={14} /> Keep more of every job
          </span>
          <span>
            <MapPin size={14} /> Local jobs near you
          </span>
          <span>
            <IndianRupee size={14} /> Transparent payouts
          </span>
        </div>

        <Button type="submit" size="lg" className="wk-btn wk-btn--primary wk-btn--block" loading={busy}>
          Submit application <ArrowRight size={17} />
        </Button>

        <p className="wk-fineprint">
          Applying does not guarantee work. EasyHome reviews identity and trade details before
          activating an account. You can upload a government ID after applying.
        </p>
      </form>

      <p className="wk-fineprint">
        Have an account?{" "}
        <Link to="/auth?next=%2Fworker" style={{ color: "#7aa2ff" }}>
          Sign in as a worker
        </Link>
        .
      </p>
    </div>
  );
}
