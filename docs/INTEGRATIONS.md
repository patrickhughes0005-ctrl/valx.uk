# External integrations

## DVLA Vehicle Enquiry Service

ValX calls VES through the backend only.

- Mode: `DVLA_MODE=mock|live`; default is `mock`.
- Production endpoint:
  `POST https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles`
- Authentication: server-side `x-api-key`.
- Request body: normalised registration number without spaces or punctuation.
- Registration numbers must not be placed in URLs or routine logs.

As checked on 30 July 2026, DVLA is not accepting new VES API registrations
while it performs system upgrades. The mock adapter reproduces the approved
prototype vehicles and deterministic fallbacks. Switching to live mode requires
a DVLA-issued key, privacy review, logging redaction, rate-limit handling, and
contract tests against the DVLA test environment.

## Google Places

Address autocomplete uses the Places API (New) through the backend. The adapter
restricts suggestions to Great Britain and returns only place ID and display
text required by the client.

- Mode: `GOOGLE_MAPS_MODE=mock|live`; default is `mock`.
- Endpoint: `POST https://places.googleapis.com/v1/places:autocomplete`
- API key: server-side only.
- Persist place IDs and the customer-confirmed address fields needed for
  fulfilment. Do not broadly cache provider response content.

## Google Routes

Route estimation uses Routes API `computeRoutes` with place IDs, driving mode,
and traffic-aware routing.

- Endpoint:
  `POST https://routes.googleapis.com/directions/v2:computeRoutes`
- Field mask: distance and duration only for the initial quote path.
- Use returned distance to apply the approved travel rule.
- Treat ETA as approximate and refresh it for active jobs.

Before production enablement, publish compliant Terms and Privacy pages, review
EEA terms, configure billing/quota alerts, restrict the key by API and backend
egress, and implement required Google attribution. Most route content cannot be
cached indefinitely.

## Payments

There is deliberately no payment adapter, checkout endpoint, webhook, secret,
or provider SDK. Health responses and booking records state
`paymentState=not_connected`. A later payment decision must preserve ValX’s
principal model, full upfront customer total, locked detailer pay, refunds,
chargeback evidence, visible payout adjustments, and reconciliation controls.

