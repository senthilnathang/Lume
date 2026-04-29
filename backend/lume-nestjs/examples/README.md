# Lume Framework - Example Applications

This directory contains complete, production-ready example modules demonstrating the Lume metadata-driven framework capabilities.

## Overview

Each example module showcases:
- Declarative entity definitions with computed fields
- Entity lifecycle hooks (beforeCreate, afterCreate, beforeUpdate)
- Automated workflows with conditional branching
- ABAC+RBAC access control policies
- Multiple view types (table, kanban, dashboard)
- AI-native metadata for entity descriptions
- Field indexing for optimized queries
- Event-driven workflows and notifications

## Example Modules

### 1. CRM Module (`crm-module.example.ts`)

A complete Customer Relationship Management system demonstrating sales operations.

**Entities:**
- **Lead** - Prospective customers with contact info, qualification score, assignment tracking
  - Computed fields: fullName, qualificationScore
  - Hooks: auto-assignment, event emission, status change tracking
  
- **Contact** - Individual decision makers at customer accounts
  - Tracks department, reporting structure, decision-making role
  
- **Opportunity** - Sales deals with stage, probability, financial tracking
  - Computed fields: expectedRevenue, daysToClose

**Workflows:**
- `lead-assignment` - Auto-assign new leads to available sales reps
- `lead-scoring` - Update lead score based on status, create opportunities
- `opportunity-nurturing` - Scheduled follow-up reminders for deals

**Policies:**
- `lead-viewer-policy` - Sales reps see only assigned leads
- `lead-owner-write-policy` - Can only edit own assigned leads
- `admin-all-access` - Admin/super_admin bypass restrictions

**Views:**
- **Leads Table** - Sortable, filterable leads list (default)
- **Leads Kanban** - Pipeline view with status columns
- **Opportunities Dashboard** - Sales metrics and trends

**Use Cases:**
- Track lead lifecycle from prospect → qualified → converted
- Assign leads to sales reps with round-robin distribution
- Monitor sales pipeline and deal probability
- Automated lead scoring and opportunity creation

---

### 2. E-Commerce Module (`ecommerce-module.example.ts`)

A complete online store with inventory, orders, and fulfillment.

**Entities:**
- **Product** - Sellable catalog items with pricing and stock
  - Fields: SKU, pricing, cost, inventory, ratings
  - Computed: availableQuantity, marginPercentage, isLowStock
  - Sensitive fields: cost (hidden from customers)
  
- **Order** - Customer orders with items and fulfillment status
  - Tracks payment, shipping, delivery
  - Computed: daysOld, isOverdue, itemCount
  - Hooks: auto-generate order number, emit events

**Workflows:**
- `order-confirmation` - Payment verification → confirm order → reserve inventory
- `inventory-management` - Monitor stock levels → trigger reorders
- `shipping-notification` - Send tracking updates → customer notifications

**Policies:**
- `customer-product-view` - See only active products in stock
- `customer-order-view` - Customers see only their own orders
- `admin-inventory-edit` - Admins and inventory managers update stock

**Views:**
- **Products Storefront** - Product grid with ratings, prices, stock status
- **Orders Admin** - Management interface for order processing
- **Orders Dashboard** - Revenue trends, order status distribution

**Use Cases:**
- Sell products with inventory tracking
- Process orders with payment and fulfillment workflows
- Send shipping notifications with tracking
- Prevent overselling with stock reservation
- Low-stock alerts and reorder creation

---

### 3. Project Management Module (`project-management-module.example.ts`)

A comprehensive project management and team collaboration system.

**Entities:**
- **Project** - Container for tasks with team, budget, timeline
  - Fields: status, PM, team members, budget tracking
  - Computed: isOverBudget, remainingBudget, daysRemaining, isLate
  - Hooks: auto-include PM in team members
  
- **Task** - Individual work items with assignment and tracking
  - Fields: status, assignee, due date, estimation, blocking
  - Computed: isOverdue, hoursVariance, percentComplete
  - Hooks: auto-set completedAt, emit task.completed event
  
- **TimeEntry** - Work hour logging with project/task association
  - Tracks who worked on what, when, for how long
  - Computed: billableAmount ($150/hr default)

**Workflows:**
- `task-status-update` - Notifications on status changes (started, done, blocked)
- `project-completion-check` - Auto-mark project done when all tasks complete
- `task-due-soon-reminder` - Daily scheduled reminders for upcoming deadlines

**Policies:**
- `project-member-view` - Team members see tasks in their projects
- `task-owner-edit` - Assignees can update their own tasks
- `project-manager-access` - Managers have full control of project tasks

**Views:**
- **Projects List** - Table with status, manager, budget, due date
- **Tasks Kanban** - Board with todo/in-progress/review/done columns
- **Tasks List** - Detailed table with hours and assignment tracking
- **Project Dashboard** - Active projects count, budget totals, status breakdown

**Use Cases:**
- Organize work into projects with teams
- Track task status with kanban board
- Manage budgets and spending per project
- Log work hours for billing/reporting
- Send deadline reminders
- Auto-complete projects when work finishes

---

## Usage Guide

### How to Load an Example Module

In your application initialization code:

```typescript
import { CRMModule } from '@examples/crm-module.example';
import { ModuleLoaderService } from '@core/module/module-loader.service';

// In your app bootstrap or module onModuleInit:
export class AppModule implements OnModuleInit {
  constructor(private moduleLoader: ModuleLoaderService) {}

  async onModuleInit() {
    // Register the CRM module
    await this.moduleLoader.loadModule(CRMModule);
    
    // All entities, workflows, policies, and views are now available
  }
}
```

### Accessing Example Entities

Once loaded, use the framework APIs:

```typescript
// Create a lead
const lead = await recordService.create('Lead', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  company: 'Acme Inc',
});

// Query leads using QueryBuilder
const myLeads = await queryBuilder
  .query('Lead')
  .filter('owner', '==', userId)
  .filter('status', '!=', 'closed')
  .orderBy('createdAt', 'desc')
  .paginate(1, 25)
  .execute();

// Update a lead (triggers hooks and workflows)
await recordService.update('Lead', lead.id, {
  status: 'qualified',
});
```

### Frontend Access

Views are exposed via the ViewRouter component:

```vue
<template>
  <ViewRouter 
    entityName="Lead" 
    viewName="leads-kanban"
    :filters="{ owner: currentUserId }"
  />
</template>
```

---

## Framework Features Demonstrated

### 1. Declarative Entity Definitions

Entities are defined using `defineEntity()` with TypeScript type safety:

```typescript
export const LeadEntity = defineEntity('Lead', {
  name: 'Lead',
  fields: { /* field definitions */ },
  computed: { /* derived fields */ },
  hooks: { /* lifecycle events */ },
  aiMetadata: { /* AI context */ },
});
```

### 2. Computed Fields

Fields automatically calculated from other fields:

```typescript
computed: {
  fullName: {
    formula: "CONCAT(firstName, ' ', lastName)",
    type: 'string',
    label: 'Full Name',
  },
  expectedRevenue: {
    formula: 'amount * (probability / 100)',
    type: 'decimal',
    label: 'Expected Revenue',
  },
}
```

### 3. Entity Lifecycle Hooks

Code runs at key points in entity operations:

```typescript
hooks: {
  beforeCreate: async (data, ctx) => {
    // Validate, transform, or auto-populate data
    return data;
  },
  afterCreate: async (record, ctx) => {
    // Emit events, send notifications
    await ctx.eventBus.emit({ type: 'record.created' });
  },
}
```

### 4. Automated Workflows

Event-driven automation with conditional logic:

```typescript
const MyWorkflow = defineWorkflow({
  name: 'my-workflow',
  entity: 'Lead',
  trigger: { type: 'record.created' },
  steps: [
    {
      type: 'condition',
      if: { field: 'status', operator: '==', value: 'qualified' },
      then: [
        { type: 'set_field', field: 'leadScore', value: 100 },
        { type: 'send_notification', to: '$owner', template: 'lead_qualified' },
      ],
    },
  ],
});
```

### 5. ABAC+RBAC Policies

Unified access control with conditions and roles:

```typescript
const LeadOwnerPolicy = definePolicy({
  name: 'lead-owner-policy',
  entity: 'Lead',
  actions: ['read', 'write'],
  conditions: [
    { field: 'owner', operator: '==', value: '$userId' },
  ],
  roles: ['sales_rep'],
  deny: false,
});
```

### 6. Multiple View Types

Different UI presentations for the same entity:

```typescript
// Table view - traditional list
defineView({ name: 'leads-table', type: 'table' });

// Kanban view - drag-drop columns
defineView({ name: 'leads-kanban', type: 'kanban' });

// Dashboard - metrics and charts
defineView({ name: 'leads-dashboard', type: 'dashboard' });

// Form view - detail editing
defineView({ name: 'lead-form', type: 'form' });
```

### 7. AI-Native Metadata

Entity descriptions for AI context:

```typescript
aiMetadata: {
  description: 'Sales opportunities with financial value and timeline',
  sensitiveFields: ['email', 'phone'],
  summarizeWith: 'Summarize as: [Company] - $[amount] ([stage])',
}
```

Enables natural language queries like:
> "Show me all high-value opportunities due this month"

### 8. Field Indexing

Mark fields for optimized QueryBuilder filtering:

```typescript
fields: {
  owner: { name: 'owner', type: 'int', isIndexed: true },
  status: { name: 'status', type: 'string', isIndexed: true },
}
```

Indexed fields are stored in `entity_record_search_index` table for fast filtering.

---

## Extending Example Modules

Each module is a starting point. Extend them by:

### Adding New Entities

```typescript
import { LeadEntity } from '@examples/crm-module.example';
import { extendEntity } from '@core/entity/extend-entity';

// Add custom fields without modifying original
extendEntity('Lead', {
  fields: {
    customField: { name: 'customField', type: 'string' },
  },
});
```

### Adding Workflows

```typescript
const CustomLeadWorkflow = defineWorkflow({
  name: 'custom-lead-process',
  entity: 'Lead',
  trigger: { type: 'field_changed', field: 'customField' },
  steps: [ /* your steps */ ],
});
```

### Adding Policies

```typescript
const CustomLeadPolicy = definePolicy({
  name: 'custom-lead-access',
  entity: 'Lead',
  actions: ['read'],
  conditions: [ /* your conditions */ ],
  roles: ['custom_role'],
});
```

---

## Testing Example Modules

### Unit Tests

```typescript
import { CRMModule } from '@examples/crm-module.example';

describe('CRM Module', () => {
  it('should register Lead entity', () => {
    const entity = metadataRegistry.getEntity('Lead');
    expect(entity).toBeDefined();
    expect(entity.fields).toHaveProperty('firstName');
  });

  it('should calculate fullName computed field', () => {
    const lead = { firstName: 'John', lastName: 'Doe' };
    // Computed fields evaluated at query time
  });
});
```

### Integration Tests

See `test/integration/framework-integration.test.ts` for comprehensive examples.

---

## Performance Considerations

### Computed Fields
- Evaluated at query time, not stored
- Use indexed fields for WHERE clauses
- Avoid complex formulas in heavily-filtered queries

### Workflows
- Asynchronous execution, don't block API response
- Max 50 steps per workflow to prevent infinite loops
- Scheduled workflows run in background jobs (BullMQ)

### Policies
- Cached after first evaluation
- Evaluated per request for context-aware decisions
- Keep condition lists short (< 5 conditions optimal)

### Views
- Pagination recommended for large datasets (25-50 rows/page)
- Filters applied server-side
- Search indexes used automatically for indexed fields

---

## Real-World Scenarios

### Scenario 1: Lead-to-Opportunity Conversion

1. Lead created (trigger: `lead-assignment` workflow)
2. Sales rep contacts lead (manual status update)
3. Lead marked "qualified" (trigger: `lead-scoring` workflow)
4. Opportunity automatically created in sales pipeline
5. Dashboard updates show new opportunity in forecast

### Scenario 2: Order Processing Pipeline

1. Customer places order (trigger: `order-confirmation` workflow)
2. Payment validation & stock reservation
3. Shipment created, tracking email sent
4. Inventory updated and low-stock alert checked
5. Daily dashboard shows daily revenue trend

### Scenario 3: Project Team Coordination

1. Project created with team members
2. Tasks added to project kanban board
3. Team member starts task (trigger: `task-status-update` workflow)
4. Notifications sent on status changes
5. Scheduled workflow sends daily deadline reminders
6. Project auto-completes when all tasks done

---

## Next Steps

1. **Customize:** Copy an example, rename entities/fields to match your domain
2. **Integrate:** Register module in app.module.ts during bootstrap
3. **Scale:** Add more entities, workflows, and policies as needed
4. **Deploy:** Migrations run automatically on app startup
5. **Monitor:** Dashboard widgets track key metrics

---

## Resources

- [API Documentation](../docs/API.md)
- [Architecture Guide](../docs/ARCHITECTURE.md)
- [Development Guide](../docs/DEVELOPMENT.md)
- [Migration Guide](../migrations/README.md)
