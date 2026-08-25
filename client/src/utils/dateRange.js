function pad(n) { return String(n).padStart(2, "0"); }

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d) {
  // Week starts Monday.
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function startOfYear(d) { return new Date(d.getFullYear(), 0, 1); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const RANGE_OPTIONS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "last3", label: "Last 3 Months" },
  { value: "last6", label: "Last 6 Months" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

export const DEFAULT_RANGE = "month";

/**
 * Resolve a range option into concrete ISO dates.
 * Returns { start, end, prevStart, prevEnd, label } where prevStart/prevEnd are
 * an equal-length period immediately preceding `start`, used for trend arrows.
 */
export function resolveRange(rangeValue, customStart, customEnd) {
  const now = new Date();
  let start, end, label;

  switch (rangeValue) {
    case "week":
      start = startOfWeek(now);
      end = startOfDay(now);
      label = "This Week";
      break;
    case "lastMonth": {
      const prevMonth = addMonths(startOfMonth(now), -1);
      start = prevMonth;
      end = endOfMonth(prevMonth);
      label = `${MONTH_NAMES[prevMonth.getMonth()]} ${prevMonth.getFullYear()}`;
      break;
    }
    case "last3":
      start = addMonths(startOfMonth(now), -2);
      end = startOfDay(now);
      label = "Last 3 Months";
      break;
    case "last6":
      start = addMonths(startOfMonth(now), -5);
      end = startOfDay(now);
      label = "Last 6 Months";
      break;
    case "year":
      start = startOfYear(now);
      end = startOfDay(now);
      label = String(now.getFullYear());
      break;
    case "custom": {
      start = customStart ? parseISO(customStart) : startOfMonth(now);
      end = customEnd ? parseISO(customEnd) : startOfDay(now);
      if (end < start) [start, end] = [end, start];
      label = `${toISODate(start)} → ${toISODate(end)}`;
      break;
    }
    case "month":
    default:
      start = startOfMonth(now);
      end = startOfDay(now);
      label = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
      break;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const lengthDays = Math.max(Math.round((startOfDay(end) - startOfDay(start)) / dayMs), 0);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - lengthDays);

  return {
    start: toISODate(start),
    end: toISODate(end),
    prevStart: toISODate(prevStart),
    prevEnd: toISODate(prevEnd),
    label,
  };
}

function parseISO(str) {
  const [y, m, d] = String(str).slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function inRange(dateStr, start, end) {
  if (!dateStr) return false;
  const d = String(dateStr).slice(0, 10);
  return d >= start && d <= end;
}

/** Bucket granularity that keeps a chart readable for the given span. */
export function granularityFor(start, end) {
  const days = Math.round((parseISO(end) - parseISO(start)) / (24 * 60 * 60 * 1000)) + 1;
  if (days <= 45) return "day";
  if (days <= 200) return "week";
  return "month";
}

export function monthBounds(monthStr) {
  const [y, m] = String(monthStr).split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${monthStr}-01`,
    end: `${monthStr}-${pad(lastDay)}`,
    label: `${MONTH_NAMES[m - 1]} ${y}`,
  };
}
