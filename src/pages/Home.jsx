import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bolt,
  Clock3,
  Crown,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useLocation } from "../context/LocationContext";
import { useLiveQuery } from "../hooks/useLive";
import { qUrgent } from "../lib/queries";
import { api } from "../lib/api";
import { usePageMeta } from "../lib/usePageMeta";
import { inr, timeAgo } from "../lib/format";
import {
  distanceKm,
  distanceLabel,
  jobInServiceArea,
} from "../lib/geo";
import { SERVICE_META } from "../lib/constants";
import { SectionHeader } from "../components/ui";
import {
  PromoCarousel,
  SearchBar,
  ServiceGrid,
  WorkerCard,
} from "../components/common";

export default function Home() {
  usePageMeta(
    "Home services on demand",
    "Book verified cleaners, plumbers, electricians, AC technicians and more near you. Transparent prices, pay after the job.",
  );

  const { fbUser, loading: authLoading } = useAuth();
  const { services, promos, settings } = useCatalogue();
  const { city, point, zoneCheck } = useLocation();
  const location = useMemo(
    () =>
      city &&
      point &&
      Number.isFinite(Number(point.lat)) &&
      Number.isFinite(Number(point.lng)) &&
      (!zoneCheck.configured || zoneCheck.allowed)
        ? { ...city, lat: point.lat, lng: point.lng }
        : null,
    [city, point, zoneCheck.configured, zoneCheck.allowed],
  );
  const urgentQuery = useMemo(() => qUrgent(10), []);
  const urgent = useLiveQuery(urgentQuery);
  const [nearbyResult, setNearbyResult] = useState({
    key: "",
    workers: [],
    error: "",
  });
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [topRated, setTopRated] = useState({
    workers: [],
    loading: false,
    error: "",
  });
  const nearbyLocationKey = location
    ? [
        location.name,
        location.state,
        location.areaName || "",
        location.lat,
        location.lng,
        zoneCheck.zone?.id || "",
        zoneCheck.zone?.radiusKm || "",
      ].join("|")
    : "";
  const nearby = useMemo(
    () =>
      nearbyResult.key === nearbyLocationKey ? nearbyResult.workers : [],
    [nearbyResult, nearbyLocationKey],
  );

  const localUrgent = useMemo(
    () =>
      urgent.data.filter((job) =>
        jobInServiceArea(job, location, zoneCheck.zone),
      ),
    [urgent.data, location, zoneCheck.zone],
  );

  useEffect(() => {
    if (!location) return undefined;

    let active = true;
    let firstRequest = true;
    const loadNearby = async () => {
      if (firstRequest) setNearbyLoading(true);
      const query = new URLSearchParams({
        city: location.name,
        state: location.state,
        areaName: location.areaName || "",
        lat: String(location.lat),
        lng: String(location.lng),
        limit: "6",
      });
      try {
        const result = await api.get(`/public/workers/nearby?${query}`);
        if (active) {
          setNearbyResult({
            key: nearbyLocationKey,
            workers: result.workers || [],
            error: "",
          });
        }
      } catch (error) {
        if (active) {
          setNearbyResult({
            key: nearbyLocationKey,
            workers: [],
            error: error.message,
          });
        }
      } finally {
        if (active && firstRequest) {
          firstRequest = false;
          setNearbyLoading(false);
        }
      }
    };

    loadNearby();
    const timer = window.setInterval(loadNearby, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [
    location,
    nearbyLocationKey,
  ]);

  useEffect(() => {
    if (authLoading || fbUser) return undefined;

    let active = true;
    setTopRated((current) => ({ ...current, loading: true, error: "" }));
    api
      .get("/public/workers/top-rated?limit=5")
      .then((result) => {
        if (active) {
          setTopRated({
            workers: result.workers || [],
            loading: false,
            error: "",
          });
        }
      })
      .catch((error) => {
        if (active) {
          setTopRated({ workers: [], loading: false, error: error.message });
        }
      });

    return () => {
      active = false;
    };
  }, [authLoading, fbUser]);

  const showingTopRated = !authLoading && !fbUser;

  const nearbyWithDistance = useMemo(
    () =>
      nearby
        .map((worker) => ({
          ...worker,
          distance:
            Number.isFinite(Number(worker.distanceKm))
              ? Number(worker.distanceKm)
              : distanceKm(location, worker),
        })),
    [nearby, location],
  );

  const popular = services.slice(0, 10);
  const displayWorkers = showingTopRated ? topRated.workers : nearbyWithDistance;
  const displayLoading = showingTopRated ? topRated.loading : nearbyLoading;
  const displayError = showingTopRated ? topRated.error : nearbyResult.error;

  return (
    <>
      <PromoCarousel promos={promos.filter((promo) => promo.placement !== "worker_dashboard")} />

      <div className="page" style={{ paddingTop: 0 }}>
        <section style={{ paddingTop: 30 }}>
          <div
            className="row row--between row--wrap"
            style={{ alignItems: "flex-end", gap: 18 }}
          >
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow">Home services, sorted</p>
              <h1
                style={{
                  fontSize: "clamp(28px, 4.4vw, 46px)",
                  maxWidth: "18ch",
                  letterSpacing: "-0.05em",
                }}
              >
                Good help is <span style={{ background: "var(--yellow)", padding: "0 5px" }}>closer</span>{" "}
                than you think.
              </h1>
              <p className="muted" style={{ marginTop: 10, maxWidth: "54ch", fontSize: 14.5 }}>
                Verified professionals for cleaning, repairs and upkeep — at your door in
                minutes, with prices you agree before the work starts.
              </p>
            </div>
            <div className="row row--wrap" style={{ gap: 16 }}>
              <span className="row small" style={{ gap: 7 }}>
                <ShieldCheck size={16} style={{ color: "var(--green)" }} /> ID-verified pros
              </span>
              <span className="row small" style={{ gap: 7 }}>
                <Wallet size={16} style={{ color: "var(--green)" }} /> Pay after service
              </span>
              <span className="row small" style={{ gap: 7 }}>
                <Clock3 size={16} style={{ color: "var(--green)" }} /> Same-day slots
              </span>
            </div>
          </div>

          <div style={{ marginTop: 24, maxWidth: 720 }}>
            <SearchBar autoFocus={false} />
          </div>

          <div className="row row--wrap" style={{ marginTop: 14, gap: 8 }}>
            <span className="tiny muted">Popular:</span>
            {services.slice(0, 5).map((service) => (
              <Link
                key={service.id || service.key}
                to={`/services/${service.key}`}
                className="badge badge--outline"
                style={{ background: "#fff" }}
              >
                {service.name}
              </Link>
            ))}
          </div>
        </section>

        {!fbUser ? (
          <section className="section">
            <div className="guest-role">
              <div className="guest-role__intro">
                <p className="eyebrow">Join EasyHome</p>
                <h2>One platform. Two ways in.</h2>
                <p>
                  Create a customer account to book trusted help, or apply as a
                  professional to receive local jobs in your trade.
                </p>
              </div>
              <div className="guest-role__grid">
                <Link to="/auth?mode=signup" className="guest-role__card">
                  <span className="guest-role__icon">
                    <Users size={22} />
                  </span>
                  <span className="grow">
                    <strong>Book home services</strong>
                    <small>I need help at home · Customer account</small>
                  </span>
                  <ArrowRight size={17} />
                </Link>
                <Link
                  to="/auth?role=worker&mode=signup"
                  className="guest-role__card guest-role__card--dark"
                >
                  <span className="guest-role__icon">
                    <Sparkles size={22} />
                  </span>
                  <span className="grow">
                    <strong>Work as a professional</strong>
                    <small>I want local jobs · Professional account</small>
                  </span>
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <section className="section">
          <SectionHeader
            eyebrow="What do you need?"
            title="Book a trusted pro"
            subtitle={`${services.length} service categories, one accountable platform.`}
            action={
              <Link to="/services" className="btn btn--outline btn--sm">
                View all services <ArrowRight size={15} />
              </Link>
            }
          />
          <ServiceGrid services={popular} />
        </section>

        <section className="section">
          <SectionHeader
            eyebrow="Need it now?"
            title="Urgent jobs near you"
            subtitle="Live requests from homes around you — book an urgent visit and a pro is dispatched first."
            action={
              <Link to="/book?urgency=urgent" className="btn btn--dark btn--sm">
                <Bolt size={15} /> Need help now
              </Link>
            }
          />

          {localUrgent.length ? (
            <div className="urgent-track">
              {localUrgent.slice(0, 8).map((job) => (
                <article className="urgent-card" key={job.id}>
                  <span className="urgent-card__bar" />
                  <div className="urgent-card__top">
                    <span className="urgent-card__pulse">Urgent now</span>
                    <span className="tiny" style={{ color: "rgba(255,255,255,.5)" }}>
                      {timeAgo(job.createdAt)}
                    </span>
                  </div>
                  <div>
                    <h3 className="urgent-card__title">{job.service}</h3>
                    <div className="urgent-card__meta">
                      <span>
                        <MapPin size={12} /> {job.area || city?.name || "Nearby"}
                      </span>
                      <span>
                        <Timer size={12} /> ASAP
                      </span>
                    </div>
                  </div>
                  <div className="urgent-card__foot">
                    <span className="urgent-card__budget">{inr(job.budget)}</span>
                    <Link
                      to={`/book?service=${encodeURIComponent(job.serviceKey || "")}&urgency=urgent`}
                      className="urgent-card__cta"
                    >
                      Get help <ArrowRight size={13} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="urgent-placeholder">
              {[
                { icon: Bolt, title: "Power out?", body: "Urgent electricians are on standby." },
                { icon: Sparkles, title: "Guests coming?", body: "Same-day deep cleaning slots." },
                { icon: Clock3, title: "Leaking tap?", body: "Plumbers typically arrive in 60–90 min." },
              ].map((item) => (
                <Link
                  key={item.title}
                  to={`/book?urgency=urgent${item.title.includes("Power") ? "&service=electrical" : item.title.includes("Guests") ? "&service=cleaning" : "&service=plumbing"}`}
                  className="urgent-mini"
                >
                  <span className="urgent-mini__icon">
                    <item.icon size={20} />
                  </span>
                  <span className="grow">
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                  </span>
                  <ArrowRight size={15} className="muted" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <SectionHeader
            eyebrow={showingTopRated ? "Top rated" : "Around you"}
            title={
              showingTopRated
                ? "Available Pros in Your Area"
                : nearbyWithDistance.length
                  ? city?.name
                    ? `Available pros in ${city.name}`
                    : "Available near you"
                  : "Available services near you"
            }
            subtitle={
              showingTopRated
                ? "The five highest-rated verified professionals on EasyHome, ranked by customer ratings."
                : nearbyWithDistance.length
                  ? "Independent professionals with verified IDs, real ratings and transparent starting prices."
                  : "Pick a service and we will match a verified professional for your slot."
            }
            action={
              <Link
                to={displayWorkers.length ? "/search?q=" : "/services"}
                className="btn btn--outline btn--sm"
              >
                {displayWorkers.length ? "Find a pro" : "Browse services"} <ArrowRight size={15} />
              </Link>
            }
          />

          {displayWorkers.length ? (
            <div className="worker-grid">
              {displayWorkers.map((worker) => (
                <div key={worker.id}>
                  <WorkerCard worker={worker} />
                  {!showingTopRated && worker.distance !== null ? (
                    <p className="tiny muted" style={{ marginTop: 6, paddingLeft: 4 }}>
                      {distanceLabel(worker.distance)} from {city?.name}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : displayLoading ? (
            <div className="urgent-placeholder">
              <p className="muted small">Finding verified professionals inside your live service radius…</p>
            </div>
          ) : displayError ? (
            <div className="urgent-placeholder">
              <p className="muted small">{displayError}</p>
            </div>
          ) : (
            <div className="urgent-placeholder">
              {services.slice(0, 3).map((service) => (
                <Link
                  key={service.id || service.key}
                  to={`/book?service=${service.key}`}
                  className="urgent-mini"
                >
                  <span className="urgent-mini__icon">
                    <TrendingUp size={20} />
                  </span>
                  <span className="grow">
                    <strong>{service.name}</strong>
                    <small>
                      from {inr(service.fromPrice || SERVICE_META[service.key]?.from || 199)} · book in 1 min
                    </small>
                  </span>
                  <ArrowRight size={15} className="muted" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <div className="membership">
            <div>
              <span className="badge badge--dark">
                <Crown size={12} /> EasyHome Pro
              </span>
              <h2 className="membership__title" style={{ marginTop: 12 }}>
                Priority help. No urgent-job extra charge. Zero guesswork.
              </h2>
              <p className="membership__sub">
                One membership for the whole home. Get active priority matching, no 10%
                urgent-job extra charge and 24×7 priority support on every booking.
              </p>
              <div className="membership__perks">
                {(settings.customerBenefits || []).slice(0, 4).map((benefit) => (
                  <span className="membership__perk" key={benefit}>
                    <Star size={11} fill="currentColor" /> {benefit}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="membership__price">
                <strong>{inr(settings.subscriptionPrice || 199)}</strong>
                <small>/ month · no auto-renewal</small>
              </div>
              <Link
                to="/subscription"
                className="btn btn--dark btn--lg"
                style={{ marginTop: 14, width: "100%" }}
              >
                Explore membership
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="grid grid--3">
            {[
              {
                icon: BadgeCheck,
                title: "Verified before they arrive",
                body: "Every pro clears an ID and trade check. KYC documents stay private.",
              },
              {
                icon: Users,
                title: "Real ratings, real work",
                body: "Reviews come only from completed jobs, so what you see is earned.",
              },
              {
                icon: Wallet,
                title: "No surprise invoices",
                body: "Agree the final price in the app before work starts. Pay after it's done.",
              },
            ].map((item) => (
              <div className="card card--pad" key={item.title}>
                <span className="stat__icon" style={{ width: 42, height: 42 }}>
                  <item.icon size={20} />
                </span>
                <h3 style={{ fontSize: 16, marginTop: 14 }}>{item.title}</h3>
                <p className="small muted" style={{ marginTop: 6 }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
