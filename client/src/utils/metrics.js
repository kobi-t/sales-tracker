import { inRange } from "./dateRange";

export { toCSV, downloadCSV } from "./csv";

export function filterByRange(items, start, end) {
  return (items || []).filter((i) => inRange(i.date, start, end));
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Division that refuses to lie. Returns null whenever the denominator is zero
 * or either side is missing, so callers render an em dash instead of 0 / NaN.
 */
export function safeDiv(numerator, denominator) {
  const a = Number(numerator);
  const b = Number(denominator);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (b === 0) return null;
  const out = a / b;
  return Number.isFinite(out) ? out : null;
}

export function safePct(numerator, denominator) {
  const r = safeDiv(numerator, denominator);
  return r === null ? null : r * 100;
}

function listOf(settings, key, fallback) {
  const v = settings && settings[key];
  return Array.isArray(v) && v.length ? v : fallback;
}

/**
 * Classify calls using the outcome-category mapping from Settings.
 * showRate / closeRate are null (not 0) when their denominator is 0.
 */
export function computeCallMetrics(calls, settings) {
  const rows = calls || [];
  const noShowOutcomes = listOf(settings, "noShowOutcomes", ["No Show"]);
  const cancelledOutcomes = listOf(settings, "cancelledOutcomes", ["Cancelled"]);
  const rescheduledOutcomes = listOf(settings, "rescheduledOutcomes", ["Rescheduled"]);
  const closedOutcomes = listOf(settings, "closedOutcomes", ["Closed"]);

  const isIn = (list, outcome) => list.includes(outcome);

  const total = rows.length;
  const noShows = rows.filter((c) => isIn(noShowOutcomes, c.outcome)).length;
  const cancelled = rows.filter((c) => isIn(cancelledOutcomes, c.outcome)).length;
  const rescheduled = rows.filter((c) => isIn(rescheduledOutcomes, c.outcome)).length;
  const closed = rows.filter((c) => isIn(closedOutcomes, c.outcome)).length;

  // Attended = everything that isn't a no-show, cancellation or reschedule.
  const attended = rows.filter(
    (c) =>
      !isIn(noShowOutcomes, c.outcome) &&
      !isIn(cancelledOutcomes, c.outcome) &&
      !isIn(rescheduledOutcomes, c.outcome)
  ).length;

  // Matches "Follow Up" and legacy variants like "No Deposit & Follow-Up".
  const followUps = rows.filter((c) => /follow[\s-]?up/i.test(String(c.outcome || ""))).length;

  const dealValue = rows.reduce((s, c) => s + num(c.deal_value), 0);

  return {
    total,
    noShows,
    cancelled,
    rescheduled,
    attended,
    closed,
    followUps,
    dealValue,
    showRate: safePct(attended, total),
    closeRate: safePct(closed, attended),
  };
}

/**
 * Revenue for a period, split by whether the paying client was acquired inside
 * that period (new) or before it (existing).
 */
export function computeRevenueMetrics(payments, clients, periodStart, periodEnd) {
  const inPeriod = periodStart && periodEnd
    ? filterByRange(payments || [], periodStart, periodEnd)
    : (payments || []);

  const acquiredBy = new Map();
  for (const c of clients || []) acquiredBy.set(c.id, String(c.date_acquired || "").slice(0, 10));

  let total = 0;
  let newClientRev = 0;
  let existingRev = 0;
  const byClient = {};
  const byCategory = {};

  for (const p of inPeriod) {
    const amount = num(p.amount);
    total += amount;

    byClient[p.client_id] = (byClient[p.client_id] || 0) + amount;
    const category = p.category || "Other";
    byCategory[category] = (byCategory[category] || 0) + amount;

    const acquired = acquiredBy.get(p.client_id) || p.client_date_acquired || null;
    if (acquired && periodStart && acquired >= periodStart) newClientRev += amount;
    else existingRev += amount;
  }

  return { total, newClientRev, existingRev, byClient, byCategory, count: inPeriod.length };
}

export function computeExpenseMetrics(expenses) {
  const rows = expenses || [];
  const total = rows.reduce((s, e) => s + num(e.amount), 0);
  const adSpend = rows
    .filter((e) => e.category === "Ad Spend")
    .reduce((s, e) => s + num(e.amount), 0);

  const byCategory = {};
  for (const e of rows) {
    const category = e.category || "Other";
    byCategory[category] = (byCategory[category] || 0) + num(e.amount);
  }

  return { total, adSpend, byCategory, count: rows.length };
}

/**
 * Cost/return metrics. Anything that cannot be computed is null — including the
 * cost-per-X family when there is no ad spend at all, since "$0 per client" is
 * misleading rather than informative.
 */
export function computeAcquisitionMetrics(callMetrics, totalRevenue, expenseMetrics) {
  const adSpend = expenseMetrics ? num(expenseMetrics.adSpend) : 0;
  const hasSpend = adSpend > 0;

  return {
    adSpend,
    costPerBookedCall: hasSpend ? safeDiv(adSpend, callMetrics.total) : null,
    costPerAttendedCall: hasSpend ? safeDiv(adSpend, callMetrics.attended) : null,
    costPerClient: hasSpend ? safeDiv(adSpend, callMetrics.closed) : null,
    roas: hasSpend ? safeDiv(totalRevenue, adSpend) : null,
    revPerBookedCall: safeDiv(totalRevenue, callMetrics.total),
    revPerAttendedCall: safeDiv(totalRevenue, callMetrics.attended),
  };
}

export function computeProfit(totalRevenue, totalExpenses) {
  const profit = num(totalRevenue) - num(totalExpenses);
  return { profit, margin: safePct(profit, totalRevenue) };
}

/** Revenue and expenses bucketed over time for the dashboard chart. */
export function buildTimeSeries(payments, expenses, start, end, granularity = "day") {
  const buckets = new Map();

  const parse = (iso) => {
    const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const keyFor = (dateStr) => {
    const d = parse(dateStr);
    if (granularity === "month") return iso(d).slice(0, 7);
    if (granularity === "week") {
      const w = new Date(d);
      w.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return iso(w);
    }
    return iso(d);
  };

  const labelFor = (key) => {
    if (granularity === "month") {
      const [y, m] = key.split("-").map(Number);
      return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${String(y).slice(2)}`;
    }
    const [, m, d] = key.split("-").map(Number);
    return `${d}/${m}`;
  };

  const touch = (key) => {
    if (!buckets.has(key)) buckets.set(key, { key, label: labelFor(key), revenue: 0, expenses: 0 });
    return buckets.get(key);
  };

  // Seed every bucket across the range so the chart has no gaps.
  const cursor = parse(start);
  const last = parse(end);
  while (cursor <= last) {
    touch(keyFor(iso(cursor)));
    if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1);
    else if (granularity === "week") cursor.setDate(cursor.getDate() + 7);
    else cursor.setDate(cursor.getDate() + 1);
  }

  for (const p of payments || []) touch(keyFor(p.date)).revenue += num(p.amount);
  for (const e of expenses || []) touch(keyFor(e.date)).expenses += num(e.amount);

  return Array.from(buckets.values())
    .sort((a, b) => (a.key > b.key ? 1 : -1))
    .map((b) => ({ ...b, profit: b.revenue - b.expenses }));
}

/** Percent change vs a prior period, null when there is nothing to compare to. */
export function trendPct(current, previous) {
  if (current === null || current === undefined) return null;
  if (previous === null || previous === undefined) return null;
  const prev = Number(previous);
  if (!Number.isFinite(prev) || prev === 0) return null;
  return ((Number(current) - prev) / Math.abs(prev)) * 100;
}
