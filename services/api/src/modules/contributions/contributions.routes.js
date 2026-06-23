const express = require('express');
const router = express.Router();
const requireAuth = require('../../middleware/auth');
const requireGroupRole = require('../../middleware/requireGroupRole');
const service = require('./contributions.service');

// Submit a contribution (any active member, for themselves)
router.post('/groups/:groupId/contributions',
  requireAuth,
  requireGroupRole(['member', 'treasurer', 'auditor', 'owner']),
  async (req, res, next) => {
    try {
      const { cycle_id, amount, payment_method, proof_url, external_reference } = req.body;
      if (!cycle_id || amount == null) {
        return res.status(400).json({ error: 'cycle_id and amount are required' });
      }
      const contribution = await service.createContribution({
        membershipId: req.membership.id,
        cycleId: cycle_id,
        groupId: req.params.groupId,
        amount,
        paymentMethod: payment_method,
        proofUrl: proof_url,
        externalReference: external_reference,
        recordedBy: req.member.id,
      });
      res.status(201).json({ contribution });
    } catch (err) { next(err); }
  }
);

// List contributions (members see own; officers see all)
router.get('/groups/:groupId/contributions',
  requireAuth,
  requireGroupRole(['member', 'treasurer', 'auditor', 'owner']),
  async (req, res, next) => {
    try {
      const contributions = await service.listContributions({
        groupId: req.params.groupId,
        membershipId: req.membership.id,
        role: req.membership.role,
        status: req.query.status,
        cycleId: req.query.cycle_id,
      });
      res.json({ contributions });
    } catch (err) { next(err); }
  }
);

// Approve a contribution (officers only)
router.post('/groups/:groupId/contributions/:id/approve',
  requireAuth,
  requireGroupRole(['treasurer', 'auditor', 'owner']),
  async (req, res, next) => {
    try {
      const contribution = await service.getContribution(req.params.id);
      if (contribution.group_id !== req.params.groupId) {
        return res.status(400).json({ error: 'Contribution does not belong to this group' });
      }
      if (contribution.recorded_by === req.member.id) {
        return res.status(403).json({ error: 'You cannot approve a contribution you recorded' });
      }
      const ledgerEntry = await service.approveContribution({
        contributionId: req.params.id,
        approverId: req.member.id,
      });
      res.json({ message: 'Contribution approved', ledgerEntry });
    } catch (err) { next(err); }
  }
);

// Reject a contribution (officers only)
router.post('/groups/:groupId/contributions/:id/reject',
  requireAuth,
  requireGroupRole(['treasurer', 'auditor', 'owner']),
  async (req, res, next) => {
    try {
      const contribution = await service.getContribution(req.params.id);
      if (contribution.group_id !== req.params.groupId) {
        return res.status(400).json({ error: 'Contribution does not belong to this group' });
      }
      const updated = await service.rejectContribution({ contributionId: req.params.id });
      res.json({ message: 'Contribution rejected', contribution: updated });
    } catch (err) { next(err); }
  }
);

module.exports = router;