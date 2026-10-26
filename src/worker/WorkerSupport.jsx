import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Headphones } from "lucide-react";
import "../styles/worker.css";
import Chat from "../pages/Chat";
import { Logo } from "../components/layout";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "../components/ui";

export default function WorkerSupport() {
  const { fbUser, loading, isWorker } = useAuth();

  if (loading) return <PageLoader label="Opening support…" />;
  if (!fbUser) {
    return (
      <Navigate
        to={`/auth?role=worker&next=${encodeURIComponent("/worker/support")}`}
        replace
      />
    );
  }
  if (!isWorker) return <Navigate to="/chat" replace />;

  return (
    <div className="worker-app">
      <header className="worker-top">
        <div className="worker-top__inner">
          <Logo dark />
          <div className="worker-top__right">
            <Link to="/worker" className="wk-chip-btn">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="worker-main worker-main--support">
        <div className="wk-support-head">
          <span className="wk-support-head__icon">
            <Headphones size={22} />
          </span>
          <div>
            <p className="wk-eyebrow">EasyHome Pro support</p>
            <h1>We are here for every job.</h1>
            <p>
              Ask about payouts, commission, customer issues or account verification.
              Ending the chat deletes the whole conversation for both sides.
            </p>
          </div>
        </div>
        <Chat backTo="/worker" embedded />
      </main>
    </div>
  );
}
