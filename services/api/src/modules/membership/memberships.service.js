const supabase = require('../../config/supabase');

// A member requests to join a group (status starts as 'pending')
async function requestToJoin({ memberId, groupId }) {
  const { data, error } = await supabase
    .from('memberships')
    .insert({ member_id: memberId, group_id: groupId, role: 'member', status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function listMemberships({ groupId, status }) {
  let q = supabase
    .from('memberships')
    .select('*, members(full_name, email, phone)')
    .eq('group_id', groupId);
  if (status) q = q.eq('status', status);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Approve a pending membership
async function approveMembership({ membershipId, approverId }) {
  const { data, error } = await supabase
    .from('memberships')
    .update({ status: 'active', joined_at: new Date().toISOString(), approved_by: approverId })
    .eq('id', membershipId)
    .eq('status', 'pending')
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Change a member's role (owner only)
async function setRole({ membershipId, role }) {
  const { data, error } = await supabase
    .from('memberships')
    .update({ role })
    .eq('id', membershipId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = { requestToJoin, listMemberships, approveMembership, setRole };