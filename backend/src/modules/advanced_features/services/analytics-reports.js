import { DrizzleAdapter } from '../../../core/db/adapters/drizzle-adapter.js';
import { analyticsReports } from '../models/schema.js';

const REPORT_TYPES = ['tabular', 'summary', 'chart'];
const FILTER_OPS = ['equals', 'not_equals', 'contains', 'startsWith', 'gt', 'gte', 'lt', 'lte', 'is_set', 'is_empty'];
const AGGREGATES = ['count', 'sum', 'avg', 'min', 'max'];

function asObject(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

function matchFilter(data, filter) {
  const raw = data?.[filter.field];
  const value = filter.value;
  switch (filter.operator || 'equals') {
    case 'equals': return raw === value || String(raw ?? '') === String(value ?? '');
    case 'not_equals': return !(raw === value || String(raw ?? '') === String(value ?? ''));
    case 'contains': return String(raw ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'startsWith': return String(raw ?? '').toLowerCase().startsWith(String(value ?? '').toLowerCase());
    case 'gt': return Number(raw) > Number(value);
    case 'gte': return Number(raw) >= Number(value);
    case 'lt': return Number(raw) < Number(value);
    case 'lte': return Number(raw) <= Number(value);
    case 'is_set': return raw !== null && raw !== undefined && raw !== '';
    case 'is_empty': return raw === null || raw === undefined || raw === '';
    default: return true;
  }
}

function aggregate(rows, field, fn) {
  if (fn === 'count') {
    return rows.length;
  }
  const nums = rows.map((r) => Number(r[field])).filter((n) => Number.isFinite(n));
  if (!nums.length) {
    return fn === 'count' ? 0 : null;
  }
  switch (fn) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    default: return null;
  }
}

export class AnalyticsReportService {
  constructor(prisma) {
    this.prisma = prisma;
    this.adapter = new DrizzleAdapter(analyticsReports);
  }

  validateDefinition(input) {
    const errors = {};
    if (!input.name) {
      errors.name = 'Name is required';
    }
    if (!input.code) {
      errors.code = 'Code is required';
    }
    if (!input.baseEntity && !input.base_entity) {
      errors.baseEntity = 'Base entity is required';
    }
    const reportType = input.reportType || input.report_type || 'tabular';
    if (!REPORT_TYPES.includes(reportType)) {
      errors.reportType = `Must be one of: ${REPORT_TYPES.join(', ')}`;
    }
    const query = asObject(input.queryConfig ?? input.query_config);
    for (const filter of asArray(query.filters)) {
      if (!filter.field) {
        errors.filters = 'Each filter needs a field';
      } else if (filter.operator && !FILTER_OPS.includes(filter.operator)) {
        errors.filters = `Unknown operator: ${filter.operator}`;
      }
    }
    const grouping = asObject(input.groupingConfig ?? input.grouping_config);
    for (const agg of asArray(grouping.aggregates)) {
      if (!AGGREGATES.includes(agg.fn)) {
        errors.aggregates = `Unknown aggregate: ${agg.fn}`;
      }
    }
    return errors;
  }

  normalize(input) {
    const query = asObject(input.queryConfig ?? input.query_config);
    const grouping = asObject(input.groupingConfig ?? input.grouping_config);
    return {
      name: input.name,
      code: input.code,
      description: input.description || null,
      reportType: input.reportType || input.report_type || 'tabular',
      baseEntity: input.baseEntity || input.base_entity,
      visibility: input.visibility || 'company',
      status: input.status || 'active',
      queryConfig: query,
      groupingConfig: grouping,
    };
  }

  async create(input) {
    const errors = this.validateDefinition(input);
    if (Object.keys(errors).length) {
      const error = new Error('Report validation failed');
      error.errors = errors;
      throw error;
    }
    return this.adapter.create(this.normalize(input));
  }

  async update(id, input) {
    const errors = this.validateDefinition({ ...(await this.get(id)), ...input });
    if (Object.keys(errors).length) {
      const error = new Error('Report validation failed');
      error.errors = errors;
      throw error;
    }
    const current = await this.adapter.findById(id);
    if (!current) {
      return null;
    }
    return this.adapter.update(id, this.normalize({ ...current, ...input }));
  }

  get(id) {
    return this.adapter.findById(id);
  }

  list(options = {}) {
    return this.adapter.findAll({
      limit: options.limit || 20,
      offset: options.offset || 0,
      order: [['createdAt', 'DESC']],
    });
  }

  async remove(id) {
    const existing = await this.adapter.findById(id);
    if (!existing) {
      return null;
    }
    await this.adapter.destroy(id);
    return existing;
  }

  async run(id, context = {}) {
    const report = await this.adapter.findById(id);
    if (!report) {
      return null;
    }
    const query = asObject(report.queryConfig);
    const grouping = asObject(report.groupingConfig);
    const entity = await this.prisma.entity.findFirst({
      where: { name: report.baseEntity },
    });
    if (!entity) {
      const error = new Error(`Base entity not found: ${report.baseEntity}`);
      error.code = 'ENTITY_NOT_FOUND';
      throw error;
    }
    const records = await this.prisma.entityRecord.findMany({
      where: { entityId: entity.id, companyId: context.companyId, deletedAt: null },
    });
    const visible = (records || []).filter((r) => {
      if (context.isPrivileged) {
        return true;
      }
      if (r.visibility && r.visibility !== 'private') {
        return true;
      }
      return context.userId !== undefined && Number(r.createdBy) === Number(context.userId);
    });
    const rows = visible.map((r) => {
      let data = {};
      try {
        data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data || {};
      } catch {
        data = {};
      }
      return { id: r.id, ...data };
    }).filter((row) => asArray(query.filters).every((f) => matchFilter(row, f)));

    const fieldSpecs = asArray(query.fields);
    const project = (row) => {
      if (!fieldSpecs.length) {
        return row;
      }
      const out = { id: row.id };
      for (const spec of fieldSpecs) {
        const name = typeof spec === 'string' ? spec : spec.field;
        const label = typeof spec === 'string' ? spec : spec.label || spec.alias || spec.field;
        out[label] = row[name];
      }
      return out;
    };

    if (!grouping.groupBy) {
      return { report: { id: report.id, name: report.name, code: report.code }, total: rows.length, rows: rows.map(project) };
    }
    const groups = new Map();
    for (const row of rows) {
      const key = String(row[grouping.groupBy] ?? '—');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(row);
    }
    const grouped = [...groups.entries()].map(([key, members]) => {
      const out = { [grouping.groupBy]: key, count: members.length };
      for (const agg of asArray(grouping.aggregates)) {
        out[agg.label || `${agg.fn}_${agg.field}`] = aggregate(members, agg.field, agg.fn);
      }
      return out;
    });
    return { report: { id: report.id, name: report.name, code: report.code }, total: grouped.length, rows: grouped };
  }
}

export default AnalyticsReportService;
