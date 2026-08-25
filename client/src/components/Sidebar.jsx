import {
  DollarSign, FileSpreadsheet, LayoutDashboard, PhoneCall,
  Receipt, Settings as SettingsIcon, Users,
} from "lucide-react";

export const PAGES = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "calls", label: "Call Log", icon: PhoneCall },
  { key: "clients", label: "Clients", icon: Users },
  { key: "revenue", label: "Revenue", icon: DollarSign },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "reports", label: "Monthly Reports", icon: FileSpreadsheet },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar({ page, setPage }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="dot">S</span>
        <span>SalesTrack</span>
      </div>
      <nav className="sidebar-nav">
        {PAGES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`nav-link${page === key ? " active" : ""}`}
            onClick={() => setPage(key)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
