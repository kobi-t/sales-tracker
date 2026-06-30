import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../api";

function EditableList({ title, description, items, onChange }) {
  const [draft, setDraft] = useState("");

  function add() {
    if (!draft.trim() || items.includes(draft.trim())) return;
    onChange([...items, draft.trim()]);
    setDraft("");
  }
  function remove(item) {
    onChange(items.filter((i) => i !== item));
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="section-title" style={{ marginBottom: 4 }}>{title}</div>
      <div className="page-subtitle" style={{ marginBottom: 14 }}>{description}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {items.map((item) => (
          <span key={item} className="badge" style={{ background: "#f1f1f4", color: "var(--text)" }}>
            {item}
            <button onClick={() => remove(item)} style={{ border: "none", background: "none", cursor: "pointer", display: "flex", padding: 0, color: "var(--text-muted)" }}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="text" placeholder="Add new option…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn" onClick={add}><Plus size={14} /> Add</button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.getSettings().then(setSettings); }, []);

  async function persist(next) {
    setSettings(next);
    await api.updateSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!settings) return <div className="loading-wrap">Loading settings…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Manage dropdown options used across Call Log and Expenses {saved && <span style={{ color: "var(--green)" }}>· Saved</span>}</div>
        </div>
      </div>

      <EditableList
        title="Call Outcomes"
        description="Options available in the Outcome dropdown on the Call Log."
        items={settings.callOutcomes}
        onChange={(items) => persist({ ...settings, callOutcomes: items })}
      />
      <EditableList
        title="Call Sources"
        description="Lead sources available on the Call Log."
        items={settings.callSources}
        onChange={(items) => persist({ ...settings, callSources: items })}
      />
      <EditableList
        title="Expense Categories"
        description="Categories available in the Expenses table."
        items={settings.expenseCategories}
        onChange={(items) => persist({ ...settings, expenseCategories: items })}
      />
    </div>
  );
}
