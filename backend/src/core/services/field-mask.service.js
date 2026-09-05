const MASK_CHAR = '•';

export function maskValue(value, preserveLast = 4) {
  if (value === null || value === undefined || value === '') {
    return value;
  }
  const keep = Math.max(0, Math.min(10, Math.trunc(preserveLast) || 0));
  const text = String(value);
  if (keep <= 0 || keep >= text.length) {
    return keep <= 0 ? MASK_CHAR.repeat(Math.min(text.length, 8)) : text;
  }
  return MASK_CHAR.repeat(text.length - keep) + text.slice(-keep);
}

export function parseMaskRule(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (parsed.mode !== 'mask') {
      return null;
    }
    const preserveLast = Number(parsed.preserveLast ?? 4);
    return { mode: 'mask', preserveLast: Number.isFinite(preserveLast) ? Math.max(0, Math.min(10, Math.trunc(preserveLast))) : 4 };
  } catch {
    return null;
  }
}

export async function getFieldMask(prisma, fieldId, roleId) {
  if (!prisma || !prisma.setting || !fieldId || !roleId) {
    return null;
  }
  try {
    const row = await prisma.setting.findFirst({ where: { key: `fieldmask.${fieldId}.${roleId}` } });
    return parseMaskRule(row?.value);
  } catch {
    return null;
  }
}

export default { maskValue, parseMaskRule, getFieldMask };
