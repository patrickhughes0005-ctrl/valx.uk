"use client";

import { useState } from "react";
import AdminDashboard from "./admin-dashboard";

const DEMO_CODE = "246810";

export default function AdminMFAGate({ signedInEmail, signOutHref }: { signedInEmail: string; signOutHref: string }) {
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  if (verified) return <AdminDashboard signedInEmail={signedInEmail} signOutHref={signOutHref} />;

  const verify = () => {
    if (code !== DEMO_CODE) {
      setError("Enter the six-digit prototype authenticator code.");
      return;
    }
    setError("");
    setVerified(true);
  };

  return <main className="access-shell">
    <section className="access-card mfa-card">
      <div className="brand-mark">2</div>
      <p className="eyebrow">SECOND FACTOR REQUIRED</p>
      <h1>Verify it’s you</h1>
      <p>Signed in as <strong>{signedInEmail}</strong>. Enter the six-digit code from the approved administrator’s authenticator.</p>
      <label className="mfa-input">Authenticator code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(event) => event.key === "Enter" && verify()} placeholder="000000" /></label>
      {error && <p className="mfa-error">{error}</p>}
      <button className="primary-action mfa-button" onClick={verify}>Verify and continue</button>
      <small className="demo-code">PROTOTYPE DEMO CODE · 246810</small>
      <a className="secondary-action" href={signOutHref}>Sign out</a>
      <div className="security-note"><span>MFA</span><b>Required for every admin session</b></div>
    </section>
  </main>;
}
