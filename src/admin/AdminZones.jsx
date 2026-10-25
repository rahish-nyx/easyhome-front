import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  BellRing,
  Compass,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  SearchX,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDateTime, timeAgo } from "../lib/format";
import { Button, Field, Input, Modal, Select } from "../components/ui";
import {
  AdminPage,
  ConfirmModal,
  EmptyBlock,
  LoadingBlock,
  PageError,
  Panel,
  SearchField,
  SegTabs,
  StatCard,
  StatusPill,
  Toggle,
} from "./adminKit";

const EMPTY_ZONE = {
  state: "",
  cityName: "",
  areaName: "",
  latitude: "",
  longitude: "",
  radiusKm: 10,
  isActive: true,
};

const DEFAULT_MAP_CENTER = [22.9734, 78.6569];
const ZONE_PIN = L.divIcon({
  className: "adm-zone-map__pin",
  html: "<span></span>",
  iconSize: [28, 36],
  iconAnchor: [14, 34],
});

export default function AdminZones() {
  const toast = useToast();
  const { cities } = useCatalogue();
  const [tab, setTab] = useState("zones");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState("");

  const zonesState = useAsync(() => api.get("/admin/zones"), []);
  const zones = useMemo(() => zonesState.data?.zones || [], [zonesState.data]);
  const waitlist = useMemo(() => zonesState.data?.waitlist || [], [zonesState.data]);
  const stats = zonesState.data?.stats || { total: 0, active: 0, waiting: 0 };

  const filteredZones = useMemo(() => {
    const term = query.trim().toLowerCase();
    return zones.filter((zone) => {
      if (!term) return true;
      return [zone.cityName, zone.state, zone.areaName, zone.latitude, zone.longitude]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [zones, query]);

  const filteredWaitlist = useMemo(() => {
    const term = query.trim().toLowerCase();
    return waitlist.filter((entry) => {
      if (!term) return true;
      return [entry.name, entry.phone, entry.cityName, entry.state, entry.message]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [waitlist, query]);

  const refresh = () => zonesState.run().catch(() => {});

  const saveZone = async (form) => {
    setBusy("zone");
    try {
      const payload = {
        state: form.state.trim(),
        cityName: form.cityName.trim(),
        areaName: String(form.areaName || "").trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radiusKm: Number(form.radiusKm) || 10,
        isActive: Boolean(form.isActive),
      };
      if (draft?.id) {
        await api.patch(`/admin/zones/${draft.id}`, payload);
        toast.success("Service zone updated. Customers see the change instantly.");
      } else {
        await api.post("/admin/zones", payload);
        toast.success("Service zone created.");
      }
      setDraft(null);
      await refresh();
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setBusy("");
    }
  };

  const toggleZone = async (zone) => {
    setBusy(`toggle:${zone.id}`);
    try {
      await api.patch(`/admin/zones/${zone.id}`, { isActive: !zone.isActive });
      toast.success(
        zone.isActive
          ? `${zone.cityName} is now coming soon. New bookings are blocked.`
          : `${zone.cityName} is live. Customers can book again.`,
      );
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const removeZone = async () => {
    if (!deleteTarget) return;
    setBusy(`delete:${deleteTarget.id}`);
    try {
      await api.del(`/admin/zones/${deleteTarget.id}`);
      toast.success(`${deleteTarget.cityName} zone removed.`);
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <AdminPage
      eyebrow="Coverage control"
      title="Service zones"
      subtitle="Admin-managed operating boundaries. Only active zones accept new customer bookings."
      actions={
        <>
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={refresh}
            loading={zonesState.loading}
          >
            Refresh
          </Button>
          <Button icon={Plus} onClick={() => setDraft({ ...EMPTY_ZONE })}>
            Add zone
          </Button>
        </>
      }
    >
      <div className="adm-stat-grid adm-stat-grid--4">
        <StatCard
          label="Total zones"
          value={stats.total}
          hint="Cities in the coverage model"
          icon={MapPin}
          tone="blue"
        />
        <StatCard
          label="Live now"
          value={stats.active}
          hint="Accepting new bookings"
          icon={ShieldCheck}
          tone="green"
        />
        <StatCard
          label="Waitlist"
          value={stats.waiting}
          hint="Customers waiting for launch"
          icon={BellRing}
          tone="yellow"
        />
        <StatCard
          label="Coming soon"
          value={Math.max(0, stats.total - stats.active)}
          hint="Blocked from booking"
          icon={Compass}
          tone="plain"
        />
      </div>

      <PageError error={zonesState.error} onRetry={refresh} />

      <Panel
        title={tab === "zones" ? "Operating boundaries" : "Customer waitlist"}
        subtitle={
          tab === "zones"
            ? "Radius is measured from the zone centre with a geofence check on every booking."
            : "People who asked to be notified when EasyHome launches near them."
        }
        action={
          <div className="adm-toolbar adm-toolbar--compact">
            <SegTabs
              items={[
                { id: "zones", label: "Zones", count: zones.length },
                { id: "waitlist", label: "Waitlist", count: waitlist.length },
              ]}
              value={tab}
              onChange={setTab}
            />
            <SearchField
              value={query}
              onChange={setQuery}
              onClear={() => setQuery("")}
              placeholder={tab === "zones" ? "Search city or state…" : "Search waitlist…"}
            />
          </div>
        }
      >
        {zonesState.loading && !zonesState.data ? (
          <LoadingBlock label="Loading service zones…" />
        ) : tab === "zones" ? (
          filteredZones.length ? (
            <div className="adm-zone-grid">
              {filteredZones.map((zone) => (
                <article
                  className={`adm-zone-card${zone.isActive === false ? " is-inactive" : ""}`}
                  key={zone.id}
                >
                  <div className="adm-zone-card__top">
                    <span className="adm-zone-card__pin">
                      <MapPin size={18} />
                    </span>
                    <div className="grow">
                      <h3>{zone.cityName}</h3>
                      <span>
                        {zone.state}
                        {zone.areaName ? ` · ${zone.areaName}` : " · All areas"}
                      </span>
                    </div>
                    <StatusPill
                      status={zone.isActive === false ? "expired" : "active"}
                      label={zone.isActive === false ? "Coming soon" : "Live"}
                    />
                  </div>

                  <div className="adm-zone-card__meta">
                    <div>
                      <span>Centre</span>
                      <strong className="adm-mono">
                        {Number(zone.latitude).toFixed(4)}, {Number(zone.longitude).toFixed(4)}
                      </strong>
                    </div>
                    <div>
                      <span>Radius</span>
                      <strong>{zone.radiusKm} km</strong>
                    </div>
                  </div>

                  <Toggle
                    checked={zone.isActive !== false}
                    onChange={() => toggleZone(zone)}
                    disabled={busy === `toggle:${zone.id}`}
                    label={zone.isActive === false ? "Zone disabled" : "Zone live"}
                    hint={
                      zone.isActive === false
                        ? "Customers see this city as coming soon."
                        : "Customers inside this radius can book."
                    }
                  />

                  <div className="adm-zone-card__actions">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Pencil}
                      onClick={() => setDraft({ ...zone })}
                    >
                      Edit
                    </Button>
                    <button
                      type="button"
                      className="adm-text-action is-danger"
                      onClick={() => setDeleteTarget(zone)}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyBlock
              icon={SearchX}
              title={query ? "No matching zones" : "No service zones configured"}
              body={
                query
                  ? "Try a different city, state or coordinate."
                  : "Add a zone to define where EasyHome is allowed to accept bookings."
              }
              action={
                !query ? (
                  <Button size="sm" icon={Plus} onClick={() => setDraft({ ...EMPTY_ZONE })}>
                    Add first zone
                  </Button>
                ) : null
              }
            />
          )
        ) : filteredWaitlist.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Location</th>
                  <th>Note</th>
                  <th>Joined</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredWaitlist.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <div className="adm-table__title">
                        <strong>{entry.name || "Unnamed"}</strong>
                        <span>{entry.phone}</span>
                      </div>
                    </td>
                    <td>
                      <div className="adm-table__title">
                        <strong>
                          {entry.cityName || "Unspecified"}
                          {entry.state ? `, ${entry.state}` : ""}
                        </strong>
                        <span className="adm-mono">
                          {Number.isFinite(Number(entry.lat))
                            ? `${Number(entry.lat).toFixed(4)}, ${Number(entry.lng).toFixed(4)}`
                            : "No coordinates"}
                        </span>
                      </div>
                    </td>
                    <td className="adm-table__muted">{entry.message || "—"}</td>
                    <td>
                      <span className="adm-time" title={formatDateTime(entry.createdAt)}>
                        {timeAgo(entry.createdAt) || "—"}
                      </span>
                    </td>
                    <td>
                      {entry.phone ? (
                        <a className="adm-icon-link" href={`tel:${entry.phone}`} title="Call customer">
                          <Phone size={15} />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyBlock
            icon={Users}
            title={query ? "No matching waitlist entries" : "No waitlist entries yet"}
            body="Customers outside live zones can join the waitlist from the coverage notice."
          />
        )}
      </Panel>

      {draft && (
        <ZoneModal
          key={draft.id || "new"}
          draft={draft}
          cities={cities}
          zones={zones}
          loading={busy === "zone"}
          onClose={() => setDraft(null)}
          onSave={saveZone}
        />
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this service zone?"
        subtitle={deleteTarget ? `${deleteTarget.cityName}, ${deleteTarget.state}` : ""}
        confirmLabel="Delete zone"
        loading={busy === `delete:${deleteTarget?.id}`}
        onConfirm={removeZone}
      >
        <p className="small muted">
          New bookings in this area will be blocked immediately. Existing jobs and customer
          accounts are not affected. Disable the zone instead if it may reopen.
        </p>
      </ConfirmModal>
    </AdminPage>
  );
}

function ZoneModal({ draft, cities, zones, onClose, onSave, loading }) {
  const [form, setForm] = useState(draft || EMPTY_ZONE);
  const [error, setError] = useState("");

  if (!draft) return null;

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const selectedCity = cities.find((item) => item.name === form.cityName);
  const areaOptions = (selectedCity?.localAreas || [])
    .map((area) =>
      typeof area === "string"
        ? { name: area }
        : {
            ...area,
            name: area?.name || area?.area,
            lat: area?.lat ?? area?.latitude,
            lng: area?.lng ?? area?.longitude,
          },
    )
    .filter(Boolean);

  const chooseCity = (event) => {
    const name = event.target.value;
    const existing = zones.find((item) => item.cityName === name);
    const city = cities.find(
      (item) =>
        item.name === name &&
        (!existing?.state || item.state === existing.state),
    ) || cities.find((item) => item.name === name);
    setForm((current) => ({
      ...current,
      cityName: name,
      areaName: "",
      state: city?.state || existing?.state || current.state || "",
      latitude: city ? Number(city.lat) : current.latitude,
      longitude: city ? Number(city.lng) : current.longitude,
      radiusKm: city?.radiusKm || existing?.radiusKm || current.radiusKm,
    }));
  };

  const chooseArea = (event) => {
    const name = event.target.value;
    const area = areaOptions.find((item) => item.name === name);
    setForm((current) => ({
      ...current,
      areaName: name,
      latitude: area?.lat != null && Number.isFinite(Number(area.lat))
        ? String(area.lat)
        : current.latitude,
      longitude: area?.lng != null && Number.isFinite(Number(area.lng))
        ? String(area.lng)
        : current.longitude,
      radiusKm: Number(area?.radiusKm) || current.radiusKm,
    }));
  };

  const submit = () => {
    setError("");
    if (!form.state.trim() || !form.cityName.trim()) {
      setError("State and city name are required.");
      return;
    }
    if (!String(form.latitude).trim() || !String(form.longitude).trim()) {
      setError("Choose the exact centre coordinates on the map.");
      return;
    }
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    const radius = Number(form.radiusKm);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError("Latitude must be between -90 and 90.");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError("Longitude must be between -180 and 180.");
      return;
    }
    if (!Number.isFinite(radius) || radius < 0.5 || radius > 200) {
      setError("Radius must be between 0.5 km and 200 km.");
      return;
    }
    Promise.resolve(onSave(form)).catch((saveError) => setError(saveError.message));
  };

  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={draft.id ? "Edit service zone" : "Add a service zone"}
      subtitle="Customers outside every active zone are blocked from booking."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} loading={loading}>
            {draft.id ? "Save changes" : "Create zone"}
          </Button>
        </>
      }
    >
      <div className="adm-form-grid">
        <Field label="City" htmlFor="zone-city" required>
          <Select id="zone-city" value={form.cityName} onChange={chooseCity}>
            <option value="">Select a city…</option>
            {cities.map((city) => (
              <option key={city.id || city.name} value={city.name}>
                {city.name}
              </option>
            ))}
            {form.cityName && !cities.some((city) => city.name === form.cityName) ? (
              <option value={form.cityName}>{form.cityName}</option>
            ) : null}
          </Select>
        </Field>

        <Field
          label="Local area"
          htmlFor="zone-area"
          hint="Leave blank for a city-wide zone, or pick one area for precise coverage."
        >
          <Select id="zone-area" value={form.areaName || ""} onChange={chooseArea}>
            <option value="">All areas in the city</option>
            {areaOptions.map((area) => (
              <option key={area.name} value={area.name}>
                {area.name}
              </option>
            ))}
            {form.areaName && !areaOptions.some((area) => area.name === form.areaName) ? (
              <option value={form.areaName}>{form.areaName}</option>
            ) : null}
          </Select>
        </Field>

        <Field label="State" htmlFor="zone-state" required>
          <Input
            id="zone-state"
            value={form.state}
            maxLength={80}
            onChange={set("state")}
            placeholder="Madhya Pradesh"
          />
        </Field>

        <Field label="Latitude" htmlFor="zone-lat" required hint="Centre point of the zone.">
          <Input
            id="zone-lat"
            type="number"
            step="0.000001"
            min={-90}
            max={90}
            value={form.latitude}
            onChange={set("latitude")}
            placeholder="22.7196"
          />
        </Field>

        <Field label="Longitude" htmlFor="zone-lng" required>
          <Input
            id="zone-lng"
            type="number"
            step="0.000001"
            min={-180}
            max={180}
            value={form.longitude}
            onChange={set("longitude")}
            placeholder="75.8577"
          />
        </Field>

        <div className="adm-span-2">
          <div className="adm-zone-map__heading">
            <strong>Map pin</strong>
            <span>Click the map or drag the pin to set the zone centre.</span>
          </div>
          <ZoneMap
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(latitude, longitude) =>
              setForm((current) => ({
                ...current,
                latitude: latitude.toFixed(6),
                longitude: longitude.toFixed(6),
              }))
            }
          />
          <p className="adm-zone-map__attribution">
            Map data © OpenStreetMap contributors
          </p>
        </div>

        <Field
          label="Radius (km)"
          htmlFor="zone-radius"
          hint="0.5 – 200 km. Every booking inside this radius is accepted."
        >
          <Input
            id="zone-radius"
            type="number"
            step="0.5"
            min={0.5}
            max={200}
            value={form.radiusKm}
            onChange={set("radiusKm")}
          />
        </Field>

        <div className="adm-span-2">
          <Toggle
            checked={Boolean(form.isActive)}
            onChange={(next) => setForm((current) => ({ ...current, isActive: next }))}
            label="Zone is live"
            hint="Turn off to show the city as coming soon and block new bookings."
          />
        </div>

        {error ? <p className="adm-form-error adm-span-2">{error}</p> : null}
      </div>
    </Modal>
  );
}

function ZoneMap({ latitude, longitude, onChange }) {
  const parsedLat = Number(latitude);
  const parsedLng = Number(longitude);
  const hasPosition =
    Number.isFinite(parsedLat) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    Number.isFinite(parsedLng) &&
    parsedLng >= -180 &&
    parsedLng <= 180;
  const position = hasPosition ? [parsedLat, parsedLng] : null;

  return (
    <div className="adm-zone-map" aria-label="Interactive service zone map">
      <MapContainer
        center={position || DEFAULT_MAP_CENTER}
        zoom={position ? 12 : 5}
        scrollWheelZoom
        className="adm-zone-map__canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoneMapView position={position} />
        <ZoneMapEvents onChange={onChange} />
        {position ? (
          <Marker
            position={position}
            icon={ZONE_PIN}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const point = event.target.getLatLng();
                onChange(point.lat, point.lng);
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}

function ZoneMapView({ position }) {
  const map = useMap();
  const latitude = position?.[0] ?? null;
  const longitude = position?.[1] ?? null;

  useEffect(() => {
    if (latitude === null || longitude === null) return;
    map.setView([latitude, longitude], Math.max(map.getZoom(), 12));
  }, [map, latitude, longitude]);
  return null;
}

function ZoneMapEvents({ onChange }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}
