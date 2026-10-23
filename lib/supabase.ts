'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Verbinding met Supabase (accounts + database). De sleutels staan in .env.local (lokaal) en in Vercel (online):
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…   (of de oudere NEXT_PUBLIC_SUPABASE_ANON_KEY)
 * Dit zijn openbare sleutels: de beveiliging zit in de regels van de database (supabase/schema.sql).
 * Zonder sleutels werkt de site gewoon, alleen zonder accounts.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const accountsEnabled = !!(url && key);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!accountsEnabled || typeof window === 'undefined') return null;
  client ??= createClient(url!, key!, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  });
  return client;
}
