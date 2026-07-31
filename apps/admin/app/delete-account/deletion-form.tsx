"use client";

import { FormEvent, useState } from "react";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function DeletionForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const login = await fetch(`${apiUrl}/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const loginResult = await login.json();
      if (!login.ok) throw new Error("login_failed");

      const deletion = await fetch(`${apiUrl}/v1/account/deletion-request`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${loginResult.token}`
        },
        body: JSON.stringify({
          confirmation: "DELETE",
          reason: reason.trim() || undefined
        })
      });
      if (!deletion.ok) throw new Error("deletion_failed");
      setPassword("");
      setStatus(
        "Your deletion request has been recorded and all sessions have been signed out."
      );
    } catch {
      setStatus(
        "The request could not be verified. Check your ValX email and password or contact support."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="deletion-form" onSubmit={submit}>
      <label>
        ValX account email
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        Password
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label>
        Reason (optional)
        <textarea
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <button disabled={busy} type="submit">
        {busy ? "Submitting…" : "Request account deletion"}
      </button>
      {status ? <p role="status">{status}</p> : null}
    </form>
  );
}
