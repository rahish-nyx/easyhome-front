import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ExternalLink,
  Headphones,
  Sparkles,
  Timer,
  Wallet,
  Zap,
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
    "Active priority worker matching, no urgent-job extra charge, 24×7 priority support and a 20-minute free cancellation window with EasyHome Pro.",
  );

  const { profile, isWorker, premiumUntil, refreshProfile } = useAuth();
  const { settings } = useCatalogue();
  const toast = useToast();
  const [plan, setPlan] = useState("monthly");

  const monthly = Number(settings.subscriptionPrice) || 199;
  const plans = PLANS.map((item) => ({
    ...item,
    amount:
      item.id === "quarterly"
        ? Math.round(monthly * 3 * 0.9)
        : item.id === "yearly"
          ? Math.round(monthly * 12 * 0.8)
          : monthly,
    perMonth:
      item.id === "quarterly"
        ? Math.round((monthly * 3 * 0.9) / 3)
        : item.id === "yearly"
          ? Math.round((monthly * 12 * 0.8) / 12)
          : monthly,
  }));
  const selected = plans.find((item) => item.id === plan) || plans[0];
  const benefits = isWorker
    ? settings.workerBenefits || []
    : settings.customerBenefits || [];
  const active = isActiveUntil(premiumUntil || profile?.subscription?.endAt);

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
              ? "Zero commission, priority job placement and a verified Pro badge."
              : "Active priority matching, no urgent-job extra charge, 24×7 priority support and a 20-minute free cancellation window."}
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
                  ? "You keep 100% of every job payment while Pro is active."
                  : "Active priority worker matching, no urgent-job extra charge and 24×7 priority support are live on your account."}
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
              <strong>{isWorker ? "0%" : "Priority"}</strong>
              <small>{isWorker ? "Commission" : "Support"}</small>
            </div>
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
              {[
                {
                  icon: Zap,
                  title: "Active priority worker matching",
                  body: "Your requests are dispatched to top-rated pros first while Pro is active.",
                },
                {
                  icon: Wallet,
                  title: "No urgent-job extra charge",
                  body: "Urgent bookings cost the same as normal — we waive the 10% extra fee.",
                },
                {
                  icon: Headphones,
                  title: "24×7 priority support",
                  body: "Pro support chats are flagged and answered first, day or night.",
                },
                {
                  icon: Timer,
                  title: "20-minute free cancellation",
                  body: "Cancel free within 20 minutes. Free accounts get 7 minutes.",
                },
                {
                  icon: BadgeCheck,
                  title: "Verified Pro badge",
                  body: "Your active Pro badge appears on your profile and bookings.",
                },
              ].map((item) => (
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
