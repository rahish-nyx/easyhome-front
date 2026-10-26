import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ClipboardCheck,
  Copy,
  Gift,
  Link2,
  Share2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";
import { Badge, Button, Card, SectionHeader } from "../components/ui";

const HOW_IT_WORKS = [
  {
    icon: Share2,
    title: "Share your link or code",
    body: "Send your unique EasyHome referral link to a friend who has never used EasyHome.",
  },
  {
    icon: UserPlus,
    title: "Your friend signs up",
    body: "They create a new customer account using your link or enter your code at sign-up.",
  },
  {
    icon: ClipboardCheck,
    title: "They complete their first service",
    body: "The referral unlocks for review only after their first service is completed.",
  },
  {
    icon: ShieldCheck,
    title: "Our admin team verifies it",
    body: "We check the referral for genuine activity, duplicates and fraud before approval.",
  },
  {
    icon: Gift,
    title: "₹51 each after approval",
    body: "Once approved, ₹51 is processed for you and ₹51 for your friend. Rewards are never auto-credited.",
  },
];

const RULES = [
  "₹51 is approved for you and ₹51 is approved for your friend after the referral is verified.",
  "Referral rewards are not credited automatically to any wallet.",
  "Every referral is tracked in the admin console and reviewed by the EasyHome admin team.",
  "Only new users can be referred. Existing EasyHome accounts cannot claim a referral.",
  "The referred friend must complete their first service before the referral can be approved.",
  "Self-referrals, duplicate accounts, fake bookings and fraudulent referrals are not allowed and will be rejected.",
  "The admin team is notified when a friend signs up and when their first service is completed.",
  "The admin's final approval is required before any reward is processed.",
];

const INCOMING_META = {
  pending: {
    label: "Awaiting your first service",
    tone: "amber",
    hint: "Complete your first EasyHome service to unlock your ₹51 welcome reward.",
  },
  service_completed: {
    label: "Under admin review",
    tone: "blue",
    hint: "Your first service is complete. The admin team is verifying this referral.",
  },
  approved: {
    label: "Approved",
    tone: "green",
    hint: "Approved by admin. Your reward is processed separately — never auto-credited.",
  },
  rejected: {
    label: "Not approved",
    tone: "red",
    hint: "This welcome referral did not pass verification. Contact support if you need help.",
  },
};

const STATUS_META = {
  pending: {
    label: "Awaiting first service",
    tone: "amber",
    hint: "Your friend needs to complete their first service.",
  },
  service_completed: {
    label: "Under admin review",
    tone: "blue",
    hint: "First service completed. Our team is verifying the referral.",
  },
  approved: {
    label: "Approved",
    tone: "green",
    hint: "Approved by admin. The reward is processed separately — never auto-credited.",
  },
  rejected: {
    label: "Rejected",
    tone: "red",
    hint: "This referral did not pass verification.",
  },
};

function statusFor(status) {
  return STATUS_META[status] || STATUS_META.pending;
}

export default function Refer() {
  usePageMeta(
    "Refer & Earn — EasyHome",
    "Share EasyHome with a friend. After their first completed service and admin verification, ₹51 is approved for each of you.",
  );

  const { fbUser, isWorker, loading: authLoading } = useAuth();
  const toast = useToast();
  const [state, setState] = useState({ loading: false, data: null, error: "" });
  const [copied, setCopied] = useState("");

  const canRefer = Boolean(fbUser) && !isWorker;
  const code = state.data?.code || "";
  const shareUrl = useMemo(() => {
    if (!code || typeof window === "undefined") return "";
    return `${window.location.origin}/auth?mode=signup&role=customer&ref=${encodeURIComponent(code)}`;
  }, [code]);

  const load = useCallback(async () => {
    if (!canRefer) return;
    setState((current) => ({ ...current, loading: !current.data }));
    try {
      const data = await api.get("/referrals/me");
      setState({ loading: false, data, error: "" });
    } catch (error) {
      setState({ loading: false, data: null, error: error.message });
    }
  }, [canRefer]);

  useEffect(() => {
    if (!canRefer) {
      setState({ loading: false, data: null, error: "" });
      return undefined;
    }
    load();
    const timer = window.setInterval(() => load(), 15000);
    return () => window.clearInterval(timer);
  }, [canRefer, load]);

  const copyText = async (text, label) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Copy failed. Press and hold to copy manually.");
    }
  };

  const share = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join EasyHome and get ₹51",
          text: "Use my EasyHome referral code. After your first completed service and admin verification, we each get ₹51 approved.",
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    await copyText(shareUrl, "Referral link");
  };

  const stats = state.data?.stats || {};
  const referrals = state.data?.referrals || [];
  const incoming = state.data?.incoming || null;
  const incomingMeta = incoming
    ? INCOMING_META[incoming.status] || INCOMING_META.pending
    : null;

  return (
    <div className="page refer-page">
      <section className="refer-hero">
        <div className="refer-hero__copy">
          <Badge tone="yellow">
            <Sparkles size={12} /> Refer & Earn
          </Badge>
          <h1>
            Give ₹51.
            <br />
            Get ₹51.
          </h1>
          <p>
            Share EasyHome with a friend. When they join and complete their
            first service, our admin team verifies the referral and approves
            ₹51 for each of you.
          </p>
          <div className="refer-hero__actions">
            {canRefer ? (
              <Button
                type="button"
                onClick={share}
                disabled={!shareUrl}
                icon={Share2}
              >
                Share your referral
              </Button>
            ) : (
              <Link
                to="/auth?mode=signup&role=customer"
                className="btn btn--primary"
              >
                Sign up to refer <ArrowRight size={16} />
              </Link>
            )}
            <a href="#refer-rules" className="btn btn--ghost">
              Read the rules
            </a>
          </div>
        </div>
        <div className="refer-hero__reward" aria-label="Reward breakdown">
          <div className="refer-reward__row">
            <span className="refer-reward__icon">
              <Users size={18} />
            </span>
            <div>
              <small>You receive</small>
              <strong>₹51</strong>
            </div>
          </div>
          <div className="refer-reward__plus">+</div>
          <div className="refer-reward__row">
            <span className="refer-reward__icon refer-reward__icon--friend">
              <UserPlus size={18} />
            </span>
            <div>
              <small>Your friend receives</small>
              <strong>₹51</strong>
            </div>
          </div>
          <div className="refer-reward__total">
            <span>Total approved per verified referral</span>
            <strong>₹102</strong>
          </div>
          <p className="refer-reward__note">
            <ShieldCheck size={13} /> Approved only after first service
            completion and admin verification. No automatic wallet credit.
          </p>
        </div>
      </section>

      {canRefer ? (
        <Card className="refer-share">
          <div className="refer-share__head">
            <div>
              <p className="eyebrow">Your referral link</p>
              <h2>Share it with a friend</h2>
              <p className="small muted">
                Your friend must be new to EasyHome and sign up with this link
                or code.
              </p>
            </div>
            <Badge tone={state.data?.code ? "green" : "outline"} dot>
              {state.data?.code ? "Active" : state.loading ? "Preparing…" : "Unavailable"}
            </Badge>
          </div>

          {state.error ? (
            <div className="notice notice--danger" style={{ marginTop: 14 }}>
              <p>{state.error}</p>
              <Button type="button" variant="ghost" size="sm" onClick={load}>
                Try again
              </Button>
            </div>
          ) : null}

          <div className="refer-share__grid">
            <div className="refer-field">
              <span className="refer-field__label">Your code</span>
              <div className="refer-field__value">
                <strong>{code || "— — — — — —"}</strong>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyText(code, "Code")}
                  disabled={!code}
                  icon={Copy}
                >
                  {copied === "Code" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="refer-field refer-field--link">
              <span className="refer-field__label">Your link</span>
              <div className="refer-field__value">
                <span>{shareUrl || "Preparing your link…"}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyText(shareUrl, "Referral link")}
                  disabled={!shareUrl}
                  icon={Link2}
                >
                  {copied === "Referral link" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </div>

          <div className="refer-share__actions">
            <Button type="button" onClick={share} disabled={!shareUrl} icon={Share2}>
              Share link
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => copyText(code, "Code")}
              disabled={!code}
              icon={Copy}
            >
              Copy code
            </Button>
            <span className="refer-share__hint">
              <Wallet size={14} /> Rewards are approved manually. They are not
              auto-credited to a wallet.
            </span>
          </div>
        </Card>
      ) : (
        <Card className="refer-signin">
          <div className="refer-signin__icon">
            <Gift size={26} />
          </div>
          <div>
            <h2>{authLoading ? "Loading your account…" : "Sign in to get your code"}</h2>
            <p className="small muted">
              {isWorker
                ? "Refer & Earn is available to customer accounts. Switch to a customer account to share a referral link."
                : "Create a free customer account to get a unique referral link and track every referral from one place."}
            </p>
          </div>
          {!isWorker && !authLoading ? (
            <Link to="/auth?mode=signup&role=customer" className="btn btn--primary">
              Create an account <ArrowRight size={15} />
            </Link>
          ) : null}
        </Card>
      )}

      {incoming && incomingMeta ? (
        <Card className="refer-incoming">
          <span className="refer-incoming__icon">
            <Gift size={21} />
          </span>
          <div className="refer-incoming__body">
            <p className="eyebrow">Your welcome referral</p>
            <h2>Referred by {incoming.referrerName}</h2>
            <p className="small muted">{incomingMeta.hint}</p>
          </div>
          <div className="refer-incoming__meta">
            <Badge tone={incomingMeta.tone}>{incomingMeta.label}</Badge>
            <small>₹{incoming.rewardAmount || 51} welcome reward</small>
          </div>
        </Card>
      ) : null}

      <section className="refer-section">
        <SectionHeader
          title="How it works"
          subtitle="Five steps from a shared link to an approved reward."
        />
        <div className="refer-steps">
          {HOW_IT_WORKS.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className="refer-step" key={step.title}>
                <span className="refer-step__number">{index + 1}</span>
                <span className="refer-step__icon">
                  <Icon size={19} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      {canRefer ? (
        <section className="refer-section">
          <SectionHeader
            title="Your referrals"
            subtitle="Track every friend from sign-up to final admin approval."
            action={
              <Badge tone="outline">
                <Check size={12} /> Updates every 15 seconds
              </Badge>
            }
          />
          <div className="refer-stats">
            <div>
              <small>Total referrals</small>
              <strong>{stats.total || 0}</strong>
            </div>
            <div>
              <small>Awaiting first service</small>
              <strong>{stats.pending || 0}</strong>
            </div>
            <div>
              <small>Under review</small>
              <strong>{stats.awaitingVerification || 0}</strong>
            </div>
            <div>
              <small>Approved</small>
              <strong>{stats.approved || 0}</strong>
            </div>
            <div>
              <small>Approved rewards</small>
              <strong>₹{stats.approvedRewards || 0}</strong>
            </div>
          </div>

          <div className="refer-history">
            {referrals.length ? (
              referrals.map((item) => {
                const meta = statusFor(item.status);
                return (
                  <article className="refer-history__item" key={item.id}>
                    <span className="refer-history__icon">
                      <Users size={18} />
                    </span>
                    <div className="refer-history__body">
                      <strong>{item.referredName || "Your friend"}</strong>
                      <small>
                        Referred {item.createdAt ? formatDate(item.createdAt) : "recently"}
                      </small>
                      <p>{meta.hint}</p>
                    </div>
                    <div className="refer-history__meta">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <small>₹{item.rewardAmount || 51}</small>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="refer-empty">
                <BadgeCheck size={26} />
                <h3>No referrals yet</h3>
                <p className="small muted">
                  Share your link with a friend who has never used EasyHome.
                  Your first referral will appear here as soon as they sign up.
                </p>
                <Button
                  type="button"
                  onClick={share}
                  disabled={!shareUrl}
                  icon={Share2}
                >
                  Share your link
                </Button>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="refer-section" id="refer-rules">
        <SectionHeader
          title="Rules & Guidelines"
          subtitle="Please read these before sharing your referral link."
        />
        <div className="refer-rules">
          <div className="refer-rules__list">
            {RULES.map((rule) => (
              <div className="refer-rule" key={rule}>
                <span className="refer-rule__check">
                  <Check size={13} />
                </span>
                <p>{rule}</p>
              </div>
            ))}
          </div>
          <div className="refer-rules__note">
            <ShieldCheck size={22} />
            <h3>Admin approval is final</h3>
            <p>
              EasyHome reviews every referral. Self-referrals, duplicate
              accounts, fake bookings and fraud are rejected. The admin team's
              final approval is required before any reward is processed.
            </p>
            <p className="tiny muted">
              Rewards are approved manually after verification and are not
              credited automatically. EasyHome may update these rules to
              prevent abuse.
            </p>
          </div>
        </div>
      </section>

      <section className="refer-cta">
        <div>
          <h2>Know someone who needs a trusted pro?</h2>
          <p>
            Share EasyHome. Help a friend book their first service — and get
            rewarded when it is verified.
          </p>
        </div>
        <Link to="/services" className="btn btn--primary">
          Browse services <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}
