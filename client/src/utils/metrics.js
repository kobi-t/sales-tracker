import { inRange } from "./dateRange";

export function filterByRange(items, start, end) {
  return items.filter((i) => inRange(i.date, start, end));
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

const CLOSE_OUTCOMES = ["Full-Pay", "Split-Pay", "Deposit"];
const OFFER_OUTCOMES = ["Full-Pay", "Split-Pay", "Deposit", "Offer & Didn't Buy"];

export function computeCallMetrics(calls) {
  const total = calls.length;
  const cancelled = calls.filter((c) => c.outcome === "Cancelled").length;
  const noShows = calls.filter((c) => c.outcome === "No-Show").length;
  const rescheduled = calls.filter((c) => c.outcome === "Rescheduled").length;
  const showedUp = calls.filter(
    (c) => c.outcome !== "No-Show" && c.outcome !== "Cancelled" && c.outcome !== "Rescheduled"
  ).length;

  const fullPay = calls.filter((c) => c.outcome === "Full-Pay").length;
  const splitPay = calls.filter((c) => c.outcome === "Split-Pay").length;
  const deposit = calls.filter((c) => c.outcome === "Deposit").length;
  const noDepositFollowUp = calls.filter((c) => c.outcome === "No Deposit & Follow-Up").length;
  const offerDidntBuy = calls.filter((c) => c.outcome === "Offer & Didn't Buy").length;
  const badFitNoOffer = calls.filter((c) => c.outcome === "Bad Fit & No Offer").length;

  const closedWon = calls.filter((c) => CLOSE_OUTCOMES.includes(c.outcome)).length;
  const offersMade = calls.filter((c) => c.offer_made || OFFER_OUTCOMES.includes(c.outcome)).length;

  const totalRevenue = calls.reduce((s, c) => s + (Number(c.revenue) || 0), 0);
  const totalCash = calls.reduce((s, c) => s + (Number(c.cash_collected) || 0), 0);

  return {
    totalBookings: total,
    cancelled,
    cancellationRate: pct(cancelled, total),
    noShows,
    rescheduled,
    showedUp,
    showUpRate: pct(showedUp, total),

    fullPay,
    splitPay,
    deposit,
    noDepositFollowUp,
    offerDidntBuy,
    badFitNoOffer,

    conversionRate: pct(closedWon, total),
    callToOfferRate: pct(offersMade, total),
    offerToCloseRate: pct(closedWon, offersMade),

    totalRevenue,
    totalCash,
  };
}

export function computeExpenseMetrics(expenses) {
  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const adSpend = expenses
    .filter((e) => e.category === "Ad Spend")
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const byCategory = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0);
  }

  return { total, adSpend, byCategory };
}

export function computeSourceBreakdown(calls) {
  const sources = ["Ads", "Organic"];
  const out = {};
  for (const source of sources) {
    const subset = calls.filter((c) => c.source === source);
    const m = computeCallMetrics(subset);
    out[source] = {
      bookings: subset.length,
      revenue: m.totalRevenue,
      cash: m.totalCash,
      conversionRate: m.conversionRate,
    };
  }
  return out;
}

export function computeROAS(calls, adSpend) {
  const adsRevenue = calls
    .filter((c) => c.source === "Ads")
    .reduce((s, c) => s + (Number(c.revenue) || 0), 0);
  if (!adSpend) return 0;
  return adsRevenue / adSpend;
}

// Full dashboard summary for a given (already date-filtered) set of calls + expenses
export function computeFullSummary(calls, expenses) {
  const callMetrics = computeCallMetrics(calls);
  const expenseMetrics = computeExpenseMetrics(expenses);
  const sourceBreakdown = computeSourceBreakdown(calls);
  const roas = computeROAS(calls, expenseMetrics.adSpend);
  const remainingCash = callMetrics.totalCash - expenseMetrics.total;

  return {
    ...callMetrics,
    expenses: expenseMetrics,
    sourceBreakdown,
    roas,
    remainingCash,
  };
}

// Bucket calls/expenses into a time series for charting.
// granularity: 'day' | 'week' | 'month'
export function buildTimeSeries(calls, expenses, start, end, granularity = "day") {
  const buckets = new Map();
  const bucketKey = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    if (granularity === "month") {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    if (granularity === "week") {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return weekStart.toISOString().slice(0, 10);
    }
    return dateStr;
  };

  // seed buckets across the whole range so charts don't have gaps
  const cursor = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  while (cursor <= endDate) {
    const key = bucketKey(toISOFromDate(cursor));
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        revenue: 0,
        cash: 0,
        bookings: 0,
        cancelled: 0,
        showedUp: 0,
        adSpend: 0,
      });
    }
    if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1);
    else if (granularity === "week") cursor.setDate(cursor.getDate() + 7);
    else cursor.setDate(cursor.getDate() + 1);
  }

  for (const c of calls) {
    const key = bucketKey(c.date);
    const b = buckets.get(key) || { key, revenue: 0, cash: 0, bookings: 0, cancelled: 0, showedUp: 0, adSpend: 0 };
    b.revenue += Number(c.revenue) || 0;
    b.cash += Number(c.cash_collected) || 0;
    b.bookings += 1;
    if (c.outcome === "Cancelled") b.cancelled += 1;
    if (!["No-Show", "Cancelled", "Rescheduled"].includes(c.outcome)) b.showedUp += 1;
    buckets.set(key, b);
  }
  for (const e of expenses) {
    if (e.category !== "Ad Spend") continue;
    const key = bucketKey(e.date);
    const b = buckets.get(key) || { key, revenue: 0, cash: 0, bookings: 0, cancelled: 0, showedUp: 0, adSpend: 0 };
    b.adSpend += Number(e.amount) || 0;
    buckets.set(key, b);
  }

  return Array.from(buckets.values())
    .sort((a, b) => (a.key > b.key ? 1 : -1))
    .map((b) => ({
      ...b,
      cancellationRate: pct(b.cancelled, b.bookings),
      showUpRate: pct(b.showedUp, b.bookings),
      roas: b.adSpend ? b.revenue / b.adSpend : 0,
    }));
}

function toISOFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
