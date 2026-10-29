import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { Headphones, LogOut, ShieldCheck } from "lucide-react";
import "../styles/worker.css";
import { useAuth } from "../context/AuthContext";
import { Avatar, Button, PageLoader } from "../components/ui";
import { NotificationBell } from "../components/common";
import { Logo } from "../components/layout";
import WorkerDashboard from "./WorkerDashboard";
import WorkerApply from "./WorkerApply";
import WorkerStatus from "./WorkerStatus";

export default function WorkerApp() {
  const { user, worker, profile, loading, isWorker, logout, refreshClaims } = useAuth();

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

  if (!user) {
    return (
      <Navigate
        to={`/auth?role=worker&next=${encodeURIComponent("/worker")}`}
        replace
      />
    );
  }

  // Avoid flashing the application form while the worker listener warms up.
  if (isWorker && !worker) {
    return (
      <div className="worker-app">
        <PageLoader label="Loading your worker profile…" />
      </div>
    );
  }

  // Customer accounts stay in the customer app. Professional access is a
  // separate account path, never an in-place role switch.
  if (!isWorker && profile?.role !== "worker" && !worker) {
    return (
      <WorkerGate profile={profile}>
        <div className="worker-role-gate">
          <span className="worker-role-gate__icon">
            <ShieldCheck size={24} />
          </span>
          <h2>This is a customer account</h2>
          <p>
            The worker console is only for professional accounts. Sign in with a
            professional account, or create a separate one to start receiving jobs.
          </p>
          <div className="worker-role-gate__actions">
            <Link
              to="/auth?role=worker&mode=signup"
              className="btn btn--primary btn--sm"
            >
              Create a professional account
            </Link>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={async () => {
                await logout();
              }}
            >
              Use a different account
            </button>
          </div>
        </div>
      </WorkerGate>
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
  const { user, logout } = useAuth();

  return (
    <div className="worker-app">
      <header className="worker-top">
        <div className="worker-top__inner">
          <Logo />
          <div className="worker-top__right">
            <span className="wk-bell">
              <NotificationBell />
            </span>
            <Link
              to="/worker/support"
              className="wk-icon-link"
              aria-label="Support"
              title="Support"
            >
              <Headphones size={18} />
            </Link>
            <div className="worker-user">
              <Avatar name={profile?.name || user?.displayName} path={profile?.photoPath} size={34} />
              <div>
                <strong>{profile?.name || "Worker account"}</strong>
                <span>{user?.email}</span>
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
            <Link to="/worker/support">Support</Link>
            <span>·</span>
            <Link to="/legal/terms">Terms</Link>
            <span>·</span>
            <Link to="/legal/privacy">Privacy</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export function WorkerGateActions() {
  return (
    <div className="wk-gate-actions">
      <Link to="/worker/support" className="btn btn--outline btn--sm">
        Contact support
      </Link>
      <Link to="/worker" className="btn btn--ghost btn--sm">
        Worker dashboard
      </Link>
    </div>
  );
}
