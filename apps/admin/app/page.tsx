import AdminDashboard from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default function Home() {
  if (process.env.ADMIN_PREVIEW_MODE !== "true") {
    return (
      <main className="access-shell">
        <section className="access-card">
          <div className="brand-mark">V</div>
          <p className="eyebrow">ValX · ADMIN</p>
          <h1>Private operations portal</h1>
          <p>
            Production access is disabled until the identity provider and
            mandatory administrator MFA are configured.
          </p>
          <div className="security-note">
            <span>Secure by default</span>
            <b>No preview access in this environment</b>
          </div>
        </section>
      </main>
    );
  }

  return (
    <AdminDashboard
      signedInEmail={process.env.ADMIN_PREVIEW_EMAIL ?? "admin@valx.local"}
      signOutHref="/"
    />
  );
}

