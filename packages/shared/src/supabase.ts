// packages/shared/src/supabase.ts
// A small factory so every app creates its Supabase client the same way.
// Apps pass platform-specific options (e.g. AsyncStorage on mobile).

import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';

export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<'public'>
) {
  if (!url || !anonKey) {
    throw new Error('Supabase URL and anon key are required');
  }
  return createClient(url, anonKey, options);
}