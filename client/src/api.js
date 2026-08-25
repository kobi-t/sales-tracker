import { supabase } from "./supabaseClient";

function check(error) {
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Settings: JS uses camelCase, the DB uses snake_case. All mapping lives here.
// ---------------------------------------------------------------------------

const SETTINGS_COLUMNS = {
  callOutcomes: "call_outcomes",
  leadSources: "lead_sources",
  clientStatuses: "client_statuses",
  revenueCategories: "revenue_categories",
  expenseCategories: "expense_categories",
  closedOutcomes: "closed_outcomes",
  noShowOutcomes: "no_show_outcomes",
  cancelledOutcomes: "cancelled_outcomes",
  rescheduledOutcomes: "rescheduled_outcomes",
  outcomeColors: "outcome_colors",
  statusColors: "status_colors",
};

export const SETTINGS_DEFAULTS = {
  callOutcomes: [
    "No Show", "Cancelled", "Follow Up", "Offer Made",
    "Closed", "Not Qualified", "Not Interested", "Rescheduled",
  ],
  leadSources: ["Ads", "Organic", "Referral", "Other"],
  clientStatuses: ["Active", "Inactive", "Paused"],
  revenueCategories: ["New Client", "Retainer", "Other"],
  expenseCategories: ["Ad Spend", "Software/Tools", "Contractors", "Travel", "Other"],
  closedOutcomes: ["Closed"],
  noShowOutcomes: ["No Show"],
  cancelledOutcomes: ["Cancelled"],
  rescheduledOutcomes: ["Rescheduled"],
  outcomeColors: {
    "No Show": "#d4493c",
    "Cancelled": "#d4493c",
    "Follow Up": "#f5a524",
    "Offer Made": "#5b5bf6",
    "Closed": "#1a9c6b",
    "Not Qualified": "#6b6b76",
    "Not Interested": "#6b6b76",
    "Rescheduled": "#f5a524",
  },
  statusColors: {
    Active: "#1a9c6b",
    Inactive: "#6b6b76",
    Paused: "#f5a524",
  },
};

function toSettingsShape(row) {
  const out = {};
  for (const [jsKey, column] of Object.entries(SETTINGS_COLUMNS)) {
    const value = row ? row[column] : undefined;
    const isEmpty =
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0);
    out[jsKey] = isEmpty ? SETTINGS_DEFAULTS[jsKey] : value;
  }
  // Pre-v2 installs stored lead sources in `call_sources`.
  if ((!row || !row.lead_sources || !row.lead_sources.length) && row && row.call_sources?.length) {
    out.leadSources = row.call_sources;
  }
  return out;
}

function fromSettingsShape(partial) {
  const payload = {};
  for (const [jsKey, column] of Object.entries(SETTINGS_COLUMNS)) {
    if (partial[jsKey] !== undefined) payload[column] = partial[jsKey];
  }
  return payload;
}

// ---------------------------------------------------------------------------

export const api = {
  // ---- Calls -------------------------------------------------------------
  async getCalls() {
    const { data, error } = await supabase
      .from("calls")
      .select("*")
      .order("date", { ascending: false });
    check(error);
    return data || [];
  },
  async createCall(payload) {
    const { data, error } = await supabase.from("calls").insert(payload).select().single();
    check(error);
    return data;
  },
  async updateCall(id, payload) {
    const { data, error } = await supabase.from("calls").update(payload).eq("id", id).select().single();
    check(error);
    return data;
  },
  async deleteCall(id) {
    const { error } = await supabase.from("calls").delete().eq("id", id);
    check(error);
    return { ok: true };
  },

  /**
   * Create a client from a closed call and link the two.
   * Postgrest has no client-side transaction, so if the link-back fails the
   * new client row is removed again — the caller never sees a half-converted
   * state where a client exists but the call still looks unconverted.
   */
  async convertCallToClient(callId, clientData) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: clientData.name,
        date_acquired: clientData.date_acquired,
        status: clientData.status || "Active",
        notes: clientData.notes || "",
        source_call_id: callId,
      })
      .select()
      .single();
    check(clientError);

    const { data: call, error: callError } = await supabase
      .from("calls")
      .update({ converted: true, client_id: client.id })
      .eq("id", callId)
      .select()
      .single();

    if (callError) {
      await supabase.from("clients").delete().eq("id", client.id);
      throw callError;
    }

    return { client, call };
  },

  // ---- Clients -----------------------------------------------------------
  async getClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("date_acquired", { ascending: false });
    check(error);
    return data || [];
  },
  async createClient(payload) {
    const { data, error } = await supabase.from("clients").insert(payload).select().single();
    check(error);
    return data;
  },
  async updateClient(id, payload) {
    const { data, error } = await supabase.from("clients").update(payload).eq("id", id).select().single();
    check(error);
    return data;
  },
  /** Payments cascade-delete in the DB; calls fall back to client_id = null. */
  async deleteClient(id) {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    check(error);
    return { ok: true };
  },

  // ---- Payments ----------------------------------------------------------
  async getPayments() {
    const { data, error } = await supabase
      .from("client_payments")
      .select("*, clients(name, date_acquired, status)")
      .order("date", { ascending: false });
    check(error);
    return (data || []).map(flattenPayment);
  },
  async getPaymentsForClient(clientId) {
    const { data, error } = await supabase
      .from("client_payments")
      .select("*, clients(name, date_acquired, status)")
      .eq("client_id", clientId)
      .order("date", { ascending: false });
    check(error);
    return (data || []).map(flattenPayment);
  },
  async createPayment(payload) {
    const { data, error } = await supabase.from("client_payments").insert(payload).select().single();
    check(error);
    return data;
  },
  async updatePayment(id, payload) {
    const { data, error } = await supabase.from("client_payments").update(payload).eq("id", id).select().single();
    check(error);
    return data;
  },
  async deletePayment(id) {
    const { error } = await supabase.from("client_payments").delete().eq("id", id);
    check(error);
    return { ok: true };
  },

  // ---- Expenses ----------------------------------------------------------
  async getExpenses() {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });
    check(error);
    return data || [];
  },
  async createExpense(payload) {
    const { data, error } = await supabase.from("expenses").insert(payload).select().single();
    check(error);
    return data;
  },
  async updateExpense(id, payload) {
    const { data, error } = await supabase.from("expenses").update(payload).eq("id", id).select().single();
    check(error);
    return data;
  },
  async deleteExpense(id) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    check(error);
    return { ok: true };
  },

  // ---- Settings ----------------------------------------------------------
  async getSettings() {
    const { data, error } = await supabase.from("settings").select("*").eq("id", "main").maybeSingle();
    check(error);
    if (data) return toSettingsShape(data);

    const { data: inserted, error: insertError } = await supabase
      .from("settings")
      .insert({ id: "main", ...fromSettingsShape(SETTINGS_DEFAULTS) })
      .select()
      .single();
    check(insertError);
    return toSettingsShape(inserted);
  },

  /** Updates only the keys supplied, mapping camelCase -> snake_case. */
  async updateSettings(partial) {
    const payload = fromSettingsShape(partial);
    if (!Object.keys(payload).length) return null;
    const { data, error } = await supabase
      .from("settings")
      .update(payload)
      .eq("id", "main")
      .select()
      .single();
    check(error);
    return toSettingsShape(data);
  },
};

function flattenPayment(row) {
  const { clients, ...rest } = row;
  return {
    ...rest,
    client_name: clients?.name || "Unknown client",
    client_date_acquired: clients?.date_acquired || null,
    client_status: clients?.status || null,
  };
}
