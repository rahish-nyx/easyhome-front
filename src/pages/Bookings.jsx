import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Crown,
  Headphones,
  IndianRupee,
  MapPin,
  MessageSquare,
  Navigation,
  ReceiptText,
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
import { formatDateTime, inr } from "../lib/format";
import { SERVICE_META, STATUS_META, STATUS_TABS } from "../lib/constants";
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
import {
  BookingTimeline,
  ServiceIcon,
  StatusBadge,
} from "../components/common";

export default function Bookings() {
  usePageMeta(
    "My bookings",
    "Track every EasyHome request — live status, agreed prices, payments and reviews.",
  );

  const { fbUser, profile } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const created = params.get("created");
  const query = useMemo(
    () => (fbUser ? qBookingsForCustomer(fbUser.uid) : null),
    [fbUser],
  );
  const { data: bookings, loading, error } = useLiveQuery(query);
  const [tab, setTab] = useState("active");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [offerTarget, setOfferTarget] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [busyId, setBusyId] = useState("");

  const groups = useMemo(() => {
    const active = bookings.filter((item) =>
      ["pending", "accepted", "ongoing"].includes(item.status),
    );
    const completed = bookings.filter((item) => item.status === "completed");
    const cancelled = bookings.filter((item) => item.status === "cancelled");
    return { active, completed, cancelled };
  }, [bookings]);

  const shown = groups[tab] || [];

  const acceptPrice = async (booking) => {
    setBusyId(booking.id);
    try {
      await api.patch(`/bookings/${booking.id}/accept-price`);
      toast.success("Price accepted. Your pro can start the job now.");
    } catch (submitError) {
      toast.error(submitError.message);
    } finally {
      setBusyId("");
    }
  };

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
              We are matching you with a verified pro. Keep notifications on — the first
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
              onAccept={() => acceptPrice(booking)}
              onCancel={() => setCancelTarget(booking)}
              onOffer={() => setOfferTarget(booking)}
              onPay={() => setPayTarget(booking)}
              onReview={() => setReviewTarget(booking)}
            />
          ))
        ) : (
          <div className="card">
            <EmptyState
              icon={tab === "completed" ? CheckCircle2 : tab === "cancelled" ? X : CalendarCheck}
              title={
                tab === "completed"
                  ? "No completed bookings yet"
                  : tab === "cancelled"
                    ? "Nothing cancelled"
                    : "No active bookings"
              }
              body={
                tab === "active"
                  ? "Book a verified professional and track the request here from acceptance to payment."
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

      <OfferModal
        booking={offerTarget}
        onClose={() => setOfferTarget(null)}
        onDone={() => {
          setOfferTarget(null);
          toast.success("Counter-offer sent to your pro.");
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

function BookingCard({ booking, busy, onAccept, onCancel, onOffer, onPay, onReview }) {
  const meta = STATUS_META[booking.status] || { hint: "" };
  const worker = booking.workerName;
  const price =
    booking.pricing?.finalPrice ||
    booking.pricing?.workerPrice ||
    booking.pricing?.customerOffer ||
    booking.budget;
  const canCancel = ["pending", "accepted"].includes(booking.status);
  const quoteReady =
    booking.status === "accepted" &&
    booking.pricing?.workerPrice &&
    !booking.pricing?.confirmedAt;
  const alreadyOffered = Boolean(booking.pricing?.customerOffer);

  return (
    <article className="card booking-card">
      <div className="booking-card__head">
        <div className="booking-card__title">
          <span className="booking-card__icon">
            <ServiceIcon service={{ key: booking.serviceKey }} size={46} iconSize={22} />
          </span>
          <div>
            <h3>{booking.service}</h3>
            <div className="booking-card__meta">
              <span>
                <Clock3 size={12} /> {formatDateTime(booking.createdAt)}
              </span>
              <span>
                <MapPin size={12} /> {booking.area}
              </span>
              <span>
                <Timer size={12} /> {booking.urgency === "urgent" ? "Urgent" : "Normal"}
              </span>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {booking.urgency === "urgent" ? <Badge tone="red">Urgent</Badge> : null}
          <StatusBadge status={booking.status} />
        </div>
      </div>

      <p className="small muted" style={{ marginTop: 12 }}>
        {meta.hint}
      </p>

      <div className="booking-card__body">
        <div className="booking-card__worker">
          {worker ? (
            <>
              <Avatar name={worker} path={booking.workerPhotoPath} size={40} />
              <div>
                <strong>
                  {worker} {booking.workerId ? <BadgeCheck size={14} style={{ color: "var(--blue)" }} /> : null}
                </strong>
                <small>
                  {booking.workerId ? (
                    <Link to={`/workers/${booking.workerId}`}>View verified profile</Link>
                  ) : (
                    "Matching a verified pro"
                  )}
                </small>
              </div>
            </>
          ) : (
            <>
              <span
                className="stat__icon"
                style={{ background: "var(--yellow-soft)", color: "var(--yellow-ink)" }}
              >
                <Timer size={18} />
              </span>
              <div>
                <strong>Finding your pro</strong>
                <small>We notify approved {booking.service} workers near you.</small>
              </div>
            </>
          )}
        </div>
        <div className="booking-card__price">
          <strong>{inr(price)}</strong>
          <small>
            {booking.status === "completed" && booking.paidAt
              ? `Paid via ${booking.paymentMode || "cash"}`
              : booking.pricing?.confirmedAt
                ? "Agreed price"
                : "Budget / quote"}
          </small>
          {booking.urgency === "urgent" ? (
            <small style={{ display: "block", marginTop: 3 }}>
              {booking.urgentFee
                ? `+ ${inr(booking.urgentFee)} priority fee`
                : "Priority fee waived"}
            </small>
          ) : null}
        </div>
      </div>

      {quoteReady ? (
        <div
          className="offer-box"
          style={{ background: "var(--yellow-soft)", alignItems: "center" }}
        >
          <div className="grow">
            <strong style={{ fontSize: 13.5 }}>
              {worker} quoted {inr(booking.pricing.workerPrice)}
            </strong>
            <p className="tiny muted" style={{ color: "var(--yellow-ink)" }}>
              Accept to unlock contact details, or send one counter-offer.
              {alreadyOffered
                ? ` Your offer of ${inr(booking.pricing.customerOffer)} is awaiting the pro.`
                : ""}
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {!alreadyOffered ? (
              <Button size="sm" variant="outline" onClick={onOffer}>
                Counter
              </Button>
            ) : null}
            <Button size="sm" loading={busy} onClick={onAccept}>
              Accept {inr(booking.pricing.workerPrice)}
            </Button>
          </div>
        </div>
      ) : null}

      {booking.status === "accepted" && booking.pricing?.confirmedAt ? (
        <div
          className="row"
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--green-soft)",
            color: "#0a6b4c",
            fontSize: 12,
          }}
        >
          <BadgeCheck size={16} /> Price confirmed at {inr(booking.pricing.finalPrice)}. Your pro
          will contact you before arriving.
        </div>
      ) : null}

      {booking.status === "cancelled" && booking.cancelReason ? (
        <p className="tiny muted" style={{ marginTop: 12 }}>
          Reason: {booking.cancelReason}
        </p>
      ) : null}

      <BookingTimeline booking={booking} />

      <div className="booking-card__actions">
        {canCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel request
          </Button>
        ) : null}

        {booking.status === "completed" && !booking.paidAt ? (
          <Button size="sm" variant="primary" onClick={onPay} icon={Wallet}>
            Confirm payment
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

        {booking.status === "accepted" || booking.status === "ongoing" ? (
          <Link to={`/bookings/${booking.id}/track`} className="btn btn--dark btn--sm">
            <Navigation size={14} /> Live tracking
          </Link>
        ) : null}

        {booking.status === "accepted" || booking.status === "ongoing" ? (
          <Link to="/chat" className="btn btn--outline btn--sm">
            <MessageSquare size={14} /> Support
          </Link>
        ) : null}

        <span className="grow" />
        <span className="tiny muted">Ref {booking.id.slice(0, 8).toUpperCase()}</span>
      </div>
    </article>
  );
}

function CancelModal({ booking, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

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
      subtitle="Free cancellation before the job starts. Repeated cancellations may affect your account."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep booking
          </Button>
          <Button variant="danger" loading={busy} onClick={submit}>
            Cancel booking
          </Button>
        </>
      }
    >
      <Field label="Reason (optional)" htmlFor="cancel-reason">
        <Textarea
          id="cancel-reason"
          rows={3}
          value={reason}
          maxLength={300}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Plans changed, found another pro, timing no longer works…"
        />
      </Field>
    </Modal>
  );
}

function OfferModal({ booking, onClose, onDone }) {
  const toast = useToast();
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!booking) return;
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount < 99) {
      toast.error("Enter a valid amount of at least ₹99.");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/bookings/${booking.id}/offer`, { price: Math.round(amount) });
      onDone();
      setPrice("");
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
      title="Send a counter-offer"
      subtitle={
        booking
          ? `${booking.workerName} quoted ${inr(booking.pricing?.workerPrice || 0)}. You get one counter-offer per booking.`
          : ""
      }
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button loading={busy} onClick={submit}>
            Send offer
          </Button>
        </>
      }
    >
      <Field label="Your price (₹)" htmlFor="offer-price" hint="The pro can accept or confirm a final price.">
        <Input
          id="offer-price"
          type="number"
          min={99}
          max={100000}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder={String(booking?.pricing?.workerPrice || booking?.budget || 199)}
        />
      </Field>
    </Modal>
  );
}

function PaymentModal({ booking, profile, onClose, onDone }) {
  const toast = useToast();
  const [mode, setMode] = useState("cash");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const amount =
    booking?.pricing?.finalPrice ||
    booking?.pricing?.workerPrice ||
    booking?.budget ||
    0;

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
          <span className="small muted">Agreed amount</span>
          <strong style={{ fontSize: 20 }}>{inr(amount)}</strong>
        </div>

        <Field label="Payment method" htmlFor="pay-mode">
          <Select id="pay-mode" value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="online">Online transfer</option>
            <option value="card">Card</option>
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
          platform records the completion and commission separately.
        </p>

        {profile?.phone ? (
          <p className="tiny muted">Your contact on file: •••••{String(profile.phone).slice(-4)}</p>
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
            placeholder="Punctual, tidy and fixed it properly…"
          />
        </Field>
        <p className="tiny muted">
          Reviews are public and tied to this completed booking. Be fair and specific.
        </p>
      </div>
    </Modal>
  );
}
