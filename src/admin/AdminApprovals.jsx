import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleAlert,
  Crown,
  ExternalLink,
  IdCard,
  MapPin,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldX,
  Star,
  UserCheck,
  UserX,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDate, formatDateTime, inr, timeAgo } from "../lib/format";
import { mapsUrl } from "../lib/geo";
import { Avatar, Button } from "../components/ui";
import { AuthedImage } from "../components/common";
import {
  AdminPage,
  EmptyBlock,
  KeyValue,
  LoadingBlock,
  PageError,
  Panel,
  ReasonModal,
  SearchField,
  SegTabs,
  StatusPill,
} from "./adminKit";

const STATUS_TABS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "suspended", label: "Suspended" },
  { id: "all", label: "All workers" },
];

export default function AdminApprovals() {
  const toast = useToast();
  const { refreshShell } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || "pending");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(params.get("worker") || "");
  const [actionBusy, setActionBusy] = useState("");
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState("");
  const [kycDialog, setKycDialog] = useState(null);
  const [kycReason, setKycReason] = useState("");

  const workersState = useAsync(
    () => api.get(`/admin/workers?status=${encodeURIComponent(status)}`),
    [status],
  );
  const workers = workersState.data?.workers || [];

  useEffect(() => {
    const fromQuery = params.get("worker");
    if (fromQuery) setSelectedId(fromQuery);
  }, [params]);

  useEffect(() => {
    if (selectedId && workers.some((worker) => worker.id === selectedId)) return;
    if (workers.length) setSelectedId(workers[0].id);
    else if (!workersState.loading) setSelectedId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workersState.data, workersState.loading]);

  const selected = workers.find((worker) => worker.id === selectedId) || null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return workers;
    return workers.filter((worker) =>
      [worker.name, worker.email, worker.phone, worker.service, worker.area, worker.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [workers, query]);

  const changeStatus = (next) => {
    setStatus(next);
    const nextParams = new URLSearchParams(params);
    nextParams.set("status", next);
    nextParams.delete("worker");
    setParams(nextParams, { replace: true });
    setSelectedId("");
  };

  const selectWorker = (worker) => {
    setSelectedId(worker.id);
    const nextParams = new URLSearchParams(params);
    nextParams.set("worker", worker.id);
    setParams(nextParams, { replace: true });
  };

  const review = async (worker, action, note = "") => {
    setActionBusy(`${action}:${worker.id}`);
    try {
      await api.patch(`/admin/workers/${worker.id}/review`, {
        action,
        ...(note ? { reason: note } : {}),
      });
      toast.success(
        action === "approve" || action === "reinstate"
          ? `${worker.name || "Worker"} is approved and live.`
          : action === "suspend"
            ? `${worker.name || "Worker"} was suspended.`
            : `${worker.name || "Worker"} was rejected.`,
      );
      setDialog(null);
      setReason("");
      await Promise.allSettled([workersState.run(), refreshShell()]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionBusy("");
    }
  };

  const reviewKyc = async (worker, action, note = "") => {
    setActionBusy(`kyc:${action}:${worker.id}`);
    try {
      await api.patch(`/admin/workers/${worker.id}/kyc`, {
        action,
        ...(note ? { reason: note } : {}),
      });
      toast.success(action === "verify" ? "ID verified." : "KYC rejection saved.");
      setKycDialog(null);
      setKycReason("");
      await Promise.allSettled([workersState.run(), refreshShell()]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionBusy("");
    }
  };

  return (
    <AdminPage
      eyebrow="Supply quality"
      title="Worker verification"
      subtitle="Review identity, trade details and location before a worker can accept jobs."
      actions={
        <>
          <span className="adm-count-chip">
            {workersState.loading ? "…" : filtered.length} worker
            {filtered.length === 1 ? "" : "s"}
          </span>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={workersState.loading}
            onClick={() => workersState.run().catch(() => {})}
          >
            Refresh
          </Button>
        </>
      }
    >
      <div className="adm-toolbar">
        <SegTabs items={STATUS_TABS} value={status} onChange={changeStatus} />
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search name, phone, trade, area…"
          onClear={() => setQuery("")}
        />
      </div>

      <PageError
        error={workersState.error}
        onRetry={() => workersState.run().catch(() => {})}
      />

      {workersState.loading && !workersState.data ? (
        <LoadingBlock label="Loading worker queue…" />
      ) : (
        <div className="adm-split">
          <Panel className="adm-split__list" flush>
            {filtered.length ? (
              <div className="adm-worker-list">
                {filtered.map((worker) => (
                  <button
                    key={worker.id}
                    type="button"
                    className={`adm-worker-row${
                      worker.id === selectedId ? " is-selected" : ""
                    }`}
                    onClick={() => selectWorker(worker)}
                  >
                    <Avatar name={worker.name} path={worker.photoPath} size={42} />
                    <span className="adm-worker-row__copy">
                      <strong>
                        {worker.name || "Unnamed"}
                        {worker.isPremium ? <Crown size={12} className="adm-crown" /> : null}
                      </strong>
                      <span>
                        {worker.service || "Trade"} · {worker.area || "—"}
                      </span>
                      <small>
                        Applied {timeAgo(worker.createdAt)} ·{" "}
                        {worker.kycStatus === "verified" ? "ID verified" : "ID pending"}
                      </small>
                    </span>
                    <span className="adm-worker-row__side">
                      <StatusPill status={worker.status} />
                      <StatusPill status={worker.kycStatus} />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyBlock
                icon={UserCheck}
                title={query ? "No matching workers" : "Queue is clear"}
                body={
                  query
                    ? "Try a different name, phone number or trade."
                    : status === "pending"
                      ? "Every worker application has been reviewed."
                      : "No workers in this state right now."
                }
              />
            )}
          </Panel>

          <div className="adm-split__detail">
            {selected ? (
              <WorkerDetail
                worker={selected}
                busy={actionBusy}
                onApprove={() => review(selected, selected.status === "approved" ? "reinstate" : "approve")}
                onReject={() => {
                  setReason("");
                  setDialog({ type: "reject", worker: selected });
                }}
                onSuspend={() => {
                  setReason("");
                  setDialog({ type: "suspend", worker: selected });
                }}
                onReinstate={() => review(selected, "reinstate")}
                onKycVerify={() => reviewKyc(selected, "verify")}
                onKycReject={() => {
                  setKycReason("");
                  setKycDialog({ worker: selected });
                }}
              />
            ) : (
              <Panel>
                <EmptyBlock
                  icon={ShieldCheck}
                  title="Select a worker"
                  body="Pick an application from the queue to review identity and trade details."
                />
              </Panel>
            )}
          </div>
        </div>
      )}

      <ReasonModal
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        title={dialog?.type === "suspend" ? "Suspend worker" : "Reject application"}
        subtitle={dialog?.worker ? `${dialog.worker.name} · ${dialog.worker.service}` : ""}
        label={dialog?.type === "suspend" ? "Suspension reason" : "Rejection reason"}
        placeholder={
          dialog?.type === "suspend"
            ? "This is shown to the worker. Explain what needs to change."
            : "Tell the worker what was missing or unclear so they can re-apply."
        }
        value={reason}
        onChange={setReason}
        loading={Boolean(actionBusy)}
        confirmLabel={dialog?.type === "suspend" ? "Suspend account" : "Reject application"}
        onSubmit={() => {
          if (reason.trim().length < 5) {
            toast.error("Add a clear reason (at least 5 characters).");
            return;
          }
          review(dialog.worker, dialog.type, reason.trim());
        }}
      />

      <ReasonModal
        open={Boolean(kycDialog)}
        onClose={() => setKycDialog(null)}
        title="Reject identity document"
        subtitle={kycDialog?.worker ? kycDialog.worker.name : ""}
        label="What is wrong with the document?"
        placeholder="e.g. Photo is blurred, name does not match, document is expired."
        value={kycReason}
        onChange={setKycReason}
        loading={Boolean(actionBusy)}
        confirmLabel="Reject document"
        onSubmit={() => {
          if (kycReason.trim().length < 5) {
            toast.error("Add a clear reason for the worker.");
            return;
          }
          reviewKyc(kycDialog.worker, "reject", kycReason.trim());
        }}
      />
    </AdminPage>
  );
}

function WorkerDetail({
  worker,
  busy,
  onApprove,
  onReject,
  onSuspend,
  onReinstate,
  onKycVerify,
  onKycReject,
}) {
  const pending = worker.status === "pending";
  const approved = worker.status === "approved";
  const rejected = worker.status === "rejected";
  const suspended = worker.status === "suspended";
  const coords =
    Number.isFinite(Number(worker.lat)) && Number.isFinite(Number(worker.lng))
      ? mapsUrl(worker.lat, worker.lng, worker.area)
      : "";

  return (
    <Panel
      title="Application detail"
      subtitle={`Worker ID ${worker.id?.slice(0, 12)}…`}
      action={<StatusPill status={worker.status} />}
    >
      <div className="adm-profile-head">
        <Avatar name={worker.name} path={worker.photoPath} size={64} ring={worker.isPremium} />
        <div className="grow">
          <h2>{worker.name || "Unnamed worker"}</h2>
          <p>
            {worker.service || "Trade"} · {worker.area || "Area not set"}
          </p>
          <div className="adm-inline-badges">
            <StatusPill status={worker.status} />
            <StatusPill status={worker.kycStatus} />
            {worker.isPremium ? (
              <span className="adm-pill adm-pill--yellow">
                <span className="adm-pill__dot" /> Pro
              </span>
            ) : null}
            {worker.online ? (
              <span className="adm-pill adm-pill--green">
                <span className="adm-pill__dot" /> Online
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="adm-kv-grid">
        <KeyValue label="Email" value={worker.email} />
        <KeyValue label="Phone" value={worker.phone} />
        <KeyValue label="Starting price" value={inr(worker.pricePerWork || 0)} />
        <KeyValue label="Commission dues" value={inr(worker.dues || 0)} tone={worker.dues ? "red" : ""} />
        <KeyValue label="Rating" value={worker.rating ? `${Number(worker.rating).toFixed(1)} ★` : "New"} />
        <KeyValue label="Jobs completed" value={worker.jobsCompleted || 0} />
        <KeyValue label="Applied" value={formatDateTime(worker.createdAt)} />
        <KeyValue
          label="Approved"
          value={worker.approvedAt ? formatDate(worker.approvedAt) : "—"}
        />
        <KeyValue label="Service key" value={worker.serviceKey || "—"} />
        <KeyValue label="Location" value={coords ? "Pinned" : "Not pinned"} />
      </div>

      {worker.bio ? (
        <div className="adm-note-block">
          <span>Worker bio</span>
          <p>{worker.bio}</p>
        </div>
      ) : null}

      {worker.rejectionReason ? (
        <div className="adm-note-block adm-note-block--danger">
          <span>Rejection reason</span>
          <p>{worker.rejectionReason}</p>
        </div>
      ) : null}

      {worker.suspensionReason ? (
        <div className="adm-note-block adm-note-block--danger">
          <span>Suspension reason</span>
          <p>{worker.suspensionReason}</p>
        </div>
      ) : null}

      <div className="adm-detail-section">
        <div className="adm-detail-section__head">
          <div>
            <h3>Identity document</h3>
            <p>Stored privately. Only admins can view this file.</p>
          </div>
          <StatusPill status={worker.kycStatus} />
        </div>
        <div className="adm-kyc">
          <AuthedImage
            path={worker.kycPath ? worker.id : ""}
            alt={`${worker.name} identity document`}
            className="adm-kyc__image"
          />
          <div className="adm-kyc__side">
            {worker.kycRejectionReason ? (
              <p className="adm-kyc__reason">{worker.kycRejectionReason}</p>
            ) : (
              <p>
                Check that the photo is legible, the name matches the profile and the document is
                not expired.
              </p>
            )}
            {worker.kycPath && worker.kycStatus !== "verified" ? (
              <div className="adm-inline-actions">
                <Button
                  size="sm"
                  icon={BadgeCheck}
                  loading={busy === `kyc:verify:${worker.id}`}
                  onClick={onKycVerify}
                >
                  Verify ID
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={ShieldX}
                  onClick={onKycReject}
                  disabled={Boolean(busy)}
                >
                  Reject ID
                </Button>
              </div>
            ) : worker.kycPath ? (
              <p className="adm-ok-line">
                <ShieldCheck size={14} /> Identity verified
                {worker.kycReviewedAt ? ` · ${formatDate(worker.kycReviewedAt)}` : ""}
              </p>
            ) : (
              <p className="adm-muted">No document uploaded yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="adm-detail-section">
        <div className="adm-detail-section__head">
          <div>
            <h3>Decision</h3>
            <p>
              Approving sets worker claims, publishes the public profile and sends a welcome
              email.
            </p>
          </div>
        </div>
        <div className="adm-decision-actions">
          {pending || rejected ? (
            <Button
              icon={UserCheck}
              loading={busy === `approve:${worker.id}` || busy === `reinstate:${worker.id}`}
              onClick={onApprove}
            >
              {rejected ? "Approve anyway" : "Approve worker"}
            </Button>
          ) : null}
          {suspended ? (
            <Button
              icon={RotateCcw}
              loading={busy === `reinstate:${worker.id}`}
              onClick={onReinstate}
            >
              Reinstate worker
            </Button>
          ) : null}
          {pending ? (
            <Button variant="outline" icon={UserX} onClick={onReject} disabled={Boolean(busy)}>
              Reject application
            </Button>
          ) : null}
          {approved ? (
            <Button variant="outline" icon={ShieldX} onClick={onSuspend} disabled={Boolean(busy)}>
              Suspend worker
            </Button>
          ) : null}
          {coords ? (
            <a href={coords} target="_blank" rel="noreferrer" className="adm-link-button">
              <MapPin size={15} /> Open service area
            </a>
          ) : null}
          {worker.phone ? (
            <a href={`tel:${worker.phone}`} className="adm-link-button">
              <Phone size={15} /> Call worker
            </a>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
