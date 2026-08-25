import { ArrowDown, ArrowUp, ArrowUpDown, Minus, X } from "lucide-react";
import { DASH, formatValue, tintedBadgeStyle } from "../utils/format";
import { trendPct } from "../utils/metrics";

/** Large headline metric with an optional vs-prior-period trend. */
export function KpiCard({ label, value, prevValue, format = "number", invertTrend = false, hint }) {
  const change = prevValue === undefined ? null : trendPct(value, prevValue);

  let trend = null;
  if (change !== null) {
    const flat = Math.abs(change) < 0.5;
    const up = change > 0;
    const good = invertTrend ? !up : up;
    const Icon = flat ? Minus : up ? ArrowUp : ArrowDown;
    trend = (
      <span className={`kpi-trend ${flat ? "flat" : good ? "up" : "down"}`}>
        <Icon size={12} />
        {Math.abs(change).toFixed(1)}% vs prior
      </span>
    );
  }

  const isDash = value === null || value === undefined;

  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value${isDash ? " is-dash" : ""}`}>{formatValue(value, format)}</div>
      {trend || (hint ? <span className="kpi-trend flat">{hint}</span> : null)}
    </div>
  );
}

/** Compact label + number, used for the stat blocks on the dashboard. */
export function Stat({ label, value, format = "number", tone }) {
  const isDash = value === null || value === undefined;
  return (
    <div className="stat-item">
      <div className={`num${isDash ? " is-dash" : ""}${tone ? ` tone-${tone}` : ""}`}>
        {formatValue(value, format)}
      </div>
      <div className="lbl">{label}</div>
    </div>
  );
}

export function StatBlock({ title, subtitle, children }) {
  return (
    <div className="card card-pad">
      <div className="section-title">{title}</div>
      {subtitle && <div className="section-subtitle">{subtitle}</div>}
      <div className="stat-row">{children}</div>
    </div>
  );
}

export function Card({ title, actions, subtitle, children, className = "", bodyClass = "card-pad" }) {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            <div className="section-title" style={{ marginBottom: subtitle ? 2 : 0 }}>{title}</div>
            {subtitle && <div className="section-subtitle" style={{ marginBottom: 0 }}>{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

/** Coloured pill driven by settings.outcomeColors / settings.statusColors. */
export function ColorBadge({ label, colors, fallback = "#6b7280" }) {
  if (!label) return <span className="dash">{DASH}</span>;
  const hex = (colors && colors[label]) || fallback;
  return <span className="color-badge" style={tintedBadgeStyle(hex)}>{label}</span>;
}

export function SortHeader({ label, column, sortKey, sortDir, onSort, align }) {
  const active = sortKey === column;
  return (
    <th onClick={() => onSort(column)} className={align === "right" ? "ta-right" : undefined}>
      <span className="th-inner">
        {label}
        <ArrowUpDown size={11} className={active ? "sort-active" : "sort-idle"} />
        {active && <span className="sr-dir">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </span>
    </th>
  );
}

export function Modal({ title, onClose, children, actions, width = 520 }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = "Delete", onCancel, onConfirm }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={420}
      actions={
        <>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-destructive" onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <p className="modal-body-text">{message}</p>
    </Modal>
  );
}

export function Field({ label, children, full }) {
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>;
}

export function Dash() {
  return <span className="dash">{DASH}</span>;
}

/** Horizontal share bar used in the revenue and expense breakdowns. */
export function ShareBar({ value, total, color = "#5b5bf6" }) {
  const pct = total > 0 ? Math.max((value / total) * 100, 0) : 0;
  return (
    <div className="share-bar">
      <div className="share-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}
