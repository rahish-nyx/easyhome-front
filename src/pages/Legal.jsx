import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Headphones,
  Lock,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { usePageMeta } from "../lib/usePageMeta";
import { Card } from "../components/ui";

const PAGES = {
  about: {
    title: "About EasyHome",
    updated: "Last updated 1 October 2026",
    intro:
      "EasyHome connects Indian homes with independent, verified service professionals. We handle discovery, matching and accountability so both sides can focus on the work.",
    sections: [
      {
        heading: "What we do",
        body: [
          "EasyHome is a local home-services platform. Customers describe a job, set a budget and receive a verified professional. Professionals choose jobs that fit their trade, area and schedule.",
          "We are not a marketplace for anonymous bidding. One approved professional takes ownership of each booking, agrees a final price in the app and completes the visit.",
        ],
      },
      {
        heading: "How verification works",
        body: [
          "Workers apply with their trade, service area and contact details. Our operations team reviews each application, and a government ID can be uploaded for identity verification.",
          "Verification is not a guarantee of outcome, but it is a real gate. Suspended, rejected and unapproved accounts are removed from public search immediately.",
        ],
      },
      {
        heading: "How we make money",
        body: [
          "Customers pay professionals directly for the service. EasyHome earns a small fee from professionals on completed, non-premium jobs and sells an optional Pro membership.",
          "Prices are always shown in the app before work begins. We do not add hidden customer-side booking fees.",
        ],
      },
      {
        heading: "Where we operate",
        body: [
          "EasyHome currently serves selected Indian cities and neighbourhoods. Availability is based on the service radius configured for each city.",
          "If we are not in your area yet, support can tell you when we expect to expand.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    updated: "Last updated 1 October 2026",
    intro:
      "These terms explain the rules for using EasyHome as a customer or professional. By creating an account or booking a service, you agree to them.",
    sections: [
      {
        heading: "Accounts",
        body: [
          "You must provide accurate information and keep your login secure. One person should use one account. You must be at least 18 years old to book or work through EasyHome.",
          "Email verification is required before a customer can create a booking. Worker accounts are additionally subject to approval.",
        ],
      },
      {
        heading: "Bookings and pricing",
        body: [
          "A booking is a request, not a confirmed contract, until an approved professional accepts it. The professional then quotes a final price. The customer may accept it or send one counter-offer.",
          "No work should begin before the final price is confirmed in the app. The customer pays the professional directly after completion. EasyHome records the payment confirmation for support and fee purposes.",
        ],
      },
      {
        heading: "Cancellations",
        body: [
          "Customers may cancel free of charge within 20 minutes of creating a booking for active EasyHome Pro members, or within 7 minutes for all other customers. This window is enforced in the app. After it closes while the job is still pending or accepted, contact support so the professional's time can be handled fairly.",
          "EasyHome may cancel a booking for safety, fraud, repeated abuse or if no professional can be matched.",
        ],
      },
      {
        heading: "Conduct and safety",
        body: [
          "Harassment, discrimination, unsafe working conditions, off-platform payment pressure and fake reviews are prohibited.",
          "Customers should secure valuables and provide a safe environment. Professionals must behave respectfully, arrive when expected and never share customer contact details.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "EasyHome facilitates introductions and accountability. The service itself is performed by an independent professional. To the extent permitted by law, EasyHome's liability is limited to the platform fees paid for the affected booking.",
          "Nothing in these terms excludes rights you have under applicable consumer law.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these terms as the service evolves. Material changes will be announced in the app. Continued use after an update means you accept the revised terms.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    updated: "Last updated 1 October 2026",
    intro:
      "EasyHome is built to collect as little personal data as possible while keeping bookings safe and accountable.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account data: name, email, phone, role and profile photo. Booking data: service, description, area, budget, urgency, optional photo and location coordinates.",
          "Worker data: trade, service area, pricing, UPI ID for fee settlement, ratings and KYC status. KYC images are stored as private Cloudinary assets and sent to the configured admin Telegram chat; access to the images is restricted to authorised administrators.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "We use your data to authenticate you, match bookings, show relevant services, process payments and fees, prevent fraud and provide support.",
          "If you choose current-location detection, your coordinates are used to identify service coverage and resolve your locality through OpenStreetMap Nominatim. If GPS is unavailable, EasyHome may use your network IP to estimate your city and state through ipapi.co; this estimate is approximate and does not provide precise coordinates. When a professional is assigned to an active booking, their live location is shared with that booking's customer while tracking is active.",
          "We do not sell personal data. We do not show your phone number publicly or to workers until the final price is confirmed.",
        ],
      },
      {
        heading: "Who can see what",
        body: [
          "Customers can see their own bookings and the public profile of professionals. Professionals can see the job details, area and — after price confirmation — the customer's phone number.",
          "Administrators can see operational records needed to run the platform. Access is logged for sensitive actions such as KYC review and account changes.",
        ],
      },
      {
        heading: "Storage and security",
        body: [
          "Authentication and data are hosted on Google Firebase. Access rules are enforced server-side; the browser is not trusted to write records directly.",
          "KYC documents are stored privately in Cloudinary and forwarded to a private admin Telegram channel. They are not stored in Firestore or exposed as public images. No system is perfectly secure, but we work to limit and protect what we hold.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can edit your name, phone, city and saved addresses in your profile. You can delete saved addresses at any time.",
          "To request account deletion or a copy of your data, contact support from the in-app chat. Some records may be retained where required for tax, fraud prevention or legal obligations.",
        ],
      },
      {
        heading: "Cookies and local storage",
        body: [
          "EasyHome stores your sign-in session and selected city in your browser. Firestore caches recent data locally so the app works offline. You can clear this data from your browser settings.",
        ],
      },
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    updated: "Last updated 1 October 2026",
    intro:
      "EasyHome is a discovery, matching and accountability platform. It is not the employer of the independent professionals listed on the platform.",
    sections: [
      {
        heading: "Independent professionals",
        body: [
          "Professionals on EasyHome are independent service providers. They set their own availability, agree the final price in the app and perform the work directly for the customer.",
          "EasyHome verifies identity and account details before approval, but verification is not a warranty of any particular outcome, workmanship or timeline.",
        ],
      },
      {
        heading: "Service outcomes",
        body: [
          "While we work hard to keep quality high, EasyHome does not control the tools, materials or on-site decisions of an independent professional. Any service warranty is between the customer and the professional unless we state otherwise in writing.",
          "If a job does not go to plan, contact support before confirming payment. We will help mediate a redo, adjustment or cancellation.",
        ],
      },
      {
        heading: "Pricing and urgency",
        body: [
          "Budgets, quotes and final prices are shown in the app. Urgent requests include a 10% urgent fee for non-members; active EasyHome Pro customers are exempt. Urgent and priority benefits apply only while the membership is active.",
          "EasyHome service fees and membership fees are separate from the amount paid to the professional for the service.",
        ],
      },
      {
        heading: "Location coverage",
        body: [
          "Availability depends on admin-managed service zones, the professional's registered city and local area, and their online status. A listed service may not be available in every neighbourhood.",
          "If we are not live in your area yet, join the waitlist and we will let you know when coverage expands.",
        ],
      },
      {
        heading: "External links and payments",
        body: [
          "The app may link to third-party services such as maps or payment providers. Their terms and privacy practices apply separately.",
          "Razorpay processes online payments. EasyHome does not store full card numbers or UPI credentials.",
        ],
      },
    ],
  },
  refunds: {
    title: "Refund & cancellation policy",
    updated: "Last updated 1 October 2026",
    intro:
      "Service payments go directly to the professional. EasyHome memberships are paid to EasyHome. The two are handled differently.",
    sections: [
      {
        heading: "Service bookings",
        body: [
          "You pay the professional after the job is completed. If something is wrong, do not confirm payment — contact support first.",
          "If a professional does not arrive or the work is materially different from what was agreed, support will help arrange a redo, a partial adjustment or cancellation. Any refund of the service amount is agreed with the professional.",
        ],
      },
      {
        heading: "Cancelling a booking",
        body: [
          "You can cancel free of charge before the job starts. Once the professional has started work, cancellation is handled by support and may include a fair charge for time and materials already used.",
        ],
      },
      {
        heading: "Pro membership",
        body: [
          "Membership is a digital subscription activated automatically after a successful Razorpay payment. Because access begins immediately, fees are generally non-refundable once activated.",
          "If you were charged in error or the membership was not activated, contact support with the Razorpay payment ID. Unused full months may be considered at our discretion.",
        ],
      },
      {
        heading: "Service fee payments (workers)",
        body: [
          "Workers pay EasyHome a service fee on completed non-premium jobs. Fee payments are verified manually. If a payment was submitted but not credited, send the reference to support and we will reconcile it.",
          "Rejected payments do not disappear from your dues. Re-check the reference and submit again.",
        ],
      },
      {
        heading: "How to reach us",
        body: [
          "Open EasyHome → Help & support. Include your booking reference or UPI reference. We aim to respond within one working day.",
        ],
      },
    ],
  },
};

const ICONS = {
  about: BadgeCheck,
  terms: FileText,
  privacy: Lock,
  refunds: RefreshCcw,
  disclaimer: ShieldCheck,
};

export default function Legal() {
  const { slug = "about" } = useParams();
  const page = PAGES[slug] || PAGES.about;
  const Icon = ICONS[slug] || ShieldCheck;

  usePageMeta(page.title, page.intro);

  return (
    <div className="page page--narrow" style={{ maxWidth: 900 }}>
      <Link to="/" className="btn btn--ghost btn--sm" style={{ marginBottom: 12, paddingLeft: 0 }}>
        <ArrowLeft size={15} /> Back home
      </Link>

      <Card className="card--pad" style={{ marginBottom: 18, background: "var(--paper-2)", borderColor: "transparent" }}>
        <div className="row" style={{ gap: 12 }}>
          <span className="stat__icon" style={{ width: 44, height: 44 }}>
            <Icon size={20} />
          </span>
          <div>
            <p className="eyebrow" style={{ marginBottom: 2 }}>
              EasyHome legal
            </p>
            <div className="row row--wrap" style={{ gap: 6 }}>
              {Object.entries(PAGES).map(([key, item]) => (
                <Link
                  key={key}
                  to={`/legal/${key}`}
                  className={`badge ${key === slug ? "badge--dark" : "badge--outline"}`}
                  style={{ background: key === slug ? undefined : "#fff" }}
                >
                  {item.title.replace(" policy", "")}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <article className="prose" style={{ padding: 0 }}>
        <h1>{page.title}</h1>
        <p className="updated">{page.updated}</p>
        <p style={{ fontSize: 15, color: "var(--ink)" }}>{page.intro}</p>

        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </section>
        ))}

        <div
          className="card card--pad"
          style={{ marginTop: 30, background: "var(--yellow-soft)", borderColor: "#f2e29a" }}
        >
          <div className="row" style={{ gap: 12 }}>
            <Headphones size={20} />
            <div className="grow">
              <strong style={{ fontSize: 14 }}>Questions about this page?</strong>
              <p className="small" style={{ color: "var(--yellow-ink)" }}>
                Support can explain anything here in plain language.
              </p>
            </div>
            <Link to="/chat" className="btn btn--dark btn--sm">
              Contact support
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
