import Link from "next/link";
import PublicShell from "../public-shell";

export const metadata = {
  title: "Support | ValX",
  description: "Get help with a ValX account or booking."
};
export const dynamic = "force-dynamic";

export default function SupportPage() {
  const supportEmail = process.env.SUPPORT_EMAIL ?? "support@valx.uk";

  return (
    <PublicShell eyebrow="VALX HELP" title="Support">
      <p>
        Signed-in beta users can send a support request from Account in the
        ValX app. Requests are recorded against the account so the team can
        respond with the correct booking context.
      </p>
      <h2>Contact</h2>
      <p>
        Monitored support email: <strong>{supportEmail}</strong>
      </p>
      <h2>Include in your message</h2>
      <ul>
        <li>The email address used for ValX.</li>
        <li>The booking date and vehicle registration where relevant.</li>
        <li>A concise description of what happened.</li>
      </ul>
      <p>
        Do not email passwords, bank details, card details or identity
        documents. Payments are not connected in the private beta.
      </p>
      <p>
        To close your account, use the{" "}
        <Link href="/delete-account">account deletion page</Link>.
      </p>
    </PublicShell>
  );
}
