# End-to-End Example: Ticket Management System

**Status:** Complete Architecture Specification  
**Version:** 2.0  
**Date:** 2026-04-30  
**Integrates:** All 7 previous architecture documents

## Executive Summary

This document demonstrates how all components of the Lume Unified Runtime work together in a real-world ticket management system. A user creates a support ticket, which automatically triggers workflows (finding an agent to assign), activates agents (sending notifications), updates views (grid reflects new ticket), and enforces permissions (only managers can escalate). By the end, you'll see exactly how entities, views, workflows, permissions, and agents collaborate in a complete, production-grade system.

**What You'll Learn:**
- How to define a complete entity with permissions and hooks
- How zero-code generation produces API endpoints and forms
- How workflows orchestrate multi-step business logic
- How agents react to events without coding
- How permissions enforce role-based and field-level access
- How the frontend consumes generated APIs and renders data
- How to test the entire flow end-to-end

---

## 1. Complete Ticket Entity Definition

### 1.1 Entity Schema with Fields, Hooks, and Options

The Ticket entity is the core of our system. It defines what data we store, how we validate it, what happens on create/update/delete, and what constraints apply.

```typescript
// File: backend/src/modules/support/tickets.entity.ts
// This file registers the Ticket entity with the Runtime

import { defineEntity } from '@/core/entity/entity-builder.js';
import { v4 as uuid } from 'uuid';

/**
 * Ticket Entity Definition
 * 
 * Registered with RuntimeRegistry on module init. This single definition
 * auto-generates:
 * - REST API: GET /api/tickets, POST /api/tickets, GET /api/tickets/:id, etc.
 * - Form views with validation
 * - Table views with sorting/filtering
 * - Default workflows (on-create, before-update, etc.)
 * - Permissions (ticket:create, ticket:read, ticket:update, ticket:delete, ticket:assign, ticket:escalate)
 */
export const ticketEntity = defineEntity({
  // =========================================================================
  // IDENTITY & METADATA
  // =========================================================================
  
  name: 'ticket',
  domain: 'support', // Fully qualified: 'support:ticket'
  displayName: 'Support Ticket',
  description: 'Customer support tickets with auto-assignment and escalation',
  tableName: 'support_tickets',
  
  // =========================================================================
  // FIELD DEFINITIONS
  // =========================================================================
  
  fields: {
    // System field: unique identifier
    id: {
      type: 'uuid',
      primary: true,
      required: true,
      readOnly: true,
      default: () => uuid(),
      description: 'Unique ticket identifier',
    },

    // Basic ticket metadata
    title: {
      type: 'string',
      required: true,
      maxLength: 255,
      minLength: 3,
      description: 'Brief ticket subject',
      validations: [
        {
          rule: 'minLength',
          value: 3,
          message: 'Title must be at least 3 characters',
        },
        {
          rule: 'maxLength',
          value: 255,
          message: 'Title must not exceed 255 characters',
        },
      ],
      ui: {
        component: 'text-input',
        label: 'Ticket Title',
        placeholder: 'e.g., Payment processing issue',
      },
    },

    description: {
      type: 'text',
      required: true,
      maxLength: 5000,
      minLength: 10,
      description: 'Detailed ticket description',
      validations: [
        {
          rule: 'minLength',
          value: 10,
          message: 'Description must be at least 10 characters',
        },
        {
          rule: 'maxLength',
          value: 5000,
          message: 'Description must not exceed 5000 characters',
        },
      ],
      ui: {
        component: 'textarea',
        label: 'Description',
        placeholder: 'Describe the issue in detail...',
        rows: 5,
      },
    },

    // Status with predefined options
    status: {
      type: 'enum',
      required: true,
      default: 'open',
      options: [
        { value: 'open', label: 'Open', color: '#1890ff' },
        { value: 'in-progress', label: 'In Progress', color: '#faad14' },
        { value: 'resolved', label: 'Resolved', color: '#52c41a' },
        { value: 'closed', label: 'Closed', color: '#8c8c8c' },
      ],
      description: 'Ticket lifecycle status',
      ui: {
        component: 'select',
        label: 'Status',
      },
    },

    // Priority with predefined options
    priority: {
      type: 'enum',
      required: true,
      default: 'medium',
      options: [
        { value: 'low', label: 'Low', color: '#52c41a' },
        { value: 'medium', label: 'Medium', color: '#faad14' },
        { value: 'high', label: 'High', color: '#f5222d' },
        { value: 'critical', label: 'Critical', color: '#8B0000' },
      ],
      description: 'Issue severity level',
      ui: {
        component: 'select',
        label: 'Priority',
      },
    },

    // Foreign key: assigned agent (support staff member)
    assigneeId: {
      type: 'uuid',
      required: false,
      description: 'ID of assigned support agent',
      references: 'User',
      onDelete: 'SET_NULL',
      ui: {
        component: 'user-select',
        label: 'Assigned To',
        role: 'support-agent', // Only show users with this role
      },
    },

    // Foreign key: who created the ticket
    createdById: {
      type: 'uuid',
      required: true,
      readOnly: true,
      description: 'ID of user who created the ticket',
      references: 'User',
      onDelete: 'RESTRICT',
    },

    // Timestamps
    createdAt: {
      type: 'datetime',
      required: true,
      readOnly: true,
      default: () => new Date().toISOString(),
      description: 'Ticket creation timestamp',
      ui: {
        component: 'date-display',
        label: 'Created',
      },
    },

    updatedAt: {
      type: 'datetime',
      required: true,
      readOnly: true,
      default: () => new Date().toISOString(),
      onUpdate: () => new Date().toISOString(),
      description: 'Last modification timestamp',
      ui: {
        component: 'date-display',
        label: 'Last Updated',
      },
    },

    resolvedAt: {
      type: 'datetime',
      required: false,
      readOnly: true,
      description: 'Timestamp when ticket was resolved',
      ui: {
        component: 'date-display',
        label: 'Resolved At',
      },
    },

    dueDate: {
      type: 'datetime',
      required: false,
      description: 'SLA due date for ticket resolution',
      validations: [
        {
          rule: 'custom',
          validator: (value, context) => {
            if (!value) return true; // Optional field
            const due = new Date(value);
            const now = new Date();
            return due > now || 'Due date must be in the future';
          },
          message: 'Due date must be in the future',
        },
      ],
      ui: {
        component: 'date-picker',
        label: 'Due Date',
      },
    },
  },

  // =========================================================================
  // PERMISSIONS (RBAC + ABAC)
  // =========================================================================
  
  permissions: [
    {
      code: 'ticket:create',
      name: 'Create Ticket',
      description: 'Create new support tickets',
      scope: 'global',
    },
    {
      code: 'ticket:read',
      name: 'View Tickets',
      description: 'View ticket details',
      scope: 'record', // Can be scoped to records user created/assigned to
    },
    {
      code: 'ticket:update',
      name: 'Update Ticket',
      description: 'Modify ticket details',
      scope: 'record',
    },
    {
      code: 'ticket:delete',
      name: 'Delete Ticket',
      description: 'Delete tickets (admin only)',
      scope: 'record',
    },
    {
      code: 'ticket:assign',
      name: 'Assign Ticket',
      description: 'Assign ticket to agent',
      scope: 'record',
    },
    {
      code: 'ticket:escalate',
      name: 'Escalate Ticket',
      description: 'Escalate to manager',
      scope: 'record',
    },
  ],

  // =========================================================================
  // HOOKS: BEFORE/AFTER MUTATIONS
  // =========================================================================
  
  hooks: {
    // --------- CREATE HOOKS ---------
    
    beforeCreate: async (context) => {
      const { data, user, db } = context;
      
      // 1. Validate user can create tickets
      const hasPermission = await context.permissions.can('ticket:create');
      if (!hasPermission) {
        throw new ForbiddenError('You do not have permission to create tickets');
      }

      // 2. Set createdBy to current user
      data.createdById = user.id;
      
      // 3. Initialize timestamps
      data.createdAt = new Date().toISOString();
      data.updatedAt = new Date().toISOString();

      // 4. Default status and priority if not provided
      if (!data.status) data.status = 'open';
      if (!data.priority) data.priority = 'medium';

      // 5. Optional: Set initial dueDate based on priority SLA
      if (!data.dueDate && data.priority === 'critical') {
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + 1); // 1 hour SLA for critical
        data.dueDate = dueDate.toISOString();
      }

      return data;
    },

    afterCreate: async (context) => {
      const { data, eventBus } = context;

      // 1. Emit 'ticket:created' event (picked up by agents/workflows)
      await eventBus.emit('ticket:created', {
        ticketId: data.id,
        title: data.title,
        priority: data.priority,
        createdBy: data.createdById,
      });

      // 2. Optionally send immediate confirmation email to creator
      // (Email service is triggered by a separate agent)

      return data;
    },

    // --------- UPDATE HOOKS ---------

    beforeUpdate: async (context) => {
      const { id, data, user, previousData, db } = context;

      // 1. Check permission to update
      const hasPermission = await context.permissions.can('ticket:update', {
        record: previousData,
      });
      if (!hasPermission) {
        throw new ForbiddenError('You do not have permission to update this ticket');
      }

      // 2. Prevent status downgrade (open -> closed)
      const statusOrder = ['open', 'in-progress', 'resolved', 'closed'];
      if (data.status && previousData.status !== data.status) {
        const previousIdx = statusOrder.indexOf(previousData.status);
        const newIdx = statusOrder.indexOf(data.status);
        if (newIdx < previousIdx) {
          throw new ValidationError('Cannot move ticket backwards in status');
        }
      }

      // 3. Auto-set resolvedAt when status changes to resolved
      if (data.status === 'resolved' && previousData.status !== 'resolved') {
        data.resolvedAt = new Date().toISOString();
      }

      // 4. Update timestamp
      data.updatedAt = new Date().toISOString();

      return data;
    },

    afterUpdate: async (context) => {
      const { id, data, previousData, eventBus } = context;

      // 1. Emit 'ticket:updated' event (triggers escalation agent, etc.)
      await eventBus.emit('ticket:updated', {
        ticketId: id,
        changes: {
          status: previousData.status !== data.status ? [previousData.status, data.status] : null,
          assignee: previousData.assigneeId !== data.assigneeId ? [previousData.assigneeId, data.assigneeId] : null,
          priority: previousData.priority !== data.priority ? [previousData.priority, data.priority] : null,
        },
        previous: previousData,
        current: data,
      });

      return data;
    },

    // --------- DELETE HOOKS ---------

    beforeDelete: async (context) => {
      const { id, user } = context;

      // Only admins can delete tickets
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      if (!isAdmin) {
        throw new ForbiddenError('Only administrators can delete tickets');
      }

      return true;
    },

    afterDelete: async (context) => {
      const { id, data, eventBus } = context;

      // Emit event for audit log
      await eventBus.emit('ticket:deleted', {
        ticketId: id,
        title: data.title,
      });

      return true;
    },
  },

  // =========================================================================
  // UI & DISPLAY OPTIONS
  // =========================================================================
  
  ui: {
    icon: 'AlertCircle', // lucide-vue-next icon name
    color: '#1890ff',
    plural: 'Tickets',
    singularCaps: 'Support Ticket',
    singularLower: 'support ticket',
  },

  // =========================================================================
  // FEATURES & CAPABILITIES
  // =========================================================================
  
  features: {
    softDelete: false, // Hard delete only
    audit: true, // Log all mutations
    workflow: true, // Enable workflow hooks
    search: true, // Enable full-text search on title + description
    export: true, // Allow CSV/Excel export
    bulk: true, // Support bulk operations
  },
});

/**
 * Error Classes
 */
export class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403;
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}
```

### 1.2 Registration & Module Initialization

When the support module initializes, the ticket entity is registered with the RuntimeRegistry, which triggers auto-generation of all downstream artifacts.

```typescript
// File: backend/src/modules/support/__manifest__.js
// Module manifest executed on app startup

export default {
  id: 'support',
  name: 'Support Ticket Management',
  version: '1.0.0',
  description: 'Ticket management with auto-assignment and escalation',
  
  // Entities registered with the runtime
  entities: [
    {
      path: './tickets.entity.js',
      name: 'ticket',
    },
  ],

  // Workflows defined in this module
  workflows: [
    {
      path: './workflows/auto-assign.workflow.js',
      id: 'ticket:auto-assign',
    },
    {
      path: './workflows/escalate.workflow.js',
      id: 'ticket:escalate',
    },
  ],

  // Agents that react to events
  agents: [
    {
      path: './agents/auto-assign.agent.js',
      id: 'support:auto-assign-agent',
    },
    {
      path: './agents/escalation.agent.js',
      id: 'support:escalation-agent',
    },
    {
      path: './agents/notification.agent.js',
      id: 'support:notification-agent',
    },
  ],

  // Views that display tickets
  views: [
    {
      path: './views/ticket-grid.view.js',
      name: 'ticket-grid',
    },
    {
      path: './views/ticket-form.view.js',
      name: 'ticket-form',
    },
  ],

  // Permissions grouped by domain
  permissions: [
    {
      code: 'ticket:create',
      name: 'Create Ticket',
      description: 'Create new support tickets',
    },
    {
      code: 'ticket:read',
      name: 'View Tickets',
      description: 'View ticket details',
    },
    {
      code: 'ticket:update',
      name: 'Update Ticket',
      description: 'Modify ticket details',
    },
    {
      code: 'ticket:delete',
      name: 'Delete Ticket',
      description: 'Delete tickets (admin only)',
    },
    {
      code: 'ticket:assign',
      name: 'Assign Ticket',
      description: 'Assign ticket to agent',
    },
    {
      code: 'ticket:escalate',
      name: 'Escalate Ticket',
      description: 'Escalate to manager',
    },
  ],

  // Role-permission mappings
  rbac: [
    {
      role: 'customer',
      permissions: [
        'ticket:create', // Customers can create their own tickets
        'ticket:read', // Can read their own tickets (enforced via ABAC)
      ],
    },
    {
      role: 'support-agent',
      permissions: [
        'ticket:read',
        'ticket:update',
        'ticket:assign', // Can assign to self or other agents
      ],
    },
    {
      role: 'support-manager',
      permissions: [
        'ticket:read',
        'ticket:update',
        'ticket:assign',
        'ticket:escalate', // Can escalate to management
      ],
    },
    {
      role: 'admin',
      permissions: [
        'ticket:create',
        'ticket:read',
        'ticket:update',
        'ticket:delete',
        'ticket:assign',
        'ticket:escalate',
      ],
    },
  ],

  // Module dependencies
  depends: ['base', 'editor'],

  // Initialization function
  async init(runtime) {
    // Register ticket entity
    const ticketEntity = await import('./tickets.entity.js');
    runtime.entities.register(ticketEntity.ticketEntity);

    // Register workflows
    const autoAssignWorkflow = await import('./workflows/auto-assign.workflow.js');
    runtime.workflows.register(autoAssignWorkflow.autoAssignWorkflow);

    const escalateWorkflow = await import('./workflows/escalate.workflow.js');
    runtime.workflows.register(escalateWorkflow.escalateWorkflow);

    // Register agents
    const autoAssignAgent = await import('./agents/auto-assign.agent.js');
    runtime.agents.register(autoAssignAgent.autoAssignAgent);

    const escalationAgent = await import('./agents/escalation.agent.js');
    runtime.agents.register(escalationAgent.escalationAgent);

    const notificationAgent = await import('./agents/notification.agent.js');
    runtime.agents.register(notificationAgent.notificationAgent);

    // Register views
    const ticketGridView = await import('./views/ticket-grid.view.js');
    runtime.views.register(ticketGridView.ticketGridView);

    const ticketFormView = await import('./views/ticket-form.view.js');
    runtime.views.register(ticketFormView.ticketFormView);

    console.log('✓ Support module initialized with ticket entity');
  },
};
```

---

## 2. Auto-Generated API Endpoints

Once the ticket entity is registered, the Zero-Code Generation Pipeline automatically creates all REST endpoints. Let's see what's generated and how to use it.

### 2.1 Complete API Reference

```
GET    /api/tickets                 → List all tickets with filtering, sorting, pagination
POST   /api/tickets                 → Create new ticket
GET    /api/tickets/:id             → Get single ticket
PUT    /api/tickets/:id             → Update ticket
DELETE /api/tickets/:id             → Delete ticket (admin only)
POST   /api/tickets/bulk            → Bulk create/update tickets
DELETE /api/tickets/bulk            → Bulk delete tickets
GET    /api/tickets/fields          → Schema metadata for form generation
GET    /api/tickets/export          → Export as CSV/Excel
```

### 2.2 Request/Response Examples

#### **GET /api/tickets** — List Tickets with Filtering

**Request:**
```http
GET /api/tickets?page=1&pageSize=10&status=open&priority=high&sort=-createdAt
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Payment gateway timeout",
        "description": "Customers unable to complete payments during peak hours",
        "status": "open",
        "priority": "critical",
        "assigneeId": null,
        "createdById": "12345678-1234-1234-1234-123456789012",
        "createdAt": "2026-04-30T14:23:00Z",
        "updatedAt": "2026-04-30T14:23:00Z",
        "resolvedAt": null,
        "dueDate": "2026-04-30T15:23:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "Login page CSS broken on mobile",
        "description": "Login form misaligned on screens < 480px width",
        "status": "in-progress",
        "priority": "high",
        "assigneeId": "87654321-4321-4321-4321-210987654321",
        "createdById": "12345678-1234-1234-1234-123456789012",
        "createdAt": "2026-04-29T10:15:00Z",
        "updatedAt": "2026-04-30T09:45:00Z",
        "resolvedAt": null,
        "dueDate": "2026-05-01T10:15:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 24,
      "totalPages": 3
    },
    "filters": {
      "applied": {
        "status": "open",
        "priority": "high"
      },
      "available": {
        "status": ["open", "in-progress", "resolved", "closed"],
        "priority": ["low", "medium", "high", "critical"]
      }
    }
  }
}
```

#### **POST /api/tickets** — Create New Ticket

**Request:**
```http
POST /api/tickets
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Dashboard loading slowly",
  "description": "The admin dashboard takes 30+ seconds to load after login. Users report frequent timeouts during business hours (9am-5pm EST).",
  "priority": "high",
  "dueDate": "2026-05-02T09:00:00Z"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "title": "Dashboard loading slowly",
    "description": "The admin dashboard takes 30+ seconds to load after login. Users report frequent timeouts during business hours (9am-5pm EST).",
    "status": "open",
    "priority": "high",
    "assigneeId": null,
    "createdById": "12345678-1234-1234-1234-123456789012",
    "createdAt": "2026-04-30T15:30:00Z",
    "updatedAt": "2026-04-30T15:30:00Z",
    "resolvedAt": null,
    "dueDate": "2026-05-02T09:00:00Z"
  }
}
```

**Permission Enforcement:** The API checks `ticket:create` permission before inserting. If user lacks permission, returns 403 Forbidden.

#### **GET /api/tickets/:id** — Get Single Ticket

**Request:**
```http
GET /api/tickets/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Payment gateway timeout",
    "description": "Customers unable to complete payments during peak hours",
    "status": "open",
    "priority": "critical",
    "assigneeId": null,
    "createdById": "12345678-1234-1234-1234-123456789012",
    "createdAt": "2026-04-30T14:23:00Z",
    "updatedAt": "2026-04-30T14:23:00Z",
    "resolvedAt": null,
    "dueDate": "2026-04-30T15:23:00Z",
    "creator": {
      "id": "12345678-1234-1234-1234-123456789012",
      "email": "customer@example.com",
      "name": "Jane Customer"
    },
    "assignee": null
  }
}
```

#### **PUT /api/tickets/:id** — Update Ticket

**Request:**
```http
PUT /api/tickets/550e8400-e29b-41d4-a716-446655440001
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "in-progress",
  "assigneeId": "87654321-4321-4321-4321-210987654321",
  "priority": "critical"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Login page CSS broken on mobile",
    "description": "Login form misaligned on screens < 480px width",
    "status": "in-progress",
    "priority": "critical",
    "assigneeId": "87654321-4321-4321-4321-210987654321",
    "createdById": "12345678-1234-1234-1234-123456789012",
    "createdAt": "2026-04-29T10:15:00Z",
    "updatedAt": "2026-04-30T16:00:00Z",
    "resolvedAt": null,
    "dueDate": "2026-05-01T10:15:00Z"
  }
}
```

**Permission Enforcement:** Checks `ticket:update` + ABAC rule (can only update if creator or assigned agent or manager).

#### **DELETE /api/tickets/:id** — Delete Ticket

**Request:**
```http
DELETE /api/tickets/550e8400-e29b-41d4-a716-446655440002
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Ticket deleted successfully",
    "id": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

**Permission Enforcement:** Only admins can delete (enforced in beforeDelete hook).

#### **POST /api/tickets/bulk** — Bulk Operations

**Request:**
```http
POST /api/tickets/bulk?action=update
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ],
  "data": {
    "assigneeId": "87654321-4321-4321-4321-210987654321",
    "status": "in-progress"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "operation": "update",
    "itemsProcessed": 2,
    "itemsFailed": 0,
    "results": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "success",
        "data": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "status": "in-progress",
          "assigneeId": "87654321-4321-4321-4321-210987654321",
          "updatedAt": "2026-04-30T16:05:00Z"
        }
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "status": "success",
        "data": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "status": "in-progress",
          "assigneeId": "87654321-4321-4321-4321-210987654321",
          "updatedAt": "2026-04-30T16:05:00Z"
        }
      }
    ]
  }
}
```

#### **GET /api/tickets/fields** — Schema Metadata

Used by the frontend to dynamically build forms. Returned automatically before any API calls.

**Request:**
```http
GET /api/tickets/fields
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entityName": "ticket",
    "displayName": "Support Ticket",
    "fields": [
      {
        "name": "id",
        "type": "uuid",
        "required": true,
        "readOnly": true,
        "component": "text-display"
      },
      {
        "name": "title",
        "type": "string",
        "required": true,
        "maxLength": 255,
        "minLength": 3,
        "component": "text-input",
        "label": "Ticket Title",
        "placeholder": "e.g., Payment processing issue"
      },
      {
        "name": "description",
        "type": "text",
        "required": true,
        "maxLength": 5000,
        "minLength": 10,
        "component": "textarea",
        "label": "Description",
        "rows": 5
      },
      {
        "name": "status",
        "type": "enum",
        "required": true,
        "default": "open",
        "options": [
          { "value": "open", "label": "Open", "color": "#1890ff" },
          { "value": "in-progress", "label": "In Progress", "color": "#faad14" },
          { "value": "resolved", "label": "Resolved", "color": "#52c41a" },
          { "value": "closed", "label": "Closed", "color": "#8c8c8c" }
        ],
        "component": "select",
        "label": "Status"
      },
      {
        "name": "priority",
        "type": "enum",
        "required": true,
        "default": "medium",
        "options": [
          { "value": "low", "label": "Low", "color": "#52c41a" },
          { "value": "medium", "label": "Medium", "color": "#faad14" },
          { "value": "high", "label": "High", "color": "#f5222d" },
          { "value": "critical", "label": "Critical", "color": "#8B0000" }
        ],
        "component": "select",
        "label": "Priority"
      },
      {
        "name": "assigneeId",
        "type": "uuid",
        "required": false,
        "references": "User",
        "component": "user-select",
        "label": "Assigned To",
        "role": "support-agent"
      },
      {
        "name": "dueDate",
        "type": "datetime",
        "required": false,
        "component": "date-picker",
        "label": "Due Date"
      }
    ],
    "permissions": [
      "ticket:create",
      "ticket:read",
      "ticket:update",
      "ticket:delete",
      "ticket:assign",
      "ticket:escalate"
    ],
    "userPermissions": [
      "ticket:create",
      "ticket:read",
      "ticket:update"
    ]
  }
}
```

---

## 3. UI Components (Vue 3)

The frontend consumes the generated schema and API to render dynamic forms and grids. Here are production-grade Vue 3 components.

### 3.1 TicketForm Component

```vue
<!-- File: frontend/apps/web-lume/src/components/tickets/TicketForm.vue -->
<template>
  <a-card title="Create Support Ticket" class="ticket-form">
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
      @finish="onSubmit"
      class="space-y-4"
    >
      <!-- Title Field -->
      <a-form-item label="Title" name="title" required>
        <a-input
          v-model:value="form.title"
          placeholder="e.g., Payment processing issue"
          maxlength="255"
          show-count
          @change="onFieldChange('title')"
        />
        <div class="text-xs text-gray-400 mt-1">
          Brief description of the issue (3-255 characters)
        </div>
      </a-form-item>

      <!-- Description Field -->
      <a-form-item label="Description" name="description" required>
        <a-textarea
          v-model:value="form.description"
          placeholder="Describe the issue in detail..."
          :rows="5"
          maxlength="5000"
          show-count
          @change="onFieldChange('description')"
        />
        <div class="text-xs text-gray-400 mt-1">
          Provide context and steps to reproduce (10-5000 characters)
        </div>
      </a-form-item>

      <!-- Priority Select -->
      <a-form-item label="Priority" name="priority">
        <a-select
          v-model:value="form.priority"
          placeholder="Select priority level"
          @change="onFieldChange('priority')"
        >
          <a-select-option value="low">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" style="background-color: #52c41a"></span>
              Low
            </span>
          </a-select-option>
          <a-select-option value="medium">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" style="background-color: #faad14"></span>
              Medium
            </span>
          </a-select-option>
          <a-select-option value="high">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" style="background-color: #f5222d"></span>
              High
            </span>
          </a-select-option>
          <a-select-option value="critical">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" style="background-color: #8B0000"></span>
              Critical
            </span>
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- Due Date Picker -->
      <a-form-item label="Due Date (Optional)" name="dueDate">
        <a-date-picker
          v-model:value="form.dueDate"
          show-time
          placeholder="Select due date and time"
          format="YYYY-MM-DD HH:mm"
          @change="onFieldChange('dueDate')"
        />
        <div class="text-xs text-gray-400 mt-1">
          When should this be resolved? (Optional)
        </div>
      </a-form-item>

      <!-- Form Actions -->
      <a-form-item>
        <a-button-group>
          <a-button type="primary" html-type="submit" :loading="isSubmitting">
            <template #icon>
              <CheckOutlined />
            </template>
            Create Ticket
          </a-button>
          <a-button @click="onReset">
            <template #icon>
              <ClearOutlined />
            </template>
            Clear
          </a-button>
          <a-button @click="$emit('close')">Cancel</a-button>
        </a-button-group>
      </a-form-item>

      <!-- Error Alert -->
      <a-alert
        v-if="error"
        type="error"
        :message="error"
        closable
        class="mt-4"
        @close="error = null"
      />
    </a-form>
  </a-card>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { message, FormInstance } from 'ant-design-vue';
import { CheckOutlined, ClearOutlined } from '@ant-design/icons-vue';
import dayjs from 'dayjs';
import { post } from '@/api/request';

const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['close', 'success']);

const formRef = ref<FormInstance>();
const isSubmitting = ref(false);
const error = ref<string | null>(null);

// Form model
const form = reactive({
  title: '',
  description: '',
  priority: 'medium',
  dueDate: null,
});

// Form validation rules
const rules = {
  title: [
    { required: true, message: 'Title is required', trigger: 'blur' },
    { min: 3, message: 'Title must be at least 3 characters', trigger: 'blur' },
    { max: 255, message: 'Title must not exceed 255 characters', trigger: 'blur' },
  ],
  description: [
    { required: true, message: 'Description is required', trigger: 'blur' },
    { min: 10, message: 'Description must be at least 10 characters', trigger: 'blur' },
    { max: 5000, message: 'Description must not exceed 5000 characters', trigger: 'blur' },
  ],
  priority: [
    { required: true, message: 'Priority is required', trigger: 'change' },
  ],
};

// Field change handler - could trigger AI auto-categorization, etc.
const onFieldChange = (fieldName: string) => {
  // Can be extended for auto-categorization, priority suggestion, etc.
  console.log(`Field changed: ${fieldName}`);
};

// Submit form
const onSubmit = async () => {
  try {
    isSubmitting.value = true;
    error.value = null;

    // Validate before submit
    await formRef.value?.validateFields();

    // Prepare payload
    const payload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      dueDate: form.dueDate ? form.dueDate.toISOString() : null,
    };

    // Call API (axios interceptor unwraps success:true automatically)
    const result = await post('/api/tickets', payload);

    message.success('Ticket created successfully!');
    emit('success', result);
    emit('close');

    // Reset form after successful submission
    onReset();
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || 'Failed to create ticket';
    error.value = errorMsg;
    message.error(errorMsg);
  } finally {
    isSubmitting.value = false;
  }
};

// Reset form
const onReset = () => {
  formRef.value?.resetFields();
  form.title = '';
  form.description = '';
  form.priority = 'medium';
  form.dueDate = null;
};
</script>

<style scoped>
.ticket-form {
  max-width: 600px;
  margin: 0 auto;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>
```

### 3.2 TicketGrid Component

```vue
<!-- File: frontend/apps/web-lume/src/components/tickets/TicketGrid.vue -->
<template>
  <div class="ticket-grid-container">
    <!-- Header with actions -->
    <div class="grid-header flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold">Support Tickets</h2>
        <p class="text-gray-400 text-sm">{{ pagination.total }} total tickets</p>
      </div>

      <div class="flex gap-2">
        <a-button type="primary" @click="showCreateModal = true">
          <template #icon>
            <PlusOutlined />
          </template>
          New Ticket
        </a-button>
        <a-button @click="onRefresh">
          <template #icon>
            <ReloadOutlined />
          </template>
        </a-button>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="filters-bar mb-4">
      <a-row :gutter="16">
        <a-col :xs="24" :sm="12" :md="6">
          <a-select
            v-model:value="filters.status"
            placeholder="Filter by status"
            allow-clear
            @change="onFilterChange"
            class="w-full"
          >
            <a-select-option value="">All Statuses</a-select-option>
            <a-select-option value="open">Open</a-select-option>
            <a-select-option value="in-progress">In Progress</a-select-option>
            <a-select-option value="resolved">Resolved</a-select-option>
            <a-select-option value="closed">Closed</a-select-option>
          </a-select>
        </a-col>

        <a-col :xs="24" :sm="12" :md="6">
          <a-select
            v-model:value="filters.priority"
            placeholder="Filter by priority"
            allow-clear
            @change="onFilterChange"
            class="w-full"
          >
            <a-select-option value="">All Priorities</a-select-option>
            <a-select-option value="low">Low</a-select-option>
            <a-select-option value="medium">Medium</a-select-option>
            <a-select-option value="high">High</a-select-option>
            <a-select-option value="critical">Critical</a-select-option>
          </a-select>
        </a-col>

        <a-col :xs="24" :sm="12" :md="6">
          <a-input-search
            v-model:value="filters.search"
            placeholder="Search by title..."
            @search="onFilterChange"
            enter-button
          />
        </a-col>

        <a-col :xs="24" :sm="12" :md="6">
          <a-button @click="onClearFilters" block>Clear Filters</a-button>
        </a-col>
      </a-row>
    </div>

    <!-- Data Table -->
    <a-table
      :columns="columns"
      :data-source="tickets"
      :loading="isLoading"
      :pagination="pagination"
      :scroll="{ x: 1200 }"
      size="small"
      row-key="id"
      @change="onTableChange"
    >
      <!-- ID Column -->
      <template #bodyCell-id="{ record }">
        <code class="text-xs">{{ record.id.slice(0, 8) }}...</code>
      </template>

      <!-- Title Column -->
      <template #bodyCell-title="{ record }">
        <a href="javascript:void(0)" @click="onSelectTicket(record)">
          {{ record.title }}
        </a>
      </template>

      <!-- Status Column with Badge -->
      <template #bodyCell-status="{ record }">
        <a-badge
          :status="getStatusBadgeStatus(record.status)"
          :text="formatStatus(record.status)"
        />
      </template>

      <!-- Priority Column with Color -->
      <template #bodyCell-priority="{ record }">
        <a-tag :color="getPriorityColor(record.priority)">
          {{ record.priority.toUpperCase() }}
        </a-tag>
      </template>

      <!-- Assignee Column -->
      <template #bodyCell-assigneeId="{ record }">
        <span v-if="record.assignee">{{ record.assignee.name }}</span>
        <span v-else class="text-gray-400">Unassigned</span>
      </template>

      <!-- Created At Column -->
      <template #bodyCell-createdAt="{ record }">
        <small>{{ formatDate(record.createdAt) }}</small>
      </template>

      <!-- Actions Column -->
      <template #bodyCell-actions="{ record }">
        <a-space>
          <a-button type="link" size="small" @click="onSelectTicket(record)">
            Edit
          </a-button>
          <a-dropdown>
            <template #overlay>
              <a-menu @click="({ key }) => onMenuClick(key, record)">
                <a-menu-item key="assign">
                  <AssignmentOutlined />
                  Assign
                </a-menu-item>
                <a-menu-item key="escalate">
                  <UpOutlined />
                  Escalate
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="delete" danger>
                  <DeleteOutlined />
                  Delete
                </a-menu-item>
              </a-menu>
            </template>
            <a-button type="link" size="small">More</a-button>
          </a-dropdown>
        </a-space>
      </template>
    </a-table>

    <!-- Ticket Detail Modal -->
    <a-modal
      v-model:visible="showDetailModal"
      title="Ticket Details"
      width="800px"
      :footer="null"
      @ok="showDetailModal = false"
    >
      <ticket-detail v-if="selectedTicket" :ticket="selectedTicket" @updated="onTicketUpdated" />
    </a-modal>

    <!-- Create Ticket Modal -->
    <a-modal
      v-model:visible="showCreateModal"
      title="Create New Ticket"
      width="700px"
      :footer="null"
    >
      <ticket-form @success="onTicketCreated" @close="showCreateModal = false" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  AssignmentOutlined,
  UpOutlined,
} from '@ant-design/icons-vue';
import { get, del, put } from '@/api/request';
import TicketForm from './TicketForm.vue';
import TicketDetail from './TicketDetail.vue';
import dayjs from 'dayjs';

// State
const isLoading = ref(false);
const showDetailModal = ref(false);
const showCreateModal = ref(false);
const selectedTicket = ref(null);
const tickets = ref([]);

// Filters
const filters = reactive({
  status: '',
  priority: '',
  search: '',
});

// Pagination
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
});

// Table columns
const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
    key: 'id',
  },
  {
    title: 'Title',
    dataIndex: 'title',
    width: 250,
    key: 'title',
    sorter: true,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    width: 120,
    key: 'status',
    filters: [
      { text: 'Open', value: 'open' },
      { text: 'In Progress', value: 'in-progress' },
      { text: 'Resolved', value: 'resolved' },
      { text: 'Closed', value: 'closed' },
    ],
  },
  {
    title: 'Priority',
    dataIndex: 'priority',
    width: 100,
    key: 'priority',
    filters: [
      { text: 'Low', value: 'low' },
      { text: 'Medium', value: 'medium' },
      { text: 'High', value: 'high' },
      { text: 'Critical', value: 'critical' },
    ],
  },
  {
    title: 'Assigned To',
    dataIndex: 'assigneeId',
    width: 150,
    key: 'assigneeId',
  },
  {
    title: 'Created',
    dataIndex: 'createdAt',
    width: 150,
    key: 'createdAt',
    sorter: true,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    fixed: 'right',
  },
];

// =========================================================================
// Methods
// =========================================================================

const fetchTickets = async () => {
  try {
    isLoading.value = true;

    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
    };

    const response = await get('/api/tickets', { params });

    tickets.value = response.items;
    pagination.total = response.pagination.total;
    pagination.totalPages = response.pagination.totalPages;
  } catch (err: any) {
    message.error('Failed to load tickets');
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const onFilterChange = () => {
  pagination.current = 1; // Reset to first page
  fetchTickets();
};

const onClearFilters = () => {
  filters.status = '';
  filters.priority = '';
  filters.search = '';
  pagination.current = 1;
  fetchTickets();
};

const onTableChange = (pag: any, filters: any, sorter: any) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchTickets();
};

const onRefresh = () => {
  fetchTickets();
};

const onSelectTicket = (ticket: any) => {
  selectedTicket.value = ticket;
  showDetailModal.value = true;
};

const onTicketCreated = (newTicket: any) => {
  message.success('Ticket created successfully');
  fetchTickets();
  showCreateModal.value = false;
};

const onTicketUpdated = (updatedTicket: any) => {
  message.success('Ticket updated successfully');
  fetchTickets();
  showDetailModal.value = false;
};

const onMenuClick = async (key: string, record: any) => {
  switch (key) {
    case 'assign':
      // Open assign modal
      console.log('Assign:', record.id);
      break;
    case 'escalate':
      // Call escalate endpoint
      try {
        await put(`/api/tickets/${record.id}`, {
          escalatedAt: new Date().toISOString(),
        });
        message.success('Ticket escalated');
        fetchTickets();
      } catch (err) {
        message.error('Failed to escalate');
      }
      break;
    case 'delete':
      // Confirm and delete
      if (confirm('Are you sure you want to delete this ticket?')) {
        try {
          await del(`/api/tickets/${record.id}`);
          message.success('Ticket deleted');
          fetchTickets();
        } catch (err) {
          message.error('Failed to delete ticket');
        }
      }
      break;
  }
};

// =========================================================================
// Helpers
// =========================================================================

const getStatusBadgeStatus = (status: string) => {
  const map: { [key: string]: any } = {
    open: 'processing',
    'in-progress': 'processing',
    resolved: 'success',
    closed: 'default',
  };
  return map[status] || 'default';
};

const formatStatus = (status: string) => {
  return status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getPriorityColor = (priority: string) => {
  const map: { [key: string]: string } = {
    low: '#52c41a',
    medium: '#faad14',
    high: '#f5222d',
    critical: '#8B0000',
  };
  return map[priority] || '#1890ff';
};

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format('MMM DD, HH:mm');
};

// =========================================================================
// Lifecycle
// =========================================================================

onMounted(() => {
  fetchTickets();
});
</script>

<style scoped>
.ticket-grid-container {
  padding: 20px;
}

.grid-header {
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.filters-bar {
  background: #fafafa;
  padding: 16px;
  border-radius: 4px;
}
</style>
```

---

## 4. Workflow Definitions

Workflows orchestrate multi-step business processes. Here are two complete workflow definitions that execute when tickets are created or updated.

### 4.1 Auto-Assign Workflow

```typescript
// File: backend/src/modules/support/workflows/auto-assign.workflow.ts
// Triggered when ticket is created: finds available agent and assigns

import { defineWorkflow } from '@/core/workflow/workflow-builder.js';

export const autoAssignWorkflow = defineWorkflow({
  id: 'ticket:auto-assign',
  name: 'Auto-Assign Ticket',
  description: 'Automatically assign ticket to available support agent',
  
  // When should this workflow fire?
  triggers: [
    {
      type: 'entity:created',
      entityName: 'support:ticket',
      condition: {
        // Only auto-assign if no assigneeId provided
        rule: 'field-is-empty',
        field: 'assigneeId',
      },
    },
  ],

  // What steps should we execute?
  steps: [
    // Step 1: Find available agents
    {
      id: 'find-available-agent',
      name: 'Find Available Agent',
      type: 'query',
      config: {
        entity: 'User',
        filter: [
          ['role', '=', 'support-agent'],
          ['status', '=', 'active'],
        ],
        sort: [
          // Sort by: fewest open tickets first, then most recent login
          ['openTicketCount', 'asc'],
          ['lastLogin', 'desc'],
        ],
        limit: 1,
      },
      outputs: {
        agent: '$.data[0]',
      },
    },

    // Step 2: Assign ticket to agent
    {
      id: 'assign-ticket',
      name: 'Assign Ticket to Agent',
      type: 'mutation',
      config: {
        entity: 'support:ticket',
        action: 'update',
        id: '{{ event.data.id }}', // Reference the ticket ID from the event
        data: {
          assigneeId: '{{ steps["find-available-agent"].outputs.agent.id }}',
        },
      },
      outputs: {
        updatedTicket: '$.data',
      },
    },

    // Step 3: Create activity log entry
    {
      id: 'log-assignment',
      name: 'Log Assignment',
      type: 'mutation',
      config: {
        entity: 'Activity',
        action: 'create',
        data: {
          entityType: 'ticket',
          entityId: '{{ event.data.id }}',
          action: 'assigned',
          changes: {
            assigneeId: {
              from: null,
              to: '{{ steps["find-available-agent"].outputs.agent.id }}',
            },
          },
          userId: 'system', // Agent assignment is a system action
          timestamp: '{{ now() }}',
        },
      },
    },
  ],

  // Error handling
  errorHandling: {
    mode: 'continue', // Continue even if a step fails
    onError: [
      {
        step: 'find-available-agent',
        action: 'skip', // Skip step if no agents available
        message: 'No available agents for assignment',
      },
      {
        step: 'assign-ticket',
        action: 'retry', // Retry up to 3 times
        retries: 3,
        backoff: 'exponential',
      },
    ],
  },

  // After all steps complete
  completion: {
    type: 'notify',
    channels: ['email', 'in-app'],
    template: 'ticket-assigned',
    recipients: [
      {
        userId: '{{ steps["find-available-agent"].outputs.agent.id }}',
        channel: 'email',
      },
    ],
  },
});
```

### 4.2 Escalation Workflow

```typescript
// File: backend/src/modules/support/workflows/escalate.workflow.ts
// Triggered on ticket update: checks SLA and escalates if breached

import { defineWorkflow } from '@/core/workflow/workflow-builder.js';

export const escalateWorkflow = defineWorkflow({
  id: 'ticket:escalate',
  name: 'SLA Escalation',
  description: 'Escalate ticket to manager if SLA is breached',
  
  triggers: [
    {
      type: 'entity:updated',
      entityName: 'support:ticket',
      condition: {
        // Only check critical and high-priority tickets
        rule: 'field-in',
        field: 'priority',
        values: ['critical', 'high'],
      },
    },
  ],

  steps: [
    // Step 1: Calculate time elapsed since creation
    {
      id: 'calculate-elapsed-time',
      name: 'Calculate Elapsed Time',
      type: 'compute',
      config: {
        expression: '(now() - event.data.createdAt) / 3600000', // Convert ms to hours
      },
      outputs: {
        elapsedHours: '$.result',
      },
    },

    // Step 2: Determine SLA based on priority
    {
      id: 'determine-sla',
      name: 'Determine SLA',
      type: 'compute',
      config: {
        expression: `
          event.data.priority === 'critical' ? 1 :
          event.data.priority === 'high' ? 4 :
          event.data.priority === 'medium' ? 24 :
          72
        `,
      },
      outputs: {
        slaHours: '$.result',
      },
    },

    // Step 3: Check if SLA is breached
    {
      id: 'check-sla-breach',
      name: 'Check SLA Breach',
      type: 'conditional',
      config: {
        condition: 'steps["calculate-elapsed-time"].outputs.elapsedHours > steps["determine-sla"].outputs.slaHours',
      },
      branches: {
        true: [
          // Branch: SLA is breached - escalate
          {
            id: 'find-manager',
            name: 'Find Available Manager',
            type: 'query',
            config: {
              entity: 'User',
              filter: [
                ['role', '=', 'support-manager'],
                ['status', '=', 'active'],
              ],
              limit: 1,
            },
            outputs: {
              manager: '$.data[0]',
            },
          },
          {
            id: 'escalate-ticket',
            name: 'Escalate Ticket',
            type: 'mutation',
            config: {
              entity: 'support:ticket',
              action: 'update',
              id: '{{ event.data.id }}',
              data: {
                escalatedAt: '{{ now() }}',
                escalatedTo: '{{ steps["find-manager"].outputs.manager.id }}',
              },
            },
            outputs: {
              escalatedTicket: '$.data',
            },
          },
          {
            id: 'notify-manager',
            name: 'Notify Manager',
            type: 'notify',
            config: {
              channels: ['email', 'slack'],
              template: 'ticket-escalated',
              recipients: [
                {
                  userId: '{{ steps["find-manager"].outputs.manager.id }}',
                },
              ],
              data: {
                ticket: '{{ event.data }}',
                elapsedHours: '{{ steps["calculate-elapsed-time"].outputs.elapsedHours }}',
                slaHours: '{{ steps["determine-sla"].outputs.slaHours }}',
              },
            },
          },
        ],
        false: [
          // Branch: SLA not breached - do nothing
          {
            id: 'no-action',
            name: 'No Action Required',
            type: 'noop',
          },
        ],
      },
    },
  ],

  errorHandling: {
    mode: 'continue',
    onError: [
      {
        step: 'find-manager',
        action: 'skip',
        message: 'No available managers for escalation',
      },
    ],
  },
});
```

---

## 5. Agents (Autonomous Event Handlers)

Agents are independent programs that listen to events and take action. Here are three complete agent implementations.

### 5.1 Auto-Assign Agent

```typescript
// File: backend/src/modules/support/agents/auto-assign.agent.ts
// Listens for 'ticket:created' and automatically assigns to available agent

import { agent } from '@/core/agent/agent-builder.js';

export const autoAssignAgent = agent({
  id: 'support:auto-assign-agent',
  name: 'Ticket Auto-Assign Agent',
  description: 'Automatically assign newly created tickets to available support agents',

  // When should this agent fire?
  triggers: [
    {
      eventType: 'entity:created',
      entityName: 'support:ticket',
    },
  ],

  // What should the agent do when triggered?
  async handle(event, context) {
    const { ticketId, priority, createdBy } = event.data;

    try {
      console.log(`[AutoAssignAgent] Processing ticket ${ticketId} created by ${createdBy}`);

      // Step 1: Check if ticket already has assignee
      const ticket = await context.entities.findOne('support:ticket', ticketId);
      if (ticket.assigneeId) {
        console.log(`[AutoAssignAgent] Ticket already assigned to ${ticket.assigneeId}`);
        return { status: 'skipped', reason: 'Already assigned' };
      }

      // Step 2: Find available agents
      const agents = await context.entities.findMany('User', {
        filters: [
          ['role', '=', 'support-agent'],
          ['status', '=', 'active'],
        ],
        sort: [
          ['openTicketCount', 'asc'], // Fewest tickets first
          ['lastLogin', 'desc'], // Then most recently active
        ],
      });

      if (!agents || agents.length === 0) {
        console.log(`[AutoAssignAgent] No available agents for ticket ${ticketId}`);
        return { status: 'failed', reason: 'No available agents' };
      }

      const bestAgent = agents[0];

      // Step 3: Assign ticket to best agent
      const updatedTicket = await context.entities.update('support:ticket', ticketId, {
        assigneeId: bestAgent.id,
      });

      console.log(`[AutoAssignAgent] Assigned ticket ${ticketId} to agent ${bestAgent.id}`);

      // Step 4: Send notification to agent
      await context.notify.email(bestAgent.email, 'ticket-assigned', {
        ticket: updatedTicket,
        agent: bestAgent,
      });

      // Step 5: Log activity
      await context.entities.create('Activity', {
        entityType: 'ticket',
        entityId: ticketId,
        action: 'assigned',
        changes: {
          assigneeId: {
            from: null,
            to: bestAgent.id,
          },
        },
        userId: 'system',
      });

      // Step 6: Confirm event processing (for at-least-once delivery)
      return {
        status: 'success',
        assignedTo: bestAgent.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[AutoAssignAgent] Error processing ticket ${ticketId}:`, error);

      // Return failed status - event will be retried
      return {
        status: 'failed',
        error: error.message,
        ticketId,
      };
    }
  },

  // Idempotency: ensure agent can safely re-run
  idempotencyKey(event) {
    return `auto-assign:${event.data.ticketId}`;
  },

  // Handle failures gracefully
  onFailure(event, error, context) {
    console.error(
      `[AutoAssignAgent] Permanent failure for ticket ${event.data.ticketId}:`,
      error
    );

    // Move to dead-letter queue for manual review
    context.eventBus.emit('agent:failed', {
      agentId: 'support:auto-assign-agent',
      eventId: event.id,
      ticketId: event.data.ticketId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  },
});
```

### 5.2 Escalation Agent

```typescript
// File: backend/src/modules/support/agents/escalation.agent.ts
// Runs periodically or on update: checks SLA and escalates if breached

import { agent } from '@/core/agent/agent-builder.js';

export const escalationAgent = agent({
  id: 'support:escalation-agent',
  name: 'Ticket Escalation Agent',
  description: 'Escalate tickets to manager when SLA is breached',

  // Trigger on ticket update
  triggers: [
    {
      eventType: 'entity:updated',
      entityName: 'support:ticket',
    },
    {
      // Also run periodically (every 15 minutes)
      type: 'schedule',
      cron: '*/15 * * * *', // Every 15 minutes
    },
  ],

  async handle(event, context) {
    console.log(`[EscalationAgent] Checking ticket ${event.data?.ticketId || 'batch'}`);

    try {
      // Determine which tickets to check
      let ticketsToCheck = [];
      
      if (event.type === 'entity:updated' && event.data?.ticketId) {
        // Single ticket from event
        const ticket = await context.entities.findOne('support:ticket', event.data.ticketId);
        ticketsToCheck = [ticket];
      } else {
        // Batch check: find all open high-priority tickets
        ticketsToCheck = await context.entities.findMany('support:ticket', {
          filters: [
            ['status', 'in', ['open', 'in-progress']],
            ['priority', 'in', ['critical', 'high']],
            ['escalatedAt', 'is-null'], // Not yet escalated
          ],
        });
      }

      console.log(`[EscalationAgent] Checking ${ticketsToCheck.length} ticket(s)`);

      const now = new Date();
      const escalatedTickets = [];

      for (const ticket of ticketsToCheck) {
        // Calculate elapsed time since creation
        const createdAt = new Date(ticket.createdAt);
        const elapsedMs = now.getTime() - createdAt.getTime();
        const elapsedHours = elapsedMs / (1000 * 60 * 60);

        // Determine SLA based on priority
        let slaHours;
        switch (ticket.priority) {
          case 'critical':
            slaHours = 1; // 1 hour SLA for critical
            break;
          case 'high':
            slaHours = 4; // 4 hour SLA for high
            break;
          case 'medium':
            slaHours = 24; // 24 hour SLA for medium
            break;
          default:
            slaHours = 72; // 72 hour SLA for low
        }

        // Check if SLA breached
        if (elapsedHours > slaHours) {
          console.log(
            `[EscalationAgent] SLA breached for ticket ${ticket.id}: ${elapsedHours.toFixed(1)}h > ${slaHours}h`
          );

          // Find available manager
          const managers = await context.entities.findMany('User', {
            filters: [
              ['role', '=', 'support-manager'],
              ['status', '=', 'active'],
            ],
            sort: [['openTicketCount', 'asc']],
          });

          if (!managers || managers.length === 0) {
            console.warn(`[EscalationAgent] No available managers to escalate ticket ${ticket.id}`);
            continue;
          }

          const manager = managers[0];

          // Escalate ticket
          const escalatedTicket = await context.entities.update('support:ticket', ticket.id, {
            escalatedAt: new Date().toISOString(),
            escalatedTo: manager.id,
            priority: ticket.priority === 'critical' ? 'critical' : 'critical', // Bump priority
          });

          escalatedTickets.push(escalatedTicket);

          // Notify manager
          await context.notify.email(manager.email, 'ticket-escalated', {
            ticket: escalatedTicket,
            manager,
            breachTime: elapsedHours.toFixed(1),
            slaTime: slaHours,
          });

          // Notify assignee
          if (ticket.assigneeId) {
            const assignee = await context.entities.findOne('User', ticket.assigneeId);
            await context.notify.slack(assignee.slackChannel, {
              text: `Ticket escalated due to SLA breach`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*${ticket.title}* has been escalated to management\nElapsed: ${elapsedHours.toFixed(1)}h (SLA: ${slaHours}h)`,
                  },
                },
              ],
            });
          }

          // Log activity
          await context.entities.create('Activity', {
            entityType: 'ticket',
            entityId: ticket.id,
            action: 'escalated',
            changes: {
              escalatedAt: {
                from: null,
                to: new Date().toISOString(),
              },
              escalatedTo: {
                from: null,
                to: manager.id,
              },
            },
            userId: 'system',
          });
        }
      }

      return {
        status: 'success',
        escalatedCount: escalatedTickets.length,
        escalatedTickets: escalatedTickets.map((t) => t.id),
      };
    } catch (error) {
      console.error(`[EscalationAgent] Error:`, error);

      return {
        status: 'failed',
        error: error.message,
      };
    }
  },

  idempotencyKey(event) {
    if (event.type === 'entity:updated') {
      return `escalate:${event.data.ticketId}`;
    }
    return `escalate:batch:${new Date().getMinutes()}`; // Batch runs grouped by minute
  },

  onFailure(event, error, context) {
    console.error(`[EscalationAgent] Permanent failure:`, error);

    context.eventBus.emit('agent:failed', {
      agentId: 'support:escalation-agent',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  },
});
```

### 5.3 Notification Agent

```typescript
// File: backend/src/modules/support/agents/notification.agent.ts
// Sends email notifications for ticket events

import { agent } from '@/core/agent/agent-builder.js';

export const notificationAgent = agent({
  id: 'support:notification-agent',
  name: 'Ticket Notification Agent',
  description: 'Send email notifications for ticket lifecycle events',

  triggers: [
    { eventType: 'entity:created', entityName: 'support:ticket' },
    { eventType: 'entity:updated', entityName: 'support:ticket' },
  ],

  async handle(event, context) {
    const { ticketId, changes } = event.data;

    try {
      console.log(`[NotificationAgent] Processing ticket event for ${ticketId}`);

      const ticket = await context.entities.findOne('support:ticket', ticketId);
      if (!ticket) {
        console.warn(`[NotificationAgent] Ticket ${ticketId} not found`);
        return { status: 'skipped', reason: 'Ticket not found' };
      }

      // Handle different event types
      if (event.type === 'entity:created') {
        // Notify creator that ticket was created
        const creator = await context.entities.findOne('User', ticket.createdById);

        await context.notify.email(creator.email, 'ticket-created', {
          ticket,
          creator,
          ticketUrl: `${process.env.APP_URL}/tickets/${ticketId}`,
        });

        console.log(`[NotificationAgent] Sent creation confirmation to ${creator.email}`);
      }

      if (event.type === 'entity:updated' && changes) {
        // Notify assignee if assigned
        if (changes.assignee && changes.assignee[1]) {
          const assignee = await context.entities.findOne('User', changes.assignee[1]);

          await context.notify.email(assignee.email, 'ticket-assigned', {
            ticket,
            assignee,
            ticketUrl: `${process.env.APP_URL}/tickets/${ticketId}`,
          });

          console.log(`[NotificationAgent] Sent assignment notification to ${assignee.email}`);
        }

        // Notify creator if status changes
        if (changes.status) {
          const [oldStatus, newStatus] = changes.status;
          const creator = await context.entities.findOne('User', ticket.createdById);

          await context.notify.email(creator.email, 'ticket-status-changed', {
            ticket,
            creator,
            oldStatus,
            newStatus,
            ticketUrl: `${process.env.APP_URL}/tickets/${ticketId}`,
          });

          console.log(`[NotificationAgent] Sent status change notification to ${creator.email}`);
        }

        // Notify assignee if priority escalated
        if (changes.priority && ticket.assigneeId) {
          const [oldPriority, newPriority] = changes.priority;
          const assignee = await context.entities.findOne('User', ticket.assigneeId);

          if (oldPriority !== newPriority) {
            await context.notify.email(assignee.email, 'ticket-priority-changed', {
              ticket,
              assignee,
              oldPriority,
              newPriority,
              ticketUrl: `${process.env.APP_URL}/tickets/${ticketId}`,
            });

            console.log(`[NotificationAgent] Sent priority change notification to ${assignee.email}`);
          }
        }
      }

      return {
        status: 'success',
        ticketId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[NotificationAgent] Error for ticket ${ticketId}:`, error);

      return {
        status: 'failed',
        error: error.message,
        ticketId,
      };
    }
  },

  idempotencyKey(event) {
    return `notify:${event.data.ticketId}:${event.type}`;
  },

  onFailure(event, error, context) {
    // Non-critical failures - log and move on
    console.error(`[NotificationAgent] Notification failed:`, error);
  },
});
```

---

## 6. Permission Configuration (RBAC + ABAC)

Permissions enforce who can do what with tickets at both role and field levels.

### 6.1 Role-Based Access Control (RBAC)

```typescript
// File: backend/src/modules/support/rbac.config.ts

export const ticketRbac = [
  // =========================================================================
  // Customer Role
  // =========================================================================
  {
    role: 'customer',
    permissions: [
      {
        code: 'ticket:create',
        // Customers can create tickets
        effect: 'allow',
      },
      {
        code: 'ticket:read',
        // Customers can only see their own tickets (enforced via ABAC)
        effect: 'allow',
      },
      {
        code: 'ticket:update',
        // Customers can't update (no effect)
        effect: 'deny',
      },
    ],
  },

  // =========================================================================
  // Support Agent Role
  // =========================================================================
  {
    role: 'support-agent',
    permissions: [
      {
        code: 'ticket:create',
        // Agents can create tickets for internal use
        effect: 'allow',
      },
      {
        code: 'ticket:read',
        // Agents can read all tickets
        effect: 'allow',
      },
      {
        code: 'ticket:update',
        // Agents can update tickets
        effect: 'allow',
      },
      {
        code: 'ticket:assign',
        // Agents can only assign to themselves
        effect: 'allow',
        constraints: {
          field: 'assigneeId',
          operator: 'equals',
          value: 'current.user.id',
        },
      },
      {
        code: 'ticket:escalate',
        // Agents can't escalate
        effect: 'deny',
      },
    ],
  },

  // =========================================================================
  // Support Manager Role
  // =========================================================================
  {
    role: 'support-manager',
    permissions: [
      {
        code: 'ticket:create',
        effect: 'allow',
      },
      {
        code: 'ticket:read',
        effect: 'allow',
      },
      {
        code: 'ticket:update',
        effect: 'allow',
      },
      {
        code: 'ticket:assign',
        // Managers can assign to any agent
        effect: 'allow',
      },
      {
        code: 'ticket:escalate',
        // Managers can escalate tickets
        effect: 'allow',
      },
    ],
  },

  // =========================================================================
  // Admin Role
  // =========================================================================
  {
    role: 'admin',
    permissions: [
      {
        code: 'ticket:create',
        effect: 'allow',
      },
      {
        code: 'ticket:read',
        effect: 'allow',
      },
      {
        code: 'ticket:update',
        effect: 'allow',
      },
      {
        code: 'ticket:delete',
        // Only admins can delete
        effect: 'allow',
      },
      {
        code: 'ticket:assign',
        effect: 'allow',
      },
      {
        code: 'ticket:escalate',
        effect: 'allow',
      },
    ],
  },
];
```

### 6.2 Attribute-Based Access Control (ABAC)

```typescript
// File: backend/src/modules/support/abac.config.ts

export const ticketAbac = [
  // =========================================================================
  // Read Rules
  // =========================================================================
  {
    permission: 'ticket:read',
    effect: 'allow',
    conditions: [
      {
        // Admin can read all
        attribute: 'user.role',
        operator: 'in',
        value: ['admin', 'super_admin', 'support-manager'],
      },
      {
        // Support agent can read all
        attribute: 'user.role',
        operator: '=',
        value: 'support-agent',
      },
      {
        // Customer can only read own tickets
        attribute: 'user.role',
        operator: '=',
        value: 'customer',
        rule: 'resource.createdById = user.id',
      },
    ],
  },

  // =========================================================================
  // Update Rules
  // =========================================================================
  {
    permission: 'ticket:update',
    effect: 'allow',
    conditions: [
      {
        // Admin can update all
        attribute: 'user.role',
        operator: 'in',
        value: ['admin', 'super_admin'],
      },
      {
        // Support agent can update
        attribute: 'user.role',
        operator: '=',
        value: 'support-agent',
        rule: 'true', // Can update any ticket
      },
      {
        // Manager can update any ticket
        attribute: 'user.role',
        operator: '=',
        value: 'support-manager',
        rule: 'true',
      },
    ],
  },

  // =========================================================================
  // Assign Rules
  // =========================================================================
  {
    permission: 'ticket:assign',
    effect: 'allow',
    conditions: [
      {
        // Admin can assign to anyone
        attribute: 'user.role',
        operator: 'in',
        value: ['admin', 'super_admin'],
      },
      {
        // Manager can assign to anyone
        attribute: 'user.role',
        operator: '=',
        value: 'support-manager',
      },
      {
        // Support agent can only self-assign
        attribute: 'user.role',
        operator: '=',
        value: 'support-agent',
        rule: 'request.data.assigneeId = user.id',
      },
    ],
  },

  // =========================================================================
  // Field-Level Access
  // =========================================================================
  {
    permission: 'ticket:read',
    resource: 'support:ticket',
    fieldAccess: [
      {
        field: 'createdById',
        effect: 'allow',
        condition: {
          attribute: 'user.role',
          operator: 'in',
          value: ['admin', 'support-manager'],
        },
      },
      {
        field: 'assigneeId',
        effect: 'allow',
        condition: {
          attribute: 'user.role',
          operator: 'in',
          value: ['admin', 'support-manager', 'support-agent'],
        },
      },
      {
        field: 'escalatedTo',
        effect: 'allow',
        condition: {
          attribute: 'user.role',
          operator: 'in',
          value: ['admin', 'support-manager'],
        },
      },
    ],
  },
];
```

---

## 7. Complete End-to-End Execution Walkthrough

This section traces a single user action through the entire system, showing how all components interact.

### Scenario: New Support Ticket (Critical Priority)

**Time:** 2026-04-30 15:30:00 UTC

#### Step 1: User Creates Ticket (HTTP Request)

```http
POST /api/tickets
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "title": "Payment gateway timeout",
  "description": "Customers unable to complete payments during peak hours. Error: 'Connection timeout after 30s'. Affects approximately 15% of transactions.",
  "priority": "critical"
}
```

**User:** jane@customer.com (customer role)

#### Step 2: API Endpoint Receives Request

- Framework decodes JWT token → user = { id: "user-123", email: "jane@customer.com", role: "customer" }
- Extracts POST body
- Routes to `POST /api/tickets` handler (auto-generated by Zero-Code Generation)

#### Step 3: Permission Check (RBAC + ABAC)

```typescript
// RuntimeRegistry.permissions.can('ticket:create', { user })

// Check 1: Role-based (RBAC)
const rbacAllowed = ticketRbac
  .find(r => r.role === 'customer')
  .permissions
  .find(p => p.code === 'ticket:create')
  .effect === 'allow'; // ✓ TRUE - customers can create

// Check 2: Attribute-based (ABAC)
// (No ABAC rules for create, so passes)

// Result: ALLOW ✓
```

#### Step 4: beforeCreate Hook Executes

```typescript
// ticketEntity.hooks.beforeCreate(context)

// 1. Set createdBy
data.createdById = 'user-123';

// 2. Initialize timestamps
data.createdAt = '2026-04-30T15:30:00Z';
data.updatedAt = '2026-04-30T15:30:00Z';

// 3. Set defaults
data.status = 'open';
data.priority = 'critical';

// 4. Calculate SLA due date (critical = 1 hour)
data.dueDate = '2026-04-30T16:30:00Z';
```

#### Step 5: Database Insert

```sql
INSERT INTO support_tickets (
  id, title, description, status, priority,
  assigneeId, createdById, createdAt, updatedAt, resolvedAt, dueDate
) VALUES (
  'ticket-456',
  'Payment gateway timeout',
  'Customers unable to complete payments...',
  'open',
  'critical',
  NULL,
  'user-123',
  '2026-04-30T15:30:00Z',
  '2026-04-30T15:30:00Z',
  NULL,
  '2026-04-30T16:30:00Z'
)

-- Result: 1 row inserted
```

#### Step 6: afterCreate Hook Executes

```typescript
// Emit 'ticket:created' event to event bus
await eventBus.emit('ticket:created', {
  ticketId: 'ticket-456',
  title: 'Payment gateway timeout',
  priority: 'critical',
  createdBy: 'user-123',
});
```

#### Step 7: API Response Sent to Client

```json
{
  "success": true,
  "data": {
    "id": "ticket-456",
    "title": "Payment gateway timeout",
    "description": "Customers unable to complete payments...",
    "status": "open",
    "priority": "critical",
    "assigneeId": null,
    "createdById": "user-123",
    "createdAt": "2026-04-30T15:30:00Z",
    "updatedAt": "2026-04-30T15:30:00Z",
    "resolvedAt": null,
    "dueDate": "2026-04-30T16:30:00Z"
  }
}
```

Status: **201 Created**

#### Step 8: Auto-Assign Agent Triggers

```typescript
// eventBus received 'ticket:created' event
// autoAssignAgent.handle(event, context) is called

// 1. Find available agents
const agents = await context.entities.findMany('User', {
  filters: [
    ['role', '=', 'support-agent'],
    ['status', '=', 'active'],
  ],
  sort: [['openTicketCount', 'asc'], ['lastLogin', 'desc']],
});

// Result:
// Agent 1: alice@support.com (5 open tickets)
// Agent 2: bob@support.com (8 open tickets)
// Choose: alice

// 2. Assign ticket
const updated = await context.entities.update('support:ticket', 'ticket-456', {
  assigneeId: 'agent-alice',
});

console.log('Ticket assigned to Alice');

// 3. Send email to Alice
await context.notify.email('alice@support.com', 'ticket-assigned', {
  ticket: updated,
  agent: alice,
});

// 4. Return success
return {
  status: 'success',
  assignedTo: 'agent-alice',
  timestamp: '2026-04-30T15:30:02Z',
};
```

**Email sent to alice@support.com:**
```
Subject: New Ticket Assigned: Payment gateway timeout

Alice, you have been assigned a new critical ticket:

Title: Payment gateway timeout
Priority: Critical
Due: 2026-04-30 16:30 UTC (1 hour)

Description:
Customers unable to complete payments during peak hours. Error: 'Connection timeout after 30s'. Affects approximately 15% of transactions.

View Ticket: https://app.lume.dev/tickets/ticket-456
```

#### Step 9: Notification Agent Triggers

```typescript
// eventBus received 'entity:created' event
// notificationAgent.handle(event, context) is called

// Send creation confirmation to creator
await context.notify.email('jane@customer.com', 'ticket-created', {
  ticket: ticket,
  creator: jane,
  ticketUrl: 'https://app.lume.dev/tickets/ticket-456',
});

return { status: 'success', ticketId: 'ticket-456' };
```

**Email sent to jane@customer.com:**
```
Subject: Ticket Created: #ticket-456

Jane, your support ticket has been created:

Title: Payment gateway timeout
Priority: Critical
Status: Open
Ticket ID: ticket-456

We're working on it! You'll receive updates as progress is made.

View Ticket: https://app.lume.dev/tickets/ticket-456
```

#### Step 10: View Invalidation

```typescript
// RuntimeRegistry.views.invalidate('support:ticket')
// This triggers UI refresh for all connected clients

// WebSocket broadcast to all clients:
{
  type: 'view:invalidated',
  viewName: 'ticket-grid',
  reason: 'entity:created',
  entityName: 'support:ticket',
  entityId: 'ticket-456',
  timestamp: '2026-04-30T15:30:02Z',
}
```

**Effect:** TicketGrid component on all open clients automatically refreshes to show the new ticket.

#### Step 11: Audit Log Entry

```typescript
// BaseService creates audit log entry automatically
await auditLog.create({
  action: 'CREATE',
  entityType: 'support:ticket',
  entityId: 'ticket-456',
  changes: {
    title: [null, 'Payment gateway timeout'],
    description: [null, '...'],
    status: [null, 'open'],
    priority: [null, 'critical'],
    assigneeId: [null, null],
    createdById: [null, 'user-123'],
  },
  userId: 'user-123',
  timestamp: '2026-04-30T15:30:00Z',
  ipAddress: '203.0.113.45',
});
```

---

### Scenario: Escalation (1 Hour Later)

**Time:** 2026-04-30 16:35:00 UTC (5 minutes past SLA)

#### Step 1: Escalation Agent Fires (Periodic Check)

```typescript
// Agent runs every 15 minutes (cron: */15 * * * *)
// escalationAgent.handle(event, context) is called

// Find all open critical/high tickets without escalation
const ticketsToCheck = await context.entities.findMany('support:ticket', {
  filters: [
    ['status', 'in', ['open', 'in-progress']],
    ['priority', 'in', ['critical', 'high']],
    ['escalatedAt', 'is-null'],
  ],
});

// Result: ticket-456 is returned

// Check SLA for ticket-456
const createdAt = new Date('2026-04-30T15:30:00Z');
const now = new Date('2026-04-30T16:35:00Z');
const elapsedHours = (now - createdAt) / (1000 * 60 * 60); // 1.083 hours
const slaHours = 1; // Critical SLA

if (elapsedHours > slaHours) {
  console.log('SLA breached: 1.083h > 1h');

  // Find available manager
  const managers = await context.entities.findMany('User', {
    filters: [
      ['role', '=', 'support-manager'],
      ['status', '=', 'active'],
    ],
  });

  const manager = managers[0]; // charlie@support.com

  // Escalate ticket
  const escalated = await context.entities.update('support:ticket', 'ticket-456', {
    escalatedAt: '2026-04-30T16:35:00Z',
    escalatedTo: 'manager-charlie',
    priority: 'critical', // Already critical
  });

  // Notify manager
  await context.notify.email('charlie@support.com', 'ticket-escalated', {
    ticket: escalated,
    manager: charlie,
    breachTime: '1.083',
    slaTime: 1,
  });

  // Notify assignee
  const alice = await context.entities.findOne('User', 'agent-alice');
  await context.notify.slack('#alice-notifications', {
    text: 'Ticket escalated due to SLA breach',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Payment gateway timeout* has been escalated to management\nElapsed: 1.083h (SLA: 1h)',
        },
      },
    ],
  });

  return {
    status: 'success',
    escalatedCount: 1,
    escalatedTickets: ['ticket-456'],
  };
}
```

**Email sent to charlie@support.com:**
```
Subject: ESCALATED: Payment gateway timeout (Critical SLA Breach)

Charlie, a critical support ticket has been escalated due to SLA breach:

Title: Payment gateway timeout
Priority: Critical
Status: Open
SLA: 1 hour | Elapsed: 1.083 hours (BREACHED)
Assigned Agent: Alice Johnson

Description:
Customers unable to complete payments during peak hours...

This requires immediate management attention.

View Ticket: https://app.lume.dev/tickets/ticket-456
```

**Slack message to Alice:**
```
[Notification]
Payment gateway timeout has been escalated to management
Elapsed: 1.083h (SLA: 1h)
```

#### Step 2: View Updates

- All clients receive WebSocket notification of escalation
- TicketGrid refreshes to show escalatedTo = "Charlie"
- Ticket row color changes to indicate escalation status

---

## 8. Testing Strategy

Complete testing approach covering unit, integration, and end-to-end scenarios.

### 8.1 Unit Tests

```typescript
// File: backend/tests/unit/ticket-entity.test.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ticketEntity } from '@/modules/support/tickets.entity';

describe('Ticket Entity', () => {
  describe('Field Validation', () => {
    it('should require title with min 3 chars', () => {
      expect(() => {
        ticketEntity.fields.title.validations[0].rule === 'minLength';
      }).toBeTruthy();
    });

    it('should allow status enum values', () => {
      const options = ticketEntity.fields.status.options.map((o) => o.value);
      expect(options).toContain('open');
      expect(options).toContain('in-progress');
      expect(options).toContain('resolved');
      expect(options).toContain('closed');
    });

    it('should have correct permissions defined', () => {
      const permCodes = ticketEntity.permissions.map((p) => p.code);
      expect(permCodes).toContain('ticket:create');
      expect(permCodes).toContain('ticket:read');
      expect(permCodes).toContain('ticket:update');
      expect(permCodes).toContain('ticket:delete');
      expect(permCodes).toContain('ticket:assign');
      expect(permCodes).toContain('ticket:escalate');
    });
  });

  describe('Hooks', () => {
    let mockContext;

    beforeEach(() => {
      mockContext = {
        data: {},
        user: { id: 'user-123', role: 'customer' },
        permissions: {
          can: jest.fn().mockResolvedValue(true),
        },
      };
    });

    it('beforeCreate should set createdById', async () => {
      const result = await ticketEntity.hooks.beforeCreate(mockContext);
      expect(result.createdById).toBe('user-123');
    });

    it('beforeCreate should set timestamps', async () => {
      const result = await ticketEntity.hooks.beforeCreate(mockContext);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('beforeCreate should set critical SLA dueDate', async () => {
      mockContext.data.priority = 'critical';
      const before = new Date();
      const result = await ticketEntity.hooks.beforeCreate(mockContext);
      const dueDate = new Date(result.dueDate);
      const hourLater = new Date(before.getTime() + 60 * 60 * 1000);
      expect(dueDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(dueDate.getTime()).toBeLessThanOrEqual(hourLater.getTime() + 1000);
    });

    it('beforeUpdate should prevent status downgrade', async () => {
      mockContext.previousData = { status: 'in-progress' };
      mockContext.data = { status: 'open' };

      expect(ticketEntity.hooks.beforeUpdate(mockContext)).rejects.toThrow(
        'Cannot move ticket backwards in status'
      );
    });

    it('beforeUpdate should allow status upgrade', async () => {
      mockContext.previousData = { status: 'open' };
      mockContext.data = { status: 'in-progress' };

      expect(() => {
        ticketEntity.hooks.beforeUpdate(mockContext);
      }).not.toThrow();
    });

    it('beforeUpdate should auto-set resolvedAt', async () => {
      mockContext.previousData = { status: 'in-progress' };
      mockContext.data = { status: 'resolved' };

      const result = await ticketEntity.hooks.beforeUpdate(mockContext);
      expect(result.resolvedAt).toBeDefined();
    });
  });
});
```

### 8.2 Integration Tests

```typescript
// File: backend/tests/integration/ticket-workflow.test.ts

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { runtimeRegistry } from '@/core/runtime/registry';
import { testdb } from '@/core/db/test-connection';

describe('Ticket Workflow Integration', () => {
  let ticketId;
  let userId;
  let agentId;

  beforeEach(async () => {
    // Create test user
    userId = await testdb.user.create({
      email: 'customer@test.com',
      role: 'customer',
    });

    // Create test agent
    agentId = await testdb.user.create({
      email: 'agent@test.com',
      role: 'support-agent',
      status: 'active',
      openTicketCount: 2,
    });
  });

  afterEach(async () => {
    await testdb.reset();
  });

  it('should create ticket, trigger auto-assign, and send notifications', async () => {
    // 1. Create ticket
    const createResult = await runtimeRegistry.entities.execute('support:ticket', 'create', {
      title: 'Test Issue',
      description: 'This is a test support ticket',
      priority: 'high',
      createdById: userId,
    });

    ticketId = createResult.data.id;

    expect(createResult.success).toBe(true);
    expect(createResult.data.status).toBe('open');
    expect(createResult.data.priority).toBe('high');

    // 2. Verify auto-assign completed (give agents time to process)
    await new Promise((r) => setTimeout(r, 1000));

    const ticket = await testdb.ticket.findOne(ticketId);
    expect(ticket.assigneeId).toBe(agentId);

    // 3. Verify emails sent
    const emailsSent = await testdb.emailQueue.find({
      recipient: 'agent@test.com',
      template: 'ticket-assigned',
    });

    expect(emailsSent.length).toBeGreaterThan(0);
  });

  it('should escalate ticket after SLA breach', async () => {
    const managerId = await testdb.user.create({
      email: 'manager@test.com',
      role: 'support-manager',
      status: 'active',
    });

    // Create critical ticket
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 61 * 60 * 1000); // 61 minutes ago

    const ticket = await testdb.ticket.create({
      title: 'Critical Issue',
      description: 'Critical issue',
      priority: 'critical',
      status: 'open',
      createdById: userId,
      assigneeId: agentId,
      createdAt: oneHourAgo.toISOString(),
    });

    ticketId = ticket.id;

    // Trigger escalation agent
    await runtimeRegistry.agents.execute('support:escalation-agent', {
      type: 'schedule',
      data: {},
    });

    // Wait for processing
    await new Promise((r) => setTimeout(r, 500));

    // Verify escalation
    const escalated = await testdb.ticket.findOne(ticketId);
    expect(escalated.escalatedAt).toBeDefined();
    expect(escalated.escalatedTo).toBe(managerId);

    // Verify manager notified
    const managerEmails = await testdb.emailQueue.find({
      recipient: 'manager@test.com',
      template: 'ticket-escalated',
    });

    expect(managerEmails.length).toBeGreaterThan(0);
  });

  it('should enforce RBAC permissions', async () => {
    // Customer should be able to create
    const result = await runtimeRegistry.entities.execute(
      'support:ticket',
      'create',
      {
        title: 'Test',
        description: 'Test description',
        priority: 'medium',
      },
      {
        user: { id: userId, role: 'customer' },
      }
    );

    expect(result.success).toBe(true);

    // Customer should not be able to delete
    const deleteResult = await runtimeRegistry.entities.execute(
      'support:ticket',
      'delete',
      { id: result.data.id },
      {
        user: { id: userId, role: 'customer' },
      }
    );

    expect(deleteResult.success).toBe(false);
    expect(deleteResult.error).toContain('Only administrators');
  });
});
```

### 8.3 Agent Tests

```typescript
// File: backend/tests/unit/ticket-agents.test.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { autoAssignAgent } from '@/modules/support/agents/auto-assign.agent';
import { escalationAgent } from '@/modules/support/agents/escalation.agent';

describe('Ticket Agents', () => {
  let mockContext;
  let mockEvent;

  beforeEach(() => {
    mockContext = {
      entities: {
        findOne: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      notify: {
        email: jest.fn(),
        slack: jest.fn(),
      },
      eventBus: {
        emit: jest.fn(),
      },
    };

    mockEvent = {
      id: 'event-123',
      type: 'entity:created',
      entityName: 'support:ticket',
      data: {
        ticketId: 'ticket-456',
        priority: 'critical',
        createdBy: 'user-123',
      },
    };
  });

  describe('AutoAssignAgent', () => {
    it('should find available agent and assign ticket', async () => {
      const ticket = { id: 'ticket-456', assigneeId: null };
      const agent = { id: 'agent-alice', email: 'alice@test.com', name: 'Alice' };

      mockContext.entities.findOne.mockResolvedValue(ticket);
      mockContext.entities.findMany.mockResolvedValue([agent]);
      mockContext.entities.update.mockResolvedValue({ ...ticket, assigneeId: agent.id });

      const result = await autoAssignAgent.handle(mockEvent, mockContext);

      expect(result.status).toBe('success');
      expect(result.assignedTo).toBe('agent-alice');
      expect(mockContext.entities.update).toHaveBeenCalledWith('support:ticket', 'ticket-456', {
        assigneeId: agent.id,
      });
      expect(mockContext.notify.email).toHaveBeenCalled();
    });

    it('should skip if ticket already assigned', async () => {
      const ticket = { id: 'ticket-456', assigneeId: 'agent-bob' };
      mockContext.entities.findOne.mockResolvedValue(ticket);

      const result = await autoAssignAgent.handle(mockEvent, mockContext);

      expect(result.status).toBe('skipped');
      expect(mockContext.entities.update).not.toHaveBeenCalled();
    });

    it('should fail gracefully if no agents available', async () => {
      const ticket = { id: 'ticket-456', assigneeId: null };
      mockContext.entities.findOne.mockResolvedValue(ticket);
      mockContext.entities.findMany.mockResolvedValue([]);

      const result = await autoAssignAgent.handle(mockEvent, mockContext);

      expect(result.status).toBe('failed');
      expect(result.reason).toContain('No available agents');
    });

    it('should generate correct idempotency key', () => {
      const key = autoAssignAgent.idempotencyKey(mockEvent);
      expect(key).toBe('auto-assign:ticket-456');
    });
  });

  describe('EscalationAgent', () => {
    it('should escalate ticket when SLA breached', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 61 * 60 * 1000);

      const ticket = {
        id: 'ticket-456',
        priority: 'critical',
        createdAt: oneHourAgo.toISOString(),
        status: 'open',
        assigneeId: 'agent-alice',
      };

      const manager = { id: 'manager-charlie', email: 'charlie@test.com' };

      mockContext.entities.findMany.mockResolvedValue([ticket]);
      mockContext.entities.findOne.mockResolvedValue(manager);
      mockContext.entities.update.mockResolvedValue({ ...ticket, escalatedAt: now.toISOString() });

      const result = await escalationAgent.handle(mockEvent, mockContext);

      expect(result.status).toBe('success');
      expect(result.escalatedCount).toBe(1);
      expect(mockContext.notify.email).toHaveBeenCalled();
    });

    it('should not escalate if SLA not breached', async () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      const ticket = {
        id: 'ticket-456',
        priority: 'critical',
        createdAt: thirtyMinutesAgo.toISOString(),
        status: 'open',
      };

      mockContext.entities.findMany.mockResolvedValue([ticket]);

      const result = await escalationAgent.handle(mockEvent, mockContext);

      expect(result.escalatedCount).toBe(0);
      expect(mockContext.entities.update).not.toHaveBeenCalled();
    });
  });
});
```

### 8.4 Permission Tests

```typescript
// File: backend/tests/unit/ticket-permissions.test.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { permissionEngine } from '@/core/permissions/engine';
import { ticketRbac } from '@/modules/support/rbac.config';
import { ticketAbac } from '@/modules/support/abac.config';

describe('Ticket Permissions', () => {
  describe('RBAC', () => {
    it('customer can create tickets', () => {
      const customer = { role: 'customer' };
      const perms = ticketRbac.find((r) => r.role === 'customer').permissions;
      const canCreate = perms.find((p) => p.code === 'ticket:create').effect === 'allow';

      expect(canCreate).toBe(true);
    });

    it('customer cannot delete tickets', () => {
      const perms = ticketRbac.find((r) => r.role === 'customer').permissions;
      const canDelete = perms.find((p) => p.code === 'ticket:delete')?.effect === 'allow' ?? false;

      expect(canDelete).toBe(false);
    });

    it('support-agent can read and update', () => {
      const perms = ticketRbac.find((r) => r.role === 'support-agent').permissions;

      const canRead = perms.find((p) => p.code === 'ticket:read').effect === 'allow';
      const canUpdate = perms.find((p) => p.code === 'ticket:update').effect === 'allow';

      expect(canRead).toBe(true);
      expect(canUpdate).toBe(true);
    });

    it('admin can do everything', () => {
      const perms = ticketRbac.find((r) => r.role === 'admin').permissions;
      const codes = perms.map((p) => p.code);

      expect(codes).toContain('ticket:create');
      expect(codes).toContain('ticket:read');
      expect(codes).toContain('ticket:update');
      expect(codes).toContain('ticket:delete');
    });
  });

  describe('ABAC', () => {
    it('customer can only read own tickets', async () => {
      const rule = ticketAbac
        .find((r) => r.permission === 'ticket:read')
        .conditions.find((c) => c.attribute === 'user.role' && c.value === 'customer').rule;

      expect(rule).toContain('resource.createdById = user.id');
    });

    it('support-agent can read all tickets', () => {
      const rule = ticketAbac
        .find((r) => r.permission === 'ticket:read')
        .conditions.find((c) => c.value === 'support-agent').rule;

      expect(rule).toBe('true');
    });

    it('support-agent can only self-assign', () => {
      const rule = ticketAbac
        .find((r) => r.permission === 'ticket:assign')
        .conditions.find((c) => c.value === 'support-agent').rule;

      expect(rule).toContain('request.data.assigneeId = user.id');
    });
  });
});
```

---

## Conclusion

This end-to-end example demonstrates the complete Lume Unified Runtime in action:

1. **Entity Definition** — Single source of truth for ticket structure, validation, and hooks
2. **Zero-Code Generation** — Automatic REST API, forms, tables, and workflows
3. **Workflows** — Multi-step orchestration (auto-assign, escalation)
4. **Agents** — Autonomous event handlers (auto-assign, escalation, notification)
5. **Permissions** — Role-based + field-level access control (RBAC + ABAC)
6. **Frontend** — Vue 3 components consuming generated APIs
7. **Testing** — Comprehensive unit, integration, and end-to-end tests

Every component integrates seamlessly. From a single entity definition, the system generates working APIs, UI, workflows, and agents—with zero hand-coded CRUD logic, zero API routing boilerplate, and zero frontend form-building code.

The ticket management system goes from idea to production-ready in hours, not weeks.

---

## Appendix: File Structure

```
backend/src/modules/support/
├── __manifest__.js                    # Module registration
├── tickets.entity.ts                  # Entity definition (10 fields, 6 permissions)
├── rbac.config.ts                     # Role-based access (4 roles)
├── abac.config.ts                     # Attribute-based rules (field-level)
├── workflows/
│   ├── auto-assign.workflow.ts        # Find agent + assign + notify
│   └── escalate.workflow.ts           # Check SLA + escalate to manager
├── agents/
│   ├── auto-assign.agent.ts           # React to creation, assign
│   ├── escalation.agent.ts            # React to update, check SLA, escalate
│   └── notification.agent.ts          # Send email notifications
├── views/
│   ├── ticket-grid.view.js            # Table with filtering + sorting
│   └── ticket-form.view.js            # Form for create/edit
└── static/
    ├── views/
    │   ├── TicketGrid.vue             # Frontend grid component
    │   └── TicketForm.vue             # Frontend form component
    └── api/
        └── ticket-api.ts              # Frontend API client

frontend/apps/web-lume/
├── src/
│   ├── components/
│   │   └── tickets/
│   │       ├── TicketForm.vue         # Create/edit form
│   │       ├── TicketGrid.vue         # List view
│   │       └── TicketDetail.vue       # Detail view
│   ├── api/
│   │   └── request.ts                 # Axios config
│   └── router/
│       └── index.ts                   # Route definitions

backend/tests/
├── unit/
│   ├── ticket-entity.test.ts          # Field validation, hooks
│   └── ticket-agents.test.ts          # Agent logic
└── integration/
    └── ticket-workflow.test.ts        # Full flow: create → assign → escalate
```
