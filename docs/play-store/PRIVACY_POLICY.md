# EasyHome Privacy Policy — Draft for Google Play Submission

> **Note for publisher:** Replace the hosting placeholder below with the final public
> URL once the policy is published (e.g. `https://easyhome.vercel.app/legal/privacy`).
> The in-app version is served at `/legal/privacy` and should mirror this text.

**Effective date:** 12 November 2026
**Operator:** EasyHome (contact: official.easyhomeservices@gmail.com)

## 1. Who we are

EasyHome ("we", "us") operates the EasyHome customer app, the EasyHome Pro Worker app and
the EasyHome web store. We are a service marketplace connecting customers who need home
services with independent, verified professionals.

## 2. What we collect

| Category | Data | Purpose |
| --- | --- | --- |
| Account | Name, email, phone, role, profile photo | Authentication, profile, contact |
| Booking | Service, description, area, budget, urgency, photos, status | Booking lifecycle, accountability |
| Professional | Trade(s), service area, rates, availability, UPI ID, ratings | Job matching, payouts |
| KYC | Government ID images | Verification; private Cloudinary storage, admin Telegram alert only |
| Location | Precise coordinates when location permission granted; approximate city/state via IP when GPS unavailable | Service-zone matching, coverage, dispatch |
| Worker live location | Coordinates of an assigned professional during an active booking | Customer tracking |
| Payment | Razorpay payment/order/UTR references | Fee settlement, membership activation, audit |
| Technical | Session tokens, device/app info, logs | Security, support, fraud prevention |

We do **not** store full card numbers or UPI credentials in our systems.

## 3. How we use the data

- Authenticate and keep sessions secure.
- Match bookings to professionals inside the service-zone radius.
- Coordinate bookings, live tracking and completion.
- Process payments through Razorpay and settle worker commissions/fees.
- Send transactional email and in-app notifications (optional features).
- Prevent fraud, abuse and unauthorised access; keep admin audit logs.

## 4. Who we share data with

- **Professionals** — only the assigned professional receives job details and, after
  acceptance, the customer's contact details.
- **Service providers** — MongoDB Atlas (data hosting), Cloudinary (media storage),
  Razorpay (payments), Resend/OpenAI-style transactional email provider (email delivery),
  Telegram (admin alerts), OpenStreetMap Nominatim (geocoding).

We do **not** sell personal data.

## 5. Retention and deletion

Data is retained for as long as the account is active or required for legal, tax, fraud
prevention or dispute reasons. Account deletion requests are handled via in-app support;
some records may be retained where legally required.

## 6. Security

TLS in transit; server-side access control on every API route; hashed passwords (bcrypt);
hashed refresh tokens; private KYC storage.

## 7. Your rights

Access, correction and deletion requests via in-app Help & Support chat or email.

## 8. Children's privacy

The Service is not directed at children under 18 and is intended for adults who can
contract. We do not knowingly collect data from children.

## 9. Changes

Material changes are announced in-app.

## 10. Contact

official.easyhomeservices@gmail.com
