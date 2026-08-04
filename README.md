# ValX

Private-beta production foundation for ValX: an orange-branded mobile detailing marketplace
with customer, detailer, and administrator experiences. ValX has no slogan.

The approved prototypes are preserved unchanged under `reference/` and their
commercial rules have been moved into shared, tested packages. This repository
does not connect to a payment provider.

## Repository map

```text
apps/
  mobile/       React Native app on Expo SDK 57
  admin/        Next.js 16 administration portal
  api/          Shared Fastify HTTP API
packages/
  brand/        Approved identity tokens
  database/     PostgreSQL schema and migration
  integrations/ DVLA, Google Places, and Google Routes clients
  pricing-policy/ Approved pricing and operating policies
reference/
  customer-site/ Exact ValX Site v23 source
  admin-site/    Exact Detail Admin Site v8 source
docs/           Architecture, product, integration, and security decisions
infra/staging/  Portable Docker staging definition
scripts/        Automated private-beta acceptance check
```

## Prerequisites

- Node.js 22.13 or later
- pnpm 11
- Docker Desktop or another PostgreSQL 17-compatible service
- Xcode or Android Studio only when running native simulators

## Local setup

1. Copy `.env.example` to `.env`, set a private beta invitation code and keep
   both integrations in `mock` mode.
2. Install dependencies with `pnpm install`.
3. Start PostgreSQL with `docker compose up -d postgres`.
4. Apply the schema with `npm run db:migrate`.
5. Run the API with `npm run dev:api`.
6. In another terminal, run `npm run dev:admin` or `npm run dev:mobile`.

Customer and detailer accounts are persisted in PostgreSQL. Registration is
invite-only by default, passwords use salted scrypt hashes, opaque sessions are
revocable, and the mobile token is held in the device keychain/keystore.

The admin preview is available only when `ADMIN_PREVIEW_MODE=true`. Staging and
production disable it. Administrator operations remain closed until an identity
provider, explicit admin allowlist and MFA are configured.

## Private beta journey

The mobile application now supports:

1. Invited customer or detailer registration and sign-in.
2. Customer vehicle and service-address onboarding.
3. Single-use detailer email invitations, business onboarding and private
   identity/insurance uploads.
4. Authenticated Admin review, changes, rejection or approval with audit events.
5. Server-persisted, 15-minute pricing snapshots.
6. A no-payment booking request.
7. Eligible approved-detailer offer, acceptance and job-status progression.
8. Customer booking history, support requests and account deletion.

The public web routes `/privacy`, `/support` and `/delete-account` remain
available while the administrator portal is closed.

## Staging and app distribution

- Portable staging containers and their credential template are in
  `infra/staging/`.
- Expo release profiles are in `apps/mobile/eas.json`.
- `preview` creates internally installable builds.
- `beta` creates TestFlight/App Store Connect and Google Play-compatible builds;
  Android submission targets the internal track as a draft.
- Run `pnpm test:staging` with `STAGING_API_URL` and `BETA_INVITE_CODE` after
  deployment.
- Follow `docs/BETA_PILOT.md` before inviting real testers.

## Quality checks

```bash
pnpm test
pnpm run typecheck
pnpm run build
```

The automated tests cover pricing invariants, mock integrations, authentication,
onboarding, booking acceptance/status, support and deletion. CI repeats these
checks on every push and pull request.

## Important launch gates

- No real payment or payout provider is connected.
- DVLA Vehicle Enquiry Service defaults to mock mode while new registrations
  remain closed.
- Google Places and Routes default to mock mode until billing, keys, quotas,
  terms, privacy disclosures, and attribution are approved.
- Individual administrator roles, malware scanning, encrypted off-host document
  backup and restore testing, notifications, and production observability remain
  launch gates before expanding beyond the invited pilot.
- The privacy notice still needs the registered ValX legal entity, postal
  address and monitored support/privacy contact before external distribution.

See [Architecture](docs/ARCHITECTURE.md),
[Product specification](docs/PRODUCT_SPEC.md),
[Integrations](docs/INTEGRATIONS.md),
[Detailer onboarding](docs/DETAILER_ONBOARDING.md), and
[Security](docs/SECURITY.md).
