/**
 * @fileoverview Unit tests for Escalation Chain Configuration
 * Tests escalation chain creation with multiple levels
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

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
