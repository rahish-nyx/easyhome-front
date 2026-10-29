import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  Crosshair,
  Crown,
  Gift,
  Headphones,
  Home,
  IndianRupee,
  LogOut,
  MapPin,
  Navigation,
  Percent,
  Phone,
  Pencil,
  Power,
  Radio,
  ReceiptText,
  RefreshCw,
  Share2,
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
import { useStandalone } from "../hooks/useDevice";
import { qBookingsForWorker, qJobFeed } from "../lib/queries";
import { api } from "../lib/api";
import {
  distanceKm,
  distanceLabel,
  mapsUrl,
} from "../lib/geo";
import {
  formatDateTime,
  inr,
  timeAgo,
} from "../lib/format";
import { PLANS, SERVICE_META, TRACKING_PHASES, trackingMeta } from "../lib/constants";
import { rolePlans, workerFeePct } from "../lib/plans";
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
import { compressImage } from "../lib/image";
import { mediaUrl } from "../lib/media";
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
  { id: "refer", label: "Refer", icon: Gift },
  { id: "membership", label: "Membership", icon: Crown },
  { id: "profile", label: "Profile", icon: UserRound },
];

const PRIMARY_TAB_IDS = ["home", "jobs", "earnings", "profile"];
const PRIMARY_TABS = TABS.filter((item) => PRIMARY_TAB_IDS.includes(item.id));
// Profile lives in the avatar menu and the mobile bottom bar. Keeping it out of
// the desktop tab strip leaves the header room for the live job tools.
const HEADER_TABS = TABS.filter((item) => item.id !== "profile");

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
    user,
    profile,
    worker,
    isPremium,
    logout,
    refreshProfile,
  } = useAuth();
  const { settings, promos, zones } = useCatalogue();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab") || "home";
  const tab = TABS.some((item) => item.id === requestedTab) ? requestedTab : "home";
  const focusJobId = params.get("job") || "";

  const [busy, setBusy] = useState("");
  const [onlineSaving, setOnlineSaving] = useState(false);
  const [priceTarget, setPriceTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [feeTarget, setFeeTarget] = useState(null);

  const earningsState = useAsync(() => api.get("/worker/earnings"), []);
  const commissionsState = useAsync(() => api.get("/worker/commission"), []);
  const earnings = earningsState.data || EMPTY_EARNINGS;
  const commissions = commissionsState.data?.commissions || [];

  const myQuery = useMemo(
    () => (user ? qBookingsForWorker(user.uid) : null),
    [user],
  );
  const serviceKey = worker?.serviceKey;
  const feedQuery = useMemo(
    () => (serviceKey && user?.uid ? qJobFeed(serviceKey, user.uid, 40) : null),
    [serviceKey, user?.uid],
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

  const activeZoneIds = useMemo(
    () =>
      new Set(
        zones
          .filter((zone) => zone.isActive === true)
          .map((zone) => zone.id),
      ),
    [zones],
  );

  const available = useMemo(() => {
    if (!worker) return [];
    return feed
      .filter((job) => {
        if (job.preferredWorkerId && job.preferredWorkerId !== worker.id) return false;
        if (job.serviceZoneId && !activeZoneIds.has(job.serviceZoneId)) return false;
        return true;
      })
      .map((job) => ({
        ...job,
        id: job.bookingId || job.id,
        distance: distanceKm(worker, job),
      }))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === "pro" ? -1 : 1;
        if (a.urgency !== b.urgency) return a.urgency === "urgent" ? -1 : 1;
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [feed, worker, activeZoneIds]);

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
        setFeeTarget(payable);
        toast.info("Pay your fees due to unlock new jobs.");
      } else {
        toast.error(
          "Your fees are still pending. Open Earnings to complete the secure checkout.",
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

  const handleFeesPaid = async () => {
    setFeeTarget(null);
    toast.success("Fees verified automatically. New jobs are unlocked.");
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
          <Logo />
          <nav className="worker-top__links" aria-label="Worker sections">
            {HEADER_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? "is-active" : ""}
                onClick={() => setTab(item.id)}
              >
                <item.icon size={16} />
                {item.label}
                {item.id === "jobs" && activeJobs.length ? (
                  <em className="worker-nav__count">{activeJobs.length}</em>
                ) : null}
              </button>
            ))}
          </nav>
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

            <WorkerProfileMenu
              worker={worker}
              profile={profile}
              isPremium={isPremium}
              onProfile={() => setTab("profile")}
              onBookings={() => setTab("jobs")}
              onMembership={() => setTab("membership")}
              onRefer={() => setTab("refer")}
              onLogout={logout}
            />
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

        {tab === "home" ? <WorkerAdSlot promos={promos} /> : null}

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
              <strong>{inr(worker.dues)} fees due</strong>
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
            onFees={setFeeTarget}
            onUpgrade={() => setTab("membership")}
          />
        ) : null}

        {tab === "refer" ? (
          <WorkerReferTab worker={worker} profile={profile} />
        ) : null}

        {tab === "membership" ? (
          <MembershipTab worker={worker} isPremium={isPremium} settings={settings} />
        ) : null}

        {tab === "profile" ? (
          <ProfileTab
            key={JSON.stringify([
              worker.name,
              worker.phone,
              worker.serviceKey,
              worker.service,
              worker.area,
              worker.areaName,
              worker.city,
              worker.state,
              worker.lat,
              worker.lng,
              worker.pricePerWork,
              worker.bio,
              worker.upiId,
              worker.photoPath,
            ])}
            worker={worker}
            onLogout={logout}
            onRefresh={refreshMoney}
          />
        ) : null}

        <WorkerFooter />
      </main>

      <nav className="worker-nav" aria-label="Worker navigation">
        {PRIMARY_TABS.map((item) => {
          const active =
            tab === item.id ||
            (item.id === "profile" &&
              ["profile", "membership", "refer"].includes(tab));
          return (
            <button
              key={item.id}
              type="button"
              className={active ? "is-active" : ""}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={21} />
              <span>{item.label}</span>
              {item.id === "jobs" && activeJobs.length ? (
                <em className="worker-nav__count">{activeJobs.length}</em>
              ) : null}
            </button>
          );
        })}
      </nav>

      <PriceModal
        key={priceTarget?.id || "closed"}
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
      <FeesModal
        commission={feeTarget}
        onClose={() => setFeeTarget(null)}
        onPaid={handleFeesPaid}
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
        <span>Fees due</span>
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

function WorkerProfileMenu({
  worker,
  profile,
  isPremium,
  onProfile,
  onBookings,
  onMembership,
  onRefer,
  onLogout,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === "keydown" && event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.type === "mousedown" && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const choose = (action) => {
    setOpen(false);
    action();
  };

  return (
    <div className="wk-profile-menu" ref={menuRef}>
      <button
        type="button"
        className="worker-user worker-user--btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar
          name={worker.name || profile?.name}
          path={worker.photoPath || profile?.photoPath}
          size={36}
          ring={isPremium}
        />
        <span className="wk-profile-menu__copy">
          <strong>{worker.name || profile?.name}</strong>
          <span>{worker.service || "EasyHome Pro"}</span>
        </span>
        <ChevronDown
          size={15}
          className="wk-profile-menu__chevron"
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="wk-profile-menu__dropdown" role="menu" aria-label="Profile options">
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onProfile)}
          >
            <UserRound size={16} /> My Profile
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onBookings)}
          >
            <BriefcaseBusiness size={16} /> My Jobs
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onMembership)}
          >
            <Crown size={16} /> Membership
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onRefer)}
          >
            <Gift size={16} /> Refer &amp; Earn
          </button>
          <button
            type="button"
            role="menuitem"
            className="is-danger"
            onClick={() => choose(onLogout)}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function WorkerAdSlot({ promos }) {
  const promo = promos.find((item) => item.placement === "worker_dashboard");
  if (!promo) return null;

  const imageUrl = mediaUrl(promo.imagePath);
  const embedHtml = String(promo.embedHtml || "").trim();
  const content = (
    <>
      {imageUrl ? <img className="wk-ad-slot__image" src={imageUrl} alt="" /> : null}
      <span className="wk-ad-slot__copy">
        <strong>{promo.title}</strong>
        {promo.subtitle ? <span>{promo.subtitle}</span> : null}
      </span>
      {promo.ctaText ? <span className="wk-ad-slot__cta">{promo.ctaText}</span> : null}
    </>
  );
  const safeLink = String(promo.ctaLink || "").trim();
  const isSafeInternalLink =
    safeLink.startsWith("/") && !safeLink.startsWith("//") && !safeLink.includes("\\");

  return (
    <aside className={`wk-ad-slot is-${promo.theme || "blue"}`} aria-label="Offer Zone">
      <span className="wk-ad-slot__tag">Offer Zone</span>
      {embedHtml ? (
        <div
          className="wk-ad-slot__embed"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      ) : isSafeInternalLink ? (
        <Link to={safeLink}>{content}</Link>
      ) : (
        <div>{content}</div>
      )}
    </aside>
  );
}

function MembershipTab({ worker, isPremium, settings }) {
  const { refreshClaims, refreshProfile } = useAuth();
  const toast = useToast();
  const [plan, setPlan] = useState("monthly");
  const prices = rolePlans(settings, "worker");
  const plans = PLANS.map((item) => {
    const amount = prices[item.id] ?? prices.monthly;
    return {
      ...item,
      amount,
      perMonth: Math.round(amount / item.months),
    };
  });
  const selected = plans.find((item) => item.id === plan) || plans[0];

  const onPaid = async () => {
    await Promise.all([refreshProfile(), refreshClaims()]);
    toast.success("Payment verified. Your EasyHome Pro membership is active.");
  };

  return (
    <>
      <div className="wk-page-head">
        <div>
          <p className="wk-eyebrow">EasyHome Pro</p>
          <h1>Membership</h1>
          <p>Choose a plan for zero fees and priority access to jobs.</p>
        </div>
        {isPremium ? <span className="wk-badge wk-badge--green">Membership active</span> : null}
      </div>
      <section className="wk-membership-card">
        <div>
          <p className="wk-eyebrow">{isPremium ? "Your plan" : "Professional membership"}</p>
          <h2>{isPremium ? "You’re on EasyHome Pro" : "Keep more of every job"}</h2>
          <p>
            {isPremium
              ? `Your current membership is active until ${formatDateTime(worker.premiumUntil)}.`
              : "Pro includes 0% fees, priority job placement and a verified Pro badge."}
          </p>
          <ul>
            {(settings.workerBenefits || []).map((benefit) => (
              <li key={benefit}><CheckCircle2 size={16} /> {benefit}</li>
            ))}
          </ul>
        </div>
        {!isPremium ? (
          <div className="wk-membership-card__checkout">
            <fieldset className="wk-plan-picker">
              <legend>Choose a plan</legend>
              <div className="wk-plan-picker__grid">
                {plans.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`wk-plan-option${plan === item.id ? " is-active" : ""}`}
                    aria-pressed={plan === item.id}
                    onClick={() => setPlan(item.id)}
                  >
                    {item.badge ? <span className="wk-plan-option__badge">{item.badge}</span> : null}
                    <strong>{item.label}</strong>
                    <span className="wk-plan-option__price">{inr(item.amount)}</span>
                    <small>{item.id === "monthly" ? "per month" : `${inr(item.perMonth)} / month`}</small>
                    <span className="wk-plan-option__blurb">{item.blurb}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <RazorpayPayment
              amount={selected.amount}
              description={`EasyHome Pro · ${selected.label}`}
              orderEndpoint="/payment/subscription/order"
              verifyEndpoint="/payment/subscription/verify"
              orderBody={{ plan: selected.id }}
              onSuccess={onPaid}
              buttonLabel={`Pay ${inr(selected.amount)} & activate`}
            />
          </div>
        ) : null}
      </section>
    </>
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
            <span>Fees</span>
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
            <small>Payouts, dues and fees</small>
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
          <h2>Grow with EasyHome</h2>
        </div>
        <span className="wk-promos__location">
          <MapPin size={13} /> {location}
        </span>
      </div>

      <div className="wk-promos__grid">
        <button
          type="button"
          className="wk-promo wk-promo--yellow"
          onClick={() => onTab("membership")}
        >
          <span className="wk-promo__icon">
            <Crown size={20} />
          </span>
          <span className="grow">
            <strong>{isPremium ? "Pro membership is active" : "Upgrade to EasyHome Pro"}</strong>
            <small>
              {isPremium
                ? "0% fees, priority placement and urgent-job priority."
                : "Keep 100% of your earnings with 0% fees on Pro."}
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
              {worker?.kycStatus === "verified" ? "ID verification complete" : "Complete your KYC"}
            </strong>
            <small>
              {worker?.kycStatus === "verified"
                ? "Your verified badge builds trust with customers."
                : "Get verified to win more jobs and build credibility."}
            </small>
          </span>
          <ChevronRight size={17} />
        </button>

        <button
          type="button"
          className="wk-promo wk-promo--green"
          onClick={() => onTab("refer")}
        >
          <span className="wk-promo__icon">
            <Gift size={20} />
          </span>
          <span className="grow">
            <strong>Refer &amp; earn</strong>
            <small>
              Invite skilled pros. Rewards are approved after their first
              completed job and admin verification.
            </small>
          </span>
          <ChevronRight size={17} />
        </button>

        <Link to="/worker/support" className="wk-promo wk-promo--support">
          <span className="wk-promo__icon">
            <Headphones size={20} />
          </span>
          <span className="grow">
            <strong>Need help?</strong>
            <small>Chat with EasyHome Pro support for jobs, payouts or account help.</small>
          </span>
          <ChevronRight size={17} />
        </Link>
      </div>
    </section>
  );
}

const WORKER_REFERRAL_STATUS = {
  pending: {
    label: "Awaiting first job",
    tone: "amber",
    hint: "Rewards unlock after their first completed job and admin verification.",
  },
  service_completed: {
    label: "Under admin review",
    tone: "blue",
    hint: "Their first job is complete. Our team is verifying the referral.",
  },
  approved: {
    label: "Approved",
    tone: "green",
    hint: "Approved by admin. The reward is paid separately and never auto-credited.",
  },
  rejected: {
    label: "Not approved",
    tone: "red",
    hint: "This referral did not pass verification. Contact support if you need help.",
  },
};

function WorkerReferTab({ worker, profile }) {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get("/referrals/me");
      setState({ loading: false, data, error: "" });
    } catch (error) {
      setState({ loading: false, data: null, error: error.message });
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  const code = state.data?.code || "";
  const shareUrl = useMemo(() => {
    if (!code || typeof window === "undefined") return "";
    return `${window.location.origin}/auth?mode=signup&role=worker&ref=${encodeURIComponent(code)}`;
  }, [code]);
  const stats = state.data?.stats || {};
  const referrals = state.data?.referrals || [];

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      toast.success("Professional invite link copied.");
    } catch {
      toast.error("Copy failed. Press and hold to copy manually.");
    }
  };

  const shareLink = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join EasyHome as a professional",
          text: "Join EasyHome with my professional invite. We each unlock ₹51 after your first completed job and admin verification.",
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    await copyLink();
  };

  return (
    <>
      <div className="wk-page-head">
        <div>
          <p className="wk-eyebrow">Refer &amp; Earn</p>
          <h1>Grow the professional network</h1>
          <p>
            Invite another verified professional. You both unlock ₹51 after
            their first completed job and admin approval.
          </p>
        </div>
        <span className="wk-badge wk-badge--green">₹51 each</span>
      </div>

      <section className="wk-refer-card">
        <div className="wk-refer-card__main">
          <p className="wk-eyebrow">Your professional code</p>
          <h2>{state.loading && !code ? "Loading your code…" : code || "Code unavailable"}</h2>
          <p>
            {worker?.name || profile?.name || "This professional"} invites another
            professional to join EasyHome. Same-role referrals only.
          </p>
          <div className="wk-refer-card__actions">
            <button type="button" className="wk-btn wk-btn--primary" onClick={shareLink}>
              <Share2 size={16} /> Share invite
            </button>
            <button type="button" className="wk-btn" onClick={copyLink}>
              <Copy size={16} /> {copied ? "Copied" : "Copy link"}
            </button>
            <button type="button" className="wk-btn wk-btn--outline" onClick={load}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
          {state.error ? <p className="wk-text-red tiny">{state.error}</p> : null}
        </div>
        <div className="wk-refer-card__rules">
          <strong>How it works</strong>
          <ul>
            <li>Share your link with a professional who is new to EasyHome.</li>
            <li>They create a professional account with your code.</li>
            <li>After their first completed job, the referral enters admin review.</li>
            <li>Rewards are never auto-credited; approval is always manual.</li>
          </ul>
        </div>
      </section>

      <div className="wk-refer-stats">
        {[
          ["Invited", stats.total || 0],
          ["Awaiting job", stats.pending || 0],
          ["In review", stats.awaitingVerification || 0],
          ["Approved rewards", inr(stats.approvedRewards || 0)],
        ].map(([label, value]) => (
          <div className="wk-refer-stat" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <section className="wk-refer-list">
        <div className="wk-refer-list__head">
          <h2>Your referrals</h2>
          <span>{referrals.length} total</span>
        </div>
        {referrals.length ? (
          referrals.map((item) => {
            const meta =
              WORKER_REFERRAL_STATUS[item.status] ||
              WORKER_REFERRAL_STATUS.pending;
            return (
              <article className="wk-refer-row" key={item.id}>
                <div>
                  <strong>{item.referredName}</strong>
                  <small>
                    Joined {formatDateTime(item.createdAt)} · {meta.hint}
                  </small>
                </div>
                <span className={`wk-badge wk-badge--${meta.tone}`}>
                  {meta.label}
                </span>
                <strong className="wk-refer-row__amount">
                  {inr(item.rewardAmount || 51)}
                </strong>
              </article>
            );
          })
        ) : (
          <div className="wk-refer-empty">
            <Gift size={22} />
            <strong>No referrals yet</strong>
            <p>Share your professional invite to start earning.</p>
          </div>
        )}
      </section>
    </>
  );
}

function WorkerFooter() {
  const standalone = useStandalone();
  const { footerLinks } = useCatalogue();
  const serviceLinks = footerLinks.filter((item) => item.group === "services");
  const legalLinks = footerLinks.filter((item) =>
    ["company", "legal", "support"].includes(item.group),
  );
  const professionalLinks = footerLinks.filter(
    (item) => item.group === "professionals",
  );

  // Installed PWAs already provide app navigation; a marketing footer only
  // adds noise and can collide with the fixed bottom navigation.
  if (standalone) return null;

  return (
    <footer className="wk-footer wk-footer--compact">
      <div className="wk-footer__main">
        <div className="wk-footer__brand">
          <div className="wk-footer__logo">
            Easy<span>Home</span>
            <em>PRO</em>
          </div>
          <p>
            Local work, transparent payouts and support that knows your jobs.
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
          <h3>Services</h3>
          {serviceLinks.map((item) => (
            <Link key={item.id} to={item.href}>
              {item.label}
            </Link>
          ))}
          <Link to="/services" className="wk-footer__more">
            Browse all services
          </Link>
        </div>

        <div className="wk-footer__col">
          <h3>Legal</h3>
          {legalLinks.length ? (
            legalLinks.map((item) => (
              <Link key={item.id} to={item.href}>
                {item.label}
              </Link>
            ))
          ) : (
            <>
              <Link to="/faq">Help &amp; FAQ</Link>
              <Link to="/legal/terms">Terms of service</Link>
              <Link to="/legal/privacy">Privacy policy</Link>
            </>
          )}
        </div>

        <div className="wk-footer__col">
          <h3>For professionals</h3>
          {professionalLinks.length ? (
            professionalLinks.map((item) => (
              <Link key={item.id} to={item.href}>
                {item.label}
              </Link>
            ))
          ) : (
            <>
              <Link to="/worker">Worker console</Link>
              <Link to="/worker?tab=membership">Membership</Link>
              <Link to="/worker/support">Support</Link>
            </>
          )}
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
            <strong>{worker.online ? "Fees dues are blocking new jobs" : "You are offline"}</strong>
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
    <section className="wk-section wk-section--card">
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
    <section className="wk-section wk-section--card">
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
            ) : null}
            {job.priority === "pro" ? (
              <span className="wk-badge wk-badge--yellow">
                <Crown size={11} /> Pro priority
              </span>
            ) : job.urgency !== "urgent" ? (
              <span className="wk-badge wk-badge--muted">Standard</span>
            ) : null}
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
  const [phoneLoadedFor, setPhoneLoadedFor] = useState("");
  const confirmed = Boolean(job.pricing?.confirmedAt);
  const loadingPhone = confirmed && phoneLoadedFor !== job.id;
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
      return undefined;
    }
    api
      .get(`/bookings/${job.id}/contact`)
      .then((data) => {
        if (active) setPhone(data.phone || "");
      })
      .catch(() => {})
      .finally(() => {
        if (active) setPhoneLoadedFor(job.id);
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
  onFees,
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
          <p>Every completed job, fees and payout in one place.</p>
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
          <small>Net of fees</small>
        </div>
        <div className="wk-money-card">
          <span>This week</span>
          <strong>{inr(earnings.week)}</strong>
          <small>Mon–Sun</small>
        </div>
        <div className={`wk-money-card${Number(earnings.dues) > 0 ? " wk-money-card--warn" : ""}`}>
          <span>Fees due</span>
          <strong>{inr(earnings.dues)}</strong>
          <small>{isPremium ? "Pro — zero fees" : "Clear to keep accepting jobs"}</small>
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
              <strong>Zero fees with Pro</strong>
              <p>Keep every rupee, get priority job placement and a verified Pro badge.</p>
              <button
                type="button"
                className="wk-btn wk-btn--primary"
                onClick={onUpgrade}
              >
                <Crown size={16} /> Upgrade
              </button>
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
            <p className="wk-eyebrow">Fees</p>
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
                  <strong>{commission.service || "Job fees"}</strong>
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
                    <button type="button" onClick={() => onFees(commission)}>
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
            <strong>No fees due</strong>
            <p>Your account is clear. Keep accepting jobs.</p>
          </div>
        )}

        <div className="wk-pay-instructions">
          <div>
            <p className="wk-eyebrow">How to pay</p>
            <p>
              Pay securely through Razorpay. Fees clears and new jobs unlock
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
  const { refreshClaims, refreshProfile } = useAuth();
  const photoInputRef = useRef(null);
  const [form, setForm] = useState({
    name: worker.name || "",
    phone: worker.phone || "",
    serviceKey: worker.serviceKey || "",
    service: worker.service || "",
    pricePerWork: worker.pricePerWork || "",
    bio: worker.bio || "",
    upiId: worker.upiId || "",
  });
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [photoPath, setPhotoPath] = useState(worker.photoPath || "");
  const [coords, setCoords] = useState(
    worker.lat && worker.lng ? { lat: worker.lat, lng: worker.lng } : null,
  );
  const [place, setPlace] = useState({
    city: worker.city || worker.cityName || "",
    areaName: worker.areaName || "",
    state: worker.state || worker.stateName || "",
  });

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
    setSaving(true);
    try {
      const service = services.find((item) => item.key === form.serviceKey);
      const areaLabel = [place.areaName, place.city].filter(Boolean).join(", ");
      await api.patch("/worker/profile", {
        name: form.name.trim(),
        ...(form.phone ? { phone: form.phone } : {}),
        service: service?.name || form.service || SERVICE_META[form.serviceKey]?.name || form.service,
        serviceKey: form.serviceKey,
        ...(areaLabel ? { area: areaLabel } : {}),
        ...(place.city ? { city: place.city } : {}),
        ...(place.state ? { state: place.state } : {}),
        ...(place.areaName ? { areaName: place.areaName } : {}),
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
    if (!navigator.geolocation) {
      toast.error("This browser does not support device location.");
      return;
    }
    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      const nextCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setCoords(nextCoords);

      try {
        const result = await api.get(
          `/public/reverse-geocode?lat=${nextCoords.lat}&lng=${nextCoords.lng}`,
        );
        const address = result.address || {};
        const city = address.city || address.district || place.city || "";
        const areaName =
          address.locality ||
          (address.district && address.district !== city ? address.district : "") ||
          place.areaName ||
          "";
        const state = address.state || place.state || "";
        setPlace({ city, areaName, state });
        const resolved = [areaName, city, state].filter(Boolean).join(", ");
        toast.success(
          resolved
            ? `Location found: ${resolved}. Confirm and save.`
            : "Location pinned. Confirm and save to apply it.",
        );
      } catch {
        toast.info(
          "Location pinned, but City and Area could not be detected. Try Update Location again.",
        );
      }
    } catch (error) {
      const messages = {
        1: "Location permission was denied. Allow location access in your browser, then try again.",
        2: "Your location is unavailable right now. Check device location settings and try again.",
        3: "Location request timed out. Move to an open area and try again.",
      };
      toast.error(messages[error?.code] || "Could not access device location. Try again.");
    } finally {
      setLocating(false);
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG or WEBP photo.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Choose a photo smaller than 15 MB.");
      return;
    }

    setPhotoSaving(true);
    try {
      const compressed = await compressImage(file, { maxSize: 900, quality: 0.8 });
      if (compressed.size > 4 * 1024 * 1024) {
        throw new Error("This photo is still too large after compression. Choose a smaller image.");
      }
      const formData = new FormData();
      formData.append("image", compressed);
      const result = await api.upload("/auth/avatar", formData);
      setPhotoPath(result.photoPath || "");
      try {
        await Promise.all([refreshProfile(), refreshClaims()]);
      } catch {
        toast.info("Photo uploaded. Your profile details may take a moment to refresh.");
        return;
      }
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error.message || "Could not upload your profile photo.");
    } finally {
      setPhotoSaving(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
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
            <div className="wk-avatar-upload">
              <Avatar
                name={worker.name}
                path={photoPath || worker.photoPath}
                size={78}
                ring={worker.isPremium}
              />
              <input
                ref={photoInputRef}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Choose a profile photo"
                onChange={(event) => uploadPhoto(event.target.files?.[0])}
              />
              <button
                type="button"
                className="wk-chip-btn"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoSaving}
              >
                {photoSaving ? <Spinner size={14} /> : <Pencil size={14} />}
                {photoSaving ? "Uploading…" : "Update photo"}
              </button>
            </div>
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

            <div className="wk-location-card">
              <span className="wk-location-card__icon">
                <MapPin size={18} />
              </span>
              <div className="wk-location-card__copy">
                <p className="wk-eyebrow">Service location</p>
                <strong>
                  {[place.areaName, place.city, place.state].filter(Boolean).join(", ") ||
                    "Location not set"}
                </strong>
                <span>
                  {coords
                    ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} · confirm before saving`
                    : "Use your device location to receive nearby jobs."}
                </span>
              </div>
              <button
                type="button"
                className="wk-chip-btn"
                onClick={capture}
                disabled={locating}
              >
                {locating ? <Spinner size={14} /> : <Crosshair size={14} />}
                {locating ? "Finding…" : "Update Location"}
              </button>
            </div>
            <p className="wk-fineprint">
              We read your device location once and use it for nearby dispatch.
              No manual service-area entry is needed.
            </p>

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
          <Link to="/worker/support" className="wk-btn wk-btn--outline">
            <Phone size={15} /> Support
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
        Fees is {workerFeePct(settings)}% on completed non-premium jobs.
        Pro members pay 0%.
      </p>
    </>
  );
}

/* --------------------------------- Modals --------------------------------- */

function PriceModal({ job, settings, isPremium, busy, onClose, onSubmit }) {
  const [price, setPrice] = useState(
    String(job?.pricing?.workerPrice || job?.budget || ""),
  );
  const [error, setError] = useState("");

  const amount = Number(price) || 0;
  const commission = isPremium ? 0 : Math.round((amount * (workerFeePct(settings))) / 100);

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
            <span>Fees</span>
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
          Collect payment directly from the customer by cash or UPI. EasyHome fees are
          recorded separately.
        </p>
      </div>
    </Modal>
  );
}

function FeesModal({ commission, onClose, onPaid }) {
  return (
    <Modal
      open={Boolean(commission)}
      onClose={onClose}
      title="Pay fees"
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
            description={`EasyHome fees · ${commission.service || "Job"}`}
            orderEndpoint="/payment/commission/order"
            verifyEndpoint="/payment/commission/verify"
            orderBody={{ commissionId: commission.id }}
            onSuccess={onPaid}
            buttonLabel="Pay & clear fees"
          />
        ) : null}
        <p className="tiny muted">
          Verified automatically. EasyHome never sees your card or UPI credentials.
        </p>
      </div>
    </Modal>
  );
}
