# Google Play Console — App Access & Test Credentials

## App access instructions for Google review team

### Customer app (`com.easyhome.customer`)

1. Open the app. Guest users land on the universal guest landing (dual-entry section hidden
   in customer mode).
2. Sign up / sign in: email + password (or Google).
3. Email verification required before booking (sent via provider; check spam).
4. After verification → customer dashboard → book a service → tracking → payment.

### Worker app (`com.easyhome.worker`)

1. Open the app. Not signed in → redirects to worker sign-in
   (`/auth?role=worker&next=/worker`).
2. Sign up / sign in with professional details (trade mandatory, service area required).
3. Admin approval required → account status changes to approved.
4. Approved worker → worker dashboard with job feed, accept/start/complete lifecycle.

### Backend dependencies for review testing

- Backend: `https://easyhome-back.vercel.app` (deployed READY).
- Socket.io realtime at `https://easyhome-back.vercel.app/socket.io/?EIO=4&transport=polling`.

## Suggested test accounts

> These are the operator-managed seed/admin accounts. Create fresh customer + worker test
> accounts for review if the shared admin credentials should not be disclosed.

| Role | Email | Notes |
| --- | --- | --- |
| Admin | `official.easyhomeservices@gmail.com` | Full admin console access; used for worker approvals |
| Customer | (create via console flow) | Email verification flow; use test inbox |
| Worker | (create via console flow) | Requires admin approval before job feed access |

## Review guidance

- Booking lifecycle review path: customer books → worker accept → start → complete → payment.
- For expedited review, an admin account can be provided to the review team via in-app support.
- All testing should be performed on a device with network access to the production backend.
