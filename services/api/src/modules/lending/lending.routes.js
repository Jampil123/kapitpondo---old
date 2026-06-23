// services/api/src/modules/lending/lending.routes.js
// KapitPondo — Lending routes (FINAL)
// Mount in app.js:  app.use('/api', require('./modules/lending/lending.routes'));

const express = require('express');
const router = express.Router();
const requireAuth = require('../../middleware/auth');
const requireGroupRole = require('../../middleware/requireGroupRole');
const service = require('./lending.service');

// Apply for a loan — member supplies amount, term, purpose (NOT the rate)
router.post(
  '/groups/:groupId/loans',
  requireAuth,
  requireGroupRole(['member', 'treasurer', 'auditor', 'owner']),
  async (req, res, next) => {
    try {
      const { principal, term_months, purpose } = req.body;
      if (principal == null || term_months == null) {
        return res.status(400).json({ error: 'principal and term_months are required' });
      }
      const loan = await service.applyForLoan({
        membershipId: req.membership.id,
        groupId: req.params.groupId,
        principal,
        termMonths: term_months,
        purpose,
      });
      res.status(201).json({ loan });
    } catch (err) {
      next(err);
    }
  }
);

// List loans (members see own; officers see all)
router.get(
  '/groups/:groupId/loans',
  requireAuth,
  requireGroupRole(['member', 'treasurer', 'auditor', 'owner']),
  async (req, res, next) => {
    try {
      const loans = await service.listLoans({
        groupId: req.params.groupId,
        membershipId: req.membership.id,
        role: req.membership.role,
        status: req.query.status,
      });
      res.json({ loans });
    } catch (err) {
      next(err);
    }
  }
);

// Get one loan + its payments
router.get(
  '/groups/:groupId/loans/:id',
  requireAuth,
  requireGroupRole(['member', 'treasurer', 'auditor', 'owner']),
  async (req, res, next) => {
    try {
      const loan = await service.getLoan(req.params.id);
      if (loan.group_id !== req.params.groupId) {
        return res.status(400).json({ error: 'Loan does not belong to this group' });
      }
      if (req.membership.role === 'member' && loan.membership_id !== req.membership.id) {
        return res.status(403).json({ error: 'You can only view your own loans' });
      }
      const payments = await service.getLoanPayments(loan.id);
      res.json({ loan, payments });
    } catch (err) {
      next(err);
    }
  }
);

// Check available fund cash (officers)
router.get(
  '/groups/:groupId/liquidity',
  requireAuth,
  requireGroupRole(['treasurer', 'auditor', 'owner']),
  async (req, res, next) => {
    try {
      const available = await service.availableCash(req.params.groupId);
      res.json({ available_cash: available });
    } catch (err) {
      next(err);
    }
  }
);

// Approve & disburse — officer (not the applicant) sets the monthly interest rate
router.post(
  '/groups/:groupId/loans/:id/approve',
  requireAuth,
  requireGroupRole(['treasurer', 'owner']),
  async (req, res, next) => {
    try {
      const { interest_rate } = req.body;
      if (interest_rate == null) {
        return res.status(400).json({ error: 'interest_rate (monthly) is required to approve' });
      }
      const loan = await service.getLoan(req.params.id);
      if (loan.group_id !== req.params.groupId) {
        return res.status(400).json({ error: 'Loan does not belong to this group' });
      }
      if (loan.membership_id === req.membership.id) {
        return res.status(403).json({ error: 'You cannot approve your own loan' });
      }
      const ledgerEntry = await service.approveAndDisburse({
        loanId: req.params.id,
        approverId: req.member.id,
        interestRate: interest_rate,
      });
      res.json({ message: 'Loan approved and disbursed', ledgerEntry });
    } catch (err) {
      if (err.message && err.message.includes('liquidity')) {
        return res.status(409).json({ error: err.message });
      }
      next(err);
    }
  }
);

// Reject a pending loan (officers)
router.post(
  '/groups/:groupId/loans/:id/reject',
  requireAuth,
  requireGroupRole(['treasurer', 'owner']),
  async (req, res, next) => {
    try {
      const loan = await service.rejectLoan(req.params.id);
      res.json({ message: 'Loan rejected', loan });
    } catch (err) {
      next(err);
    }
  }
);

// Record a repayment (officer records; segregation enforced in SQL).
// Pass approver_id of a DIFFERENT officer to satisfy segregation of duties.
router.post(
  '/groups/:groupId/loans/:id/repayments',
  requireAuth,
  requireGroupRole(['treasurer', 'owner']),
  async (req, res, next) => {
    try {
      const { amount, payment_method, proof_url, external_reference, approver_id } = req.body;
      if (amount == null) return res.status(400).json({ error: 'amount is required' });
      const ledgerEntry = await service.recordRepayment({
        loanId: req.params.id,
        amount,
        recordedBy: req.member.id,
        approverId: approver_id || req.member.id,
        paymentMethod: payment_method,
        proofUrl: proof_url,
        externalReference: external_reference,
      });
      res.json({ message: 'Repayment recorded', ledgerEntry });
    } catch (err) {
      if (err.message && err.message.includes('Approver cannot be')) {
        return res.status(403).json({ error: err.message });
      }
      next(err);
    }
  }
);

module.exports = router;