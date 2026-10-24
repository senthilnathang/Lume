const TEMPLATES = {
  'crm-pipeline': {
    label: 'Deal Pipeline',
    description: 'Sales pipeline with stages, amounts, and expected close dates',
    fields: [
      'title:text',
      'amount:currency',
      'stage:select:new|qualified|proposal|negotiation|won|lost',
      'close_date:date',
      'contact:lookup',
    ],
  },
  ats: {
    label: 'Applicant Tracking',
    description: 'Recruitment pipeline with candidate profiles and stages',
    fields: [
      'candidate:fullname',
      'email:email',
      'phone:phone',
      'stage:select:applied|screening|interview|offer|hired|rejected',
      'rating:number',
    ],
  },
  helpdesk: {
    label: 'Helpdesk',
    description: 'Support tickets with priority, status, and due dates',
    fields: [
      'title:text',
      'priority:select:low|medium|high|urgent',
      'status:select:new|open|pending|resolved|closed',
      'due_date:date',
      'description:textarea',
    ],
  },
};

export function listTemplates() {
  return Object.entries(TEMPLATES).map(([name, t]) => ({
    name,
    label: t.label,
    description: t.description,
    fields: [...t.fields],
  }));
}

export function getTemplate(name) {
  const key = String(name || '').toLowerCase();
  return TEMPLATES[key] || null;
}

export default { listTemplates, getTemplate };
