// services/api/src/modules/ledger/ledger.routes.js
// KapitPondo — Ledger corrections routes (M7, FINAL)
// Mount in app.js:  app.use('/api', require('./modules/ledger/ledger.routes'));

const express = require('express');
const router = express.Router();
const requireAuth = require('../../middleware/auth');
const requireGroupRole = require('../../middleware/requireGroupRole');
const service = require('./ledger.service');

// Reverse a ledger entry (owner only — sensitive). Requires a reason.
router.post(
  '/groups/:groupId/ledger/:entryId/reverse',
  requireAuth,
  requireGroupRole(['owner']),
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'reason is required to reverse an entry' });
      }
      const entry = await service.getEntry(req.params.entryId);
      if (entry.group_id !== req.params.groupId) {
        return res.status(400).json({ error: 'Ledger entry does not belong to this group' });
      }
      const reversal = await service.reverseEntry({
        entryId: req.params.entryId,
        reason: reason.trim(),
        postedBy: req.member.id,
      });
      res.json({ message: 'Entry reversed', reversal });
    } catch (err) {
      if (err.message && (err.message.includes('already been reversed') ||
                          err.message.includes('Cannot reverse'))) {
        return res.status(409).json({ error: err.message });
      }
      next(err);
    }
  }
);

// Post a manual adjustment (owner or treasurer). Requires a reason.
router.post(
  '/groups/:groupId/ledger/adjustment',
  requireAuth,
  requireGroupRole(['owner', 'treasurer']),
  async (req, res, next) => {
    try {
      const { membership_id, direction, amount, reason } = req.body;
      if (!['credit', 'debit'].includes(direction)) {
        return res.status(400).json({ error: 'direction must be "credit" or "debit"' });
      }
      if (amount == null || Number(amount) <= 0) {
        return res.status(400).json({ error: 'amount must be positive' });
      }
      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'reason is required for an adjustment' });
      }
      const entry = await service.postAdjustment({
        groupId: req.params.groupId,
        membershipId: membership_id,
        direction,
        amount,
        reason: reason.trim(),
        postedBy: req.member.id,
      });
      res.json({ message: 'Adjustment posted', entry });
    } catch (err) { next(err); }
  }
);

module.exports = router;