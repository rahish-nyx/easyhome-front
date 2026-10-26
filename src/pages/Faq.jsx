import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ChevronDown,
  CreditCard,
  Headphones,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { usePageMeta } from "../lib/usePageMeta";
import { Card, SectionHeader } from "../components/ui";

const GROUPS = [
  {
    title: "Booking a service",
    icon: CalendarCheck,
    items: [
      {
        q: "How do I book a professional?",
        a: "Choose a service, describe the job, set your budget and pin your area. Your request goes only to approved professionals in your city and local service area. The first pro to accept takes ownership of the booking.",
      },
      {
        q: "When do I pay?",
        a: "You pay the professional directly after the work is completed. No advance payment is taken by EasyHome. The final price is agreed in the app before any work starts.",
      },
      {
        q: "Can I choose a specific professional?",
        a: "Yes. When a professional’s profile is available in your area, use the Book button on their profile. The request is sent to them first and then continues to other matching pros if they cannot take it.",
      },
      {
        q: "What if I need help urgently?",
        a: "Choose the Urgent option when booking. Urgent requests get priority dispatch and include a 10% urgent fee. Active EasyHome Pro customers pay no urgent fee, and their requests are matched first. Free cancellation is available for 20 minutes for Pro members and 7 minutes for everyone else, enforced from the time the booking is created.",
      },
    ],
  },
  {
    title: "Location and availability",
    icon: MapPin,
    items: [
      {
        q: "Why can’t I see professionals near me?",
        a: "We only show approved professionals who are online in your exact city and local area. If nobody is available right now, create a booking anyway and matching continues in the background.",
      },
      {
        q: "My area is not listed. What can I do?",
        a: "Use “Use my current location” or choose the nearest active district. If we do not serve your area yet, you can join the waitlist and we will notify you when we expand.",
      },
      {
        q: "Do professionals travel across cities?",
        a: "No. Job alerts and job cards are limited to the professional’s registered city and local area. This keeps arrival times realistic and protects both sides.",
      },
    ],
  },
  {
    title: "Payments and membership",
    icon: CreditCard,
    items: [
      {
        q: "How does EasyHome membership work?",
        a: "Membership is an optional paid plan for customers. Active Pro members get priority worker matching, no 10% urgent fee, 24×7 priority support, a 20-minute free cancellation window instead of 7 minutes, and a Verified Pro badge. All benefits apply only while the membership is active.",
      },
      {
        q: "How do professionals pay commission?",
        a: "Professionals pay a small commission on completed non-premium jobs. Pro members pay 0% commission. Commission payments are verified before new jobs unlock.",
      },
      {
        q: "Is my payment information safe?",
        a: "Card and UPI payments are processed by Razorpay. EasyHome does not store your full card details. Service payments are made directly to the professional after completion.",
      },
    ],
  },
  {
    title: "Safety and verification",
    icon: ShieldCheck,
    items: [
      {
        q: "Are professionals verified?",
        a: "Every professional is reviewed and approved before appearing in search. KYC documents are sent only to a private admin channel; they are never shown publicly or stored in the app database.",
      },
      {
        q: "What should I do if something goes wrong?",
        a: "Do not confirm payment if the work is materially different from what was agreed. Open Help & support in the app and include your booking reference. We step in for every confirmed booking.",
      },
      {
        q: "Can I share my phone number with the professional?",
        a: "Contact details unlock in the app only after the price is confirmed. Keep communication inside EasyHome so support can help if there is a dispute.",
      },
    ],
  },
];

export default function Faq() {
  usePageMeta(
    "Frequently asked questions",
    "Answers about booking, location coverage, payments, membership and professional verification on EasyHome.",
  );

  return (
    <div className="page page--narrow" style={{ maxWidth: 980 }}>
      <div className="faq-hero">
        <span className="faq-hero__icon">
          <Headphones size={24} />
        </span>
        <div>
          <p className="eyebrow">EasyHome help centre</p>
          <h1>Questions, answered.</h1>
          <p>
            Everything you need to know about booking, coverage, payments and
            working with EasyHome. Still stuck? Support is one tap away.
          </p>
        </div>
        <Link to="/chat" className="btn btn--primary">
          Ask support <ArrowRight size={15} />
        </Link>
      </div>

      <div className="faq-groups">
        {GROUPS.map((group) => {
          const GroupIcon = group.icon;
          return (
            <section className="faq-group" key={group.title}>
              <SectionHeader
                eyebrow="Help centre"
                title={group.title}
                action={
                  <span className="faq-group__icon">
                    <GroupIcon size={19} />
                  </span>
                }
              />
              <div className="faq-list">
                {group.items.map((item) => (
                  <details className="faq-item" key={item.q}>
                    <summary>
                      <span>{item.q}</span>
                      <ChevronDown size={17} />
                    </summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Card
        className="card--pad"
        style={{
          marginTop: 26,
          background: "var(--ink)",
          color: "#fff",
          borderColor: "transparent",
        }}
      >
        <div className="row row--between row--wrap" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 12 }}>
            <span className="faq-hero__icon" style={{ background: "rgba(255,255,255,.1)" }}>
              <Sparkles size={21} />
            </span>
            <div>
              <strong style={{ fontSize: 15 }}>Ready to get started?</strong>
              <p style={{ color: "rgba(255,255,255,.65)", fontSize: 13, marginTop: 3 }}>
                Book a verified pro or apply to work with EasyHome.
              </p>
            </div>
          </div>
          <div className="row row--wrap" style={{ gap: 8 }}>
            <Link to="/book" className="btn btn--primary btn--sm">
              <CalendarCheck size={14} /> Book a service
            </Link>
            <Link to="/auth?role=worker&mode=signup" className="btn btn--ghost btn--sm" style={{ color: "#fff" }}>
              <Users size={14} /> Join as a pro
            </Link>
          </div>
        </div>
      </Card>

      <div className="faq-trust">
        <span>
          <BadgeCheck size={14} /> Verified professionals
        </span>
        <span>
          <ShieldCheck size={14} /> Private KYC
        </span>
        <span>
          <CreditCard size={14} /> Secure Razorpay payments
        </span>
      </div>
    </div>
  );
}
