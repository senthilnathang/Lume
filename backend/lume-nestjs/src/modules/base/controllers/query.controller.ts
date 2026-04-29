import { Controller, Post, Body } from '@nestjs/common';
import { QueryBuilderService, QueryResult } from '@core/query/query-builder.service';

export interface QueryRequest {
  entity: string;
  filters?: Array<{ field: string; operator: string; value: any }>;
  search?: { term: string; fields?: string[] };
  groupBy?: { field: string; aggregations?: Array<{ field: string; type: string }> };
  orderBy?: { field: string; direction?: 'asc' | 'desc' };
  pagination?: { page: number; limit: number };
  select?: string[];
}

@Controller('api/query')
export class QueryController {
  constructor(private queryBuilder: QueryBuilderService) {}

  @Post()
  async query(@Body() request: QueryRequest): Promise<QueryResult> {
    let query = this.queryBuilder.query(request.entity);

    // Apply filters
    if (request.filters && request.filters.length > 0) {
      for (const filter of request.filters) {
        query = query.filter(filter.field, filter.operator, filter.value);
      }
    }

    // Apply search
    if (request.search) {
      query = query.search(request.search.term, request.search.fields);
    }

    // Apply grouping
    if (request.groupBy) {
      query = query.groupBy(request.groupBy.field, request.groupBy.aggregations as any);
    }

    // Apply sorting
    if (request.orderBy) {
      query = query.orderBy(request.orderBy.field, request.orderBy.direction);
    }

    // Apply pagination
    const page = request.pagination?.page || 1;
    const limit = request.pagination?.limit || 50;
    query = query.paginate(page, limit);

    // Apply field selection
    if (request.select && request.select.length > 0) {
      query = query.select(request.select);
    }

    return query.execute();
  }
}
