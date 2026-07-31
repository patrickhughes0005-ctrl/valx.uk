# ValX browser beta

## What this is

The browser beta is the actual Expo customer/detailer application compiled for
the web. It uses the same React Native screens, shared pricing package, API,
authentication, PostgreSQL records and booking state as the future iOS and
Android builds.

It is separate from `demos/investor-site-static`, which is presentation
material and deliberately contains no real accounts or data.

## Browser beta surfaces

| Surface | Purpose | Runtime |
| --- | --- | --- |
| Browser app | Customer and detailer accounts and journeys | Expo web export |
| Admin portal | Private marketplace operations | Next.js |
| API | Authentication, onboarding, quotes, bookings and support | Fastify |
| Database | Durable beta records | PostgreSQL |

## Required hosting

A normal static file upload is not enough for an actual trial. The browser app
must be deployed with:

- an HTTPS browser-app hostname;
- an HTTPS admin hostname;
- an HTTPS API hostname;
- a private PostgreSQL database;
- a monitored support email;
- a random beta invitation code and authentication pepper;
- encrypted off-host database backups.

`infra/staging/docker-compose.yml` runs these four product services together.
The host's reverse proxy supplies HTTPS and routes:

- the browser app to `127.0.0.1:8080`;
- the admin portal to `127.0.0.1:3000`;
- the API to `127.0.0.1:4000`.

## Safety boundaries

- Registration stays invite-only.
- DVLA and Google Maps stay in mock mode until their production credentials
  and privacy controls are approved.
- Payments remain absent; the UI and API explicitly report that no payment is
  taken.
- Browser sessions use per-tab session storage. Native builds continue to use
  secure device storage.
- The admin preview mode must never be exposed publicly. Keep it disabled for
  a real staging pilot until approved identity and MFA are configured, or place
  the entire preview behind a separate host-level access gate.

## Local browser run

Start the API and Expo web app in separate terminals:

```powershell
pnpm dev:api
pnpm dev:web
```

Use the invitation code configured in the local `.env`. The API permits the
Expo development origin through `API_CORS_ORIGINS`.

## Production web build

The API URL is embedded when the Expo web bundle is created:

```powershell
$env:EXPO_PUBLIC_API_URL = "https://api.staging.example.com"
pnpm build:web
```

The static browser bundle is emitted to `apps/mobile/dist-web`. The supplied
web Dockerfile performs this build and serves it through Nginx.
