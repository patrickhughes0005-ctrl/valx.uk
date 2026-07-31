# ADR 0001: Prototype Sites are the approved specification

- Status: Accepted
- Date: 2026-07-30

## Decision

ValX Site version 23 and Detail Admin Site version 8 are preserved under
`reference/` as the approved visual, commercial, policy, and journey baseline.
Production code centralises shared rules and may improve implementation quality
without silently altering observable product decisions.

## Consequences

- Pricing and policies have automated regression tests.
- The orange brand and absence of a slogan are explicit tokens.
- Prototype-only authentication and payments are not promoted into production.
- Future product changes require an approval record, updated tests, and an
  updated versioned policy or pricing package.

