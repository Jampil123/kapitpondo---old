// services/api/scripts/seed-test-users.js
// Creates (or re-uses) 3 Supabase Auth users for e2e testing and ensures
// their `members` rows exist with the right auth_id and roles.
// Uses the same @supabase/supabase-js client as the backend (bypasses RLS).
// Run ONCE before the e2e test:
//   node services/api/scripts/seed-test-users.js

'use strict';

const dotenv = require('dotenv');
dotenv.config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY         = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN    = { email: 'e2e.admin@kapitpondo.test',   password: 'KapitE2E_Admin1!',  fullName: 'E2E System Admin' };
const MEMBER_A = { email: 'e2e.membera@kapitpondo.test', password: 'KapitE2E_MemberA1!', fullName: 'Alice Tester' };
const MEMBER_B = { email: 'e2e.memberb@kapitpondo.test', password: 'KapitE2E_MemberB1!', fullName: 'Bob Tester' };
const USERS    = [ADMIN, MEMBER_A, MEMBER_B];

// ── Create or retrieve an auth user via Admin API ──────────

async function upsertAuthUser({ email, password }) {
  // Try to create
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!createErr) {
    console.log(`  Created auth user: ${email} (${created.user.id})`);
    return created.user;
  }

  // Already exists — list and find by email
  if (createErr.message?.includes('already') || createErr.status === 422) {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw listErr;
    const existing = list.users.find(u => u.email === email);
    if (!existing) throw new Error(`User ${email} should exist but not found in list`);
    console.log(`  Reused auth user: ${email} (${existing.id})`);
    return existing;
  }

  throw createErr;
}

// ── Ensure a member row exists linked to this auth user ────

async function upsertMember(authUser, { fullName, isAdmin }) {
  // Check for existing row
  const { data: existing, error: checkErr } = await supabase
    .from('members')
    .select('id, auth_id, email, is_system_admin')
    .eq('auth_id', authUser.id)
    .maybeSingle();

  if (checkErr) throw new Error(`Check member: ${checkErr.message}`);

  if (existing) {
    // Always reset to a clean state so the e2e test can run from scratch
    const patch = {
      is_system_admin: isAdmin ?? false,
      full_name: fullName,
    };
    if (!isAdmin) {
      // Reset non-admin members to unverified so approval steps can be re-tested
      patch.verification_status = 'unverified';
      patch.id_document_url = null;
      patch.verified_by = null;
      patch.verified_at = null;
    }
    const { error: patchErr } = await supabase
      .from('members')
      .update(patch)
      .eq('id', existing.id);
    if (patchErr) throw new Error(`Patch member: ${patchErr.message}`);
    console.log(`  Reset member row: ${authUser.email} → member.id=${existing.id} (verification_status → ${patch.verification_status ?? 'unchanged'})`);
    return existing;
  }

  // Insert new row
  const { data: inserted, error: insertErr } = await supabase
    .from('members')
    .insert({
      auth_id: authUser.id,
      email: authUser.email,
      full_name: fullName,
      verification_status: 'unverified',
      is_system_admin: isAdmin ?? false,
    })
    .select('id, auth_id, email, is_system_admin')
    .single();

  if (insertErr) throw new Error(`Insert member: ${insertErr.message}`);
  console.log(`  Created member row: ${authUser.email} → member.id=${inserted.id}`);
  return inserted;
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log('=== KapitPondo — Seed Test Users ===\n');
  console.log(`Project: ${SUPABASE_URL}\n`);

  for (const u of USERS) {
    console.log(`[${u.email}]`);
    const authUser = await upsertAuthUser(u);
    await upsertMember(authUser, {
      fullName: u.fullName,
      isAdmin: u.email === ADMIN.email,
    });
    console.log();
  }

  console.log('=== Seed complete. Paste these into e2e-test.js CONFIG: ===\n');
  console.log(`const SUPABASE_URL      = '${SUPABASE_URL}';`);
  console.log(`const SUPABASE_ANON_KEY = '${ANON_KEY}';`);
  console.log(`const ADMIN    = { email: '${ADMIN.email}',   password: '${ADMIN.password}' };`);
  console.log(`const MEMBER_A = { email: '${MEMBER_A.email}', password: '${MEMBER_A.password}' };`);
  console.log(`const MEMBER_B = { email: '${MEMBER_B.email}', password: '${MEMBER_B.password}' };`);
}

main().catch(err => { console.error('\nFatal:', err.message); process.exit(1); });
