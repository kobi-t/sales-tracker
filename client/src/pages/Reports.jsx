import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card, Stat } from "../components/ui";
import { useData } from "../store";
import { monthBounds } from "../utils/dateRange";
import { DASH, fmtCurrency, fmtMultiple, fmtPercent } from "../utils/format";
import {
  computeAcquisitionMetrics, computeCallMetrics, computeExpenseMetrics, computeProfit,
  computeRevenueMetrics, downloadCSV, filterByRange, paymentCash, paymentRevenue, toCSV,
} from "../utils/metrics";

export default function Reports() {
  const { calls, clients, payments, expenses, settings } = useData();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const model = useMemo(() => {
    if (!calls || !clients || !payments || !expenses || !settings) return null;
    const { start, end, label } = monthBounds(month);

    const callsIn = filterByRange(calls, start, end);
    const expensesIn = filterByRange(expenses, start, end);
    const paymentsIn = filterByRange(payments, start, end);
    const clientsIn = clients.filter(
      (c) => String(c.date_acquired).slice(0, 10) >= start && String(c.date_acquired).slice(0, 10) <= end
    );

    const call = computeCallMetrics(callsIn, settings);
    const revenue = computeRevenueMetrics(payments, clients, start, end);
    const expense = computeExpenseMetrics(expensesIn);
    const acquisition = computeAcquisitionMetrics(call, revenue.total, expense);
    const { profit, margin } = computeProfit(revenue.totalCash, expense.total);

    return { start, end, label, callsIn, expensesIn, paymentsIn, clientsIn, call, revenue, expense, acquisition, profit, margin };
  }, [calls, clients, payments, expenses, settings, month]);

  if (!model) return <div className="loading-wrap">Loading reports…</div>;

  const { label, callsIn, expensesIn, paymentsIn, clientsIn, call, revenue, expense, acquisition, profit, margin } = model;

  const exports = [
    {
      title: "Call Log",
      desc: `${callsIn.length} calls logged in ${label}.`,
      run: () => downloadCSV(`call-log-${month}.csv`, toCSV(callsIn, [
        { label: "Date", value: (r) => r.date },
        { label: "Name", value: (r) => r.name },
        { label: "Lead Source", value: (r) => r.source },
        { label: "Outcome", value: (r) => r.outcome },
        { label: "Notes", value: (r) => r.notes || r.call_summary || "" },
        { label: "Deal Value", value: (r) => r.deal_value ?? 0 },
        { label: "Converted", value: (r) => (r.converted ? "Yes" : "No") },
      ])),
    },
    {
      title: "Revenue",
      desc: `${paymentsIn.length} client payments in ${label}.`,
      run: () => downloadCSV(`revenue-${month}.csv`, toCSV(paymentsIn, [
        { label: "Date", value: (r) => r.date },
        { label: "Client", value: (r) => r.client_name },
        { label: "Category", value: (r) => r.category },
        { label: "Revenue", value: (r) => paymentRevenue(r).toFixed(2) },
        { label: "Cash Collected", value: (r) => paymentCash(r).toFixed(2) },
        { label: "Outstanding", value: (r) => (paymentRevenue(r) - paymentCash(r)).toFixed(2) },
        { label: "Notes", value: (r) => r.notes || "" },
      ])),
    },
    {
      title: "Expenses",
      desc: `${expensesIn.length} expenses in ${label}.`,
      run: () => downloadCSV(`expenses-${month}.csv`, toCSV(expensesIn, [
        { label: "Date", value: (r) => r.date },
        { label: "Category", value: (r) => r.category },
        { label: "Description", value: (r) => r.description || "" },
        { label: "Amount", value: (r) => r.amount },
      ])),
    },
    {
      title: "New Clients",
      desc: `${clientsIn.length} ${clientsIn.length === 1 ? "client" : "clients"} acquired in ${label}.`,
      run: () => downloadCSV(`new-clients-${month}.csv`, toCSV(clientsIn, [
        { label: "Name", value: (r) => r.name },
        { label: "Date Acquired", value: (r) => r.date_acquired },
        { label: "Status", value: (r) => r.status },
        { label: "Notes", value: (r) => r.notes || "" },
      ])),
    },
    {
      title: "Full Summary",
      desc: "Every KPI for the month as Section / Metric / Value.",
      run: () => {
        const csvValue = (v, kind) => {
          if (v === null || v === undefined) return "No data";
          if (kind === "percent") return Number(v).toFixed(1);
          if (kind === "money") return Number(v).toFixed(2);
          if (kind === "multiple") return Number(v).toFixed(2);
          return v;
        };
        const rows = [
          ["Revenue", "Total Revenue (agreed deal value)", csvValue(revenue.total, "money")],
          ["Revenue", "Total Cash Collected (money received)", csvValue(revenue.totalCash, "money")],
          ["Revenue", "Outstanding (revenue not yet collected)", csvValue(revenue.outstanding, "money")],
          ["Revenue", "New Client Revenue", csvValue(revenue.newClientRev, "money")],
          ["Revenue", "New Client Cash Collected", csvValue(revenue.newClientCash, "money")],
          ["Revenue", "Existing Client Revenue", csvValue(revenue.existingRev, "money")],
          ["Revenue", "Existing Client Cash Collected", csvValue(revenue.existingCash, "money")],
          ["Revenue", "Number of Payments", paymentsIn.length],
          ["Revenue", "New Clients Acquired", clientsIn.length],
          ["Expenses", "Total Expenses", csvValue(expense.total, "money")],
          ["Expenses", "Ad Spend", csvValue(expense.adSpend, "money")],
          ["Expenses", "Other Expenses", csvValue(expense.total - expense.adSpend, "money")],
          ["Expenses", "Number of Expenses", expensesIn.length],
          ...Object.entries(expense.byCategory).map(([cat, amt]) => ["Expenses", `Category: ${cat}`, csvValue(amt, "money")]),
          ["Profitability", "Profit (cash collected - expenses)", csvValue(profit, "money")],
          ["Profitability", "Profit Margin % (of cash collected)", csvValue(margin, "percent")],
          ["Sales", "Calls Booked", call.total],
          ["Sales", "Calls Attended", call.attended],
          ["Sales", "No Shows", call.noShows],
          ["Sales", "Cancellations", call.cancelled],
          ["Sales", "Rescheduled", call.rescheduled],
          ["Sales", "Follow-Ups", call.followUps],
          ["Sales", "New Clients (closed calls)", call.closed],
          ["Sales", "Show Rate (%)", csvValue(call.showRate, "percent")],
          ["Sales", "Close Rate (%)", csvValue(call.closeRate, "percent")],
          ["Acquisition", "Ad Spend", csvValue(acquisition.adSpend, "money")],
          ["Acquisition", "Cost per Booked Call", csvValue(acquisition.costPerBookedCall, "money")],
          ["Acquisition", "Cost per Attended Call", csvValue(acquisition.costPerAttendedCall, "money")],
          ["Acquisition", "Cost per New Client", csvValue(acquisition.costPerClient, "money")],
          ["Acquisition", "ROAS (revenue / ad spend)", csvValue(acquisition.roas, "multiple")],
          ["Acquisition", "Revenue per Booked Call", csvValue(acquisition.revPerBookedCall, "money")],
          ["Acquisition", "Revenue per Attended Call", csvValue(acquisition.revPerAttendedCall, "money")],
        ].map(([section, metric, value]) => ({ section, metric, value }));

        downloadCSV(`summary-${month}.csv`, toCSV(rows, [
          { label: "Section", value: (r) => r.section },
          { label: "Metric", value: (r) => r.metric },
          { label: "Value", value: (r) => r.value },
        ]));
      },
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Monthly Reports</div>
          <div className="page-subtitle">Snapshot and exports for {label}</div>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="grid-2">
        <Card title="Revenue & Profit" subtitle={label}>
          <div className="stat-row">
            <Stat label="Total Revenue" value={revenue.total} format="currency" />
            <Stat label="Cash Collected" value={revenue.totalCash} format="currency" />
            <Stat label="Outstanding" value={revenue.outstanding} format="currency" />
            <Stat label="New Client Revenue" value={revenue.newClientRev} format="currency" />
            <Stat label="Existing Client Revenue" value={revenue.existingRev} format="currency" />
            <Stat label="Total Expenses" value={expense.total} format="currency" />
            <Stat label="Profit" value={profit} format="currency" tone={profit < 0 ? "negative" : "positive"} />
            <Stat label="Profit Margin" value={margin} format="percent" />
          </div>
          <p className="mapping-note">
            Profit = cash collected − expenses. Margin is measured against cash collected.
          </p>
        </Card>

        <Card title="Sales & Acquisition" subtitle={label}>
          <div className="stat-row">
            <Stat label="Calls Booked" value={call.total} />
            <Stat label="Attended" value={call.attended} />
            <Stat label="No Shows" value={call.noShows} />
            <Stat label="New Clients" value={call.closed} />
            <Stat label="Show Rate" value={call.showRate} format="percent" />
            <Stat label="Close Rate" value={call.closeRate} format="percent" />
            <Stat label="Cost / New Client" value={acquisition.costPerClient} format="currency" />
            <Stat label="ROAS" value={acquisition.roas} format="multiple" />
          </div>
          <p className="mapping-note">ROAS = agreed revenue ÷ ad spend.</p>
        </Card>
      </div>

      <Card title="Export Data" subtitle={`All exports cover ${label}`}>
        {exports.map((x) => (
          <div key={x.title} className="export-card">
            <div>
              <div className="title">{x.title}</div>
              <div className="desc">{x.desc}</div>
            </div>
            <button className="btn btn-primary" onClick={x.run}><Download size={14} /> Download CSV</button>
          </div>
        ))}
      </Card>

      <div className="report-footnote">
        Values shown as {DASH} have no data for {label} — for example {fmtPercent(null)} close rate with no attended
        calls, or {fmtMultiple(null)} ROAS with no ad spend. Exports write “No data” in those cells rather
        than {fmtCurrency(0)}.
      </div>
    </div>
  );
}
