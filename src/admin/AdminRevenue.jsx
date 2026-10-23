import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Crown,
  IndianRupee,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { compactInr, formatDate, formatDateTime, inr, planLabel, timeAgo } from "../lib/format";
import { Button, Modal } from "../components/ui";
import {
  AdminPage,
  EmptyBlock,
  LoadingBlock,
  PageError,
  Panel,
  ReasonModal,
  RevenueChart,
  SegTabs,
  StatCard,
  StatusPill,
} from "./adminKit";

const SUB_TABS = [
  { id: "pending", label: "Pending" },
  { id: "active", label: "Active" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const COM_TABS = [
  { id: "paid", label: "Submitted" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

export default function AdminRevenue() {
  const { refreshShell } = useOutletContext();
  const toast = useToast();
  const [tab, setTab] = useState("memberships");
  const [subStatus, setSubStatus] = useState("pending");
  const [comStatus, setComStatus] = useState("paid");
  const [busy, setBusy] = useState("");
  const [rejectSub, setRejectSub] = useState(null);
  const [rejectSubReason, setRejectSubReason] = useState("");
  const [rejectCommissionTarget, setRejectCommissionTarget] = useState(null);
  const [rejectCommissionReason, setRejectCommissionReason] = useState("");
  const [expireOpen, setExpireOpen] = useState(false);

  const revenueState = useAsync(() => api.get("/admin/revenue"), []);
  const subsState = useAsync(
    () => api.get(`/admin/subscriptions?status=${encodeURIComponent(subStatus)}`),
    [subStatus],
  );
  const commissionsState = useAsync(
    () => api.get(`/admin/commissions?status=${encodeURIComponent(comStatus)}`),
    [comStatus],
  );

  const revenue = revenueState.data || {};
  const months = revenue.months || [];
  const subscriptions = subsState.data?.subscriptions || [];
  const commissions = commissionsState.data?.commissions || [];

  const refreshAll = async () => {
    await Promise.allSettled([
      revenueState.run(),
      subsState.run(),
      commissionsState.run(),
      refreshShell(),
    ]);
  };

  const approveSubscription = async (subscription) => {
    setBusy(`sub-approve:${subscription.id}`);
    try {
      await api.patch(`/admin/subscriptions/${subscription.id}/approve`);
      toast.success(
        `${subscription.userName || "Member"} activated on ${planLabel(subscription.plan)}.`,
      );
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const rejectSubscription = async () => {
    if (!rejectSub) return;
    if (rejectSubReason.trim().length < 3) {
      toast.error("Add a reason for the member.");
      return;
    }
    setBusy(`sub-reject:${rejectSub.id}`);
    try {
      await api.patch(`/admin/subscriptions/${rejectSub.id}/reject`, {
        reason: rejectSubReason.trim(),
      });
      toast.success("Membership request rejected.");
      setRejectSub(null);
      setRejectSubReason("");
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const approveCommission = async (commission) => {
    setBusy(`com-approve:${commission.id}`);
    try {
      await api.patch(`/admin/commissions/${commission.id}/approve`);
      toast.success(
        `Commission ${inr(commission.amount)} approved for ${commission.workerName || "worker"}.`,
      );
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const rejectCommissionAction = async () => {
    if (!rejectCommissionTarget) return;
    if (rejectCommissionReason.trim().length < 3) {
      toast.error("Add a reason for the worker.");
      return;
    }
    setBusy(`com-reject:${rejectCommissionTarget.id}`);
    try {
      await api.patch(`/admin/commissions/${rejectCommissionTarget.id}/reject`, {
        reason: rejectCommissionReason.trim(),
      });
      toast.success("Commission submission rejected.");
      setRejectCommissionTarget(null);
      setRejectCommissionReason("");
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const expirePremium = async () => {
    setBusy("expire");
    try {
      const result = await api.post("/admin/maintenance/expire-premium");
      toast.success(
        result.expired
          ? `${result.expired} expired membership${result.expired === 1 ? "" : "s"} cleaned up.`
          : "No expired memberships found.",
      );
      setExpireOpen(false);
      await refreshAll();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <AdminPage
      eyebrow="Money"
      title="Revenue & approvals"
      subtitle="Membership payments, worker commissions and the numbers behind the marketplace."
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            icon={CalendarClock}
            onClick={() => setExpireOpen(true)}
          >
            Expire memberships
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={revenueState.loading}
            onClick={() => refreshAll().catch(() => {})}
          >
            Refresh
          </Button>
        </>
      }
    >
      <section className="adm-stat-grid adm-stat-grid--4">
        <StatCard
          label="Total revenue"
          value={inr(revenue.total)}
          hint="Approved memberships + commissions"
          icon={TrendingUp}
          tone="yellow"
        />
        <StatCard
          label="Memberships"
          value={inr(revenue.subscriptionTotal)}
          hint="Active paid plans"
          icon={Crown}
          tone="purple"
        />
        <StatCard
          label="Commission"
          value={inr(revenue.commissionTotal)}
          hint="Approved worker commission"
          icon={Wallet}
          tone="green"
        />
        <StatCard
          label="This month"
          value={compactInr(months[months.length - 1]?.amount)}
          hint="Membership + commission"
          icon={IndianRupee}
          tone="blue"
        />
      </section>

      <div className="adm-grid-2">
        <Panel title="Revenue mix" subtitle="Last six months, approved only">
          <RevenueChart months={months} height={230} />
        </Panel>
        <Panel title="Monthly breakdown" subtitle="Membership vs commission">
          <div className="adm-revenue-list">
            {months.map((month) => (
              <div className="adm-revenue-row" key={month.key}>
                <span>{month.label}</span>
                <div className="adm-revenue-row__bar">
                  <i
                    className="is-sub"
                    style={{
                      width: `${
                        month.amount
                          ? Math.max(2, ((month.subscriptions || 0) / month.amount) * 100)
                          : 0
                      }%`,
                    }}
                  />
                  <i
                    className="is-com"
                    style={{
                      width: `${
                        month.amount
                          ? Math.max(2, ((month.commissions || 0) / month.amount) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <strong>{inr(month.amount)}</strong>
              </div>
            ))}
          </div>
          <div className="adm-revenue-legend">
            <span>
              <i className="is-sub" /> Memberships
            </span>
            <span>
              <i className="is-com" /> Commission
            </span>
          </div>
        </Panel>
      </div>

      <div className="adm-toolbar">
        <SegTabs
          items={[
            { id: "memberships", label: "Membership approvals" },
            { id: "commissions", label: "Commission queue" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "memberships" ? (
        <>
          <SegTabs
            className="adm-subtabs"
            items={SUB_TABS}
            value={subStatus}
            onChange={setSubStatus}
          />
          <PageError error={subsState.error} onRetry={() => subsState.run().catch(() => {})} />
          {subsState.loading && !subsState.data ? (
            <LoadingBlock label="Loading membership requests…" />
          ) : (
            <Panel flush>
              {subscriptions.length ? (
                <div className="adm-approval-list">
                  {subscriptions.map((subscription) => (
                    <article className="adm-approval" key={subscription.id}>
                      <span className="adm-approval__icon">
                        <Crown size={19} />
                      </span>
                      <div className="grow">
                        <div className="adm-approval__title">
                          <strong>{subscription.userName || "Member"}</strong>
                          <span className="adm-pill adm-pill--yellow">
                            {planLabel(subscription.plan)}
                          </span>
                          <StatusPill status={subscription.status} />
                        </div>
                        <p>
                          {subscription.userEmail || "No email"} ·{" "}
                          {subscription.userRole === "worker" ? "Worker" : "Customer"} ·{" "}
                          {timeAgo(subscription.createdAt)}
                        </p>
                        {subscription.paymentNote ? (
                          <small className="adm-note-inline">
                            Payment note: {subscription.paymentNote}
                          </small>
                        ) : null}
                        {subscription.rejectionReason ? (
                          <small className="adm-note-inline is-danger">
                            Rejected: {subscription.rejectionReason}
                          </small>
                        ) : null}
                        {subscription.startAt ? (
                          <small className="adm-note-inline">
                            Active {formatDate(subscription.startAt)} –{" "}
                            {formatDate(subscription.endAt)}
                          </small>
                        ) : null}
                      </div>
                      <div className="adm-approval__side">
                        <strong>{inr(subscription.amount)}</strong>
                        <span>{subscription.months || 1} month plan</span>
                        {subscription.status === "pending" ? (
                          <div className="adm-inline-actions">
                            <Button
                              size="sm"
                              icon={BadgeCheck}
                              loading={busy === `sub-approve:${subscription.id}`}
                              onClick={() => approveSubscription(subscription)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              icon={XCircle}
                              onClick={() => {
                                setRejectSubReason("");
                                setRejectSub(subscription);
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyBlock
                  icon={subStatus === "pending" ? CheckCircle2 : Crown}
                  title="No memberships in this state"
                  body={
                    subStatus === "pending"
                      ? "All membership payments have been reviewed."
                      : "Nothing to show for this filter."
                  }
                />
              )}
            </Panel>
          )}
        </>
      ) : (
        <>
          <SegTabs
            className="adm-subtabs"
            items={COM_TABS}
            value={comStatus}
            onChange={setComStatus}
          />
          <PageError
            error={commissionsState.error}
            onRetry={() => commissionsState.run().catch(() => {})}
          />
          {commissionsState.loading && !commissionsState.data ? (
            <LoadingBlock label="Loading commission queue…" />
          ) : (
            <Panel flush>
              {commissions.length ? (
                <div className="adm-approval-list">
                  {commissions.map((commission) => (
                    <article className="adm-approval" key={commission.id}>
                      <span className="adm-approval__icon is-green">
                        <Banknote size={19} />
                      </span>
                      <div className="grow">
                        <div className="adm-approval__title">
                          <strong>{commission.workerName || "Worker"}</strong>
                          <StatusPill status={commission.status} />
                        </div>
                        <p>
                          {commission.service || "Job"} · {timeAgo(commission.createdAt)} ·{" "}
                          <span className="adm-mono">{commission.bookingId?.slice(0, 12)}…</span>
                        </p>
                        {commission.note ? (
                          <small className="adm-note-inline">
                            Worker reference: {commission.note}
                          </small>
                        ) : null}
                        {commission.rejectionReason ? (
                          <small className="adm-note-inline is-danger">
                            Rejected: {commission.rejectionReason}
                          </small>
                        ) : null}
                        {commission.approvedAt ? (
                          <small className="adm-note-inline">
                            Approved {formatDateTime(commission.approvedAt)}
                          </small>
                        ) : null}
                      </div>
                      <div className="adm-approval__side">
                        <strong>{inr(commission.amount)}</strong>
                        <span>commission</span>
                        {["paid", "pending"].includes(commission.status) ? (
                          <div className="adm-inline-actions">
                            <Button
                              size="sm"
                              icon={ShieldCheck}
                              loading={busy === `com-approve:${commission.id}`}
                              onClick={() => approveCommission(commission)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              icon={XCircle}
                              onClick={() => {
                                setRejectCommissionReason("");
                                setRejectCommissionTarget(commission);
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyBlock
                  icon={Wallet}
                  title="No commissions in this state"
                  body={
                    comStatus === "paid"
                      ? "Workers have no payments waiting for verification."
                      : "Nothing to show for this filter."
                  }
                />
              )}
            </Panel>
          )}
        </>
      )}

      <ReasonModal
        open={Boolean(rejectSub)}
        onClose={() => setRejectSub(null)}
        title="Reject membership payment"
        subtitle={rejectSub ? `${rejectSub.userName} · ${inr(rejectSub.amount)}` : ""}
        label="Reason"
        placeholder="e.g. UPI reference did not match any received payment."
        value={rejectSubReason}
        onChange={setRejectSubReason}
        loading={busy === `sub-reject:${rejectSub?.id}`}
        confirmLabel="Reject payment"
        onSubmit={rejectSubscription}
      />

      <ReasonModal
        open={Boolean(rejectCommissionTarget)}
        onClose={() => setRejectCommissionTarget(null)}
        title="Reject commission payment"
        subtitle={
          rejectCommissionTarget
            ? `${rejectCommissionTarget.workerName} · ${inr(rejectCommissionTarget.amount)}`
            : ""
        }
        label="Reason"
        placeholder="e.g. UTR not found in the EasyHome account."
        value={rejectCommissionReason}
        onChange={setRejectCommissionReason}
        loading={busy === `com-reject:${rejectCommissionTarget?.id}`}
        confirmLabel="Reject commission"
        onSubmit={rejectCommissionAction}
      />

      <Modal
        open={expireOpen}
        onClose={() => setExpireOpen(false)}
        title="Expire memberships"
        subtitle="Premium access housekeeping"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setExpireOpen(false)}>
              Cancel
            </Button>
            <Button loading={busy === "expire"} onClick={expirePremium} icon={Crown}>
              Run expiry check
            </Button>
          </>
        }
      >
        <p className="small muted">
          This scans approved workers and clears premium flags whose end date has passed. Run it
          after bulk changes or once a day. Active memberships are untouched.
        </p>
      </Modal>
    </AdminPage>
  );
}
