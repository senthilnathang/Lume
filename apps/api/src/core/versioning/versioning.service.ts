import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

export interface RecordVersion {
  id?: number;
  entityName: string;
  recordId: number;
  versionNumber: number;
  dataSnapshot: Record<string, any>;
  changedFields?: string[];
  diff?: Record<string, { from: any; to: any }>;
  changedBy?: number;
  changeType: 'create' | 'update' | 'delete';
  changeSource: 'user' | 'workflow' | 'api' | 'import';
  createdAt: Date;
}

export interface WorkflowVersion {
  id?: number;
  workflowName: string;
  versionNumber: string;
  definition: Record<string, any>;
  changedBy?: number;
  changeNote?: string;
  createdAt: Date;
}

export interface FieldDiff {
  field: string;
  from: any;
  to: any;
}

@Injectable()
export class VersioningService {
  // In-memory storage for versions (in production, use database)
  private recordVersions = new Map<string, RecordVersion[]>();
  private workflowVersions = new Map<string, WorkflowVersion[]>();

  constructor(private prisma: PrismaService) {}

  async saveRecordVersion(
    entityName: string,
    recordId: number,
    data: any,
    changeType: 'create' | 'update' | 'delete',
    userId?: number,
    changeSource: 'user' | 'workflow' | 'api' | 'import' = 'user',
  ): Promise<RecordVersion> {
    const key = `${entityName}:${recordId}`;
    const versions = this.recordVersions.get(key) || [];

    // Calculate version number
    const versionNumber = versions.length + 1;

    // Get previous version for diff
    const previousVersion = versions[versions.length - 1];
    const diff = previousVersion
      ? this.calculateDiff(previousVersion.dataSnapshot, data)
      : {};

    const changedFields = Object.keys(diff);

    const version: RecordVersion = {
      id: versions.length + 1,
      entityName,
      recordId,
      versionNumber,
      dataSnapshot: { ...data },
      changedFields,
      diff,
      changedBy: userId,
      changeType,
      changeSource,
      createdAt: new Date(),
    };

    versions.push(version);
    this.recordVersions.set(key, versions);

    return version;
  }

  async getRecordHistory(
    entityName: string,
    recordId: number,
    limit = 50,
  ): Promise<RecordVersion[]> {
    const key = `${entityName}:${recordId}`;
    const versions = this.recordVersions.get(key) || [];
    return versions.slice(-limit).reverse();
  }

  async restoreRecordVersion(
    entityName: string,
    recordId: number,
    versionId: number,
    userId?: number,
  ): Promise<RecordVersion> {
    const key = `${entityName}:${recordId}`;
    const versions = this.recordVersions.get(key) || [];

    const versionToRestore = versions.find(v => v.id === versionId);
    if (!versionToRestore) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Create a new version with the restored data
    const restoredVersion = await this.saveRecordVersion(
      entityName,
      recordId,
      versionToRestore.dataSnapshot,
      'update',
      userId,
      'api',
    );

    return restoredVersion;
  }

  async diffVersions(v1: RecordVersion, v2: RecordVersion): Promise<FieldDiff[]> {
    const diff: FieldDiff[] = [];
    const allFields = new Set([
      ...Object.keys(v1.dataSnapshot),
      ...Object.keys(v2.dataSnapshot),
    ]);

    for (const field of allFields) {
      const val1 = v1.dataSnapshot[field];
      const val2 = v2.dataSnapshot[field];

      if (val1 !== val2) {
        diff.push({ field, from: val1, to: val2 });
      }
    }

    return diff;
  }

  async saveWorkflowVersion(
    workflowName: string,
    definition: Record<string, any>,
    changeNote?: string,
    userId?: number,
  ): Promise<WorkflowVersion> {
    const versions = this.workflowVersions.get(workflowName) || [];

    // Extract version from definition or use timestamp-based versioning
    const versionNumber =
      definition.version ||
      `${new Date().getTime()}`;

    // Check if this version already exists
    const existingVersion = versions.find(v => v.versionNumber === versionNumber);
    if (existingVersion) {
      return existingVersion;
    }

    const version: WorkflowVersion = {
      id: versions.length + 1,
      workflowName,
      versionNumber,
      definition: { ...definition },
      changedBy: userId,
      changeNote,
      createdAt: new Date(),
    };

    versions.push(version);
    this.workflowVersions.set(workflowName, versions);

    return version;
  }

  async getWorkflowVersions(workflowName: string): Promise<WorkflowVersion[]> {
    return this.workflowVersions.get(workflowName) || [];
  }

  async getWorkflowVersion(
    workflowName: string,
    versionNumber: string,
  ): Promise<WorkflowVersion | undefined> {
    const versions = this.workflowVersions.get(workflowName) || [];
    return versions.find(v => v.versionNumber === versionNumber);
  }

  async rollbackWorkflow(
    workflowName: string,
    versionNumber: string,
  ): Promise<WorkflowVersion | null> {
    const version = await this.getWorkflowVersion(workflowName, versionNumber);
    if (!version) {
      return null;
    }

    // In production, this would update the workflow registry
    console.log(`Rolling back workflow ${workflowName} to version ${versionNumber}`);

    return version;
  }

  private calculateDiff(
    oldData: Record<string, any>,
    newData: Record<string, any>,
  ): Record<string, { from: any; to: any }> {
    const diff: Record<string, { from: any; to: any }> = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (oldValue !== newValue) {
        diff[key] = { from: oldValue, to: newValue };
      }
    }

    return diff;
  }
}
