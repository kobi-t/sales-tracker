import { useState } from "react";
import Sidebar from "./components/Sidebar";
import CallLog from "./pages/CallLog";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Revenue from "./pages/Revenue";
import Settings from "./pages/Settings";
import { DataProvider, useData } from "./store";

const PAGE_COMPONENTS = {
  dashboard: Dashboard,
  calls: CallLog,
  clients: Clients,
  revenue: Revenue,
  expenses: Expenses,
  reports: Reports,
  settings: Settings,
};

function Shell() {
  const [page, setPage] = useState("dashboard");
  const { error } = useData();
  const Page = PAGE_COMPONENTS[page] || Dashboard;

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} />
      <main className="main">
        {error && (
          <div className="alert alert-error">
            Could not load data from Supabase: {error.message || String(error)}
          </div>
        )}
        <Page />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
