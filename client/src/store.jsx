import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const DataContext = createContext(null);

/**
 * Loads every dataset once and shares it across pages. Mutations call the api
 * directly and then `refresh()` so every page stays in sync without each one
 * re-fetching on mount.
 */
export function DataProvider({ children }) {
  const [state, setState] = useState({
    calls: null,
    clients: null,
    payments: null,
    payouts: null,
    expenses: null,
    settings: null,
  });
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [calls, clients, payments, payouts, expenses, settings] = await Promise.all([
        api.getCalls(),
        api.getClients(),
        api.getPayments(),
        api.getPayouts(),
        api.getExpenses(),
        api.getSettings(),
      ]);
      setState({ calls, clients, payments, payouts, expenses, settings });
      setError(null);
    } catch (e) {
      console.error("Failed to load data", e);
      setError(e);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ ...state, error, refresh }), [state, error, refresh]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}

/** True once every dataset has arrived. */
export function useDataReady() {
  const { calls, clients, payments, payouts, expenses, settings } = useData();
  return Boolean(calls && clients && payments && payouts && expenses && settings);
}
