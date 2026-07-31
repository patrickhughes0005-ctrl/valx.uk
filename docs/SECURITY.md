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
- Registration is invite-only for the private beta. Verified email/phone
  recovery remains required before wider release.
- Every persistence endpoint enforces its server-side role and record
  ownership; detailer acceptance also rechecks water-supply eligibility.
- Admin access needs OIDC, an explicit allowlist, phishing-resistant MFA where
  possible, least-privilege roles, and 15-minute idle expiry.
- Preview mode is forbidden in production.
- Every privileged write must create an append-only audit event including actor,
  target, before/after summary, reason, timestamp, and correlation ID.

## Sensitive data

- Treat registrations, addresses, phone numbers, identity evidence, insurance,
  bank references, and job photographs as sensitive.
- Encrypt in transit and at rest; mask values outside their narrow workflow.
- Never log registration lookup bodies, full addresses, bank details, auth
  tokens, or evidence URLs.
- Store evidence in private object storage using short-lived signed URLs,
  malware scanning, content-type checks, size limits, and retention policies.

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
