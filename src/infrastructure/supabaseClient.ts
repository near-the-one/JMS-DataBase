// Supabase client singleton
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Retrieve env vars both in Vite (browser) and in Node/Vitest environments.
// In Vite we have import.meta.env, otherwise fall back to process.env (if available).
// Use globalThis to check for process to avoid TypeScript errors in browser builds.
const globalEnv = (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) ? (globalThis as any).process.env : {};
const _env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : globalEnv;
const supabaseUrl = _env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = _env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl) {
  throw new Error("supabaseUrl is required. Check .env (VITE_SUPABASE_URL).");
}
if (!supabaseAnonKey) {
  throw new Error("supabaseAnonKey is required. Check .env (VITE_SUPABASE_ANON_KEY).");
}

// Singleton pattern – reuse the same Supabase client if already created.
// This prevents multiple GoTrueClient instances which can cause the warning.
const GLOBAL_KEY = '__SUPABASE_CLIENT__';
let supabaseInstance: SupabaseClient;
if (typeof globalThis !== 'undefined' && (globalThis as any)[GLOBAL_KEY]) {
  // Reuse existing instance
  supabaseInstance = (globalThis as any)[GLOBAL_KEY];
} else {
  // Create new instance
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  if (typeof globalThis !== 'undefined') {
    (globalThis as any)[GLOBAL_KEY] = supabaseInstance;
  }
}

// DEBUG: Expose client for manual inspection ONLY on localhost development
// This is restricted to localhost to prevent credential leakage in staging/prod
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalhost) {
    (window as any).SUPABASE_DEBUG = {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      // Note: Service role key is NEVER exposed here - it's server-only
    };
  }
}

export const supabase = supabaseInstance;

