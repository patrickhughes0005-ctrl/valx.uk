# Security baseline

## Secrets

- Commit only `.env.example` templates.
- Real secrets belong in the deployment secret manager.
- Never expose secrets with `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefixes.
- Rotate credentials after suspected disclosure and record the event.

## Identity and authorisation

- Customer and detailer passwords use salted scrypt hashes. Opaque bearer
  sessions are stored as keyed hashes, expire, can be revoked, and are kept in
  the mobile keychain/keystore.
- Registration is invite-only for the private beta. Email verification and
  password recovery use random, expiring, single-use tokens that are stored
  only as keyed hashes. A password reset revokes every existing session.
- Detailer invitations are tied to one normalised email address, expire after
  seven days, are single-use, and are stored only as keyed hashes.
- Verification and reset requests return generic responses where account
  discovery would otherwise be possible. Production requires TLS-protected
  SMTP and never logs raw authentication links or tokens.
- Phone verification remains required before a wider public release.
- Every persistence endpoint enforces its server-side role and record
  ownership; detailer acceptance also rechecks water-supply eligibility.
- Staging Admin access requires a password and time-limited single-use email
  MFA. Wider staff access needs individual accounts, phishing-resistant MFA
  where possible, least-privilege roles, and server-enforced idle expiry.
- Preview mode is forbidden in production and the application enforces that
  fail-closed even if `ADMIN_PREVIEW_MODE` is accidentally set. The admin root
  is non-indexable, non-cacheable and protected against framing.
- Every privileged write must create an append-only audit event including actor,
  target, before/after summary, reason, timestamp, and correlation ID.

## Sensitive data

- Treat registrations, addresses, phone numbers, identity evidence, insurance,
  bank references, and job photographs as sensitive.
- Encrypt in transit and at rest; mask values outside their narrow workflow.
- Never log registration lookup bodies, full addresses, bank details, auth
  tokens, or evidence URLs.
- Detailer onboarding files are stored outside every web root in a private
  Docker volume with random server-generated names. Uploads are limited to 5 MB,
  allowlisted to PDF/JPEG/PNG, checked against file signatures, recorded by
  SHA-256 digest, and downloadable only through an authenticated Admin route
  with `no-store` responses. The browser never receives a reusable storage URL.
- Before expanding beyond the invited pilot, add malware scanning, an encrypted
  off-host document backup with a tested restore, automatic expiry deletion,
  and individual compliance accounts. File-signature validation is not a
  replacement for antivirus scanning.

## API

- Validate every request and return generic provider failures to clients.
- Restrict CORS to approved app/admin origins.
- Apply per-account and per-IP rate limits at the edge and service.
- Add authenticated ownership checks before persistence endpoints are enabled.
- Use idempotency keys for booking confirmation and all future money movement.
- Account deletion immediately revokes every session and disables sign-in while
  the retained-record/legal-hold review is completed.

## Operations

- Managed PostgreSQL with point-in-time recovery, encrypted backups, and tested
  restore procedures.
- Structured logs with correlation IDs and redaction.
- Alert on admin access changes, failed MFA, policy changes, reconciliation
  variance, evidence deletion, provider failure spikes, and unusual exports.
- Complete threat modelling, dependency scanning, SAST, mobile secret review,
  penetration testing, privacy impact assessment, and incident response
  rehearsal before a real pilot.
