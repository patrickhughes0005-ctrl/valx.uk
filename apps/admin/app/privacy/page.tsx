import PublicShell from "../public-shell";

export const metadata = {
  title: "Privacy notice | ValX",
  description: "How ValX uses and protects personal information."
};
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const supportEmail = process.env.SUPPORT_EMAIL ?? "support@valx.uk";

  return (
    <PublicShell eyebrow="Effective 30 July 2026" title="Privacy notice">
      <p>
        VALX LIMITED (company number 17378672) provides vehicle detailing services and operates customer,
        detailer and administrative accounts. This notice explains the
        information used by the private beta. It must be read with the
        applicable customer or detailer terms.
      </p>

      <h2>Information we use</h2>
      <p>
        We use account and contact details, saved vehicles and registration
        numbers, service addresses, water availability, booking selections,
        journey status, support messages and security records. Detailer
        onboarding additionally uses trading details, service radius,
        water-supply and VAT information, a right-to-work declaration, photo
        identity and insurance documents. Bank details are not collected and
        payments remain disconnected in the private beta.
      </p>

      <h2>Why we use it</h2>
      <p>
        We use this information to create and secure accounts, calculate and
        fulfil bookings, match eligible detailers, provide support, investigate
        service issues, prevent misuse and meet legal obligations. The private
        beta does not connect to a payment provider and does not take payment.
      </p>

      <h2>Providers and international processing</h2>
      <p>
        ValX uses contracted infrastructure providers to host and protect the
        service. Google Places and Routes may process location queries when
        live mode is enabled. DVLA vehicle enquiry remains in mock mode until
        ValX is approved for live access. Provider access is limited to the
        purpose required to operate the service.
      </p>

      <h2>Retention</h2>
      <ul>
        <li>Booking and finance records: seven years, then delete or anonymise.</li>
        <li>Support evidence: 24 months after a case closes.</li>
        <li>Declined detailer documents: 90 days after the final decision.</li>
      </ul>
      <p>
        A deletion request removes information that ValX no longer needs.
        Restricted records may be retained where required by law or an active
        dispute.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can request access, correction, restriction, objection, portability
        or deletion where applicable. Account deletion can be started inside
        the ValX app or on the deletion page. You can also complain to the UK
        Information Commissioner&apos;s Office.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy and support enquiries: <strong>{supportEmail}</strong>.
      </p>
      <p className="public-callout">
        VALX LIMITED is registered in England and Wales. Registered-office
        information is available from Companies House under company number
        17378672.
      </p>
    </PublicShell>
  );
}
