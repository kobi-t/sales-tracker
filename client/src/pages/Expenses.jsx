import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api";
import DateRangeSelector, { useDateRange } from "../components/DateRangeSelector";
import { Card, ConfirmDialog, Field, KpiCard, Modal, ShareBar, SortHeader } from "../components/ui";
import { useData } from "../store";
import { fmtCurrency, fmtDate } from "../utils/format";
import { computeExpenseMetrics, filterByRange } from "../utils/metrics";

const CATEGORY_COLORS = ["#5b5bf6", "#16a34a", "#f59e0b", "#dc2626", "#0ea5e9", "#a855f7", "#71717a"];
const today = () => new Date().toISOString().slice(0, 10);

export default function Expenses() {
  const { expenses, settings, refresh } = useData();

  const allDates = useMemo(() => (expenses || []).map((e) => e.date), [expenses]);
  const { start, end, label, selectorProps } = useDateRange("month", allDates);

  const [showIndividual, setShowIndividual] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const inPeriod = useMemo(() => filterByRange(expenses || [], start, end), [expenses, start, end]);

  const rows = useMemo(() => {
    let list = inPeriod;
    if (filterCategory !== "all") list = list.filter((e) => e.category === filterCategory);
    return [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = sortKey === "amount"
        ? (Number(av) || 0) - (Number(bv) || 0)
        : String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [inPeriod, filterCategory, sortKey, sortDir]);

  if (!expenses || !settings) return <div className="loading-wrap">Loading expenses…</div>;

  const metrics = computeExpenseMetrics(inPeriod);
  const categories = settings.expenseCategories || [];
  const breakdown = Object.entries(metrics.byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .map((row, i) => ({ ...row, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "date" ? "desc" : "asc"); }
  }

  function openCreate() {
    setError(null);
    setEditing({ date: today(), category: categories[0] || "Other", description: "", amount: "", receipt_link: "" });
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        date: editing.date,
        category: editing.category,
        description: editing.description || "",
        amount: Number(editing.amount) || 0,
        receipt_link: editing.receipt_link || "",
      };
      if (editing.id) await api.updateExpense(editing.id, payload);
      else await api.createExpense(payload);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not save the expense.");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete(id) {
    setBusy(true);
    try {
      await api.deleteExpense(id);
      setConfirmDelete(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not delete the expense.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Expenses</div>
          <div className="page-subtitle">{label} · {start} to {end}</div>
        </div>
        <div className="header-actions">
          <DateRangeSelector {...selectorProps} />
          <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Expense</button>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Total Expenses" value={metrics.total} format="currency" />
        <KpiCard label="Ad Spend" value={metrics.adSpend} format="currency" />
        <KpiCard label="Other Expenses" value={metrics.total - metrics.adSpend} format="currency" />
        <KpiCard label="Number of Expenses" value={inPeriod.length} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <Card title="Spend by Category" subtitle={label}>
        {breakdown.length === 0 ? (
          <div className="empty-state">No expenses in {label}.</div>
        ) : (
          <div className="breakdown-list">
            {breakdown.map((c) => {
              const pct = metrics.total > 0 ? (c.amount / metrics.total) * 100 : 0;
              return (
                <div key={c.name} className="breakdown-row">
                  <div className="breakdown-head">
                    <span className="breakdown-name">
                      <span className="dot-sm" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="breakdown-value">
                      {fmtCurrency(c.amount, { decimals: 2 })} <span className="muted">· {pct.toFixed(1)}%</span>
                    </span>
                  </div>
                  <ShareBar value={c.amount} total={metrics.total} color={c.color} />
                </div>
              );
            })}
            <div className="breakdown-total">
              <span>Total</span>
              <span>{fmtCurrency(metrics.total, { decimals: 2 })}</span>
            </div>
          </div>
        )}
      </Card>

      <div className="collapsible mt-16">
        <button className="collapsible-head" onClick={() => setShowIndividual((v) => !v)}>
          {showIndividual ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Individual Expenses</span>
          <span className="muted">{inPeriod.length} in {label}</span>
        </button>

        {showIndividual && (
          <div className="collapsible-body">
            <div className="toolbar">
              <div className="filters">
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">All Categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="muted">{rows.length} shown</div>
            </div>

            <Card bodyClass="">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <SortHeader label="Date" column="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortHeader label="Category" column="category" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortHeader label="Description" column="description" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortHeader label="Amount" column="amount" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                      <th className="ta-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr><td colSpan={5}><div className="empty-state">No expenses match these filters.</div></td></tr>
                    )}
                    {rows.map((e) => (
                      <tr key={e.id}>
                        <td className="cell-muted nowrap">{fmtDate(e.date)}</td>
                        <td><span className="chip">{e.category}</span></td>
                        <td className="cell-strong">{e.description}</td>
                        <td className="ta-right">{fmtCurrency(e.amount, { decimals: 2 })}</td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-sm" onClick={() => setEditing({ ...e })} aria-label="Edit">
                              <Pencil size={13} />
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(e)} aria-label="Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {editing && (
        <Modal
          title={editing.id ? "Edit Expense" : "Add Expense"}
          onClose={() => setEditing(null)}
          actions={
            <>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save Expense"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Date">
              <input type="date" value={String(editing.date).slice(0, 10)}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
            </Field>
            <Field label="Category">
              <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                {!categories.includes(editing.category) && <option value={editing.category}>{editing.category}</option>}
              </select>
            </Field>
            <Field label="Description" full>
              <input type="text" value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="Amount ($)">
              <input type="number" min="0" step="0.01" value={editing.amount}
                onChange={(e) => setEditing({ ...editing, amount: e.target.value })} />
            </Field>
            <Field label="Receipt Link (optional)">
              <input type="url" value={editing.receipt_link || ""}
                onChange={(e) => setEditing({ ...editing, receipt_link: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this expense?"
          message={`This permanently removes "${confirmDelete.description || "this expense"}" from ${fmtDate(confirmDelete.date)}.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => doDelete(confirmDelete.id)}
        />
      )}
    </div>
  );
}
