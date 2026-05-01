# Phase 8: Visual Workflow Designer Implementation Plan

**Status**: Planning  
**Estimated Duration**: 6 days  
**Target Completion**: May 7, 2026

---

## Overview

Phase 8 builds a no-code visual workflow designer that allows users to create complex automation workflows through a drag-drop canvas interface. Users design workflows (states + transitions), configure timers and webhooks, then execute them on records with automatic state transitions.

## Architecture

```
User Design Workflow
    ↓
Canvas (VueFlow) with States + Transitions
    ↓
Save to Database (WorkflowExecution, WorkflowExecutionHistory)
    ↓
Backend Scheduler executes timers & webhooks
    ↓
Automatic state transitions with audit trail
```

---

## Phase 8 Deliverables

### Wave 1: Frontend Canvas (Days 1-2)

#### New Components to Create

1. **WorkflowDesigner.vue** (main page - `backend/src/modules/base_automation/static/views/workflow-designer.vue`)
   - 3-panel layout: left (metadata/stats), center (canvas), right (properties)
   - VueFlow canvas with states + transitions
   - Top toolbar: Save, Run, AutoLayout buttons
   - Modes: design mode vs. run mode

2. **WorkflowStateNode.vue** (custom VueFlow node)
   - Display state name + icon based on state type
   - Handle positions for connector routing
   - Visual styling: start (green), regular (blue), end (red)
   - Double-click to edit properties

3. **WorkflowTransitionEdge.vue** (custom VueFlow edge)
   - Bezier curve with arrow
   - Optional inline label showing condition
   - Right-click to edit properties

4. **StatePropertiesPanel.vue** (right-side drawer)
   - State name, description
   - State type selector: regular, start, end
   - Visibility toggle (show/hide state fields)

5. **TransitionPropertiesPanel.vue** (right-side drawer with tabs)
   - Basic: name, condition expression
   - Approval: approval chain, amount conditions
   - Timer: hours (0-999), business_hours checkbox
   - Webhook: URL, method, headers, payload template

#### New Composables

- **useWorkflowDesigner.ts**
  - State: nodes[], edges[], selectedNodeId, selectedEdgeId
  - Methods: addState, removeState, addTransition, updateStatePosition, saveWorkflow, validateWorkflow

- **useWorkflowCanvas.ts** (extensions)
  - Helpers: statesToNodes(), transitionsToEdges(), nodesToStates(), edgesToTransitions()

### Wave 2: Property Panels (Days 2-3)

- Complete StatePropertiesPanel.vue
- Complete TransitionPropertiesPanel.vue with all tabs
- Form validation and error handling
- Save individual property changes

### Wave 3: Save & Validate (Day 3)

- Implement `saveWorkflow()` — POST /api/base_automation/workflows/{id}/save
- Implement `validateWorkflow()` — check for:
  - Exactly one start state
  - All states reachable from start
  - No orphaned states
  - Valid transition definitions
- Error notifications for validation failures

### Wave 4: Execution UI (Day 4)

- Create **WorkflowExecutionView.vue** (show execution state)
  - Current state display
  - Available transitions (buttons)
  - Execution history (last 10 transitions)
  - Loading state during transition

### Wave 5: Backend API (Days 4-5)

#### Database Schema Updates

**WorkflowExecution** table:
```
id (uuid)
workflow_id (fk)
record_id (uuid, nullable)
current_state (string)
status (enum: active, completed, rejected, aborted)
started_at (timestamp)
completed_at (timestamp)
execution_data (jsonb)
```

**WorkflowExecutionHistory** table:
```
id (uuid)
execution_id (fk)
from_state (string)
to_state (string)
transition_name (string)
transitioned_at (timestamp)
user_id (fk, nullable - null = auto/timer)
metadata (jsonb)
```

#### API Endpoints

All under `/api/base_automation/workflows/`:

- `GET /workflows/{id}` — fetch workflow + states + transitions + positions
- `POST /workflows/{id}/save` — save workflow structure + positions
- `POST /workflows/{id}/validate` — check for errors
- `POST /workflows/{id}/run/{record_id}` — trigger execution on record
- `GET /workflows/{id}/executions/{execution_id}` — fetch execution history
- `POST /workflows/{id}/executions/{execution_id}/transition` — manual transition
- `POST /workflows/{id}/executions/{execution_id}/approve` — approve pending transition

### Wave 6: Scheduler Integration (Day 5)

- Timer job queue handler
- Every 5 minutes: check ready workflow timers
- Business hours calculation
- Automatic transition execution

### Wave 7: Testing & Polish (Day 6)

- E2E tests: design → save → run → transition → complete
- Canvas performance with 50+ states
- Accessibility: keyboard shortcuts
- Undo/redo (nice-to-have)

---

## Implementation Checklist

### Day 1: Canvas Foundation

- [ ] Create WorkflowDesigner.vue with 3-panel layout
- [ ] Create WorkflowStateNode.vue component
- [ ] Create WorkflowTransitionEdge.vue component
- [ ] Create useWorkflowDesigner composable
- [ ] Wire VueFlow instance with custom nodes/edges
- [ ] Implement add/remove state operations
- [ ] Implement add/remove transition operations
- [ ] Test canvas interaction (drag, connect, select)

### Day 2: UI Polish + Property Panels

- [ ] Complete StatePropertiesPanel.vue
- [ ] Complete TransitionPropertiesPanel.vue with tabs
- [ ] Wire panels to selected state/transition
- [ ] Implement property editing + save
- [ ] Add validation feedback
- [ ] Test panel interactions

### Day 3: Persistence

- [ ] Create database migrations for WorkflowExecution + WorkflowExecutionHistory
- [ ] Implement WorkflowService.saveWorkflow()
- [ ] Implement WorkflowService.validateWorkflow()
- [ ] Implement POST /workflows/{id}/save endpoint
- [ ] Implement POST /workflows/{id}/validate endpoint
- [ ] Test save and validate flows

### Day 4: Execution

- [ ] Create WorkflowExecutionView.vue
- [ ] Implement POST /workflows/{id}/run/{record_id} endpoint
- [ ] Implement transition button + confirmation modal
- [ ] Implement POST /workflows/{id}/executions/{execution_id}/transition endpoint
- [ ] Add execution history display
- [ ] Test execution flow (manual transitions)

### Day 5: Background Jobs

- [ ] Implement job queue handler for timers
- [ ] Implement job queue handler for webhooks
- [ ] Create scheduler job: check_workflow_timers (every 5 min)
- [ ] Implement business hours calculation
- [ ] Test timer-based transitions
- [ ] Test webhook calls

### Day 6: Testing + Polish

- [ ] Write E2E tests
- [ ] Performance testing (50+ states)
- [ ] Accessibility review
- [ ] Bug fixes
- [ ] Documentation

---

## Technical Decisions

### Canvas Library
- **VueFlow** (already installed)
- Custom node types: `workflowState`, `workflowStart`, `workflowEnd`, `workflowDecision`
- Custom edge type: `workflowTransition`

### Timer Execution
- Store as scheduled jobs in `job_queue` table
- Scheduler checks every 5 minutes
- Audit trail in WorkflowExecutionHistory

### Webhook Execution
- Async job queue with 3 retries
- 30-second timeout per call
- Response captured in execution metadata

---

## File Structure

```
backend/src/modules/base_automation/
├── static/views/
│   ├── workflow-designer.vue (COMPLETE)
│   ├── workflow-execution.vue (NEW)
│   └── workflow-history.vue (NEW)
├── static/api/
│   └── workflow-client.ts (NEW - API calls)
├── services/
│   └── workflow.service.js (ENHANCE)
├── models/
│   ├── workflow-execution.js (NEW)
│   └── workflow-execution-history.js (NEW)
└── api/
    └── workflow.routes.js (ENHANCE)

frontend/lume-admin/src/
├── components/
│   └── module/
│       ├── WorkflowStateNode.vue (NEW)
│       ├── WorkflowTransitionEdge.vue (NEW)
│       ├── StatePropertiesPanel.vue (NEW)
│       └── TransitionPropertiesPanel.vue (NEW)
└── composables/
    ├── useWorkflowDesigner.ts (NEW)
    └── useWorkflowCanvas.ts (ENHANCE)
```

---

## Success Criteria

- ✅ Workflow designer canvas renders with VueFlow
- ✅ Can create/delete states and transitions
- ✅ Can configure state/transition properties
- ✅ Workflows save to database
- ✅ Workflow validation prevents invalid designs
- ✅ Workflows execute on records
- ✅ Manual transitions work with confirmation
- ✅ Timer transitions execute automatically
- ✅ Webhooks fire on transitions
- ✅ Execution history captured
- ✅ 50+ states canvas runs smoothly
- ✅ E2E tests all pass

---

## Dependencies

- **Frontend**: VueFlow (already installed), Ant Design Vue (already installed)
- **Backend**: Job Queue system (from Phase 5), Scheduler (from Phase 5)
- **Database**: New tables for WorkflowExecution + WorkflowExecutionHistory

---

## Next Steps

1. Review Phase 7 completion (✅ done)
2. Begin Phase 8 Wave 1: Frontend canvas
3. Iterate through waves 1-7
4. Complete Phase 8 testing + verification
5. Move to Phase 9: Entity Inheritance

---

**Status**: Ready to begin  
**Phase 7 Status**: ✅ Complete  
**Backend Services**: ✅ Running  
**Frontend**: ✅ Running
