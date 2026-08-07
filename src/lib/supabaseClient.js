import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Fails loudly at startup rather than silently doing nothing — a missing
  // env var here means every query would otherwise fail with a confusing
  // network error instead of an obvious one.
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Set them in .env.local for dev, and in your Vercel project's Environment Variables for production."
  );
}

export const supabase = createClient(url, key);
