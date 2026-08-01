// supabaseServerClient.ts
// Server‑side Supabase client using the Service‑Role secret key.
// This client has full privileges (INSERT/UPDATE/DELETE) and is NOT exposed to the browser.
// This file is in the server/ directory and should ONLY be used in server-side environments
// (Node.js, Supabase Edge Functions, etc.) - NEVER import this in client-side code.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// In server environment, use process.env (Node.js) for environment variables.
// Vite's import.meta.env is NOT available in pure Node.js server environments.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL is missing. Set VITE_SUPABASE_URL in .env");
}
if (!serviceKey) {
  throw new Error(
    "Supabase Service Role key is missing. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in .env"
  );
}

// Create a client with the secret key – this bypasses RLS and has full access.
const supabaseServer: SupabaseClient = createClient(supabaseUrl, serviceKey);

export { supabaseServer };
