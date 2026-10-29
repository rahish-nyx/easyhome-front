# EasyHome Web

Commercial-grade PWA for booking verified home-service professionals. Built with React 19, Vite 8, React Router 7, a MongoDB-backed Express API, JWT authentication, and a service worker that keeps the app shell usable offline.

The app has three experiences in one codebase:

| Area | Route | Audience |
| --- | --- | --- |
| Customer storefront | `/`, `/services`, `/search`, `/bookings` | Homeowners |
| Worker console | `/worker` | Verified professionals |
| Admin operations | `/admin` | EasyHome staff |

## Stack

- React 19 + Vite 8
- React Router 7
- JWT authentication (email/password + Google) issued by the EasyHome API
- Express 5 + MongoDB (Mongoose) backend for every read and write
- CSS design systems: yellow/black customer theme, high-contrast worker console, dark admin shell
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
VITE_API_URL=/api
VITE_APP_URL=http://localhost:5173
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

`VITE_API_URL` accepts either a root-relative path (use `/api` with the Vite proxy or a same-origin reverse proxy) or an absolute API URL such as `https://api.example.com/api`. See [`../backend/README.md`](../backend/README.md) for the server environment, including `MONGODB_URI` and `JWT_SECRET`.

## Backend prerequisites

1. **MongoDB** - set `MONGODB_URI` in `backend/.env` and run `npm run seed` once.
2. **JWT** - set a long random `JWT_SECRET`.
3. **Media** - uploads require Cloudinary credentials on the API. KYC documents are stored privately in Cloudinary and are also sent to the configured admin Telegram chat.
4. **Google sign-in** (optional) - set `GOOGLE_CLIENT_ID` on the API and `VITE_GOOGLE_CLIENT_ID` on the frontend.
5. **Catalogue folders** - run `node scripts/linkServices.mjs` in the backend to create the 15 folders and link every service.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with API proxy |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally on port 4173 |
| `npm run lint` | ESLint (React Hooks + React Refresh guardrails) |

## PWA and offline behaviour

- `public/sw.js` caches only same-origin app-shell assets. It never caches API or cross-origin traffic.
- Navigations use network-first with a cached shell fallback. A network failure **or a 5xx response** falls back to the cached shell.
- `CatalogueContext` keeps the last catalogue response in `localStorage`, so previously loaded catalogue and booking data renders instantly on reload.
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

JWT claims are the source of truth for routing and authorisation:

- `role: "customer" | "worker"`
- `workerApproved: boolean`
- `admin: boolean` (also backed by an `admins` MongoDB collection)

The first admin is created by `npm run seed` in the backend. Admin and worker bundles are lazy-loaded, so the customer storefront does not pay their download cost.

## Data flow

- `src/lib/queries.js` defines the REST descriptors used by the polling hooks in `src/hooks/useLive.js`.
- `src/context/CatalogueContext.jsx` loads services, folders, cities, promos and settings from `GET /api/public/bootstrap`, with bundled fallbacks for a cold first launch.
- Customer folder browsing is driven by the same folders the admin console manages (15 seeded folders, every service linked).
- All writes call the Express API (`src/lib/api.js`); the client never talks to the database directly.

## Deployment

Build the frontend and deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, etc.). The backend deploys separately as a Node service.

```bash
npm run build
```

- `index.html` and `sw.js` should be served with `no-cache`.
- Hashed assets under `/assets/**` are immutable.
- SPA routes rewrite to `index.html`.
- Set `VITE_API_URL=https://your-api-host.example.com/api` in the production build environment.
- Add the frontend origin to `CORS_ORIGINS` in the backend environment.

The default `/api` value only works with the Vite dev proxy or when a reverse proxy on the same domain forwards `/api` to the API.

## Project layout

```
src/
  admin/        Admin shell and operational pages
  components/   Shared UI, layout, customer sections
  context/      Auth, catalogue, location and toast providers
  hooks/        Polling and async-data hooks
  lib/          API client, query definitions, formatting, constants
  pages/        Customer-facing routes
  worker/       Worker console
  styles/       Customer/admin/worker design systems
public/         Manifest, service worker, icons, offline page
```

## Troubleshooting

- **API requests fail**: confirm `backend/.env` has `MONGODB_URI` and `JWT_SECRET`, then start `node src/index.js`.
- **Signed out unexpectedly**: the JWT expired or the API restarted with a different `JWT_SECRET`; sign in again.
- **Catalogue shows fallback data**: the API is unreachable or the browser is offline.
- **Uploads fail**: confirm the API has valid Cloudinary credentials and can reach Cloudinary.
- **Admin route redirects immediately**: sign in with an account that has the `admin` claim and a matching `admins` record.
