export const bookingPolicies = {
  businessModel:
    "ValX is the customer-facing principal. Customers buy from ValX; detailers provide subcontracted work to ValX for the agreed payout.",
  cancellation: {
    moreThan24Hours: "Free cancellation or rescheduling.",
    fourTo24Hours: "Retain only the £3.99 service fee.",
    lessThan4Hours: "Charge 50% of the job price.",
    reschedulingUsesSameWindows: true
  },
  customerNoShow:
    "The detailer waits 15 minutes and attempts contact. A 50% charge may be applied only after arrival and contact evidence are reviewed.",
  detailerCancellation:
    "Verified illness, emergency, unsafe conditions, evidenced breakdown, or circumstances outside the detailer’s control are excluded. A first unjustified incident triggers investigation and a written warning. A repeat within three months triggers a suspension review, never automatic suspension.",
  refundsAndChargebacks:
    "Freeze the disputed amount, preserve evidence, link provider references, and record the final outcome in reconciliation.",
  payoutReversal:
    "Never deduct silently. Create a visible negative settlement only after a documented refund, dispute, or fraud decision.",
  weather:
    "Unsafe or impractical weather supports a no-fault reschedule with no penalty to either party.",
  facilities:
    "The customer normally provides safe access to water and electricity where required. Self-sufficient specialist requirements must be declared during booking.",
  extraordinaryCondition:
    "Undisclosed pet hair, severe staining, excessive dirt, or vehicle condition must be evidenced. A revised scope and quote require customer approval before work continues.",
  unsafeOrInaccessible:
    "A detailer may refuse without penalty after submitting photographs and notes showing an unsafe location, inaccessible vehicle, or unavailable required facilities.",
  damage:
    "Customers must report damage within 24 hours. Preserve timestamps, before-and-after images, blemish records, and communications; investigate both sides without automatically assigning blame."
} as const;

export const dataRetentionPolicies = {
  bookingAndFinance: "7 years, then securely delete or anonymise",
  supportEvidence: "24 months after case closure",
  declinedDetailerDocuments: "90 days after final decision",
  exports:
    "Never include full card or bank credentials. Preserve only records subject to statutory or active-dispute holds."
} as const;

export const detailerPolicies = {
  insurance:
    "Verify public liability and treatment-risk cover for mobile vehicle detailing, custody/control cover where applicable, and business-use motor insurance. Expired cover pauses new work.",
  subcontractorAgreement:
    "Cover self-employed status, service standards, evidence, customer property, confidentiality, data protection, pay, cancellations, complaints, insurance, self-billing consent, tax responsibility, and termination.",
  selfBilling:
    "Check the subcontractor agreement and VAT status at onboarding and regularly thereafter. Non-VAT detailers receive a settlement statement."
} as const;

export const affiliateRewardPolicies = {
  customerFirstServiceDiscountRate: 0.1,
  detailerPointsPerFirstCompletedReferral: 10,
  awardTrigger:
    "Award once when the referred customer's first booking reaches completed status.",
  exclusions:
    "Registration alone, cancelled bookings and every later booking award no points.",
  rewardType:
    "Points for the ValX detailer supplies section only; no commission or cash payout.",
  suppliesCatalogue: "Products and point prices are TBC. Redemption is disabled."
} as const;
