import { BadRequestException } from '@nestjs/common';

const unsafe = new Set(['__proto__', 'constructor', 'prototype']);
const operators = new Set(['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$contains']);
const object = (value: any) => value !== null && typeof value === 'object' && !Array.isArray(value);
const scalar = (value: any) => value === null || ['string', 'boolean'].includes(typeof value) || (typeof value === 'number' && Number.isFinite(value));

export function businessRuleWrites(dto: any, create = false): Record<string, any> {
  const allowed = new Set(['name', 'description', 'priority', 'status', 'condition', 'action', ...(create ? ['model', 'field'] : [])]);
  const entries = Object.entries(dto).filter(([, value]) => value !== undefined);
  for (const [key, value] of entries) {
    if (!allowed.has(key) || value === null && key !== 'description') throw new BadRequestException(`Invalid rule property: ${key}`);
  }
  return Object.fromEntries(entries);
}

/** Validate the representation actually consumed by BusinessRuleEngineService. */
export function validateBusinessRule(rule: any) {
  const fail = (message: string): never => { throw new BadRequestException(message); };
  for (const key of ['name', 'model', 'field']) {
    if (typeof rule[key] !== 'string' || !rule[key].trim() || rule[key].length > 100 || unsafe.has(rule[key])) fail(`Invalid rule ${key}`);
  }
  if (!['active', 'inactive'].includes(rule.status ?? 'active')) fail('Invalid rule status');
  if (!Number.isInteger(rule.priority ?? 10) || (rule.priority ?? 10) < 0) fail('Rule priority must be a nonnegative integer');
  const condition = rule.condition ?? {};
  if (!object(condition) || Object.keys(condition).length > 100) fail('Rule condition must be an object with at most 100 fields');
  for (const [field, value] of Object.entries(condition)) {
    if (!field.trim() || unsafe.has(field)) fail('Invalid condition field');
    if (scalar(value)) continue;
    if (!object(value) || !Object.keys(value).length) fail('Invalid condition value');
    for (const [operator, operand] of Object.entries(value)) {
      if (!operators.has(operator)) fail(`Unsupported condition operator: ${operator}`);
      if (['$in', '$nin'].includes(operator)) {
        if (!Array.isArray(operand) || operand.length > 1000 || !operand.every(scalar)) fail('Membership conditions require an array of scalar values');
      } else if (!scalar(operand)) fail('Condition operator requires a scalar value');
    }
  }
  const action = rule.action;
  if (!object(action)) fail('Rule action must be an object');
  const type = action.type || action.actionType;
  if (type === 'set_field') {
    if (typeof action.fieldName !== 'string' || !action.fieldName.trim() || unsafe.has(action.fieldName) || action.fieldName !== rule.field || action.value === undefined) fail('Field action must target the rule field and include a value');
  } else if (type === 'send_notification') {
    if (!Number.isSafeInteger(Number(action.recipientId)) || Number(action.recipientId) < 1 || typeof action.message !== 'string' || !action.message.trim()) fail('Notification action requires recipient and message');
  } else if (type === 'call_webhook') {
    if (typeof action.webhookUrl !== 'string' || !/^https?:\/\//.test(action.webhookUrl)) fail('Webhook action requires an HTTP URL');
  } else fail('Unsupported business rule action');
}
