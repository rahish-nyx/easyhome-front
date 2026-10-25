import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  Clock3,
  FileCheck2,
  IdCard,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { Button } from "../components/ui";
import WorkerApply from "./WorkerApply";

const STATUS_COPY = {
  pending: {
    eyebrow: "Application received",
    title: "We are reviewing your profile.",
    body: "Our team checks trade details and identity documents. Most reviews finish within one working day. You will get a notification the moment you are approved.",
  },
  rejected: {
    eyebrow: "Needs attention",
    title: "Your application was not approved.",
    body: "Update the details below and re-apply. If you believe this was a mistake, contact support with your application email.",
  },
  suspended: {
    eyebrow: "Account suspended",
    title: "Your worker account is paused.",
    body: "You cannot accept new jobs while suspended. Contact support to understand what is needed to reinstate your account.",
  },
};

export default function WorkerStatus({ worker }) {
  const { refreshClaims } = useAuth();
  const [reapplying, setReapplying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const status = worker?.status || "pending";
  const copy = STATUS_COPY[status] || STATUS_COPY.pending;

  if (reapplying) {
    return (
      <div className="wk-panel">
        <button
          type="button"
          className="wk-back"
          onClick={() => setReapplying(false)}
        >
          ← Back to application status
        </button>
        <WorkerApply existing={worker} onCancel={() => setReapplying(false)} />
      </div>
    );
  }

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshClaims();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="wk-panel">
      <div className="wk-status-hero">
        <span className={`wk-status-hero__icon wk-status-hero__icon--${status}`}>
          {status === "pending" ? (
            <Clock3 size={26} />
          ) : status === "rejected" ? (
            <CircleAlert size={26} />
          ) : (
            <ShieldCheck size={26} />
          )}
        </span>
        <div>
          <p className="wk-eyebrow">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
          <p>{copy.body}</p>
        </div>
      </div>

      {status === "rejected" ? (
        <div className="wk-alert wk-alert--error">
          <strong>Reviewer note</strong>
          <span>
            {worker.rejectionReason ||
              "Your application did not meet our verification requirements."}
          </span>
        </div>
      ) : null}

      {status === "suspended" ? (
        <div className="wk-alert wk-alert--error">
          <strong>Suspension reason</strong>
          <span>{worker.suspensionReason || "Temporarily suspended by EasyHome."}</span>
        </div>
      ) : null}

      <div className="wk-application">
        <div className="wk-application__row">
          <span>Trade</span>
          <strong>{worker.service || "—"}</strong>
        </div>
        <div className="wk-application__row">
          <span>Service area</span>
          <strong>{worker.area || "—"}</strong>
        </div>
        <div className="wk-application__row">
          <span>Starting price</span>
          <strong>{worker.pricePerWork ? `₹${worker.pricePerWork}` : "—"}</strong>
        </div>
        <div className="wk-application__row">
          <span>Applied</span>
          <strong>{formatDateTime(worker.createdAt)}</strong>
        </div>
        <div className="wk-application__row">
          <span>Application status</span>
          <strong className={`wk-capitalize wk-text-${status}`}>{status}</strong>
        </div>
      </div>

      <div className="wk-progress">
        <div className="wk-progress__item is-done">
          <span className="wk-progress__dot">
            <BadgeCheck size={14} />
          </span>
          <div>
            <strong>Application submitted</strong>
            <small>Your trade details are on file.</small>
          </div>
        </div>
        <div className={`wk-progress__item ${status === "pending" ? "is-current" : "is-done"}`}>
          <span className="wk-progress__dot">
            <IdCard size={14} />
          </span>
          <div>
            <strong>Identity check</strong>
            <small>
              {worker.kycStatus === "verified"
                ? "ID verified."
                : worker.kycStatus === "pending"
                  ? "ID sent securely; waiting for review."
                  : "Upload a government ID below to speed this up."}
            </small>
          </div>
        </div>
        <div className={`wk-progress__item ${status === "pending" ? "" : "is-done"}`}>
          <span className="wk-progress__dot">
            <ShieldCheck size={14} />
          </span>
          <div>
            <strong>Team approval</strong>
            <small>
              {status === "rejected"
                ? "Not approved this time."
                : status === "suspended"
                  ? "Paused pending support review."
                  : "We will notify you as soon as it is done."}
            </small>
          </div>
        </div>
      </div>

      <KycCard worker={worker} />

      <div className="wk-gate-actions">
        <Button
          variant="outline"
          size="lg"
          loading={refreshing}
          onClick={refresh}
          icon={RefreshCw}
        >
          Refresh status
        </Button>
        {status === "rejected" ? (
          <Button
            size="lg"
            className="wk-btn wk-btn--primary"
            onClick={() => setReapplying(true)}
            icon={RotateCcw}
          >
            Update &amp; re-apply
          </Button>
        ) : null}
        {status === "suspended" ? (
          <Link to="/worker/support" className="btn btn--dark btn--lg">
            Contact support <ArrowRight size={16} />
          </Link>
        ) : null}
      </div>

      <p className="wk-fineprint">
        Need to change your application details?{" "}
        <Link to="/worker/support" style={{ color: "#7aa2ff" }}>
          Message support
        </Link>{" "}
        and include your registered email.
      </p>
    </div>
  );
}

export function KycCard({ worker, compact = false }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const status = worker?.kycStatus || "not_submitted";
  const uploaded = status !== "not_submitted";

  const upload = async (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Upload a JPG, PNG, WEBP or GIF photo of your government ID.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Choose an image under 4 MB.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const result = await api.upload("/worker/kyc", form);
      const followUp = [
        ...(!result.telegramForwarded
          ? [
              result.telegramConfigured
                ? "Telegram delivery failed; contact support."
                : "Telegram bot is not configured on the API.",
            ]
          : []),
      ];
      if (followUp.length) {
        toast.error(`ID uploaded for review. ${followUp.join(" ")}`);
      } else {
        toast.success("ID uploaded privately and delivered to the verification team.");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const tone =
    status === "verified"
      ? "wk-badge--green"
      : status === "rejected"
        ? "wk-badge--red"
        : "wk-badge--amber";

  return (
    <div className={`wk-kyc ${compact ? "wk-kyc--compact" : ""}`}>
      <div className="wk-kyc__icon">
        {status === "verified" ? (
          <FileCheck2 size={22} />
        ) : status === "rejected" ? (
          <XCircle size={22} />
        ) : (
          <IdCard size={22} />
        )}
      </div>
      <div className="wk-kyc__copy">
        <div className="wk-kyc__head">
          <strong>Identity verification</strong>
          <span className={`wk-badge ${tone}`}>
            {status === "verified"
              ? "Verified"
              : status === "pending"
                ? "In review"
                : status === "rejected"
                  ? "Rejected"
                  : "Not uploaded"}
          </span>
        </div>
        <p>
          {status === "verified"
            ? "Your government ID is verified. Keep your profile details accurate."
            : status === "rejected"
              ? worker?.kycRejectionReason ||
                "The document could not be read. Upload a clearer photo."
              : status === "pending"
                ? "Your document was sent securely to the review team. No action needed right now."
                : "Upload a clear photo of your Aadhaar, PAN or driving licence. It is sent securely to our verification team."}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(event) => upload(event.target.files?.[0])}
        />
        <Button
          size="sm"
          variant="outline"
          loading={busy}
          icon={Upload}
          onClick={() => inputRef.current?.click()}
          className="wk-kyc__btn"
        >
          {uploaded ? "Replace document" : "Upload ID"}
        </Button>
      </div>
    </div>
  );
}
