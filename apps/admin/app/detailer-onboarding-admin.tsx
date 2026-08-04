"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DocumentRecord = {
  id: string;
  type: "identity" | "public_liability_insurance" | "motor_insurance";
  status: "pending" | "approved" | "rejected";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
  uploadedAt: string;
  reviewNotes: string | null;
};

type DetailerRecord = {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  businessName: string | null;
  tradingAddress: string | null;
  operatingPostcode: string | null;
  experienceYears: number | null;
  ownWaterSupply: boolean;
  serviceRadiusMiles: number;
  vatRegistered: boolean;
  vatNumber: string | null;
  instagram: string | null;
  rightToWorkDeclared: boolean;
  termsAccepted: boolean;
  status: "draft" | "submitted" | "changes_requested" | "approved" | "rejected";
  submittedAt: string | null;
  approvedAt: string | null;
  reviewNotes: string | null;
  documents: DocumentRecord[];
};

const labels: Record<DocumentRecord["type"], string> = {
  identity: "Photo identity",
  public_liability_insurance: "Public liability insurance",
  motor_insurance: "Business-use motor insurance"
};
const humanStatus = (value: string) => value.replaceAll("_", " ");

export default function DetailerOnboardingAdmin({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [detailers, setDetailers] = useState<DetailerRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const request = useCallback(async <T,>(path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set("authorization", `Bearer ${token}`);
    if (options.body) headers.set("content-type", "application/json");
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(body?.error ?? "request_failed");
    return body as T;
  }, [apiUrl, token]);

  const refresh = useCallback(async () => {
    const result = await request<{ detailers: DetailerRecord[] }>("/v1/admin/detailers");
    setDetailers(result.detailers);
  }, [request]);

  useEffect(() => { refresh().catch(() => setError("The live detailer records could not be loaded.")); }, [refresh]);

  const selected = detailers.find(({ userId }) => userId === selectedId) ?? null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return detailers;
    return detailers.filter((detailer) =>
      `${detailer.name} ${detailer.email} ${detailer.businessName ?? ""} ${detailer.operatingPostcode ?? ""} ${detailer.status}`.toLowerCase().includes(needle)
    );
  }, [detailers, query]);

  const invite = async () => {
    setBusy(true); setNotice(""); setError("");
    try {
      const result = await request<{ delivery: "sent" | "delayed" }>("/v1/admin/detailer-invitations", {
        method: "POST", body: JSON.stringify({ email: inviteEmail })
      });
      setInviteEmail("");
      setNotice(result.delivery === "sent" ? "The secure single-use invitation has been emailed." : "The invitation was created, but email delivery needs attention.");
    } catch { setError("The invitation could not be created."); }
    finally { setBusy(false); }
  };

  const review = async (decision: "approved" | "changes_requested" | "rejected") => {
    if (!selected) return;
    setBusy(true); setNotice(""); setError("");
    try {
      await request(`/v1/admin/detailers/${selected.userId}/review`, { method: "PATCH", body: JSON.stringify({ decision, notes }) });
      setNotice(`Application ${humanStatus(decision)} and audit entry recorded.`);
      setNotes("");
      await refresh();
    } catch { setError("That review could not be recorded. Refresh and try again."); }
    finally { setBusy(false); }
  };

  const download = async (document: DocumentRecord) => {
    setError("");
    try {
      const response = await fetch(`${apiUrl}/v1/admin/detailer-documents/${document.id}`, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("download_failed");
      const url = URL.createObjectURL(await response.blob());
      const anchor = window.document.createElement("a");
      anchor.href = url; anchor.download = document.originalName; anchor.click(); URL.revokeObjectURL(url);
    } catch { setError("The private document could not be downloaded."); }
  };

  return <div className="onboarding-admin">
    <section className="panel invite-panel">
      <div><small>PORTSMOUTH PILOT</small><h2>Invite a detailer securely</h2><p>The link is single-use, tied to this email address and expires after seven days.</p></div>
      <div className="invite-controls"><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="detailer@example.com"/><button disabled={busy || !inviteEmail.includes("@")} onClick={invite}>Send invitation</button></div>
    </section>
    {notice && <p className="live-notice">{notice}</p>}{error && <p className="live-error">{error}</p>}
    <section className="toolbar"><label><span>Search</span><input aria-label="Search live detailers" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, postcode or status"/></label><button onClick={() => void refresh()}>Refresh live data</button></section>
    <section className="records-panel">
      <div className="table-head"><span>Detailer</span><span>Location</span><span>Documents</span><span>Status</span><span /></div>
      {filtered.map((detailer) => <button className="record-row" key={detailer.userId} onClick={() => { setSelectedId(detailer.userId); setNotes(detailer.reviewNotes ?? ""); }}>
        <span><strong>{detailer.businessName || detailer.name}</strong><small>{detailer.email}</small></span><code>{detailer.operatingPostcode || "Not supplied"}</code><b>{detailer.documents.length}/3 uploaded</b><em className={detailer.status === "approved" ? "good" : detailer.status === "rejected" ? "bad" : "warn"}>{humanStatus(detailer.status)}</em><i>&gt;</i>
      </button>)}
      {filtered.length === 0 && <div className="empty">No live detailer records match.</div>}
    </section>
    {selected && <div className="drawer-scrim" onClick={() => setSelectedId(null)}><aside className="drawer onboarding-drawer" onClick={(event) => event.stopPropagation()}>
      <header><span>LIVE</span><button onClick={() => setSelectedId(null)}>x</button></header><p className="eyebrow">DETAILER APPLICATION</p><h2>{selected.businessName || selected.name}</h2><p className="drawer-sub">{selected.name} - {selected.email} - {selected.phone || "No phone"}</p>
      <div className="drawer-status"><em className={selected.status === "approved" ? "good" : "warn"}>{humanStatus(selected.status)}</em></div>
      <section><small>BUSINESS DETAILS</small><p>{selected.tradingAddress || "Trading address not supplied"}</p><p>{selected.experienceYears ?? 0} years experience - {selected.serviceRadiusMiles} mile radius - {selected.ownWaterSupply ? "own water" : "customer water required"}</p><p>{selected.vatRegistered ? `VAT registered: ${selected.vatNumber}` : "Not VAT registered"}</p><p>Right-to-work declaration: {selected.rightToWorkDeclared ? "received" : "missing"} - terms: {selected.termsAccepted ? "accepted" : "missing"}</p></section>
      <section><small>PRIVATE DOCUMENTS</small><div className="document-list">{selected.documents.map((document) => <button key={document.id} onClick={() => void download(document)}><span><strong>{labels[document.type]}</strong><small>{document.originalName} - {(document.sizeBytes / 1024).toFixed(0)} KB{document.expiresAt ? ` - expires ${new Date(document.expiresAt).toLocaleDateString("en-GB")}` : ""}</small></span><em>Download</em></button>)}{selected.documents.length === 0 && <p>No documents uploaded.</p>}</div></section>
      <label className="review-notes">Review notes (required)<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Record what was checked and any action required."/></label>
      {selected.status === "submitted" ? <div className="review-actions"><button disabled={busy || notes.trim().length < 3} onClick={() => void review("approved")}>Approve for pilot jobs</button><button disabled={busy || notes.trim().length < 3} onClick={() => void review("changes_requested")}>Request changes</button><button disabled={busy || notes.trim().length < 3} onClick={() => void review("rejected")}>Reject</button></div> : <p className="drawer-help">A decision can only be recorded after the detailer submits the complete application.</p>}
      <button className="drawer-secondary" onClick={() => setSelectedId(null)}>Close record</button>
    </aside></div>}
  </div>;
}
