const BLOCKS = [
  { type: 'text', label: 'Text', targets: ['form', 'record', 'app'], formFactors: ['desktop', 'phone'], description: 'Single-line text input', props: [{ name: 'label', type: 'String', title: 'Label' }, { name: 'required', type: 'Boolean', title: 'Required', default: false }] },
  { type: 'number', label: 'Number', targets: ['form', 'record', 'app'], formFactors: ['desktop', 'phone'], description: 'Numeric input', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'email', label: 'Email', targets: ['form', 'record', 'app'], formFactors: ['desktop', 'phone'], description: 'Email input with validation', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'phone', label: 'Phone', targets: ['form', 'record', 'app'], formFactors: ['desktop', 'phone'], description: 'Phone input', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'date', label: 'Date', targets: ['form', 'record', 'app'], formFactors: ['desktop', 'phone'], description: 'Date picker', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'datetime', label: 'DateTime', targets: ['form', 'record', 'app'], formFactors: ['desktop', 'phone'], description: 'Date + time picker', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'textarea', label: 'Textarea', targets: ['form', 'record'], formFactors: ['desktop', 'phone'], description: 'Multi-line text', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'select', label: 'Select', targets: ['form', 'record', 'app'], formFactors: ['desktop', 'phone'], description: 'Dropdown from select options', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'boolean', label: 'Boolean', targets: ['form', 'record', 'app'], formFactors: ['desktop', 'phone'], description: 'Checkbox / switch', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'url', label: 'URL', targets: ['form', 'record', 'app'], formFactors: ['desktop', 'phone'], description: 'URL input', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'color', label: 'Color', targets: ['form'], formFactors: ['desktop'], description: 'Color picker (desktop only)', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'currency', label: 'Currency', targets: ['form', 'record', 'app'], formFactors: ['desktop', 'phone'], description: 'Money input with amount', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'address', label: 'Address', targets: ['form', 'record'], formFactors: ['desktop', 'phone'], description: 'Composite street/city/country input', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'fullname', label: 'Full Name', targets: ['form', 'record'], formFactors: ['desktop', 'phone'], description: 'Composite first/last name input', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'file', label: 'File', targets: ['form', 'record'], formFactors: ['desktop', 'phone'], description: 'File attachment (URL or upload)', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'signature', label: 'Signature', targets: ['form', 'record'], formFactors: ['desktop', 'phone'], description: 'Signature pad (data-URL)', props: [{ name: 'label', type: 'String', title: 'Label' }] },
  { type: 'lookup', label: 'Lookup', targets: ['form', 'record'], formFactors: ['desktop', 'phone'], description: 'Reference to another record', props: [{ name: 'entity', type: 'String', title: 'Target entity', required: true }] },
  { type: 'master-detail', label: 'Master Detail', targets: ['form', 'record'], formFactors: ['desktop', 'phone'], description: 'Owned child reference — deleted with its master', props: [{ name: 'entity', type: 'String', title: 'Master entity', required: true }] },
  { type: 'related-list', label: 'Related List', targets: ['record', 'app'], formFactors: ['desktop', 'phone'], description: 'Filtered child records on a record page', props: [{ name: 'model', type: 'String', title: 'Related model', required: true }, { name: 'filterField', type: 'String', title: 'Filter field' }] },
  { type: 'highlights', label: 'Highlights Panel', targets: ['record'], formFactors: ['desktop', 'phone'], description: 'Key fields strip at top of record page', props: [{ name: 'fields', type: 'String', title: 'Comma-separated field names' }] },
  { type: 'path', label: 'Path', targets: ['record'], formFactors: ['desktop'], description: 'Stage path (e.g. pipeline) for record page', props: [{ name: 'field', type: 'String', title: 'Stage field', required: true }] },
];

export function getBlocksFor(target = 'form', formFactor = 'desktop') {
  return BLOCKS.filter((b) => b.targets.includes(target) && b.formFactors.includes(formFactor));
}

export function getBlock(type) {
  return BLOCKS.find((b) => b.type === type) || null;
}

export default { BLOCKS, getBlocksFor, getBlock };
