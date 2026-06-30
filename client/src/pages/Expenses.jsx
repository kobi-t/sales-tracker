import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ArrowUpDown, ExternalLink } from "lucide-react";
import { api } from "../api";
import KpiCard from "../components/KpiCard";
import { computeExpenseMetrics } from "../utils/metrics";

const EMPTY_EXPENSE = {
  date: new Date().toISOString().slice(0, 10),
  category: "Ad Spend",
  description: "",
  amount: 0,
  receipt_link: "",
};

export default function Expenses() {
  const [expenses, setExpenses] = useState(null);
  const [settings, setSettings] = useState(null);
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [filterCategory, setFilterCategory] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => api.getExpenses().then(setExpenses);
  useEffect(() => { load(); api.getSettings().then(setSettings); }, []);

  const filtered = useMemo(() => {
    if (!expenses) return [];
    let rows = expenses;
    if (filterCategory !== "all") rows = rows.filter((e) => e.category === filterCategory);
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      let cmp;
      if (typeof av === "number" || typeof bv === "number") cmp = (Number(av) || 0) - (Number(bv) || 0);
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [expenses, filterCategory, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function openCreate() { setEditing({ ...EMPTY_EXPENSE }); setModalOpen(true); }
  function openEdit(exp) { setEditing({ ...exp }); setModalOpen(true); }

  async function save() {
    const payload = { ...editing, amount: Number(editing.amount) || 0 };
    if (editing.id) await api.updateExpense(editing.id, payload);
    else await api.createExpense(payload);
    setModalOpen(false);
    setEditing(null);
    load();
  }

  async function doDelete(id) {
    await api.deleteExpense(id);
    setConfirmDelete(null);
    load();
  }

  if (!expenses || !settings) return <div className="loading-wrap">Loading expenses…</div>;

  const categories = settings.expenseCategories;
  const total = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const expenseMetrics = computeExpenseMetrics(filtered);
  const avgExpense = filtered.length ? total / filtered.length : 0;
  const nonAdSpend = total - expenseMetrics.adSpend;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Expenses</div>
          <div className="page-subtitle">{expenses.length} expenses · ${total.toLocaleString()} shown</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Expense</button>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Total Expenses" value={total} format="currency" />
        <KpiCard label="Ad Spend" value={expenseMetrics.adSpend} format="currency" />
        <KpiCard label="Other Expenses" value={nonAdSpend} format="currency" />
        <KpiCard label="Expenses Shown" value={filtered.length} />
        <KpiCard label="Average Expense" value={avgExpense} format="currency" />
      </div>

      <div className="toolbar">
        <div className="filters">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[["date", "Date"], ["category", "Category"], ["description", "Description"], ["amount", "Amount"]].map(([key, label]) => (
                  <th key={key} onClick={() => toggleSort(key)}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {label} {sortKey === key && <ArrowUpDown size={11} />}
                    </span>
                  </th>
                ))}
                <th>Receipt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state">No expenses match these filters.</div></td></tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="cell-muted">{e.date}</td>
                  <td><span className="badge" style={{ background: "#f1f1f4", color: "var(--text)" }}>{e.category}</span></td>
                  <td className="cell-strong">{e.description}</td>
                  <td>${Number(e.amount || 0).toLocaleString()}</td>
                  <td>
                    {e.receipt_link
                      ? <a href={e.receipt_link} target="_blank" rel="noreferrer" className="cell-muted" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>View <ExternalLink size={12} /></a>
                      : <span className="cell-muted">—</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm" onClick={() => openEdit(e)}><Pencil size={13} /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(e)}><Trash2 size={13} /></button>
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
            <h3>{editing.id ? "Edit Expense" : "Add Expense"}</h3>
            <div className="form-grid">
              <div className="field"><label>Date</label><input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></div>
              <div className="field"><label>Category</label>
                <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field full"><label>Description</label><input type="text" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="field"><label>Amount ($)</label><input type="number" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} /></div>
              <div className="field"><label>Receipt Link (optional)</label><input type="url" value={editing.receipt_link} onChange={(e) => setEditing({ ...editing, receipt_link: e.target.value })} /></div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Expense</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <h3>Delete this expense?</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>This will permanently remove "{confirmDelete.description}" from {confirmDelete.date}.</p>
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
