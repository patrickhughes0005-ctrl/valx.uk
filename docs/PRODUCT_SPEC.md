# Approved product specification

Source of truth: ValX customer/detailer Site version 23 and Detail Admin Site
version 8, imported under `reference/`.

## Brand

- Product name: **ValX**
- Primary brand colour: **orange `#FF8A1F`**
- Dark product background: `#0C0E0D`
- ValX has **no slogan**. Do not invent or add one.
- Tone: concise, assured, practical, premium without sounding exclusive.

## Approved services and base prices

| Service | Base duration | Base price |
| --- | ---: | ---: |
| Exterior Detail | 60 minutes | £40 |
| Exterior + Interior | 90 minutes | £70 |
| Deep Detail | 210 minutes | £120 |
| Premium Full Detail | 300 minutes | £175 |

## Approved quote order

1. Start with the selected service base price and duration.
2. Apply the vehicle price and time multiplier.
3. Round predicted duration up to the next five minutes.
4. Include the first 3 travel miles; add £1.10 for each additional mile.
5. Add £2 for Next Available / fast-track.
6. If eligible, apply 10% affiliate discount to the job price.
7. ValX job margin is 20% of the resulting job price.
8. Detailer pay is the remaining 80% and is the full amount displayed before
   job acceptance.
9. Add the fixed £3.99 service fee to the customer total.

| Vehicle | Price multiplier | Time multiplier |
| --- | ---: | ---: |
| Hatchback | 1.00 | 1.00 |
| Sedan | 1.05 | 1.05 |
| Coupe | 1.05 | 1.05 |
| SUV | 1.15 | 1.15 |
| Pickup | 1.20 | 1.20 |
| Other | 1.10 | 1.10 |

ValX is the principal: the complete customer job price is a ValX sale and the
agreed detailer pay is a subcontractor cost. It must not be described as the
customer paying a detailer and ValX deducting commission.

## Customer journey

1. Choose Customer and sign in or create an account.
2. New customers provide name, email, phone, password, optional affiliate code,
   and water availability.
3. Manage garage vehicles. Registration lookup prefills known facts; the
   customer confirms vehicle body type because it affects price and duration.
4. Save and pin a service address using place search.
5. Choose one of the four services.
6. Choose Priority Pick, Prebook, or Next Available.
7. Select a detailer/time or wait for matching as appropriate.
8. Review a locked itemised quote before confirming.
9. Track scheduled, on-way, and arrived states with approximate ETA language.
10. Review history, evidence, rating, account, notification, support, and
    policy controls.

## Detailer journey

1. Choose Detailer and sign in or create an account.
2. New detailers provide personal details, water-supply status, payout bank
   details, VAT status/number, and later required identity/insurance evidence.
3. Browse jobs within the configured radius. Specialist-only water jobs are
   visible only to qualified detailers.
4. See guaranteed pay, vehicle, service, location, distance, and ETA before
   accepting.
5. Navigate, slide to confirm arrival, capture at least three before photos,
   optionally mark pre-existing blemishes, and start work.
6. Finish work, capture at least three after photos, and complete the job.
7. See the full displayed pay and the appropriate permanent self-billing
   document.
8. Manage schedule, activity, affiliate rewards, supplies, insurance, VAT,
   radius, water status, profile, and payout account.

### Affiliate points

- Each approved detailer may confirm one unique, permanent affiliate code of
  4-20 letters or numbers.
- A new customer may provide that code during registration. The referral is
  permanently attributed to the detailer and cannot be changed later.
- The customer receives the approved 10% discount on their first service.
- The detailer receives 10 points exactly once, only after that customer's
  first booking reaches `completed`.
- Registration, cancellation and every subsequent booking award no points.
- Points are not commission, cash or a payout. They will be redeemable only in
  the detailer supplies section. Catalogue items and point prices remain TBC,
  so redemption is disabled until a catalogue is approved.

## Admin journey

1. Sign in with an approved administrator account and complete MFA.
2. Enforce a 15-minute idle session.
3. Operate overview, detailers, customers, completed jobs, customer payments,
   detailer payouts, finance, reconciliation, complaints, documents, data
   controls, policies, staff access, and immutable audit records.
4. Mask bank/payment values and export only authorised fields.
5. Separate operations, finance, support, read-only and owner permissions.

## Approved operating policies

- Cancellation/rescheduling: free over 24 hours; 24–4 hours retains only the
  £3.99 service fee; under 4 hours charges 50% of job price.
- Customer no-show: detailer waits 15 minutes and attempts contact. A 50%
  charge requires reviewed arrival/contact evidence.
- Detailer no-show: verified illness, emergency, unsafe conditions, evidenced
  breakdown, or external circumstances are excluded. First unjustified event is
  investigated with written warning; a repeat within three months triggers a
  suspension review, never automatic suspension.
- Weather: unsafe or impractical weather supports no-fault rescheduling.
- Facilities: customers normally provide safe water/electricity access where
  required; self-sufficient specialists must be declared during booking.
- Extraordinary condition: extra scope needs evidence, a revised quote, and
  explicit customer approval before work continues.
- Unsafe/inaccessible work: detailers may refuse without penalty with photos
  and notes.
- Damage: report within 24 hours and preserve timestamps, images, blemish
  records, and communications for neutral investigation.
- Refunds/chargebacks: freeze the disputed amount, preserve evidence, link
  provider references, and reconcile the outcome.
- Payout reversals: never deduct silently; use a visible negative settlement
  only after a documented decision.

## Data retention

- Booking and finance records: 7 years, then securely delete or anonymise.
- Support evidence: 24 months after case closure.
- Declined detailer documents: delete 90 days after final decision.
- Exports exclude full card and bank credentials.
- Deletion requests preserve only statutory or active-dispute holds.
