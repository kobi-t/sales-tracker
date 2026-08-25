import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { api } from "../api";
import {
  Card, ColorBadge, ConfirmDialog, Field, KpiCard, Modal, SortHeader,
} from "../components/ui";
import { useData } from "../store";
import { fmtCurrency, fmtDate } from "../utils/format";
import { computeCallMetrics } from "../utils/metrics";

const today = () => new Date().toISOString().slice(0, 10);

export default function CallLog() {
  const { calls, settings, refresh } = useData();

  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [filterSource, setFilterSource] = useState("all");
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [converting, setConverting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const filtered = useMemo(() => {
    if (!calls) return [];
    let rows = calls;
    if (filterSource !== "all") rows = rows.filter((c) => c.source === filterSource);
    if (filterOutcome !== "all") rows = rows.filter((c) => c.outcome === filterOutcome);
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp;
      if (sortKey === "deal_value") cmp = (Number(av) || 0) - (Number(bv) || 0);
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [calls, filterSource, filterOutcome, sortKey, sortDir]);

  if (!calls || !settings) return <div className="loading-wrap">Loading call log…</div>;

  const outcomes = settings.callOutcomes;
  const sources = settings.leadSources;
  const metrics = computeCallMetrics(filtered, settings);
  const closedOutcomes = settings.closedOutcomes || [];

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "date" ? "desc" : "asc"); }
  }

  function openCreate() {
    setError(null);
    setEditing({
      date: today(),
      name: "",
      source: sources[0] || "Ads",
      outcome: outcomes[0] || "Follow Up",
      notes: "",
      deal_value: 0,
    });
  }

  async function saveCall() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        date: editing.date,
        name: editing.name,
        source: editing.source,
        outcome: editing.outcome,
        notes: editing.notes || "",
        deal_value: Number(editing.deal_value) || 0,
      };
      if (editing.id) await api.updateCall(editing.id, payload);
      else await api.createCall(payload);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not save the call.");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete(id) {
    setBusy(true);
    try {
      await api.deleteCall(id);
      setConfirmDelete(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not delete the call.");
    } finally {
      setBusy(false);
    }
  }

  async function doConvert() {
    setBusy(true);
    setError(null);
    try {
      await api.convertCallToClient(converting.callId, {
        name: converting.name,
        date_acquired: converting.date_acquired,
        status: (settings.clientStatuses || ["Active"])[0],
      });
      setConverting(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not convert this call.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Call Log</div>
          <div className="page-subtitle">{calls.length} calls logged · prospects and sales calls only</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Call</button>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Calls Shown" value={metrics.total} />
        <KpiCard label="Attended" value={metrics.attended} />
        <KpiCard label="Show Rate" value={metrics.showRate} format="percent" />
        <KpiCard label="Close Rate" value={metrics.closeRate} format="percent" />
        <KpiCard label="No Shows" value={metrics.noShows} />
        <KpiCard label="New Clients" value={metrics.closed} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <div className="filters">
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="all">All Lead Sources</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)}>
            <option value="all">All Outcomes</option>
            {outcomes.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="muted">{filtered.length} of {calls.length} shown</div>
      </div>

      <Card bodyClass="">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortHeader label="Date" column="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Prospect" column="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Lead Source" column="source" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Outcome" column="outcome" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Deal Value" column="deal_value" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <th>Notes</th>
                <th className="ta-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state">No calls match these filters.</div></td></tr>
              )}
              {filtered.map((c) => {
                const isClosed = closedOutcomes.includes(c.outcome);
                return (
                  <tr key={c.id}>
                    <td className="cell-muted nowrap">{fmtDate(c.date)}</td>
                    <td className="cell-strong">
                      {c.name || "—"}
                      {c.converted && <span className="pill-client">Client</span>}
                    </td>
                    <td className="cell-muted">{c.source}</td>
                    <td><ColorBadge label={c.outcome} colors={settings.outcomeColors} /></td>
                    <td className="ta-right">
                      {Number(c.deal_value) > 0 ? fmtCurrency(c.deal_value) : <span className="dash">—</span>}
                    </td>
                    <td className="cell-muted cell-notes">{c.notes || c.call_summary || ""}</td>
                    <td>
                      <div className="row-actions">
                        {isClosed && !c.converted && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => setConverting({
                              callId: c.id,
                              name: c.name || "",
                              date_acquired: String(c.date).slice(0, 10),
                            })}
                          >
                            <UserPlus size={13} /> Convert
                          </button>
                        )}
                        <button className="btn btn-sm" onClick={() => setEditing({ ...c })} aria-label="Edit">
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(c)} aria-label="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <Modal
          title={editing.id ? "Edit Call" : "Add Call"}
          onClose={() => setEditing(null)}
          actions={
            <>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCall} disabled={busy}>
                {busy ? "Saving…" : "Save Call"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Date">
              <input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
            </Field>
            <Field label="Prospect Name">
              <input type="text" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Lead Source">
              <select value={editing.source} onChange={(e) => setEditing({ ...editing, source: e.target.value })}>
                {sources.map((s) => <option key={s} value={s}>{s}</option>)}
                {!sources.includes(editing.source) && <option value={editing.source}>{editing.source}</option>}
              </select>
            </Field>
            <Field label="Outcome">
              <select value={editing.outcome} onChange={(e) => setEditing({ ...editing, outcome: e.target.value })}>
                {outcomes.map((o) => <option key={o} value={o}>{o}</option>)}
                {!outcomes.includes(editing.outcome) && <option value={editing.outcome}>{editing.outcome}</option>}
              </select>
            </Field>
            <Field label="Deal Value ($) — optional">
              <input type="number" min="0" step="0.01" value={editing.deal_value ?? 0}
                onChange={(e) => setEditing({ ...editing, deal_value: e.target.value })} />
            </Field>
            <Field label="Notes" full>
              <textarea rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}

      {converting && (
        <Modal
          title="Convert to Client"
          width={440}
          onClose={() => setConverting(null)}
          actions={
            <>
              <button className="btn" onClick={() => setConverting(null)}>Cancel</button>
              <button className="btn btn-success-solid" onClick={doConvert} disabled={busy || !converting.name.trim()}>
                {busy ? "Converting…" : "Create Client"}
              </button>
            </>
          }
        >
          <p className="modal-body-text">
            This creates a client record and links it back to the call. Add their payments on the Clients page.
          </p>
          <div className="form-grid">
            <Field label="Client Name" full>
              <input type="text" value={converting.name}
                onChange={(e) => setConverting({ ...converting, name: e.target.value })} />
            </Field>
            <Field label="Date Acquired" full>
              <input type="date" value={converting.date_acquired}
                onChange={(e) => setConverting({ ...converting, date_acquired: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this call?"
          message={`This permanently removes the call for ${confirmDelete.name || "this prospect"} on ${fmtDate(confirmDelete.date)}.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => doDelete(confirmDelete.id)}
        />
      )}
    </div>
  );
}
