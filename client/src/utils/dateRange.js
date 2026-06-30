function pad(n) { return String(n).padStart(2, "0"); }
export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sunday
  x.setDate(x.getDate() - day);
  return x;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfQuarter(d) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}
function startOfYear(d) { return new Date(d.getFullYear(), 0, 1); }

export const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

// Returns { start, end } as ISO date strings (inclusive), plus the equivalent
// previous period of the same length for trend comparisons.
export function resolveRange(rangeValue, customStart, customEnd, allDates) {
  const now = new Date();
  let start, end;

  switch (rangeValue) {
    case "today":
      start = startOfDay(now);
      end = startOfDay(now);
      break;
    case "week":
      start = startOfWeek(now);
      end = startOfDay(now);
      break;
    case "month":
      start = startOfMonth(now);
      end = startOfDay(now);
      break;
    case "quarter":
      start = startOfQuarter(now);
      end = startOfDay(now);
      break;
    case "year":
      start = startOfYear(now);
      end = startOfDay(now);
      break;
    case "custom":
      start = customStart ? new Date(customStart) : startOfMonth(now);
      end = customEnd ? new Date(customEnd) : startOfDay(now);
      break;
    case "all":
    default: {
      if (allDates && allDates.length) {
        const sorted = [...allDates].sort();
        start = new Date(sorted[0]);
        end = new Date(sorted[sorted.length - 1]);
      } else {
        start = startOfYear(now);
        end = startOfDay(now);
      }
      break;
    }
  }

  const startISO = toISODate(start);
  const endISO = toISODate(end);

  // previous period of equal length immediately preceding `start`
  const lengthMs = Math.max(end - start, 0);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd.getTime() - lengthMs);

  return {
    start: startISO,
    end: endISO,
    prevStart: toISODate(prevStart),
    prevEnd: toISODate(prevEnd),
  };
}

export function inRange(dateStr, start, end) {
  return dateStr >= start && dateStr <= end;
}
