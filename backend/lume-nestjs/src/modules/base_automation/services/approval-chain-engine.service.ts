import { Injectable, OnModuleInit } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { PrismaService } from '@core/services/prisma.service';
import { automationApprovalChains } from '../models/schema';
import { eq } from 'drizzle-orm';

export interface ApprovalRequest {
  id?: number;
  chainId: number;
  recordEntityId: number;
  recordId: number;
  currentStep: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  stepsData?: any[];
  initiatedBy?: number;
  completedAt?: Date;
}

@Injectable()
export class ApprovalChainEngineService implements OnModuleInit {
  private db: any;

  constructor(
    private drizzle: DrizzleService,
    private prisma: PrismaService,
  ) {
    this.db = drizzle.getDrizzle();
  }

  onModuleInit() {
    // Service initialized
  }

  async createApprovalRequest(request: Omit<ApprovalRequest, 'id'>): Promise<ApprovalRequest | null> {
    try {
      // Store approval request data
      const result = await this.db.insert(automationApprovalChains).values({
        ...request,
        stepsData: JSON.stringify(request.stepsData || []),
      });

      // In a real implementation, this would insert into approval_requests table
      // For now, we just return the request
      return { ...request, id: result?.insertId };
    } catch (error: any) {
      console.error(`Failed to create approval request: ${error.message}`);
      return null;
    }
  }

  async getApprovalRequest(requestId: number): Promise<ApprovalRequest | null> {
    try {
      // In a real implementation, query approval_requests table
      // For now, return null
      return null;
    } catch (error: any) {
      console.error(`Failed to get approval request: ${error.message}`);
      return null;
    }
  }

  async approveStep(requestId: number, stepIndex: number, approvedBy: number): Promise<boolean> {
    try {
      const request = await this.getApprovalRequest(requestId);
      if (!request) {
        return false;
      }

      // Check if all steps are approved
      const nextStep = stepIndex + 1;
      const chain = await this.getApprovalChain(request.chainId);

      if (!chain) {
        return false;
      }

      const steps = chain.steps || [];

      if (nextStep >= steps.length) {
        // All steps approved - mark as complete
        await this.completeApprovalRequest(requestId, approvedBy);
      } else {
        // Move to next step
        // In a real implementation, update approval_requests table
      }

      return true;
    } catch (error: any) {
      console.error(`Failed to approve step: ${error.message}`);
      return false;
    }
  }

  async rejectApproval(requestId: number, reason: string, rejectedBy: number): Promise<boolean> {
    try {
      const request = await this.getApprovalRequest(requestId);
      if (!request) {
        return false;
      }

      // Mark request as rejected
      // In a real implementation, update approval_requests table with status='rejected'
      // and record rejection reason

      return true;
    } catch (error: any) {
      console.error(`Failed to reject approval: ${error.message}`);
      return false;
    }
  }

  private async completeApprovalRequest(requestId: number, completedBy: number): Promise<void> {
    try {
      // Mark approval request as completed
      // In a real implementation, update approval_requests table
      // and potentially trigger a workflow or update the record
    } catch (error: any) {
      console.error(`Failed to complete approval request: ${error.message}`);
    }
  }

  private async getApprovalChain(chainId: number): Promise<any | null> {
    try {
      const chains = await this.db.select().from(automationApprovalChains);
      const chain = chains.find((c: any) => c.id === chainId);
      return chain || null;
    } catch (error: any) {
      console.error(`Failed to get approval chain: ${error.message}`);
      return null;
    }
  }

  async evaluateApprovalCondition(chainId: number, record: any): Promise<boolean> {
    try {
      const chain = await this.getApprovalChain(chainId);
      if (!chain) {
        return false;
      }

      const condition = chain.condition || {};
      return this.evaluateCondition(condition, record);
    } catch (error: any) {
      console.error(`Failed to evaluate approval condition: ${error.message}`);
      return false;
    }
  }

  private evaluateCondition(condition: any, data: Record<string, any>): boolean {
    if (!condition || Object.keys(condition).length === 0) {
      return true;
    }

    for (const [field, value] of Object.entries(condition)) {
      if (typeof value === 'object' && value !== null) {
        const op = Object.keys(value)[0];
        const opValue = (value as any)[op];

        switch (op) {
          case '$eq':
            if (data[field] !== opValue) return false;
            break;
          case '$ne':
            if (data[field] === opValue) return false;
            break;
          case '$gt':
            if (!(data[field] > opValue)) return false;
            break;
          case '$lt':
            if (!(data[field] < opValue)) return false;
            break;
          case '$in':
            if (!Array.isArray(opValue) || !opValue.includes(data[field])) return false;
            break;
          default:
            return false;
        }
      } else {
        if (data[field] !== value) return false;
      }
    }

    return true;
  }
}
