"use client";

import { useState } from "react";

export default function AdminResetPasswordForm({
  apiUrl,
  token
}: {
  apiUrl: string;
  token: string;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!token) {
      setError("This reset link is incomplete. Request a new one from the Admin Site.");
      return;
    }
    if (password.length < 10) {
      setError("Use a password containing at least 10 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${apiUrl}/v1/auth/reset-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      if (!response.ok) throw new Error("reset_failed");
      setPassword("");
      setConfirmation("");
      setComplete(true);
      window.history.replaceState({}, "", "/reset-password");
    } catch {
      setError("That reset link has expired or was already used. Request a new one from the Admin Site.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="access-shell">
      <section className="access-card mfa-card">
        <div className="brand-mark">V</div>
        <p className="eyebrow">VALX · ADMIN</p>
        <h1>{complete ? "Password updated" : "Choose a new password"}</h1>
        <p>
          {complete
            ? "Your Admin password has been changed. Return to the private portal to sign in and receive an email security code."
            : "This password is for the ValX Admin Site only. It should be different from your IONOS mailbox password."}
        </p>

        {!complete && (
          <div className="admin-login-fields">
            <label>
              New Admin password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && submit()}
              />
            </label>
          </div>
        )}

        {error && <p className="mfa-error">{error}</p>}
        {complete ? (
          <a className="primary-action mfa-button" href="/">
            Return to Admin sign in
          </a>
        ) : (
          <button
            className="primary-action mfa-button"
            disabled={busy || !password || !confirmation}
            onClick={submit}
          >
            {busy ? "Updating securely…" : "Change Admin password"}
          </button>
        )}

        {!complete && (
          <a className="auth-link" href="/">
            Back to Admin sign in
          </a>
        )}
        <div className="security-note">
          <span>Private access</span>
          <b>One-time link · Sessions revoked</b>
        </div>
      </section>
    </main>
  );
}
