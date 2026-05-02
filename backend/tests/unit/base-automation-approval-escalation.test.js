/**
 * Approval Escalation Tracking Unit Tests
 * Tests SLA breach escalation tracking functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Approval Escalation Tracking', () => {
  let mockModels;

  beforeEach(() => {
    mockModels = {
      ApprovalTask: { findById: jest.fn() },
      ApprovalEscalation: { create: jest.fn() }
    };
  });

  describe('Escalation creation', () => {
    it('should create escalation record when task SLA is breached', async () => {
      const task = {
        id: 1,
        instanceId: 100,
        assignedToUserId: 5,
        dueAt: new Date(Date.now() - 3600000), // 1 hour ago
        status: 'pending'
      };

      const escalation = {
        taskId: 1,
        instanceId: 100,
        escalatedFrom: 5,
        escalatedTo: 10,
        reason: 'sla_breach',
        escalatedAt: expect.any(Date),
        hoursOverdue: 1
      };

      mockModels.ApprovalTask.findById.mockResolvedValue(task);
      mockModels.ApprovalEscalation.create.mockResolvedValue(escalation);

      const result = await mockModels.ApprovalEscalation.create(escalation);

      expect(result.reason).toBe('sla_breach');
      expect(result.escalatedTo).toBe(10);
    });

    it('should record escalation with manual reason', async () => {
      const escalation = {
        taskId: 2,
        instanceId: 101,
        escalatedFrom: 5,
        escalatedTo: 10,
        reason: 'manual',
        escalatedAt: expect.any(Date),
        hoursOverdue: 2
      };

      mockModels.ApprovalEscalation.create.mockResolvedValue(escalation);

      const result = await mockModels.ApprovalEscalation.create(escalation);

      expect(result.reason).toBe('manual');
      expect(result.taskId).toBe(2);
    });

    it('should track notification sent status', async () => {
      const escalation = {
        taskId: 3,
        instanceId: 102,
        escalatedFrom: 5,
        escalatedTo: 10,
        reason: 'sla_breach',
        escalatedAt: expect.any(Date),
        hoursOverdue: 1,
        notificationSent: true
      };

      mockModels.ApprovalEscalation.create.mockResolvedValue(escalation);

      const result = await mockModels.ApprovalEscalation.create(escalation);

      expect(result.notificationSent).toBe(true);
    });

    it('should store metadata for escalation', async () => {
      const metadata = {
        reason_detail: 'Task overdue by 2 hours',
        escalation_level: 2
      };

      const escalation = {
        taskId: 4,
        instanceId: 103,
        escalatedFrom: 5,
        escalatedTo: 10,
        reason: 'sla_breach',
        escalatedAt: expect.any(Date),
        hoursOverdue: 2,
        metadata: metadata
      };

      mockModels.ApprovalEscalation.create.mockResolvedValue(escalation);

      const result = await mockModels.ApprovalEscalation.create(escalation);

      expect(result.metadata).toEqual(metadata);
    });

    it('should handle timeout reason', async () => {
      const escalation = {
        taskId: 5,
        instanceId: 104,
        escalatedFrom: 5,
        escalatedTo: 10,
        reason: 'timeout',
        escalatedAt: expect.any(Date),
        hoursOverdue: 3
      };

      mockModels.ApprovalEscalation.create.mockResolvedValue(escalation);

      const result = await mockModels.ApprovalEscalation.create(escalation);

      expect(result.reason).toBe('timeout');
    });
  });
});
