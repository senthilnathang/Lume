import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import {
  CreateDonationDto,
  UpdateDonationDto,
  CreateDonorDto,
  CreateCampaignDto,
  QueryDonationsDto,
  QueryDonorsDto,
} from '../dtos';
import { eq, like, and, ilike, gte, lte } from 'drizzle-orm';

@Injectable()
export class DonationsService {
  private donations: any;
  private donors: any;
  private campaigns: any;

  constructor(private drizzle: DrizzleService) {
    this.initializeSchema();
  }

  private async initializeSchema() {
    try {
      const schema = await import('./models/schema');
      this.donations = schema.donations;
      this.donors = schema.donors;
      this.campaigns = schema.campaigns;
    } catch (error) {
      console.error('Failed to load donations schema:', error);
    }
  }

  // Donation Management
  async create(data: CreateDonationDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db.insert(this.donations).values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        data: { id: result[0].insertId, ...data },
        message: 'Donation created successfully',
      };
    } catch (error) {
      console.error('Create donation error:', error);
      return {
        success: false,
        error: 'Failed to create donation',
      };
    }
  }

  async findById(id: number) {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db
        .select()
        .from(this.donations)
        .where(eq(this.donations.id, id))
        .limit(1);

      if (!result || result.length === 0) {
        return {
          success: false,
          error: 'Donation not found',
        };
      }

      return {
        success: true,
        data: result[0],
      };
    } catch (error) {
      console.error('Find donation error:', error);
      return {
        success: false,
        error: 'Failed to fetch donation',
      };
    }
  }

  async findAll(options: QueryDonationsDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const {
        page = 1,
        limit = 20,
        status,
        donorId,
        campaignId,
        startDate,
        endDate,
      } = options;
      const offset = (page - 1) * limit;

      const conditions: any[] = [];

      if (status) {
        conditions.push(eq(this.donations.status, status));
      }
      if (donorId) {
        conditions.push(eq(this.donations.donorId, donorId));
      }
      if (campaignId) {
        conditions.push(eq(this.donations.campaignId, campaignId));
      }
      if (startDate) {
        conditions.push(
          gte(this.donations.createdAt, startDate.includes('T') ? startDate : new Date(startDate).toISOString())
        );
      }
      if (endDate) {
        conditions.push(
          lte(this.donations.createdAt, endDate.includes('T') ? endDate : new Date(endDate).toISOString())
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(this.donations)
          .where(whereClause)
          .orderBy(this.donations.createdAt)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: this.donations.id })
          .from(this.donations)
          .where(whereClause),
      ]);

      const total = countResult[0]?.count || 0;

      return {
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Find all donations error:', error);
      return {
        success: false,
        error: 'Failed to fetch donations',
      };
    }
  }

  async update(id: number, data: UpdateDonationDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const existing = await db
        .select()
        .from(this.donations)
        .where(eq(this.donations.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return {
          success: false,
          error: 'Donation not found',
        };
      }

      await db
        .update(this.donations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(this.donations.id, id));

      return {
        success: true,
        data: { id, ...data },
        message: 'Donation updated successfully',
      };
    } catch (error) {
      console.error('Update donation error:', error);
      return {
        success: false,
        error: 'Failed to update donation',
      };
    }
  }

  async updateStatus(id: number, status: string) {
    try {
      const db = this.drizzle.getDrizzle();
      const existing = await db
        .select()
        .from(this.donations)
        .where(eq(this.donations.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return {
          success: false,
          error: 'Donation not found',
        };
      }

      await db
        .update(this.donations)
        .set({ status, updatedAt: new Date() })
        .where(eq(this.donations.id, id));

      if (status === 'completed' && existing[0].campaignId) {
        await this.updateCampaignProgress(existing[0].campaignId);
      }

      return {
        success: true,
        data: { id, status },
        message: 'Donation status updated successfully',
      };
    } catch (error) {
      console.error('Update donation status error:', error);
      return {
        success: false,
        error: 'Failed to update donation status',
      };
    }
  }

  async delete(id: number) {
    try {
      const db = this.drizzle.getDrizzle();
      const existing = await db
        .select()
        .from(this.donations)
        .where(eq(this.donations.id, id))
        .limit(1);

      if (!existing || existing.length === 0) {
        return {
          success: false,
          error: 'Donation not found',
        };
      }

      await db
        .delete(this.donations)
        .where(eq(this.donations.id, id));

      return {
        success: true,
        message: 'Donation deleted successfully',
      };
    } catch (error) {
      console.error('Delete donation error:', error);
      return {
        success: false,
        error: 'Failed to delete donation',
      };
    }
  }

  // Donor Management
  async createDonor(data: CreateDonorDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db.insert(this.donors).values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        data: { id: result[0].insertId, ...data },
        message: 'Donor created successfully',
      };
    } catch (error) {
      console.error('Create donor error:', error);
      return {
        success: false,
        error: 'Failed to create donor',
      };
    }
  }

  async findDonorById(id: number) {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db
        .select()
        .from(this.donors)
        .where(eq(this.donors.id, id))
        .limit(1);

      if (!result || result.length === 0) {
        return {
          success: false,
          error: 'Donor not found',
        };
      }

      return {
        success: true,
        data: result[0],
      };
    } catch (error) {
      console.error('Find donor error:', error);
      return {
        success: false,
        error: 'Failed to fetch donor',
      };
    }
  }

  async findAllDonors(options: QueryDonorsDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const { page = 1, limit = 20, search } = options;
      const offset = (page - 1) * limit;

      const conditions: any[] = [];

      if (search) {
        conditions.push(
          ilike(this.donors.firstName, `%${search}%`)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(this.donors)
          .where(whereClause)
          .orderBy(this.donors.createdAt)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: this.donors.id })
          .from(this.donors)
          .where(whereClause),
      ]);

      const total = countResult[0]?.count || 0;

      return {
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Find all donors error:', error);
      return {
        success: false,
        error: 'Failed to fetch donors',
      };
    }
  }

  async getDonorStats(donorId: number) {
    try {
      const db = this.drizzle.getDrizzle();

      const donor = await db
        .select()
        .from(this.donors)
        .where(eq(this.donors.id, donorId))
        .limit(1);

      if (!donor || donor.length === 0) {
        return {
          success: false,
          error: 'Donor not found',
        };
      }

      const donations = await db
        .select({ amount: this.donations.amount })
        .from(this.donations)
        .where(
          and(
            eq(this.donations.donorId, donorId),
            eq(this.donations.status, 'completed')
          )
        );

      const totalDonations = donations.length;
      const totalAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);

      return {
        success: true,
        data: {
          donor: donor[0],
          totalDonations,
          totalAmount: totalAmount.toFixed(2),
          averageDonation:
            totalDonations > 0 ? (totalAmount / totalDonations).toFixed(2) : 0,
        },
      };
    } catch (error) {
      console.error('Get donor stats error:', error);
      return {
        success: false,
        error: 'Failed to fetch donor statistics',
      };
    }
  }

  // Campaign Management
  async createCampaign(data: CreateCampaignDto) {
    try {
      const db = this.drizzle.getDrizzle();
      const slug =
        this.slugify(data.name) + '-' + this.randomString(6);

      const result = await db.insert(this.campaigns).values({
        ...data,
        slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        data: { id: result[0].insertId, ...data, slug },
        message: 'Campaign created successfully',
      };
    } catch (error) {
      console.error('Create campaign error:', error);
      return {
        success: false,
        error: 'Failed to create campaign',
      };
    }
  }

  async findAllCampaigns() {
    try {
      const db = this.drizzle.getDrizzle();
      const result = await db
        .select()
        .from(this.campaigns)
        .where(eq(this.campaigns.status, 'active'))
        .orderBy(this.campaigns.createdAt);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Find all campaigns error:', error);
      return {
        success: false,
        error: 'Failed to fetch campaigns',
      };
    }
  }

  async getStats() {
    try {
      const db = this.drizzle.getDrizzle();

      const completedDonations = await db
        .select({ amount: this.donations.amount })
        .from(this.donations)
        .where(eq(this.donations.status, 'completed'));

      const pendingDonations = await db
        .select({ amount: this.donations.amount })
        .from(this.donations)
        .where(eq(this.donations.status, 'pending'));

      const uniqueDonors = await db
        .select({ donorId: this.donations.donorId })
        .from(this.donations)
        .where(eq(this.donations.status, 'completed'));

      const totalDonations = completedDonations.length;
      const totalAmount = completedDonations.reduce(
        (sum, d) => sum + parseFloat(d.amount),
        0
      );
      const pendingAmount = pendingDonations.reduce(
        (sum, d) => sum + parseFloat(d.amount),
        0
      );

      const uniqueDonorIds = new Set(uniqueDonors.map((d) => d.donorId));

      return {
        success: true,
        data: {
          totalDonations,
          totalAmount: totalAmount.toFixed(2),
          pendingAmount: pendingAmount.toFixed(2),
          uniqueDonors: uniqueDonorIds.size,
          averageDonation:
            totalDonations > 0 ? (totalAmount / totalDonations).toFixed(2) : 0,
        },
      };
    } catch (error) {
      console.error('Get donation stats error:', error);
      return {
        success: false,
        error: 'Failed to fetch statistics',
      };
    }
  }

  private async updateCampaignProgress(campaignId: number) {
    try {
      const db = this.drizzle.getDrizzle();
      const donations = await db
        .select({ amount: this.donations.amount })
        .from(this.donations)
        .where(
          and(
            eq(this.donations.campaignId, campaignId),
            eq(this.donations.status, 'completed')
          )
        );

      const raisedAmount = donations.reduce(
        (sum, d) => sum + parseFloat(d.amount),
        0
      );

      await db
        .update(this.campaigns)
        .set({ raisedAmount: raisedAmount.toString(), updatedAt: new Date() })
        .where(eq(this.campaigns.id, campaignId));
    } catch (error) {
      console.error('Update campaign progress error:', error);
    }
  }

  private slugify(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private randomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
