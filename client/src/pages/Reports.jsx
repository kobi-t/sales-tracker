import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api } from "../api";
import { filterByRange, computeFullSummary } from "../utils/metrics";
import { toCSV, downloadCSV } from "../utils/csv";

function monthBounds(monthStr) {
  // monthStr = "YYYY-MM"
  const [y, m] = monthStr.split("-").map(Number);
  const start = `${monthStr}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${monthStr}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export default function Reports() {
  const [calls, setCalls] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    api.getCalls().then(setCalls);
    api.getExpenses().then(setExpenses);
  }, []);

  if (!calls || !expenses) return <div className="loading-wrap">Loading reports…</div>;

  const { start, end } = monthBounds(month);
  const callsInMonth = filterByRange(calls, start, end);
  const expensesInMonth = filterByRange(expenses, start, end);
  const summary = computeFullSummary(callsInMonth, expensesInMonth);

  function exportCalls() {
    const csv = toCSV(callsInMonth, [
      { label: "Date", value: (r) => r.date },
      { label: "Name", value: (r) => r.name },
      { label: "Source", value: (r) => r.source },
      { label: "Booked", value: (r) => (r.booked ? "Yes" : "No") },
      { label: "Outcome", value: (r) => r.outcome },
      { label: "Revenue", value: (r) => r.revenue },
      { label: "Cash Collected", value: (r) => r.cash_collected },
      { label: "Offer Made", value: (r) => (r.offer_made ? "Yes" : "No") },
      { label: "Objection", value: (r) => r.objection },
      { label: "Call Summary", value: (r) => r.call_summary },
      { label: "Recording Link", value: (r) => r.recording_link },
    ]);
    downloadCSV(`sales-data-${month}.csv`, csv);
  }

  function exportExpenses() {
    const csv = toCSV(expensesInMonth, [
      { label: "Date", value: (r) => r.date },
      { label: "Category", value: (r) => r.category },
      { label: "Description", value: (r) => r.description },
      { label: "Amount", value: (r) => r.amount },
      { label: "Receipt Link", value: (r) => r.receipt_link },
    ]);
    downloadCSV(`expenses-${month}.csv`, csv);
  }

  function exportSummary() {
    const rows = [
      { metric: "Total Bookings", value: summary.totalBookings },
      { metric: "Cancellations", value: summary.cancelled },
      { metric: "Cancellation Rate (%)", value: summary.cancellationRate.toFixed(1) },
      { metric: "No-Shows", value: summary.noShows },
      { metric: "Reschedules", value: summary.rescheduled },
      { metric: "Show-Up Rate (%)", value: summary.showUpRate.toFixed(1) },
      { metric: "Full-Pay", value: summary.fullPay },
      { metric: "Split-Pay", value: summary.splitPay },
      { metric: "Deposits", value: summary.deposit },
      { metric: "No Deposit & Follow-Up", value: summary.noDepositFollowUp },
      { metric: "Offer & Didn't Buy", value: summary.offerDidntBuy },
      { metric: "Bad Fit & No Offer", value: summary.badFitNoOffer },
      { metric: "Conversion Rate (%)", value: summary.conversionRate.toFixed(1) },
      { metric: "Call-to-Offer Rate (%)", value: summary.callToOfferRate.toFixed(1) },
      { metric: "Offer-to-Close Rate (%)", value: summary.offerToCloseRate.toFixed(1) },
      { metric: "Total Revenue", value: summary.totalRevenue },
      { metric: "Total Cash Collected", value: summary.totalCash },
      { metric: "Total Ad Spend", value: summary.expenses.adSpend },
      { metric: "Total Expenses", value: summary.expenses.total },
      { metric: "Remaining Cash", value: summary.remainingCash },
      { metric: "ROAS", value: summary.roas.toFixed(2) },
      { metric: "Ads Bookings", value: summary.sourceBreakdown.Ads.bookings },
      { metric: "Ads Revenue", value: summary.sourceBreakdown.Ads.revenue },
      { metric: "Ads Conversion Rate (%)", value: summary.sourceBreakdown.Ads.conversionRate.toFixed(1) },
      { metric: "Organic Bookings", value: summary.sourceBreakdown.Organic.bookings },
      { metric: "Organic Revenue", value: summary.sourceBreakdown.Organic.revenue },
      { metric: "Organic Conversion Rate (%)", value: summary.sourceBreakdown.Organic.conversionRate.toFixed(1) },
    ];
    const csv = toCSV(rows, [
      { label: "Metric", value: (r) => r.metric },
      { label: "Value", value: (r) => r.value },
    ]);
    downloadCSV(`summary-${month}.csv`, csv);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Monthly Reports</div>
          <div className="page-subtitle">Pick a month and export CSVs for that period</div>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-label">Calls Logged</div><div className="kpi-value">{callsInMonth.length}</div></div>
        <div className="kpi-card"><div className="kpi-label">Revenue</div><div className="kpi-value">${summary.totalRevenue.toLocaleString()}</div></div>
        <div className="kpi-card"><div className="kpi-label">Cash Collected</div><div className="kpi-value">${summary.totalCash.toLocaleString()}</div></div>
        <div className="kpi-card"><div className="kpi-label">Expenses</div><div className="kpi-value">${summary.expenses.total.toLocaleString()}</div></div>
      </div>

      <div className="card card-pad">
        <div className="section-title">Export Files</div>

        <div className="export-card">
          <div>
            <div className="title">Sales Data (Call Log)</div>
            <div className="desc">All call records for {month}, including outcomes and revenue.</div>
          </div>
          <button className="btn btn-primary" onClick={exportCalls}><Download size={14} /> Download CSV</button>
        </div>

        <div className="export-card">
          <div>
            <div className="title">Expenses Data</div>
            <div className="desc">All expenses logged for {month}, by category.</div>
          </div>
          <button className="btn btn-primary" onClick={exportExpenses}><Download size={14} /> Download CSV</button>
        </div>

        <div className="export-card" style={{ marginBottom: 0 }}>
          <div>
            <div className="title">Summary</div>
            <div className="desc">Computed KPIs and breakdowns for {month} — same metrics shown on the Dashboard.</div>
          </div>
          <button className="btn btn-primary" onClick={exportSummary}><Download size={14} /> Download CSV</button>
        </div>
      </div>
    </div>
  );
}
