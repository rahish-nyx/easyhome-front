# EasyHome — Complete Google Play Publishing Package (Consolidated)

Everything needed to publish the EasyHome Customer and EasyHome Pro Worker apps on the
Google Play Store, in one document.

> Source documents live in the same folder:
> `README-PLAY-STORE.md`, `AAB_BUILD.md`, `PLAY_STORE_LISTING.md`, `PRIVACY_POLICY.md`,
> `DATA_SAFETY.md`, `CONTENT_RATING.md`, `APP_ACCESS.md`, `ADS_DECLARATION.md`, `STORE_ASSETS/README.md`.

---

## 1. Apps & identifiers

| | Customer | Worker |
| --- | --- | --- |
| Play Console app name | EasyHome Customer | EasyHome Pro Worker |
| Application / package ID | `com.easyhome.customer` | `com.easyhome.worker` |
| Version code | 1 | 1 |
| Version name | 1.0 | 1.0 |
| Min SDK | 24 | 24 |
| Target / Compile SDK | 36 | 36 |
| Play requirement | targetSdk 35+ ✓ | targetSdk 35+ ✓ |
| Backend | `https://easyhome-back.vercel.app` | same |

## 2. Signed AABs

| App | Build command | Artifact |
| --- | --- | --- |
| Customer | `cd easyhomes/android && gradle :app:bundleRelease` | `easyhomes/android/app/build/outputs/bundle/release/app-release.aab` (14,678,883 B) — **BUILD SUCCESSFUL** |
| Worker | `cd easyhomes/android-worker && gradle :app:bundleRelease` | `easyhomes/android-worker/app/build/outputs/bundle/release/app-release.aab` — building… |

Signing: keystore `easyhome-release.keystore` (both apps), alias `easyhome`,
password / key password `easyhomeRelease2026`.

## 3. Store listing copy

### EasyHome Customer (short)

> Verified home services near you. Book in one tap, pay after the job.

### EasyHome Customer (full)

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
```

### EasyHome Pro Worker (short)

> Verified local jobs, transparent rates and fast UPI payouts for pros.

### EasyHome Pro Worker (full)

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
```

## 4. Privacy policy

- Draft: `docs/play-store/PRIVACY_POLICY.md`.
- Host publicly (e.g. `https://easyhome-front.vercel.app/legal/privacy`) and paste URL into Play Console.
- In-app version: `/legal/privacy`.

## 5. Data safety — key answers

- Collects: personal info, user content, precise/approximate location, transaction refs; no raw card/UPI data.
- Encryption: TLS in transit (yes); at rest via managed DB.
- Third parties: MongoDB Atlas, Cloudinary, Razorpay, email provider, Telegram, OpenStreetMap.
- Ads: none.
- Full answers: `docs/play-store/DATA_SAFETY.md`.

## 6. Content rating

- Expected IARC rating: **Everyone**.
- Rationale: no violence/sexual/language/drugs/gambling; moderated UGC; payments/location appropriate.
- Full: `docs/play-store/CONTENT_RATING.md`.

## 7. Ads declaration

- No ads, no ad SDK. Full: `docs/play-store/ADS_DECLARATION.md`.

## 8. App access / test credentials

- Customer flow: guest landing → sign in → email verify → book → track → pay.
- Worker flow: open app → worker login → apply/sign in → admin approval → dashboard.
- Full: `docs/play-store/APP_ACCESS.md`.

## 9. Store assets

- Icons, feature graphic, screenshots: `docs/play-store/STORE_ASSETS/README.md`.

## 10. Pre-submission checklist

- [x] Signed AAB customer (BUILD SUCCESSFUL).
- [ ] Signed AAB worker (in progress).
- [x] Backend syntax check pass.
- [ ] Frontend deploy after final fixes (done: READY).
- [ ] AABs uploaded to Play Console.
- [ ] Store listing filled (short + full copy).
- [ ] Privacy policy hosted + URL pasted.
- [ ] Data safety, content rating, ads, access forms completed.
- [ ] Screenshots uploaded (2–4 per app).
- [ ] Production release created & submitted.
