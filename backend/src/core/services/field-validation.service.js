export function parseRules(field) {
  const raw = field?.validation;
  if (!raw) {
    return [];
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function applyRules(field, value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const label = field.label || field.name;
  for (const rule of parseRules(field)) {
    if (!rule || typeof rule.type !== 'string') {
      continue;
    }
    switch (rule.type) {
      case 'regex': {
        let re;
        try {
          re = new RegExp(rule.pattern);
        } catch {
          return `${label} has an invalid validation pattern`;
        }
        if (!re.test(String(value))) {
          return rule.message || `${label} has an invalid format`;
        }
        break;
      }
      case 'minLength':
        if (String(value).length < Number(rule.value)) {
          return rule.message || `${label} must be at least ${rule.value} characters`;
        }
        break;
      case 'maxLength':
        if (String(value).length > Number(rule.value)) {
          return rule.message || `${label} must be at most ${rule.value} characters`;
        }
        break;
      case 'min':
        if (Number(value) < Number(rule.value) || !Number.isFinite(Number(value))) {
          return rule.message || `${label} must be at least ${rule.value}`;
        }
        break;
      case 'max':
        if (Number(value) > Number(rule.value) || !Number.isFinite(Number(value))) {
          return rule.message || `${label} must be at most ${rule.value}`;
        }
        break;
      default:
        break;
    }
  }
  return null;
}

export function requiresUnique(field) {
  if (field?.unique) {
    return true;
  }
  return parseRules(field).some((r) => r && r.type === 'unique');
}

function recordValue(record, fieldName) {
  const data = typeof record?.data === 'string' ? safeParse(record.data) : record?.data || {};
  return data[fieldName];
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function findUniqueConflict(findRecords, entityId, field, value, excludeId = null) {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  const records = await findRecords(entityId);
  return (records || []).some((r) => {
    if (excludeId !== null && Number(r.id) === Number(excludeId)) {
      return false;
    }
    if (r.deletedAt) {
      return false;
    }
    return recordValue(r, field.name) === value;
  });
}

export default { parseRules, applyRules, requiresUnique, findUniqueConflict };
