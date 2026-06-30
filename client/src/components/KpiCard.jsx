import { ArrowUp, ArrowDown, Minus } from "lucide-react";

export default function KpiCard({ label, value, prevValue, format = "number", invertTrend = false }) {
  const fmt = (v) => {
    if (format === "currency") return `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (format === "percent") return `${Number(v || 0).toFixed(1)}%`;
    if (format === "ratio") return `${Number(v || 0).toFixed(2)}x`;
    return Number(v || 0).toLocaleString();
  };

  let trend = null;
  if (prevValue !== undefined && prevValue !== null) {
    const diff = (value || 0) - (prevValue || 0);
    const pctChange = prevValue ? (diff / Math.abs(prevValue)) * 100 : value ? 100 : 0;
    let direction = "flat";
    if (Math.abs(pctChange) > 0.5) {
      direction = diff > 0 ? "up" : "down";
    }
    const isGood = invertTrend ? direction === "down" : direction === "up";
    const cls = direction === "flat" ? "flat" : isGood ? "up" : "down";
    const Icon = direction === "flat" ? Minus : direction === "up" ? ArrowUp : ArrowDown;
    trend = (
      <span className={`kpi-trend ${cls}`}>
        <Icon size={12} />
        {Math.abs(pctChange).toFixed(1)}% vs prior period
      </span>
    );
  }

  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{fmt(value)}</div>
      {trend}
    </div>
  );
}
