import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { featureFlags, dataImports, dataExports, featureFlagAuditLogs } from '../models/schema';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  CreateDataImportDto,
  UpdateDataImportDto,
  CreateDataExportDto,
  UpdateDataExportDto,
} from '../dtos';
import {
  FeatureFlagEvaluatorService,
  FeatureFlagContext,
} from './feature-flag-evaluator.service';
import { eq } from 'drizzle-orm';

@Injectable()
export class FeaturesDataService {
  private db: any;

  constructor(
    private drizzle: DrizzleService,
    private evaluator: FeatureFlagEvaluatorService,
  ) {
    this.db = drizzle.getDrizzle();
  }

  // ── Feature Flags ──────────────────────────────────────────────

  async getFeatureFlags(filters?: { enabled?: boolean }) {
    let query = this.db.select().from(featureFlags);

    if (filters?.enabled !== undefined) {
      query = query.where(eq(featureFlags.enabled, filters.enabled));
    }

    const results = await query;
    return { success: true, data: results };
  }

  async getFeatureFlag(id: number) {
    const result = await this.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, id));

    if (!result.length) {
      return { success: false, error: 'Feature flag not found' };
    }

    return { success: true, data: result[0] };
  }

  async getFeatureFlagByKey(key: string) {
    const result = await this.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, key));

    if (!result.length) {
      return { success: false, error: 'Feature flag not found' };
    }

    return { success: true, data: result[0] };
  }

  /**
   * Check if a feature flag is enabled for a given context
   */
  async isEnabledForContext(key: string, context: FeatureFlagContext): Promise<boolean> {
    const result = await this.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, key));

    if (!result.length) {
      return false;
    }

    const flag = result[0];
    return this.evaluator.evaluate(flag, context);
  }

  async createFeatureFlag(dto: CreateFeatureFlagDto, userId?: number, ipAddress?: string) {
    try {
      const result = await this.db.insert(featureFlags).values(dto);
      const flagId = result.insertId;

      await this.createAuditLog({
        flagId,
        flagKey: dto.key,
        action: 'created',
        oldValue: null,
        newValue: dto,
        changedBy: userId,
        ipAddress,
      });

      return { success: true, data: { id: flagId, ...dto } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateFeatureFlag(id: number, dto: UpdateFeatureFlagDto, userId?: number, ipAddress?: string) {
    try {
      const oldResult = await this.db
        .select()
        .from(featureFlags)
        .where(eq(featureFlags.id, id));

      if (!oldResult.length) {
        return { success: false, error: 'Feature flag not found' };
      }

      const oldValue = oldResult[0];

      await this.db
        .update(featureFlags)
        .set(dto)
        .where(eq(featureFlags.id, id));

      const result = await this.db
        .select()
        .from(featureFlags)
        .where(eq(featureFlags.id, id));

      await this.createAuditLog({
        flagId: id,
        flagKey: oldValue.key,
        action: 'updated',
        oldValue,
        newValue: result[0],
        changedBy: userId,
        ipAddress,
      });

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteFeatureFlag(id: number, userId?: number, ipAddress?: string) {
    try {
      const result = await this.db
        .select()
        .from(featureFlags)
        .where(eq(featureFlags.id, id));

      if (!result.length) {
        return { success: false, error: 'Feature flag not found' };
      }

      const flag = result[0];

      await this.db.delete(featureFlags).where(eq(featureFlags.id, id));

      await this.createAuditLog({
        flagId: id,
        flagKey: flag.key,
        action: 'deleted',
        oldValue: flag,
        newValue: null,
        changedBy: userId,
        ipAddress,
      });

      return { success: true, message: 'Feature flag deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async toggleFeatureFlag(key: string, enabled: boolean, userId?: number, ipAddress?: string) {
    try {
      const flag = await this.db
        .select()
        .from(featureFlags)
        .where(eq(featureFlags.key, key));

      if (!flag.length) {
        return { success: false, error: 'Feature flag not found' };
      }

      const oldValue = flag[0];

      await this.db
        .update(featureFlags)
        .set({ enabled })
        .where(eq(featureFlags.key, key));

      const updated = await this.db
        .select()
        .from(featureFlags)
        .where(eq(featureFlags.key, key));

      await this.createAuditLog({
        flagId: oldValue.id,
        flagKey: key,
        action: 'toggled',
        oldValue: { enabled: oldValue.enabled },
        newValue: { enabled },
        changedBy: userId,
        ipAddress,
      });

      return { success: true, data: updated[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Data Imports ───────────────────────────────────────────────

  async getDataImports(filters?: { status?: string; model?: string }) {
    let query = this.db.select().from(dataImports);

    if (filters?.status) {
      query = query.where(eq(dataImports.status, filters.status));
    }
    if (filters?.model) {
      query = query.where(eq(dataImports.model, filters.model));
    }

    const results = await query;
    return { success: true, data: results };
  }

  async getDataImport(id: number) {
    const result = await this.db
      .select()
      .from(dataImports)
      .where(eq(dataImports.id, id));

    if (!result.length) {
      return { success: false, error: 'Data import not found' };
    }

    return { success: true, data: result[0] };
  }

  async createDataImport(dto: CreateDataImportDto) {
    try {
      const result = await this.db.insert(dataImports).values(dto);
      return { success: true, data: { id: result.insertId, ...dto } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateDataImport(id: number, dto: UpdateDataImportDto) {
    try {
      await this.db
        .update(dataImports)
        .set(dto)
        .where(eq(dataImports.id, id));

      const result = await this.db
        .select()
        .from(dataImports)
        .where(eq(dataImports.id, id));

      if (!result.length) {
        return { success: false, error: 'Data import not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteDataImport(id: number) {
    try {
      const result = await this.db
        .select()
        .from(dataImports)
        .where(eq(dataImports.id, id));

      if (!result.length) {
        return { success: false, error: 'Data import not found' };
      }

      await this.db.delete(dataImports).where(eq(dataImports.id, id));

      return { success: true, message: 'Data import deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Data Exports ───────────────────────────────────────────────

  async getDataExports(filters?: { status?: string; model?: string }) {
    let query = this.db.select().from(dataExports);

    if (filters?.status) {
      query = query.where(eq(dataExports.status, filters.status));
    }
    if (filters?.model) {
      query = query.where(eq(dataExports.model, filters.model));
    }

    const results = await query;
    return { success: true, data: results };
  }

  async getDataExport(id: number) {
    const result = await this.db
      .select()
      .from(dataExports)
      .where(eq(dataExports.id, id));

    if (!result.length) {
      return { success: false, error: 'Data export not found' };
    }

    return { success: true, data: result[0] };
  }

  async createDataExport(dto: CreateDataExportDto) {
    try {
      const result = await this.db.insert(dataExports).values(dto);
      return { success: true, data: { id: result.insertId, ...dto } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateDataExport(id: number, dto: UpdateDataExportDto) {
    try {
      await this.db
        .update(dataExports)
        .set(dto)
        .where(eq(dataExports.id, id));

      const result = await this.db
        .select()
        .from(dataExports)
        .where(eq(dataExports.id, id));

      if (!result.length) {
        return { success: false, error: 'Data export not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteDataExport(id: number) {
    try {
      const result = await this.db
        .select()
        .from(dataExports)
        .where(eq(dataExports.id, id));

      if (!result.length) {
        return { success: false, error: 'Data export not found' };
      }

      await this.db.delete(dataExports).where(eq(dataExports.id, id));

      return { success: true, message: 'Data export deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Audit Logging ─────────────────────────────────────────────

  private async createAuditLog(data: {
    flagId?: number;
    flagKey: string;
    action: string;
    oldValue?: any;
    newValue?: any;
    changedBy?: number;
    ipAddress?: string;
  }) {
    try {
      await this.db.insert(featureFlagAuditLogs).values(data);
    } catch (error: any) {
      console.error(`Failed to create audit log for flag ${data.flagKey}: ${error.message}`);
    }
  }

  async getAuditLogs(flagId?: number, limit = 50, offset = 0) {
    let query = this.db.select().from(featureFlagAuditLogs);

    if (flagId) {
      query = query.where(eq(featureFlagAuditLogs.flagId, flagId));
    }

    const results = await query.limit(limit).offset(offset);
    return { success: true, data: results };
  }

  // ── Import/Export Helpers ──────────────────────────────────────

  parseCSV(content: string, hasHeader = true, delimiter = ','): { columns: string[]; rows: any[] } {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const columns: string[] = [];
    const rows: any[] = [];

    if (lines.length === 0) {
      throw new Error('File is empty');
    }

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    let dataStartIndex = 0;
    if (hasHeader) {
      const headerLine = parseCSVLine(lines[0]);
      columns.push(...headerLine);
      dataStartIndex = 1;
    } else {
      const firstRow = parseCSVLine(lines[0]);
      for (let i = 0; i < firstRow.length; i++) {
        columns.push(`Column_${i + 1}`);
      }
    }

    for (let i = dataStartIndex; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: any = {};
      columns.forEach((col, idx) => {
        row[col] = values[idx] || '';
      });
      rows.push(row);
    }

    return { columns, rows };
  }

  exportToCSV(data: any[], fields?: string[]): string {
    if (!data || data.length === 0) return '';

    const headers = fields || Object.keys(data[0]).filter(k => k !== 'id');

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = [headers.map(escapeCsv).join(',')];
    for (const row of data) {
      rows.push(headers.map(h => escapeCsv(row[h])).join(','));
    }

    return '﻿' + rows.join('\n');
  }

  exportToJSON(data: any[], fields?: string[]): string {
    if (fields && fields.length > 0) {
      data = data.map(row => {
        const filtered: any = {};
        for (const f of fields) {
          filtered[f] = row[f];
        }
        return filtered;
      });
    }
    return JSON.stringify(data, null, 2);
  }
}
