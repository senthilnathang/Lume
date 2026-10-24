/**
 * Compliance API Routes
 * Handles compliance rules, audit logs, and compliance reports
 */

import { Router } from 'express';

const createRoutes = (models, services) => {
  const router = Router();

  // Convert adapter names to PascalCase for services
  const normalizedModels = {};
  if (models.complianceRuleAdapter) normalizedModels.ComplianceRule = models.complianceRuleAdapter;
  if (models.auditLogAdapter) normalizedModels.AuditLog = models.auditLogAdapter;
  if (models.complianceReportAdapter) normalizedModels.ComplianceReport = models.complianceReportAdapter;

  // Instantiate services if they're class definitions
  let complianceService, auditService;

  if (typeof services.ComplianceService === 'function') {
    complianceService = new services.ComplianceService(normalizedModels);
  } else {
    complianceService = services.ComplianceService;
  }

  if (typeof services.AuditService === 'function') {
    auditService = new services.AuditService(normalizedModels);
  } else {
    auditService = services.AuditService;
  }

  // ─── Compliance Rules Endpoints ───

  /**
   * GET /api/compliance/rules
   * Get all compliance rules (optionally filtered by policy)
   */
  router.get('/rules', async (req, res, next) => {
    try {
      const { policy, status } = req.query;
      const rules = await complianceService.getRules(policy, status);
      res.json({ success: true, data: rules });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/compliance/rules
   * Create a new compliance rule
   */
  router.post('/rules', async (req, res, next) => {
    try {
      const { policy, requirement, enforcedByWorkflow, metadata } = req.body;
      const rule = await complianceService.createRule(policy, requirement, enforcedByWorkflow, metadata);
      res.json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/compliance/rules/:id
   * Get a specific compliance rule
   */
  router.get('/rules/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const rule = await normalizedModels.ComplianceRule.findById(parseInt(id));
      if (!rule) {
        return res.status(404).json({ success: false, error: 'Rule not found' });
      }
      res.json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /api/compliance/rules/:id
   * Update a compliance rule
   */
  router.put('/rules/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const rule = await complianceService.updateRule(parseInt(id), updates);
      res.json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /api/compliance/rules/:id
   * Archive a compliance rule
   */
  router.delete('/rules/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const rule = await complianceService.archiveRule(parseInt(id));
      res.json({ success: true, data: rule });
    } catch (error) {
      next(error);
    }
  });

  // ─── Audit Endpoints ───

  /**
   * GET /api/compliance/audit
   * Get audit logs with optional filters
   */
  router.get('/audit', async (req, res, next) => {
    try {
      const { action, entityType, entityId, userId, startDate, endDate } = req.query;
      const filters = {};

      if (action) filters.action = action;
      if (entityType) filters.entityType = entityType;
      if (entityId) filters.entityId = entityId;
      if (userId) filters.userId = parseInt(userId);

      if (startDate || endDate) {
        filters.dateRange = {};
        if (startDate) filters.dateRange.startDate = new Date(startDate);
        if (endDate) filters.dateRange.endDate = new Date(endDate);
      }

      const logs = await auditService.getAuditHistory(filters);
      res.json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/compliance/audit
   * Create an audit log entry (internal use)
   */
  router.post('/audit', async (req, res, next) => {
    try {
      const { action, entityType, entityId, userId, changes, ipAddress, userAgent, metadata } = req.body;
      const log = await auditService.logEvent(
        action,
        entityType,
        entityId,
        userId,
        changes,
        ipAddress,
        userAgent,
        metadata
      );
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/compliance/audit/:entityType/:entityId
   * Get audit trail for a specific entity
   */
  router.get('/audit/:entityType/:entityId', async (req, res, next) => {
    try {
      const { entityType, entityId } = req.params;
      const trail = await auditService.getAuditTrail(entityType, entityId);
      res.json({ success: true, data: trail });
    } catch (error) {
      next(error);
    }
  });

  // ─── Reports Endpoints ───

  /**
   * GET /api/compliance/reports
   * Get compliance reports
   */
  router.get('/reports', async (req, res, next) => {
    try {
      const filters = req.query;
      const reports = await complianceService.getReports(filters);
      res.json({ success: true, data: reports });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/compliance/reports
   * Generate a compliance report
   */
  router.post('/reports', async (req, res, next) => {
    try {
      const { startDate, endDate, policies, generatedBy } = req.body;
      const report = await complianceService.generateReport(
        new Date(startDate),
        new Date(endDate),
        policies,
        generatedBy
      );
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/compliance/reports/:id
   * Get a specific compliance report
   */
  router.get('/reports/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const report = await normalizedModels.ComplianceReport.findById(parseInt(id));
      if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

export default createRoutes;
