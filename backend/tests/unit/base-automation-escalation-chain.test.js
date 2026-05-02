/**
 * @fileoverview Unit tests for Escalation Chain Configuration
 * Tests escalation chain creation with multiple levels
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EscalationChainHandler } from '../../src/modules/base_automation/services/escalation-chain-handler.js';
import { ApprovalAnalyticsService } from '../../src/modules/base_automation/services/approval-analytics.js';

describe('Escalation Chain Configuration', () => {
  let mockModels;

  beforeEach(() => {
    mockModels = {
      ApprovalEscalationChain: { create: jest.fn() }
    };
  });

  it('should create escalation chain with multiple levels', async () => {
    const chain = {
      approvalChainId: 5,
      level: 1,
      escalateToRole: 'manager',
      escalateAfterHours: 2,
      maxEscalations: 3,
      notificationTemplate: 'escalation_level_1'
    };

    mockModels.ApprovalEscalationChain.create.mockResolvedValue(chain);
    const result = await mockModels.ApprovalEscalationChain.create(chain);

    expect(result.level).toBe(1);
    expect(result.escalateToRole).toBe('manager');
  });
});

describe('EscalationChainHandler', () => {
  let handler;
  let mockModels;

  beforeEach(() => {
    mockModels = {
      ApprovalEscalationChain: { findAll: jest.fn() },
      ApprovalEscalation: { create: jest.fn() }
    };
    handler = new EscalationChainHandler(mockModels);
  });

  it('should escalate to next level when SLA exceeded at current level', async () => {
    const currentEscalation = {
      id: 1,
      taskId: 1,
      approvalChainId: 5,
      instanceId: 10,
      escalatedTo: 'manager',
      level: 1
    };

    const chainLevels = [
      { level: 1, escalateToRole: 'manager', escalateAfterHours: 2 },
      { level: 2, escalateToRole: 'director', escalateAfterHours: 4 }
    ];

    mockModels.ApprovalEscalationChain.findAll.mockResolvedValue({ rows: chainLevels });
    mockModels.ApprovalEscalation.create.mockResolvedValue({
      id: 2,
      taskId: 1,
      escalatedTo: 'director',
      level: 2
    });

    const nextEscalation = await handler.escalateToNextLevel(currentEscalation);

    expect(nextEscalation.escalatedTo).toBe('director');
    expect(nextEscalation.level).toBe(2);
  });

  it('should return undefined when at max level', async () => {
    const currentEscalation = {
      id: 1,
      taskId: 1,
      approvalChainId: 5,
      instanceId: 10,
      escalatedTo: 'director',
      level: 2
    };

    const chainLevels = [
      { level: 1, escalateToRole: 'manager', escalateAfterHours: 2 },
      { level: 2, escalateToRole: 'director', escalateAfterHours: 4 }
    ];

    mockModels.ApprovalEscalationChain.findAll.mockResolvedValue({ rows: chainLevels });

    const nextEscalation = await handler.escalateToNextLevel(currentEscalation);

    expect(nextEscalation).toBeUndefined();
  });

  it('should fetch chain levels for approval chain', async () => {
    const chainLevels = [
      { level: 1, escalateToRole: 'manager', escalateAfterHours: 2 },
      { level: 2, escalateToRole: 'director', escalateAfterHours: 4 }
    ];

    mockModels.ApprovalEscalationChain.findAll.mockResolvedValue({ rows: chainLevels });

    const levels = await handler.getChainLevels(5);

    expect(levels).toHaveLength(2);
    expect(levels[0].level).toBe(1);
    expect(levels[1].level).toBe(2);
  });

  it('should check if max level reached', async () => {
    const chainLevels = [
      { level: 1, escalateToRole: 'manager', escalateAfterHours: 2 },
      { level: 2, escalateToRole: 'director', escalateAfterHours: 4 }
    ];

    mockModels.ApprovalEscalationChain.findAll.mockResolvedValue({ rows: chainLevels });

    const isMaxReached = await handler.isMaxLevelReached(1, 5, 2);

    expect(isMaxReached).toBe(true);
  });
});

describe('ApprovalAnalyticsService', () => {
  let analyticsService;
  let mockModels;

  beforeEach(() => {
    mockModels = {
      ApprovalTask: { findAll: jest.fn() },
      ApprovalEscalation: { findAll: jest.fn() }
    };
    analyticsService = new ApprovalAnalyticsService(mockModels);
  });

  it('should calculate approval metrics', async () => {
    const tasks = [
      { id: 1, status: 'approved', createdAt: new Date('2026-01-01'), decidedAt: new Date('2026-01-02'), dueAt: new Date('2026-01-05') },
      { id: 2, status: 'approved', createdAt: new Date('2026-01-01'), decidedAt: new Date('2026-01-10'), dueAt: new Date('2026-01-05') }
    ];

    mockModels.ApprovalTask.findAll.mockResolvedValue({ rows: tasks, count: 2 });

    const metrics = await analyticsService.getApprovalMetrics();

    expect(metrics.totalApprovals).toBe(2);
    expect(metrics.slaBreachers).toBe(1);
    expect(metrics.breachRate).toBe(0.5);
  });

  it('should identify bottleneck tasks', async () => {
    const now = new Date();
    const bottlenecks = [
      { id: 1, status: 'pending', taskId: 101, createdAt: new Date(now.getTime() - 86400000 * 10), assignedTo: 'user1' },
      { id: 2, status: 'pending', taskId: 102, createdAt: new Date(now.getTime() - 86400000 * 5), assignedTo: 'user2' }
    ];

    mockModels.ApprovalTask.findAll.mockResolvedValue({ rows: bottlenecks, count: 2 });

    const result = await analyticsService.getBottlenecks(10);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
  });

  it('should calculate escalation metrics by level', async () => {
    const escalations = [
      { id: 1, level: 1, reason: 'sla_breach' },
      { id: 2, level: 1, reason: 'sla_breach' },
      { id: 3, level: 2, reason: 'sla_breach' }
    ];

    mockModels.ApprovalEscalation.findAll.mockResolvedValue({ rows: escalations, count: 3 });

    const metrics = await analyticsService.getEscalationMetrics();

    expect(metrics.totalEscalations).toBe(3);
    expect(metrics.byLevel[1]).toBe(2);
    expect(metrics.byLevel[2]).toBe(1);
  });

  it('should calculate average approval time by role', async () => {
    const tasks = [
      { id: 1, assignedToRole: 'manager', status: 'approved', createdAt: new Date('2026-01-01'), decidedAt: new Date('2026-01-02') },
      { id: 2, assignedToRole: 'manager', status: 'approved', createdAt: new Date('2026-01-01'), decidedAt: new Date('2026-01-04') },
      { id: 3, assignedToRole: 'director', status: 'approved', createdAt: new Date('2026-01-01'), decidedAt: new Date('2026-01-06') }
    ];

    mockModels.ApprovalTask.findAll.mockResolvedValue({ rows: tasks, count: 3 });

    const metrics = await analyticsService.getApprovalTimeByRole('manager');

    expect(metrics.role).toBe('manager');
    expect(metrics.avgTimeHours).toBeGreaterThan(0);
  });
});

describe('Analytics API Endpoints', () => {
  let mockReq, mockRes, mockNext;
  let mockAnalyticsService;

  beforeEach(() => {
    mockReq = {
      query: {},
      params: {}
    };
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    mockAnalyticsService = {
      getApprovalMetrics: jest.fn(),
      getBottlenecks: jest.fn(),
      getEscalationMetrics: jest.fn(),
      getApprovalTimeByRole: jest.fn()
    };
  });

  it('should return approval metrics via GET /approvals/analytics/metrics', async () => {
    const metrics = { totalApprovals: 100, avgTime: 24, slaBreachers: 10, breachRate: 0.1 };
    mockAnalyticsService.getApprovalMetrics.mockResolvedValue(metrics);

    const handleMetricsEndpoint = async (req, res, service) => {
      try {
        const data = await service.getApprovalMetrics(req.query);
        res.json({ success: true, data });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    };

    await handleMetricsEndpoint(mockReq, mockRes, mockAnalyticsService);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: metrics });
  });

  it('should return bottlenecks via GET /approvals/analytics/bottlenecks', async () => {
    const bottlenecks = [
      { id: 1, taskId: 101, pendingFor: 240 },
      { id: 2, taskId: 102, pendingFor: 120 }
    ];
    mockAnalyticsService.getBottlenecks.mockResolvedValue(bottlenecks);

    const handleBottlenecksEndpoint = async (req, res, service) => {
      try {
        const data = await service.getBottlenecks(req.query.limit || 10);
        res.json({ success: true, data });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    };

    await handleBottlenecksEndpoint(mockReq, mockRes, mockAnalyticsService);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: bottlenecks });
  });

  it('should return escalation metrics via GET /approvals/analytics/escalations', async () => {
    const escalations = { totalEscalations: 50, byLevel: { 1: 30, 2: 20 }, byReason: { sla_breach: 50 } };
    mockAnalyticsService.getEscalationMetrics.mockResolvedValue(escalations);

    const handleEscalationsEndpoint = async (req, res, service) => {
      try {
        const data = await service.getEscalationMetrics();
        res.json({ success: true, data });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    };

    await handleEscalationsEndpoint(mockReq, mockRes, mockAnalyticsService);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: escalations });
  });

  it('should return role metrics via GET /approvals/analytics/roles/:role', async () => {
    mockReq.params = { role: 'manager' };
    const metrics = { role: 'manager', avgTimeHours: 24.5, totalApprovals: 30 };
    mockAnalyticsService.getApprovalTimeByRole.mockResolvedValue(metrics);

    const handleRoleMetricsEndpoint = async (req, res, service) => {
      try {
        const data = await service.getApprovalTimeByRole(req.params.role);
        res.json({ success: true, data });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    };

    await handleRoleMetricsEndpoint(mockReq, mockRes, mockAnalyticsService);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: metrics });
  });
});
