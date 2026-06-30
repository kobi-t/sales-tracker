import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { api } from "../api";
import KpiCard from "../components/KpiCard";
import { computeCallMetrics } from "../utils/metrics";

const OUTCOME_STYLE = {
  "Full-Pay": "outcome-positive",
  "Split-Pay": "outcome-positive",
  "Deposit": "outcome-positive",
  "No Deposit & Follow-Up": "outcome-neutral",
  "Offer & Didn't Buy": "outcome-negative",
  "Bad Fit & No Offer": "outcome-negative",
  "Cancelled": "outcome-negative",
  "No-Show": "outcome-negative",
  "Rescheduled": "outcome-neutral",
};

const EMPTY_CALL = {
  date: new Date().toISOString().slice(0, 10),
  name: "",
  source: "Ads",
  booked: true,
  outcome: "No Deposit & Follow-Up",
  revenue: 0,
  cash_collected: 0,
  offer_made: false,
  objection: "",
  call_summary: "",
  recording_link: "",
};

export default function CallLog() {
  const [calls, setCalls] = useState(null);
  const [settings, setSettings] = useState(null);
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [filterSource, setFilterSource] = useState("all");
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => api.getCalls().then(setCalls);
  useEffect(() => { load(); api.getSettings().then(setSettings); }, []);

  const filtered = useMemo(() => {
    if (!calls) return [];
    let rows = calls;
    if (filterSource !== "all") rows = rows.filter((c) => c.source === filterSource);
    if (filterOutcome !== "all") rows = rows.filter((c) => c.outcome === filterOutcome);
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      let cmp;
      if (typeof av === "number" || typeof bv === "number") cmp = (Number(av) || 0) - (Number(bv) || 0);
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [calls, filterSource, filterOutcome, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function openCreate() { setEditing({ ...EMPTY_CALL }); setModalOpen(true); }
  function openEdit(call) { setEditing({ ...call }); setModalOpen(true); }

  async function save() {
    const payload = {
      ...editing,
      revenue: Number(editing.revenue) || 0,
      cash_collected: Number(editing.cash_collected) || 0,
    };
    if (editing.id) await api.updateCall(editing.id, payload);
    else await api.createCall(payload);
    setModalOpen(false);
    setEditing(null);
    load();
  }

  async function doDelete(id) {
    await api.deleteCall(id);
    setConfirmDelete(null);
    load();
  }

  if (!calls || !settings) return <div className="loading-wrap">Loading call log…</div>;

  const outcomes = settings.callOutcomes;
  const sources = settings.callSources;
  const callMetrics = computeCallMetrics(filtered);
  const revPerBookedCall = filtered.length ? callMetrics.totalRevenue / filtered.length : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Call Log</div>
          <div className="page-subtitle">{calls.length} total calls recorded</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Call</button>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Calls Shown" value={callMetrics.totalBookings} />
        <KpiCard label="Show-Up Rate" value={callMetrics.showUpRate} format="percent" />
        <KpiCard label="Conversion Rate" value={callMetrics.conversionRate} format="percent" />
        <KpiCard label="Total Revenue" value={callMetrics.totalRevenue} format="currency" />
        <KpiCard label="Cash Collected" value={callMetrics.totalCash} format="currency" />
        <KpiCard label="Revenue / Booked Call" value={revPerBookedCall} format="currency" />
      </div>

      <div className="toolbar">
        <div className="filters">
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="all">All Sources</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)}>
            <option value="all">All Outcomes</option>
            {outcomes.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  ["date", "Date"], ["name", "Name"], ["source", "Source"], ["outcome", "Outcome"],
                  ["revenue", "Revenue"], ["cash_collected", "Cash"], ["offer_made", "Offer"],
                ].map(([key, label]) => (
                  <th key={key} onClick={() => toggleSort(key)}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {label} {sortKey === key && <ArrowUpDown size={11} />}
                    </span>
                  </th>
                ))}
                <th>Objection</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state">No calls match these filters.</div></td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="cell-muted">{c.date}</td>
                  <td className="cell-strong">{c.name}</td>
                  <td><span className={`badge ${c.source.toLowerCase()}`}>{c.source}</span></td>
                  <td><span className={`outcome-badge ${OUTCOME_STYLE[c.outcome] || "outcome-neutral"}`}>{c.outcome}</span></td>
                  <td>${Number(c.revenue || 0).toLocaleString()}</td>
                  <td>${Number(c.cash_collected || 0).toLocaleString()}</td>
                  <td className="cell-muted">{c.offer_made ? "Yes" : "No"}</td>
                  <td className="cell-muted">{c.objection || "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(c)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.id ? "Edit Call" : "Add Call"}</h3>
            <div className="form-grid">
              <div className="field"><label>Date</label><input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></div>
              <div className="field"><label>Prospect Name</label><input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="field"><label>Source</label>
                <select value={editing.source} onChange={(e) => setEditing({ ...editing, source: e.target.value })}>
                  {sources.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field"><label>Outcome</label>
                <select value={editing.outcome} onChange={(e) => setEditing({ ...editing, outcome: e.target.value })}>
                  {outcomes.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="field"><label>Revenue ($)</label><input type="number" value={editing.revenue} onChange={(e) => setEditing({ ...editing, revenue: e.target.value })} /></div>
              <div className="field"><label>Cash Collected ($)</label><input type="number" value={editing.cash_collected} onChange={(e) => setEditing({ ...editing, cash_collected: e.target.value })} /></div>
              <div className="field"><label>Offer Made</label>
                <select value={editing.offer_made ? "yes" : "no"} onChange={(e) => setEditing({ ...editing, offer_made: e.target.value === "yes" })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div className="field"><label>Booked</label>
                <select value={editing.booked ? "yes" : "no"} onChange={(e) => setEditing({ ...editing, booked: e.target.value === "yes" })}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="field full"><label>Objection</label><input type="text" value={editing.objection} onChange={(e) => setEditing({ ...editing, objection: e.target.value })} /></div>
              <div className="field full"><label>Call Summary</label><textarea rows={3} value={editing.call_summary} onChange={(e) => setEditing({ ...editing, call_summary: e.target.value })} /></div>
              <div className="field full"><label>Recording Link</label><input type="url" value={editing.recording_link} onChange={(e) => setEditing({ ...editing, recording_link: e.target.value })} /></div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Call</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <h3>Delete this call?</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>This will permanently remove the call for {confirmDelete.name} on {confirmDelete.date}.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={() => doDelete(confirmDelete.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
