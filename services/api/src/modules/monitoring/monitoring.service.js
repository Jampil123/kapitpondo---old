const supabase = require('../../config/supabase');

async function platformOverview() {
  const { data, error } = await supabase.rpc('platform_overview');
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

async function groupsOverview() {
  const { data, error } = await supabase.rpc('groups_overview');
  if (error) throw error;
  return data;
}

// System-wide audit feed, with optional filters
async function auditFeed({ groupId, action, limit = 100 }) {
  let q = supabase
    .from('audit_log')
    .select('*, members:actor_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (groupId) q = q.eq('group_id', groupId);
  if (action) q = q.eq('action', action);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// Recent platform-wide activity from the ledger (large movements first option)
async function recentLedger({ limit = 50 }) {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('*, groups:group_id(name, fund_code)')
    .order('posted_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

module.exports = { platformOverview, groupsOverview, auditFeed, recentLedger };