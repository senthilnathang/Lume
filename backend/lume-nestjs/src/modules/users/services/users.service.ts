import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { AuthService } from '@core/services/jwt.service';
import { CreateUserDto, UpdateUserDto } from '../dtos';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private authService: AuthService) {}

  private safeUser(user: any) {
    const { password, refresh_token, password_reset_token, password_reset_expires, ...safe } = user;
    return { ...safe, first_name: user.firstName, last_name: user.lastName, is_active: user.isActive };
  }

  async findAll(filters: { role?: string; limit?: number; page?: number; search?: string }) {
    const limit = Number(filters.limit || 50);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) throw new BadRequestException('Invalid limit');
    const page = Number(filters.page || 1);
    if (!Number.isSafeInteger(page) || page < 1) throw new BadRequestException('Invalid page');
    const where = {
      ...(filters.role ? { role: { name: filters.role } } : {}),
      ...(filters.search ? { OR: ['email', 'firstName', 'lastName'].map(field => ({ [field]: { contains: filters.search } })) } : {}),
    };
    const users = await this.prisma.user.findMany({
      where,
      include: { role: true },
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { id: 'asc' },
    });
    if (filters.page !== undefined) return { success: true, data: {
      data: users.map(user => this.safeUser(user)), total: await this.prisma.user.count({ where }),
    } };
    return { success: true, data: users.map(user => this.safeUser(user)) };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return { success: true, data: this.safeUser(user) };
  }

  async create(dto: CreateUserDto) {
    // Check if user exists
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already exists');

    // Hash password
    const passwordHash = await this.authService.hashPassword(dto.password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: passwordHash,
        role_id: dto.role_id || 5, // Default to 'user' role
        phone: dto.phone,
        avatar: dto.avatar,
        isActive: dto.isActive,
      },
      include: { role: true },
    });

    return { success: true, data: this.safeUser(user) };
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);

    const updateData: any = {};
    if (dto.firstName) updateData.firstName = dto.firstName;
    if (dto.lastName) updateData.lastName = dto.lastName;
    if (dto.role_id) updateData.role_id = dto.role_id;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.password !== undefined) updateData.password = await this.authService.hashPassword(dto.password);

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    return { success: true, data: this.safeUser(updated) };
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);

    await this.prisma.user.delete({ where: { id } });
    return { success: true, message: `User #${id} deleted` };
  }

  async bulkCreate(dtos: CreateUserDto[]) {
    const created = [];
    for (const dto of dtos) {
      const user = await this.create(dto).catch(() => null);
      if (user) created.push(user.data);
    }
    return { success: true, data: created };
  }

  async bulkDelete(ids: number[]) {
    const deleted = await this.prisma.user.deleteMany({
      where: { id: { in: ids } },
    });
    return { success: true, message: `Deleted ${deleted.count} users` };
  }

  async getFields() {
    return {
      success: true,
      data: [
        { name: 'id', type: 'integer', editable: false },
        { name: 'email', type: 'email', editable: true },
        { name: 'firstName', type: 'string', editable: true },
        { name: 'lastName', type: 'string', editable: true },
        { name: 'role_id', type: 'integer', editable: true },
      ],
    };
  }

  async stats() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [total, active, newThisMonth] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    ]);
    return { success: true, data: { total, active, inactive: total - active, newThisMonth } };
  }
}
