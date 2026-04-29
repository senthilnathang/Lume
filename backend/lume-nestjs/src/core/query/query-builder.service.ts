import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { MetadataRegistryService } from '@core/runtime/metadata-registry.service';

export interface Filter {
  field: string;
  operator: string;
  value: any;
}

export interface Aggregation {
  field: string;
  type: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface QueryResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  aggregations?: Record<string, any>;
}

@Injectable()
export class QueryBuilderService {
  private currentEntity: string = '';
  private filters: Filter[] = [];
  private searchTerm?: string;
  private searchFields?: string[];
  private groupByField?: string;
  private aggregations?: Aggregation[];
  private orderByField?: string;
  private orderByDir: 'asc' | 'desc' = 'asc';
  private pageNum: number = 1;
  private pageLimit: number = 50;
  private selectedFields?: string[];

  constructor(
    private prisma: PrismaService,
    private metadataRegistry: MetadataRegistryService,
  ) {}

  query(entityName: string): this {
    this.currentEntity = entityName;
    return this;
  }

  filter(field: string, operator: string, value: any): this {
    this.filters.push({ field, operator, value });
    return this;
  }

  search(term: string, fields?: string[]): this {
    this.searchTerm = term;
    this.searchFields = fields;
    return this;
  }

  groupBy(field: string, aggregations?: Aggregation[]): this {
    this.groupByField = field;
    this.aggregations = aggregations;
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.orderByField = field;
    this.orderByDir = direction;
    return this;
  }

  paginate(page: number, limit: number): this {
    this.pageNum = page;
    this.pageLimit = limit;
    return this;
  }

  select(fields: string[]): this {
    this.selectedFields = fields;
    return this;
  }

  async execute(): Promise<QueryResult> {
    const entity = this.metadataRegistry.getEntity(this.currentEntity);
    if (!entity) {
      throw new Error(`Entity '${this.currentEntity}' not found`);
    }

    // Stub implementation: return mock data
    // In production, this would build actual Prisma or Drizzle queries
    const mockData = this.generateMockData(entity);
    const filtered = this.applyFilters(mockData);
    const searched = this.applySearch(filtered);
    const sorted = this.applySort(searched);
    const paginated = this.applyPagination(sorted);

    return {
      data: paginated.data,
      total: searched.length,
      page: this.pageNum,
      limit: this.pageLimit,
      totalPages: Math.ceil(searched.length / this.pageLimit),
    };
  }

  private generateMockData(entity: any): any[] {
    // Generate 100 mock records
    const data = [];
    for (let i = 1; i <= 100; i++) {
      const record: any = { id: i };
      for (const [fieldName, field] of Object.entries(entity.fields)) {
        const fieldDef = field as any;
        if (fieldDef.type === 'string') {
          record[fieldName] = `${fieldName}_${i}`;
        } else if (fieldDef.type === 'int') {
          record[fieldName] = i;
        } else if (fieldDef.type === 'number') {
          record[fieldName] = Math.random() * 100;
        } else if (fieldDef.type === 'boolean') {
          record[fieldName] = i % 2 === 0;
        } else {
          record[fieldName] = null;
        }
      }
      data.push(record);
    }
    return data;
  }

  private applyFilters(data: any[]): any[] {
    if (this.filters.length === 0) return data;

    return data.filter(record => {
      for (const filter of this.filters) {
        const value = record[filter.field];
        const matches = this.matchesCondition(value, filter.operator, filter.value);
        if (!matches) return false;
      }
      return true;
    });
  }

  private applySearch(data: any[]): any[] {
    if (!this.searchTerm) return data;

    const fields = this.searchFields || Object.keys(data[0] || {});
    const term = this.searchTerm.toLowerCase();

    return data.filter(record => {
      for (const field of fields) {
        const value = String(record[field] || '').toLowerCase();
        if (value.includes(term)) return true;
      }
      return false;
    });
  }

  private applySort(data: any[]): any[] {
    if (!this.orderByField) return data;

    return [...data].sort((a, b) => {
      const aVal = a[this.orderByField!];
      const bVal = b[this.orderByField!];

      if (aVal < bVal) return this.orderByDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.orderByDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private applyPagination(data: any[]): { data: any[]; total: number } {
    const start = (this.pageNum - 1) * this.pageLimit;
    const end = start + this.pageLimit;
    return {
      data: data.slice(start, end),
      total: data.length,
    };
  }

  private matchesCondition(value: any, operator: string, compareValue: any): boolean {
    switch (operator) {
      case '==':
        return value === compareValue;
      case '!=':
        return value !== compareValue;
      case '>':
        return value > compareValue;
      case '<':
        return value < compareValue;
      case '>=':
        return value >= compareValue;
      case '<=':
        return value <= compareValue;
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(value);
      case 'contains':
        return String(value).includes(String(compareValue));
      case 'startsWith':
        return String(value).startsWith(String(compareValue));
      case 'endsWith':
        return String(value).endsWith(String(compareValue));
      default:
        return true;
    }
  }
}
