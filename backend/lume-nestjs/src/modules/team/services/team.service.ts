import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import {
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
  QueryTeamMembersDto,
  ReorderTeamMembersDto,
} from '../dtos';
import { and, eq, like, or, desc, sql, isNotNull } from 'drizzle-orm';

@Injectable()
export class TeamService {
  constructor(private drizzleService: DrizzleService) {}

  private getDb() {
    return this.drizzleService.getDrizzle();
  }

  private normalizeTeamMemberData(data: any) {
    const normalized: any = { ...data };

    // Handle field mapping from DTO to database
    if (data.firstName !== undefined) normalized.firstName = data.firstName;
    if (data.lastName !== undefined) normalized.lastName = data.lastName;
    if (data.phone !== undefined) normalized.phone = data.phone;
    if (data.position !== undefined) normalized.position = data.position;
    if (data.department !== undefined) normalized.department = data.department;
    if (data.bio !== undefined) normalized.bio = data.bio;
    if (data.photo !== undefined) normalized.photo = data.photo;
    if (data.order !== undefined) normalized.order = data.order;
    if (data.isActive !== undefined) normalized.isActive = data.isActive;
    if (data.isLeader !== undefined) normalized.isLeader = data.isLeader;
    if (data.socialLinks !== undefined) normalized.socialLinks = data.socialLinks;

    return normalized;
  }

  async create(createDto: CreateTeamMemberDto) {
    const db = this.getDrizzle();
    const { teamMembers } = db;

    const normalized = this.normalizeTeamMemberData(createDto);

    const result = await db.insert(teamMembers).values({
      ...normalized,
      isActive: createDto.isActive ?? true,
      isLeader: createDto.isLeader ?? false,
      order: createDto.order ?? 0,
    });

    const newMember = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, result.insertId))
      .limit(1);

    return {
      success: true,
      data: newMember[0],
      message: 'Team member created successfully',
    };
  }

  async findById(id: number) {
    const db = this.getDrizzle();
    const { teamMembers } = db;

    const member = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id))
      .limit(1);

    if (!member.length) {
      throw new NotFoundException('Team member not found');
    }

    return {
      success: true,
      data: member[0],
    };
  }

  async findAll(query: QueryTeamMembersDto) {
    const { page = 1, limit = 20, department, search, isActive, isLeader } = query;
    const offset = (page - 1) * limit;

    const db = this.getDrizzle();
    const { teamMembers } = db;

    // Build where clause
    const whereConditions: any[] = [];

    if (department) {
      whereConditions.push(eq(teamMembers.department, department));
    }

    if (isActive !== undefined) {
      whereConditions.push(eq(teamMembers.isActive, isActive));
    }

    if (isLeader !== undefined) {
      whereConditions.push(eq(teamMembers.isLeader, isLeader));
    }

    if (search) {
      whereConditions.push(
        or(
          like(teamMembers.firstName, `%${search}%`),
          like(teamMembers.lastName, `%${search}%`),
          like(teamMembers.position, `%${search}%`)
        )
      );
    }

    const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(teamMembers)
        .where(where)
        .orderBy([teamMembers.order, desc(teamMembers.createdAt)])
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(teamMembers)
        .where(where),
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
  }

  async getActive() {
    const db = this.getDrizzle();
    const { teamMembers } = db;

    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.isActive, true))
      .orderBy([teamMembers.order, desc(teamMembers.createdAt)]);

    return {
      success: true,
      data: members,
    };
  }

  async getLeaders() {
    const db = this.getDrizzle();
    const { teamMembers } = db;

    const members = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.isActive, true), eq(teamMembers.isLeader, true)))
      .orderBy(teamMembers.order);

    return {
      success: true,
      data: members,
    };
  }

  async getByDepartment(department: string) {
    const db = this.getDrizzle();
    const { teamMembers } = db;

    const members = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.department, department), eq(teamMembers.isActive, true)))
      .orderBy(teamMembers.order);

    return {
      success: true,
      data: members,
    };
  }

  async getDepartments() {
    const db = this.getDrizzle();
    const { teamMembers } = db;

    const results = await db
      .selectDistinct({ department: teamMembers.department })
      .from(teamMembers)
      .where(
        and(
          isNotNull(teamMembers.department),
          eq(teamMembers.isActive, true)
        )
      );

    const departments = results
      .map(r => r.department)
      .filter(d => d != null);

    return {
      success: true,
      data: departments,
    };
  }

  async update(id: number, updateDto: UpdateTeamMemberDto) {
    const db = this.getDrizzle();
    const { teamMembers } = db;

    // Check if member exists
    const member = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id))
      .limit(1);
    if (!member.length) {
      throw new NotFoundException('Team member not found');
    }

    const normalized = this.normalizeTeamMemberData(updateDto);

    await db.update(teamMembers).set(normalized).where(eq(teamMembers.id, id));

    const updated = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id))
      .limit(1);

    return {
      success: true,
      data: updated[0],
      message: 'Team member updated successfully',
    };
  }

  async delete(id: number) {
    const db = this.getDrizzle();
    const { teamMembers } = db;

    // Check if member exists
    const member = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id))
      .limit(1);
    if (!member.length) {
      throw new NotFoundException('Team member not found');
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, id));

    return {
      success: true,
      message: 'Team member deleted successfully',
    };
  }

  async reorder(reorderDto: ReorderTeamMembersDto) {
    const db = this.getDrizzle();
    const { teamMembers } = db;

    for (const { id, order } of reorderDto.members) {
      await db
        .update(teamMembers)
        .set({ order })
        .where(eq(teamMembers.id, id));
    }

    return {
      success: true,
      message: 'Team members reordered successfully',
    };
  }
}
