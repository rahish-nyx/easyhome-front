# EasyHome — Google Play Store Publishing Package

This folder contains the prepared, ready-to-use publishing deliverables for the
EasyHome Google Play Store launches (Customer + Worker apps).

## Apps under this release

| App | Package / Application ID | Play Console name | versionCode / versionName | AAB |
| --- | --- | --- | --- | --- |
| Customer | `com.easyhome.customer` | EasyHome Customer | 1 / 1.0 | `android/app/build/outputs/bundle/release/app-release.aab` |
| Worker | `com.easyhome.worker` | EasyHome Pro Worker | 1 / 1.0 | `android-worker/app/build/outputs/bundle/release/app-release.aab` |

Both apps share one backend (MERN API) and one production database.

## Deliverables index

| # | Deliverable | File |
| --- | --- | --- |
| 1 | Signed AABs (release) | `AAB_BUILD.md` (customer → `android/app/build/outputs/bundle/release/app-release.aab`; worker → `android-worker/app/build/outputs/bundle/release/app-release.aab`) |
| 2 | Store graphics | `STORE_ASSETS/README.md` (icons, feature graphic, screenshots) |
| 3 | Store listing copy | `PLAY_STORE_LISTING.md` |
| 4 | Privacy policy | `PRIVACY_POLICY.md` (host at public URL, e.g. `https://easyhome-front.vercel.app/legal/privacy`) |
| 5 | Data safety form | `DATA_SAFETY.md` |
| 6 | Content rating | `CONTENT_RATING.md` |
| 7 | App access / test credentials | `APP_ACCESS.md` |
| 8 | Ads declaration | `ADS_DECLARATION.md` |
| 9 | Master checklist | this file |

## Quick facts

- Backend: `https://easyhome-back.vercel.app` (MERN + Socket.io realtime + Razorpay + Brevo + Telegram)
- Frontend: `https://easyhome-front.vercel.app`
- Socket events: `easyhome:newBooking`, `easyhome:jobAccepted`, `easyhome:bookingStatusUpdate`, `easyhome:updateWorkerDashboard`, `easyhome:updateCustomerDashboard`
- Signing: `easyhome-release.keystore` (password `easyhomeRelease2026`, alias `easyhome`) in both `android/app` and `android-worker/app`
- Build config: AGP 8.13.0, compileSdk/targetSdk 36, minSdk 24, google-services 4.4.4
- Release build keeps `minifyEnabled false` (full Capacitor WebView bundle).

## Store listing quick copy

| App | Short description | Full description |
| --- | --- | --- |
| Customer | "Verified home services near you. Book in one tap, pay after the job." | `PLAY_STORE_LISTING.md` |
| Worker | "Verified local jobs, transparent rates and fast UPI payouts for pros." | `PLAY_STORE_LISTING.md` |

## Publishing steps (manual, Play Console)

1. Create two Play Console apps (Customer + Worker).
2. Upload signed AABs (`AAB_BUILD.md`).
3. Fill store listing (`PLAY_STORE_LISTING.md`).
4. Host privacy policy publicly; paste URL into console (Data safety + listing).
5. Complete Data Safety (`DATA_SAFETY.md`), Content Rating (`CONTENT_RATING.md`), Ads Declaration (`ADS_DECLARATION.md`), App Access (`APP_ACCESS.md`).
6. Submit for production review.

## Notes / TODO before submission

- [ ] Host privacy policy at a public URL and update references.
- [ ] Capture 2–4 screenshots per app (see `STORE_ASSETS/README.md`).
- [ ] Record final release notes / version bump (v1.0 → next versionCode).
- [ ] Play Console account / developer registration.
