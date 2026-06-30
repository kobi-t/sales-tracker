import { RANGE_OPTIONS } from "../utils/dateRange";

export default function DateRangeSelector({ range, setRange, customStart, setCustomStart, customEnd, setCustomEnd }) {
  return (
    <div className="range-bar">
      <select value={range} onChange={(e) => setRange(e.target.value)}>
        {RANGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {range === "custom" && (
        <>
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          <span style={{ color: "var(--text-muted)" }}>to</span>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
        </>
      )}
    </div>
  );
}
