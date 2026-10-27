import { useEffect, useMemo, useState } from "react";
import {
  Compass,
  IndianRupee,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { inr } from "../lib/format";
import { Button, Field, Input, Modal, Select, Textarea } from "../components/ui";
import { ServiceIcon } from "../components/common";
import { SERVICE_ICON_OPTIONS } from "../lib/iconMap";
import {
  AdminPage,
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

const EMPTY_SERVICE = {
  name: "",
  key: "",
  icon: "sparkles",
  subheading: "",
  description: "",
  fromPrice: 199,
  order: 0,
  active: true,
};

const EMPTY_CITY = {
  name: "",
  state: "",
  lat: "",
  lng: "",
  radiusKm: 10,
  localAreas: [],
  active: true,
};

function areasToText(areas = []) {
  return (areas || [])
    .map((area) => {
      if (typeof area === "string") return area;
      const coords =
        Number.isFinite(Number(area?.lat)) && Number.isFinite(Number(area?.lng))
          ? `, ${area.lat}, ${area.lng}`
          : "";
      return `${area?.name || area?.area || ""}${coords}`;
    })
    .filter(Boolean)
    .join("\n");
}

function textToAreas(text = "") {
  return String(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, lat, lng] = line.split(",").map((part) => part.trim());
      const area = { name };
      if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        area.lat = Number(lat);
        area.lng = Number(lng);
      }
      return area;
    })
    .filter((area) => area.name);
}

export default function AdminCatalog() {
  const toast = useToast();
  const [tab, setTab] = useState("services");
  const [query, setQuery] = useState("");
  const [serviceModal, setServiceModal] = useState(null);
  const [cityModal, setCityModal] = useState(null);
  const [deleteCity, setDeleteCity] = useState(null);
  const [priceDrafts, setPriceDrafts] = useState({});
  const [busy, setBusy] = useState("");

  const dataState = useAsync(async () => {
    const [serviceData, cityData] = await Promise.all([
      api.get("/admin/services"),
      api.get("/admin/cities"),
    ]);
    return {
      services: serviceData.services || [],
      cities: cityData.cities || [],
    };
  }, []);

  const services = dataState.data?.services || [];
  const cities = dataState.data?.cities || [];

  useEffect(() => {
    if (tab !== "pricing") return;
    setPriceDrafts(
      Object.fromEntries(
        services.map((service) => [service.id, String(service.fromPrice ?? 0)]),
      ),
    );
  }, [tab, services]);

  const changedPrices = useMemo(
    () =>
      services
        .filter(
          (service) =>
            priceDrafts[service.id] !== undefined &&
            String(service.fromPrice ?? 0) !== String(priceDrafts[service.id]),
        )
        .map((service) => ({
          id: service.id,
          fromPrice: Math.max(0, Number(priceDrafts[service.id]) || 0),
        })),
    [services, priceDrafts],
  );

  const filteredServices = useMemo(() => {
    const term = query.trim().toLowerCase();
    return services.filter((service) => {
      if (!term) return true;
      return [service.name, service.key, service.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [services, query]);

  const filteredCities = useMemo(() => {
    const term = query.trim().toLowerCase();
    return cities.filter((city) => {
      if (!term) return true;
      return [
        city.name,
        city.state,
        city.lat,
        city.lng,
        ...(city.localAreas || []).map((area) => area?.name || area),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [cities, query]);

  const refresh = () => dataState.run().catch(() => {});

  const saveService = async (form) => {
    setBusy("service");
    try {
      const payload = {
        ...form,
        fromPrice: Number(form.fromPrice) || 0,
        order: Number(form.order) || 0,
        active: Boolean(form.active),
      };
      if (serviceModal?.id) {
        await api.patch(`/admin/services/${serviceModal.id}`, payload);
        toast.success("Service updated.");
      } else {
        await api.post("/admin/services", payload);
        toast.success("Service added.");
      }
      setServiceModal(null);
      await refresh();
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setBusy("");
    }
  };

  const toggleService = async (service) => {
    setBusy(`service:${service.id}`);
    try {
      await api.patch(`/admin/services/${service.id}`, { active: !service.active });
      toast.success(service.active ? "Service hidden from customers." : "Service is live.");
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const savePrices = async () => {
    if (!changedPrices.length) return;
    setBusy("prices");
    try {
      await api.patch("/admin/services/pricing", { updates: changedPrices });
      toast.success(
        `${changedPrices.length} service price${changedPrices.length === 1 ? "" : "s"} updated.`,
      );
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const saveCity = async (form) => {
    setBusy("city");
    try {
      const payload = {
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
        radiusKm: Number(form.radiusKm) || 10,
        active: Boolean(form.active),
      };
      if (cityModal?.id) {
        await api.patch(`/admin/cities/${cityModal.id}`, payload);
        toast.success("City updated.");
      } else {
        await api.post("/admin/cities", payload);
        toast.success("City added.");
      }
      setCityModal(null);
      await refresh();
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setBusy("");
    }
  };

  const toggleCity = async (city) => {
    setBusy(`city:${city.id}`);
    try {
      await api.patch(`/admin/cities/${city.id}`, { active: !city.active });
      toast.success(city.active ? "City disabled." : "City enabled.");
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const removeCity = async () => {
    if (!deleteCity) return;
    setBusy(`delete:${deleteCity.id}`);
    try {
      await api.del(`/admin/cities/${deleteCity.id}`);
      toast.success("City removed.");
      setDeleteCity(null);
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const activeServices = services.filter((service) => service.active).length;
  const activeCities = cities.filter((city) => city.active).length;
  const avgRadius = cities.length
    ? Math.round(
        cities.reduce((sum, city) => sum + (Number(city.radiusKm) || 0), 0) / cities.length,
      )
    : 0;

  return (
    <AdminPage
      eyebrow="Marketplace"
      title="Catalogue & coverage"
      subtitle="Services customers can book and the cities EasyHome operates in."
      actions={
        <>
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            loading={dataState.loading}
            onClick={refresh}
          >
            Refresh
          </Button>
          {tab === "pricing" ? (
            <Button
              size="sm"
              icon={IndianRupee}
              loading={busy === "prices"}
              disabled={!changedPrices.length}
              onClick={savePrices}
            >
              Save {changedPrices.length ? `${changedPrices.length} ` : ""}prices
            </Button>
          ) : (
            <Button
              size="sm"
              icon={Plus}
              onClick={() =>
                tab === "services"
                  ? setServiceModal({ ...EMPTY_SERVICE })
                  : setCityModal({ ...EMPTY_CITY })
              }
            >
              Add {tab === "services" ? "service" : "city"}
            </Button>
          )}
        </>
      }
    >
      <section className="adm-stat-grid adm-stat-grid--4">
        <StatCard
          label="Services"
          value={services.length}
          hint={`${activeServices} live on the storefront`}
          icon={Layers}
          tone="yellow"
        />
        <StatCard
          label="Cities"
          value={cities.length}
          hint={`${activeCities} enabled`}
          icon={MapPin}
          tone="blue"
        />
        <StatCard
          label="Average radius"
          value={`${avgRadius} km`}
          hint="Default city coverage area"
          icon={Compass}
          tone="green"
        />
        <StatCard
          label="Hidden services"
          value={services.length - activeServices}
          hint="Not visible to customers"
          icon={Sparkles}
          tone={services.length - activeServices ? "red" : "plain"}
        />
      </section>

      <div className="adm-toolbar">
        <SegTabs
          items={[
            { id: "services", label: "Services", count: services.length },
            { id: "pricing", label: "Prices", count: services.length },
            { id: "cities", label: "Cities", count: cities.length },
          ]}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setQuery("");
          }}
        />
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={
            tab === "cities" ? "Search cities…" : "Search services…"
          }
          onClear={() => setQuery("")}
        />
      </div>

      <PageError error={dataState.error} onRetry={refresh} />

      {dataState.loading && !dataState.data ? (
        <LoadingBlock label="Loading catalogue…" />
      ) : tab === "pricing" ? (
        <Panel flush>
          <div className="adm-price-banner">
            <div>
              <strong>Edit every service price</strong>
              <span>
                Update the starting price customers see. Change as many rows as you
                need, then save once.
              </span>
            </div>
            <span className={changedPrices.length ? "is-dirty" : ""}>
              {changedPrices.length
                ? `${changedPrices.length} unsaved change${changedPrices.length === 1 ? "" : "s"}`
                : "All prices saved"}
            </span>
          </div>
          {filteredServices.length ? (
            <div className="adm-price-list">
              {filteredServices.map((service) => (
                <div className="adm-price-row" key={service.id}>
                  <ServiceIcon service={service} size={36} iconSize={18} />
                  <span className="adm-price-row__name">
                    <strong>{service.name}</strong>
                    <small>{service.subheading || service.key}</small>
                  </span>
                  <span className="adm-price-row__now">
                    now {inr(service.fromPrice)}
                  </span>
                  <span className="adm-price-row__field">
                    <span>₹</span>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      inputMode="numeric"
                      aria-label={`Starting price for ${service.name}`}
                      className={
                        String(service.fromPrice ?? 0) !==
                        String(priceDrafts[service.id])
                          ? "is-dirty"
                          : ""
                      }
                      value={priceDrafts[service.id] ?? ""}
                      onChange={(event) =>
                        setPriceDrafts((prev) => ({
                          ...prev,
                          [service.id]: event.target.value,
                        }))
                      }
                    />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock
              icon={IndianRupee}
              title="No matching services"
              body="Clear the search to see every price."
            />
          )}
        </Panel>
      ) : tab === "services" ? (
        <Panel flush>
          {filteredServices.length ? (
            <div className="adm-catalog-grid">
              {filteredServices.map((service) => (
                <article
                  className={`adm-catalog-card${service.active ? "" : " is-inactive"}`}
                  key={service.id}
                >
                  <div className="adm-catalog-card__top">
                    <ServiceIcon service={service} size={44} />
                    <div className="grow">
                      <h3>{service.name}</h3>
                      <span className="adm-mono">{service.key}</span>
                    </div>
                    <StatusPill
                      status={service.active ? "active" : "expired"}
                      label={service.active ? "Live" : "Hidden"}
                    />
                  </div>
                  {service.subheading ? (
                    <span className="adm-catalog-card__sub">{service.subheading}</span>
                  ) : null}
                  <p>{service.description || "No description yet."}</p>
                  <div className="adm-catalog-card__meta">
                    <span>
                      From <strong>{inr(service.fromPrice)}</strong>
                    </span>
                    <span>
                      Order <strong>{service.order}</strong>
                    </span>
                  </div>
                  <div className="adm-catalog-card__actions">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Pencil}
                      onClick={() => setServiceModal({ ...service })}
                    >
                      Edit
                    </Button>
                    <button
                      type="button"
                      className="adm-text-action"
                      onClick={() => toggleService(service)}
                      disabled={busy === `service:${service.id}`}
                    >
                      {service.active ? "Hide" : "Publish"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyBlock
              icon={Wrench}
              title={query ? "No matching services" : "No services yet"}
              body="Add a service to make it bookable from the customer home page."
              action={
                !query ? (
                  <Button
                    size="sm"
                    icon={Plus}
                    onClick={() => setServiceModal({ ...EMPTY_SERVICE })}
                  >
                    Add service
                  </Button>
                ) : null
              }
            />
          )}
        </Panel>
      ) : (
        <Panel flush>
          {filteredCities.length ? (
            <div className="adm-city-grid">
              {filteredCities.map((city) => (
                <article
                  className={`adm-city-card${city.active ? "" : " is-inactive"}`}
                  key={city.id}
                >
                  <div className="adm-city-card__top">
                    <span className="adm-city-card__pin">
                      <MapPin size={18} />
                    </span>
                    <div className="grow">
                      <h3>{city.name}</h3>
                      <span className="adm-mono">
                        {Number(city.lat).toFixed(4)}, {Number(city.lng).toFixed(4)}
                      </span>
                    </div>
                    <StatusPill
                      status={city.active ? "active" : "expired"}
                      label={city.active ? "Live" : "Off"}
                    />
                  </div>
                  <div className="adm-city-card__radius">
                    <span>Service radius</span>
                    <strong>{city.radiusKm || 10} km</strong>
                  </div>
                  <div className="adm-catalog-card__actions">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Pencil}
                      onClick={() => setCityModal({ ...city })}
                    >
                      Edit
                    </Button>
                    <button
                      type="button"
                      className="adm-text-action"
                      onClick={() => toggleCity(city)}
                      disabled={busy === `city:${city.id}`}
                    >
                      {city.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      className="adm-text-action is-danger"
                      onClick={() => setDeleteCity(city)}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyBlock
              icon={MapPin}
              title={query ? "No matching cities" : "No cities yet"}
              body="Add a city so customers can find workers in their area."
              action={
                !query ? (
                  <Button size="sm" icon={Plus} onClick={() => setCityModal({ ...EMPTY_CITY })}>
                    Add city
                  </Button>
                ) : null
              }
            />
          )}
        </Panel>
      )}

      <ServiceModal
        draft={serviceModal}
        loading={busy === "service"}
        onClose={() => setServiceModal(null)}
        onSave={saveService}
      />

      <CityModal
        draft={cityModal}
        loading={busy === "city"}
        onClose={() => setCityModal(null)}
        onSave={saveCity}
      />

      <Modal
        open={Boolean(deleteCity)}
        onClose={() => setDeleteCity(null)}
        title="Delete this city?"
        subtitle={deleteCity?.name}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteCity(null)}>
              Cancel
            </Button>
            <Button
              className="adm-danger-btn"
              loading={busy === `delete:${deleteCity?.id}`}
              onClick={removeCity}
            >
              Delete city
            </Button>
          </>
        }
      >
        <p className="small muted">
          Customers will no longer see {deleteCity?.name} in the location selector. Existing
          bookings are not affected. Disable the city instead if you may reopen it later.
        </p>
      </Modal>
    </AdminPage>
  );
}

function ServiceModal({ draft, onClose, onSave, loading }) {
  const [form, setForm] = useState(draft || EMPTY_SERVICE);

  useEffect(() => {
    setForm(draft || EMPTY_SERVICE);
  }, [draft]);

  const set = (key) => (event) =>
    setForm((prev) => ({
      ...prev,
      [key]:
        event.target.type === "checkbox" ? event.target.checked : event.target.value,
    }));

  if (!draft) return null;

  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={draft.id ? "Edit service" : "Add a service"}
      subtitle="Visible on the customer home page and search."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={() => {
              if (!form.name.trim() || !form.key.trim()) return;
              onSave({
                ...form,
                name: form.name.trim(),
                key: form.key.trim().toLowerCase().replace(/\s+/g, "-"),
              });
            }}
          >
            {draft.id ? "Save changes" : "Add service"}
          </Button>
        </>
      }
    >
      <div className="adm-form-grid">
        <Field label="Display name" htmlFor="cat-service-name" required className="adm-span-2">
          <Input
            id="cat-service-name"
            value={form.name}
            maxLength={60}
            onChange={set("name")}
            placeholder="Home Cleaning"
          />
        </Field>
        <Field
          label="Key"
          htmlFor="cat-service-key"
          hint="Lowercase URL key. Cannot be reused by another service."
          required
        >
          <Input
            id="cat-service-key"
            value={form.key}
            maxLength={40}
            onChange={set("key")}
            placeholder="cleaning"
          />
        </Field>
        <Field
          label="Icon"
          htmlFor="cat-service-icon"
          hint="Choose any icon. New categories go live as soon as they are saved."
          className="adm-span-2"
        >
          <div className="adm-icon-picker" id="cat-service-icon" role="listbox" aria-label="Service icon">
            {SERVICE_ICON_OPTIONS.map((icon) => (
              <button
                key={icon.id}
                type="button"
                role="option"
                aria-selected={form.icon === icon.id}
                className={`adm-icon-picker__item ${form.icon === icon.id ? "is-active" : ""}`}
                title={icon.label}
                onClick={() => setForm((prev) => ({ ...prev, icon: icon.id }))}
              >
                <ServiceIcon icon={icon.id} size={34} iconSize={17} />
                <span>{icon.label}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Starting price (₹)" htmlFor="cat-service-price">
          <Input
            id="cat-service-price"
            type="number"
            min={0}
            max={100000}
            value={form.fromPrice}
            onChange={set("fromPrice")}
          />
        </Field>
        <Field label="Display order" htmlFor="cat-service-order" hint="Lower numbers show first.">
          <Input
            id="cat-service-order"
            type="number"
            min={0}
            max={999}
            value={form.order}
            onChange={set("order")}
          />
        </Field>
        <Field
          label="Card subheading"
          htmlFor="cat-service-sub"
          hint={`${String(form.subheading || "").length}/80 · short line shown under the service name`}
          className="adm-span-2"
        >
          <Input
            id="cat-service-sub"
            value={form.subheading || ""}
            maxLength={80}
            onChange={set("subheading")}
            placeholder="Deep cleaning & home refresh"
          />
        </Field>
        <Field
          label="Customer description"
          htmlFor="cat-service-desc"
          hint={`${String(form.description || "").length}/180`}
          className="adm-span-2"
        >
          <Textarea
            id="cat-service-desc"
            rows={3}
            maxLength={180}
            value={form.description}
            onChange={set("description")}
            placeholder="Deep cleans, kitchens, bathrooms and move-in refresh."
          />
        </Field>
      </div>
      <Toggle
        checked={Boolean(form.active)}
        onChange={(next) => setForm((prev) => ({ ...prev, active: next }))}
        label="Visible to customers"
        hint="Hidden services stay in booking history but disappear from the storefront."
      />
    </Modal>
  );
}

function CityModal({ draft, onClose, onSave, loading }) {
  const [form, setForm] = useState(draft || EMPTY_CITY);
  const [areasText, setAreasText] = useState(() => areasToText(draft?.localAreas));
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setForm(draft || EMPTY_CITY);
    setAreasText(areasToText(draft?.localAreas));
  }, [draft]);

  const set = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const capture = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  if (!draft) return null;

  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={draft.id ? "Edit city" : "Add a city"}
      subtitle="City centre and radius power nearby worker matching."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={() => {
              if (!form.name.trim() || !form.state.trim()) return;
              onSave({
                ...form,
                name: form.name.trim(),
                state: form.state.trim(),
                localAreas: textToAreas(areasText),
              });
            }}
          >
            {draft.id ? "Save changes" : "Add city"}
          </Button>
        </>
      }
    >
      <div className="adm-form-grid">
        <Field label="City name" htmlFor="cat-city-name" required>
          <Input
            id="cat-city-name"
            value={form.name}
            maxLength={80}
            onChange={set("name")}
            placeholder="Bengaluru"
          />
        </Field>
        <Field label="State" htmlFor="cat-city-state" required>
          <Input
            id="cat-city-state"
            value={form.state}
            maxLength={80}
            onChange={set("state")}
            placeholder="Karnataka"
          />
        </Field>
        <Field label="Latitude" htmlFor="cat-city-lat" required>
          <Input
            id="cat-city-lat"
            type="number"
            step="0.000001"
            value={form.lat}
            onChange={set("lat")}
            placeholder="12.971599"
          />
        </Field>
        <Field label="Longitude" htmlFor="cat-city-lng" required>
          <Input
            id="cat-city-lng"
            type="number"
            step="0.000001"
            value={form.lng}
            onChange={set("lng")}
            placeholder="77.594566"
          />
        </Field>
        <Field
          label="Service radius (km)"
          htmlFor="cat-city-radius"
          hint="Jobs outside this radius are hidden from this city feed."
        >
          <Input
            id="cat-city-radius"
            type="number"
            min={1}
            max={200}
            value={form.radiusKm}
            onChange={set("radiusKm")}
          />
        </Field>
        <Field
          label="Local areas"
          htmlFor="cat-city-areas"
          hint="One area per line. Add optional coordinates as: Area name, latitude, longitude."
          className="adm-span-2"
        >
          <Textarea
            id="cat-city-areas"
            rows={6}
            value={areasText}
            onChange={(event) => setAreasText(event.target.value)}
            placeholder={"Indiranagar\nKoramangala\nWhitefield, 12.9698, 77.7500"}
          />
        </Field>
        <div className="adm-span-2">
          <button
            type="button"
            className="adm-link-button"
            onClick={capture}
            disabled={locating}
          >
            <Compass size={15} /> {locating ? "Capturing…" : "Use my current location"}
          </button>
        </div>
      </div>
      <Toggle
        checked={Boolean(form.active)}
        onChange={(next) => setForm((prev) => ({ ...prev, active: next }))}
        label="City is live"
        hint="Disabled cities disappear from the customer location picker."
      />
    </Modal>
  );
}
