// services/api/src/modules/reporting/reporting.service.js
// KapitPondo — Reporting service (M8, FINAL). Read-only.

const supabase = require('../../config/supabase');

// Group-wide financial snapshot (officers)
async function groupSummary(groupId) {
  const { data, error } = await supabase.rpc('group_summary', { p_group_id: groupId });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

// A single membership's net balance
async function membershipBalance(membershipId) {
  const { data, error } = await supabase.rpc('membership_balance', {
    p_membership_id: membershipId,
  });
  if (error) throw error;
  return data;
}

// The ledger feed for a group, with optional filters
async function groupLedger({ groupId, membershipId, entryType, limit = 100 }) {
  let q = supabase
    .from('ledger_entries')
    .select('*')
    .eq('group_id', groupId)
    .order('posted_at', { ascending: false })
    .limit(limit);
  if (membershipId) q = q.eq('membership_id', membershipId);
  if (entryType) q = q.eq('entry_type', entryType);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// Per-member balances across a group (officers) — one row per active membership
async function memberBalances(groupId) {
  const { data, error } = await supabase
    .from('memberships')
    .select('id, heads, role, status, members!member_id(full_name)')
    .eq('group_id', groupId)
    .eq('status', 'active');
  if (error) throw error;

  // Attach each member's net balance
  const results = [];
  for (const m of data) {
    const balance = await membershipBalance(m.id);
    results.push({
      membership_id: m.id,
      full_name: m.members?.full_name,
      role: m.role,
      heads: m.heads,
      balance,
    });
  }
  return results;
}

module.exports = { groupSummary, membershipBalance, groupLedger, memberBalances };