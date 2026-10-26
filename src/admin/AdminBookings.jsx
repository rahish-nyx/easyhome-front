import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  Banknote,
  CalendarCheck,
  CircleAlert,
  Clock3,
  IndianRupee,
  MapPin,
  Navigation,
  RefreshCw,
  SearchX,
  ShieldCheck,
  Timer,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDateTime, inr, timeAgo } from "../lib/format";
import { mapsUrl } from "../lib/geo";
import { Button, Modal } from "../components/ui";
import {
  AdminPage,
  ConfirmModal,
  CoverageMap,
  EmptyBlock,
  KeyValue,
  LoadingBlock,
  PageError,
  Panel,
  ReasonModal,
  SearchField,
  SegTabs,
  StatCard,
  StatusPill,
  TimeCell,
  jobsWithinRadius,
} from "./adminKit";

const STATUS_TABS = [
  { id: "", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Assigned" },
  { id: "ongoing", label: "Ongoing" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function AdminBookings() {
  const { stats, refreshShell } = useOutletContext();
  const { cities } = useCatalogue();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || "");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [payTarget, setPayTarget] = useState(null);
  const [payMode, setPayMode] = useState("cash");
  const [busy, setBusy] = useState("");
  const payUrgentFee = Math.max(0, Number(payTarget?.urgentFee) || 0);
  const payAmount =
    Number(payTarget?.pricing?.finalPrice || payTarget?.budget || 0) + payUrgentFee;

  const [cityId, setCityId] = useState("");
  const [radius, setRadius] = useState(15);

  const bookingsState = useAsync(
    () => api.get(`/admin/bookings?status=${encodeURIComponent(status)}&limit=150`),
    [status],
  );
  const bookings = bookingsState.data?.bookings || [];

  const queryBooking = params.get("booking") || "";

  useEffect(() => {
    if (!queryBooking || !bookings.length) return;
    const match = bookings.find((booking) => booking.id === queryBooking);
    if (match) setSelected(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryBooking, bookingsState.data]);

  useEffect(() => {
    if (cityId || !cities.length) return;
    const first = cities[0];
    setCityId(first.id);
    setRadius(Number(first.radiusKm) || 15);
  }, [cities, cityId]);

  const city = cities.find((item) => item.id === cityId) || null;

  const activeJobs = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          ["pending", "accepted", "ongoing"].includes(booking.status) &&
          Number.isFinite(Number(booking.location?.lat)),
      ),
    [bookings],
  );

  const mapJobs = useMemo(
    () => jobsWithinRadius(activeJobs, city, radius),
    [activeJobs, city, radius],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return bookings;
    return bookings.filter((booking) =>
      [
        booking.service,
        booking.customerName,
        booking.workerName,
        booking.area,
        booking.status,
        booking.id,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [bookings, query]);

  const changeStatus = (next) => {
    setStatus(next);
    const nextParams = new URLSearchParams(params);
    if (next) nextParams.set("status", next);
    else nextParams.delete("status");
    nextParams.delete("booking");
    setParams(nextParams, { replace: true });
  };

  const openBooking = (booking) => {
    setSelected(booking);
    const nextParams = new URLSearchParams(params);
    nextParams.set("booking", booking.id);
    setParams(nextParams, { replace: true });
  };

  const closeBooking = () => {
    setSelected(null);
    const nextParams = new URLSearchParams(params);
    nextParams.delete("booking");
    setParams(nextParams, { replace: true });
  };

  const cancelBooking = async () => {
    if (!cancelTarget) return;
    if (cancelReason.trim().length < 3) {
      toast.error("Add a short cancellation reason.");
      return;
    }
    setBusy(cancelTarget.id);
    try {
      await api.patch(`/admin/bookings/${cancelTarget.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      toast.success("Booking cancelled and both parties notified.");
      setCancelTarget(null);
      setCancelReason("");
      setSelected(null);
      await Promise.allSettled([bookingsState.run(), refreshShell()]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const markPaid = async () => {
    if (!payTarget) return;
    setBusy(payTarget.id);
    try {
      const result = await api.patch(`/admin/bookings/${payTarget.id}/payment`, {
        mode: payMode,
      });
      toast.success(
        `Payment recorded. Commission ${inr(result.commission)} · worker keeps ${inr(
          result.workerReceives,
        )}.`,
      );
      setPayTarget(null);
      setSelected(null);
      await Promise.allSettled([bookingsState.run(), refreshShell()]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const liveJobs =
    (stats?.bookings?.accepted || 0) + (stats?.bookings?.ongoing || 0);

  return (
    <AdminPage
      eyebrow="Operations"
      title="Bookings & coverage"
      subtitle="Every job, status and payment in one console — plus a live view of the city radius."
      actions={
        <>
          <span className="adm-count-chip">{filtered.length} shown</span>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={bookingsState.loading}
            onClick={() => bookingsState.run().catch(() => {})}
          >
            Refresh
          </Button>
        </>
      }
    >
      <section className="adm-stat-grid adm-stat-grid--4">
        <StatCard
          label="Live jobs"
          value={liveJobs}
          hint="Assigned or in progress"
          icon={Timer}
          tone="blue"
        />
        <StatCard
          label="Waiting for a pro"
          value={stats?.bookings?.pending || 0}
          hint="Unassigned requests"
          icon={Users}
          tone={stats?.bookings?.pending ? "yellow" : "plain"}
        />
        <StatCard
          label="Completed"
          value={stats?.bookings?.completed || 0}
          hint="All-time completed jobs"
          icon={ShieldCheck}
          tone="green"
        />
        <StatCard
          label="Cancelled"
          value={stats?.bookings?.cancelled || 0}
          hint="All-time cancellations"
          icon={XCircle}
          tone="red"
        />
      </section>

      <Panel
        title="Live coverage"
        subtitle="See which jobs sit inside the selected city service radius."
        action={
          <div className="adm-map-controls">
            <label className="adm-inline-field">
              <span>City</span>
              <select
                value={cityId}
                onChange={(event) => {
                  setCityId(event.target.value);
                  const next = cities.find((item) => item.id === event.target.value);
                  setRadius(Number(next?.radiusKm) || 15);
                }}
              >
                {cities.length ? (
                  cities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))
                ) : (
                  <option value="">No cities</option>
                )}
              </select>
            </label>
            <label className="adm-radius">
              <span>Radius</span>
              <input
                type="range"
                min={2}
                max={60}
                step={1}
                value={radius}
                onChange={(event) => setRadius(Number(event.target.value))}
              />
              <strong>{radius} km</strong>
            </label>
          </div>
        }
      >
        <div className="adm-map-grid">
          <CoverageMap center={city} radiusKm={radius} jobs={mapJobs} />
          <div className="adm-map-side">
            <div className="adm-map-side__head">
              <div>
                <p className="adm-eyebrow">In radius</p>
                <h3>{mapJobs.length} active job{mapJobs.length === 1 ? "" : "s"}</h3>
              </div>
              <span className="adm-map-side__radius">{radius} km</span>
            </div>
            {mapJobs.length ? (
              <div className="adm-map-jobs">
                {mapJobs.map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    className="adm-map-job"
                    onClick={() => openBooking(booking)}
                  >
                    <span className={`adm-map-job__dot is-${booking.status}`} />
                    <span className="grow">
                      <strong>{booking.service}</strong>
                      <small>
                        {booking.area} · {timeAgo(booking.createdAt)}
                      </small>
                    </span>
                    <span className="adm-map-job__value">
                      {inr(booking.pricing?.finalPrice || booking.budget)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyBlock
                icon={MapPin}
                title="No active jobs in this radius"
                body="Expand the radius or choose another city."
              />
            )}
            {activeJobs.some((booking) => !Number.isFinite(Number(booking.location?.lat))) ? (
              <p className="adm-fineprint">
                Jobs without a pinned customer location are shown in the table but not on the map.
              </p>
            ) : null}
          </div>
        </div>
      </Panel>

      <div className="adm-toolbar">
        <SegTabs items={STATUS_TABS} value={status} onChange={changeStatus} />
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search service, customer, worker or booking ID…"
          onClear={() => setQuery("")}
        />
      </div>

      <PageError error={bookingsState.error} onRetry={() => bookingsState.run().catch(() => {})} />

      {bookingsState.loading && !bookingsState.data ? (
        <LoadingBlock label="Loading bookings…" />
      ) : (
        <Panel flush>
          {filtered.length ? (
            <>
              <div className="adm-table-wrap adm-table-wrap--desktop">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Worker</th>
                      <th>Value</th>
                      <th>Created</th>
                      <th>Payment</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <button
                            type="button"
                            className="adm-table__title"
                            onClick={() => openBooking(booking)}
                          >
                            <strong>{booking.service}</strong>
                            <span>
                              {booking.area} · {booking.urgency === "urgent" ? "Urgent" : "Normal"}
                            </span>
                          </button>
                        </td>
                        <td>
                          <span className="adm-table__muted">
                            {booking.customerName || "Customer"}
                          </span>
                        </td>
                        <td>
                          <StatusPill status={booking.status} />
                        </td>
                        <td>
                          <span className="adm-table__muted">
                            {booking.workerName || "Unassigned"}
                          </span>
                        </td>
                        <td>
                          <strong className="adm-money">
                            {inr(booking.pricing?.finalPrice || booking.budget)}
                          </strong>
                        </td>
                        <td>
                          <TimeCell value={booking.createdAt} />
                        </td>
                        <td>
                          {booking.paidAt ? (
                            <StatusPill status="paid" label={booking.paymentMode || "Paid"} />
                          ) : (
                            <span className="adm-table__muted">Unpaid</span>
                          )}
                        </td>
                        <td>
                          <div className="adm-row-actions">
                            <button type="button" onClick={() => openBooking(booking)}>
                              Open
                            </button>
                            {booking.status === "completed" && !booking.paidAt ? (
                              <button
                                type="button"
                                className="is-positive"
                                onClick={() => {
                                  setPayMode("cash");
                                  setPayTarget(booking);
                                }}
                              >
                                Mark paid
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="adm-mobile-list">
                {filtered.map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    className="adm-booking-card"
                    onClick={() => openBooking(booking)}
                  >
                    <div className="adm-booking-card__top">
                      <div className="grow">
                        <strong>{booking.service}</strong>
                        <span>
                          {booking.area} · {timeAgo(booking.createdAt)}
                        </span>
                      </div>
                      <StatusPill status={booking.status} />
                    </div>
                    <div className="adm-booking-card__meta">
                      <span>{booking.customerName || "Customer"}</span>
                      <strong>{inr(booking.pricing?.finalPrice || booking.budget)}</strong>
                    </div>
                    <div className="adm-booking-card__foot">
                      <span>{booking.workerName || "Waiting for a pro"}</span>
                      {booking.paidAt ? (
                        <span className="adm-ok-line">Paid · {booking.paymentMode}</span>
                      ) : (
                        <span className="adm-muted">Unpaid</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <EmptyBlock
              icon={SearchX}
              title={query ? "No matching bookings" : "No bookings in this status"}
              body={
                query
                  ? "Try a different service, customer or booking ID."
                  : "New bookings will appear here in real time."
              }
            />
          )}
        </Panel>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={closeBooking}
        title={selected?.service || "Booking detail"}
        subtitle={selected ? `${selected.area} · ${formatDateTime(selected.createdAt)}` : ""}
        size="md"
        footer={
          selected ? (
            <>
              {selected.status !== "cancelled" && selected.status !== "completed" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCancelReason("");
                    setCancelTarget(selected);
                  }}
                >
                  Cancel booking
                </Button>
              ) : null}
              {selected.status === "completed" && !selected.paidAt ? (
                <Button
                  onClick={() => {
                    setPayMode("cash");
                    setPayTarget(selected);
                  }}
                  icon={Wallet}
                >
                  Mark paid
                </Button>
              ) : null}
              {selected.location?.lat ? (
                <a
                  className="btn btn--ghost btn--md"
                  href={mapsUrl(
                    selected.location.lat,
                    selected.location.lng,
                    selected.location.label || selected.area,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation size={16} /> Map
                </a>
              ) : null}
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="stack">
            <div className="adm-inline-badges">
              <StatusPill status={selected.status} />
              <StatusPill status={selected.urgency} />
              {selected.paidAt ? (
                <StatusPill status="paid" label={`Paid · ${selected.paymentMode || "yes"}`} />
              ) : (
                <StatusPill status="pending" label="Payment pending" />
              )}
            </div>

            <div className="adm-kv-grid">
              <KeyValue label="Booking ID" value={<span className="adm-mono">{selected.id}</span>} />
              <KeyValue label="Customer" value={selected.customerName || "Customer"} />
              <KeyValue label="Worker" value={selected.workerName || "Unassigned"} />
              <KeyValue label="Area" value={selected.area} />
              <KeyValue label="Budget" value={inr(selected.budget)} />
              <KeyValue
                label="Final price"
                value={selected.pricing?.finalPrice ? inr(selected.pricing.finalPrice) : "Not set"}
              />
              <KeyValue
                label="Commission"
                value={selected.pricing?.commission ? inr(selected.pricing.commission) : "—"}
              />
              <KeyValue
                label="Worker receives"
                value={
                  selected.pricing?.workerReceives
                    ? inr(selected.pricing.workerReceives)
                    : "—"
                }
              />
              <KeyValue label="Created" value={formatDateTime(selected.createdAt)} />
              <KeyValue
                label="Accepted"
                value={selected.acceptedAt ? formatDateTime(selected.acceptedAt) : "—"}
              />
              <KeyValue
                label="Started"
                value={selected.startedAt ? formatDateTime(selected.startedAt) : "—"}
              />
              <KeyValue
                label="Completed"
                value={selected.completedAt ? formatDateTime(selected.completedAt) : "—"}
              />
            </div>

            <div className="adm-note-block">
              <span>Customer description</span>
              <p>{selected.description || "No description provided."}</p>
            </div>

            {selected.cancelReason ? (
              <div className="adm-note-block adm-note-block--danger">
                <span>Cancellation reason</span>
                <p>{selected.cancelReason}</p>
              </div>
            ) : null}

            {selected.pricing?.customerOffer ? (
              <div className="adm-note-block">
                <span>Customer counter-offer</span>
                <p>{inr(selected.pricing.customerOffer)}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ReasonModal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel this booking?"
        subtitle={cancelTarget ? `${cancelTarget.service} · ${cancelTarget.area}` : ""}
        label="Cancellation reason"
        placeholder="Both the customer and assigned worker will see this reason."
        hint="The worker is notified immediately and the job is removed from the live feed."
        value={cancelReason}
        onChange={setCancelReason}
        loading={busy === cancelTarget?.id}
        confirmLabel="Cancel booking"
        onSubmit={cancelBooking}
      />

      <ConfirmModal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Record payment"
        subtitle={payTarget ? `${payTarget.service} · ${payTarget.customerName}` : ""}
        confirmLabel="Mark as paid"
        loading={busy === payTarget?.id}
        tone="safe"
        onConfirm={markPaid}
      >
        <div className="stack">
          <div className="adm-pay-summary">
            <span>Amount collected</span>
            <strong>{inr(payAmount)}</strong>
          </div>
          {payUrgentFee > 0 ? (
            <p className="tiny muted" style={{ marginTop: -6 }}>
              Includes {inr(payUrgentFee)} urgent-job fee, paid directly to the professional.
            </p>
          ) : null}
          <label className="field">
            <span className="field__label">Payment method</span>
            <select
              className="input"
              value={payMode}
              onChange={(event) => setPayMode(event.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="online">Online</option>
              <option value="card">Card</option>
            </select>
          </label>
          <p className="tiny muted">
            Recording payment calculates commission, creates a commission due for the worker and
            notifies the worker. This cannot be undone.
          </p>
        </div>
      </ConfirmModal>
    </AdminPage>
  );
}
