function requireSystemAdmin(req, res, next) {
  if (!req.member?.is_system_admin) {
    return res.status(403).json({ error: 'System administrator access required' });
  }
  next();
}

module.exports = requireSystemAdmin;