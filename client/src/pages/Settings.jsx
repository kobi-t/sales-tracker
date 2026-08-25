import { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { api } from "../api";
import { Card } from "../components/ui";
import { useData } from "../store";
import { tintedBadgeStyle } from "../utils/format";

const DEFAULT_COLOR = "#6b7280";

export default function Settings() {
  const { settings, refresh } = useData();
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => { if (settings) setDraft(settings); }, [settings]);

  if (!draft) return <div className="loading-wrap">Loading settings…</div>;

  // Saves immediately, keeping the optimistic value on screen.
  async function persist(patch) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setStatus("saving");
    try {
      await api.updateSettings(patch);
      setStatus("saved");
      setTimeout(() => setStatus(null), 1600);
      refresh();
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">
            Customise every dropdown, colour and metric rule. Changes save automatically.
          </div>
        </div>
        <SaveStatus status={status} />
      </div>

      <ColorList
        title="Call Outcomes"
        description="Options in the Outcome dropdown on the Call Log, with the colour used for their badge."
        items={draft.callOutcomes}
        colors={draft.outcomeColors}
        onChangeItems={(callOutcomes) => persist({ callOutcomes })}
        onChangeColors={(outcomeColors) => persist({ outcomeColors })}
        placeholder="Add new outcome…"
      />

      <Card
        title="Outcome Category Mapping"
        subtitle="Which outcomes count as what. These drive Show Rate, Close Rate, No Shows and New Clients everywhere in the app — an outcome can belong to more than one category."
      >
        <div className="mapping-grid">
          <ToggleGroup
            label="Counts as Closed (new client acquired)"
            options={draft.callOutcomes}
            selected={draft.closedOutcomes}
            onChange={(closedOutcomes) => persist({ closedOutcomes })}
            tone="#16a34a"
          />
          <ToggleGroup
            label="Counts as No Show"
            options={draft.callOutcomes}
            selected={draft.noShowOutcomes}
            onChange={(noShowOutcomes) => persist({ noShowOutcomes })}
            tone="#dc2626"
          />
          <ToggleGroup
            label="Counts as Cancelled"
            options={draft.callOutcomes}
            selected={draft.cancelledOutcomes}
            onChange={(cancelledOutcomes) => persist({ cancelledOutcomes })}
            tone="#dc2626"
          />
          <ToggleGroup
            label="Counts as Rescheduled"
            options={draft.callOutcomes}
            selected={draft.rescheduledOutcomes}
            onChange={(rescheduledOutcomes) => persist({ rescheduledOutcomes })}
            tone="#f59e0b"
          />
        </div>
        <p className="mapping-note">
          Anything not marked as No Show, Cancelled or Rescheduled counts as an <strong>attended</strong> call.
        </p>
      </Card>

      <PillList
        title="Lead Sources"
        description="Where prospects came from — used on the Call Log."
        items={draft.leadSources}
        onChange={(leadSources) => persist({ leadSources })}
        placeholder="Add lead source…"
      />

      <ColorList
        title="Client Statuses"
        description="Status options for clients, with the colour used for their badge and avatar."
        items={draft.clientStatuses}
        colors={draft.statusColors}
        onChangeItems={(clientStatuses) => persist({ clientStatuses })}
        onChangeColors={(statusColors) => persist({ statusColors })}
        placeholder="Add new status…"
      />

      <PillList
        title="Revenue Categories"
        description="Payment types available when logging client revenue."
        items={draft.revenueCategories}
        onChange={(revenueCategories) => persist({ revenueCategories })}
        placeholder="Add revenue category…"
      />

      <PillList
        title="Expense Categories"
        description="Categories available on the Expenses page. “Ad Spend” drives every acquisition metric."
        items={draft.expenseCategories}
        onChange={(expenseCategories) => persist({ expenseCategories })}
        placeholder="Add expense category…"
      />
    </div>
  );
}

function SaveStatus({ status }) {
  if (!status) return null;
  if (status === "error") return <span className="save-status error">Could not save</span>;
  if (status === "saving") return <span className="save-status">Saving…</span>;
  return <span className="save-status saved"><Check size={13} /> Saved</span>;
}

function AddRow({ placeholder, onAdd }) {
  const [value, setValue] = useState("");
  function submit() {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setValue("");
  }
  return (
    <div className="add-row">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      <button className="btn" onClick={submit}><Plus size={14} /> Add</button>
    </div>
  );
}

function PillList({ title, description, items, onChange, placeholder }) {
  return (
    <Card title={title} subtitle={description}>
      <div className="pill-wrap">
        {items.length === 0 && <span className="muted">Nothing here yet.</span>}
        {items.map((item) => (
          <span key={item} className="chip removable">
            {item}
            <button onClick={() => onChange(items.filter((i) => i !== item))} aria-label={`Remove ${item}`}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <AddRow
        placeholder={placeholder}
        onAdd={(v) => !items.includes(v) && onChange([...items, v])}
      />
    </Card>
  );
}

function ColorList({ title, description, items, colors, onChangeItems, onChangeColors, placeholder }) {
  return (
    <Card title={title} subtitle={description}>
      <div className="color-list">
        {items.length === 0 && <span className="muted">Nothing here yet.</span>}
        {items.map((item) => {
          const hex = colors?.[item] || DEFAULT_COLOR;
          return (
            <div key={item} className="color-row">
              <span className="color-row-name">{item}</span>
              <input
                type="color"
                value={hex}
                onChange={(e) => onChangeColors({ ...colors, [item]: e.target.value })}
                aria-label={`Colour for ${item}`}
              />
              <span className="color-badge" style={tintedBadgeStyle(hex)}>{item}</span>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => onChangeItems(items.filter((i) => i !== item))}
                aria-label={`Delete ${item}`}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
      <AddRow
        placeholder={placeholder}
        onAdd={(v) => {
          if (items.includes(v)) return;
          onChangeItems([...items, v]);
          if (!colors?.[v]) onChangeColors({ ...colors, [v]: DEFAULT_COLOR });
        }}
      />
    </Card>
  );
}

function ToggleGroup({ label, options, selected, onChange, tone }) {
  const active = new Set(selected || []);
  return (
    <div className="toggle-group">
      <div className="toggle-label">{label}</div>
      <div className="toggle-options">
        {options.length === 0 && <span className="muted">Add some outcomes first.</span>}
        {options.map((o) => {
          const on = active.has(o);
          return (
            <button
              key={o}
              className={`toggle-chip${on ? " on" : ""}`}
              style={on ? { background: `${tone}22`, color: tone, borderColor: `${tone}66` } : undefined}
              onClick={() => onChange(on ? selected.filter((s) => s !== o) : [...(selected || []), o])}
            >
              {on && <Check size={12} />}
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
