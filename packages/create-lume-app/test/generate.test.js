import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { planModule, buildModuleFiles, writeModule } from '../src/generate.js';
import { listTemplates, getTemplate } from '../src/templates.js';

describe('create-lume-app', () => {
  it('plans technical names, titles, and fields', () => {
    const plan = planModule({ name: 'Research Grants', fieldSpecs: ['title:text', 'amount:currency'] });
    assert.equal(plan.technicalName, 'research_grants');
    assert.equal(plan.title, 'Research Grants');
    assert.deepEqual(plan.fields.map((f) => f.type), ['text', 'currency']);
  });

  it('falls back to a default field set', () => {
    const plan = planModule({ name: 'things' });
    assert.ok(plan.fields.length >= 2);
  });

  it('rejects empty names', () => {
    assert.throws(() => planModule({ name: '!!!' }), /letters or numbers/);
  });

  it('lists three template packs', () => {
    const names = listTemplates().map((t) => t.name).sort();
    assert.deepEqual(names, ['ats', 'crm-pipeline', 'helpdesk']);
  });

  it('scaffolds from a template with staged options', () => {
    const plan = planModule({ name: 'deals', template: 'crm-pipeline' });
    assert.equal(plan.title, 'Deal Pipeline');
    const stage = plan.fields.find((f) => f.name === 'stage');
    assert.deepEqual(stage.options, ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']);
    assert.throws(() => planModule({ name: 'x', template: 'nope' }), /Unknown template/);
  });

  it('parses inline select options from field specs', () => {
    const plan = planModule({ name: 't', fieldSpecs: ['priority:select:low|high'] });
    assert.deepEqual(plan.fields[0].options, ['low', 'high']);
    assert.equal(getTemplate('ATS').label, 'Applicant Tracking');
  });

  it('writes a complete module that imports cleanly', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lume-module-'));
    const plan = planModule({ name: 'grants', label: 'Grants', fieldSpecs: ['title:text', 'amount:currency'] });
    const files = buildModuleFiles(plan);
    const written = writeModule(join(dir, plan.technicalName), files);
    assert.ok(written.length >= 10);
    for (const rel of ['__manifest__.js', 'index.js', 'models/schema.js', 'api/routes.js', 'static/views/list.vue']) {
      assert.ok(existsSync(join(dir, plan.technicalName, rel)), rel);
    }
    const manifest = await import(pathToFileURL(join(dir, plan.technicalName, '__manifest__.js')).href);
    assert.equal(manifest.default.technicalName, 'grants');
    const schema = readFileSync(join(dir, plan.technicalName, 'models/schema.js'), 'utf8');
    assert.match(schema, /table\('grants'/);
    assert.match(schema, /amount/);
  });
});
