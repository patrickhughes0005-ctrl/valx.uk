"use client";

import {
  bookingPolicies,
  dataRetentionPolicies,
  detailerPolicies,
  services
} from "@valx/pricing-policy";
import { useCallback, useEffect, useMemo, useState } from "react";
import DetailerOnboardingAdmin from "./detailer-onboarding-admin";

type Section = "overview" | "detailers" | "customers" | "payments" | "payouts" | "jobs" | "finance" | "issues" | "documents" | "data" | "reconciliation" | "policies" | "audit" | "team";
type RecordItem = { id: string; title: string; subtitle: string; meta: string; amount?: string; status: string; tone?: "good" | "warn" | "bad" | "neutral"; detail: string };
type Booking = {
  id: string;
  status: string;
  bookingType: string;
  scheduledFor: string | null;
  paymentState: "not_connected";
  serviceId: string;
  customerTotal: number;
  detailerEarnings: number;
  vehicle: { registrationNumber: string; make: string; model: string | null; type: string };
  address: { label: string; postcode: string; waterAvailable: boolean | null };
  customerName: string;
  detailerName: string | null;
};
type Dashboard = {
  generatedAt: string;
  paymentsConnected: false;
  metrics: {
    customers: number; detailers: number; approvedDetailers: number; bookings: number;
    activeBookings: number; completedBookings: number; bookingRequestValue: number;
    projectedDetailerCost: number; projectedContribution: number; capturedPayments: number;
    paidPayouts: number; openSupportRequests: number; pendingDeletionRequests: number;
  };
  customers: Array<{ id: string; name: string; email: string; phone: string | null; vehicleCount: number; bookingCount: number; createdAt: string }>;
  bookings: Booking[];
  supportRequests: Array<{ id: string; userEmail: string | null; category: string; message: string; status: string; createdAt: string }>;
  deletionRequests: Array<{ id: string; userEmail: string | null; status: string; reason: string | null; requestedAt: string }>;
  admins: Array<{ id: string; name: string; email: string; mfaRequired: boolean; createdAt: string }>;
  audit: Array<{ id: string; actorEmail: string | null; action: string; subjectType: string; subjectId: string; metadata: unknown; createdAt: string }>;
};

const sectionMeta: Record<Section, { label: string; short: string; description: string }> = {
  overview: { label: "Overview", short: "OV", description: "Live database position" },
  detailers: { label: "Detailer database", short: "DE", description: "Live onboarding and approvals" },
  customers: { label: "Customer database", short: "CU", description: "Live accounts and activity" },
  payments: { label: "Customer payments", short: "CP", description: "Payment-provider status" },
  payouts: { label: "Detailer payouts", short: "DP", description: "Payout-provider status" },
  jobs: { label: "Bookings & jobs", short: "BJ", description: "Live booking records" },
  finance: { label: "Finance", short: "FI", description: "Booking values; not captured revenue" },
  issues: { label: "Complaints & issues", short: "IS", description: "Live support requests" },
  documents: { label: "Identity & documents", short: "ID", description: "Private onboarding documents" },
  data: { label: "Data controls", short: "DC", description: "Live deletion requests and retention" },
  reconciliation: { label: "Refunds & reconciliation", short: "RR", description: "Unavailable until payments connect" },
  policies: { label: "Operating policies", short: "OP", description: "Approved shared policy package" },
  audit: { label: "Admin activity log", short: "AL", description: "Live append-only audit events" },
  team: { label: "Staff access", short: "SA", description: "Live administrator accounts" }
};
const navGroups: { title: string; items: Section[] }[] = [
  { title: "Operations", items: ["overview", "detailers", "customers", "jobs"] },
  { title: "Money", items: ["payments", "payouts", "finance", "reconciliation"] },
  { title: "Trust & safety", items: ["issues", "documents", "data", "policies"] },
  { title: "Administration", items: ["team", "audit"] }
];
const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const date = (value: string | null) => value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Not scheduled";
const statusText = (value: string) => value.replaceAll("_", " ");

export default function AdminDashboard({ signedInEmail, sessionToken, apiUrl, onSignOut }: { signedInEmail: string; sessionToken: string; apiUrl: string; onSignOut: () => void | Promise<void> }) {
  const [section, setSection] = useState<Section>("overview");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true); setError("");
    try {
      const response = await fetch(`${apiUrl}/v1/admin/dashboard`, { headers: { authorization: `Bearer ${sessionToken}` } });
      if (!response.ok) throw new Error("dashboard_failed");
      const result = await response.json() as { dashboard: Dashboard };
      setDashboard(result.dashboard);
    } catch { setError("Live Admin data could not be loaded. No sample data is being shown."); }
    finally { setRefreshing(false); }
  }, [apiUrl, sessionToken]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    let timeout: number | undefined;
    const resetTimeout = () => { window.clearTimeout(timeout); timeout = window.setTimeout(() => void onSignOut(), 15 * 60 * 1000); };
    const events: (keyof WindowEventMap)[] = ["click", "keydown", "pointermove", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimeout, { passive: true }));
    resetTimeout();
    return () => { window.clearTimeout(timeout); events.forEach((event) => window.removeEventListener(event, resetTimeout)); };
  }, [onSignOut]);

  const records = useMemo(() => dashboard ? recordsFor(section, dashboard) : [], [dashboard, section]);
  const filtered = useMemo(() => records.filter((item) => `${item.id} ${item.title} ${item.subtitle} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [records, query]);
  const exportRows = () => {
    const rows = [["Reference", "Title", "Subtitle", "Amount", "Status"], ...filtered.map((item) => [item.id, item.title, item.subtitle, item.amount ?? "", item.status])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = `valx-${section}-live.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const attention = (dashboard?.metrics.openSupportRequests ?? 0) + (dashboard?.metrics.pendingDeletionRequests ?? 0);
  const liveDetailerSection = section === "detailers" || section === "documents";
  const moneySection = section === "payments" || section === "payouts" || section === "reconciliation";

  return <main className="admin-shell">
    <aside className="sidebar">
      <div className="brand"><span>V</span><div><strong>ValX</strong><small>ADMIN CONTROL</small></div></div>
      <nav>{navGroups.map((group) => <div className="nav-group" key={group.title}><p>{group.title}</p>{group.items.map((item) => <button className={section === item ? "active" : ""} key={item} onClick={() => { setSection(item); setSelected(null); setQuery(""); }}><b>{sectionMeta[item].short}</b><span>{sectionMeta[item].label}</span>{item === "issues" && (dashboard?.metrics.openSupportRequests ?? 0) > 0 ? <em>{dashboard?.metrics.openSupportRequests}</em> : null}</button>)}</div>)}</nav>
      <div className="signed-in"><span>{signedInEmail.slice(0, 2).toUpperCase()}</span><div><strong>Administrator</strong><small>{signedInEmail}</small></div><button type="button" onClick={() => void onSignOut()}>Sign out</button></div>
    </aside>
    <section className="workspace">
      <div className="prototype-banner live-banner">LIVE DATABASE DATA - AUTOMATED SMOKE ACCOUNTS EXCLUDED - PAYMENTS NOT CONNECTED</div>
      <header className="workspace-head"><div><p>{sectionMeta[section].description}</p><h1>{sectionMeta[section].label}</h1></div><div className="head-actions"><span className="secure-pill">MFA VERIFIED - 15 MIN TIMEOUT</span><button className="bell" aria-label={`${attention} items need attention`}>{attention}</button><button className="refresh-admin" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "Refreshing..." : "Refresh"}</button></div></header>
      {error ? <p className="live-error">{error}</p> : null}
      {!dashboard && !error ? <section className="panel loading-live">Loading live database data...</section> : null}
      {dashboard && section === "overview" ? <Overview dashboard={dashboard} onOpen={setSection}/> : null}
      {dashboard && section === "finance" ? <Finance dashboard={dashboard}/> : null}
      {dashboard && section === "policies" ? <Policies/> : null}
      {dashboard && section === "team" ? <TeamAccess admins={dashboard.admins}/> : null}
      {dashboard && moneySection ? <MoneyNotConnected section={section}/> : null}
      {dashboard && liveDetailerSection ? <DetailerOnboardingAdmin apiUrl={apiUrl} token={sessionToken}/> : null}
      {dashboard && filtered.length > 0 ? <RecordSection section={section} records={filtered} query={query} setQuery={setQuery} onSelect={setSelected} onExport={exportRows}/> : null}
      {dashboard && !liveDetailerSection && !moneySection && !["overview", "finance", "policies", "team"].includes(section) && filtered.length === 0 ? <EmptyLive section={section}/> : null}
    </section>
    {selected ? <RecordDrawer item={selected} section={section} onClose={() => setSelected(null)}/> : null}
  </main>;
}

function recordsFor(section: Section, dashboard: Dashboard): RecordItem[] {
  if (section === "customers") return dashboard.customers.map((customer) => ({ id: customer.id, title: customer.name, subtitle: customer.email, meta: `${customer.vehicleCount} vehicles - ${customer.bookingCount} bookings`, status: "Active", tone: "good", detail: `${customer.phone ?? "No phone"} - joined ${date(customer.createdAt)}.` }));
  if (section === "jobs") return dashboard.bookings.map((booking) => ({ id: booking.id, title: services.find(({ id }) => id === booking.serviceId)?.name ?? booking.serviceId, subtitle: `${booking.customerName} - ${booking.vehicle.make} ${booking.vehicle.model ?? ""} - ${booking.address.postcode}`, meta: date(booking.scheduledFor), amount: money.format(booking.customerTotal), status: statusText(booking.status), tone: booking.status === "completed" ? "good" : booking.status === "cancelled" ? "bad" : "warn", detail: `Detailer: ${booking.detailerName ?? "not assigned"}. Locked detailer value: ${money.format(booking.detailerEarnings)}. Payment state: ${booking.paymentState}.` }));
  if (section === "issues") return dashboard.supportRequests.map((request) => ({ id: request.id, title: statusText(request.category), subtitle: request.userEmail ?? "Deleted or anonymous account", meta: date(request.createdAt), status: request.status, tone: request.status === "open" ? "warn" : "good", detail: request.message }));
  if (section === "data") return dashboard.deletionRequests.map((request) => ({ id: request.id, title: "Account deletion request", subtitle: request.userEmail ?? "Deleted account", meta: date(request.requestedAt), status: statusText(request.status), tone: request.status === "completed" ? "good" : "warn", detail: request.reason || "No reason supplied." }));
  if (section === "audit") return dashboard.audit.map((entry) => ({ id: entry.id, title: statusText(entry.action.replaceAll(".", " ")), subtitle: entry.actorEmail ?? "System/operator", meta: date(entry.createdAt), status: "Recorded", tone: "good", detail: `${entry.subjectType} ${entry.subjectId}. Metadata: ${JSON.stringify(entry.metadata)}` }));
  return [];
}

function Overview({ dashboard, onOpen }: { dashboard: Dashboard; onOpen: (section: Section) => void }) {
  const { metrics } = dashboard;
  return <div className="dashboard">
    <section className="metric-grid"><Metric label="Real customers" value={String(metrics.customers)} change="Smoke accounts excluded"/><Metric label="Approved detailers" value={`${metrics.approvedDetailers}/${metrics.detailers}`} change="Approved / real accounts"/><Metric label="Booking requests" value={String(metrics.bookings)} change={`${metrics.activeBookings} currently active`}/><Metric label="Captured payments" value={String(metrics.capturedPayments)} change="Provider not connected"/></section>
    <section className="overview-grid"><article className="panel cashflow-panel"><PanelHead eyebrow="DATABASE-BACKED VALUES" title="Booking requests, not revenue" action="Open finance" onClick={() => onOpen("finance")}/><div className="money-flow"><div><small>REQUEST VALUE</small><strong>{money.format(metrics.bookingRequestValue)}</strong></div><span>-</span><div><small>PROJECTED DETAILER COST</small><strong>{money.format(metrics.projectedDetailerCost)}</strong><em>Not paid</em></div><span>=</span><div><small>PROJECTED CONTRIBUTION</small><strong>{money.format(metrics.projectedContribution)}</strong><em>Not earned</em></div></div><p>These values come from stored booking quotes. They are not sales, cash, turnover or payouts because payment routing is disconnected.</p></article><article className="panel attention-panel"><PanelHead eyebrow="NEEDS ATTENTION" title="Live operational queue"/><button onClick={() => onOpen("issues")}><b>{metrics.openSupportRequests}</b><span>Open support requests</span><em>&gt;</em></button><button onClick={() => onOpen("data")}><b>{metrics.pendingDeletionRequests}</b><span>Pending deletion requests</span><em>&gt;</em></button><button onClick={() => onOpen("documents")}><b>{metrics.detailers - metrics.approvedDetailers}</b><span>Detailers not yet approved</span><em>&gt;</em></button></article></section>
    <section className="panel activity-panel"><PanelHead eyebrow="LATEST DATABASE EVENTS" title="Recent activity"/><div className="timeline">{dashboard.audit.slice(0, 8).map((entry) => <div key={entry.id}><time>{new Date(entry.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</time><i className="good"/><span><strong>{statusText(entry.action.replaceAll(".", " "))}</strong><small>{entry.actorEmail ?? "System/operator"} - {entry.subjectType}</small></span></div>)}{dashboard.audit.length === 0 ? <p>No audit events yet.</p> : null}</div></section>
  </div>;
}

function Finance({ dashboard }: { dashboard: Dashboard }) { const { metrics } = dashboard; return <div className="finance-page"><section className="metric-grid"><Metric label="Booking request value" value={money.format(metrics.bookingRequestValue)} change="Not captured revenue"/><Metric label="Projected detailer cost" value={money.format(metrics.projectedDetailerCost)} change="No payout sent"/><Metric label="Projected contribution" value={money.format(metrics.projectedContribution)} change="Not earned"/><Metric label="Completed bookings" value={String(metrics.completedBookings)} change="Includes no-payment pilot jobs"/></section><section className="panel disconnected-panel"><PanelHead eyebrow="FINANCE STATUS" title="Payment routing is not connected"/><p>The database contains quote and booking values only. It contains no successful customer charges, payout transfers, refunds, chargebacks or settlement records. Do not use these figures as company accounts or turnover.</p></section></div>; }
function MoneyNotConnected({ section }: { section: Section }) { const copy = section === "payments" ? "No customer payment provider is connected. ValX cannot charge a card, Apple Pay, Google Pay or bank account." : section === "payouts" ? "No detailer payout provider or bank routing is connected. ValX cannot send a payout." : "There are no payment settlements, refunds or chargebacks to reconcile because payment routing is disconnected."; return <section className="panel disconnected-panel"><PanelHead eyebrow="LIVE STATUS" title="Not connected"/><strong>0 real transactions</strong><p>{copy}</p><p>When payments are implemented, provider webhooks, idempotency, ledger entries, refunds, payout controls and reconciliation must be tested before this section can display money.</p></section>; }
function Policies() { const items = [["Business model", bookingPolicies.businessModel], ["Cancellation over 24 hours", bookingPolicies.cancellation.moreThan24Hours], ["Customer no-show", bookingPolicies.customerNoShow], ["Weather", bookingPolicies.weather], ["Facilities", bookingPolicies.facilities], ["Insurance", detailerPolicies.insurance], ["Subcontractor agreement", detailerPolicies.subcontractorAgreement], ["Self-billing", detailerPolicies.selfBilling], ["Booking retention", dataRetentionPolicies.bookingAndFinance], ["Support retention", dataRetentionPolicies.supportEvidence]]; return <div className="policies-page"><section className="access-banner"><span>RULES</span><div><small>SHARED POLICY PACKAGE</small><h2>Approved operating framework</h2><p>These statements are loaded from the same version-controlled package used by the API.</p></div></section><section className="policy-admin-grid">{items.map(([title, detail]) => <article className="panel policy-admin-card" key={title}><div><small>CURRENT</small><h3>{title}</h3></div><p>{detail}</p></article>)}</section></div>; }
function TeamAccess({ admins }: { admins: Dashboard["admins"] }) { return <div className="team-page"><section className="access-banner"><span>LOCK</span><div><small>LIVE ADMIN DATABASE</small><h2>{admins.length} active administrator account{admins.length === 1 ? "" : "s"}</h2><p>Every listed account requires password and email MFA. Shared access should be replaced by individual accounts before the team grows.</p></div></section><section className="panel team-panel"><PanelHead eyebrow="ACTIVE ADMIN ACCOUNTS" title="Database records"/><div className="team-head"><span>Account</span><span>Security</span><span>Status</span></div>{admins.map((admin) => <div className="team-row" key={admin.id}><span><b>{admin.name.slice(0,2).toUpperCase()}</b><strong>{admin.email}</strong></span><span>{admin.mfaRequired ? "Password + email MFA" : "MFA missing"}</span><em>{admin.mfaRequired ? "Active" : "Action required"}</em></div>)}</section></div>; }
function Metric({ label, value, change }: { label: string; value: string; change: string }) { return <article className="metric"><small>{label}</small><strong>{value}</strong><span>{change}</span></article>; }
function PanelHead({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) { return <header className="panel-head"><div><small>{eyebrow}</small><h2>{title}</h2></div>{action ? <button onClick={onClick}>{action} &gt;</button> : null}</header>; }
function RecordSection({ section, records, query, setQuery, onSelect, onExport }: { section: Section; records: RecordItem[]; query: string; setQuery: (value: string) => void; onSelect: (item: RecordItem) => void; onExport: () => void }) { return <div className="records-page"><section className="toolbar"><label><span>Search</span><input aria-label={`Search ${sectionMeta[section].label}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${sectionMeta[section].label.toLowerCase()}`}/></label><button onClick={onExport}>Export live CSV</button></section><section className="records-panel"><div className="table-head"><span>Record</span><span>Reference</span><span>Amount / detail</span><span>Status</span><span/></div>{records.map((item) => <button className="record-row" key={item.id} onClick={() => onSelect(item)}><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><code>{item.id}</code><b>{item.amount ?? item.meta}</b><em className={item.tone}>{item.status}</em><i>&gt;</i></button>)}</section></div>; }
function EmptyLive({ section }: { section: Section }) { return <section className="records-panel"><div className="empty">No live {sectionMeta[section].label.toLowerCase()} records exist.</div></section>; }
function RecordDrawer({ item, section, onClose }: { item: RecordItem; section: Section; onClose: () => void }) { return <div className="drawer-scrim" onClick={onClose}><aside className="drawer" onClick={(event) => event.stopPropagation()}><header><span>LIVE</span><button onClick={onClose}>x</button></header><p className="eyebrow">{item.id}</p><h2>{item.title}</h2><p className="drawer-sub">{item.subtitle}</p><div className="drawer-status"><em className={item.tone}>{item.status}</em>{item.amount ? <strong>{item.amount}</strong> : null}</div><section><small>DATABASE RECORD</small><p>{item.detail}</p></section><section><small>ACCESS</small><p>This view is read-only and requires an authenticated administrator session.</p></section><button className="drawer-secondary" onClick={onClose}>Close record</button></aside></div>; }
