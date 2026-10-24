import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ComplianceService } from '../../src/modules/compliance/services/compliance.service.js';
import { AuditService } from '../../src/modules/compliance/services/audit.service.js';

describe('Compliance & Audit Tracking System', () => {
  let complianceService;
  let auditService;
  let mockModels;

  beforeEach(() => {
    mockModels = {
      ComplianceRule: {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        findAll: jest.fn(),
      },
      AuditLog: {
        create: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
      },
      ComplianceReport: {
        create: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
      },
    };
    complianceService = new ComplianceService(mockModels);
    auditService = new AuditService(mockModels);
  });

  describe('ComplianceService', () => {
    describe('createRule', () => {
      it('should create a new compliance rule', async () => {
        const rule = {
          id: 1,
          policy: 'soc2',
          requirement: 'All user access must be logged',
          status: 'active',
          enforcedByWorkflow: true,
          metadata: { category: 'access' },
        };

        mockModels.ComplianceRule.create.mockResolvedValue(rule);

        const result = await complianceService.createRule(
          'soc2',
          'All user access must be logged',
          true
        );

        expect(result.id).toBe(1);
        expect(result.policy).toBe('soc2');
        expect(result.requirement).toBe('All user access must be logged');
        expect(result.enforcedByWorkflow).toBe(true);
        expect(mockModels.ComplianceRule.create).toHaveBeenCalledWith(
          expect.objectContaining({
            policy: 'soc2',
            requirement: 'All user access must be logged',
            status: 'active',
            enforcedByWorkflow: true,
          })
        );
      });

      it('should create rule with default status active', async () => {
        const rule = {
          id: 2,
          policy: 'gdpr',
          requirement: 'User data must be encrypted',
          status: 'active',
          enforcedByWorkflow: false,
          metadata: {},
        };

        mockModels.ComplianceRule.create.mockResolvedValue(rule);

        const result = await complianceService.createRule(
          'gdpr',
          'User data must be encrypted',
          false
        );

        expect(result.status).toBe('active');
        expect(mockModels.ComplianceRule.create).toHaveBeenCalled();
      });
    });

    describe('getRules', () => {
      it('should get rules for a specific policy', async () => {
        const rules = [
          { id: 1, policy: 'soc2', requirement: 'Requirement 1', status: 'active' },
          { id: 2, policy: 'soc2', requirement: 'Requirement 2', status: 'active' },
        ];

        mockModels.ComplianceRule.findAll.mockResolvedValue({ rows: rules });

        const result = await complianceService.getRules('soc2');

        expect(result).toEqual(rules);
        expect(mockModels.ComplianceRule.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.arrayContaining([['policy', '=', 'soc2']]),
          })
        );
      });

      it('should get all rules when policy is not specified', async () => {
        const rules = [
          { id: 1, policy: 'soc2', requirement: 'Requirement 1', status: 'active' },
          { id: 2, policy: 'gdpr', requirement: 'Requirement 2', status: 'active' },
          { id: 3, policy: 'hipaa', requirement: 'Requirement 3', status: 'active' },
        ];

        mockModels.ComplianceRule.findAll.mockResolvedValue({ rows: rules });

        const result = await complianceService.getRules();

        expect(result).toEqual(rules);
        expect(mockModels.ComplianceRule.findAll).toHaveBeenCalledWith({});
      });

      it('should filter by status', async () => {
        const rules = [
          { id: 1, policy: 'soc2', requirement: 'Requirement 1', status: 'active' },
        ];

        mockModels.ComplianceRule.findAll.mockResolvedValue({ rows: rules });

        const result = await complianceService.getRules('soc2', 'active');

        expect(result).toEqual(rules);
        expect(mockModels.ComplianceRule.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.arrayContaining([['status', '=', 'active']]),
          })
        );
      });
    });

    describe('generateReport', () => {
      it('should generate a compliance report for date range and policies', async () => {
        const startDate = new Date('2026-04-01');
        const endDate = new Date('2026-04-30');
        const policies = ['soc2', 'gdpr'];

        const report = {
          id: 1,
          reportName: 'April 2026 Compliance Report',
          reportType: 'soc2,gdpr',
          startDate,
          endDate,
          findings: {
            soc2: { compliant: 8, total: 10 },
            gdpr: { compliant: 9, total: 10 },
          },
          summary: 'Overall compliance: 85%',
          generatedBy: 1,
          generatedAt: new Date(),
        };

        mockModels.ComplianceReport.create.mockResolvedValue(report);

        const result = await complianceService.generateReport(
          startDate,
          endDate,
          policies,
          1
        );

        expect(result.id).toBe(1);
        expect(result.reportType).toContain('soc2');
        expect(result.findings).toBeDefined();
        expect(mockModels.ComplianceReport.create).toHaveBeenCalled();
      });

      it('should calculate compliance percentage in report', async () => {
        const report = {
          id: 2,
          reportName: 'May 2026 Report',
          reportType: 'hipaa',
          startDate: new Date('2026-05-01'),
          endDate: new Date('2026-05-31'),
          findings: {
            hipaa: { compliant: 5, total: 5 },
          },
          summary: 'Overall compliance: 100%',
          generatedBy: 1,
        };

        mockModels.ComplianceReport.create.mockResolvedValue(report);

        const result = await complianceService.generateReport(
          new Date('2026-05-01'),
          new Date('2026-05-31'),
          ['hipaa'],
          1
        );

        expect(result.summary).toContain('100%');
      });
    });
  });

  describe('AuditService', () => {
    describe('logEvent', () => {
      it('should log an audit event', async () => {
        const auditLog = {
          id: 1,
          action: 'approval_created',
          entityType: 'ApprovalTask',
          entityId: 'task_123',
          userId: 5,
          changes: { status: 'pending' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
        };

        mockModels.AuditLog.create.mockResolvedValue(auditLog);

        const result = await auditService.logEvent(
          'approval_created',
          'ApprovalTask',
          'task_123',
          5,
          { status: 'pending' },
          '192.168.1.1',
          'Mozilla/5.0'
        );

        expect(result.id).toBe(1);
        expect(result.action).toBe('approval_created');
        expect(result.userId).toBe(5);
        expect(mockModels.AuditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'approval_created',
            entityType: 'ApprovalTask',
            entityId: 'task_123',
            userId: 5,
          })
        );
      });

      it('should create audit log with optional fields', async () => {
        const auditLog = {
          id: 2,
          action: 'document_approved',
          entityType: 'Document',
          entityId: 'doc_456',
          userId: 10,
          changes: { approvedAt: '2026-05-02T10:00:00Z' },
          ipAddress: null,
          userAgent: null,
          metadata: { approver: 'admin' },
        };

        mockModels.AuditLog.create.mockResolvedValue(auditLog);

        const result = await auditService.logEvent(
          'document_approved',
          'Document',
          'doc_456',
          10,
          { approvedAt: '2026-05-02T10:00:00Z' }
        );

        expect(result.id).toBe(2);
        expect(mockModels.AuditLog.create).toHaveBeenCalled();
      });
    });

    describe('getAuditHistory', () => {
      it('should retrieve audit logs with filters', async () => {
        const logs = [
          { id: 1, action: 'approval_created', entityType: 'ApprovalTask', userId: 5 },
          { id: 2, action: 'approval_approved', entityType: 'ApprovalTask', userId: 10 },
        ];

        mockModels.AuditLog.findAll.mockResolvedValue({ rows: logs });

        const result = await auditService.getAuditHistory({
          action: 'approval_created',
          entityType: 'ApprovalTask',
        });

        expect(result).toEqual(logs);
        expect(mockModels.AuditLog.findAll).toHaveBeenCalled();
      });

      it('should filter by userId', async () => {
        const logs = [
          { id: 1, action: 'approval_created', entityType: 'ApprovalTask', userId: 5 },
        ];

        mockModels.AuditLog.findAll.mockResolvedValue({ rows: logs });

        const result = await auditService.getAuditHistory({ userId: 5 });

        expect(result).toEqual(logs);
        expect(mockModels.AuditLog.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.arrayContaining([['userId', '=', 5]]),
          })
        );
      });

      it('should filter by date range', async () => {
        const startDate = new Date('2026-05-01');
        const endDate = new Date('2026-05-02');
        const logs = [
          { id: 1, action: 'approval_created', createdAt: new Date('2026-05-01T10:00:00Z') },
        ];

        mockModels.AuditLog.findAll.mockResolvedValue({ rows: logs });

        const result = await auditService.getAuditHistory({
          dateRange: { startDate, endDate },
        });

        expect(result).toEqual(logs);
        expect(mockModels.AuditLog.findAll).toHaveBeenCalled();
      });

      it('should return empty array when no logs match filters', async () => {
        mockModels.AuditLog.findAll.mockResolvedValue({ rows: [] });

        const result = await auditService.getAuditHistory({
          action: 'nonexistent_action',
        });

        expect(result).toEqual([]);
      });
    });

    describe('getAuditTrail', () => {
      it('should retrieve all audit entries for a specific entity', async () => {
        const trail = [
          {
            id: 1,
            action: 'approval_created',
            entityType: 'ApprovalTask',
            entityId: 'task_123',
            userId: 5,
            createdAt: new Date('2026-05-01T09:00:00Z'),
          },
          {
            id: 2,
            action: 'approval_approved',
            entityType: 'ApprovalTask',
            entityId: 'task_123',
            userId: 10,
            createdAt: new Date('2026-05-01T10:00:00Z'),
          },
        ];

        mockModels.AuditLog.findAll.mockResolvedValue({ rows: trail });

        const result = await auditService.getAuditTrail('ApprovalTask', 'task_123');

        expect(result).toEqual(trail);
        expect(result.length).toBe(2);
        expect(mockModels.AuditLog.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.arrayContaining([
              ['entityType', '=', 'ApprovalTask'],
              ['entityId', '=', 'task_123'],
            ]),
          })
        );
      });

      it('should return audit trail in chronological order', async () => {
        const trail = [
          {
            id: 1,
            action: 'created',
            createdAt: new Date('2026-05-01T09:00:00Z'),
          },
          {
            id: 2,
            action: 'updated',
            createdAt: new Date('2026-05-01T10:00:00Z'),
          },
          {
            id: 3,
            action: 'approved',
            createdAt: new Date('2026-05-01T11:00:00Z'),
          },
        ];

        mockModels.AuditLog.findAll.mockResolvedValue({ rows: trail });

        const result = await auditService.getAuditTrail('Document', 'doc_123');

        expect(result[0].action).toBe('created');
        expect(result[1].action).toBe('updated');
        expect(result[2].action).toBe('approved');
      });
    });
  });

  describe('Error Handling', () => {
    describe('ComplianceService errors', () => {
      it('should throw error when creating rule without policy', async () => {
        await expect(
          complianceService.createRule(null, 'Requirement', false)
        ).rejects.toThrow('Policy is required');
      });

      it('should throw error when creating rule without requirement', async () => {
        await expect(
          complianceService.createRule('soc2', null, false)
        ).rejects.toThrow('Requirement is required');
      });

      it('should throw error when generating report without dates', async () => {
        await expect(
          complianceService.generateReport(null, new Date(), ['soc2'], 1)
        ).rejects.toThrow('Start date and end date are required');
      });

      it('should throw error when generating report without generatedBy', async () => {
        await expect(
          complianceService.generateReport(new Date(), new Date(), ['soc2'], null)
        ).rejects.toThrow('Generated by user ID is required');
      });
    });

    describe('AuditService errors', () => {
      it('should throw error when logging event without action', async () => {
        await expect(
          auditService.logEvent(null, 'Entity', 'id123', 5)
        ).rejects.toThrow('Action is required');
      });

      it('should throw error when logging event without entityType', async () => {
        await expect(
          auditService.logEvent('action', null, 'id123', 5)
        ).rejects.toThrow('Entity type is required');
      });

      it('should throw error when logging event without entityId', async () => {
        await expect(
          auditService.logEvent('action', 'Entity', null, 5)
        ).rejects.toThrow('Entity ID is required');
      });

      it('should throw error when logging event without userId', async () => {
        await expect(
          auditService.logEvent('action', 'Entity', 'id123', null)
        ).rejects.toThrow('User ID is required');
      });

      it('should throw error when getting audit trail without entityType', async () => {
        await expect(
          auditService.getAuditTrail(null, 'id123')
        ).rejects.toThrow('Entity type is required');
      });

      it('should throw error when getting audit trail without entityId', async () => {
        await expect(
          auditService.getAuditTrail('Entity', null)
        ).rejects.toThrow('Entity ID is required');
      });

      it('should throw error when getting user audit logs without userId', async () => {
        await expect(
          auditService.getUserAuditLogs(null)
        ).rejects.toThrow('User ID is required');
      });

      it('should throw error when searching by action without pattern', async () => {
        await expect(
          auditService.searchByAction(null)
        ).rejects.toThrow('Action pattern is required');
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should log compliance rule creation audit event', async () => {
      const rule = {
        id: 1,
        policy: 'soc2',
        requirement: 'Requirement',
        status: 'active',
      };

      const auditLog = {
        id: 1,
        action: 'compliance_rule_created',
        entityType: 'ComplianceRule',
        entityId: '1',
        userId: 5,
        changes: rule,
      };

      mockModels.ComplianceRule.create.mockResolvedValue(rule);
      mockModels.AuditLog.create.mockResolvedValue(auditLog);

      const createdRule = await complianceService.createRule('soc2', 'Requirement', false);
      const auditEntry = await auditService.logEvent(
        'compliance_rule_created',
        'ComplianceRule',
        String(createdRule.id),
        5,
        createdRule
      );

      expect(createdRule.id).toBe(1);
      expect(auditEntry.action).toBe('compliance_rule_created');
      expect(auditEntry.entityId).toBe('1');
    });

    it('should track compliance report generation', async () => {
      const report = {
        id: 1,
        reportName: 'Q2 Compliance Report',
        reportType: 'soc2',
        findings: {},
      };

      const auditLog = {
        id: 2,
        action: 'compliance_report_generated',
        entityType: 'ComplianceReport',
        entityId: '1',
        userId: 5,
        changes: { reportType: 'soc2' },
      };

      mockModels.ComplianceReport.create.mockResolvedValue(report);
      mockModels.AuditLog.create.mockResolvedValue(auditLog);

      const generatedReport = await complianceService.generateReport(
        new Date('2026-04-01'),
        new Date('2026-06-30'),
        ['soc2'],
        5
      );

      const auditEntry = await auditService.logEvent(
        'compliance_report_generated',
        'ComplianceReport',
        String(generatedReport.id),
        5,
        { reportType: 'soc2' }
      );

      expect(generatedReport.id).toBe(1);
      expect(auditEntry.action).toBe('compliance_report_generated');
    });
  });
});
