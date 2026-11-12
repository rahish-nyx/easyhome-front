# EasyHome — Play Store Store Assets

## App icons

| Asset | Path | Size | Status |
| --- | --- | --- | --- |
| Customer app icon | `public/icon-512.png` | 512×512 | present (opaque blue) |
| Customer app icon (small) | `public/icon-192.png` | 192×192 | present |
| Maskable icon | `public/icon-maskable-512.png` | 512×512 | present |
| Worker app icon | `public/icon-worker-512.png` | 512×512 | present (blue & white logo, transparent bg, logo only) |
| Worker app icon (small) | `public/icon-worker-192.png` | 192×192 | present (blue & white logo, transparent bg, logo only) |

Launcher icons inside APKs (regenerated from source):

- Customer: `android/app/src/main/res/mipmap-*/ic_launcher_foreground.png`, `mipmap-anydpi-v26/ic_launcher.xml`
- Worker: `android-worker/app/src/main/res/mipmap-*/ic_launcher_foreground.png`, `mipmap-anydpi-v26/ic_launcher.xml`

Worker launcher background: transparent (`#00000000`) — no black background, only logo.

## Feature graphic

- `public/feature-graphic.png` — 1024×500 px promotional banner. Present.

## Screenshots

Required: 2–4 phone screenshots per app (9:16 or 9:16-ish; Play recommends 1080×1920).

Suggested set:

### Customer app (`com.easyhome.customer`)

1. Guest / home landing — "One platform. Two ways in." / book flow.
2. Service booking + professional acceptance.
3. Live tracking / completed + payment.

### Worker app (`com.easyhome.worker`)

1. Worker login / onboarding.
2. New job alert (socket realtime).
3. Worker dashboard / earnings.

## Asset checklist before upload

- [ ] 512×512 icons transparent-correct (worker: transparent background, blue/white logo only).
- [ ] Feature graphic 1024×500.
- [ ] 2–4 screenshots per app, legible, no placeholder text.
- [ ] Store listing screenshots uploaded via Play Console.
