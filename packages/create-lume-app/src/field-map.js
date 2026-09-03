const DRIZZLE = {
  text: (col) => `varchar('${col}', { length: 255 })`,
  textarea: (col) => `text('${col}')`,
  number: (col) => `idCol('${col}')`,
  currency: (col) => `idCol('${col}')`,
  email: (col) => `varchar('${col}', { length: 255 })`,
  phone: (col) => `varchar('${col}', { length: 50 })`,
  url: (col) => `varchar('${col}', { length: 500 })`,
  date: (col) => `timestamp('${col}')`,
  datetime: (col) => `timestamp('${col}')`,
  boolean: (col) => `boolean('${col}').default(false)`,
  select: (col) => `varchar('${col}', { length: 100 })`,
  color: (col) => `varchar('${col}', { length: 20 })`,
  file: (col) => `varchar('${col}', { length: 500 })`,
  lookup: (col) => `idCol('${col}')`,
};

const FORM_INPUT = {
  textarea: 'textarea',
  number: 'number',
  currency: 'number',
  email: 'email',
  date: 'date',
  datetime: 'datetime',
  boolean: 'checkbox',
  select: 'select',
  url: 'url',
};

export function slugify(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function parseFields(specs) {
  const fallback = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'select', options: ['new', 'active', 'done'] },
  ];
  if (!specs || !specs.length) {
    return fallback;
  }
  return specs.map((spec) => {
    const [rawName, rawType] = String(spec).split(':');
    const name = slugify(rawName) || 'field';
    const type = Object.keys(DRIZZLE).includes((rawType || 'text').toLowerCase())
      ? rawType.toLowerCase()
      : 'text';
    const label = rawName.trim().replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const field = { name, label, type };
    if (type === 'select') {
      field.options = ['new', 'active', 'done'];
    }
    return field;
  });
}

export function drizzleColumn(field) {
  const col = field.name.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  const make = DRIZZLE[field.type] || DRIZZLE.text;
  let snippet = `  ${field.name}: ${make(col)}`;
  if (field.required) {
    snippet += '.notNull()';
  }
  if (field.type === 'select' && field.options) {
    snippet += `.default('${field.options[0]}')`;
  }
  return snippet + ',';
}

export function formInputType(field) {
  return FORM_INPUT[field.type] || 'text';
}
