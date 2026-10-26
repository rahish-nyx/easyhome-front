import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  MapPin,
  MessageSquare,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDate, inr, isActiveUntil } from "../lib/format";
import { SERVICE_META } from "../lib/constants";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  PageLoader,
  SectionHeader,
} from "../components/ui";
import { RatingStars, ServiceIcon } from "../components/common";

export default function WorkerPublic() {
  const { id } = useParams();
  const { fbUser } = useAuth();
  const toast = useToast();
  const [sharing, setSharing] = useState(false);
  const { data, loading, error } = useAsync(
    () => api.get(`/public/workers/${id}`),
    [id],
  );

  const worker = data?.worker;
  const reviews = data?.reviews || [];
  const meta = SERVICE_META[worker?.serviceKey] || {};
  const isPro =
    isActiveUntil(worker?.premiumUntil) ||
    (worker?.isPremium === true && !worker?.premiumUntil);

  usePageMeta(
    worker ? `${worker.name} — ${worker.service || meta.name}` : "Verified professional",
    worker
      ? `Book ${worker.name}, a verified ${worker.service || meta.name} professional in ${
          worker.area || "your city"
        } on EasyHome.`
      : "View a verified EasyHome professional.",
  );

  const share = async () => {
    if (!worker) return;
    setSharing(true);
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${worker.name} on EasyHome`,
          text: `Book ${worker.name} — ${worker.service} on EasyHome.`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied.");
      }
    } catch {
      /* user cancelled */
    } finally {
      setSharing(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="page">
        <PageLoader label="Loading professional…" />
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="page page--narrow">
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="This profile is unavailable"
            body={error?.message || "The professional may no longer be listed on EasyHome."}
            action={
              <Link to="/search?q=" className="btn btn--primary">
                Find another pro
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const bookLink = `/book?service=${encodeURIComponent(worker.serviceKey || "")}&worker=${worker.id}`;

  return (
    <div className="page">
      <Link to="/search?q=" className="btn btn--ghost btn--sm" style={{ marginBottom: 14, paddingLeft: 0 }}>
        <ArrowLeft size={15} /> Back to search
      </Link>

      <div className="worker-public">
        <Card className="worker-public__hero">
          <Avatar name={worker.name} path={worker.photoPath} size={112} ring={isPro} />
          <h1>{worker.name}</h1>
          <p className="small muted" style={{ marginTop: 4 }}>
            {worker.service || meta.name} · {worker.area || "Local pro"}
          </p>

          <div className="worker-public__meta">
            {isPro ? (
              <Badge tone="yellow">
                <BadgeCheck size={11} /> Verified Pro
              </Badge>
            ) : null}
            {worker.kycStatus === "verified" ? (
              <Badge tone="blue">
                <BadgeCheck size={11} /> ID verified
              </Badge>
            ) : null}
            <Badge tone={worker.online === false ? "outline" : "green"} dot>
              {worker.online === false ? "Offline" : "Online now"}
            </Badge>
          </div>

          <div className="worker-public__stats">
            <div className="worker-public__stat">
              <strong>{Number(worker.rating || 0).toFixed(1)}</strong>
              <small>{worker.reviewCount || 0} reviews</small>
            </div>
            <div className="worker-public__stat">
              <strong>{worker.jobsCompleted || 0}</strong>
              <small>Jobs done</small>
            </div>
            <div className="worker-public__stat">
              <strong>{inr(worker.pricePerWork || 199)}</strong>
              <small>Starting</small>
            </div>
          </div>

          <div className="stack stack--sm" style={{ marginTop: 18 }}>
            <Button
              variant="primary"
              size="lg"
              className="btn--block"
              onClick={() => {
                window.location.href = bookLink;
              }}
              icon={CalendarCheck}
            >
              Book {worker.name.split(" ")[0]}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="btn--block"
              onClick={share}
              loading={sharing}
              icon={Share2}
            >
              Share profile
            </Button>
          </div>

          <div className="stack stack--sm" style={{ marginTop: 16, textAlign: "left" }}>
            <span className="tiny muted row" style={{ gap: 6 }}>
              <MapPin size={13} /> Serves {worker.area || "the local area"}
            </span>
            <span className="tiny muted row" style={{ gap: 6 }}>
              <ShieldCheck size={13} /> Government ID checked by EasyHome
            </span>
            <span className="tiny muted row" style={{ gap: 6 }}>
              <Wallet size={13} /> Pay after the job — cash or UPI
            </span>
          </div>

          {fbUser ? (
            <Link to="/chat" className="btn btn--ghost btn--sm btn--block" style={{ marginTop: 12 }}>
              <MessageSquare size={14} /> Ask support about this pro
            </Link>
          ) : (
            <Link to={`/auth?next=${encodeURIComponent(bookLink)}`} className="btn btn--ghost btn--sm btn--block" style={{ marginTop: 12 }}>
              Sign in to book
            </Link>
          )}
        </Card>

        <div className="stack">
          <Card className="card--pad">
            <SectionHeader
              eyebrow="About"
              title={worker.bio ? "A few words" : "Verified professional"}
              action={
                <ServiceIcon service={{ key: worker.serviceKey }} size={46} iconSize={22} />
              }
            />
            <p className="small" style={{ lineHeight: 1.7 }}>
              {worker.bio ||
                `${worker.name} is a verified ${worker.service || meta.name} professional serving ${
                  worker.area || "the local area"
                }. Every EasyHome pro is ID-checked, and reviews only come from completed bookings.`}
            </p>
            <div className="grid grid--3" style={{ marginTop: 18 }}>
              <div className="card card--soft card--pad" style={{ padding: 14 }}>
                <strong style={{ display: "block", fontSize: 15 }}>
                  {worker.reviewCount || 0}
                </strong>
                <span className="tiny muted">Ratings earned</span>
              </div>
              <div className="card card--soft card--pad" style={{ padding: 14 }}>
                <strong style={{ display: "block", fontSize: 15 }}>
                  {worker.jobsCompleted || 0}
                </strong>
                <span className="tiny muted">Jobs completed</span>
              </div>
              <div className="card card--soft card--pad" style={{ padding: 14 }}>
                <strong style={{ display: "block", fontSize: 15 }}>
                  {worker.radiusKm || 25} km
                </strong>
                <span className="tiny muted">Service radius</span>
              </div>
            </div>
          </Card>

          <Card className="card--pad">
            <SectionHeader
              eyebrow="Verified reviews"
              title={
                reviews.length
                  ? `${Number(worker.rating || 0).toFixed(1)} · ${reviews.length} review${
                      reviews.length === 1 ? "" : "s"
                    }`
                  : "No reviews yet"
              }
              action={<RatingStars value={worker.rating} size={16} />}
            />

            {reviews.length ? (
              <div className="stack">
                {reviews.map((review) => (
                  <article className="review-card" key={review.id}>
                    <div className="review-card__head">
                      <Avatar name={review.customerName || "Customer"} size={34} />
                      <div className="grow">
                        <strong>{review.customerName || "EasyHome customer"}</strong>
                        <p className="tiny muted">
                          {review.service} · {formatDate(review.createdAt, { year: false })}
                        </p>
                      </div>
                      <RatingStars value={review.stars} size={13} />
                    </div>
                    {review.comment ? <p>{review.comment}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Star}
                title="Be the first to review"
                body="Reviews are unlocked after a completed booking, so every rating here is earned."
                action={
                  <Link to={bookLink} className="btn btn--dark btn--sm">
                    Book this pro
                  </Link>
                }
              />
            )}
          </Card>

          <Card className="card--pad" style={{ background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }}>
            <div className="row row--between row--wrap" style={{ gap: 14 }}>
              <div>
                <p className="eyebrow" style={{ color: "rgba(255,255,255,.5)" }}>
                  Ready when you are
                </p>
                <h3 style={{ fontSize: 20 }}>Book {worker.name.split(" ")[0]} for your home.</h3>
                <p className="small" style={{ color: "rgba(255,255,255,.6)", marginTop: 5 }}>
                  Set a budget, agree the final price, pay after completion.
                </p>
              </div>
              <Link to={bookLink} className="btn btn--primary">
                <Sparkles size={15} /> Start a booking
              </Link>
            </div>
          </Card>

          <p className="tiny muted" style={{ textAlign: "center" }}>
            <BriefcaseBusiness size={11} style={{ display: "inline", marginRight: 4 }} />
            EasyHome only lists approved professionals. Report concerns to support.
          </p>
        </div>
      </div>
    </div>
  );
}
