import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BadgeCheck,
  CircleAlert,
  Gift,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDate, inr } from "../lib/format";
import { Button } from "../components/ui";
import {
  AdminPage,
  ConfirmModal,
  EmptyBlock,
  LoadingBlock,
  PageError,
  Panel,
  SegTabs,
  StatCard,
  StatusPill,
} from "./adminKit";

const TABS = [
  { id: "all", label: "All referrals" },
  { id: "pending", label: "Awaiting service" },
  { id: "service_completed", label: "Needs review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const STATUS_LABELS = {
  pending: "Awaiting first service",
  service_completed: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
};

export default function AdminReferrals() {
  const toast = useToast();
  const { refreshShell } = useOutletContext() || {};
  const [tab, setTab] = useState("all");
  const [dialog, setDialog] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const referralsState = useAsync(() => api.get("/admin/referrals"), []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      referralsState.run().catch(() => {});
    }, 10000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const referrals = referralsState.data?.referrals || [];
  const stats = referralsState.data?.stats || {};

  const counts = useMemo(
    () =>
      referrals.reduce(
        (result, item) => {
          result.all += 1;
          if (result[item.status] !== undefined) result[item.status] += 1;
          return result;
        },
        { all: 0, pending: 0, service_completed: 0, approved: 0, rejected: 0 },
      ),
    [referrals],
  );

  const filtered = useMemo(
    () => (tab === "all" ? referrals : referrals.filter((item) => item.status === tab)),
    [referrals, tab],
  );

  const openDialog = (type, referral) => {
    setNote("");
    setDialog({ type, referral });
  };

  const review = async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      await api.patch(`/admin/referrals/${dialog.referral.id}`, {
        action: dialog.type,
        note,
      });
      toast.success(
        dialog.type === "approve"
          ? "Referral approved. Both members have been notified."
          : "Referral rejected. Both members have been notified.",
      );
      setDialog(null);
      setNote("");
      await referralsState.run();
      refreshShell?.().catch?.(() => {});
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPage
      eyebrow="Growth"
      title="Referrals"
      subtitle="Track every referral from sign-up to first completed service and final approval. Rewards are approved here but never auto-credited to a wallet."
      actions={
        <Button
          variant="ghost"
          onClick={() => referralsState.run().catch(() => {})}
          icon={RefreshCw}
          disabled={referralsState.loading}
        >
          Refresh
        </Button>
      }
    >
      <section className="adm-stat-grid adm-stat-grid--4">
        <StatCard
          label="Total referrals"
          value={stats.total || 0}
          hint="All recorded referral sign-ups"
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Awaiting first service"
          value={stats.pending || 0}
          hint="Friend has not completed a job yet"
          icon={Gift}
          tone="yellow"
        />
        <StatCard
          label="Needs review"
          value={stats.awaitingVerification || 0}
          hint="First service completed"
          icon={CircleAlert}
          tone={(stats.awaitingVerification || 0) > 0 ? "red" : "plain"}
        />
        <StatCard
          label="Approved rewards"
          value={inr(stats.approvedRewards || 0)}
          hint={`${stats.approved || 0} approved referrals`}
          icon={Wallet}
          tone="green"
        />
      </section>

      <div className="adm-toolbar">
        <SegTabs
          items={TABS.map((item) => ({ ...item, count: counts[item.id] }))}
          value={tab}
          onChange={setTab}
        />
        <BadgeCheck size={18} style={{ color: "var(--green-ink, #15803d)" }} />
        <span className="tiny muted">
          Live tracking · refreshes every 10 seconds
        </span>
      </div>

      <PageError
        error={referralsState.error}
        onRetry={() => referralsState.run().catch(() => {})}
      />

      {referralsState.loading && !referralsState.data ? (
        <LoadingBlock label="Loading referrals…" />
      ) : (
        <Panel flush>
          {filtered.length ? (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Referred user</th>
                    <th>Referrer</th>
                    <th>Status</th>
                    <th>Reward</th>
                    <th>Signed up</th>
                    <th>First job / service</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const reviewable = item.status === "service_completed";
                    const decided = ["approved", "rejected"].includes(item.status);
                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.referredName || "User"}</strong>
                          <small className="tiny muted" style={{ display: "block" }}>
                            {item.referredRole === "worker" ? "Professional" : "Customer"}
                            {item.referredEmail ? ` · ${item.referredEmail}` : ""}
                          </small>
                        </td>
                        <td>
                          <strong>{item.referrerName || "User"}</strong>
                          <small className="tiny muted" style={{ display: "block" }}>
                            {item.referrerRole === "worker" ? "Professional" : "Customer"}
                            {item.referrerEmail ? ` · ${item.referrerEmail}` : ""}
                          </small>
                        </td>
                        <td>
                          <StatusPill
                            status={item.status}
                            label={STATUS_LABELS[item.status] || item.status}
                          />
                        </td>
                        <td>
                          <strong>{inr(item.rewardAmount || 51)}</strong>
                          <small className="tiny muted" style={{ display: "block" }}>
                            Not auto-credited
                          </small>
                        </td>
                        <td>{item.createdAt ? formatDate(item.createdAt) : "—"}</td>
                        <td>
                          {item.serviceCompletedAt
                            ? formatDate(item.serviceCompletedAt)
                            : "Not completed"}
                        </td>
                        <td>
                          {reviewable ? (
                            <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                              <Button
                                size="sm"
                                onClick={() => openDialog("approve", item)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openDialog("reject", item)}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : decided ? (
                            <span className="tiny muted">
                              {item.approvedAt
                                ? formatDate(item.approvedAt)
                                : item.rejectedAt
                                  ? formatDate(item.rejectedAt)
                                  : "Reviewed"}
                            </span>
                          ) : (
                            <span
                              className="tiny muted"
                              title={
                                item.referredRole === "worker"
                                  ? "The professional must complete their first job first"
                                  : "The friend must complete their first service first"
                              }
                            >
                              <ShieldCheck size={14} />{" "}
                              {item.referredRole === "worker"
                                ? "Awaiting first job"
                                : "Awaiting first service"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyBlock
              icon={Gift}
              title="No referrals in this view"
              body="New referral sign-ups appear here immediately. Use the tabs to see referrals awaiting a first service, review, or a decision."
            />
          )}
        </Panel>
      )}

      <ConfirmModal
        open={Boolean(dialog)}
        onClose={() => (busy ? null : setDialog(null))}
        title={
          dialog?.type === "approve"
            ? "Approve this referral?"
            : "Reject this referral?"
        }
        subtitle={
          dialog
            ? `${dialog.referral.referredName || "The user"} (${
                dialog.referral.referredRole === "worker"
                  ? "professional"
                  : "customer"
              }) referred by ${
                dialog.referral.referrerName || "another user"
              }.`
            : ""
        }
        confirmLabel={dialog?.type === "approve" ? "Approve ₹51 each" : "Reject referral"}
        loading={busy}
        tone={dialog?.type === "approve" ? "primary" : "danger"}
        onConfirm={review}
      >
        {dialog?.type === "approve" ? (
          <div className="adm-note">
            <ShieldCheck size={16} />
            <p>
              Approval marks the ₹51 rewards as approved for both people and
              notifies them. It does <strong>not</strong> credit a wallet
              automatically. Process the reward separately according to your
              payout process.
            </p>
          </div>
        ) : (
          <>
            <p className="small muted">
              Add an optional internal note. Both people will be notified that
              the referral was not approved.
            </p>
            <label className="field" style={{ marginTop: 10 }}>
              <span>Internal note</span>
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Reason for rejection, e.g. duplicate account"
                maxLength={500}
              />
            </label>
          </>
        )}
      </ConfirmModal>
    </AdminPage>
  );
}
