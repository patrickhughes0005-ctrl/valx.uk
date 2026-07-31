import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import AdminMFAGate from "./admin-mfa-gate";

export const dynamic = "force-dynamic";

const INITIAL_ADMIN_EMAIL = "reecetomo@hotmail.co.uk";

export default async function Home() {
  const user = await getChatGPTUser();

  if (!user) {
    return (
      <main className="access-shell">
        <section className="access-card">
          <div className="brand-mark">V</div>
          <p className="eyebrow">ValX · ADMIN</p>
          <h1>Private operations portal</h1>
          <p>This portal contains confidential customer, detailer and financial information. Sign in with an approved account to continue.</p>
          <a className="primary-action" href={chatGPTSignInPath("/")}>Sign in securely</a>
          <div className="security-note"><span>Private access</span><b>Approved accounts only</b></div>
        </section>
      </main>
    );
  }

  if (user.email.toLowerCase() !== INITIAL_ADMIN_EMAIL) {
    return (
      <main className="access-shell">
        <section className="access-card">
          <div className="brand-mark denied">!</div>
          <p className="eyebrow">ACCESS NOT APPROVED</p>
          <h1>This account is not authorised</h1>
          <p><strong>{user.email}</strong> is signed in, but it is not on the admin allowlist. An existing owner must approve the account before it can access confidential records.</p>
          <a className="secondary-action" href={chatGPTSignOutPath("/")}>Sign out and use another account</a>
        </section>
      </main>
    );
  }

  return <AdminMFAGate signedInEmail={user.email} signOutHref={chatGPTSignOutPath("/")} />;
}
