import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api";
import { Card, ColorBadge, ConfirmDialog, Field, Modal } from "../components/ui";
import { useData } from "../store";
import { fmtCurrency, fmtDate, initials, tintedBadgeStyle } from "../utils/format";

const today = () => new Date().toISOString().slice(0, 10);

export default function Clients() {
  const { clients, payments, settings, refresh } = useData();

  const [expanded, setExpanded] = useState(() => new Set());
  const [editingClient, setEditingClient] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [confirmDeleteClient, setConfirmDeleteClient] = useState(null);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const paymentsByClient = useMemo(() => {
    const map = new Map();
    for (const p of payments || []) {
      if (!map.has(p.client_id)) map.set(p.client_id, []);
      map.get(p.client_id).push(p);
    }
    for (const list of map.values()) list.sort((a, b) => (a.date < b.date ? 1 : -1));
    return map;
  }, [payments]);

  if (!clients || !payments || !settings) return <div className="loading-wrap">Loading clients…</div>;

  const statuses = settings.clientStatuses || ["Active"];
  const categories = settings.revenueCategories || ["Retainer"];
  const totalRevenue = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAddClient() {
    setError(null);
    setEditingClient({ name: "", date_acquired: today(), status: statuses[0], notes: "" });
  }

  async function saveClient() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: editingClient.name.trim(),
        date_acquired: editingClient.date_acquired,
        status: editingClient.status,
        notes: editingClient.notes || "",
      };
      if (editingClient.id) await api.updateClient(editingClient.id, payload);
      else await api.createClient(payload);
      setEditingClient(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not save the client.");
    } finally {
      setBusy(false);
    }
  }

  async function savePayment() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        client_id: editingPayment.client_id,
        date: editingPayment.date,
        amount: Number(editingPayment.amount) || 0, // what the client was charged
        category: editingPayment.category,
        notes: editingPayment.notes || "",
      };
      if (editingPayment.id) await api.updatePayment(editingPayment.id, payload);
      else await api.createPayment(payload);
      setEditingPayment(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not save the payment.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteClient(id) {
    setBusy(true);
    try {
      await api.deleteClient(id);
      setConfirmDeleteClient(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not delete the client.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePayment(id) {
    setBusy(true);
    try {
      await api.deletePayment(id);
      setConfirmDeletePayment(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not delete the payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Clients</div>
          <div className="page-subtitle">
            {clients.length} {clients.length === 1 ? "client" : "clients"} ·{" "}
            {fmtCurrency(totalRevenue)} total revenue all time
          </div>
        </div>
        <button className="btn btn-primary" onClick={openAddClient}><Plus size={15} /> Add Client</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {clients.length === 0 ? (
        <Card>
          <div className="empty-state">
            No clients yet. Convert a closed call on the Call Log, or add one manually.
          </div>
        </Card>
      ) : (
        <div className="client-list">
          {clients.map((client) => {
            const clientPayments = paymentsByClient.get(client.id) || [];
            const revenue = clientPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const isOpen = expanded.has(client.id);
            const statusHex = (settings.statusColors || {})[client.status] || "#6b7280";

            return (
              <div key={client.id} className={`client-card${isOpen ? " open" : ""}`}>
                <button className="client-head" onClick={() => toggle(client.id)}>
                  <span className="client-avatar" style={tintedBadgeStyle(statusHex)}>
                    {initials(client.name)}
                  </span>
                  <span className="client-identity">
                    <span className="client-name">{client.name}</span>
                    <span className="client-meta">Acquired {fmtDate(client.date_acquired)}</span>
                  </span>
                  <span className="client-figure">
                    <span className="figure-value">{clientPayments.length}</span>
                    <span className="figure-label">{clientPayments.length === 1 ? "payment" : "payments"}</span>
                  </span>
                  <span className="client-figure">
                    <span className="figure-value">{fmtCurrency(revenue)}</span>
                    <span className="figure-label">total revenue</span>
                  </span>
                  <ColorBadge label={client.status} colors={settings.statusColors} />
                  <span className="client-chevron">
                    {isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                  </span>
                </button>

                {isOpen && (
                  <div className="client-body">
                    <div className="client-actions">
                      <button className="btn btn-sm" onClick={() => setEditingClient({ ...client })}>
                        <Pencil size={13} /> Edit Client
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setEditingPayment({
                          client_id: client.id,
                          date: today(),
                          amount: "",
                          category: categories[0],
                          notes: "",
                        })}
                      >
                        <Plus size={13} /> Add Payment
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirmDeleteClient(client)}>
                        <Trash2 size={13} /> Delete Client
                      </button>
                    </div>

                    {client.notes && <div className="client-notes">{client.notes}</div>}

                    {clientPayments.length === 0 ? (
                      <div className="empty-state small">No payments recorded for this client yet.</div>
                    ) : (
                      <div className="table-wrap inner-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Category</th>
                              <th className="ta-right">Amount</th>
                              <th>Notes</th>
                              <th className="ta-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientPayments.map((p) => (
                              <tr key={p.id}>
                                <td className="cell-muted nowrap">{fmtDate(p.date)}</td>
                                <td><span className="chip">{p.category}</span></td>
                                <td className="ta-right cell-strong">{fmtCurrency(p.amount, { decimals: 2 })}</td>
                                <td className="cell-muted cell-notes">{p.notes}</td>
                                <td>
                                  <div className="row-actions">
                                    <button className="btn btn-sm" onClick={() => setEditingPayment({ ...p })} aria-label="Edit payment">
                                      <Pencil size={12} />
                                    </button>
                                    <button className="btn btn-sm btn-danger" onClick={() => setConfirmDeletePayment(p)} aria-label="Delete payment">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            <tr className="total-row">
                              <td colSpan={2}>Total</td>
                              <td className="ta-right">{fmtCurrency(revenue, { decimals: 2 })}</td>
                              <td colSpan={2} />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingClient && (
        <Modal
          title={editingClient.id ? "Edit Client" : "Add Client"}
          onClose={() => setEditingClient(null)}
          actions={
            <>
              <button className="btn" onClick={() => setEditingClient(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveClient} disabled={busy || !editingClient.name.trim()}>
                {busy ? "Saving…" : "Save Client"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Name" full>
              <input type="text" value={editingClient.name}
                onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} />
            </Field>
            <Field label="Date Acquired">
              <input type="date" value={String(editingClient.date_acquired).slice(0, 10)}
                onChange={(e) => setEditingClient({ ...editingClient, date_acquired: e.target.value })} />
            </Field>
            <Field label="Status">
              <select value={editingClient.status}
                onChange={(e) => setEditingClient({ ...editingClient, status: e.target.value })}>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                {!statuses.includes(editingClient.status) && (
                  <option value={editingClient.status}>{editingClient.status}</option>
                )}
              </select>
            </Field>
            <Field label="Notes" full>
              <textarea rows={3} value={editingClient.notes || ""}
                onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}

      {editingPayment && (
        <Modal
          title={editingPayment.id ? "Edit Payment" : "Add Payment"}
          onClose={() => setEditingPayment(null)}
          actions={
            <>
              <button className="btn" onClick={() => setEditingPayment(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={savePayment} disabled={busy}>
                {busy ? "Saving…" : "Save Payment"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Date">
              <input type="date" value={String(editingPayment.date).slice(0, 10)}
                onChange={(e) => setEditingPayment({ ...editingPayment, date: e.target.value })} />
            </Field>
            <Field label="Amount ($)">
              <input
                type="number" min="0" step="0.01" value={editingPayment.amount ?? ""}
                onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })}
              />
              <span className="field-hint">What the client was charged</span>
            </Field>
            <Field label="Category" full>
              <select value={editingPayment.category}
                onChange={(e) => setEditingPayment({ ...editingPayment, category: e.target.value })}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                {!categories.includes(editingPayment.category) && (
                  <option value={editingPayment.category}>{editingPayment.category}</option>
                )}
              </select>
            </Field>
            <Field label="Notes (optional)" full>
              <textarea rows={2} value={editingPayment.notes || ""}
                onChange={(e) => setEditingPayment({ ...editingPayment, notes: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}

      {confirmDeleteClient && (
        <ConfirmDialog
          title={`Delete ${confirmDeleteClient.name}?`}
          message={`This permanently deletes the client and every payment recorded against them (${(paymentsByClient.get(confirmDeleteClient.id) || []).length}). This cannot be undone.`}
          confirmLabel="Delete client & payments"
          onCancel={() => setConfirmDeleteClient(null)}
          onConfirm={() => deleteClient(confirmDeleteClient.id)}
        />
      )}

      {confirmDeletePayment && (
        <ConfirmDialog
          title="Delete this payment?"
          message={`This removes the ${fmtCurrency(confirmDeletePayment.amount)} payment dated ${fmtDate(confirmDeletePayment.date)}.`}
          onCancel={() => setConfirmDeletePayment(null)}
          onConfirm={() => deletePayment(confirmDeletePayment.id)}
        />
      )}
    </div>
  );
}
