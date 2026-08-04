# Detailer pilot onboarding

This is the live, no-payment onboarding path for the first invited Portsmouth
detailer. Do not ask a detailer to send identity or insurance documents through
chat, WhatsApp or ordinary email.

## Operator journey

1. Sign in to `admin.valx.uk` with the approved administrator account and email
   MFA.
2. Open **Detailer database** or **Identity & documents**.
3. Enter the detailer's email and send the secure invitation.
4. The detailer opens the single-use link, creates an account and verifies the
   email address.
5. The detailer saves trading details, makes the required declarations and
   uploads photo identity, public-liability insurance and business-use motor
   insurance.
6. The detailer submits the application. Job offers remain unavailable.
7. An administrator downloads and checks the three documents, records review
   notes and approves, requests changes or rejects the application.
8. Only an approved detailer can see and accept eligible booking offers.

Payments and payouts remain `not_connected` throughout this pilot.

## Security controls

- Invitation tokens are random, expire after seven days, are single-use and are
  stored only as keyed hashes tied to the invited email.
- Account email verification remains mandatory.
- Upload routes require a valid detailer session and use a 15-per-hour limit.
- Only PDF, JPEG and PNG files up to 5 MB are accepted, and file signatures are
  checked rather than trusting the filename.
- Files receive random storage keys, mode `0600`, live outside the web root and
  are never served directly.
- Downloads require an administrator session, use attachment disposition and
  disable caching.
- Upload, submission, invitation and review decisions create audit records.
- Approval is enforced by the API when listing and accepting job offers.

The current storage is suitable for the single invited staging pilot, not a
large public rollout. Add antivirus scanning, encrypted off-host backups,
restore testing and automatic retention deletion before onboarding a wider
group.

## Deployment

The staging Compose file mounts the `valx_staging_documents` private volume at
`/var/lib/valx/detailer-documents`. Migration `0004_detailer_onboarding.sql`
creates the invitation, application and document metadata structures. No secret
or document content belongs in GitHub.
