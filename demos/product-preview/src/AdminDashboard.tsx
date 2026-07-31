"use client";

import { useEffect, useMemo, useState } from "react";

type Section = "overview" | "detailers" | "customers" | "payments" | "payouts" | "jobs" | "finance" | "issues" | "documents" | "data" | "reconciliation" | "policies" | "audit" | "team";
type RecordItem = { id: string; title: string; subtitle: string; meta: string; amount?: string; status: string; tone?: "good" | "warn" | "bad" | "neutral"; detail: string };

const sectionMeta: Record<Section, { label: string; short: string; description: string }> = {
  overview: { label: "Overview", short: "OV", description: "Live operational position" },
  detailers: { label: "Detailer database", short: "DE", description: "Identity, availability and performance" },
  customers: { label: "Customer database", short: "CU", description: "Accounts, vehicles and booking history" },
  payments: { label: "Customer payments", short: "CP", description: "Charges and payment-provider references" },
  payouts: { label: "Detailer payouts", short: "DP", description: "Agreed subcontractor payment transfers" },
  jobs: { label: "Completed jobs", short: "CJ", description: "Completed work and evidence" },
  finance: { label: "Finance", short: "FI", description: "Customer sales, subcontractor costs, refunds and gross contribution" },
  issues: { label: "Complaints & issues", short: "IS", description: "Customer and detailer cases" },
  documents: { label: "Identity & documents", short: "ID", description: "Detailer identity, insurance and approvals" },
  data: { label: "Data controls", short: "DC", description: "Exports, deletion and retention requests" },
  reconciliation: { label: "Refunds & reconciliation", short: "RR", description: "Exceptions, disputes and settlement matching" },
  policies: { label: "Operating policies", short: "OP", description: "Booking, service and dispute rules" },
  audit: { label: "Admin activity log", short: "AL", description: "Permanent record of privileged actions" },
  team: { label: "Staff access", short: "SA", description: "Approved accounts, roles and permissions" },
};

const detailers: RecordItem[] = [
  { id: "DET-0108", title: "Jordan Miles", subtitle: "Water specialist · Oxfordshire", meta: "4.96 ★ · 560 jobs", status: "Approved", tone: "good", detail: "Identity verified · Insurance valid until 14 May 2027 · Payout account •••• 4218 · Instagram @jordan.details" },
  { id: "DET-0119", title: "Aisha Khan", subtitle: "Water specialist · Oxford", meta: "4.98 ★ · 720 jobs", status: "Approved", tone: "good", detail: "Identity verified · Insurance valid until 02 February 2027 · Payout account •••• 9091 · Instagram @aisha.autocare" },
  { id: "DET-0142", title: "Callum Reed", subtitle: "Standard detailer · Wallingford", meta: "4.91 ★ · 410 jobs", status: "Insurance review", tone: "warn", detail: "Identity verified · Replacement insurance document awaiting review · Payout account •••• 1570" },
  { id: "DET-0157", title: "Maya Patel", subtitle: "Applicant · Abingdon", meta: "0 jobs", status: "Approval required", tone: "warn", detail: "Photo identity uploaded · Insurance uploaded · Right-to-work declaration pending" },
];

const customers: RecordItem[] = [
  { id: "CUS-1842", title: "Alex Morgan", subtitle: "customer@example.com", meta: "2 vehicles · 8 bookings", status: "Active", tone: "good", detail: "Phone •••• 0123 · Water available · Last detail 21 July 2026 · No open complaints" },
  { id: "CUS-1928", title: "Sophie Lewis", subtitle: "s•••••@example.com", meta: "1 vehicle · 4 bookings", status: "Active", tone: "good", detail: "Phone •••• 4481 · Specialist water required · Last detail 28 July 2026 · Affiliate customer" },
  { id: "CUS-2014", title: "Marcus Taylor", subtitle: "m•••••@example.com", meta: "3 vehicles · 12 bookings", status: "Open issue", tone: "warn", detail: "Phone •••• 7310 · Water available · One open service-quality complaint" },
  { id: "CUS-2072", title: "Hannah Wood", subtitle: "h•••••@example.com", meta: "1 vehicle · 1 booking", status: "Active", tone: "good", detail: "Phone •••• 1904 · Water available · Joined 25 July 2026" },
];

const payments: RecordItem[] = [
  { id: "PAY-84301", title: "Full Detail · Range Rover Evoque", subtitle: "Customer CUS-1842 · 29 Jul 2026", meta: "Provider ref pi_•••4301", amount: "£120.00", status: "Captured", tone: "good", detail: "ValX customer sale £120.00 · Subcontractor cost £96.00 · Job margin £24.00 · Visa •••• 8182" },
  { id: "PAY-84287", title: "Exterior + Interior · Tesla Model 3", subtitle: "Customer CUS-1928 · 28 Jul 2026", meta: "Provider ref pi_•••4287", amount: "£72.50", status: "Captured", tone: "good", detail: "ValX customer sale £72.50 · Subcontractor cost £58.00 · Job margin £14.50 · Apple Pay tokenised payment" },
  { id: "PAY-84265", title: "Exterior · Ford Fiesta", subtitle: "Customer CUS-2014 · 28 Jul 2026", meta: "Provider ref pi_•••4265", amount: "£42.50", status: "Disputed", tone: "bad", detail: "Customer total £42.50 · Chargeback evidence due 04 August 2026 · PayPal reference masked" },
];

const payouts: RecordItem[] = [
  { id: "OUT-31308", title: "Jordan Miles", subtitle: "Job JOB-7731 · 29 Jul 2026", meta: "Bank •••• 4218", amount: "£96.00", status: "Paid instantly", tone: "good", detail: "The agreed subcontractor payment was transferred in full. This is ValX’s cost of supplying the customer service, not a customer sale less commission." },
  { id: "OUT-31294", title: "Aisha Khan", subtitle: "Job JOB-7728 · 28 Jul 2026", meta: "Bank •••• 9091", amount: "£58.00", status: "Paid instantly", tone: "good", detail: "Provider transfer po_•••1294 · Subcontractor payment matched to customer sale PAY-84287" },
  { id: "OUT-31277", title: "Callum Reed", subtitle: "Job JOB-7719 · 28 Jul 2026", meta: "Bank •••• 1570", amount: "£34.00", status: "Paid instantly", tone: "good", detail: "Provider transfer po_•••1277 · No payout deduction applied" },
];

const jobs: RecordItem[] = [
  { id: "JOB-7731", title: "Full Detail · Range Rover Evoque", subtitle: "Jordan Miles → Alex Morgan", meta: "29 Jul · 10:00–12:34 · OX1", amount: "£120.00", status: "Evidence complete", tone: "good", detail: "3 arrival photos · 4 completion photos · One pre-existing wheel blemish recorded · Customer rating pending" },
  { id: "JOB-7728", title: "Exterior + Interior · Tesla Model 3", subtitle: "Aisha Khan → Sophie Lewis", meta: "28 Jul · 14:30–15:56 · OX10", amount: "£72.50", status: "5 ★", tone: "good", detail: "3 arrival photos · 5 completion photos · No blemishes · Customer review received" },
  { id: "JOB-7719", title: "Exterior · Ford Fiesta", subtitle: "Callum Reed → Marcus Taylor", meta: "28 Jul · 09:30–10:21 · OX4", amount: "£42.50", status: "Issue open", tone: "warn", detail: "3 arrival photos · 3 completion photos · Customer complaint linked: ISS-1048" },
];

const issues: RecordItem[] = [
  { id: "ISS-1048", title: "Finish quality disputed", subtitle: "Customer complaint · JOB-7719", meta: "Opened 28 Jul · Owner: Support", status: "Needs response", tone: "bad", detail: "Customer reports missed wheel arch. Before/after evidence is available. Detailer response requested by 30 July." },
  { id: "ISS-1042", title: "Payout arrival query", subtitle: "Detailer issue · OUT-31241", meta: "Opened 26 Jul · Owner: Finance", status: "Investigating", tone: "warn", detail: "Provider reports successful transfer. Bank trace requested; the full agreed subcontractor payment was sent." },
  { id: "ISS-1033", title: "Reschedule request", subtitle: "Customer issue · JOB-7688", meta: "Opened 23 Jul · Owner: Operations", status: "Resolved", tone: "good", detail: "Booking moved to 25 July at 13:00 and both parties notified." },
];

const documents: RecordItem[] = [
  { id: "AGR-0142", title: "Jordan Miles · Subcontractor & self-billing agreement", subtitle: "Accepted 20 Jul 2026", meta: "Annual VAT-status review · due 20 Jul 2027", status: "Agreement active", tone: "good", detail: "The detailer supplies subcontracted work to ValX and agreed to self-billing. Current VAT status and document route are recorded. Any VAT-number change pauses VAT self-billing until reviewed." },
  { id: "DOC-591", title: "Callum Reed · Public liability insurance", subtitle: "Uploaded 28 Jul 2026", meta: "PDF · expires 28 Jul 2027", status: "Review required", tone: "warn", detail: "Replacement policy document. Confirm named insured, mobile detailing cover, policy number and expiry before approval." },
  { id: "DOC-588", title: "Maya Patel · Photo identity", subtitle: "Uploaded 27 Jul 2026", meta: "Image · identity check", status: "Review required", tone: "warn", detail: "Front and back captured. Compare name and date of birth with detailer application." },
  { id: "DOC-577", title: "Jordan Miles · Insurance", subtitle: "Approved 20 Jul 2026", meta: "PDF · expires 14 May 2027", status: "Approved", tone: "good", detail: "Approved by owner@valx.uk. Review reminder scheduled 30 days before expiry." },
];

const dataRequests: RecordItem[] = [
  { id: "DATA-204", title: "Customer data export", subtitle: "CUS-1928 · Sophie Lewis", meta: "Requested 28 Jul · due 27 Aug", status: "Prepare export", tone: "warn", detail: "Export scope: account profile, vehicles, addresses, bookings, payments, complaints and consent records." },
  { id: "DATA-199", title: "Account deletion", subtitle: "CUS-1766 · Former customer", meta: "Requested 22 Jul · legal hold checked", status: "Ready to anonymise", tone: "warn", detail: "Preserve statutory finance records in restricted form; remove marketing, saved addresses and device identifiers." },
  { id: "DATA-187", title: "Detailer data export", subtitle: "DET-0094 · Former detailer", meta: "Completed 18 Jul", status: "Completed", tone: "good", detail: "Encrypted export supplied. Download expired after seven days." },
];

const reconciliation: RecordItem[] = [
  { id: "REC-728", title: "PAY-84265 · Chargeback", subtitle: "Customer payment £42.50", meta: "Evidence due 04 Aug", amount: "£42.50", status: "Action required", tone: "bad", detail: "Attach booking acceptance, arrival/completion timestamps, before/after photos and customer communications." },
  { id: "REC-724", title: "OUT-31241 · Payout trace", subtitle: "Detailer payout £62.00", meta: "Provider settled · bank trace open", amount: "£62.00", status: "Investigating", tone: "warn", detail: "Payment provider marks transfer paid. Detailer bank reports missing credit; finance owns escalation." },
  { id: "REC-719", title: "Daily settlement · 27 Jul", subtitle: "18 customer charges · 18 payouts", meta: "Job sales £1,462.50", amount: "£292.50", status: "Reconciled", tone: "good", detail: "ValX customer sales £1,462.50 · Subcontractor costs £1,170.00 · Job margin £292.50 · Zero unexplained variance." },
];

const auditLog: RecordItem[] = [
  { id: "AUD-9321", title: "Admin MFA verified", subtitle: "owner@valx.uk", meta: "29 Jul 2026 · 14:02 · Session A19", status: "Recorded", tone: "good", detail: "Approved owner account completed the second-factor challenge. Session timeout set to 15 minutes of inactivity." },
  { id: "AUD-9318", title: "Insurance document approved", subtitle: "DOC-577 · Jordan Miles", meta: "29 Jul 2026 · 13:41", status: "Recorded", tone: "good", detail: "Approval performed by owner@valx.uk. Previous record retained; expiry reminder created." },
  { id: "AUD-9312", title: "Refund action recorded", subtitle: "REC-719 · daily settlement", meta: "29 Jul 2026 · 12:18", status: "Recorded", tone: "good", detail: "Reconciliation closed with zero unexplained variance. Linked customer payment and detailer payout references retained." },
  { id: "AUD-9304", title: "Customer record exported", subtitle: "CUS-1928 · data request", meta: "29 Jul 2026 · 10:26", status: "Recorded", tone: "warn", detail: "Encrypted export prepared by the owner. Download expiry set to seven days. Full payment and bank credentials excluded." },
  { id: "AUD-9297", title: "Staff role changed", subtitle: "operations@prototype.example", meta: "28 Jul 2026 · 17:05", status: "Recorded", tone: "warn", detail: "Role changed from Support to Operations by the owner. Permission before and after values retained." },
];

const navGroups: { title: string; items: Section[] }[] = [
  { title: "Operations", items: ["overview", "detailers", "customers", "jobs"] },
  { title: "Money", items: ["payments", "payouts", "finance", "reconciliation"] },
  { title: "Trust & safety", items: ["issues", "documents", "data", "policies"] },
  { title: "Administration", items: ["team", "audit"] },
];

const listData: Partial<Record<Section, RecordItem[]>> = { detailers, customers, payments, payouts, jobs, issues, documents, data: dataRequests, reconciliation, audit: auditLog };

export default function AdminDashboard({ signedInEmail, signOutHref }: { signedInEmail: string; signOutHref: string }) {
  const [section, setSection] = useState<Section>("overview");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [admins, setAdmins] = useState([{ email: "owner@valx.uk", role: "Owner", status: "Active" }]);
  const [pendingAdmins, setPendingAdmins] = useState([{ email: "operations@prototype.example", requested: "29 Jul 2026" }]);

  useEffect(() => {
    let timeout: ReturnType<typeof window.setTimeout>;
    const resetTimeout = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => window.location.assign(signOutHref), 15 * 60 * 1000);
    };
    const events: (keyof WindowEventMap)[] = ["click", "keydown", "pointermove", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimeout, { passive: true }));
    resetTimeout();
    return () => {
      window.clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, resetTimeout));
    };
  }, [signOutHref]);

  const records = listData[section] ?? [];
  const filtered = useMemo(() => records.filter((item) => `${item.id} ${item.title} ${item.subtitle} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [records, query]);

  const exportRows = () => {
    const rows = [["Reference", "Title", "Subtitle", "Amount", "Status"], ...filtered.map((item) => [item.id, item.title, item.subtitle, item.amount ?? "", item.status])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `my-garage-${section}-prototype.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const approveAdmin = (email: string) => {
    setAdmins((current) => [...current, { email, role: "Support", status: "Approved in prototype" }]);
    setPendingAdmins((current) => current.filter((item) => item.email !== email));
  };

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand"><img src="/valx-logo.png" alt="ValX" /><div><strong>ValX</strong><small>ADMIN CONTROL</small></div></div>
        <nav>
          {navGroups.map((group) => <div className="nav-group" key={group.title}><p>{group.title}</p>{group.items.map((item) => <button className={section === item ? "active" : ""} key={item} onClick={() => { setSection(item); setSelected(null); setQuery(""); }}><b>{sectionMeta[item].short}</b><span>{sectionMeta[item].label}</span>{item === "issues" && <em>2</em>}</button>)}</div>)}
        </nav>
        <div className="signed-in"><span>RT</span><div><strong>Owner</strong><small>{signedInEmail}</small></div><a href={signOutHref}>Sign out</a></div>
      </aside>

      <section className="workspace">
        <header className="workspace-head">
          <div><p>{sectionMeta[section].description}</p><h1>{sectionMeta[section].label}</h1></div>
          <div className="head-actions"><span className="secure-pill">MFA VERIFIED · 15 MIN TIMEOUT</span><button className="bell">2</button></div>
        </header>

        {section === "overview" && <Overview onOpen={setSection} />}
        {section === "finance" && <Finance />}
        {section === "policies" && <Policies />}
        {section === "team" && <TeamAccess admins={admins} setAdmins={setAdmins} pending={pendingAdmins} approve={approveAdmin} />}
        {records.length > 0 && <RecordSection section={section} records={filtered} query={query} setQuery={setQuery} onSelect={setSelected} onExport={exportRows} completedActions={completedActions} />}
      </section>

      {selected && <RecordDrawer item={selected} section={section} isDone={completedActions.includes(selected.id)} onClose={() => setSelected(null)} onAction={() => setCompletedActions((current) => [...current, selected.id])} />}
    </main>
  );
}

function Overview({ onOpen }: { onOpen: (section: Section) => void }) {
  return <div className="dashboard">
    <section className="metric-grid">
      <Metric label="Today’s customer payments" value="£1,534.32" change="Job value + 18 service fees" />
      <Metric label="Subcontractor costs" value="£1,170.00" change="Agreed detailer payments" />
      <Metric label="Gross contribution" value="£364.32" change="£292.50 job margin + £71.82 fees" />
      <Metric label="Completed jobs" value="18" change="2 in progress" />
    </section>
    <section className="overview-grid">
      <article className="panel cashflow-panel"><PanelHead eyebrow="TODAY’S PRINCIPAL MODEL" title="ValX sells the service" action="Open finance" onClick={() => onOpen("finance")} />
        <div className="money-flow"><div><small>ValX CUSTOMER SALES</small><strong>£1,534.32</strong></div><span>−</span><div><small>SUBCONTRACTOR COSTS</small><strong>£1,170.00</strong><em>Agreed detailer pay</em></div><span>=</span><div><small>GROSS CONTRIBUTION</small><strong>£364.32</strong><em>Job margin + service fees</em></div></div>
        <p>ValX is the customer-facing supplier and records the complete customer payment as a sale. Detailer payouts are subcontractor costs paid at the locked amount, with no later deduction.</p>
      </article>
      <article className="panel attention-panel"><PanelHead eyebrow="NEEDS ATTENTION" title="Operational queue" />
        {[["2", "Open complaints", "issues"], ["2", "Documents to approve", "documents"], ["1", "Chargeback action", "reconciliation"], ["2", "Data requests", "data"]].map(([count, label, target]) => <button key={label} onClick={() => onOpen(target as Section)}><b>{count}</b><span>{label}</span><em>→</em></button>)}
      </article>
    </section>
    <section className="panel activity-panel"><PanelHead eyebrow="LATEST ACTIVITY" title="Recent service events" />
      <div className="timeline">{[
        ["10:42", "Instant payout sent", "Jordan Miles received £96.00 for JOB-7731", "good"],
        ["10:39", "Job completed", "Full Detail · Range Rover Evoque · 7 photos attached", "good"],
        ["10:12", "Complaint received", "Customer CUS-2014 opened issue ISS-1048", "warn"],
        ["09:58", "Document uploaded", "Callum Reed submitted replacement insurance", "neutral"],
      ].map(([time, title, detail, tone]) => <div key={time + title}><time>{time}</time><i className={tone} /><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div>
    </section>
  </div>;
}

function Metric({ label, value, change }: { label: string; value: string; change: string }) {
  return <article className="metric"><small>{label}</small><strong>{value}</strong><span>{change}</span></article>;
}

function PanelHead({ eyebrow, title, action, onClick }: { eyebrow: string; title: string; action?: string; onClick?: () => void }) {
  return <header className="panel-head"><div><small>{eyebrow}</small><h2>{title}</h2></div>{action && <button onClick={onClick}>{action} →</button>}</header>;
}

function RecordSection({ section, records, query, setQuery, onSelect, onExport, completedActions }: { section: Section; records: RecordItem[]; query: string; setQuery: (value: string) => void; onSelect: (item: RecordItem) => void; onExport: () => void; completedActions: string[] }) {
  return <div className="records-page">
    <section className="toolbar"><label><span>⌕</span><input aria-label={`Search ${sectionMeta[section].label}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${sectionMeta[section].label.toLowerCase()}…`} /></label><button onClick={onExport}>Export CSV</button></section>
    <section className="records-panel">
      <div className="table-head"><span>Record</span><span>Reference</span><span>Amount / detail</span><span>Status</span><span /></div>
      {records.map((item) => <button className="record-row" key={item.id} onClick={() => onSelect(item)}>
        <span><strong>{item.title}</strong><small>{item.subtitle}</small></span><code>{item.id}</code><b>{item.amount ?? item.meta}</b><em className={completedActions.includes(item.id) ? "good" : item.tone}>{completedActions.includes(item.id) ? "Action complete" : item.status}</em><i>›</i>
      </button>)}
      {records.length === 0 && <div className="empty">No records match your search.</div>}
    </section>
    {section === "data" && <section className="retention-panel"><PanelHead eyebrow="RETENTION POLICY" title="Prototype data controls" /><div><span><strong>Booking and finance records</strong><small>Retain 7 years, then securely delete or anonymise</small></span><span><strong>Support evidence</strong><small>Retain 24 months after case closure</small></span><span><strong>Declined detailer documents</strong><small>Delete 90 days after final decision</small></span></div><p>Exports never include full card or bank credentials. Deletion requests preserve only records subject to statutory or active-dispute holds.</p></section>}
  </div>;
}

function Finance() {
  const months = [{ m: "Feb", gmv: 18800 }, { m: "Mar", gmv: 22400 }, { m: "Apr", gmv: 24100 }, { m: "May", gmv: 28700 }, { m: "Jun", gmv: 31900 }, { m: "Jul", gmv: 36400 }];
  return <div className="finance-page">
    <section className="metric-grid"><Metric label="July job sales" value="£36,400" change="+14.1% MoM" /><Metric label="Total turnover incl. fees" value="£38,035.90" change="Job sales + 410 service fees" /><Metric label="Subcontractor costs" value="£29,120" change="Agreed detailer pay" /><Metric label="Gross contribution" value="£8,915.90" change="Before overheads, VAT and tax" /></section>
    <section className="finance-grid">
      <article className="panel chart-panel"><PanelHead eyebrow="SIX-MONTH PERFORMANCE" title="Customer job sales" /><div className="bars">{months.map((item) => <div key={item.m}><span style={{ height: `${(item.gmv / 36400) * 100}%` }}><b>£{(item.gmv / 1000).toFixed(1)}k</b></span><small>{item.m}</small></div>)}</div></article>
      <article className="panel split-panel"><PanelHead eyebrow="JULY COST STRUCTURE" title="Job sales allocation" /><div className="donut"><div><strong>£36.4k</strong><small>job sales</small></div></div><div className="legend"><span><i />Subcontractor costs <b>£29,120 · 80%</b></span><span><i />Job margin <b>£7,280 · 20%</b></span></div></article>
    </section>
    <section className="panel finance-ledger"><PanelHead eyebrow="CONTROL TOTALS" title="Reconciliation summary" /><div className="ledger-row head"><span>Period</span><span>Customer sales</span><span>Subcontractor costs</span><span>Gross contribution</span><span>Variance</span></div>{[["29 Jul", "£1,534.32", "£1,170.00", "£364.32", "£0.00"], ["28 Jul", "£1,858.79", "£1,420.00", "£438.79", "£0.00"], ["27 Jul", "£1,378.84", "£1,052.00", "£326.84", "£0.00"]].map((row) => <div className="ledger-row" key={row[0]}>{row.map((cell, index) => <span className={index === 4 ? "zero" : ""} key={cell}>{cell}</span>)}</div>)}</section>
  </div>;
}

function Policies() {
  const controls = [
    ["Business structure", "Decision locked", "ValX operates as principal: the customer buys from ValX, ValX controls and invoices the service, and the attending detailer supplies subcontracted work to ValX for the agreed payout."],
    ["Cancellation & rescheduling", "Policy approved", "Free more than 24 hours before the booking; between 24 and 4 hours only the £3.99 service charge is retained; less than 4 hours before the booking, 50% of the job price is charged. Rescheduling follows the same windows and charges."],
    ["Customer no-show", "Policy approved", "The detailer waits 15 minutes and attempts contact. A 50% charge may be applied only when arrival and contact evidence have been submitted and reviewed."],
    ["Detailer cancellation & no-show", "Policy approved", "Verified illness, emergency, unsafe conditions, evidenced breakdown or circumstances outside the detailer’s control are excluded. A first unjustified incident triggers investigation and a written warning. A repeat within three months triggers a suspension review, never an automatic suspension."],
    ["Refunds & chargebacks", "Control active", "Freeze the disputed amount, preserve evidence, link provider references and record the final outcome in reconciliation."],
    ["Instant payout reversal", "Control active", "Never deduct silently. Create a visible negative settlement only after a documented refund, dispute or fraud decision."],
    ["Weather", "Policy approved", "Unsafe or impractical weather supports a no-fault reschedule with no penalty to either party. The customer and detailer receive the same status update."],
    ["Water, electricity & access", "Policy approved", "The customer normally provides safe access to water and electricity where the booked service requires them. Any self-sufficient specialist requirement must be declared during booking."],
    ["Extraordinary condition", "Policy approved", "Undisclosed pet hair, severe staining, excessive dirt or vehicle condition must be evidenced. The detailer submits a revised scope and quote; the customer must approve it before work continues."],
    ["Unsafe or inaccessible work", "Policy approved", "A detailer may refuse the job without penalty after submitting photographs and notes showing an unsafe location, inaccessible vehicle or unavailable required facilities."],
    ["Damage disputes", "Control active", "Customers must report damage within 24 hours. Lock timestamps, before/after images, blemish records and communications to the complaint case; investigate both sides without automatically assigning blame."],
    ["Insurance requirements", "Launch checklist", "Before approval, verify public liability and treatment-risk cover for mobile vehicle detailing, custody/control cover where applicable, and business-use motor insurance. Record insurer, policy number, scope and expiry; expired cover pauses new work."],
    ["Detailer subcontractor agreement", "Launch checklist", "Agreement must cover self-employed status, service standards, evidence, customer property, confidentiality, data protection, pay, cancellations, complaints, insurance, self-billing consent, tax responsibility and termination."],
    ["Self-billing", "Control active", "The detailer’s subcontractor agreement and VAT status are checked at onboarding and reviewed regularly. Non-VAT detailers receive a settlement statement from ValX."],
    ["Support contacts", "Launch blocker", "Replace both prototype support addresses with monitored customer and detailer inboxes before a real pilot."],
  ];
  return <div className="policies-page">
    <section className="access-banner"><span>RULES</span><div><small>CONTROLLED OPERATIONS</small><h2>Approved operating framework</h2><p>Commercial policies are approved for the prototype. Items marked <strong>Launch checklist</strong> require document verification before real jobs begin.</p></div></section>
    <section className="policy-admin-grid">{controls.map(([title, status, detail]) => <article className="panel policy-admin-card" key={title}><div><small>{status}</small><h3>{title}</h3></div><p>{detail}</p></article>)}</section>
  </div>;
}

function TeamAccess({ admins, setAdmins, pending, approve }: { admins: { email: string; role: string; status: string }[]; setAdmins: (value: { email: string; role: string; status: string }[]) => void; pending: { email: string; requested: string }[]; approve: (email: string) => void }) {
  const roles = ["Owner", "Operations", "Finance", "Support", "Compliance"];
  return <div className="team-page">
    <section className="access-banner"><span>LOCK</span><div><small>SERVER-SIDE ALLOWLIST</small><h2>Approved accounts only</h2><p>The initial approved account is <strong>owner@valx.uk</strong>. Portal records never expose full bank or card credentials.</p></div></section>
    <section className="panel team-panel"><PanelHead eyebrow="ACTIVE ADMIN ACCOUNTS" title="Staff roles and permissions" />
      <div className="team-head"><span>Account</span><span>Role</span><span>Status</span></div>
      {admins.map((admin, index) => <div className="team-row" key={admin.email}><span><b>{admin.email.slice(0,2).toUpperCase()}</b><strong>{admin.email}</strong></span><select value={admin.role} disabled={admin.role === "Owner"} onChange={(event) => setAdmins(admins.map((item, i) => i === index ? { ...item, role: event.target.value } : item))}>{roles.map((role) => <option key={role}>{role}</option>)}</select><em>{admin.status}</em></div>)}
    </section>
    <section className="panel pending-panel"><PanelHead eyebrow="ACCESS REQUESTS" title="Awaiting owner approval" />{pending.length ? pending.map((request) => <div key={request.email}><span><strong>{request.email}</strong><small>Requested {request.requested} · Prototype request</small></span><button onClick={() => approve(request.email)}>Approve as Support</button></div>) : <p>No pending access requests.</p>}</section>
    <section className="panel permissions"><PanelHead eyebrow="ROLE MATRIX" title="Access by responsibility" /><div className="permission-grid">{[
      ["Owner", "Everything, including staff access and retention controls"],
      ["Operations", "Customers, detailers, jobs and schedules"],
      ["Finance", "Payments, payouts, refunds and reconciliation"],
      ["Support", "Complaints, booking evidence and masked customer records"],
      ["Compliance", "Identity documents, insurance and data requests"],
    ].map(([role, scope]) => <div key={role}><strong>{role}</strong><span>{scope}</span></div>)}</div></section>
    <p className="prototype-warning">Prototype note: this screen demonstrates the approval workflow. Production access changes must update the server-side allowlist and identity provider together.</p>
  </div>;
}

function RecordDrawer({ item, section, isDone, onClose, onAction }: { item: RecordItem; section: Section; isDone: boolean; onClose: () => void; onAction: () => void }) {
  const immutable = section === "audit";
  const action = section === "documents" ? "Approve document" : section === "issues" ? "Mark resolved" : section === "data" ? "Complete request" : section === "reconciliation" ? "Record action" : "Add internal note";
  return <div className="drawer-scrim" onClick={onClose}><aside className="drawer" onClick={(event) => event.stopPropagation()}><header><span>{sectionMeta[section].short}</span><button onClick={onClose}>×</button></header><p className="eyebrow">{item.id}</p><h2>{item.title}</h2><p className="drawer-sub">{item.subtitle}</p><div className="drawer-status"><em className={isDone ? "good" : item.tone}>{isDone ? "Action complete" : item.status}</em>{item.amount && <strong>{item.amount}</strong>}</div><section><small>RECORD DETAILS</small><p>{item.detail}</p></section><section><small>SECURITY</small><p>{immutable ? "Audit entries are append-only and cannot be edited or deleted through the portal." : "Sensitive payment and bank values are masked. Access is limited by staff role."}</p></section><button className="drawer-action" disabled={isDone || immutable} onClick={onAction}>{immutable ? "Immutable audit entry" : isDone ? "✓ Action completed" : action}</button><button className="drawer-secondary" onClick={onClose}>Close record</button></aside></div>;
}
