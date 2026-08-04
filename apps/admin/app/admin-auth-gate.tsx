"use client";

import { useEffect, useState } from "react";
import AdminDashboard from "./admin-dashboard";

type AdminSession = {
  token: string;
  user: { email: string; role: string };
};

const SESSION_KEY = "valx_admin_session";

export default function AdminAuthGate({ apiUrl }: { apiUrl: string }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [phase, setPhase] = useState<"login" | "mfa">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      setChecking(false);
      return;
    }
    try {
      const candidate = JSON.parse(stored) as AdminSession;
      fetch(`${apiUrl}/v1/me`, {
        headers: { authorization: `Bearer ${candidate.token}` }
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("expired");
          const body = (await response.json()) as {
            user: { email: string; role: string };
          };
          if (body.user.role !== "admin") throw new Error("not_admin");
          setSession({ token: candidate.token, user: body.user });
        })
        .catch(() => sessionStorage.removeItem(SESSION_KEY))
        .finally(() => setChecking(false));
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      setChecking(false);
    }
  }, [apiUrl]);

  const requestCode = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${apiUrl}/v1/admin/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error("invalid_credentials");
        if (response.status === 429) throw new Error("rate_limited");
        if (response.status === 503) throw new Error("email_delivery_failed");
        throw new Error("request_failed");
      }
      setPhase("mfa");
      setPassword("");
      setNotice(
        "A six-digit code has been sent by email. It expires in 10 minutes."
      );
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : "request_failed";
      setError(
        reason === "invalid_credentials"
          ? "The email or password is not recognised."
          : reason === "rate_limited"
            ? "Too many sign-in attempts. Wait 15 minutes before trying again."
            : reason === "email_delivery_failed"
              ? "Your password was accepted, but the security email could not be sent. Please try again shortly."
              : "Sign-in is temporarily unavailable. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${apiUrl}/v1/admin/auth/verify-mfa`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      if (!response.ok) throw new Error("invalid_code");
      const body = (await response.json()) as AdminSession;
      if (body.user.role !== "admin") throw new Error("not_admin");
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(body));
      setSession(body);
    } catch {
      setError("That code is invalid or has expired.");
    } finally {
      setBusy(false);
    }
  };

  const requestPasswordReset = async () => {
    setError("");
    setNotice("");
    if (!email) {
      setError("Enter your approved admin email first.");
      return;
    }
    await fetch(`${apiUrl}/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    }).catch(() => undefined);
    setNotice(
      "If that account exists, a password-reset email has been sent."
    );
  };

  const signOut = async () => {
    const token = session?.token;
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setPhase("login");
    setCode("");
    if (token) {
      await fetch(`${apiUrl}/v1/auth/logout`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` }
      }).catch(() => undefined);
    }
  };

  if (checking) {
    return (
      <main className="access-shell">
        <section className="access-card">
          <div className="brand-mark">V</div>
          <p className="eyebrow">ValX · ADMIN</p>
          <h1>Checking secure session</h1>
        </section>
      </main>
    );
  }

  if (session) {
    return (
      <AdminDashboard
        signedInEmail={session.user.email}
        sessionToken={session.token}
        apiUrl={apiUrl}
        onSignOut={signOut}
      />
    );
  }

  return (
    <main className="access-shell">
      <section className="access-card mfa-card">
        <div className="brand-mark">{phase === "login" ? "V" : "2"}</div>
        <p className="eyebrow">
          {phase === "login" ? "ValX · ADMIN" : "SECOND FACTOR REQUIRED"}
        </p>
        <h1>
          {phase === "login" ? "Private operations portal" : "Verify it’s you"}
        </h1>
        <p>
          {phase === "login"
            ? "Use an approved administrator account. Every successful sign-in also requires a time-limited email code."
            : `Enter the six-digit code sent to ${email}.`}
        </p>

        <div className="admin-login-fields">
          <label>
            Admin email
            <input
              type="email"
              autoComplete="username"
              value={email}
              disabled={phase === "mfa"}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {phase === "login" ? (
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && requestCode()}
              />
            </label>
          ) : (
            <label className="mfa-input">
              Email security code
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                onKeyDown={(event) => event.key === "Enter" && verifyCode()}
                placeholder="000000"
              />
            </label>
          )}
        </div>

        {notice && <p className="auth-notice">{notice}</p>}
        {error && <p className="mfa-error">{error}</p>}
        <button
          className="primary-action mfa-button"
          disabled={
            busy ||
            !email ||
            (phase === "login" ? !password : code.length !== 6)
          }
          onClick={phase === "login" ? requestCode : verifyCode}
        >
          {busy
            ? "Please wait…"
            : phase === "login"
              ? "Continue securely"
              : "Verify and continue"}
        </button>
        {phase === "login" ? (
          <button className="auth-link" onClick={requestPasswordReset}>
            Set or reset password
          </button>
        ) : (
          <button
            className="auth-link"
            onClick={() => {
              setPhase("login");
              setCode("");
              setNotice("");
              setError("");
            }}
          >
            Didn&apos;t receive it? Return and request a new code
          </button>
        )}
        <div className="security-note">
          <span>Private access</span>
          <b>Password + email MFA required</b>
        </div>
      </section>
    </main>
  );
}
