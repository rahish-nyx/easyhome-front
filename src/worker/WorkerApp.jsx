import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { Headphones, LogOut, ShieldCheck } from "lucide-react";
import "../styles/worker.css";
import { useAuth } from "../context/AuthContext";
import { Avatar, Button, PageLoader } from "../components/ui";
import { Logo } from "../components/layout";
import WorkerDashboard from "./WorkerDashboard";
import WorkerApply from "./WorkerApply";
import WorkerStatus from "./WorkerStatus";

export default function WorkerApp() {
  const { fbUser, worker, profile, loading, isWorker, refreshClaims } = useAuth();

  useEffect(() => {
    if (worker?.status === "approved") refreshClaims().catch(() => {});
  }, [worker?.status, refreshClaims]);

  if (loading) {
    return (
      <div className="worker-app">
        <PageLoader label="Opening worker console…" />
      </div>
    );
  }

  if (!fbUser) {
    return <Navigate to={`/auth?next=${encodeURIComponent("/worker")}`} replace />;
  }

  // Avoid flashing the application form while the worker listener warms up.
  if (isWorker && !worker) {
    return (
      <div className="worker-app">
        <PageLoader label="Loading your worker profile…" />
      </div>
    );
  }

  if (worker?.status === "approved") {
    return <WorkerDashboard />;
  }

  return (
    <WorkerGate profile={profile}>
      {worker ? (
        <WorkerStatus worker={worker} />
      ) : (
        <WorkerApply existing={profile} />
      )}
    </WorkerGate>
  );
}

function WorkerGate({ profile, children }) {
  const { fbUser, logout } = useAuth();

  return (
    <div className="worker-app">
      <header className="worker-top">
        <Logo dark />
        <div className="worker-top__right">
          <Link
            to="/chat"
            className="wk-icon-link"
            aria-label="Support"
            title="Support"
          >
            <Headphones size={18} />
          </Link>
          <div className="worker-user">
            <Avatar name={profile?.name || fbUser?.displayName} path={profile?.photoPath} size={34} />
            <div>
              <strong>{profile?.name || "Worker account"}</strong>
              <span>{fbUser?.email}</span>
            </div>
          </div>
          <button
            type="button"
            className="wk-icon-link"
            aria-label="Sign out"
            title="Sign out"
            onClick={async () => {
              await logout();
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="worker-gate">
        <div className="worker-gate__inner">
          <div className="wk-gate-brand">
            <span className="wk-gate-brand__mark">
              <ShieldCheck size={24} />
            </span>
            <div>
              <p className="wk-eyebrow">EasyHome Pro</p>
              <h1>Work on your terms.</h1>
            </div>
          </div>
          {children}

          <p className="worker-gate__foot">
            <Link to="/">Back to EasyHome</Link>
            <span>·</span>
            <Link to="/chat">Support</Link>
            <span>·</span>
            <Link to="/legal/terms">Terms</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export function WorkerGateActions() {
  return (
    <div className="wk-gate-actions">
      <Link to="/chat" className="btn btn--outline btn--sm">
        Contact support
      </Link>
      <Link to="/" className="btn btn--ghost btn--sm">
        Back home
      </Link>
    </div>
  );
}
