/**
 * Escalation Chain Handler Service
 * Manages multi-level escalation workflows for approval tasks
 * When a task at level 1 exceeds SLA, escalates to level 2. Repeats until max level reached or task resolved.
 */

export class EscalationChainHandler {
  constructor(models) {
    this.models = models;
  }

  /**
   * Get all escalation chain levels for an approval chain
   * @param {number} approvalChainId - The approval chain ID
   * @returns {Promise<Array>} Array of escalation levels sorted by level (ascending)
   */
  async getChainLevels(approvalChainId) {
    const result = await this.models.ApprovalEscalationChain.findAll({
      where: [['approvalChainId', '=', approvalChainId]]
    });
    const levels = (result && result.rows) ? result.rows : [];
    return levels.sort((a, b) => a.level - b.level);
  }

  /**
   * Escalate a task to the next level in the escalation chain
   * Creates a new escalation record at the next level if one exists
   * @param {Object} currentEscalation - Current escalation record with taskId, level, approvalChainId
   * @returns {Promise<Object|undefined>} New escalation record or undefined if at max level
   */
  async escalateToNextLevel(currentEscalation) {
    if (!currentEscalation || !currentEscalation.taskId) {
      throw new Error('Current escalation must have taskId');
    }

    if (!currentEscalation.approvalChainId) {
      throw new Error('Current escalation must have approvalChainId');
    }

    // Fetch all chain levels for this approval chain
    const levels = await this.getChainLevels(currentEscalation.approvalChainId);

    if (levels.length === 0) {
      throw new Error(`No escalation chain levels found for chain ${currentEscalation.approvalChainId}`);
    }

    // Find the next level
    const nextLevel = levels.find(l => l.level === currentEscalation.level + 1);

    // Return undefined if at max level (no next level exists)
    if (!nextLevel) {
      return undefined;
    }

    // Create escalation to next level
    const escalation = await this.models.ApprovalEscalation.create({
      taskId: currentEscalation.taskId,
      escalatedFrom: currentEscalation.escalatedTo,
      escalatedTo: nextLevel.escalateToRole,
      reason: 'sla_breach',
      hoursOverdue: 0,
      notificationSent: false
    });

    return escalation;
  }

  /**
   * Check if maximum escalation level has been reached
   * @param {number} taskId - The approval task ID
   * @param {number} approvalChainId - The approval chain ID
   * @param {number} currentLevel - Current escalation level
   * @returns {Promise<boolean>} True if at max level, false otherwise
   */
  async isMaxLevelReached(taskId, approvalChainId, currentLevel) {
    const levels = await this.getChainLevels(approvalChainId);

    if (levels.length === 0) {
      return true; // No levels defined, treat as max reached
    }

    const maxLevel = Math.max(...levels.map(l => l.level));
    return currentLevel >= maxLevel;
  }
}
