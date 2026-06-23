// services/api/src/modules/ledger/ledger.service.js
// KapitPondo — Ledger corrections service (M7, FINAL)

const supabase = require('../../config/supabase');

async function getEntry(id) {
  const { data, error } = await supabase
    .from('ledger_entries').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function reverseEntry({ entryId, reason, postedBy }) {
  const { data, error } = await supabase.rpc('reverse_ledger_entry', {
    p_entry_id: entryId,
    p_reason: reason,
    p_posted_by: postedBy,
  });
  if (error) throw error;
  return data;
}

async function postAdjustment({ groupId, membershipId, direction, amount, reason, postedBy }) {
  const { data, error } = await supabase.rpc('post_adjustment', {
    p_group_id: groupId,
    p_membership_id: membershipId || null,
    p_direction: direction,
    p_amount: amount,
    p_reason: reason,
    p_posted_by: postedBy,
  });
  if (error) throw error;
  return data;
}

module.exports = { getEntry, reverseEntry, postAdjustment };