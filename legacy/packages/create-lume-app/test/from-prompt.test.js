import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrompt } from '../src/from-prompt.js';
import { planModule, buildModuleFiles } from '../src/generate.js';

describe('from-prompt (Build Agent flow)', () => {
  it('detects the ATS template from hiring language', () => {
    const parsed = parsePrompt('recruitment pipeline with candidates, interview stages and ratings');
    assert.equal(parsed.template, 'ats');
    assert.ok(parsed.fieldSpecs.includes('email:email'));
    assert.ok(parsed.fieldSpecs.includes('rating:number'));
    assert.ok(parsed.fieldSpecs.some((s) => s.startsWith('status:select')));
  });

  it('detects helpdesk from support language', () => {
    const parsed = parsePrompt('support ticket tracker with priority and SLA');
    assert.equal(parsed.template, 'helpdesk');
  });

  it('uses quoted phrases as the module name', () => {
    const parsed = parsePrompt('build "Vendor Onboarding" with email and deadline');
    assert.equal(parsed.name, 'Vendor Onboarding');
    assert.ok(parsed.fieldSpecs.includes('email:email'));
    assert.ok(parsed.fieldSpecs.includes('due_date:date'));
  });

  it('derives a slug name without quotes or template', () => {
    const parsed = parsePrompt('make a simple asset tracker with serial numbers');
    assert.equal(parsed.template, null);
    assert.ok(parsed.name.length > 2);
  });

  it('produces a scaffoldable plan end to end', () => {
    const parsed = parsePrompt('sales pipeline with amounts and close dates');
    const plan = planModule({ name: parsed.name, fieldSpecs: parsed.fieldSpecs, template: parsed.template });
    const files = buildModuleFiles(plan);
    assert.ok(files['models/schema.js'].includes('amount'));
    assert.ok(files['static/views/list.vue'].length > 100);
  });
});
