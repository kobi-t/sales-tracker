import { useMemo } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import DateRangeSelector, { useDateRange } from "../components/DateRangeSelector";
import { Card, KpiCard, ShareBar, Stat } from "../components/ui";
import { useData } from "../store";
import { granularityFor } from "../utils/dateRange";
import { fmtCurrency } from "../utils/format";
import {
  buildTimeSeries, computeAcquisitionMetrics, computeCallMetrics, computeCashCollected,
  computeExpenseMetrics, computeProfit, computeRevenueMetrics, filterByRange,
} from "../utils/metrics";

export default function Dashboard() {
  const { calls, clients, payments, payouts, expenses, settings } = useData();
  const { start, end, prevStart, prevEnd, label, selectorProps } = useDateRange();

  const ready = calls && clients && payments && payouts && expenses && settings;

  const model = useMemo(() => {
    if (!ready) return null;

    const build = (from, to) => {
      const callsIn = filterByRange(calls, from, to);
      const expensesIn = filterByRange(expenses, from, to);
      const payoutsIn = filterByRange(payouts, from, to);
      const call = computeCallMetrics(callsIn, settings);
      const revenue = computeRevenueMetrics(payments, clients, from, to);
      const cash = computeCashCollected(payoutsIn);
      const expense = computeExpenseMetrics(expensesIn);
      // ROAS is measured on revenue charged; profit on cash actually banked.
      const acquisition = computeAcquisitionMetrics(call, revenue.total, expense);
      const { profit, margin } = computeProfit(cash.total, expense.total);
      return { callsIn, expensesIn, payoutsIn, call, revenue, cash, expense, acquisition, profit, margin };
    };

    const current = build(start, end);
    const previous = build(prevStart, prevEnd);

    const activeClients = clients.filter((c) => c.status === "Active").length;
    const revenuePerClient = activeClients > 0 ? current.revenue.total / activeClients : null;

    const paymentsIn = filterByRange(payments, start, end);
    const series = buildTimeSeries(
      paymentsIn, current.payoutsIn, current.expensesIn, start, end, granularityFor(start, end)
    );

    return { current, previous, activeClients, revenuePerClient, series };
  }, [ready, calls, clients, payments, payouts, expenses, settings, start, end, prevStart, prevEnd]);

  if (!ready || !model) return <div className="loading-wrap">Loading dashboard…</div>;

  const { current, previous, activeClients, revenuePerClient, series } = model;
  const { call, revenue, cash, expense, acquisition, profit, margin } = current;

  const revenueSplitTotal = revenue.newClientRev + revenue.existingRev;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">{label} · {start} to {end}</div>
        </div>
        <DateRangeSelector {...selectorProps} />
      </div>

      {/* ---- Section A: Revenue & Profit ---- */}
      <div className="section-label">Revenue &amp; Profit</div>
      <div className="kpi-grid">
        <KpiCard label="Total Revenue" value={revenue.total} prevValue={previous.revenue.total} format="currency" hint="Charged to clients" />
        <KpiCard label="Cash Collected" value={cash.total} prevValue={previous.cash.total} format="currency" hint="Stripe payouts banked" />
        <KpiCard label="Total Expenses" value={expense.total} prevValue={previous.expense.total} format="currency" invertTrend />
        <KpiCard label="Profit" value={profit} prevValue={previous.profit} format="currency" />
        <KpiCard label="Profit Margin" value={margin} prevValue={previous.margin} format="percent" />
        <KpiCard label="New Client Revenue" value={revenue.newClientRev} prevValue={previous.revenue.newClientRev} format="currency" />
        <KpiCard label="Existing Client Revenue" value={revenue.existingRev} prevValue={previous.revenue.existingRev} format="currency" />
        <KpiCard
          label="Revenue per Client"
          value={revenuePerClient}
          format="currency"
          hint={activeClients ? `${activeClients} active clients` : "No active clients"}
        />
      </div>
      <div className="section-note">
        <strong>Revenue</strong> is what clients were charged. <strong>Cash Collected</strong> is
        Stripe payouts banked, logged separately on the Revenue page. Profit is cash collected minus
        expenses; ROAS below uses revenue.
      </div>

      {/* ---- Section B: Sales Performance ---- */}
      <div className="section-label">Sales Performance</div>
      <div className="card card-pad mb-16">
        <div className="stat-row">
          <Stat label="Calls Booked" value={call.total} />
          <Stat label="Calls Attended" value={call.attended} />
          <Stat label="No Shows" value={call.noShows} />
          <Stat label="Cancellations" value={call.cancelled} />
          <Stat label="Follow-Ups" value={call.followUps} />
          <Stat label="New Clients" value={call.closed} />
          <Stat label="Show Rate" value={call.showRate} format="percent" />
          <Stat label="Close Rate" value={call.closeRate} format="percent" />
        </div>
      </div>

      {/* ---- Section C: Acquisition ---- */}
      <div className="section-label">Acquisition</div>
      <div className="card card-pad mb-16">
        <div className="stat-row">
          <Stat label="Ad Spend" value={acquisition.adSpend} format="currency" />
          <Stat label="Cost / Booked Call" value={acquisition.costPerBookedCall} format="currency" />
          <Stat label="Cost / Attended Call" value={acquisition.costPerAttendedCall} format="currency" />
          <Stat label="Cost / New Client" value={acquisition.costPerClient} format="currency" />
          <Stat label="ROAS" value={acquisition.roas} format="multiple" />
          <Stat label="Revenue / Booked Call" value={acquisition.revPerBookedCall} format="currency" />
          <Stat label="Revenue / Attended Call" value={acquisition.revPerAttendedCall} format="currency" />
        </div>
      </div>

      <div className="grid-2">
        <Card title="Revenue, Cash & Expenses" subtitle={label}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ececf1" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={{ stroke: "#e4e4e7" }} />
              <YAxis tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} width={64}
                tickFormatter={(v) => fmtCurrency(v)} />
              <Tooltip formatter={(v) => fmtCurrency(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#5b5bf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cash" name="Cash Collected" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Revenue Breakdown" subtitle="New vs existing clients">
          {revenueSplitTotal === 0 ? (
            <div className="empty-state">No revenue recorded in {label}.</div>
          ) : (
            <div className="breakdown-list">
              <BreakdownRow
                label="New Client Revenue"
                value={revenue.newClientRev}
                total={revenueSplitTotal}
                color="#5b5bf6"
              />
              <BreakdownRow
                label="Existing Client Revenue"
                value={revenue.existingRev}
                total={revenueSplitTotal}
                color="#16a34a"
              />
              <div className="breakdown-total">
                <span>Total</span>
                <span>{fmtCurrency(revenueSplitTotal)}</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="breakdown-row">
      <div className="breakdown-head">
        <span className="breakdown-name">
          <span className="dot-sm" style={{ background: color }} />
          {label}
        </span>
        <span className="breakdown-value">
          {fmtCurrency(value)} <span className="muted">· {pct.toFixed(0)}%</span>
        </span>
      </div>
      <ShareBar value={value} total={total} color={color} />
    </div>
  );
}

export const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e4e4e7",
  boxShadow: "0 4px 16px rgba(20,20,30,0.08)",
  fontSize: 12,
};
