// Display helpers. Every metric that cannot be computed is `null`, and every
// formatter below renders `null` as an em dash so the UI never shows 0, 0%,
// NaN or Infinity when there is genuinely no data.

export const DASH = "—";

function isBlank(v) {
  return v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v));
}

export function fmtCurrency(v, { decimals = 0 } = {}) {
  if (isBlank(v)) return DASH;
  const n = Number(v);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function fmtPercent(v, { decimals = 1 } = {}) {
  if (isBlank(v)) return DASH;
  return `${Number(v).toFixed(decimals)}%`;
}

export function fmtNumber(v) {
  if (isBlank(v)) return DASH;
  return Number(v).toLocaleString();
}

export function fmtMultiple(v, { decimals = 2 } = {}) {
  if (isBlank(v)) return DASH;
  return `${Number(v).toFixed(decimals)}x`;
}

export function formatValue(v, format) {
  switch (format) {
    case "currency": return fmtCurrency(v);
    case "currency2": return fmtCurrency(v, { decimals: 2 });
    case "percent": return fmtPercent(v);
    case "multiple": return fmtMultiple(v);
    default: return fmtNumber(v);
  }
}

// "2026-08-25" -> "25 Aug 2026". Parsed manually so the browser never shifts
// a plain date across a timezone boundary.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(iso) {
  if (!iso) return DASH;
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Hex colour + 20% opacity background, full colour text — used by outcome and
// status badges (0x33 === 20% of 255).
export function tintedBadgeStyle(hex) {
  const color = /^#[0-9a-f]{6}$/i.test(hex || "") ? hex : "#6b7280";
  return { background: `${color}33`, color };
}
