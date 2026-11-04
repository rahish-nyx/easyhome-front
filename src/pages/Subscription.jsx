import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ExternalLink,
  Headphones,
  Layers,
  LayoutDashboard,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Timer,
  Wallet,
  Zap,
  QrCode,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useToast } from "../context/ToastContext";
import {
  daysLeft,
  formatDate,
  inr,
  isActiveUntil,
  planLabel,
} from "../lib/format";
import { PLANS } from "../lib/constants";
import { rolePlans } from "../lib/plans";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Badge,
  Card,
  SectionHeader,
} from "../components/ui";
import RazorpayPayment from "../components/RazorpayPayment";

export default function Subscription() {
  usePageMeta(
    "EasyHome Pro membership",
    "Accidental damage assistance up to ₹500, priority worker matching, no urgent-job extra charge, exclusive Pro badge, 15-day service warranty, monthly Pro promo codes and priority re-assignment with EasyHome Pro.",
  );

  const { profile, isWorker, premiumUntil, refreshProfile } = useAuth();
  const { settings } = useCatalogue();
  const toast = useToast();
  const [plan, setPlan] = useState("monthly");

  const role = isWorker ? "worker" : "customer";
  const prices = rolePlans(settings, role);
  const monthly = prices.monthly;
  const plans = PLANS.map((item) => {
    const amount = prices[item.id] ?? monthly;
    return {
      ...item,
      amount,
      perMonth: Math.round(amount / item.months),
    };
  });
  const selected = plans.find((item) => item.id === plan) || plans[0];
  const benefits = isWorker
    ? settings.workerBenefits || []
    : settings.customerBenefits || [];
  const active = isActiveUntil(premiumUntil || profile?.subscription?.endAt);
  const reasons = isWorker
    ? [
        {
          icon: ShieldCheck,
          title: "Zero dues penalty & uninterrupted work guarantee",
          body: "No platform dues or account locks interrupt your workflow under the standard clearance cycle.",
        },
        {
          icon: Wallet,
          title: "Lower commission rate (7%)",
          body: "Keep a larger share of every job — the discounted 7% Pro commission rate instead of the standard 10%.",
        },
        {
          icon: Search,
          title: "Local search visibility boost",
          body: "Your profile gets prioritized ranking and higher placement in local customer search results.",
        },
        {
          icon: Zap,
          title: "Priority urgent job alerts",
          body: "You get instant, first-access notifications for high-value urgent service requests in your zone.",
        },
        {
          icon: QrCode,
          title: "Pro trust badge, digital QR code & shareable profile",
          body: "Build instant customer trust with the exclusive Pro badge, professional digital QR code and shareable profile.",
        },
        {
          icon: Layers,
          title: "Multi-service category unlock",
          body: "Unlock 2 additional optional service categories for free and maximize the types of work you can take on.",
        },
        {
          icon: LayoutDashboard,
          title: "Top priority featured profile card visibility",
          body: "Your profile card is showcased on the customer home feed for maximum local exposure and instant booking.",
        },
      ]
    : [
        {
          icon: ShieldCheck,
          title: "Accidental damage assistance up to ₹500",
          body: "Eligible Pro customers receive accidental damage assistance of up to ₹500 subject to eligibility rules.",
        },
        {
          icon: Zap,
          title: "Active priority worker matching",
          body: "Your requests are dispatched to eligible, available professionals in your service area first.",
        },
        {
          icon: Wallet,
          title: "No 10% urgent-job extra charge",
          body: "Urgent bookings cost the same as normal — the extra fee is waived for Pro customers.",
        },
        {
          icon: BadgeCheck,
          title: "Exclusive EasyHome Pro badge",
          body: "Your active Pro badge appears on your profile and relevant platform sections.",
        },
        {
          icon: BadgeCheck,
          title: "Extended 15-day service work warranty",
          body: "All completed Pro jobs carry an extended 15-day service warranty for total peace of mind.",
        },
        {
          icon: Ticket,
          title: "Monthly Pro promo codes (up to 20% off)",
          body: "Two exclusive discount promo codes every month offering up to 20% off on service bookings.",
        },
        {
          icon: RefreshCw,
          title: "Priority re-assignment & VIP dispatch",
          body: "Instant priority re-matching and fast-tracked worker assignment if your professional is unavailable.",
        },
      ];

  const onPaid = async () => {
    await refreshProfile();
    toast.success("Payment successful. Your Pro membership is active.");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{isWorker ? "EasyHome Pro · workers" : "EasyHome Pro"}</p>
          <h1>{active ? "Your membership" : "A little more peace of mind."}</h1>
          <p>
            {isWorker
              ? "Zero dues penalty, lower 7% commission rate and priority access to jobs."
              : "Accidental damage assistance, priority matching, no urgent-job extra charge and exclusive Pro benefits."}
          </p>
        </div>
        {active ? (
          <Badge tone="yellow">
            <BadgeCheck size={12} /> Verified Pro · until{" "}
            {formatDate(premiumUntil || profile?.subscription?.endAt)}
          </Badge>
        ) : (
          <Badge tone="outline">Free account</Badge>
        )}
      </div>

      {active ? (
        <div className="sub-card" style={{ marginBottom: 24 }}>
          <div className="row row--between row--wrap" style={{ gap: 12 }}>
            <div>
              <p className="eyebrow" style={{ color: "rgba(255,255,255,.55)" }}>
                Current plan
              </p>
              <h3>{planLabel(profile?.subscription?.plan)}</h3>
              <p>
                {isWorker
                  ? "You keep a larger share of every job — the discounted 7% Pro commission rate — while Pro is active."
                  : "Accidental damage assistance, priority worker matching, no urgent-job extra charge, exclusive Pro badge and VIP dispatch are live on your account."}
              </p>
            </div>
            <span
              className="badge"
              style={{ background: "var(--yellow)", color: "var(--ink)", alignSelf: "flex-start" }}
            >
              <CheckCircle2 size={12} /> {daysLeft(premiumUntil || profile?.subscription?.endAt)} days left
            </span>
          </div>
          <div className="sub-card__meta">
            <div>
              <strong>{inr(profile?.subscription?.amount || monthly)}</strong>
              <small>Paid amount</small>
            </div>
            <div>
              <strong>{formatDate(profile?.subscription?.startAt)}</strong>
              <small>Started</small>
            </div>
            <div>
              <strong>{formatDate(profile?.subscription?.endAt)}</strong>
              <small>Ends</small>
            </div>
            <div>
              <strong>{isWorker ? "7%" : "Priority"}</strong>
              <small>{isWorker ? "Commission" : "Support"}</small>
            </div>
          </div>

          <div
            className="row row--between row--wrap"
            style={{ gap: 12, marginTop: 14, alignItems: "flex-start" }}
          >
            <div>
              <p className="eyebrow" style={{ color: "rgba(255,255,255,.55)" }}>
                Exclusive renewal reward
              </p>
              <h3>3% off your next Pro purchase</h3>
              <p className="tiny muted" style={{ marginTop: 4 }}>
                {Number(profile?.subscription?.renewalStreak || 0) > 0
                  ? "Renew uninterrupted to keep the exclusive 3% continuous renewal reward on your next membership purchase."
                  : "Complete your first renewal to unlock the exclusive 3% continuous renewal reward."}
              </p>
              {profile?.subscription?.endAt ? (
                <p className="tiny muted" style={{ marginTop: 4 }}>
                  Grace period until {formatDate(new Date(new Date(profile.subscription.endAt).getTime() + (settings.renewalGraceDays || 5) * 86400000))}
                </p>
              ) : null}
            </div>
            <span
              className="badge"
              style={{ background: "var(--yellow)", color: "var(--ink)", alignSelf: "flex-start" }}
            >
              <CheckCircle2 size={12} />{" "}
              {Number(profile?.subscription?.renewalStreak || 0) > 0
                ? "Reward eligible"
                : "Reward pending renewal"}
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid grid--2" style={{ alignItems: "start" }}>
        <Card className="card--pad">
          <SectionHeader
            eyebrow="Membership"
            title={active ? "Plan options" : "Choose your plan"}
            subtitle="All plans include the full Pro benefits. No auto-renewal — your plan ends on the date shown."
          />

          <div className="plan-grid plan-grid--stack">
            {plans.map((item) => {
              const selectedPlan = plan === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`plan-card${selectedPlan ? " is-active" : ""}`}
                  onClick={() => setPlan(item.id)}
                  aria-pressed={selectedPlan}
                >
                  <span className="plan-card__radio" aria-hidden="true">
                    {selectedPlan ? <Check size={13} /> : null}
                  </span>
                  <span className="plan-card__body">
                    <span className="plan-card__title-row">
                      <strong>{item.label}</strong>
                      {item.badge ? (
                        <span className="plan-card__badge">{item.badge}</span>
                      ) : null}
                    </span>
                    <span className="plan-card__sub">{item.blurb}</span>
                  </span>
                  <span className="plan-card__amount">
                    <span className="plan-card__price">{inr(item.amount)}</span>
                    <span className="plan-card__sub">
                      {item.id === "monthly" ? "per month" : `${inr(item.perMonth)}/mo`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Included with Pro</h3>
            <ul className="benefit-list">
              {benefits.map((benefit) => (
                <li key={benefit}>
                  <CheckCircle2 size={16} /> {benefit}
                </li>
              ))}
            </ul>
          </div>

        </Card>

        <div className="stack">
          {!active ? (
            <Card className="card--pad">
              <SectionHeader
                eyebrow="Secure checkout"
                title="Activate Pro instantly"
                subtitle={`${selected.label} · ${selected.months} month${selected.months > 1 ? "s" : ""} · ${inr(selected.amount)}`}
              />
              <RazorpayPayment
                amount={selected.amount}
                description={`EasyHome Pro · ${selected.label}`}
                orderEndpoint="/payment/subscription/order"
                verifyEndpoint="/payment/subscription/verify"
                orderBody={{ plan: selected.id }}
                onSuccess={onPaid}
                buttonLabel={`Pay ${inr(selected.amount)} & activate`}
              />
              <p className="tiny muted" style={{ marginTop: 10 }}>
                No auto-renewal. Your plan simply ends on the date shown. We never charge your
                card automatically.
              </p>
            </Card>
          ) : null}

          <Card className="card--pad">
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>Why members stay</h3>
            <div className="stack stack--sm">
              {reasons.map((item) => (
                <div className="row" style={{ gap: 11, alignItems: "flex-start" }} key={item.title}>
                  <span className="stat__icon">
                    <item.icon size={17} />
                  </span>
                  <div>
                    <strong style={{ fontSize: 13 }}>{item.title}</strong>
                    <p className="tiny muted">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="card--pad" style={{ background: "var(--paper-2)", borderColor: "transparent" }}>
            <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <Sparkles size={18} style={{ color: "var(--yellow-ink)", flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: 13 }}>Prefer to talk first?</strong>
                <p className="tiny muted" style={{ marginTop: 3 }}>
                  Support can explain the plans and help if a payment needs review.
                </p>
                <Link to="/chat" className="btn btn--outline btn--sm" style={{ marginTop: 10 }}>
                  Chat with support <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          </Card>

          <p className="tiny muted" style={{ textAlign: "center" }}>
            By subscribing you agree to our{" "}
            <Link to="/legal/terms" style={{ color: "var(--blue)", fontWeight: 700 }}>
              terms
            </Link>{" "}
            and{" "}
            <Link to="/legal/refunds" style={{ color: "var(--blue)", fontWeight: 700 }}>
              refund policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
