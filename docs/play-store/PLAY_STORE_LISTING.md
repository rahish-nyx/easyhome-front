# Google Play Store — Store Listing Copy

Copy for both the **EasyHome Customer** and **EasyHome Pro Worker** listings.

---

## EasyHome Customer (`com.easyhome.customer`)

### Short description (≤ 80 characters)

> Book verified home services near you. Cleaners, plumbers, electricians — one tap booking, pay after job.

Character count: ~113 — trim to fit Play's 80-char limit:

> Verified home services near you. Book in one tap, pay after the job.

(≤ 80 chars, recommended)

### Full description

```
Book trusted home services without the chaos.

EasyHome connects you with verified professionals for cleaning, plumbing, electrical,
AC repair, painting, furniture assembly and more — in your neighbourhood.

WHAT YOU GET
• Verified professionals: government-ID checked, trade-verified, area-approved accounts.
• Transparent pricing: the professional sets the final price in the app before any work begins.
• Book in one tap: pick a service, describe the job, set your budget, choose urgency.
• Live booking flow: professional accepts → starts → completes → you confirm payment & tip.
• Real-time tracking: see the professional's status (assigned → en route → arrived → working → completed).
• Payment protection: pay the professional directly after the job; EasyHome holds accountability.
• EasyHome Pro membership: priority dispatch, no urgent-job surcharges, accidental damage cover.

HOW IT WORKS
1. Create your account and pick your service zone.
2. Browse the service catalogue or search for what you need.
3. Book a service — agree the final price with the professional.
4. Track the job live and confirm payment when the work is done.

WHY EASYHOME
We are a local marketplace for home services, not a gig marketplace with anonymous
bidding. One approved professional takes ownership of every booking.

For professionals: become EasyHome Pro at /auth?role=worker — get verified, set your
rates and receive nearby jobs that fit your trade.

Questions? Open the in-app Help & Support chat anytime.
```

---

### EasyHome Pro Worker (`com.easyhome.worker`)

### Short description (≤ 80 characters)

> Verified local jobs, transparent rates and fast UPI payouts for pros.

(≤ 80 chars ✓)

### Full description

```
Earn on your own schedule with EasyHome Pro.

EasyHome connects verified professionals with local customers who need real, skilled help
in their home — cleaning, plumbing, electrical, AC, painting, repairs and more.

FOR WORKERS
• Apply once: trade, service area, rates, availability.
• Get approved: admin review + KYC flow before going live in search.
• Receive jobs: only jobs matching your trade, city, locality and active service radius.
• Set the price: final price negotiated in-app with the customer; you keep what you set.
• Start / complete / get paid: lifecycle enforced (accept → start → complete → Razorpay payout).

FOR CUSTOMERS
• Book a pro for any job in your home.
• Track live status: assigned → en route → arrived → working → completed.
• Pay after completion — direct to your UPI via Razorpay.

WHY WORK WITH US
• Zero-due penalty & uninterrupted work guarantee for EasyHome Pro members.
• Lower commission (7%) vs standard platform fee.
• Priority urgent-job alerts while Pro is active.

Apply or sign in to start receiving jobs: /auth?role=worker

Questions? Open the in-app Help & Support chat anytime.
```

---

## Feature graphic

- Size: 1024 × 500 px (required).
- Source: `public/feature-graphic.png` (1024×500, present in repo).
- Content recommendation: brand colour background, headline + tagline, app icon centred.

## App icon

- Required: 512 × 512 px (Play Store listing + AAB adaptive icon).
- Customer: `public/icon-512.png` (present).
- Worker: `public/icon-worker-512.png` (blue & white worker logo, transparent background, logo only) — regenerated in the final build (Nov 11, 2026).
- Maskable: `public/icon-maskable-512.png` (present).

## Screenshots (2–4 per app)

Recommended spec for listing:

| Slot | Size | Notes |
| --- | --- | --- |
| Phone screenshot 1 | 1080×1920 (9:16) | Customer: home/guest landing or service booking screen. |
| Phone screenshot 2 | 1080×1920 | Customer: booking tracking screen. |
| Phone screenshot 3 | 1080×1920 | Customer: payment / completed state. |
| Tablet (optional) | 1280×800 | Optional. |

Worker screenshots:
1. Worker login / professional onboarding.
2. Job request alert (new booking).
3. Earnings / active job screen.

Status bar must show device time/battery correctly; text must be legible; no placeholder UI.

> NOTE: screenshots should be captured from the final APKs/emulators and uploaded via Play Console.

---

## Full store description length check

- Customer full: well under 4000 chars ✓ (draft above ~1100 chars).
- Worker full: well under 4000 chars ✓.

## Category & tags (suggested)

- Customer: Category: Business > Shopping? → Suggested: **Home & Garden** / Lifestyle; Tags: Home Service, Cleaning, Plumbing, Electrician.
- Worker: Category: **Business** / **Productivity**; Tags: Freelance, On-demand, UPI Payouts.

## Pricing

- Customer: in-app Pro membership (₹199/month, ₹537 quarterly, ₹1910 yearly). Service payments to professionals.
- Worker: Pro membership (₹250/month, ₹675 quarterly, ₹2400 yearly) + 7% commission on completed non-premium jobs.

## Release notes (v1.0)

- Initial release. Booking lifecycle, realtime tracking, payments, pro onboarding, admin console.
