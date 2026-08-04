# ValX private beta pilot

## Purpose

The pilot validates whether invited customers and detailers can complete the
approved booking journey safely before payments are introduced. It is not a
public launch and must not promise live payment or DVLA lookup.

## Entry gates

- Staging is available only over HTTPS.
- The API `/ready` check passes and the staging smoke test succeeds.
- A monitored support email appears on `/support` and `/privacy`.
- Registration is invite-only.
- TestFlight and Google Play testers have accepted the relevant test invitation.
- The privacy notice contains the final ValX legal entity and postal address.
- Two real devices per platform have passed sign-in, background/foreground and
  reinstall checks.

## Suggested first cohort

- ValX owner/operations tester.
- Two prospective customers using different vehicle types.
- Two prospective detailers, one with their own water supply and one without.
- One support/admin observer who records issues without using production data.

Use people who have explicitly agreed to test. Do not add real customer or
detailer information on somebody else's behalf.

## Detailer approval gate

- A detailer may create and verify an invited account, but cannot see or accept
  work until ValX has completed its checks and explicitly approved the account.
- Until the real MFA-protected admin portal exists, approval is performed only
  from the staging server with the audited `detailer:approve` command. It
  requires the detailer email, the operator name and an explicit `--confirm`.

## Required scenarios

1. Customer receives an invite, creates an account and signs back in.
2. Customer adds a vehicle manually while DVLA is in mock mode.
3. Customer saves a complete service address and confirms water availability.
4. Customer selects each service and checks the locked pricing breakdown.
5. Customer creates a prebooked request and confirms that no payment is taken.
6. ValX approves the checked pilot detailer; only then does the eligible
   detailer see the offer and displayed guaranteed pay.
7. Detailer accepts, marks on-way, arrived, in-progress and completed.
8. Customer sees the completed status and assigned detailer.
9. Both roles send a support request.
10. A disposable test account requests deletion and can no longer use its
    session.

## Feedback record

For each test, record the build number, device/OS, role, scenario, expected
result, actual result, screenshot where safe, severity and consent to follow up.
Never include passwords, session tokens, full addresses or private evidence in
the feedback document.

## Exit gate

The beta can expand only when there are no unresolved critical/high issues,
support requests are being monitored, database restore has been tested, privacy
copy has legal approval and the invited cohort completes the main journey on
both iOS and Android. Payments remain a separate later approval.
