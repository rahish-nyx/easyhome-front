import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Crown,
  Expand,
  Headphones,
  MapPin,
  MessageSquare,
  Navigation,
  ShieldCheck,
  Star,
  Timer,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useLiveQuery } from "../hooks/useLive";
import { qBookingsForCustomer } from "../lib/queries";
import { api } from "../lib/api";
import { mediaUrl } from "../lib/media";
import { cx, formatDateTime, inr, toDate } from "../lib/format";
import { STATUS_TABS } from "../lib/constants";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  PageLoader,
  Select,
  Tabs,
  Textarea,
} from "../components/ui";
import { ServiceIcon } from "../components/common";

export default function Bookings() {
  usePageMeta(
    "My bookings",
    "Track every EasyHome request â€” live status, agreed prices, payments and reviews.",
  );

  const { user, profile, isPremium } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const created = params.get("created");
  const query = useMemo(
    () => (user ? qBookingsForCustomer(user.uid) : null),
    [user],
  );
  const { data: bookings, loading, error } = useLiveQuery(query);
  const [tab, setTab] = useState("active");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [busyId] = useState("");

  const groups = useMemo(() => {
    const active = bookings.filter((item) =>
      ["pending", "accepted", "ongoing"].includes(item.status),
    );
    const track = bookings.filter(
      (item) =>
        Boolean(item.workerId) && ["accepted", "ongoing"].includes(item.status),
    );
    const completed = bookings.filter((item) => item.status === "completed");
    const cancelled = bookings.filter((item) => item.status === "cancelled");
    return { active, track, completed, cancelled };
  }, [bookings]);

  const shown = groups[tab] || [];

  const tabs = STATUS_TABS.map((item) => ({
    ...item,
    count: groups[item.id]?.length || 0,
  }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Your home, handled</p>
          <h1>My bookings</h1>
          <p>Live status, agreed prices and one place for every visit.</p>
        </div>
        <Link to="/book" className="btn btn--primary">
          <CalendarCheck size={16} /> New booking
        </Link>
      </div>

      {created ? (
        <div
          className="card card--pad"
          style={{
            background: "var(--green-soft)",
            borderColor: "transparent",
            marginBottom: 18,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <CheckCircle2 size={20} style={{ color: "var(--green)", flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: 14 }}>Request sent successfully</strong>
            <p className="small" style={{ color: "#0a6b4c" }}>
              We are matching you with a verified pro. Keep notifications on â€” the first
              acceptance usually arrives within minutes.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="inline-error" style={{ marginBottom: 16 }}>
          <CircleAlert size={18} />
          <div>
            <strong>Could not load bookings</strong>
            <p>{error.message}</p>
          </div>
        </div>
      ) : null}

      <Tabs items={tabs} value={tab} onChange={setTab} />

      <div className="booking-list" style={{ marginTop: 18 }}>
        {loading && !bookings.length ? (
          <div className="stack">
            {[1, 2, 3].map((item) => (
              <div className="card card--pad" key={item}>
                <div className="row" style={{ gap: 12 }}>
                  <div className="skeleton" style={{ width: 46, height: 46, borderRadius: 13 }} />
                  <div className="grow">
                    <div className="skeleton" style={{ width: "50%", height: 15, marginBottom: 7 }} />
                    <div className="skeleton" style={{ width: "32%", height: 11 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : shown.length ? (
          shown.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              busy={busyId === booking.id}
              isPremium={isPremium}
              onCancel={() => setCancelTarget(booking)}
              onPay={() => setPayTarget(booking)}
              onReview={() => setReviewTarget(booking)}
            />
          ))
        ) : (
          <div className="card">
            <EmptyState
              icon={
                tab === "completed"
                  ? CheckCircle2
                  : tab === "cancelled"
                    ? X
                    : tab === "track"
                      ? Navigation
                      : CalendarCheck
              }
              title={
                tab === "completed"
                  ? "No completed bookings yet"
                  : tab === "cancelled"
                    ? "Nothing cancelled"
                    : tab === "track"
                      ? "No live jobs to track"
                      : "No active bookings"
              }
              body={
                tab === "active"
                  ? "Book a verified professional and track the request here from acceptance to payment."
                  : tab === "track"
                    ? "Once a pro accepts, their live location, phone number and job timer appear here."
                    : tab === "completed"
                      ? "Completed jobs and receipts will appear here."
                      : "Cancelled requests will be kept here for your records."
              }
              action={
                tab === "active" ? (
                  <Link to="/services" className="btn btn--primary">
                    Browse services <ArrowRight size={15} />
                  </Link>
                ) : null
              }
            />
          </div>
        )}
      </div>

      <div className="card card--pad section" style={{ background: "var(--paper-2)", borderColor: "transparent" }}>
        <div className="row row--between row--wrap">
          <div className="row" style={{ gap: 12 }}>
            <span className="stat__icon">
              <Headphones size={19} />
            </span>
            <div>
              <strong style={{ fontSize: 14 }}>Need help with a booking?</strong>
              <p className="small muted">Support can reschedule, mediate or cancel for you.</p>
            </div>
          </div>
          <Link to={`/chat${shown[0] ? `?booking=${shown[0].id}` : ""}`} className="btn btn--dark btn--sm">
            <MessageSquare size={15} /> Chat support
          </Link>
        </div>
      </div>

      <CancelModal
        booking={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onDone={() => {
          setCancelTarget(null);
          toast.success("Booking cancelled.");
        }}
      />

      <PaymentModal
        booking={payTarget}
        profile={profile}
        onClose={() => setPayTarget(null)}
        onDone={() => {
          setPayTarget(null);
          toast.success("Payment recorded. Thank you!");
        }}
      />

      <ReviewModal
        booking={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onDone={() => {
          setReviewTarget(null);
          toast.success("Thanks for the review!");
        }}
      />
    </div>
  );
}

const MILESTONES = [
  { id: "assigned", label: "Assigned" },
  { id: "en_route", label: "En route" },
  { id: "arrived", label: "Arrived" },
  { id: "working", label: "In progress" },
  { id: "completed", label: "Completed" },
];

function useLiveElapsed(startedAt, stoppedAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt || stoppedAt) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, stoppedAt]);
  const start = toDate(startedAt);
  if (!start) return "";
  const end = stoppedAt ? toDate(stoppedAt) : new Date(now);
  const seconds = Math.max(
    0,
    Math.floor(((end ? end.getTime() : now) - start.getTime()) / 1000),
  );
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

function MilestoneRail({ phaseIndex, cancelled, timer }) {
  return (
    <ol className="booking-card__rail" aria-label="Job progress">
      {MILESTONES.map((step, index) => {
        const done = phaseIndex >= 0 && index <= phaseIndex;
        const current = index === phaseIndex;
        const isFinal = index === MILESTONES.length - 1;
        const finished = isFinal && current;
        return (
          <li
            key={step.id}
            className={cx(
              "booking-card__step",
              done && "is-done",
              current && "is-current",
              (isFinal && (done || current)) && "is-final",
              cancelled && index > phaseIndex && "is-skipped",
            )}
          >
            <span className="booking-card__step-mark">
              {done || finished ? <Check size={12} strokeWidth={3} /> : index + 1}
            </span>
            <span className="booking-card__step-label">{step.label}</span>
            {step.id === "working" && current && timer ? (
              <span className="booking-card__timer">
                <span className="booking-card__timer-dot" /> {timer}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function BookingCard({ booking, busy, isPremium, onCancel, onPay, onReview }) {
  const [preview, setPreview] = useState(-1);
  const worker = booking.workerName;
  const isPro = Boolean(isPremium || booking.customerPremium);
  const paidTotal =
    booking.status === "completed" && booking.paidAt
      ? Number(booking.pricing?.paymentTotal) || 0
      : 0;
  const price =
    paidTotal ||
    booking.pricing?.finalPrice ||
    booking.pricing?.workerPrice ||
    booking.pricing?.customerOffer ||
    booking.budget;
  const promoDiscount = Math.max(
    0,
    Number(booking.promoDiscount) || Number(booking.pricing?.promoDiscount) || 0,
  );
  const windowMinutes = 5;
  const createdAt = toDate(booking.createdAt);
  const deadline = createdAt
    ? new Date(createdAt.getTime() + windowMinutes * 60_000)
    : toDate(booking.freeCancellationUntil);
  const windowOpen = !deadline || Date.now() <= deadline.getTime();
  const minutesLeft = deadline
    ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 60_000))
    : null;
  const canCancel =
    ["pending", "accepted"].includes(booking.status) && windowOpen;
  const cancelled = booking.status === "cancelled";

  const phase =
    booking.trackingPhase ||
    (booking.status === "completed"
      ? "completed"
      : booking.status === "ongoing"
        ? "working"
        : booking.status === "accepted" && booking.workerId
          ? "assigned"
          : "");
  const phaseIndex = cancelled ? 0 : MILESTONES.findIndex((step) => step.id === phase);
  const timer = useLiveElapsed(booking.startedAt, booking.completedAt);

  const photos = (
    Array.isArray(booking.imagePaths) && booking.imagePaths.length
      ? booking.imagePaths
      : [booking.imagePath]
  )
    .map(mediaUrl)
    .filter(Boolean);

  const statusBadge = cancelled ? (
    <Badge tone="red">Cancelled</Badge>
  ) : booking.status === "completed" ? (
    <Badge tone="green">
      <CheckCircle2 size={12} /> Completed
    </Badge>
  ) : booking.status === "ongoing" ? (
    <Badge tone="blue" className="booking-card__status-outline">
      In progress
    </Badge>
  ) : booking.status === "accepted" ? (
    <Badge tone="blue" className="booking-card__status-outline">
      Worker assigned
    </Badge>
  ) : (
    <Badge tone="amber">Finding a pro</Badge>
  );

  return (
    <article
      className={cx(
        "card booking-card booking-card--tile",
        cancelled && "booking-card--cancelled",
        booking.status === "completed" && "booking-card--completed",
      )}
    >
      <header className="booking-card__head">
        <div className="booking-card__title">
          <span className="booking-card__icon">
            <ServiceIcon service={{ key: booking.serviceKey }} size={48} iconSize={23} />
          </span>
          <div>
            <h3>{booking.service}</h3>
            <div className="booking-card__meta">
              <span>
                <Clock3 size={12} /> {formatDateTime(booking.createdAt)}
              </span>
              <span className="booking-card__meta-sep">|</span>
              <span>
                <MapPin size={12} /> {booking.area}
              </span>
            </div>
          </div>
        </div>
        <div className="booking-card__badges">
          {statusBadge}
          {isPro ? (
            <Badge tone="yellow" className="booking-card__tier">
              <Crown size={12} /> EasyHome Pro
            </Badge>
          ) : (
            <Badge tone="neutral" className="booking-card__tier">
              <ShieldCheck size={12} /> Normal
            </Badge>
          )}
        </div>
      </header>

      {booking.description || photos.length ? (
        <div className="booking-card__panel">
          {booking.description ? (
            <p className="booking-card__message">
              <MessageSquare size={14} /> <span>{booking.description}</span>
            </p>
          ) : null}
          {photos.length ? (
            <div className="booking-card__photos">
              {photos.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  className="booking-card__photo"
                  onClick={() => setPreview(index)}
                  aria-label={`Open reference photo ${index + 1}`}
                >
                  <img src={src} alt={`${booking.service} reference ${index + 1}`} loading="lazy" />
                  <span className="booking-card__photo-zoom">
                    <Expand size={13} />
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="booking-card__workerrow">
        {worker ? (
          <>
            <Avatar name={worker} path={booking.workerPhotoPath} size={42} />
            <div className="booking-card__workerinfo">
              <strong>
                {worker}
                {booking.workerId ? (
                  <BadgeCheck size={14} className="booking-card__verified" />
                ) : null}
              </strong>
              <small>
                <Star size={11} fill="currentColor" />{" "}
                {booking.workerRating
                  ? `${Number(booking.workerRating).toFixed(1)} (${booking.workerJobsCompleted || 0} jobs)`
                  : "New EasyHome pro"}
                {booking.workerPremium ? (
                  <span className="booking-card__pro-tag">Pro</span>
                ) : null}
              </small>
            </div>
            {booking.workerId ? (
              <Link to={`/workers/${booking.workerId}`} className="btn btn--ghost btn--sm">
                View Profile <ChevronRight size={14} />
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <span
              className="stat__icon"
              style={{ background: "var(--yellow-soft)", color: "var(--yellow-ink)" }}
            >
              <Timer size={18} />
            </span>
            <div className="booking-card__workerinfo">
              <strong>Finding your pro</strong>
              <small>We notify approved {booking.service} workers near you.</small>
            </div>
          </>
        )}
      </div>

      <div className="booking-card__pricebox">
        <div>
          <strong>{inr(price)}</strong>
          <small>{booking.pricing?.confirmedAt || booking.pricing?.finalPrice ? "Agreed price" : "Budget reference"}</small>
          {promoDiscount > 0 ? (
            <small className="booking-card__saved">
              {paidTotal ? "Saved" : "Promo"} {inr(promoDiscount)} with{" "}
              {booking.promoCode || booking.pricing?.promoCode || "promo"}
            </small>
          ) : null}
        </div>
        {paidTotal || (booking.status === "completed" && booking.paidAt) ? (
          <span className="booking-card__paid">
            <CheckCircle2 size={14} /> Paid via {booking.paymentMode || "cash"}
          </span>
        ) : booking.pricing?.finalPrice || booking.status !== "pending" ? (
          <span className="booking-card__confirmed">
            <BadgeCheck size={14} /> Price confirmed at {inr(booking.pricing?.finalPrice || price)}
          </span>
        ) : (
          <span className="booking-card__awaiting">Awaiting pro quote</span>
        )}
      </div>

      {cancelled ? (
        <div className="booking-card__cancelled">
          <CircleAlert size={15} />
          <span>
            This booking was cancelled.
            {booking.cancelReason ? ` ${booking.cancelReason}` : ""}
          </span>
        </div>
      ) : (
        <MilestoneRail phaseIndex={phaseIndex} cancelled={cancelled} timer={timer} />
      )}

      <footer className="booking-card__actions">
        <div className="booking-card__actions-left">
          {cancelled ? (
            <span className="booking-card__window is-closed">
              <X size={13} /> Booking cancelled
            </span>
          ) : windowOpen && canCancel ? (
            <span className="booking-card__window">
              <Timer size={13} /> Free cancellation Â· {minutesLeft ?? 0} min left
            </span>
          ) : (
            <span className="booking-card__window is-closed">
              <Timer size={13} /> Cancellation window closed
            </span>
          )}
          {canCancel ? (
            <button type="button" className="booking-card__cancel" disabled={busy} onClick={onCancel}>
              Cancel request
            </button>
          ) : null}
        </div>
        <div className="booking-card__actions-right">
          <Link to={`/chat${booking.workerId ? `?booking=${booking.id}` : ""}`} className="booking-card__chat">
            <Headphones size={15} /> Chat Support
          </Link>
          {["pending", "accepted", "ongoing"].includes(booking.status) ? (
            <Link to={`/bookings/${booking.id}/track`} className="btn btn--dark btn--sm">
              <Navigation size={14} /> Track
            </Link>
          ) : null}
          {booking.status === "completed" && !booking.paidAt ? (
            <Button size="sm" variant="primary" onClick={onPay} icon={Wallet}>
              Complete payment
            </Button>
          ) : null}
          {booking.status === "completed" && booking.paidAt && !booking.reviewId ? (
            <Button size="sm" variant="dark" onClick={onReview} icon={Star}>
              Rate your pro
            </Button>
          ) : null}
          {booking.reviewId ? (
            <Badge tone="green">
              <Star size={11} /> Reviewed
            </Badge>
          ) : null}
          <Link to="/chat" className="btn btn--outline btn--sm">
            <MessageSquare size={14} /> Support
          </Link>
        </div>
      </footer>

      <p className="booking-card__ref">Booking Ref: {booking.id.slice(0, 8).toUpperCase()}</p>

      <Modal
        open={preview >= 0}
        onClose={() => setPreview(-1)}
        title="Reference photos"
        subtitle={booking.service}
        size="lg"
      >
        {preview >= 0 ? (
          <img
            className="booking-card__preview"
            src={photos[preview]}
            alt={`${booking.service} reference ${preview + 1}`}
          />
        ) : null}
        {photos.length > 1 ? (
          <div className="booking-card__thumbs">
            {photos.map((src, index) => (
              <button
                key={src}
                type="button"
                className={cx("booking-card__thumb", index === preview && "is-active")}
                onClick={() => setPreview(index)}
                aria-label={`Show reference photo ${index + 1}`}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </Modal>
    </article>
  );
}

function CancelModal({ booking, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const windowMinutes = 5;
  const createdAt = toDate(booking?.createdAt);
  const deadline = createdAt
    ? new Date(createdAt.getTime() + windowMinutes * 60_000)
    : toDate(booking?.freeCancellationUntil);
  const closed = Boolean(deadline && Date.now() > deadline.getTime());

  const submit = async () => {
    if (!booking) return;
    setBusy(true);
    try {
      await api.patch(`/bookings/${booking.id}/cancel`, { reason: reason.trim() });
      onDone();
      setReason("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(booking)}
      onClose={onClose}
      title="Cancel this booking?"
      subtitle={
        booking
          ? `Free cancellation is available for the first ${windowMinutes} minutes after booking. After that, support can help.`
          : ""
      }
      size="sm"
      footer={
        closed ? (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Keep booking
            </Button>
            <Button variant="danger" loading={busy} onClick={submit}>
              Cancel booking
            </Button>
          </>
        )
      }
    >
      {closed ? (
        <div className="notice notice--danger">
          <CircleAlert size={18} />
          <div>
            <strong>Free cancellation window closed</strong>
            <p>
              This booking is past the {windowMinutes}-minute free cancellation
              window. Chat with support and we will help you resolve it.
            </p>
            <Link to="/chat" className="btn btn--dark btn--sm" style={{ marginTop: 8 }}>
              <MessageSquare size={14} /> Chat support
            </Link>
          </div>
        </div>
      ) : (
        <Field label="Reason (optional)" htmlFor="cancel-reason">
          <Textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            maxLength={300}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Plans changed, found another pro, timing no longer worksâ€¦"
          />
        </Field>
      )}
    </Modal>
  );
}

function PaymentModal({ booking, profile, onClose, onDone }) {
  const toast = useToast();
  const [mode, setMode] = useState("cash");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (booking?.workerPaymentMode) setMode(booking.workerPaymentMode);
  }, [booking?.id, booking?.workerPaymentMode]);

  const baseAmount =
    booking?.pricing?.finalPrice ||
    booking?.pricing?.workerPrice ||
    booking?.budget ||
    0;
  const urgentFee = Number(booking?.urgentFee) || 0;
  const subtotal = Number(baseAmount) + urgentFee;
  const promoDiscount = Math.min(
    subtotal,
    Math.max(
      0,
      Number(booking?.promoDiscount) || Number(booking?.pricing?.promoDiscount) || 0,
    ),
  );
  const amount = Math.max(0, subtotal - promoDiscount);

  const submit = async () => {
    if (!booking) return;
    if (mode === "upi" && reference.trim().length < 4) {
      toast.error("Add the UPI reference / UTR so we can reconcile the payment.");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/bookings/${booking.id}/payment`, {
        mode,
        reference: reference.trim(),
      });
      onDone();
      setReference("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(booking)}
      onClose={onClose}
      title="Confirm payment"
      subtitle="Only confirm after the job is completed and you have paid the professional directly."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button loading={busy} onClick={submit}>
            Confirm {inr(amount)} paid
          </Button>
        </>
      }
    >
      <div className="stack">
        <div
          className="row row--between"
          style={{ background: "var(--paper-2)", padding: 14, borderRadius: 12 }}
        >
          <span className="small muted">
            {urgentFee > 0 ? "Total including urgent fee" : "Agreed amount"}
          </span>
          <span style={{ textAlign: "right" }}>
            {promoDiscount > 0 ? (
              <small
                className="price-strike"
                style={{ display: "block", fontSize: 12 }}
              >
                {inr(subtotal)}
              </small>
            ) : null}
            <strong style={{ fontSize: 20 }}>{inr(amount)}</strong>
          </span>
        </div>

        {promoDiscount > 0 ? (
          <p className="tiny" style={{ color: "var(--green)", fontWeight: 700 }}>
            {booking?.promoCode || booking?.pricing?.promoCode || "Promo"} applied â€”
            you save {inr(promoDiscount)}.
          </p>
        ) : null}

        {urgentFee > 0 ? (
          <p className="tiny muted">
            Includes {inr(urgentFee)} urgent-job fee (10% of your booking budget). Pro members
            have this fee waived.
          </p>
        ) : null}

        <Field label="Payment method" htmlFor="pay-mode">
          <Select id="pay-mode" value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </Select>
        </Field>

        {mode !== "cash" ? (
          <Field
            label="Reference / UTR"
            htmlFor="pay-ref"
            hint="Copy the reference from your UPI or banking app."
          >
            <Input
              id="pay-ref"
              value={reference}
              maxLength={120}
              onChange={(event) => setReference(event.target.value)}
              placeholder="e.g. 420918273645"
            />
          </Field>
        ) : null}

        <p className="tiny muted">
          EasyHome does not collect the service amount. Pay the professional directly; the
          platform records the completion and service fees separately.
        </p>

        {profile?.phone ? (
          <p className="tiny muted">Your contact on file: â€¢â€¢â€¢â€¢â€¢{String(profile.phone).slice(-4)}</p>
        ) : null}
      </div>
    </Modal>
  );
}

function ReviewModal({ booking, onClose, onDone }) {
  const toast = useToast();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!booking) return;
    setBusy(true);
    try {
      await api.post(`/bookings/${booking.id}/review`, { stars, comment: comment.trim() });
      onDone();
      setComment("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(booking)}
      onClose={onClose}
      title="How did it go?"
      subtitle={booking ? `Rate ${booking.workerName} on the ${booking.service} visit.` : ""}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <Button loading={busy} onClick={submit}>
            Submit review
          </Button>
        </>
      }
    >
      <div className="stack">
        <div>
          <p className="field__label" style={{ marginBottom: 8 }}>
            Your rating
          </p>
          <div className="stars-input">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={star <= stars ? "is-active" : ""}
                onClick={() => setStars(star)}
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
              >
                <Star size={30} fill={star <= stars ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>
        <Field label="Comment (optional)" htmlFor="review-comment">
          <Textarea
            id="review-comment"
            rows={4}
            maxLength={500}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Punctual, tidy and fixed it properlyâ€¦"
          />
        </Field>
        <p className="tiny muted">
          Reviews are public and tied to this completed booking. Be fair and specific.
        </p>
      </div>
    </Modal>
  );
}
