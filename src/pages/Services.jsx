import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Crown,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  Wrench,
} from "lucide-react";
import { useCatalogue } from "../context/CatalogueContext";
import { useLocation } from "../context/LocationContext";
import { useCachedWorkers } from "../hooks/useCachedWorkers";
import { usePageMeta } from "../lib/usePageMeta";
import { inr } from "../lib/format";
import {
  distanceKm,
  distanceLabel,
  workerInServiceArea,
} from "../lib/geo";
import { SERVICE_META } from "../lib/constants";
import {
  groupedServices,
  serviceGroup,
  servicesInFolder,
} from "../lib/serviceGroups";
import { Badge, EmptyState, SectionHeader } from "../components/ui";
import {
  SearchBar,
  ServiceGrid,
  ServiceIcon,
  WorkerCard,
} from "../components/common";

export default function Services() {
  const { key } = useParams();
  const [params] = useSearchParams();
  const query = (params.get("q") || "").toLowerCase().trim();
  const groupParam = params.get("group") || "";
  const folderParam = params.get("folder") || "";
  const { services, folders } = useCatalogue();
  const { city } = useLocation();

  const filtered = useMemo(() => {
    if (!query) return services;
    return services.filter((service) => {
      const meta = SERVICE_META[service.key] || {};
      return `${service.name} ${service.description || ""} ${meta.blurb || ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [services, query]);

  if (key) {
    return <ServiceDetail serviceKey={key} />;
  }

  return (
    <ServicesList
      filtered={filtered}
      query={query}
      groupParam={groupParam}
      folderParam={folderParam}
      folders={folders}
      city={city}
      services={services}
    />
  );
}

function ServicesList({
  filtered,
  query,
  groupParam,
  folderParam,
  folders,
  city,
  services,
}) {
  const activeFolder = useMemo(() => {
    if (!folderParam) return null;
    return (
      folders.find(
        (folder) =>
          String(folder.id) === folderParam || folder.name === folderParam,
      ) || null
    );
  }, [folderParam, folders]);

  const folderItems = useMemo(() => {
    if (!folderParam) return [];
    if (activeFolder) return servicesInFolder(activeFolder, filtered);
    return filtered.filter((item) => serviceGroup(item.key) === folderParam);
  }, [activeFolder, filtered, folderParam]);

  const folderTitle = activeFolder?.name || folderParam;

  usePageMeta(
    folderParam
      ? `${folderTitle} services`
      : query
        ? `Services matching “${query}”`
        : "All home services",
    "Browse every EasyHome service category — cleaning, plumbing, electrical, appliance repair, beauty and more.",
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Service catalogue</p>
          <h1>Every fix, one place.</h1>
          <p>
            Transparent starting prices, verified professionals and same-day slots
            {city?.name ? ` in ${city.name}` : " near you"}.
          </p>
        </div>
        <div className="row row--wrap">
          <Badge tone="green" dot>
            {services.length} categories live
          </Badge>
          <Badge tone="yellow">
            <ShieldCheck size={12} /> Verified pros
          </Badge>
        </div>
      </div>

      <div style={{ maxWidth: 640, marginBottom: 24 }}>
        <SearchBar placeholder="Search all services…" />
      </div>

      {query ? (
        <p className="small muted" style={{ marginBottom: 16 }}>
          {filtered.length} result{filtered.length === 1 ? "" : "s"} for “{query}”
        </p>
      ) : null}

      {groupParam ? (
        <p className="small muted" style={{ marginBottom: 16 }}>
          Category “{groupParam}” — {filtered.filter((item) => serviceGroup(item.key) === groupParam).length} services
        </p>
      ) : null}

      {folderParam ? (
        <div style={{ marginBottom: 18 }}>
          <Link
            to="/services"
            className="btn btn--ghost btn--sm"
            style={{ paddingLeft: 0, marginBottom: 8 }}
          >
            <ArrowLeft size={15} /> All folders
          </Link>
          <h2 style={{ margin: 0 }}>{folderTitle}</h2>
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            {folderItems.length} service{folderItems.length === 1 ? "" : "s"} in this folder. Pick one to book a verified pro.
          </p>
        </div>
      ) : null}

      {filtered.length ? (
        <>
          {!query && !groupParam && !folderParam ? (
            <div className="service-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {Object.entries(groupedServices(filtered)).map(([groupName, groupItems]) => (
                <Link
                  key={groupName}
                  to={`/services?group=${encodeURIComponent(groupName)}`}
                  className="service-tile"
                  style={{ display: "flex", flexDirection: "column", padding: 18, borderRadius: 16, background: "#fff", border: "1px solid var(--line)", textDecoration: "none", color: "inherit" }}
                >
                  <strong style={{ fontSize: 16, marginBottom: 6 }}>{groupName}</strong>
                  <span style={{ fontSize: 12, color: "#777" }}>{groupItems.length} services</span>
                </Link>
              ))}
            </div>
          ) : null}
          {groupParam && !query ? (
            <ServiceTileGrid
              items={(filtered || []).filter((item) => serviceGroup(item.key) === groupParam)}
            />
          ) : null}
          {folderParam && !query ? (
            folderItems.length ? (
              <ServiceTileGrid items={folderItems} />
            ) : (
              <div className="card">
                <EmptyState
                  icon={Wrench}
                  title="No services in this folder yet"
                  body="This folder is ready, but no services have been assigned to it. Browse the full catalogue or ask support to arrange a custom visit."
                  action={
                    <Link to="/services" className="btn btn--outline btn--sm">
                      Browse all services
                    </Link>
                  }
                />
              </div>
            )
          ) : null}
        </>
      ) : (
        <div className="card">
          <EmptyState
            icon={Search}
            title="No service matched that search"
            body="Try a broader term like “cleaning”, “repair” or “beauty”. You can also ask support and we will arrange a custom visit."
            action={
              <div className="row row--wrap" style={{ justifyContent: "center" }}>
                <Link to="/services" className="btn btn--outline btn--sm">
                  Browse all
                </Link>
                <Link to="/chat" className="btn btn--dark btn--sm">
                  Ask support
                </Link>
              </div>
            }
          />
        </div>
      )}

      <section className="section">
        <div className="membership">
          <div>
            <span className="badge badge--dark">
              <Crown size={12} /> EasyHome Pro
            </span>
            <h2 className="membership__title" style={{ marginTop: 12 }}>
              Keep the whole home running for less.
            </h2>
            <p className="membership__sub">
              Members get active priority matching, no 10% urgent-job extra charge and 24×7 priority support.
            </p>
          </div>
          <Link to="/subscription" className="btn btn--dark btn--lg">
            See membership <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function ServiceTileGrid({ items }) {
  if (!items.length) return null;

  return (
    <div
      className="service-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      {items.map((item) => {
        const meta = SERVICE_META[item.key] || {};
        return (
          <Link
            key={item.key || item.id}
            to={`/book?service=${encodeURIComponent(item.key)}`}
            className="service-tile"
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 18,
              borderRadius: 16,
              background: "#fff",
              border: "1px solid var(--line)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span className="service-tile__icon" style={{ marginBottom: 8 }}>
              <ServiceIcon
                icon={item.icon || meta.icon || "wrench"}
                service={item}
                size={36}
                iconSize={18}
              />
            </span>
            <strong style={{ fontSize: 15 }}>{item.name}</strong>
            <span style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
              From {inr(item.fromPrice || meta.from || 199)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function ServiceDetail({ serviceKey }) {
  const { services } = useCatalogue();
  const { city, point, zoneCheck } = useLocation();
  const location = useMemo(
    () =>
      city && (!zoneCheck.configured || zoneCheck.allowed)
        ? { ...city, ...(point || {}) }
        : null,
    [city, point, zoneCheck],
  );
  const meta = SERVICE_META[serviceKey] || {};
  const service =
    services.find((item) => item.key === serviceKey) || {
      id: serviceKey,
      key: serviceKey,
      name: meta.name || "Home service",
      icon: meta.icon || "wrench",
      fromPrice: meta.from || 199,
      description: meta.blurb || "Verified help for your home.",
    };

  const { data: workers } = useCachedWorkers(serviceKey, 24);

  usePageMeta(
    service.name,
    service.description || meta.blurb,
  );

  const nearby = useMemo(() => {
    return workers
      .filter((worker) => workerInServiceArea(worker, location, zoneCheck.zone))
      .map((worker) => ({
        ...worker,
        distance:
          location && location.lat && worker.lat
            ? distanceKm(location, worker)
            : null,
      }))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
  }, [workers, location, zoneCheck.zone]);

  const includes = [
    `Vetted ${service.name.toLowerCase()} professional`,
    "Upfront price agreed in the app",
    "Workmanship covered by support",
    "Pay by cash or UPI after completion",
  ];

  return (
    <div className="page">
      <Link to="/services" className="btn btn--ghost btn--sm" style={{ marginBottom: 18, paddingLeft: 0 }}>
        <ArrowLeft size={16} /> All services
      </Link>

      <div
        className="card card--pad"
        style={{
          background: "var(--ink)",
          color: "#fff",
          borderColor: "var(--ink)",
          borderRadius: 28,
          padding: "clamp(22px, 4vw, 38px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -90,
            top: -120,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,214,10,.28), transparent 65%)",
          }}
        />
        <div className="row row--wrap" style={{ alignItems: "flex-start", gap: 18, position: "relative" }}>
          <ServiceIcon service={service} size={76} iconSize={36} />
          <div className="grow" style={{ minWidth: 220 }}>
            <div className="row row--wrap" style={{ gap: 8, marginBottom: 8 }}>
              <Badge tone="yellow">From {inr(service.fromPrice || meta.from || 199)}</Badge>
              <Badge tone="green" dot>
                Available {city?.name ? `in ${city.name}` : "nearby"}
              </Badge>
            </div>
            {service.subheading ? (
              <p
                style={{
                  color: "rgba(255,255,255,.82)",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".12em",
                  margin: "0 0 4px",
                  textTransform: "uppercase",
                }}
              >
                {service.subheading}
              </p>
            ) : null}
            <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>{service.name}</h1>
            <p style={{ color: "rgba(255,255,255,.66)", marginTop: 10, maxWidth: "58ch", fontSize: 14 }}>
              {service.description || meta.blurb}
            </p>
            <div className="row row--wrap" style={{ gap: 16, marginTop: 16 }}>
              <Link
                to={`/book?service=${service.key}`}
                className="btn btn--primary btn--lg"
              >
                Book {service.name} <ArrowRight size={16} />
              </Link>
              <span className="row small" style={{ color: "rgba(255,255,255,.6)", gap: 6 }}>
                <Clock3 size={14} /> Usually within 24 hours
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid--2 section" style={{ alignItems: "start" }}>
        <div className="card card--pad">
          <SectionHeader title="What's included" eyebrow="The EasyHome standard" />
          <ul className="benefit-list">
            {includes.map((item) => (
              <li key={item}>
                <CheckCircle2 size={16} /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="card card--pad">
          <SectionHeader title="How pricing works" eyebrow="No surprises" />
          <div className="stack stack--sm">
            <div className="row" style={{ gap: 12 }}>
              <span className="stat__icon">
                <Wallet size={18} />
              </span>
              <div>
                <strong className="small">Set a budget</strong>
                <p className="tiny muted">Tell us what you expect to pay when booking.</p>
              </div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <span className="stat__icon">
                <Wrench size={18} />
              </span>
              <div>
                <strong className="small">Agree the final price</strong>
                <p className="tiny muted">Your pro quotes before work begins. Accept or counter once.</p>
              </div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <span className="stat__icon">
                <BadgeCheck size={18} />
              </span>
              <div>
                <strong className="small">Pay after completion</strong>
                <p className="tiny muted">Cash or UPI. Then rate your pro so others can choose well.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="section">
        <SectionHeader
          eyebrow="People, not profiles"
          title={`Top ${service.name.toLowerCase()} pros ${city?.name ? `in ${city.name}` : "near you"}`}
          subtitle="Ratings come only from completed EasyHome jobs."
          action={
            <Link to={`/search?q=${encodeURIComponent(service.name)}`} className="btn btn--outline btn--sm">
              See all <ArrowRight size={15} />
            </Link>
          }
        />
        {nearby.length ? (
          <div className="worker-grid">
            {nearby.map((worker) => (
              <div key={worker.id}>
                <WorkerCard worker={worker} />
                {worker.distance !== null ? (
                  <p className="tiny muted" style={{ marginTop: 6, paddingLeft: 4 }}>
                    {distanceLabel(worker.distance)} from {city?.name}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={Sparkles}
              title="No listed pros in this trade yet"
              body="You can still book — we will match your request with a verified professional in your area."
              action={
                <Link to={`/book?service=${service.key}`} className="btn btn--primary">
                  <CalendarCheck size={16} /> Request this service
                </Link>
              }
            />
          </div>
        )}
      </section>

      <section className="section">
        <div className="urgent-placeholder">
          {[
            { icon: MapPin, label: "Local by design", text: `Pros within ${city?.radiusKm || 25} km of ${city?.name || "you"}.` },
            { icon: ShieldCheck, label: "ID checked", text: "Government ID verified before a worker goes live." },
            { icon: Star, label: "Earned ratings", text: "Only completed customers can leave a review." },
          ].map((item) => (
            <div className="urgent-mini" key={item.label}>
              <span className="urgent-mini__icon">
                <item.icon size={20} />
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.text}</small>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
