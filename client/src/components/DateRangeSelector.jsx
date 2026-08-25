import { useState } from "react";
import { DEFAULT_RANGE, RANGE_OPTIONS, resolveRange } from "../utils/dateRange";

/**
 * Hook that owns range state and hands back the resolved ISO boundaries.
 * `allDates` lets the "All Time" option span back to the earliest record.
 */
export function useDateRange(initial = DEFAULT_RANGE, allDates) {
  const [range, setRange] = useState(initial);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const resolved = resolveRange(range, customStart, customEnd, allDates);

  return {
    ...resolved,
    range,
    selectorProps: { range, setRange, customStart, setCustomStart, customEnd, setCustomEnd },
  };
}

export default function DateRangeSelector({
  range, setRange, customStart, setCustomStart, customEnd, setCustomEnd,
}) {
  return (
    <div className="range-bar">
      <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
        {RANGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {range === "custom" && (
        <>
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          <span className="range-sep">to</span>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
        </>
      )}
    </div>
  );
}
