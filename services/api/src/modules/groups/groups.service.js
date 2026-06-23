const supabase = require('../../config/supabase');

async function createGroup({ name, fundCode, description, ownerMemberId }) {
  const { data, error } = await supabase.rpc('create_group_with_owner', {
    p_name: name,
    p_fund_code: fundCode,
    p_description: description || null,
    p_owner_member_id: ownerMemberId,
  });
  if (error) throw error;
  return data;
}

async function listMyGroups(memberId) {
  const { data, error } = await supabase
    .from('memberships')
    .select('role, status, groups(*)')
    .eq('member_id', memberId)
    .eq('status', 'active');
  if (error) throw error;
  return data;
}

async function getGroup(groupId) {
  const { data, error } = await supabase
    .from('groups').select('*').eq('id', groupId).single();
  if (error) throw error;
  return data;
}

module.exports = { createGroup, listMyGroups, getGroup };