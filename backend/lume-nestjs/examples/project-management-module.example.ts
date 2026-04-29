/**
 * Project Management Module Example
 *
 * Demonstrates a comprehensive project management system with:
 * - Projects, Tasks, and Team entities
 * - Complex relationships (tasks belong to projects, assigned to team members)
 * - Time tracking capabilities
 * - Status workflow automations
 * - Team collaboration views
 * - RBAC with project-based access control
 */

import { defineModule } from '@core/module/define-module';
import { defineEntity } from '@core/entity/define-entity';
import { defineWorkflow } from '@core/workflow/define-workflow';
import { definePolicy } from '@core/permission/define-policy';
import { defineView } from '@core/view/define-view';

// ============ ENTITIES ============

export const ProjectEntity = defineEntity('Project', {
  name: 'Project',
  label: 'Project',
  description: 'A container for organizing tasks and team collaboration',
  icon: 'folder',
  fields: {
    id: { name: 'id', type: 'int', required: true },
    name: { name: 'name', type: 'string', required: true },
    description: { name: 'description', type: 'text' },
    status: { name: 'status', type: 'string', defaultValue: 'planning' }, // planning, active, on-hold, completed, archived
    projectManager: { name: 'projectManager', type: 'int', required: true, isIndexed: true },
    startDate: { name: 'startDate', type: 'date' },
    dueDate: { name: 'dueDate', type: 'date' },
    budget: { name: 'budget', type: 'decimal' },
    spentAmount: { name: 'spentAmount', type: 'decimal', defaultValue: 0 },
    teamMembers: { name: 'teamMembers', type: 'json' }, // Array of user IDs
    category: { name: 'category', type: 'string', isIndexed: true },
    priority: { name: 'priority', type: 'string' }, // low, medium, high, critical
    visibility: { name: 'visibility', type: 'string', defaultValue: 'team' }, // public, team, private
    createdAt: { name: 'createdAt', type: 'datetime' },
    updatedAt: { name: 'updatedAt', type: 'datetime' },
  },
  computed: {
    isOverBudget: {
      formula: 'IF(spentAmount > budget, TRUE, FALSE)',
      type: 'boolean',
      label: 'Over Budget',
    },
    remainingBudget: {
      formula: 'budget - spentAmount',
      type: 'decimal',
      label: 'Remaining Budget',
    },
    daysRemaining: {
      formula: 'IF(dueDate IS NULL, NULL, DATEDIFF(dueDate, NOW()))',
      type: 'int',
      label: 'Days Remaining',
    },
    isLate: {
      formula: "IF(dueDate < NOW() AND status NOT IN ('completed', 'archived'), TRUE, FALSE)",
      type: 'boolean',
      label: 'Is Late',
    },
  },
  hooks: {
    beforeCreate: async (data, ctx) => {
      // Ensure project manager is in team members
      if (data.projectManager && data.teamMembers) {
        const members = Array.isArray(data.teamMembers) ? data.teamMembers : [];
        if (!members.includes(data.projectManager)) {
          members.push(data.projectManager);
          data.teamMembers = members;
        }
      }
      return data;
    },
  },
  aiMetadata: {
    description: 'Projects organizing work into tasks with teams, budgets, and timelines',
    sensitiveFields: ['budget'],
  },
});

export const TaskEntity = defineEntity('Task', {
  name: 'Task',
  label: 'Task',
  description: 'Individual work items within a project with assignments and tracking',
  icon: 'check-square',
  fields: {
    id: { name: 'id', type: 'int', required: true },
    title: { name: 'title', type: 'string', required: true },
    description: { name: 'description', type: 'text' },
    projectId: { name: 'projectId', type: 'int', required: true, isIndexed: true },
    status: { name: 'status', type: 'string', required: true }, // todo, in-progress, review, done, blocked
    priority: { name: 'priority', type: 'string' }, // low, medium, high, critical
    assignedTo: { name: 'assignedTo', type: 'int', isIndexed: true },
    createdBy: { name: 'createdBy', type: 'int', required: true },
    dueDate: { name: 'dueDate', type: 'date' },
    completedAt: { name: 'completedAt', type: 'datetime' },
    estimatedHours: { name: 'estimatedHours', type: 'decimal' },
    actualHours: { name: 'actualHours', type: 'decimal', defaultValue: 0 },
    blockedBy: { name: 'blockedBy', type: 'json' }, // Array of task IDs
    tags: { name: 'tags', type: 'json' },
    attachments: { name: 'attachments', type: 'json' },
    comments: { name: 'comments', type: 'json' },
    createdAt: { name: 'createdAt', type: 'datetime' },
    updatedAt: { name: 'updatedAt', type: 'datetime' },
  },
  computed: {
    isOverdue: {
      formula: "IF(dueDate < NOW() AND status != 'done', TRUE, FALSE)",
      type: 'boolean',
      label: 'Is Overdue',
    },
    hoursVariance: {
      formula: 'actualHours - estimatedHours',
      type: 'decimal',
      label: 'Hours Variance',
    },
    percentComplete: {
      formula: 'CASE status WHEN "done" THEN 100 WHEN "in-progress" THEN 50 ELSE 0 END',
      type: 'int',
      label: '% Complete',
    },
  },
  hooks: {
    beforeUpdate: async (id, data, ctx) => {
      // Auto-set completedAt when status changes to done
      if (data.status === 'done' && !data.completedAt) {
        data.completedAt = new Date().toISOString();
      }
      return data;
    },
    afterUpdate: async (record, ctx) => {
      // Emit task event for notifications
      if (record.status === 'done') {
        await ctx.eventBus.emit({
          type: 'task.completed',
          data: { taskId: record.id, projectId: record.projectId },
        });
      }
    },
  },
  aiMetadata: {
    description: 'Tasks with assignments, deadlines, time estimates, and status tracking',
    sensitiveFields: [],
  },
});

export const TimeEntryEntity = defineEntity('TimeEntry', {
  name: 'TimeEntry',
  label: 'Time Entry',
  description: 'Time tracking logs for tasks and projects',
  icon: 'clock',
  fields: {
    id: { name: 'id', type: 'int', required: true },
    taskId: { name: 'taskId', type: 'int', required: true, isIndexed: true },
    projectId: { name: 'projectId', type: 'int', required: true, isIndexed: true },
    userId: { name: 'userId', type: 'int', required: true, isIndexed: true },
    hours: { name: 'hours', type: 'decimal', required: true },
    notes: { name: 'notes', type: 'text' },
    entryDate: { name: 'entryDate', type: 'date', required: true },
    createdAt: { name: 'createdAt', type: 'datetime' },
    updatedAt: { name: 'updatedAt', type: 'datetime' },
  },
  computed: {
    billableAmount: {
      formula: 'hours * 150', // $150/hour default
      type: 'decimal',
      label: 'Billable Amount',
    },
  },
  aiMetadata: {
    description: 'Time tracking entries associated with tasks and projects',
    sensitiveFields: [],
  },
});

// ============ WORKFLOWS ============

export const TaskStatusUpdateWorkflow = defineWorkflow({
  name: 'task-status-update',
  version: '1.0.0',
  entity: 'Task',
  trigger: { type: 'field_changed', field: 'status' },
  steps: [
    {
      type: 'condition',
      if: { field: 'status', operator: '==', value: 'in-progress' },
      then: [
        {
          type: 'send_notification',
          to: '$assignedTo',
          template: 'task_started',
        },
      ],
    },
    {
      type: 'condition',
      if: { field: 'status', operator: '==', value: 'done' },
      then: [
        { type: 'set_field', field: 'completedAt', value: 'NOW()' },
        {
          type: 'send_notification',
          to: '$createdBy',
          template: 'task_completed_notification',
        },
      ],
    },
    {
      type: 'condition',
      if: { field: 'status', operator: '==', value: 'blocked' },
      then: [
        {
          type: 'send_notification',
          to: '$createdBy',
          template: 'task_blocked_alert',
        },
      ],
    },
  ],
  onError: 'continue',
});

export const ProjectCompletionWorkflow = defineWorkflow({
  name: 'project-completion-check',
  version: '1.0.0',
  entity: 'Task',
  trigger: { type: 'field_changed', field: 'status', to: 'done' },
  steps: [
    {
      type: 'custom',
      handler: 'check_project_completion',
    },
  ],
  onError: 'continue',
});

export const TaskDueSoonWorkflow = defineWorkflow({
  name: 'task-due-soon-reminder',
  version: '1.0.0',
  entity: 'Task',
  trigger: { type: 'schedule', cron: '0 9 * * *' }, // Daily at 9 AM
  steps: [
    {
      type: 'condition',
      if: { field: 'status', operator: '!=', value: 'done' },
      then: [
        {
          type: 'condition',
          if: { field: 'dueDate', operator: '<=', value: 'DATE_ADD(NOW(), INTERVAL 2 DAY)' },
          then: [
            {
              type: 'send_notification',
              to: '$assignedTo',
              template: 'task_due_soon_reminder',
            },
          ],
        },
      ],
    },
  ],
  onError: 'continue',
});

// ============ POLICIES ============

export const ProjectMemberViewPolicy = definePolicy({
  name: 'project-member-view',
  entity: 'Task',
  actions: ['read'],
  conditions: [
    // Team members can see tasks in their projects
    { field: 'projectId', operator: 'in', value: '$memberProjects' },
  ],
  roles: ['team_member'],
  deny: false,
});

export const TaskOwnerEditPolicy = definePolicy({
  name: 'task-owner-edit',
  entity: 'Task',
  actions: ['write', 'update'],
  conditions: [
    // Assignee can update their own tasks
    { field: 'assignedTo', operator: '==', value: '$userId' },
  ],
  roles: ['team_member'],
  deny: false,
});

export const ProjectManagerAllAccessPolicy = definePolicy({
  name: 'project-manager-access',
  entity: 'Task',
  actions: ['*'],
  conditions: [
    // Project manager can manage all tasks in their projects
    { field: 'projectId', operator: 'in', value: '$managedProjects' },
  ],
  roles: ['project_manager'],
  deny: false,
});

// ============ VIEWS ============

export const ProjectsListView = defineView({
  name: 'projects-list',
  entity: 'Project',
  type: 'table',
  label: 'Projects',
  isDefault: true,
  config: {
    columns: [
      { field: 'name', label: 'Project Name', sortable: true, filterable: true },
      { field: 'status', label: 'Status', sortable: true, filterable: true },
      { field: 'projectManager', label: 'Manager', type: 'user' },
      { field: 'dueDate', label: 'Due Date', type: 'date', sortable: true },
      { field: 'priority', label: 'Priority', filterable: true },
      { field: 'remainingBudget', label: 'Remaining Budget', type: 'currency' },
    ],
    pageSize: 20,
  },
});

export const TasksKanbanView = defineView({
  name: 'tasks-kanban',
  entity: 'Task',
  type: 'kanban',
  label: 'Task Board',
  config: {
    groupByField: 'status',
    groupOptions: ['todo', 'in-progress', 'review', 'done'],
    cardFields: ['title', 'assignedTo', 'dueDate', 'priority'],
    summaryField: 'estimatedHours',
  },
});

export const TasksListView = defineView({
  name: 'tasks-list',
  entity: 'Task',
  type: 'table',
  label: 'All Tasks',
  config: {
    columns: [
      { field: 'title', label: 'Task', sortable: true, filterable: true },
      { field: 'status', label: 'Status', sortable: true, filterable: true },
      { field: 'assignedTo', label: 'Assigned To', type: 'user' },
      { field: 'dueDate', label: 'Due', type: 'date', sortable: true },
      { field: 'priority', label: 'Priority', filterable: true },
      { field: 'estimatedHours', label: 'Est. Hours', type: 'number' },
      { field: 'actualHours', label: 'Actual Hours', type: 'number' },
    ],
    pageSize: 50,
  },
});

export const ProjectDashboard = defineView({
  name: 'project-dashboard',
  entity: 'Project',
  type: 'dashboard',
  label: 'Project Overview',
  config: {
    widgets: [
      {
        type: 'counter',
        field: 'id',
        aggregation: 'count',
        label: 'Active Projects',
        filter: { status: 'active' },
      },
      {
        type: 'counter',
        field: 'budget',
        aggregation: 'sum',
        label: 'Total Budget',
      },
      {
        type: 'chart',
        chartType: 'pie',
        field: 'status',
        aggregation: 'count',
        label: 'Projects by Status',
      },
      {
        type: 'chart',
        chartType: 'bar',
        field: 'projectManager',
        aggregation: 'count',
        label: 'Projects per Manager',
      },
    ],
  },
});

// ============ MODULE DEFINITION ============

export const ProjectManagementModule = defineModule({
  name: 'project-management',
  version: '2.0.0',
  description: 'Complete project management with projects, tasks, teams, time tracking, and workflow automation',
  depends: ['base'],

  entities: [ProjectEntity, TaskEntity, TimeEntryEntity],

  workflows: [
    TaskStatusUpdateWorkflow,
    ProjectCompletionWorkflow,
    TaskDueSoonWorkflow,
  ],

  views: [
    ProjectsListView,
    TasksKanbanView,
    TasksListView,
    ProjectDashboard,
  ],

  permissions: [
    'pm.projects.read',
    'pm.projects.write',
    'pm.tasks.read',
    'pm.tasks.write',
    'pm.time.track',
    'pm.time.view',
  ],

  hooks: {
    onInstall: async (db) => {
      console.log('Installing project management module...');
    },
    onLoad: async () => {
      console.log('Project Management module loaded');
    },
  },

  frontend: {
    routes: [
      { path: '/projects', component: 'ProjectsPage' },
      { path: '/projects/:id', component: 'ProjectDetailPage' },
      { path: '/tasks', component: 'TasksPage' },
      { path: '/time', component: 'TimeTrackingPage' },
    ],
    menu: [
      {
        label: 'Projects',
        icon: 'folder',
        children: [
          { label: 'My Projects', path: '/projects' },
          { label: 'My Tasks', path: '/tasks' },
          { label: 'Time Tracking', path: '/time' },
        ],
      },
    ],
  },
});

export default ProjectManagementModule;
