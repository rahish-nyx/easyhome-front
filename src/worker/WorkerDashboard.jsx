import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Crosshair,
  Crown,
  Headphones,
  Home,
  IndianRupee,
  LogOut,
  MapPin,
  Navigation,
  Percent,
  Phone,
  Power,
  Radio,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { useLiveQuery } from "../hooks/useLive";
import { qBookingsForWorker, qJobFeed } from "../lib/queries";
import { api } from "../lib/api";
import {
  distanceKm,
  distanceLabel,
  jobMatchesWorker,
  mapsUrl,
} from "../lib/geo";
import {
  formatDateTime,
  inr,
  timeAgo,
} from "../lib/format";
import { SERVICE_META, TRACKING_PHASES, trackingMeta } from "../lib/constants";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Avatar,
  Badge,
  Button,
  Field,
  Input,
  Modal,
  Spinner,
  Textarea,
} from "../components/ui";
import { Logo } from "../components/layout";
import RazorpayPayment from "../components/RazorpayPayment";
import {
  NotificationBell,
  RatingStars,
  ServiceIcon,
} from "../components/common";
import { KycCard } from "./WorkerStatus";
import { TrackingBuzzer, useGpsBroadcast, useTrackingAlert } from "./tracking";

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "jobs", label: "Jobs", icon: BriefcaseBusiness },
  { id: "earnings", label: "Earnings", icon: Wallet },
  { id: "profile", label: "Profile", icon: UserRound },
];

const PHASE_TOAST = {
  [TRACKING_PHASES.EN_ROUTE]: "Customer notified — you are on the way.",
  [TRACKING_PHASES.ARRIVED]: "Arrival recorded. The customer can see you are on site.",
  [TRACKING_PHASES.WORKING]: "Work started. Keep your status and GPS fresh.",
};

const EMPTY_EARNINGS = {
  today: 0,
  week: 0,
  month: 0,
  total: 0,
  jobsCompleted: 0,
  dues: 0,
  chart: [],
  recent: [],
};

export default function WorkerDashboard() {
  usePageMeta(
    "Worker console",
    "Manage live jobs, earnings and availability on EasyHome.",
  );

  const {
    fbUser,
    profile,
    worker,
    isPremium,
    logout,
    refreshProfile,
  } = useAuth();
  const { settings } = useCatalogue();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "home";
  const focusJobId = params.get("job") || "";

  const [busy, setBusy] = useState("");
  const [onlineSaving, setOnlineSaving] = useState(false);
  const [priceTarget, setPriceTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [commissionTarget, setCommissionTarget] = useState(null);

  const earningsState = useAsync(() => api.get("/worker/earnings"), []);
  const commissionsState = useAsync(() => api.get("/worker/commission"), []);
  const earnings = earningsState.data || EMPTY_EARNINGS;
  const commissions = commissionsState.data?.commissions || [];

  const myQuery = useMemo(
    () => (fbUser ? qBookingsForWorker(fbUser.uid) : null),
    [fbUser],
  );
  const feedQuery = useMemo(
    () => (worker?.serviceKey ? qJobFeed(worker.serviceKey, 40) : null),
    [worker?.serviceKey],
  );
  const { data: myBookings, loading: myLoading } = useLiveQuery(myQuery);
  const { data: feed, loading: feedLoading } = useLiveQuery(feedQuery);

  const activeJobs = useMemo(
    () =>
      myBookings
        .filter((job) => ["accepted", "ongoing"].includes(job.status))
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "ongoing" ? -1 : 1;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }),
    [myBookings],
  );

  const history = useMemo(
    () => myBookings.filter((job) => job.status === "completed").slice(0, 20),
    [myBookings],
  );

  const gps = useGpsBroadcast(activeJobs);
  const trackingAlert = useTrackingAlert(activeJobs);
  const supportPhone = settings?.supportPhone || "";

  const available = useMemo(() => {
    if (!worker) return [];
    return feed
      .filter((job) => {
        if (job.preferredWorkerId && job.preferredWorkerId !== worker.id) return false;
        return jobMatchesWorker(worker, job);
      })
      .map((job) => ({
        ...job,
        distance: distanceKm(worker, job),
      }))
      .sort((a, b) => {
        if (a.urgency !== b.urgency) return a.urgency === "urgent" ? -1 : 1;
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [feed, worker]);

  const canAccept = Boolean(worker?.online) && (isPremium || (Number(worker?.dues) || 0) <= 0);

  const setTab = (next) => {
    const search = new URLSearchParams(params);
    if (next === "home") search.delete("tab");
    else search.set("tab", next);
    setParams(search, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleOnline = async () => {
    if (onlineSaving) return;
    const next = !worker?.online;
    setOnlineSaving(true);
    try {
      await api.patch("/worker/availability", { online: next });
      toast.success(
        next
          ? "You are online. New jobs in your trade will appear here."
          : "You are offline. You will not receive new jobs.",
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setOnlineSaving(false);
    }
  };

  const refreshMoney = async () => {
    await Promise.allSettled([earningsState.run(), commissionsState.run()]);
  };

  const acceptJob = async (job) => {
    if (!worker?.online) {
      toast.error("Go online first to accept jobs.");
      return;
    }
    if (!canAccept) {
      const payable = commissions.find((item) =>
        ["pending", "rejected"].includes(item.status),
      );
      if (payable) {
        setCommissionTarget(payable);
        toast.info("Pay your commission due to unlock new jobs.");
      } else {
        toast.error(
          "Your commission is still pending. Open Earnings to complete the secure checkout.",
        );
      }
      return;
    }
    setBusy(`accept:${job.id}`);
    try {
      await api.post(`/worker/jobs/${job.id}/accept`);
      toast.success("Job accepted. Contact details unlock after you confirm the price.");
      setTab("jobs");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const submitPrice = async (job, price) => {
    setBusy(`price:${job.id}`);
    try {
      await api.patch(`/worker/jobs/${job.id}/price`, { price });
      toast.success("Quote sent to the customer.");
      setPriceTarget(null);
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setBusy("");
    }
  };

  const submitConfirm = async (job, price) => {
    setBusy(`confirm:${job.id}`);
    try {
      await api.patch(`/worker/jobs/${job.id}/confirm`, { price });
      toast.success("Price confirmed. You can now contact the customer.");
      setConfirmTarget(null);
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setBusy("");
    }
  };

  const submitPhase = async (job, phase) => {
    setBusy(`phase:${job.id}:${phase}`);
    try {
      await api.patch(`/worker/jobs/${job.id}/phase`, { phase });
      toast.success(PHASE_TOAST[phase] || "Job status updated.");
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setBusy("");
    }
  };

  const advanceJob = (job, phase) => {
    if (phase === TRACKING_PHASES.COMPLETED) {
      setCompleteTarget(job);
      return;
    }
    submitPhase(job, phase).catch(() => {});
  };

  const submitComplete = async (job) => {
    setBusy(`complete:${job.id}`);
    try {
      await api.patch(`/worker/jobs/${job.id}/complete`);
      toast.success("Job completed. Collect payment from the customer.");
      setCompleteTarget(null);
      await refreshMoney();
      setTab("home");
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setBusy("");
    }
  };

  const handleCommissionPaid = async () => {
    setCommissionTarget(null);
    toast.success("Commission verified automatically. New jobs are unlocked.");
    await Promise.allSettled([refreshMoney(), refreshProfile()]);
  };

  if (!worker) {
    return (
      <div className="worker-app">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="worker-app">
      <header className="worker-top">
        <div className="worker-top__inner">
          <Logo dark />
          <div className="worker-top__right">
            <button
              type="button"
              className={`wk-online-toggle${worker.online ? " is-on" : ""}`}
              onClick={toggleOnline}
              disabled={onlineSaving}
              aria-pressed={Boolean(worker.online)}
            >
              {onlineSaving ? (
                <Spinner size={13} />
              ) : (
                <Power size={14} />
              )}
              <span>{worker.online ? "Online" : "Offline"}</span>
            </button>

            <span className="wk-top-earning">
              <strong>{inr(earnings.today)}</strong>
              <small>today</small>
            </span>

            <Link
              to="/worker/support"
              className="wk-icon-link"
              aria-label="Worker support"
              title="Worker support"
            >
              <Headphones size={18} />
            </Link>

            <span className="wk-bell">
              <NotificationBell />
            </span>

            <div className="worker-user">
              <Avatar name={worker.name || profile?.name} path={worker.photoPath} size={36} ring={isPremium} />
              <div>
                <strong>{worker.name || profile?.name}</strong>
                <span>{worker.service || "EasyHome Pro"}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="worker-main">
        <EarningsStrip
          earnings={earnings}
          worker={worker}
          isPremium={isPremium}
          refreshing={earningsState.loading}
          onRefresh={refreshMoney}
          onEarnings={() => setTab("earnings")}
        />

        {!worker.online ? (
          <div className="wk-banner wk-banner--offline">
            <span className="wk-banner__icon">
              <Power size={18} />
            </span>
            <div className="grow">
              <strong>You are offline</strong>
              <p>Turn on Online in the header to see and accept new jobs.</p>
            </div>
            <button type="button" className="wk-link-btn" onClick={toggleOnline}>
              Go online
            </button>
          </div>
        ) : null}

        {!isPremium && Number(worker.dues) > 0 ? (
          <div className="wk-banner wk-banner--dues">
            <span className="wk-banner__icon">
              <CircleAlert size={18} />
            </span>
            <div className="grow">
              <strong>{inr(worker.dues)} commission due</strong>
              <p>Clear dues or activate Pro to keep accepting new jobs.</p>
            </div>
            <button type="button" className="wk-link-btn" onClick={() => setTab("earnings")}>
              Pay now
            </button>
          </div>
        ) : null}

        {tab === "home" ? (
          <HomeTab
            worker={worker}
            earnings={earnings}
            activeJobs={activeJobs}
            available={available}
            loading={myLoading || feedLoading}
            busy={busy}
            canAccept={canAccept}
            isPremium={isPremium}
            focusJobId={focusJobId}
            onTab={setTab}
            onQuote={setPriceTarget}
            onConfirm={setConfirmTarget}
            onPhase={advanceJob}
            onComplete={setCompleteTarget}
            gps={gps}
            onAccept={acceptJob}
          />
        ) : null}

        {tab === "jobs" ? (
          <JobsTab
            worker={worker}
            activeJobs={activeJobs}
            available={available}
            history={history}
            loading={myLoading || feedLoading}
            busy={busy}
            canAccept={canAccept}
            isPremium={isPremium}
            focusJobId={focusJobId}
            onQuote={setPriceTarget}
            onConfirm={setConfirmTarget}
            onPhase={advanceJob}
            onComplete={setCompleteTarget}
            gps={gps}
            onAccept={acceptJob}
            onGoOnline={toggleOnline}
          />
        ) : null}

        {tab === "earnings" ? (
          <EarningsTab
            worker={worker}
            earnings={earnings}
            commissions={commissions}
            loading={earningsState.loading || commissionsState.loading}
            isPremium={isPremium}
            onRefresh={refreshMoney}
            onCommission={setCommissionTarget}
            onUpgrade={() => setTab("profile")}
          />
        ) : null}

        {tab === "profile" ? (
          <ProfileTab worker={worker} onLogout={logout} onRefresh={refreshMoney} />
        ) : null}

        <WorkerFooter />
      </main>

      <nav className="worker-nav" aria-label="Worker navigation">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "is-active" : ""}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={21} />
            <span>{item.label}</span>
            {item.id === "jobs" && activeJobs.length ? (
              <em className="worker-nav__count">{activeJobs.length}</em>
            ) : null}
          </button>
        ))}
      </nav>

      <PriceModal
        job={priceTarget}
        settings={settings}
        isPremium={isPremium}
        busy={Boolean(busy)}
        onClose={() => setPriceTarget(null)}
        onSubmit={(price) => submitPrice(priceTarget, price)}
      />
      <ConfirmPriceModal
        job={confirmTarget}
        busy={Boolean(busy)}
        onClose={() => setConfirmTarget(null)}
        onSubmit={(price) => submitConfirm(confirmTarget, price)}
      />
      <CompleteModal
        job={completeTarget}
        busy={Boolean(busy)}
        onClose={() => setCompleteTarget(null)}
        onConfirm={() => submitComplete(completeTarget)}
      />
      <CommissionModal
        commission={commissionTarget}
        onClose={() => setCommissionTarget(null)}
        onPaid={handleCommissionPaid}
      />

      <TrackingBuzzer
        alert={trackingAlert}
        gps={gps}
        supportPhone={supportPhone}
        onUpdate={(job) => {
          const search = new URLSearchParams(params);
          search.set("tab", "jobs");
          search.set("job", job.id);
          setParams(search, { replace: true });
        }}
      />
    </div>
  );
}

/* ------------------------------- Shell pieces ----------------------------- */

function EarningsStrip({ earnings, worker, isPremium, refreshing, onRefresh, onEarnings }) {
  return (
    <section className="wk-earnings-strip" aria-label="Earnings summary">
      <div className="wk-earnings-strip__lead">
        <div className="wk-earnings-strip__eyebrow">
          <span className={`wk-live-dot${worker.online ? " is-on" : ""}`} />
          {worker.online ? "Live now" : "Offline"}
          {isPremium ? (
            <span className="wk-badge wk-badge--yellow">
              <Crown size={11} /> Pro
            </span>
          ) : null}
        </div>
        <strong>{inr(earnings.today)}</strong>
        <span>Earned today</span>
      </div>

      <div className="wk-earnings-strip__metric">
        <span>This week</span>
        <strong>{inr(earnings.week)}</strong>
      </div>
      <div className="wk-earnings-strip__metric">
        <span>This month</span>
        <strong>{inr(earnings.month)}</strong>
      </div>
      <div className="wk-earnings-strip__metric">
        <span>Commission due</span>
        <strong className={Number(earnings.dues) > 0 ? "wk-text-red" : ""}>
          {inr(earnings.dues)}
        </strong>
      </div>

      <div className="wk-earnings-strip__actions">
        <button
          type="button"
          className="wk-icon-btn"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh earnings"
        >
          <RefreshCw size={16} className={refreshing ? "spin" : ""} />
        </button>
        <button type="button" className="wk-chip-btn" onClick={onEarnings}>
          Earnings <ChevronRight size={14} />
        </button>
      </div>
    </section>
  );
}

function HomeTab({
  worker,
  earnings,
  activeJobs,
  available,
  loading,
  busy,
  canAccept,
  isPremium,
  focusJobId,
  onTab,
  onQuote,
  onConfirm,
  onPhase,
  onComplete,
  onAccept,
  gps,
}) {
  return (
    <>
      <div className="wk-hero">
        <div>
          <p className="wk-eyebrow">
            <Zap size={13} /> {worker.online ? "Online and visible" : "You are hidden"}
          </p>
          <h1>
            {activeJobs.length
              ? `${activeJobs.length} job${activeJobs.length === 1 ? "" : "s"} in your hands.`
              : "Ready for the next job?"}
          </h1>
          <p>
            {activeJobs.length
              ? "Keep customers updated, confirm every price before work and mark the job complete when you are done."
              : "Jobs in your trade, city and local area appear below in real time. Accept one to get started."}
          </p>
        </div>
        <div className="wk-hero__stats">
          <div>
            <strong>{earnings.jobsCompleted || 0}</strong>
            <span>Jobs completed</span>
          </div>
          <div>
            <strong>
              {Number(worker.rating || 0) > 0 ? Number(worker.rating).toFixed(1) : "New"}
            </strong>
            <span>Rating</span>
          </div>
          <div>
            <strong>{isPremium ? "0%" : "—"}</strong>
            <span>Commission</span>
          </div>
        </div>
      </div>

      <ActiveJobsSection
        jobs={activeJobs}
        loading={loading}
        busy={busy}
        focusJobId={focusJobId}
        onQuote={onQuote}
        onConfirm={onConfirm}
        onPhase={onPhase}
        onComplete={onComplete}
        gps={gps}
        onSeeAll={() => onTab("jobs")}
      />

      <AvailableJobsSection
        jobs={available.slice(0, 3)}
        loading={loading}
        busy={busy}
        canAccept={canAccept}
        onAccept={onAccept}
        onSeeAll={() => onTab("jobs")}
      />

      <WorkerPromos worker={worker} isPremium={isPremium} onTab={onTab} />

      <div className="wk-quicklinks">
        <button type="button" onClick={() => onTab("jobs")}>
          <span className="wk-quicklinks__icon">
            <BriefcaseBusiness size={19} />
          </span>
          <span>
            <strong>All jobs</strong>
            <small>{available.length} open in your area</small>
          </span>
          <ChevronRight size={16} />
        </button>
        <button type="button" onClick={() => onTab("earnings")}>
          <span className="wk-quicklinks__icon">
            <Wallet size={19} />
          </span>
          <span>
            <strong>Earnings</strong>
            <small>Payouts, dues and commission</small>
          </span>
          <ChevronRight size={16} />
        </button>
        <button type="button" onClick={() => onTab("profile")}>
          <span className="wk-quicklinks__icon">
            <ShieldCheck size={19} />
          </span>
          <span>
            <strong>KYC &amp; profile</strong>
            <small>
              {worker.kycStatus === "verified" ? "ID verified" : "Complete verification"}
            </small>
          </span>
          <ChevronRight size={16} />
        </button>
      </div>
    </>
  );
}

function WorkerPromos({ worker, isPremium, onTab }) {
  const location =
    [worker?.areaName, worker?.city].filter(Boolean).join(", ") ||
    worker?.area ||
    "your local area";

  return (
    <section className="wk-promos" aria-label="Professional offers and next steps">
      <div className="wk-promos__head">
        <div>
          <p className="wk-eyebrow">Built for your business</p>
          <h2>Make every local job count.</h2>
        </div>
        <span className="wk-promos__location">
          <MapPin size={13} /> {location}
        </span>
      </div>

      <div className="wk-promos__grid">
        <button
          type="button"
          className="wk-promo wk-promo--yellow"
          onClick={() => onTab("profile")}
        >
          <span className="wk-promo__icon">
            <Crown size={20} />
          </span>
          <span className="grow">
            <strong>{isPremium ? "Pro membership is active" : "Keep 100% with Pro"}</strong>
            <small>
              {isPremium
                ? "0% commission, priority placement and urgent-job priority."
                : "Upgrade to pay 0% commission on completed jobs."}
            </small>
          </span>
          <ChevronRight size={17} />
        </button>

        <button
          type="button"
          className="wk-promo wk-promo--blue"
          onClick={() => onTab("profile")}
        >
          <span className="wk-promo__icon">
            <ShieldCheck size={20} />
          </span>
          <span className="grow">
            <strong>
              {worker?.kycStatus === "verified" ? "ID verification complete" : "Finish your KYC"}
            </strong>
            <small>
              {worker?.kycStatus === "verified"
                ? "Customers can see your verified professional badge."
                : "Verified pros get more accepted jobs and trust."}
            </small>
          </span>
          <ChevronRight size={17} />
        </button>

        <Link to="/worker/support" className="wk-promo wk-promo--dark">
          <span className="wk-promo__icon">
            <Headphones size={20} />
          </span>
          <span className="grow">
            <strong>Need a hand?</strong>
            <small>Chat with the EasyHome Pro support team about any job.</small>
          </span>
          <ChevronRight size={17} />
        </Link>
      </div>
    </section>
  );
}

function WorkerFooter() {
  return (
    <footer className="wk-footer">
      <div className="wk-footer__main">
        <div className="wk-footer__brand">
          <div className="wk-footer__logo">
            Easy<span>Home</span>
            <em>PRO</em>
          </div>
          <p>
            Local work, transparent payouts and a support team that knows your
            jobs. Built for independent professionals across India.
          </p>
          <div className="wk-footer__badges">
            <span>
              <BadgeCheck size={12} /> Verified professionals
            </span>
            <span>
              <ShieldCheck size={12} /> Private KYC
            </span>
          </div>
        </div>

        <div className="wk-footer__col">
          <h3>Worker console</h3>
          <Link to="/worker">Dashboard</Link>
          <Link to="/worker?tab=jobs">Jobs</Link>
          <Link to="/worker?tab=earnings">Earnings</Link>
          <Link to="/worker?tab=profile">Profile &amp; KYC</Link>
        </div>

        <div className="wk-footer__col">
          <h3>Support</h3>
          <Link to="/worker/support">Chat with support</Link>
          <Link to="/legal/terms">Terms of service</Link>
          <Link to="/legal/privacy">Privacy policy</Link>
          <Link to="/legal/disclaimer">Disclaimer</Link>
        </div>

        <div className="wk-footer__col">
          <h3>Grow with EasyHome</h3>
          <Link to="/worker?tab=profile">Upgrade to Pro</Link>
          <Link to="/worker?tab=earnings">Commission &amp; payouts</Link>
          <Link to="/worker/support">Report an issue</Link>
        </div>
      </div>

      <div className="wk-footer__bottom">
        <span>© {new Date().getFullYear()} EasyHome. For independent professionals.</span>
        <span>Made for local work across India 🇮🇳</span>
      </div>
    </footer>
  );
}

function JobsTab({
  worker,
  activeJobs,
  available,
  history,
  loading,
  busy,
  canAccept,
  isPremium,
  focusJobId,
  onQuote,
  onConfirm,
  onPhase,
  onComplete,
  onAccept,
  onGoOnline,
  gps,
}) {
  return (
    <>
      <div className="wk-page-head">
        <div>
          <p className="wk-eyebrow">Job desk</p>
          <h1>Active &amp; available jobs</h1>
          <p>
            {worker.service} ·{" "}
            {[worker.areaName, worker.city].filter(Boolean).join(", ") ||
              worker.area ||
              "Your local area"}{" "}
            · {worker.radiusKm || 25} km radius
          </p>
        </div>
        <button
          type="button"
          className={`wk-online-toggle${worker.online ? " is-on" : ""}`}
          onClick={onGoOnline}
        >
          <Power size={14} /> {worker.online ? "Online" : "Offline"}
        </button>
      </div>

      {!canAccept ? (
        <div className={`wk-banner ${worker.online ? "wk-banner--dues" : "wk-banner--offline"}`}>
          <span className="wk-banner__icon">
            <CircleAlert size={18} />
          </span>
          <div className="grow">
            <strong>{worker.online ? "Commission dues are blocking new jobs" : "You are offline"}</strong>
            <p>
              {worker.online
                ? isPremium
                  ? "Refresh your account status."
                  : "Pay your dues or activate Pro to accept new jobs."
                : "Go online to receive real-time job requests in your trade."}
            </p>
          </div>
        </div>
      ) : null}

      <ActiveJobsSection
        jobs={activeJobs}
        loading={loading}
        busy={busy}
        focusJobId={focusJobId}
        onQuote={onQuote}
        onConfirm={onConfirm}
        onPhase={onPhase}
        onComplete={onComplete}
        gps={gps}
      />

      <AvailableJobsSection
        jobs={available}
        loading={loading}
        busy={busy}
        canAccept={canAccept}
        onAccept={onAccept}
        showEmptyHint
      />

      <section className="wk-section">
        <div className="wk-section__head">
          <div>
            <p className="wk-eyebrow">History</p>
            <h2>Recently completed</h2>
          </div>
        </div>

        {history.length ? (
          <div className="wk-history">
            {history.map((job) => (
              <div className="wk-history__row" key={job.id}>
                <span className="wk-history__icon">
                  <CheckCircle2 size={17} />
                </span>
                <div className="grow">
                  <strong>{job.service}</strong>
                  <span>
                    {job.area} · {formatDateTime(job.completedAt)}
                  </span>
                </div>
                <div className="wk-history__money">
                  <strong>
                    {inr(job.pricing?.workerReceives || job.pricing?.finalPrice || job.budget)}
                  </strong>
                  <span>{job.paidAt ? "Customer paid" : "Awaiting payment"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="wk-empty">
            <CheckCircle2 size={26} />
            <strong>No completed jobs yet</strong>
            <p>Your finished jobs and payouts will appear here.</p>
          </div>
        )}
      </section>
    </>
  );
}

/* -------------------------------- Job lists ------------------------------- */

function ActiveJobsSection({
  jobs,
  loading,
  busy,
  focusJobId,
  onQuote,
  onConfirm,
  onPhase,
  onComplete,
  gps,
  onSeeAll,
}) {
  return (
    <section className="wk-section">
      <div className="wk-section__head">
        <div>
          <p className="wk-eyebrow">In progress</p>
          <h2>Your active jobs</h2>
        </div>
        {onSeeAll ? (
          <button type="button" className="wk-link-btn" onClick={onSeeAll}>
            See all <ChevronRight size={14} />
          </button>
        ) : null}
      </div>

      {jobs.length ? (
        <div className="wk-active-list">
          {jobs.map((job) => (
            <ActiveJobCard
              key={job.id}
              job={job}
              busy={busy}
              highlight={focusJobId === job.id}
              onQuote={() => onQuote(job)}
              onConfirm={() => onConfirm(job)}
              onPhase={(phase) => onPhase(job, phase)}
              onComplete={() => onComplete(job)}
              gps={gps?.jobId === job.id ? gps : null}
            />
          ))}
        </div>
      ) : (
        <div className="wk-empty wk-empty--inline">
          {loading ? (
            <Spinner size={22} />
          ) : (
            <>
              <Clock3 size={24} />
              <strong>No active job</strong>
              <p>Accept an available job below and it will show up here.</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function AvailableJobsSection({
  jobs,
  loading,
  busy,
  canAccept,
  onAccept,
  onSeeAll,
  showEmptyHint,
}) {
  return (
    <section className="wk-section">
      <div className="wk-section__head">
        <div>
          <p className="wk-eyebrow">Job feed</p>
          <h2>Available in your area</h2>
        </div>
        {onSeeAll ? (
          <button type="button" className="wk-link-btn" onClick={onSeeAll}>
            See all <ChevronRight size={14} />
          </button>
        ) : null}
      </div>

      {jobs.length ? (
        <div className="wk-job-list">
          {jobs.map((job) => (
            <AvailableJobCard
              key={job.id}
              job={job}
              busy={busy === `accept:${job.id}`}
              canAccept={canAccept}
              onAccept={() => onAccept(job)}
            />
          ))}
        </div>
      ) : (
        <div className="wk-empty wk-empty--inline">
          {loading ? (
            <Spinner size={22} />
          ) : (
            <>
              <Sparkles size={24} />
              <strong>No open jobs right now</strong>
              <p>
                {showEmptyHint
                  ? "New requests appear here instantly. Keep the app open and stay online."
                  : "We will notify you the moment a matching job is posted."}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function AvailableJobCard({ job, busy, canAccept, onAccept }) {
  return (
    <article className={`wk-job${job.urgency === "urgent" ? " wk-job--urgent" : ""}`}>
      <div className="wk-job__top">
        <span className="wk-job__icon">
          <ServiceIcon service={{ key: job.serviceKey }} size={42} iconSize={20} />
        </span>
        <div className="grow">
          <div className="wk-job__title-row">
            <h3>{job.service}</h3>
            {job.urgency === "urgent" ? (
              <span className="wk-badge wk-badge--red">
                <Timer size={11} /> Urgent
              </span>
            ) : (
              <span className="wk-badge wk-badge--muted">Standard</span>
            )}
          </div>
          <p className="wk-job__meta">
            <span>
              <MapPin size={12} /> {job.area}
            </span>
            {job.distance !== null && job.distance !== undefined ? (
              <span>
                <Navigation size={12} /> {distanceLabel(job.distance)}
              </span>
            ) : null}
            <span>
              <Clock3 size={12} /> {timeAgo(job.createdAt)}
            </span>
          </p>
        </div>
        <div className="wk-job__budget">
          <strong>{inr(job.budget)}</strong>
          <span>budget</span>
        </div>
      </div>

      {job.description ? <p className="wk-job__desc">{job.description}</p> : null}

      <div className="wk-job__actions">
        <span className="wk-job__note">
          {canAccept ? "One tap accepts this job." : "Tap accept to clear dues or go online."}
        </span>
        <button
          type="button"
          className="wk-btn wk-btn--primary"
          onClick={onAccept}
          disabled={busy}
        >
          {busy ? <Spinner size={16} /> : <Zap size={16} />}
          {busy ? "Accepting…" : "Accept job"}
        </button>
      </div>
    </article>
  );
}

function ActiveJobCard({
  job,
  busy,
  highlight,
  onQuote,
  onConfirm,
  onPhase,
  onComplete,
  gps,
}) {
  const [phone, setPhone] = useState("");
  const [loadingPhone, setLoadingPhone] = useState(false);
  const confirmed = Boolean(job.pricing?.confirmedAt);
  const price =
    job.pricing?.finalPrice || job.pricing?.workerPrice || job.pricing?.customerOffer || job.budget;
  const lat = job.location?.lat;
  const lng = job.location?.lng;
  const phase =
    job.trackingPhase ||
    (job.status === "ongoing" ? TRACKING_PHASES.WORKING : TRACKING_PHASES.ASSIGNED);
  const meta = trackingMeta(phase, job.status);
  const phaseIndex = Math.max(
    0,
    TRACKING_PHASES.findIndex((item) => item.id === phase),
  );
  const nextAction =
    phase === TRACKING_PHASES.ASSIGNED
      ? { phase: TRACKING_PHASES.EN_ROUTE, label: "Start journey", hint: "Notify customer you are on the way", icon: Navigation }
      : phase === TRACKING_PHASES.EN_ROUTE
        ? { phase: TRACKING_PHASES.ARRIVED, label: "I've arrived", hint: "Confirm you reached the location", icon: MapPin }
        : phase === TRACKING_PHASES.ARRIVED
          ? { phase: TRACKING_PHASES.WORKING, label: "Start work", hint: "Begin the job and keep GPS on", icon: Zap }
          : phase === TRACKING_PHASES.WORKING
            ? { phase: TRACKING_PHASES.COMPLETED, label: "Mark job completed", hint: "Only after the customer inspects the work", icon: CheckCircle2 }
            : null;
  const gpsLive = gps?.status === "sharing";
  const NextIcon = nextAction?.icon;

  useEffect(() => {
    let active = true;
    if (!confirmed) {
      setPhone("");
      return undefined;
    }
    setLoadingPhone(true);
    api
      .get(`/bookings/${job.id}/contact`)
      .then((data) => {
        if (active) setPhone(data.phone || "");
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingPhone(false);
      });
    return () => {
      active = false;
    };
  }, [job.id, confirmed]);

  return (
    <article className={`wk-active${highlight ? " is-focus" : ""}`}>
      <div className="wk-active__head">
        <span className={`wk-status-dot wk-status-dot--${job.status}`} />
        <div className="grow">
          <span className="wk-active__status">
            {meta.label}
            {confirmed ? "" : " · agree the price"}
          </span>
          <h3>{job.service}</h3>
        </div>
        {gps ? (
          <span className={`wk-gps-pill${gpsLive ? " is-on" : ""}`}>
            <Radio size={12} />
            {gpsLive ? "GPS live" : gps.status === "denied" ? "GPS blocked" : "GPS waiting"}
          </span>
        ) : null}
        <div className="wk-active__money">
          <strong>{inr(price)}</strong>
          <span>{confirmed ? "Agreed" : "Budget / quote"}</span>
        </div>
      </div>

      <div className="wk-phase-track" aria-label={`Job phase: ${meta.label}`}>
        {TRACKING_PHASES.map((item, index) => (
          <span
            key={item.id}
            className={
              index < phaseIndex || phase === TRACKING_PHASES.COMPLETED
                ? "is-done"
                : index === phaseIndex
                  ? "is-current"
                  : ""
            }
          >
            <i>{index + 1}</i>
            {item.short}
          </span>
        ))}
      </div>

      {job.trackingAlert ? (
        <div className="wk-alert wk-alert--warn">
          <Clock3 size={16} />
          <span>
            No update recorded recently. Customer tracking is waiting — update your phase or
            refresh GPS.
          </span>
        </div>
      ) : null}

      <div className="wk-active__customer">
        <Avatar name={job.customerName} path={job.customerPhotoPath} size={44} />
        <div className="grow">
          <strong>{job.customerName || "EasyHome customer"}</strong>
          <p>
            <MapPin size={12} /> {job.area}
            {job.urgency === "urgent" ? (
              <span className="wk-badge wk-badge--red" style={{ marginLeft: 8 }}>
                Urgent
              </span>
            ) : null}
          </p>
        </div>
        {confirmed ? (
          <div className="wk-contact-actions">
            {loadingPhone ? (
              <Spinner size={16} />
            ) : phone ? (
              <a href={`tel:${phone}`} className="wk-icon-btn" aria-label="Call customer">
                <Phone size={17} />
              </a>
            ) : null}
            <a
              href={mapsUrl(lat, lng, job.area)}
              target="_blank"
              rel="noreferrer"
              className="wk-icon-btn"
              aria-label="Open map"
            >
              <Navigation size={17} />
            </a>
          </div>
        ) : null}
      </div>

      <p className="wk-active__desc">{job.description}</p>

      {confirmed ? (
        <div className="wk-confirmed">
          <BadgeCheck size={16} />
          <span>
            Price confirmed at <strong>{inr(job.pricing?.finalPrice || price)}</strong>. Contact
            the customer before you leave.
          </span>
        </div>
      ) : (
        <div className="wk-price-state">
          <div>
            <span>Your quote</span>
            <strong>{job.pricing?.workerPrice ? inr(job.pricing.workerPrice) : "Not set"}</strong>
          </div>
          <div>
            <span>Customer budget</span>
            <strong>{inr(job.budget)}</strong>
          </div>
          {job.pricing?.customerOffer ? (
            <div className="wk-price-state__offer">
              <span>Customer offer</span>
              <strong>{inr(job.pricing.customerOffer)}</strong>
            </div>
          ) : null}
        </div>
      )}

      <div className="wk-active__actions">
        {!confirmed ? (
          <>
            <button
              type="button"
              className="wk-btn wk-btn--outline"
              onClick={onQuote}
              disabled={busy}
            >
              <IndianRupee size={16} />
              {job.pricing?.workerPrice ? "Change quote" : "Set final price"}
            </button>
            {job.pricing?.customerOffer || job.pricing?.workerPrice ? (
              <button
                type="button"
                className="wk-btn wk-btn--primary"
                onClick={onConfirm}
                disabled={busy}
              >
                <CheckCircle2 size={16} />
                Confirm {inr(job.pricing.customerOffer || job.pricing.workerPrice)}
              </button>
            ) : null}
          </>
        ) : null}

        {confirmed && nextAction ? (
          <button
            type="button"
            className={`wk-btn wk-btn--block wk-phase-btn${
              nextAction.phase === TRACKING_PHASES.COMPLETED ? " wk-btn--complete" : ""
            }`}
            onClick={() =>
              nextAction.phase === TRACKING_PHASES.COMPLETED
                ? onComplete()
                : onPhase(nextAction.phase)
            }
            disabled={busy}
          >
            <NextIcon size={22} />
            <span>
              <strong>{nextAction.label}</strong>
              <small>{nextAction.hint}</small>
            </span>
            <ChevronRight size={18} />
          </button>
        ) : null}

        {confirmed && gps && !gpsLive ? (
          <button
            type="button"
            className="wk-btn wk-btn--outline"
            onClick={gps.sendNow}
            disabled={busy}
          >
            <Radio size={16} /> Refresh GPS
          </button>
        ) : null}
      </div>
    </article>
  );
}

/* ------------------------------- Earnings tab ----------------------------- */

function EarningsTab({
  worker,
  earnings,
  commissions,
  loading,
  isPremium,
  onRefresh,
  onCommission,
  onUpgrade,
}) {
  const max = Math.max(1, ...(earnings.chart || []).map((month) => month.amount || 0));
  const pending = commissions.filter((item) =>
    ["pending", "paid", "rejected"].includes(item.status),
  );

  return (
    <>
      <div className="wk-page-head">
        <div>
          <p className="wk-eyebrow">Money</p>
          <h1>Earnings &amp; dues</h1>
          <p>Every completed job, commission and payout in one place.</p>
        </div>
        <button type="button" className="wk-chip-btn" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      <div className="wk-money-grid">
        <div className="wk-money-card wk-money-card--hero">
          <span>Total earned</span>
          <strong>{inr(earnings.total)}</strong>
          <small>{earnings.jobsCompleted || 0} completed jobs</small>
        </div>
        <div className="wk-money-card">
          <span>Today</span>
          <strong>{inr(earnings.today)}</strong>
          <small>Net of commission</small>
        </div>
        <div className="wk-money-card">
          <span>This week</span>
          <strong>{inr(earnings.week)}</strong>
          <small>Mon–Sun</small>
        </div>
        <div className={`wk-money-card${Number(earnings.dues) > 0 ? " wk-money-card--warn" : ""}`}>
          <span>Commission due</span>
          <strong>{inr(earnings.dues)}</strong>
          <small>{isPremium ? "Pro — zero commission" : "Clear to keep accepting jobs"}</small>
        </div>
      </div>

      <div className="wk-two-col">
        <section className="wk-panel-card">
          <div className="wk-section__head">
            <div>
              <p className="wk-eyebrow">Last 6 months</p>
              <h2>Earnings trend</h2>
            </div>
          </div>
          <div className="wk-bars">
            {(earnings.chart || []).map((month) => (
              <div className="wk-bar" key={month.key || month.label}>
                <span className="wk-bar__value">
                  {month.amount ? inr(month.amount) : ""}
                </span>
                <span
                  className="wk-bar__fill"
                  style={{ height: `${Math.max(4, ((month.amount || 0) / max) * 100)}%` }}
                />
                <span className="wk-bar__label">{month.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="wk-panel-card">
          <div className="wk-section__head">
            <div>
              <p className="wk-eyebrow">Status</p>
              <h2>Your plan</h2>
            </div>
            <Crown size={20} style={{ color: isPremium ? "#ffd60a" : "rgba(255,255,255,.4)" }} />
          </div>
          {isPremium ? (
            <div className="wk-premium-card">
              <strong>EasyHome Pro is active</strong>
              <p>You keep 100% of every job and get priority placement in search.</p>
              <span>Until {formatDateTime(worker.premiumUntil)}</span>
            </div>
          ) : (
            <div className="wk-premium-card wk-premium-card--muted">
              <strong>Zero commission with Pro</strong>
              <p>Keep every rupee, get priority job placement and a verified Pro badge.</p>
              <Link to="/subscription" className="wk-btn wk-btn--primary">
                <Crown size={16} /> Upgrade
              </Link>
            </div>
          )}
          <div className="wk-mini-stats">
            <div>
              <strong>{Number(worker.rating || 0).toFixed(1)}</strong>
              <span>Rating</span>
            </div>
            <div>
              <strong>{worker.reviewCount || 0}</strong>
              <span>Reviews</span>
            </div>
            <div>
              <strong>{worker.jobsCompleted || 0}</strong>
              <span>Jobs</span>
            </div>
          </div>
        </section>
      </div>

      <section className="wk-section">
        <div className="wk-section__head">
          <div>
            <p className="wk-eyebrow">Commission</p>
            <h2>Payments &amp; dues</h2>
          </div>
          <span className="wk-badge wk-badge--muted">Razorpay · automatic</span>
        </div>

        {pending.length ? (
          <div className="wk-commission-list">
            {pending.map((commission) => (
              <div className="wk-commission" key={commission.id}>
                <span className="wk-commission__icon">
                  <ReceiptText size={18} />
                </span>
                <div className="grow">
                  <strong>{commission.service || "Job commission"}</strong>
                  <span>
                    {formatDateTime(commission.createdAt)} ·{" "}
                    <span className={`wk-capitalize wk-text-${commission.status}`}>
                      {commission.status}
                    </span>
                  </span>
                  {commission.rejectionReason ? (
                    <small className="wk-text-red">{commission.rejectionReason}</small>
                  ) : null}
                </div>
                <div className="wk-commission__money">
                  <strong>{inr(commission.amount)}</strong>
                  {commission.status === "pending" || commission.status === "rejected" ? (
                    <button type="button" onClick={() => onCommission(commission)}>
                      Pay now
                    </button>
                  ) : (
                    <span>{commission.status === "paid" ? "Verifying…" : "Approved"}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="wk-empty wk-empty--inline">
            <CheckCircle2 size={24} />
            <strong>No commission due</strong>
            <p>Your account is clear. Keep accepting jobs.</p>
          </div>
        )}

        <div className="wk-pay-instructions">
          <div>
            <p className="wk-eyebrow">How to pay</p>
            <p>
              Pay securely through Razorpay. Commission clears and new jobs unlock
              automatically as soon as the payment is verified.
            </p>
          </div>
          {!isPremium ? (
            <button type="button" className="wk-link-btn" onClick={onUpgrade}>
              Or go Pro for 0% <ArrowRight size={14} />
            </button>
          ) : null}
        </div>
      </section>

      <section className="wk-section">
        <div className="wk-section__head">
          <div>
            <p className="wk-eyebrow">Payouts</p>
            <h2>Recent completed jobs</h2>
          </div>
        </div>
        {earnings.recent?.length ? (
          <div className="wk-history">
            {earnings.recent.map((item) => (
              <div className="wk-history__row" key={item.bookingId}>
                <span className="wk-history__icon">
                  <Banknote size={17} />
                </span>
                <div className="grow">
                  <strong>{item.service}</strong>
                  <span>{formatDateTime(item.completedAt)}</span>
                </div>
                <div className="wk-history__money">
                  <strong>{inr(item.net)}</strong>
                  <span>{item.paid ? "Customer paid" : "Awaiting customer"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="wk-empty wk-empty--inline">
            <Wallet size={24} />
            <strong>No payouts yet</strong>
            <p>Completed jobs show up here with the amount you keep.</p>
          </div>
        )}
      </section>
    </>
  );
}

/* -------------------------------- Profile tab ----------------------------- */

function ProfileTab({ worker, onLogout }) {
  const { services, settings } = useCatalogue();
  const toast = useToast();
  const { refreshClaims } = useAuth();
  const [form, setForm] = useState({
    name: worker.name || "",
    phone: worker.phone || "",
    serviceKey: worker.serviceKey || "",
    service: worker.service || "",
    area: worker.area || "",
    pricePerWork: worker.pricePerWork || "",
    bio: worker.bio || "",
    upiId: worker.upiId || "",
  });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState(
    worker.lat && worker.lng ? { lat: worker.lat, lng: worker.lng } : null,
  );

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: worker.name || "",
      phone: worker.phone || "",
      serviceKey: worker.serviceKey || "",
      service: worker.service || "",
      area: worker.area || "",
      pricePerWork: worker.pricePerWork || "",
      bio: worker.bio || "",
      upiId: worker.upiId || "",
    }));
  }, [
    worker.name,
    worker.phone,
    worker.serviceKey,
    worker.service,
    worker.area,
    worker.pricePerWork,
    worker.bio,
    worker.upiId,
  ]);

  const set = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error("Enter your full name.");
      return;
    }
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }
    if (form.area.trim().length < 2) {
      toast.error("Add your service area.");
      return;
    }
    setSaving(true);
    try {
      const service = services.find((item) => item.key === form.serviceKey);
      await api.patch("/worker/profile", {
        name: form.name.trim(),
        ...(form.phone ? { phone: form.phone } : {}),
        service: service?.name || form.service || SERVICE_META[form.serviceKey]?.name || form.service,
        serviceKey: form.serviceKey,
        area: form.area.trim(),
        pricePerWork: Number(form.pricePerWork) || 199,
        bio: form.bio.trim(),
        upiId: form.upiId.trim(),
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      });
      await refreshClaims();
      toast.success("Worker profile updated.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const capture = async () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
        });
      });
      setCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      toast.success("Location updated. Save changes to apply it.");
    } catch {
      toast.error("Could not access location.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <>
      <div className="wk-page-head">
        <div>
          <p className="wk-eyebrow">Account</p>
          <h1>Worker profile</h1>
          <p>Your public listing, trade details and payout information.</p>
        </div>
        <Link to={`/workers/${worker.id}`} className="wk-chip-btn">
          View public profile <ArrowRight size={14} />
        </Link>
      </div>

      <div className="wk-profile-grid">
        <section className="wk-panel-card wk-profile-card">
          <div className="wk-profile-card__top">
            <Avatar name={worker.name} path={worker.photoPath} size={78} ring={worker.isPremium} />
            <div>
              <h2>{worker.name}</h2>
              <p>
                {worker.service} · {worker.area}
              </p>
              <div className="wk-profile-badges">
                <span className="wk-badge wk-badge--green">
                  <BadgeCheck size={11} /> Approved
                </span>
                {worker.kycStatus === "verified" ? (
                  <span className="wk-badge wk-badge--blue">
                    <ShieldCheck size={11} /> ID verified
                  </span>
                ) : null}
                {worker.isPremium ? (
                  <span className="wk-badge wk-badge--yellow">
                    <Crown size={11} /> Pro
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="wk-profile-stats">
            <div>
              <strong>{Number(worker.rating || 0).toFixed(1)}</strong>
              <span>Rating</span>
            </div>
            <div>
              <strong>{worker.jobsCompleted || 0}</strong>
              <span>Completed</span>
            </div>
            <div>
              <strong>{worker.reviewCount || 0}</strong>
              <span>Reviews</span>
            </div>
            <div>
              <strong>{inr(worker.pricePerWork || 199)}</strong>
              <span>Starting</span>
            </div>
          </div>

          <KycCard worker={worker} compact />
        </section>

        <section className="wk-panel-card">
          <div className="wk-section__head">
            <div>
              <p className="wk-eyebrow">Public details</p>
              <h2>Edit profile</h2>
            </div>
          </div>

          <form className="wk-form" onSubmit={save}>
            <div className="wk-form-grid">
              <Field label="Full name" htmlFor="wk-name" required>
                <Input id="wk-name" value={form.name} maxLength={80} onChange={set("name")} />
              </Field>
              <Field label="Mobile" htmlFor="wk-phone">
                <Input
                  id="wk-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                />
              </Field>
              <Field label="Trade" htmlFor="wk-service">
                <select
                  id="wk-service"
                  className="input"
                  value={form.serviceKey}
                  onChange={(event) => {
                    const nextKey = event.target.value;
                    const service = services.find((item) => item.key === nextKey);
                    setForm((prev) => ({
                      ...prev,
                      serviceKey: nextKey,
                      service: service?.name || SERVICE_META[nextKey]?.name || prev.service,
                    }));
                  }}
                >
                  {services.map((service) => (
                    <option key={service.key} value={service.key}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Starting price (₹)" htmlFor="wk-price">
                <Input
                  id="wk-price"
                  type="number"
                  min={0}
                  max={100000}
                  value={form.pricePerWork}
                  onChange={set("pricePerWork")}
                />
              </Field>
              <Field label="Service area" htmlFor="wk-area" className="wk-span-2" required>
                <Input id="wk-area" value={form.area} maxLength={120} onChange={set("area")} />
              </Field>
              <Field
                label="UPI ID for payouts"
                htmlFor="wk-upi"
                hint="Used for any manual settlement or refund processed by EasyHome."
                className="wk-span-2"
              >
                <Input
                  id="wk-upi"
                  value={form.upiId}
                  maxLength={80}
                  onChange={set("upiId")}
                  placeholder="yourname@upi"
                />
              </Field>
              <Field
                label="Bio"
                htmlFor="wk-bio"
                hint={`${form.bio.length}/400 shown on your public profile`}
                className="wk-span-2"
              >
                <Textarea
                  id="wk-bio"
                  rows={4}
                  maxLength={400}
                  value={form.bio}
                  onChange={set("bio")}
                  placeholder="Tell customers about your experience, specialties and languages."
                />
              </Field>
            </div>

            <div className="wk-inline-actions">
              <button
                type="button"
                className="wk-chip-btn"
                onClick={capture}
                disabled={locating}
              >
                <Crosshair size={14} />
                {coords ? "Update location" : "Pin location"}
              </button>
              <span className="wk-fineprint">
                {coords
                  ? `Pinned ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`
                  : "Add location for accurate nearby jobs."}
              </span>
            </div>

            <Button
              type="submit"
              size="lg"
              className="wk-btn wk-btn--primary wk-btn--block"
              loading={saving}
            >
              Save profile
            </Button>
          </form>
        </section>
      </div>

      <section className="wk-panel-card wk-account-card">
        <div>
          <p className="wk-eyebrow">Account</p>
          <h2>Status &amp; support</h2>
          <p className="wk-fineprint">
            Worker ID {worker.id?.slice(0, 10)} · joined {formatDateTime(worker.createdAt)}
          </p>
        </div>
        <div className="wk-account-actions">
          <Link to="/chat" className="wk-btn wk-btn--outline">
            <Phone size={15} /> Support
          </Link>
          <Link to="/" className="wk-btn wk-btn--outline">
            <Home size={15} /> Customer app
          </Link>
          <button
            type="button"
            className="wk-btn wk-btn--danger"
            onClick={onLogout}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </section>

      <p className="wk-fineprint" style={{ textAlign: "center" }}>
        <Percent size={11} style={{ display: "inline", marginRight: 4 }} />
        Commission is {settings.commissionPct || 10}% on completed non-premium jobs.
        Pro members pay 0%.
      </p>
    </>
  );
}

/* --------------------------------- Modals --------------------------------- */

function PriceModal({ job, settings, isPremium, busy, onClose, onSubmit }) {
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (job) setPrice(String(job.pricing?.workerPrice || job.budget || ""));
  }, [job]);

  const amount = Number(price) || 0;
  const commission = isPremium ? 0 : Math.round((amount * (settings.commissionPct || 10)) / 100);

  const submit = async () => {
    if (amount < 99) {
      setError("Enter at least ₹99.");
      return;
    }
    setError("");
    try {
      await onSubmit(amount);
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <Modal
      open={Boolean(job)}
      onClose={onClose}
      title="Set the final price"
      subtitle={job ? `${job.service} · ${job.area}` : ""}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={submit}>
            Send quote
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field
          label="Final price (₹)"
          htmlFor="wk-quote"
          error={error}
          hint={job ? `Customer budget: ${inr(job.budget)}` : ""}
        >
          <Input
            id="wk-quote"
            type="number"
            min={99}
            max={100000}
            value={price}
            autoFocus
            onChange={(event) => setPrice(event.target.value)}
          />
        </Field>
        <div className="wk-quote-summary">
          <div>
            <span>Customer pays</span>
            <strong>{inr(amount)}</strong>
          </div>
          <div>
            <span>Commission</span>
            <strong>{inr(commission)}</strong>
          </div>
          <div>
            <span>You receive</span>
            <strong>{inr(Math.max(0, amount - commission))}</strong>
          </div>
        </div>
        <p className="tiny muted">
          The customer sees this price immediately and can accept or send one counter-offer.
        </p>
      </div>
    </Modal>
  );
}

function ConfirmPriceModal({ job, busy, onClose, onSubmit }) {
  const price = Number(job?.pricing?.customerOffer || job?.pricing?.workerPrice) || 0;

  return (
    <Modal
      open={Boolean(job)}
      onClose={onClose}
      title="Confirm this price?"
      subtitle={job ? `${job.service} · ${job.customerName}` : ""}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not yet
          </Button>
          <Button loading={busy} onClick={() => onSubmit(price)} icon={CheckCircle2}>
            Confirm {inr(price)}
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="wk-confirm-amount">
          <span>Agreed price</span>
          <strong>{inr(price)}</strong>
        </div>
        <p className="small">
          Confirming unlocks the customer's phone number and address so you can coordinate the
          visit. Only confirm when you are ready to do the work.
        </p>
        <div className="wk-alert wk-alert--info">
          <ShieldCheck size={16} />
          <span>Prices cannot be changed after confirmation. Contact support for disputes.</span>
        </div>
      </div>
    </Modal>
  );
}

function CompleteModal({ job, busy, onClose, onConfirm }) {
  return (
    <Modal
      open={Boolean(job)}
      onClose={onClose}
      title="Mark job completed?"
      subtitle={job ? `${job.service} · ${job.customerName}` : ""}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not finished
          </Button>
          <Button
            loading={busy}
            onClick={onConfirm}
            icon={CheckCircle2}
            style={{ background: "var(--green)", borderColor: "var(--green)", color: "#fff" }}
          >
            Yes, mark completed
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="wk-alert wk-alert--warn">
          <CircleAlert size={17} />
          <span>
            Only mark complete after the work is finished and the customer has inspected it.
            This ends the job and starts the payment confirmation flow.
          </span>
        </div>
        <div className="wk-confirm-amount">
          <span>Amount to collect</span>
          <strong>{inr(job?.pricing?.finalPrice || 0)}</strong>
        </div>
        <p className="small muted">
          Collect payment directly from the customer by cash or UPI. EasyHome commission is
          recorded separately.
        </p>
      </div>
    </Modal>
  );
}

function CommissionModal({ commission, onClose, onPaid }) {
  return (
    <Modal
      open={Boolean(commission)}
      onClose={onClose}
      title="Pay commission"
      subtitle={
        commission
          ? `${commission.service} · ${inr(commission.amount)}`
          : ""
      }
      size="sm"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="stack">
        {commission ? (
          <RazorpayPayment
            amount={commission.amount || 0}
            description={`EasyHome commission · ${commission.service || "Job"}`}
            orderEndpoint="/payment/commission/order"
            verifyEndpoint="/payment/commission/verify"
            orderBody={{ commissionId: commission.id }}
            onSuccess={onPaid}
            buttonLabel="Pay & clear commission"
          />
        ) : null}
        <p className="tiny muted">
          Verified automatically. EasyHome never sees your card or UPI credentials.
        </p>
      </div>
    </Modal>
  );
}
