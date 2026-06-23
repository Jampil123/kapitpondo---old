const supabaseAdmin = require('../config/supabase');

// Usage: requireGroupRole(['owner', 'treasurer'])
// Looks for a group id in params, body, or query.
function requireGroupRole(allowedRoles) {
  return async function (req, res, next) {
    try {
      const groupId = req.params.groupId || req.body.group_id || req.query.group_id;
      if (!groupId) {
        return res.status(400).json({ error: 'group_id is required' });
      }

      const { data: membership, error } = await supabaseAdmin
        .from('memberships')
        .select('*')
        .eq('member_id', req.member.id)
        .eq('group_id', groupId)
        .eq('status', 'active')
        .single();

      if (error || !membership) {
        return res.status(403).json({ error: 'You are not an active member of this group' });
      }
      if (allowedRoles && !allowedRoles.includes(membership.role)) {
        return res.status(403).json({ error: 'Insufficient role for this action' });
      }

      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = requireGroupRole;