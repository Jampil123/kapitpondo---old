const express = require('express');
const router = express.Router();
const requireAuth = require('../../middleware/auth');
const requireGroupRole = require('../../middleware/requireGroupRole');
const service = require('./groups.service');

// Create a group (any verified member becomes its owner)
router.post('/groups', requireAuth, async (req, res, next) => {
  try {
    if (req.member.verification_status !== 'verified') {
      return res.status(403).json({ error: 'Only verified members can create a group' });
    }
    const { name, fund_code, description } = req.body;
    if (!name || !fund_code) {
      return res.status(400).json({ error: 'name and fund_code are required' });
    }
    const group = await service.createGroup({
      name, fundCode: fund_code, description, ownerMemberId: req.member.id,
    });
    res.status(201).json({ group });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That fund_code is already taken' });
    }
    next(err);
  }
});

// List groups the current member belongs to
router.get('/groups', requireAuth, async (req, res, next) => {
  try {
    const groups = await service.listMyGroups(req.member.id);
    res.json({ groups });
  } catch (err) { next(err); }
});

// Get one group (must be a member of it)
router.get('/groups/:groupId', requireAuth,
  requireGroupRole(['member', 'treasurer', 'auditor', 'owner']),
  async (req, res, next) => {
    try {
      const group = await service.getGroup(req.params.groupId);
      res.json({ group });
    } catch (err) { next(err); }
  }
);

module.exports = router;