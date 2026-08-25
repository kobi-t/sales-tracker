import { useMemo } from "react";
import DateRangeSelector, { useDateRange } from "../components/DateRangeSelector";
import { Card, KpiCard, ShareBar } from "../components/ui";
import { useData } from "../store";
import { fmtCurrency, fmtDate } from "../utils/format";
import { computeRevenueMetrics, filterByRange, paymentCash, paymentRevenue, safeDiv } from "../utils/metrics";

const CATEGORY_COLORS = ["#5b5bf6", "#16a34a", "#f59e0b", "#dc2626", "#0ea5e9", "#a855f7", "#71717a"];

export default function Revenue() {
  const { clients, payments, settings } = useData();
  const { start, end, label, selectorProps } = useDateRange();

  const model = useMemo(() => {
    if (!clients || !payments) return null;
    const inPeriod = filterByRange(payments, start, end);
    const revenue = computeRevenueMetrics(payments, clients, start, end);

    const nameById = new Map(clients.map((c) => [c.id, c.name]));
    const byClient = Object.entries(revenue.byClient)
      .map(([clientId, totals]) => ({
        clientId,
        name: nameById.get(clientId) || "Unknown client",
        amount: totals.revenue,
        cash: totals.cash,
      }))
      .sort((a, b) => b.amount - a.amount);

    const byCategory = Object.entries(revenue.byCategory)
      .map(([name, totals]) => ({ name, amount: totals.revenue, cash: totals.cash }))
      .sort((a, b) => b.amount - a.amount)
      .map((row, i) => ({ ...row, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

    return {
      inPeriod: [...inPeriod].sort((a, b) => (a.date < b.date ? 1 : -1)),
      revenue,
      byClient,
      byCategory,
      activeClients: clients.filter((c) => c.status === "Active").length,
      avgPayment: safeDiv(revenue.total, inPeriod.length),
    };
  }, [clients, payments, start, end]);

  if (!clients || !payments || !settings || !model) return <div className="loading-wrap">Loading revenue…</div>;

  const { inPeriod, revenue, byClient, byCategory, activeClients, avgPayment } = model;
  const maxCategory = byCategory.length ? byCategory[0].amount : 0;

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
        <KpiCard label="Total Revenue" value={revenue.total} format="currency" hint="Deal value agreed" />
        <KpiCard label="Total Cash Collected" value={revenue.totalCash} format="currency" hint="Money received" />
        <KpiCard
          label="Outstanding"
          value={revenue.outstanding}
          format="currency"
          hint="Revenue not yet collected"
        />
        <KpiCard label="New Client Revenue" value={revenue.newClientRev} format="currency" />
        <KpiCard label="Existing Client Revenue" value={revenue.existingRev} format="currency" />
        <KpiCard label="Payments" value={inPeriod.length} />
        <KpiCard label="Active Clients" value={activeClients} />
        <KpiCard label="Average Payment" value={avgPayment} format="currency" hint="By revenue" />
      </div>

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
                    <th className="ta-right">Cash Collected</th>
                    <th style={{ width: "26%" }}>Share of revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {byClient.map((row) => {
                    const pct = revenue.total > 0 ? (row.amount / revenue.total) * 100 : 0;
                    const owed = row.amount - row.cash;
                    return (
                      <tr key={row.clientId}>
                        <td className="cell-strong">{row.name}</td>
                        <td className="ta-right">{fmtCurrency(row.amount)}</td>
                        <td className="ta-right">
                          {fmtCurrency(row.cash)}
                          {owed > 0.005 && (
                            <span className="owed-tag">{fmtCurrency(owed)} owing</span>
                          )}
                        </td>
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
                    <td className="ta-right">{fmtCurrency(revenue.totalCash)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Revenue by Category" subtitle="Bars show agreed revenue; cash collected listed below">
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
                    <span className="legend-value">
                      {fmtCurrency(c.amount)}
                      <span className="legend-sub">{fmtCurrency(c.cash)} cash</span>
                    </span>
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
                <th className="ta-right">Revenue</th>
                <th className="ta-right">Cash Collected</th>
                <th className="ta-right">Outstanding</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {inPeriod.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state">No payments in this period.</div></td></tr>
              )}
              {inPeriod.map((p) => {
                const owed = paymentRevenue(p) - paymentCash(p);
                return (
                  <tr key={p.id}>
                    <td className="cell-muted nowrap">{fmtDate(p.date)}</td>
                    <td className="cell-strong">{p.client_name}</td>
                    <td><span className="chip">{p.category}</span></td>
                    <td className="ta-right">{fmtCurrency(paymentRevenue(p), { decimals: 2 })}</td>
                    <td className="ta-right">{fmtCurrency(paymentCash(p), { decimals: 2 })}</td>
                    <td className={`ta-right${owed > 0.005 ? " outstanding" : " cell-muted"}`}>
                      {fmtCurrency(owed, { decimals: 2 })}
                    </td>
                    <td className="cell-muted cell-notes">{p.notes}</td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td colSpan={3}>Total</td>
                <td className="ta-right">{fmtCurrency(revenue.total, { decimals: 2 })}</td>
                <td className="ta-right">{fmtCurrency(revenue.totalCash, { decimals: 2 })}</td>
                <td className={`ta-right${revenue.outstanding > 0.005 ? " outstanding" : ""}`}>
                  {fmtCurrency(revenue.outstanding, { decimals: 2 })}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
