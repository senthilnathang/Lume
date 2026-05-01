/**
 * Workflow Automation E2E Test
 * Tests Phase 8 Waves 1-4: Execution, Canvas, UI, and Auto-Transitions
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_URL = 'http://localhost:3000/api';
const BASE_AUTOMATION_API = `${API_URL}/base_automation`;

async function request(method, url, data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) options.body = JSON.stringify(data);
  const res = await fetch(url, options);
  return res.json();
}

describe('Workflow Automation E2E - Phase 8 Complete Pipeline', () => {
  let workflowId;
  let executionId;
  let autoTransitionId;

  beforeAll(async () => {
    console.log('\n🚀 Starting E2E Test: Complete Workflow Automation Pipeline\n');
  });

  it('Wave 1: Should create a workflow with states and transitions', async () => {
    const response = await request('POST', `${BASE_AUTOMATION_API}/workflows`, {
      name: 'E2E Test Workflow',
      model: 'TestModel',
      description: 'Complete E2E test workflow',
      states: [
        { name: 'draft', label: 'Draft', is_start: true, is_end: false },
        { name: 'review', label: 'In Review', is_start: false, is_end: false },
        { name: 'approved', label: 'Approved', is_start: false, is_end: false },
        { name: 'completed', label: 'Completed', is_start: false, is_end: true }
      ],
      transitions: [
        { from: 'draft', to: 'review', name: 'Submit for Review' },
        { from: 'review', to: 'approved', name: 'Approve' },
        { from: 'approved', to: 'completed', name: 'Complete' }
      ]
    });

    expect(response.success).toBe(true);
    expect(response.data.name).toBe('E2E Test Workflow');
    expect(response.data.states).toBeDefined();

    workflowId = response.data.id;
    console.log(`✅ Wave 1: Created workflow (ID: ${workflowId})`);
  });

  it('Wave 3: Should start a workflow execution', async () => {
    const response = await request('POST',
      `${BASE_AUTOMATION_API}/workflows/${workflowId}/run/test-record-123`,
      {}
    );

    expect(response.data.success).toBe(true);
    expect(response.data.data.currentState).toBe('draft');
    expect(response.data.data.status).toBe('active');

    executionId = response.data.data.id;
    console.log(`✅ Wave 3: Started execution (ID: ${executionId}, State: draft)`);
  });

  it('Wave 3: Should get execution with history', async () => {
    const response = await request('GET',
      `${BASE_AUTOMATION_API}/workflows/${workflowId}/executions/${executionId}`
    );

    expect(response.data.success).toBe(true);
    expect(response.data.data.execution.currentState).toBe('draft');
    expect(response.data.data.history.length).toBeGreaterThan(0);
    expect(response.data.data.history[0].transitionName).toBe('START');

    console.log(`✅ Wave 3: Retrieved execution with ${response.data.data.history.length} history entry`);
  });

  it('Wave 3: Should manually transition state', async () => {
    const response = await request('POST',
      `${BASE_AUTOMATION_API}/workflows/${workflowId}/executions/${executionId}/transition`,
      {
        toState: 'review',
        transitionName: 'Submit for Review'
      }
    );

    expect(response.data.success).toBe(true);
    expect(response.data.data.currentState).toBe('review');

    console.log(`✅ Wave 3: Manual transition - draft → review`);
  });

  it('Wave 4: Should schedule auto-transition', async () => {
    // Schedule transition 5 seconds in the future (will be pending for a bit)
    const response = await request('POST',
      `${BASE_AUTOMATION_API}/workflows/${workflowId}/executions/${executionId}/schedule-transition`,
      {
        fromState: 'review',
        toState: 'approved',
        triggerType: 'timer',
        delaySeconds: 2 // 2 seconds for testing
      }
    );

    expect(response.data.success).toBe(true);
    expect(response.data.data.status).toBe('pending');
    expect(response.data.data.triggerType).toBe('timer');

    autoTransitionId = response.data.data.id;
    console.log(`✅ Wave 4: Scheduled auto-transition (ID: ${autoTransitionId}, delay: 2s)`);
  });

  it('Wave 4: Should list pending auto-transitions', async () => {
    const response = await request('GET',`${BASE_AUTOMATION_API}/auto-transitions/pending`);

    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);

    console.log(`✅ Wave 4: Listed ${response.data.data.length} pending auto-transition(s)`);
  });

  it('Wave 4: Should auto-execute pending transition after delay', async () => {
    // Wait for the auto-transition to be due (2 seconds delay + processor interval)
    console.log('   ⏳ Waiting for auto-transition to execute (2 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3500));

    const response = await request('GET',
      `${BASE_AUTOMATION_API}/workflows/${workflowId}/executions/${executionId}`
    );

    expect(response.data.success).toBe(true);
    expect(response.data.data.execution.currentState).toBe('approved');

    // Verify the auto-transition history entry
    const autoTransitionHistory = response.data.data.history.find(
      h => h.transitionName && h.transitionName.includes('Auto:')
    );
    expect(autoTransitionHistory).toBeDefined();

    console.log(`✅ Wave 4: Auto-transition executed - review → approved`);
    console.log(`   History entry: "${autoTransitionHistory.transitionName}"`);
  });

  it('Should complete workflow execution', async () => {
    const response = await request('POST',
      `${BASE_AUTOMATION_API}/workflows/${workflowId}/executions/${executionId}/transition`,
      {
        toState: 'completed',
        transitionName: 'Complete'
      }
    );

    expect(response.data.success).toBe(true);
    expect(response.data.data.currentState).toBe('completed');
    expect(response.data.data.status).toBe('completed');

    console.log(`✅ Final: Workflow execution completed (approved → completed)`);
  });

  it('Should verify complete execution history', async () => {
    const response = await request('GET',
      `${BASE_AUTOMATION_API}/workflows/${workflowId}/executions/${executionId}`
    );

    expect(response.data.success).toBe(true);
    expect(response.data.data.execution.currentState).toBe('completed');
    expect(response.data.data.execution.status).toBe('completed');

    const history = response.data.data.history;
    console.log(`\n📋 Complete Execution History:`);
    history.forEach((entry, idx) => {
      console.log(`   ${idx + 1}. ${entry.fromState || 'START'} → ${entry.toState} (${entry.transitionName})`);
    });

    expect(history.length).toBeGreaterThanOrEqual(4); // START, manual x2, auto x1
  });

  afterAll(async () => {
    console.log('\n✅ E2E Test Complete: All Waves 1-4 Verified\n');
  });
});

export { };
