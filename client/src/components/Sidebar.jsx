import { NavLink } from "react-router-dom";
import { LayoutDashboard, PhoneCall, Receipt, FileSpreadsheet, Settings as SettingsIcon } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calls", label: "Call Log", icon: PhoneCall },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/reports", label: "Monthly Reports", icon: FileSpreadsheet },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="dot">S</span>
        <span>SalesTrack</span>
      </div>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
        >
          <Icon size={16} />
          <span>{label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
