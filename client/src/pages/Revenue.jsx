import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api";
import DateRangeSelector, { useDateRange } from "../components/DateRangeSelector";
import { Card, ConfirmDialog, Field, KpiCard, Modal, ShareBar } from "../components/ui";
import { useData } from "../store";
import { fmtCurrency, fmtDate } from "../utils/format";
import { computeCashCollected, computeRevenueMetrics, filterByRange, safeDiv } from "../utils/metrics";

const CATEGORY_COLORS = ["#5b5bf6", "#16a34a", "#f59e0b", "#dc2626", "#0ea5e9", "#a855f7", "#71717a"];
const today = () => new Date().toISOString().slice(0, 10);

export default function Revenue() {
  const { clients, payments, payouts, settings, refresh } = useData();

  const allDates = useMemo(
    () => [...(payments || []), ...(payouts || [])].map((r) => r.date),
    [payments, payouts]
  );
  const { start, end, label, selectorProps } = useDateRange("month", allDates);

  const [editingPayout, setEditingPayout] = useState(null);
  const [confirmDeletePayout, setConfirmDeletePayout] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const model = useMemo(() => {
    if (!clients || !payments || !payouts) return null;
    const inPeriod = filterByRange(payments, start, end);
    const revenue = computeRevenueMetrics(payments, clients, start, end);
    const payoutsInPeriod = [...filterByRange(payouts, start, end)]
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const cash = computeCashCollected(payoutsInPeriod);

    const nameById = new Map(clients.map((c) => [c.id, c.name]));
    const byClient = Object.entries(revenue.byClient)
      .map(([clientId, amount]) => ({
        clientId,
        name: nameById.get(clientId) || "Unknown client",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    const byCategory = Object.entries(revenue.byCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .map((row, i) => ({ ...row, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

    return {
      inPeriod: [...inPeriod].sort((a, b) => (a.date < b.date ? 1 : -1)),
      revenue,
      payoutsInPeriod,
      cash,
      byClient,
      byCategory,
      activeClients: clients.filter((c) => c.status === "Active").length,
      avgPayment: safeDiv(revenue.total, inPeriod.length),
    };
  }, [clients, payments, payouts, start, end]);

  if (!clients || !payments || !payouts || !settings || !model) {
    return <div className="loading-wrap">Loading revenue…</div>;
  }

  const { inPeriod, revenue, payoutsInPeriod, cash, byClient, byCategory, activeClients, avgPayment } = model;
  const maxCategory = byCategory.length ? byCategory[0].amount : 0;

  async function savePayout() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        date: editingPayout.date,
        amount: Number(editingPayout.amount) || 0,
        notes: editingPayout.notes || "",
      };
      if (editingPayout.id) await api.updatePayout(editingPayout.id, payload);
      else await api.createPayout(payload);
      setEditingPayout(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not save the payout.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePayout(id) {
    setBusy(true);
    try {
      await api.deletePayout(id);
      setConfirmDeletePayout(null);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not delete the payout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Revenue</div>
          <div className="page-subtitle">{label} · {start} to {end}</div>
        </div>
        <DateRangeSelector {...selectorProps} />
      </div>

      <div className="kpi-grid">
        <KpiCard label="Total Revenue" value={revenue.total} format="currency" hint="Charged to clients" />
        <KpiCard label="Cash Collected" value={cash.total} format="currency" hint="Stripe payouts banked" />
        <KpiCard label="New Client Revenue" value={revenue.newClientRev} format="currency" />
        <KpiCard label="Existing Client Revenue" value={revenue.existingRev} format="currency" />
        <KpiCard label="Payments" value={inPeriod.length} />
        <KpiCard label="Active Clients" value={activeClients} />
        <KpiCard label="Average Payment" value={avgPayment} format="currency" />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <Card
        title="Cash Collected"
        subtitle="Stripe payouts into your bank. Kept separate from client records."
        bodyClass=""
        actions={
          <button
            className="btn btn-primary"
            onClick={() => {
              setError(null);
              setEditingPayout({ date: today(), amount: "", notes: "" });
            }}
          >
            <Plus size={15} /> Add Payout
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="ta-right">Amount</th>
                <th>Notes</th>
                <th className="ta-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payoutsInPeriod.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">No payouts recorded in {label}.</div>
                  </td>
                </tr>
              )}
              {payoutsInPeriod.map((p) => (
                <tr key={p.id}>
                  <td className="cell-muted nowrap">{fmtDate(p.date)}</td>
                  <td className="ta-right cell-strong">{fmtCurrency(p.amount, { decimals: 2 })}</td>
                  <td className="cell-muted cell-notes">{p.notes}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm" onClick={() => setEditingPayout({ ...p })} aria-label="Edit payout">
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirmDeletePayout(p)} aria-label="Delete payout">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {payoutsInPeriod.length > 0 && (
                <tr className="total-row">
                  <td>Total</td>
                  <td className="ta-right">{fmtCurrency(cash.total, { decimals: 2 })}</td>
                  <td colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Revenue by Client" subtitle={`${byClient.length} ${byClient.length === 1 ? "client" : "clients"} paid in this period`} bodyClass="">
          {byClient.length === 0 ? (
            <div className="empty-state">No payments in {label}.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th className="ta-right">Revenue</th>
                    <th style={{ width: "38%" }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {byClient.map((row) => {
                    const pct = revenue.total > 0 ? (row.amount / revenue.total) * 100 : 0;
                    return (
                      <tr key={row.clientId}>
                        <td className="cell-strong">{row.name}</td>
                        <td className="ta-right">{fmtCurrency(row.amount)}</td>
                        <td>
                          <div className="share-cell">
                            <ShareBar value={row.amount} total={revenue.total} />
                            <span className="share-pct">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="total-row">
                    <td>Total</td>
                    <td className="ta-right">{fmtCurrency(revenue.total)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Revenue by Category" subtitle="Where the money came from">
          {byCategory.length === 0 ? (
            <div className="empty-state">No payments in {label}.</div>
          ) : (
            <>
              <div className="hbar-chart">
                {byCategory.map((c) => (
                  <div key={c.name} className="hbar-row">
                    <span className="hbar-label">{c.name}</span>
                    <div className="hbar-track">
                      <div
                        className="hbar-fill"
                        style={{
                          width: `${maxCategory > 0 ? Math.max((c.amount / maxCategory) * 100, 2) : 0}%`,
                          background: c.color,
                        }}
                      />
                    </div>
                    <span className="hbar-value">{fmtCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="legend-list">
                {byCategory.map((c) => (
                  <div key={c.name} className="legend-item">
                    <span className="dot-sm" style={{ background: c.color }} />
                    <span className="legend-name">{c.name}</span>
                    <span className="legend-value">{fmtCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card title="All Payments" subtitle={`${inPeriod.length} in ${label}`} bodyClass="">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Category</th>
                <th className="ta-right">Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {inPeriod.length === 0 && (
                <tr><td colSpan={5}><div className="empty-state">No payments in this period.</div></td></tr>
              )}
              {inPeriod.map((p) => (
                <tr key={p.id}>
                  <td className="cell-muted nowrap">{fmtDate(p.date)}</td>
                  <td className="cell-strong">{p.client_name}</td>
                  <td><span className="chip">{p.category}</span></td>
                  <td className="ta-right">{fmtCurrency(p.amount, { decimals: 2 })}</td>
                  <td className="cell-muted cell-notes">{p.notes}</td>
                </tr>
              ))}
              {inPeriod.length > 0 && (
                <tr className="total-row">
                  <td colSpan={3}>Total</td>
                  <td className="ta-right">{fmtCurrency(revenue.total, { decimals: 2 })}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editingPayout && (
        <Modal
          title={editingPayout.id ? "Edit Payout" : "Add Payout"}
          width={440}
          onClose={() => setEditingPayout(null)}
          actions={
            <>
              <button className="btn" onClick={() => setEditingPayout(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={savePayout} disabled={busy}>
                {busy ? "Saving…" : "Save Payout"}
              </button>
            </>
          }
        >
          <p className="modal-body-text">
            What Stripe actually deposited into your bank account.
          </p>
          <div className="form-grid">
            <Field label="Date">
              <input type="date" value={String(editingPayout.date).slice(0, 10)}
                onChange={(e) => setEditingPayout({ ...editingPayout, date: e.target.value })} />
            </Field>
            <Field label="Amount ($)">
              <input type="number" min="0" step="0.01" value={editingPayout.amount ?? ""}
                onChange={(e) => setEditingPayout({ ...editingPayout, amount: e.target.value })} />
            </Field>
            <Field label="Notes (optional)" full>
              <textarea rows={2} value={editingPayout.notes || ""}
                onChange={(e) => setEditingPayout({ ...editingPayout, notes: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}

      {confirmDeletePayout && (
        <ConfirmDialog
          title="Delete this payout?"
          message={`This removes the ${fmtCurrency(confirmDeletePayout.amount)} payout dated ${fmtDate(confirmDeletePayout.date)}.`}
          onCancel={() => setConfirmDeletePayout(null)}
          onConfirm={() => deletePayout(confirmDeletePayout.id)}
        />
      )}
    </div>
  );
}
