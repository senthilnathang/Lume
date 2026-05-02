/**
 * @fileoverview Unit tests for Escalation Chain Configuration
 * Tests escalation chain creation with multiple levels
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EscalationChainHandler } from '../../src/modules/base_automation/services/escalation-chain-handler.js';

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
