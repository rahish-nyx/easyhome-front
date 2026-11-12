# Google Play Console — Data Safety Form Answers

Answers prepared for the **Data Safety** section (Play Console → Policy → Data safety).

## App data types

### 1. Data collected by the app

| Data type | Collected? | Optional? | Purpose |
| --- | --- | --- | --- |
| Personal info (name, email, phone) | Yes | No | Account & booking |
| Personal info (profile photo) | Yes | No | Account |
| User content (service descriptions, photos) | Yes | No | Booking |
| Location (precise) | Yes | Yes (runtime permission) | Service zone / dispatch / tracking |
| Location (approximate via IP) | Yes | Yes | Coverage estimate |
| Purchase history / transaction IDs | Yes | No | Commission & membership settlement |
| Device identifiers / technical | Yes | No | Security, analytics if enabled |

### 2. Data encrypted in transit

- **Yes.** All API traffic over HTTPS/TLS; Razorpay/UPI flows use provider-side encryption.

### 3. Encrypted locally / data deletion

- **Yes.** Sensitive fields (e.g. booking contact numbers) are stripped server-side for
  non-participant views; users can delete saved data from profile.

### 4. Account deletion

- Users can request deletion via in-app Help & Support. Deletion is executed by the
  operator. Some records (payments, tax/fraud/legal) may be retained.

### 5. Third-party services handling user data

- **Yes** — data is shared with: MongoDB Atlas (hosting), Cloudinary (media/KYC), Razorpay
  (payments), email provider (transactional email), Telegram admin chat (KYC alerts), and
  map/geocoding provider (OpenStreetMap).

### 6. Advertising

- **No.** No advertising SDKs, no ad data collection, no ads served by the app.

### 7. Google Play services

- Play Services are used for platform availability only; no user data is transferred to
  Google for ads.

## Summary answers for quick form fill

| Question | Answer |
| --- | --- |
| Does the app collect personal data? | Yes |
| Does it collect location? | Yes (precise + approximate) |
| Does it collect photos? | Yes (service/job photos, optional) |
| Does it collect payment info? | Partial — transaction references only (Razorpay); no raw card/UPI data |
| Does it share data with third parties? | Yes (see list) |
| Is data encrypted? | Yes (TLS) |
| Can users delete data? | Yes |
| Is an advertising ID collected? | No |
| Is location stored? | Yes (booking context; live worker location during active job) |

## Play Console "Data safety" section checklist

1. App access → Data safety → Personal data: complete table above.
2. Add each third-party SDK with data-sharing declaration:
   - Razorpay (payments)
   - Cloudinary (media)
   - MongoDB Atlas / Vercel (infrastructure)
   - Resend (email)
   - Telegram (alerts)
   - OpenStreetMap (maps)
3. Declare optional data use: location optional; photos optional for bookings.

---

*References: `backend/README.md` (security & data model), `backend/src/models/*`, `docs/legal` content in the web app (`/legal/privacy`, `/legal/terms`).*
