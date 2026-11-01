import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Crosshair,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useLocation } from "../context/LocationContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { SERVICE_META } from "../lib/constants";
import { Button, Field, Input, Select, Textarea } from "../components/ui";

const MAX_TRADES = 3;

function uniqueTrades(list) {
  return [...new Set(list.filter(Boolean))].slice(0, MAX_TRADES);
}

export default function WorkerApply({ existing, onCancel }) {
  const { profile, refreshClaims } = useAuth();
  const { services } = useCatalogue();
  const { city, cities, states, citiesForState } = useLocation();
  const toast = useToast();

  const base = existing || profile || {};
  const savedTrades = uniqueTrades(
    Array.isArray(base.trades) ? base.trades : [base.serviceKey].filter(Boolean),
  );

  const [form, setForm] = useState({
    name: base.name || "",
    phone: base.phone || "",
    serviceKey: savedTrades[0] || "",
    secondaryServiceKey: savedTrades[1] || "",
    optionalServiceKey: savedTrades[2] || "",
    state: base.state || city?.state || "",
    city: base.city || city?.name || "",
    areaName: base.areaName || city?.areaName || "",
    pricePerWork: base.pricePerWork ? String(base.pricePerWork) : "",
    bio: base.bio || "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);

  // Service-zone picker
  const [zonePickerOpen, setZonePickerOpen] = useState(false);
  const [zones, setZones] = useState([]);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneError, setZoneError] = useState("");
  const [zoneQuery, setZoneQuery] = useState("");

  const stateCities = citiesForState(form.state);
  const selectedCity = useMemo(
    () =>
      cities.find(
        (item) =>
          item.name === form.city &&
          (!form.state ||
            !item.state ||
            item.state.toLowerCase() === String(form.state).toLowerCase()),
      ),
    [cities, form.city, form.state],
  );
  const areaOptions = useMemo(
    () =>
      (selectedCity?.localAreas || [])
        .map((area) => (typeof area === "string" ? area : area?.name))
        .filter(Boolean),
    [selectedCity],
  );

  const filteredZones = useMemo(() => {
    const query = zoneQuery.trim().toLowerCase();
    if (!query) return zones;
    return zones.filter((zone) =>
      [zone.label, zone.cityName, zone.areaName, zone.state]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [zones, zoneQuery]);

  useEffect(() => {
    if (!form.serviceKey && services.length) {
      setForm((prev) => ({ ...prev, serviceKey: services[0].key }));
    }
  }, [services, form.serviceKey]);

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

  const tradeOptions = (slot) =>
    services.filter((service) => {
      if (service.key === form[slot]) return true;
      const chosen = uniqueTrades([
        form.serviceKey,
        form.secondaryServiceKey,
        form.optionalServiceKey,
      ]);
      return !chosen.includes(service.key);
    });

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

  const openZonePicker = async () => {
    setZonePickerOpen(true);
    if (zones.length) return;
    setZoneLoading(true);
    setZoneError("");
    try {
      const data = await api.get("/public/zones");
      setZones(Array.isArray(data?.zones) ? data.zones : []);
    } catch (loadError) {
      // Older API deployments do not expose /public/zones yet. The bootstrap
      // payload carries the same active zones, so fall back to it.
      try {
        const bootstrap = await api.get("/public/bootstrap");
        const list = Array.isArray(bootstrap?.zones) ? bootstrap.zones : [];
        setZones(
          list
            .filter((zone) => zone && zone.isActive !== false)
            .map((zone) => ({
              id: zone.id,
              cityName: zone.cityName || "",
              state: zone.state || "",
              areaName: zone.areaName || "",
              label:
                [zone.areaName, zone.cityName, zone.state].filter(Boolean).join(", ") ||
                zone.cityName ||
                "Service zone",
              radiusKm: zone.radiusKm ?? null,
            })),
        );
      } catch {
        setZoneError(loadError?.message || "Could not load service zones.");
      }
    } finally {
      setZoneLoading(false);
    }
  };

  const applyZone = (zone) => {
    setForm((prev) => ({
      ...prev,
      city: zone.cityName || prev.city,
      state: zone.state || prev.state,
      areaName: zone.areaName || prev.areaName,
    }));
    setZonePickerOpen(false);
    setZoneQuery("");
    toast.success(`Service area set to ${zone.label}.`);
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
      setError("Choose your primary trade.");
      return;
    }
    if (!form.state.trim() || !form.city.trim() || !form.areaName.trim()) {
      setError("Choose your state, city and local area.");
      return;
    }

    const trades = uniqueTrades([
      form.serviceKey,
      form.secondaryServiceKey,
      form.optionalServiceKey,
    ]);

    setBusy(true);
    try {
      const service = services.find((item) => item.key === form.serviceKey);
      await api.post("/auth/worker/apply", {
        name: form.name.trim(),
        phone: form.phone,
        service:
          service?.name ||
          SERVICE_META[form.serviceKey]?.name ||
          form.serviceKey,
        serviceKey: form.serviceKey,
        trades,
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
          Tell us your trades and the area you serve. Our team reviews every
          application before your profile goes live.
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

          <Field label="Primary trade" htmlFor="apply-service" required>
            <Select
              id="apply-service"
              value={form.serviceKey}
              onChange={set("serviceKey")}
            >
              <option value="">Select trade…</option>
              {tradeOptions("serviceKey").map((service) => (
                <option key={service.key} value={service.key}>
                  {service.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Second trade (optional)" htmlFor="apply-service-2">
            <Select
              id="apply-service-2"
              value={form.secondaryServiceKey}
              onChange={set("secondaryServiceKey")}
            >
              <option value="">— None —</option>
              {tradeOptions("secondaryServiceKey").map((service) => (
                <option key={service.key} value={service.key}>
                  {service.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Third trade (optional)" htmlFor="apply-service-3">
            <Select
              id="apply-service-3"
              value={form.optionalServiceKey}
              onChange={set("optionalServiceKey")}
            >
              <option value="">— None —</option>
              {tradeOptions("optionalServiceKey").map((service) => (
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
            <Select
              id="apply-state"
              value={form.state}
              onChange={(event) => chooseState(event.target.value)}
            >
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
            <Select
              id="apply-city"
              value={form.city}
              onChange={(event) => chooseCity(event.target.value)}
            >
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

          <div className="wk-span-2 wk-service-area">
            <div>
              <span className="wk-service-area__label">Service area</span>
              <strong className="wk-service-area__value">
                <MapPin size={14} />
                {form.areaName
                  ? `${form.areaName}${form.city ? `, ${form.city}` : ""}${
                      form.state ? `, ${form.state}` : ""
                    }`
                  : "No area selected yet"}
              </strong>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={openZonePicker}>
              Change
            </Button>
          </div>
        </div>

        <button
          type="button"
          className="wk-location-btn"
          onClick={capture}
          disabled={locating}
        >
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
        </div>

        <div className="wk-form-actions">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </form>

      {zonePickerOpen ? (
        <div className="wk-modal" role="dialog" aria-modal="true" aria-label="Select service zone">
          <div className="wk-modal__backdrop" onClick={() => setZonePickerOpen(false)} />
          <div className="wk-modal__panel">
            <div className="wk-modal__head">
              <div>
                <p className="wk-eyebrow">
                  <MapPin size={13} /> Service area
                </p>
                <h3>Choose your work zone</h3>
              </div>
              <button
                type="button"
                className="wk-modal__close"
                onClick={() => setZonePickerOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <label className="wk-zone-search">
              <Search size={15} />
              <input
                type="search"
                value={zoneQuery}
                onChange={(event) => setZoneQuery(event.target.value)}
                placeholder="Search city, area or state…"
                autoFocus
              />
            </label>

            <div className="wk-zone-list">
              {zoneLoading ? (
                <p className="wk-zone-state">Loading live service zones…</p>
              ) : zoneError ? (
                <p className="wk-zone-state wk-zone-state--error">{zoneError}</p>
              ) : filteredZones.length === 0 ? (
                <p className="wk-zone-state">
                  {zones.length === 0
                    ? "No live service zones are configured yet. Please try again later."
                    : "No zones match your search."}
                </p>
              ) : (
                filteredZones.map((zone) => {
                  const active =
                    zone.cityName === form.city &&
                    zone.areaName === form.areaName;
                  return (
                    <button
                      key={zone.id || zone.label}
                      type="button"
                      className={`wk-zone-option${active ? " is-active" : ""}`}
                      onClick={() => applyZone(zone)}
                    >
                      <MapPin size={16} />
                      <span>
                        <strong>{zone.areaName || zone.cityName || zone.label}</strong>
                        <small>
                          {[zone.cityName, zone.state].filter(Boolean).join(", ") || zone.label}
                          {zone.radiusKm ? ` · ${zone.radiusKm} km radius` : ""}
                        </small>
                      </span>
                      {active ? <BadgeCheck size={16} /> : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
