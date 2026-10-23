import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  Search as SearchIcon,
  Sparkles,
  Users,
} from "lucide-react";
import { useCatalogue } from "../context/CatalogueContext";
import { useLocation } from "../context/LocationContext";
import { useLiveQuery } from "../hooks/useLive";
import { qWorkers } from "../lib/queries";
import { usePageMeta } from "../lib/usePageMeta";
import { SERVICE_META } from "../lib/constants";
import { EmptyState, SectionHeader } from "../components/ui";
import { SearchBar, ServiceGrid, WorkerCard } from "../components/common";

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get("q") || "").trim();
  const term = query.toLowerCase();
  const { services } = useCatalogue();
  const { city } = useLocation();
  const workersQuery = useMemo(() => qWorkers("", 40), []);
  const { data: workers, loading } = useLiveQuery(workersQuery);

  usePageMeta(
    query ? `Search results for “${query}”` : "Search EasyHome",
    query
      ? `Services and verified professionals matching ${query} on EasyHome.`
      : "Search verified home-service professionals and book in under a minute.",
  );

  const serviceMatches = useMemo(() => {
    if (!term) return services;
    return services.filter((service) => {
      const meta = SERVICE_META[service.key] || {};
      return `${service.name} ${service.description || ""} ${meta.blurb || ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [services, term]);

  const workerMatches = useMemo(() => {
    const pool = workers.map((worker) => ({ ...worker }));
    if (!term) return pool.slice(0, 8);
    return pool
      .filter((worker) => {
        const haystack = `${worker.name || ""} ${worker.service || ""} ${worker.area || ""} ${
          worker.serviceKey || ""
        }`.toLowerCase();
        if (haystack.includes(term)) return true;
        const meta = SERVICE_META[worker.serviceKey] || {};
        return haystack.includes(term) || String(meta.name || "").toLowerCase().includes(term);
      })
      .slice(0, 12);
  }, [workers, term]);

  const total = serviceMatches.length + workerMatches.length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Search</p>
          <h1>{query ? `Results for “${query}”` : "Find your next pro"}</h1>
          <p>
            {query
              ? `${total} match${total === 1 ? "" : "es"} across services and professionals.`
              : "Search by service, trade or professional name."}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 720, marginBottom: 28 }}>
        <SearchBar
          autoFocus={Boolean(query)}
          placeholder="What do you need help with?"
        />
      </div>

      {total === 0 ? (
        <div className="card">
          <EmptyState
            icon={SearchIcon}
            title={`Nothing matched “${query}”`}
            body="Try a simpler phrase, browse all services, or ask support — we can arrange custom jobs too."
            action={
              <div className="row row--wrap" style={{ justifyContent: "center" }}>
                <Link to="/services" className="btn btn--outline btn--sm">
                  Browse services
                </Link>
                <Link to="/chat" className="btn btn--dark btn--sm">
                  Ask support
                </Link>
              </div>
            }
          />
        </div>
      ) : null}

      {serviceMatches.length ? (
        <section>
          <SectionHeader
            eyebrow="Services"
            title={query ? "Matching services" : "Popular services"}
            action={
              <Link to="/services" className="btn btn--outline btn--sm">
                All services <ArrowRight size={14} />
              </Link>
            }
          />
          <ServiceGrid services={serviceMatches.slice(0, 12)} />
        </section>
      ) : null}

      <section className="section">
        <SectionHeader
          eyebrow="Professionals"
          title={
            workerMatches.length
              ? query
                ? "Matching professionals"
                : `Available ${city?.name ? `in ${city.name}` : "near you"}`
              : "Verified professionals"
          }
          subtitle="Every listed professional is approved by EasyHome and has a verified ID on file."
          action={
            <Link to="/book" className="btn btn--dark btn--sm">
              <Sparkles size={15} /> Book a visit
            </Link>
          }
        />

        {workerMatches.length ? (
          <div className="worker-grid">
            {workerMatches
              .slice()
              .sort((a, b) => (b.rating || 0) - (a.rating || 0))
              .map((worker) => (
                <WorkerCard key={worker.id} worker={worker} />
              ))}
          </div>
        ) : loading ? (
          <div className="worker-grid">
            {[1, 2, 3].map((item) => (
              <div className="worker-card" key={item}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: "50%" }} />
                <div className="skeleton" style={{ width: "65%", height: 14 }} />
                <div className="skeleton" style={{ width: "45%", height: 11 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={Users}
              title="No professionals listed for this search"
              body="Book anyway — we dispatch matching requests to approved workers in your area."
              action={
                <Link to={`/book${serviceMatches[0] ? `?service=${serviceMatches[0].key}` : ""}`} className="btn btn--primary">
                  Create a request
                </Link>
              }
            />
          </div>
        )}
      </section>

      <section className="section">
        <div className="urgent-placeholder">
          <div className="urgent-mini">
            <span className="urgent-mini__icon">
              <MapPin size={20} />
            </span>
            <span>
              <strong>{city?.name || "Your city"}</strong>
              <small>We match workers inside a {city?.radiusKm || 25} km radius.</small>
            </span>
          </div>
          <div className="urgent-mini">
            <span className="urgent-mini__icon">
              <BadgeCheck size={20} />
            </span>
            <span>
              <strong>Verified only</strong>
              <small>Pending and suspended workers never appear in search.</small>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
