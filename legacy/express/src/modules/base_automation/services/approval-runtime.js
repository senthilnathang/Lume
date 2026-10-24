/**
 * Approval Runtime Service
 * Manages approval chain execution, task assignment, and decisions
 */

export class ApprovalRuntimeService {
  constructor(models, prisma) {
    this.models = models;
    this.prisma = prisma;
  }

  async submitForApproval(chainId, entityType, entityRef, submittedBy, executionId = null) {
    // Fetch the approval chain
    const chain = await this.models.ApprovalChain.findById(chainId);
    if (!chain) throw new Error('Approval chain not found');

    const steps = chain.steps && typeof chain.steps === 'string' ? JSON.parse(chain.steps) : chain.steps || [];
    if (steps.length === 0) throw new Error('Approval chain has no steps');

    // Create approval instance
    const instance = await this.models.ApprovalInstance.create({
      chainId,
      executionId,
      entityType,
      entityRef,
      currentStep: 1,
      status: 'pending',
      submittedBy,
      startedAt: new Date(),
    });

    // Create tasks for step 1
    const firstStep = steps[0];
    await this._createTasksForStep(instance, firstStep);

    return instance;
  }

  async _createTasksForStep(instance, step) {
    const { sequence = 1, name = '', approver_type = 'USER', approver_role = '', approver_id = null, sla_hours = 24 } = step;

    const dueAt = new Date(Date.now() + sla_hours * 3600000);

    if (approver_type === 'USER' && approver_id) {
      await this.models.ApprovalTask.create({
        instanceId: instance.id,
        stepSequence: sequence,
        stepName: name,
        assignedToUserId: approver_id,
        approverType: 'USER',
        status: 'pending',
        dueAt,
      });
    } else if (approver_type === 'ROLE' && approver_role) {
      const users = await this.prisma.user.findMany({
        where: { role: { name: approver_role } },
      });

      for (const user of users) {
        await this.models.ApprovalTask.create({
          instanceId: instance.id,
          stepSequence: sequence,
          stepName: name,
          assignedToUserId: user.id,
          assignedToRole: approver_role,
          approverType: 'ROLE',
          status: 'pending',
          dueAt,
        });
      }
    }
  }

  async getTasksForUser(userId, userRoleName) {
    const result = await this.models.ApprovalTask.findAll({
      where: [
        ['status', '=', 'pending']
      ],
      order: [['dueAt', 'ASC']]
    });

    return result.rows.filter(task => {
      return task.assignedToUserId === userId ||
        (task.approverType === 'ROLE' && task.assignedToRole === userRoleName);
    });
  }

  async approveTask(taskId, userId, comments) {
    const task = await this.models.ApprovalTask.findById(taskId);
    if (!task) throw new Error('Task not found');
    if (task.status !== 'pending') throw new Error('Task is not pending');

    // Mark task as approved
    await this.models.ApprovalTask.update(taskId, {
      status: 'approved',
      decidedBy: userId,
      decidedAt: new Date(),
      comments,
    });

    // Get the instance
    const instance = await this.models.ApprovalInstance.findById(task.instanceId);
    const chain = await this.models.ApprovalChain.findById(instance.chainId);
    const steps = chain.steps && typeof chain.steps === 'string' ? JSON.parse(chain.steps) : chain.steps || [];

    // Check if all required tasks for this step are approved
    const stepTasks = await this.models.ApprovalTask.findAll({
      where: [['instanceId', '=', task.instanceId], ['stepSequence', '=', task.stepSequence]],
    });

    const allApproved = stepTasks.rows.every(t => t.status === 'approved');

    if (allApproved) {
      if (task.stepSequence < steps.length) {
        const nextStep = steps[task.stepSequence];
        await this.models.ApprovalInstance.update(instance.id, {
          currentStep: task.stepSequence + 1,
        });
        await this._createTasksForStep(instance, nextStep);
      } else {
        await this.models.ApprovalInstance.update(instance.id, {
          status: 'approved',
          completedAt: new Date(),
        });
      }
    }

    return task;
  }

  async rejectTask(taskId, userId, reason) {
    const task = await this.models.ApprovalTask.findById(taskId);
    if (!task) throw new Error('Task not found');
    if (task.status !== 'pending') throw new Error('Task is not pending');

    // Mark task as rejected
    await this.models.ApprovalTask.update(taskId, {
      status: 'rejected',
      decidedBy: userId,
      decidedAt: new Date(),
      comments: reason,
    });

    // Mark instance as rejected
    await this.models.ApprovalInstance.update(task.instanceId, {
      status: 'rejected',
      completedAt: new Date(),
    });

    // Cancel all pending tasks for this instance
    const allTasks = await this.models.ApprovalTask.findAll({
      where: [['instanceId', '=', task.instanceId]],
    });

    for (const t of allTasks.rows) {
      if (t.status === 'pending' && t.id !== taskId) {
        await this.models.ApprovalTask.update(t.id, {
          status: 'cancelled',
        });
      }
    }

    return task;
  }

  async delegateTask(taskId, fromUserId, toUserId, reason) {
    const task = await this.models.ApprovalTask.findById(taskId);
    if (!task) throw new Error('Task not found');
    if (task.status !== 'pending') throw new Error('Task is not pending');

    // Mark original task as delegated
    await this.models.ApprovalTask.update(taskId, {
      status: 'delegated',
      delegatedTo: toUserId,
      comments: reason,
    });

    // Create new task for delegate
    const newTask = await this.models.ApprovalTask.create({
      instanceId: task.instanceId,
      stepSequence: task.stepSequence,
      stepName: task.stepName,
      assignedToUserId: toUserId,
      assignedToRole: task.assignedToRole,
      approverType: task.approverType,
      status: 'pending',
      dueAt: task.dueAt,
    });

    return newTask;
  }

  async getApprovalHistory(filters = {}) {
    const where = [];
    if (filters.instanceId) where.push(['instanceId', '=', filters.instanceId]);

    const result = await this.models.ApprovalTask.findAll({
      where: [...where, ['status', '!=', 'pending']],
      order: [['decidedAt', 'DESC']]
    });

    return result.rows;
  }

  async getApprovalInstance(instanceId) {
    const instance = await this.models.ApprovalInstance.findById(instanceId);
    if (!instance) return null;

    const result = await this.models.ApprovalTask.findAll({
      where: [['instanceId', '=', instanceId]],
      order: [['stepSequence', 'ASC'], ['createdAt', 'ASC']]
    });

    return {
      ...instance,
      tasks: result.rows,
    };
  }
}

export default ApprovalRuntimeService;
