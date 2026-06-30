import { supabase } from "./supabaseClient";

function check(error) {
  if (error) throw error;
}

export const api = {
  async getCalls() {
    const { data, error } = await supabase.from("calls").select("*").order("date", { ascending: false });
    check(error);
    return data;
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

  async getExpenses() {
    const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false });
    check(error);
    return data;
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

  // settings is a single row keyed by id = 'main'
  async getSettings() {
    const { data, error } = await supabase.from("settings").select("*").eq("id", "main").maybeSingle();
    check(error);
    if (!data) {
      const defaults = {
        id: "main",
        call_outcomes: [
          "Full-Pay", "Split-Pay", "Deposit", "No Deposit & Follow-Up",
          "Offer & Didn't Buy", "Bad Fit & No Offer", "Cancelled", "No-Show", "Rescheduled",
        ],
        call_sources: ["Ads", "Organic"],
        expense_categories: ["Ad Spend", "Software/Tools", "Contractors", "Travel", "Other"],
      };
      const { data: inserted, error: insertError } = await supabase.from("settings").insert(defaults).select().single();
      check(insertError);
      return toSettingsShape(inserted);
    }
    return toSettingsShape(data);
  },
  async updateSettings(partial) {
    const payload = {};
    if (partial.callOutcomes) payload.call_outcomes = partial.callOutcomes;
    if (partial.callSources) payload.call_sources = partial.callSources;
    if (partial.expenseCategories) payload.expense_categories = partial.expenseCategories;
    const { data, error } = await supabase.from("settings").update(payload).eq("id", "main").select().single();
    check(error);
    return toSettingsShape(data);
  },
};

function toSettingsShape(row) {
  return {
    callOutcomes: row.call_outcomes,
    callSources: row.call_sources,
    expenseCategories: row.expense_categories,
  };
}
