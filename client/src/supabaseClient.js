import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env (see SETUP.md)."
  );
}

export const supabase = createClient(url, key);
