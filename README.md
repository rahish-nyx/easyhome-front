# EasyHome Web

Commercial-grade PWA for booking verified home-service professionals. Built with React 19, Vite 8, React Router 7, Firebase Authentication, Cloud Firestore realtime listeners, and a service worker that keeps the app shell usable offline.

The app has three experiences in one codebase:

| Area | Route | Audience |
| --- | --- | --- |
| Customer storefront | `/`, `/services`, `/search`, `/bookings` | Homeowners |
| Worker console | `/worker` | Verified professionals |
| Admin operations | `/admin` | EasyHome staff |

## Stack

- React 19 + Vite 8
- React Router 7
- Firebase Auth (email/password + Google) and Firestore (realtime `onSnapshot`, persistent local cache)
- Express 5 + Firebase Admin SDK API for every write
- CSS design systems: yellow/black customer theme, dark high-contrast worker theme, dark admin shell
- Custom PWA manifest and service worker (`public/sw.js`)

## Quick start

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

The Vite dev server runs at `http://localhost:5173` and proxies `/api` to `http://localhost:5000`.

### Environment

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_URL=/api
VITE_APP_URL=https://easyhome-bec14.web.app
```

Get the Firebase web config from **Firebase Console -> Project settings -> Your apps -> Web app -> Config**. Never put the service-account key in the frontend.

## Firebase prerequisites

The app reads Firestore directly, so these must be enabled for the target project:

1. **Authentication** - enable Email/Password and Google. Email verification is required before a customer can create a booking.
2. **Cloud Firestore** - database in the region you want (the current project uses `asia-south1`).
3. **Media** - public images are uploaded to Cloudinary by the API. KYC documents go directly to the admin Telegram chat, so Firebase Storage is only needed for legacy records.
4. **Rules** - deploy `../backend/firestore.rules`. Client writes are denied; all mutations go through the API.
5. **Indexes** - deploy `../backend/firestore.indexes.json` for the booking, feed, chat and admin queries.

Deployment steps live in [`../backend/README.md`](../backend/README.md).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with API proxy |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally on port 4173 |
| `npm run lint` | ESLint (React Hooks + React Refresh guardrails) |

## PWA and offline behaviour

- `public/sw.js` caches only same-origin app-shell assets. It never caches Firebase, API or cross-origin traffic.
- Navigations use network-first with a cached shell fallback. A network failure **or a 5xx response** falls back to the cached shell.
- Firebase Firestore uses `persistentLocalCache` with multi-tab support, so previously loaded catalogue and booking data survives reloads.
- The app registers the service worker only in production builds (`src/main.jsx`).
- Icons, maskable icon, manifest, robots and sitemap are in `public/`.

To verify offline behaviour locally:

```bash
npm run build
npm run preview
# open http://127.0.0.1:4173, then stop the preview server
# and navigate to /services - the cached shell should still render.
```

## Access and roles

Custom claims are the source of truth for routing and authorisation:

- `role: "customer" | "worker"`
- `workerApproved: boolean`
- `admin: boolean` (also backed by an `admins/{uid}` Firestore document)

The first admin is created by `npm run seed` in the backend after Authentication is enabled. Admin and worker bundles are lazy-loaded, so the customer storefront does not pay their download cost.

## Realtime data

- `src/lib/queries.js` defines all Firestore listeners.
- `src/context/CatalogueContext.jsx` keeps services, cities, promos and settings live, with small offline fallbacks for a cold first launch.
- Catalogue queries intentionally avoid composite indexes; filtering and ordering are done in memory for these small collections.
- All writes call the Express API (`src/lib/api.js`); the client never writes to Firestore directly.

## Deployment

From the backend repository (it owns the Firebase project configuration):

```bash
cd ../backend
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage,hosting
```

Hosting is configured to publish `../easyhomes/dist`. Build the frontend first.

- `index.html` and `sw.js` are served with `no-cache`.
- Hashed assets under `/assets/**` are immutable.
- SPA routes rewrite to `index.html`.
- Security headers are set in `backend/firebase.json`.

### Hosting the API

Firebase Hosting serves static files only; it does not run Express. Before a production build, deploy the API to a Node host such as Render, Railway, Fly.io or Cloud Run, then set:

```env
VITE_API_URL=https://your-api-host.example.com/api
```

Add `https://easyhome-bec14.web.app` to `CORS_ORIGINS` in the backend environment and rebuild the frontend. The default `/api` value only works with the Vite dev proxy or when a reverse proxy on the same domain forwards `/api` to the API. If you prefer Firebase-only infrastructure, wrap the Express app as a Cloud Function and add an `/api/**` Hosting rewrite.

## Project layout

```
src/
  admin/        Admin shell and operational pages
  components/   Shared UI, layout, customer sections
  context/      Auth, catalogue, location and toast providers
  hooks/        Firestore and async-data hooks
  lib/          API client, query definitions, formatting, constants
  pages/        Customer-facing routes
  worker/       Worker console
  styles/       Customer/admin/worker design systems
public/         Manifest, service worker, icons, offline page
```

## Troubleshooting

- **Auth returns `CONFIGURATION_NOT_FOUND` or `BILLING_NOT_ENABLED`**: enable Authentication in the Firebase project. The current project needs its billing account linked before Identity Platform can initialise.
- **Catalogue shows fallback data**: Firestore rules or indexes are not deployed yet, or the browser is offline.
- **Smoke test passes locally but writes fail in production**: deploy `firestore.rules`; the default deny-all ruleset blocks client reads.
- **Uploads fail**: confirm the Storage bucket exists and the API service account can access it.
- **Admin route redirects immediately**: sign in with an account that has the `admin` custom claim and an `admins/{uid}` document.
