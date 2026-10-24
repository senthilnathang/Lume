import { getTemplate } from './templates.js';

const TEMPLATE_HINTS = [
  { template: 'crm-pipeline', words: ['pipeline', 'sales', 'deal', 'crm', 'lead', 'opportunit', 'revenue', 'quota'] },
  { template: 'ats', words: ['recruit', 'hiring', 'candidate', 'applicant', 'interview', 'talent', 'onboard', 'ats'] },
  { template: 'helpdesk', words: ['ticket', 'support', 'helpdesk', 'incident', 'bug', 'issue', 'sla', 'help-desk'] },
];

const FIELD_HINTS = [
  { match: ['email', 'e-mail', 'mail address'], field: 'email:email' },
  { match: ['phone', 'mobile', 'telephone'], field: 'phone:phone' },
  { match: ['deadline', 'due date', 'due_date', 'close date', 'close_date'], field: 'due_date:date' },
  { match: ['birth', 'birthday', 'dob'], field: 'birth_date:date' },
  { match: ['amount', 'price', 'budget', 'cost', 'revenue', 'salary'], field: 'amount:currency' },
  { match: ['rating', 'score', 'grade'], field: 'rating:number' },
  { match: ['website', 'url', 'link'], field: 'website:url' },
  { match: ['address', 'location', 'city'], field: 'address:address' },
  { match: ['avatar', 'photo', 'picture', 'attachment', 'file'], field: 'attachment:file' },
];

const STATUS_WORDS = ['status', 'stage', 'state', 'phase', 'step'];
const NAME_STOPWORDS = new Set(['a', 'an', 'the', 'new', 'simple', 'basic', 'custom', 'my', 'our']);

export function parsePrompt(prompt) {
  const text = String(prompt || '').toLowerCase();
  const template = detectTemplate(text);
  const fields = detectFields(text, template);
  const name = detectName(String(prompt || ''), template);
  return { name, template, fieldSpecs: fields };
}

function detectTemplate(text) {
  let best = null;
  let bestScore = 0;
  for (const { template, words } of TEMPLATE_HINTS) {
    const score = words.filter((w) => text.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = template;
    }
  }
  return bestScore > 0 ? best : null;
}

function detectFields(text, template) {
  const specs = [];
  const seen = new Set();
  const push = (spec) => {
    const key = spec.split(':')[0];
    if (!seen.has(key)) {
      seen.add(key);
      specs.push(spec);
    }
  };
  push('title:text');
  for (const { match, field } of FIELD_HINTS) {
    if (match.some((w) => text.includes(w))) {
      push(field);
    }
  }
  if (STATUS_WORDS.some((w) => text.includes(w)) || template) {
    push('status:select:new|active|done');
  }
  if (template) {
    const pack = getTemplate(template);
    for (const spec of pack?.fields || []) {
      if (spec.split(':')[0] === 'title' || spec.split(':')[0] === 'status') {
        continue;
      }
      push(spec);
    }
  }
  return specs;
}

function detectName(prompt, template) {
  const quoted = prompt.match(/["']([^"']{2,40})["']/);
  if (quoted) {
    return quoted[1];
  }
  const head = prompt.split(/ with | that | for | to manage | to track /i)[0] || '';
  const words = head
    .replace(/^(create|build|make|scaffold|generate|new|add)\b/i, '')
    .replace(/(app|application|module|system|tool|tracker|manager)\b/gi, '')
    .split(/[^a-zA-Z]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 2 && !NAME_STOPWORDS.has(w));
  if (words.length) {
    return words.slice(0, 3).join('-');
  }
  if (template) {
    return template;
  }
  return 'custom-app';
}

export default { parsePrompt };
