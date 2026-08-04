# ValX staging deployment

This deployment runs the ValX API, public information/admin web application and
PostgreSQL together behind a host-managed TLS reverse proxy. The Expo product
is exported for the web, so the browser beta and future store builds use the
same customer/detailer application code. It is suitable for an invite-only
staging pilot, not for the final high-availability production environment.

## Host requirements

- A Linux host with Docker Engine and Docker Compose v2.
- Three DNS names: one each for the browser app, admin portal and API.
- TLS termination through the host platform or a reverse proxy.
- Encrypted off-host PostgreSQL backups.
- A monitored support email address.
- SMTP credentials for a ValX mailbox, using an app-specific password where
  the provider supports one.

## Deploy

1. Copy `.env.example` to `.env` on the staging host and replace every example
   value.
2. Restrict inbound access so PostgreSQL is never public. The supplied ports
   bind only to loopback for a reverse proxy.
3. Run `docker compose --env-file .env up --build -d`.
4. Route the browser app DNS name to `127.0.0.1:8080`, the admin DNS name to
   `127.0.0.1:3000`, and the API DNS name to `127.0.0.1:4000` through HTTPS.
5. Verify `/ready`, create two invited test accounts, confirm both verification
   emails arrive, test one forgotten-password link and complete the automated
   private-beta acceptance script.

Database migrations run before the API starts. DVLA remains in mock mode and no
payment variables or endpoints exist.

Production mode deliberately refuses to start with captured email. SMTP is
required so nobody can create an account that they are unable to verify.

## Approve a pilot detailer

Creating an invited detailer account does not make work visible. After the
identity, insurance and onboarding checks are complete, run this on the
staging host (replace both example values):

```sh
docker compose --env-file .env exec api \
  pnpm --filter @valx/api detailer:approve -- \
  --email detailer@example.com --operator "ValX operator name" --confirm
```

The command runs only inside the API container, updates the approved timestamp
and writes an audit event. Do not expose it as a public HTTP route.

## Automated staging smoke test

Keep one dedicated verified customer and one dedicated verified, approved
detailer for automated staging checks. Do not use a director, employee,
customer or pilot detailer's real account. Put the four
`STAGING_SMOKE_*` credentials in the deployment secret environment, then run:

```sh
pnpm test:staging
```

The script signs in, creates a uniquely identified test vehicle and booking,
completes the customer-to-detailer status journey, verifies that payment is
still disconnected and signs both sessions out. It never deletes or recreates
the verified test accounts.
