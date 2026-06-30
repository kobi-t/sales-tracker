import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { api } from "../api";
import DateRangeSelector from "../components/DateRangeSelector";
import KpiCard from "../components/KpiCard";
import { resolveRange } from "../utils/dateRange";
import { filterByRange, computeFullSummary, buildTimeSeries } from "../utils/metrics";

const ADS = "var(--ads)";
const ORGANIC = "var(--organic)";
const PIE_COLORS = ["#5b5bf6", "#1a9c6b", "#f5a524", "#d4493c", "#8b8bf9", "#6b6b76"];

export default function Dashboard() {
  const [calls, setCalls] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [range, setRange] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [granularity, setGranularity] = useState("day");

  useEffect(() => {
    api.getCalls().then(setCalls);
    api.getExpenses().then(setExpenses);
  }, []);

  const allDates = useMemo(() => {
    if (!calls || !expenses) return [];
    return [...calls.map((c) => c.date), ...expenses.map((e) => e.date)];
  }, [calls, expenses]);

  const { start, end, prevStart, prevEnd } = useMemo(
    () => resolveRange(range, customStart, customEnd, allDates),
    [range, customStart, customEnd, allDates]
  );

  if (!calls || !expenses) {
    return <div className="loading-wrap">Loading dashboard…</div>;
  }

  const callsInRange = filterByRange(calls, start, end);
  const expensesInRange = filterByRange(expenses, start, end);
  const prevCalls = filterByRange(calls, prevStart, prevEnd);
  const prevExpenses = filterByRange(expenses, prevStart, prevEnd);

  const summary = computeFullSummary(callsInRange, expensesInRange);
  const prevSummary = computeFullSummary(prevCalls, prevExpenses);

  const series = buildTimeSeries(callsInRange, expensesInRange, start, end, granularity);

  const bookingsBySource = [
    { name: "Ads", value: summary.sourceBreakdown.Ads.bookings },
    { name: "Organic", value: summary.sourceBreakdown.Organic.bookings },
  ];

  const outcomeData = [
    { name: "Full-Pay", value: summary.fullPay },
    { name: "Split-Pay", value: summary.splitPay },
    { name: "Deposit", value: summary.deposit },
    { name: "No Deposit & FU", value: summary.noDepositFollowUp },
    { name: "Offer, No Buy", value: summary.offerDidntBuy },
    { name: "Bad Fit", value: summary.badFitNoOffer },
  ].filter((d) => d.value > 0);

  const expenseCategoryData = Object.entries(summary.expenses.byCategory).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Overview of bookings, revenue, and spend</div>
        </div>
        <DateRangeSelector
          range={range} setRange={setRange}
          customStart={customStart} setCustomStart={setCustomStart}
          customEnd={customEnd} setCustomEnd={setCustomEnd}
        />
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        <KpiCard label="Total Revenue" value={summary.totalRevenue} prevValue={prevSummary.totalRevenue} format="currency" />
        <KpiCard label="Cash Collected" value={summary.totalCash} prevValue={prevSummary.totalCash} format="currency" />
        <KpiCard label="Remaining Cash" value={summary.remainingCash} prevValue={prevSummary.remainingCash} format="currency" />
        <KpiCard label="Conversion Rate" value={summary.conversionRate} prevValue={prevSummary.conversionRate} format="percent" />
        <KpiCard label="Show-Up Rate" value={summary.showUpRate} prevValue={prevSummary.showUpRate} format="percent" />
        <KpiCard label="ROAS" value={summary.roas} prevValue={prevSummary.roas} format="ratio" />
      </div>

      {/* Revenue & Cash chart + Source breakdown */}
      <div className="grid-2">
        <div className="card card-pad">
          <div className="toolbar" style={{ marginBottom: 10 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Revenue & Cash Collected</div>
            <div className="chart-toggle">
              {["day", "week", "month"].map((g) => (
                <button key={g} className={granularity === g ? "active" : ""} onClick={() => setGranularity(g)}>
                  {g[0].toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="key" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#5b5bf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cash" name="Cash Collected" stroke="#1a9c6b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-pad">
          <div className="section-title">Bookings by Source</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bookingsBySource}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="#5b5bf6" />
                <Cell fill="#1a9c6b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Outcome pie + Cancellation/showup line + Expenses chart */}
      <div className="grid-3">
        <div className="card card-pad">
          <div className="section-title">Outcome Distribution</div>
          {outcomeData.length === 0 ? (
            <div className="empty-state">No calls in this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {outcomeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card card-pad">
          <div className="section-title">Cancellation & Show-Up Rate</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="key" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="cancellationRate" name="Cancellation %" stroke="#d4493c" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="showUpRate" name="Show-Up %" stroke="#1a9c6b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-pad">
          <div className="section-title">Expenses by Category</div>
          {expenseCategoryData.length === 0 ? (
            <div className="empty-state">No expenses in this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expenseCategoryData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {expenseCategoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ROAS over time */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="section-title">ROAS Over Time</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
            <XAxis dataKey="key" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="roas" name="ROAS" stroke="#5b5bf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed breakdown rows */}
      <div className="grid-2">
        <div className="card card-pad">
          <div className="section-title">Booking & Show-Up Metrics</div>
          <div className="stat-row">
            <div className="stat-item"><div className="num">{summary.totalBookings}</div><div className="lbl">Total Bookings</div></div>
            <div className="stat-item"><div className="num">{summary.cancelled}</div><div className="lbl">Cancellations</div></div>
            <div className="stat-item"><div className="num">{summary.cancellationRate.toFixed(1)}%</div><div className="lbl">Cancellation Rate</div></div>
            <div className="stat-item"><div className="num">{summary.noShows}</div><div className="lbl">No-Shows</div></div>
            <div className="stat-item"><div className="num">{summary.rescheduled}</div><div className="lbl">Reschedules</div></div>
            <div className="stat-item"><div className="num">{summary.showUpRate.toFixed(1)}%</div><div className="lbl">Show-Up Rate</div></div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-title">Outcome & Sales Metrics</div>
          <div className="stat-row">
            <div className="stat-item"><div className="num">{summary.fullPay}</div><div className="lbl">Full-Pay</div></div>
            <div className="stat-item"><div className="num">{summary.splitPay}</div><div className="lbl">Split-Pay</div></div>
            <div className="stat-item"><div className="num">{summary.deposit}</div><div className="lbl">Deposits</div></div>
            <div className="stat-item"><div className="num">{summary.noDepositFollowUp}</div><div className="lbl">No Deposit & FU</div></div>
            <div className="stat-item"><div className="num">{summary.offerDidntBuy}</div><div className="lbl">Offer, No Buy</div></div>
            <div className="stat-item"><div className="num">{summary.badFitNoOffer}</div><div className="lbl">Bad Fit</div></div>
            <div className="stat-item"><div className="num">{summary.conversionRate.toFixed(1)}%</div><div className="lbl">Conversion Rate</div></div>
            <div className="stat-item"><div className="num">{summary.callToOfferRate.toFixed(1)}%</div><div className="lbl">Call-to-Offer Rate</div></div>
            <div className="stat-item"><div className="num">{summary.offerToCloseRate.toFixed(1)}%</div><div className="lbl">Offer-to-Close Rate</div></div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <div className="section-title">Source Breakdown</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Source</th><th>Bookings</th><th>Revenue</th><th>Cash</th><th>Conv. Rate</th></tr></thead>
              <tbody>
                {["Ads", "Organic"].map((s) => (
                  <tr key={s}>
                    <td><span className={`badge ${s.toLowerCase()}`}>{s}</span></td>
                    <td>{summary.sourceBreakdown[s].bookings}</td>
                    <td>${summary.sourceBreakdown[s].revenue.toLocaleString()}</td>
                    <td>${summary.sourceBreakdown[s].cash.toLocaleString()}</td>
                    <td>{summary.sourceBreakdown[s].conversionRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-title">Financials</div>
          <div className="stat-row">
            <div className="stat-item"><div className="num">${summary.expenses.adSpend.toLocaleString()}</div><div className="lbl">Total Ad Spend</div></div>
            <div className="stat-item"><div className="num">${summary.expenses.total.toLocaleString()}</div><div className="lbl">Total Expenses</div></div>
            <div className="stat-item"><div className="num">${summary.remainingCash.toLocaleString()}</div><div className="lbl">Remaining Cash</div></div>
            <div className="stat-item"><div className="num">{summary.roas.toFixed(2)}x</div><div className="lbl">ROAS</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
