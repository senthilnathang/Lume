import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websitePages } from '../models/schema';
import { eq, and, inArray, notInArray, gte, lte, asc, desc } from 'drizzle-orm';

@Injectable()
export class QueryService {
  constructor(private drizzle: DrizzleService) {}

  async execute(queryParams: any) {
    const db = this.drizzle.getDrizzle();
    const conditions = [eq(websitePages.isPublished, true)];

    if (queryParams.source && queryParams.source !== 'all') {
      conditions.push(eq(websitePages.pageType, queryParams.source));
    }

    if (queryParams.includeIds?.length) {
      const ids = (
        Array.isArray(queryParams.includeIds)
          ? queryParams.includeIds
          : String(queryParams.includeIds).split(',')
      )
        .map(Number)
        .filter(Boolean);
      if (ids.length) conditions.push(inArray(websitePages.id, ids));
    }

    if (queryParams.excludeIds?.length) {
      const ids = (
        Array.isArray(queryParams.excludeIds)
          ? queryParams.excludeIds
          : String(queryParams.excludeIds).split(',')
      )
        .map(Number)
        .filter(Boolean);
      if (ids.length) conditions.push(notInArray(websitePages.id, ids));
    }

    if (queryParams.dateFrom) {
      conditions.push(gte(websitePages.createdAt, new Date(queryParams.dateFrom)));
    }

    if (queryParams.dateTo) {
      conditions.push(lte(websitePages.createdAt, new Date(queryParams.dateTo)));
    }

    let q = db.select().from(websitePages).where(and(...conditions));

    const orderCol =
      queryParams.orderBy === 'title' ? websitePages.title : websitePages.createdAt;
    q = q.orderBy(
      queryParams.orderDir === 'asc' ? asc(orderCol) : desc(orderCol),
    );

    q = q.limit(Number(queryParams.limit) || 10).offset(Number(queryParams.offset) || 0);

    return await q;
  }
}
