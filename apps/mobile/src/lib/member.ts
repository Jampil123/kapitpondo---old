import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Returns the members.id for the logged-in user.
 * If the row doesn't exist (trigger may not have fired), it creates one from
 * the session's user_metadata that was stored during sign-up.
 */
export async function getOrCreateMember(session: Session): Promise<{ id: string }> {
  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('auth_id', session.user.id)
    .maybeSingle();

  if (existing) return existing;

  // Trigger didn't fire — build the row from signup metadata
  const meta = (session.user.user_metadata ?? {}) as Record<string, string>;
  const fullName =
    meta.full_name ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    session.user.phone ||
    'Member';

  const { data: created, error } = await supabase
    .from('members')
    .insert({
      auth_id: session.user.id,
      phone: session.user.phone ?? null,
      email: session.user.email ?? null,
      full_name: fullName,
      verification_status: 'unverified',
    })
    .select('id')
    .single();

  if (error) {
    // Conflict means the row was created between our SELECT and INSERT — re-fetch
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();
      if (retry) return retry;
    }
    throw new Error(`Could not create member profile: ${error.message}`);
  }

  if (!created) throw new Error('Could not create member profile.');
  return created;
}
