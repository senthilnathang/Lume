import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { AuthService } from '@core/services/jwt.service';
import { CreateUserDto, UpdateUserDto } from '../dtos';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private authService: AuthService) {}

  async findAll(filters: { role?: string; limit?: number }) {
    const users = await this.prisma.user.findMany({
      where: filters.role ? { role: { name: filters.role } } : {},
      include: { role: true },
      take: filters.limit || 50,
    });
    return { success: true, data: users };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return { success: true, data: user };
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
        name: dto.name,
        password_hash: passwordHash,
        role_id: dto.role_id || 2, // Default to 'user' role
      },
      include: { role: true },
    });

    return { success: true, data: user };
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name || user.name,
        role_id: dto.role_id || user.role_id,
      },
      include: { role: true },
    });

    return { success: true, data: updated };
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
        { name: 'name', type: 'string', editable: true },
        { name: 'role_id', type: 'integer', editable: true },
        { name: 'created_at', type: 'datetime', editable: false },
      ],
    };
  }
}
