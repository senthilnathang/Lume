import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { MenuInput, UpdateMenuInput, SequenceInput, UpdateSequenceSettingsInput } from '../dtos/admin-settings.dto';

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async write<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) {
      if (error.code === 'P2025') throw new NotFoundException('Record not found');
      if (error.code === 'P2002') throw new ConflictException('Name or code already exists');
      if (error.code === 'P2003') throw new ConflictException('Record is referenced by another record');
      throw error;
    }
  }

  menus() { return this.prisma.menu.findMany({ orderBy: [{ sequence: 'asc' }, { id: 'asc' }] }); }

  saveMenu(input: MenuInput | UpdateMenuInput, id?: number) {
    return this.write(() => this.prisma.$transaction(async tx => {
      // Serialize hierarchy changes so concurrent reparenting cannot create cycles.
      const rows = await tx.$queryRaw<{ id: number; parent_id: number | null }[]>`SELECT id, parent_id FROM menus ORDER BY id FOR UPDATE`;
      const parents = new Map(rows.map(row => [row.id, row.parent_id]));
      if (id !== undefined && !parents.has(id)) throw new NotFoundException('Menu not found');
      if (input.parentId != null && !parents.has(input.parentId)) throw new BadRequestException('Parent menu not found');
      const visited = new Set<number>();
      let parent = input.parentId;
      while (parent != null) {
        if (parent === id || visited.has(parent)) throw new BadRequestException('Menu hierarchy cannot contain a cycle');
        visited.add(parent);
        parent = parents.get(parent);
      }
      const data = { ...input, updatedAt: new Date() };
      return id === undefined
        ? tx.menu.create({ data: { ...data, name: input.name!, path: input.path!, module: input.module || 'base', createdAt: new Date() } })
        : tx.menu.update({ where: { id }, data });
    }));
  }

  deleteMenu(id: number) { return this.write(() => this.prisma.menu.delete({ where: { id } })); }

  sequences() { return this.prisma.sequence.findMany({ orderBy: { code: 'asc' } }); }
  sequence(id: number) { return this.prisma.sequence.findUnique({ where: { id } }); }
  updateSequence(id: number, input: UpdateSequenceSettingsInput) {
    return this.write(() => this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM sequences WHERE id = ${id} FOR UPDATE`;
      const current = await tx.sequence.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Sequence not found');
      if (input.nextNumber != null && input.nextNumber < (current.nextNumber ?? 1)) throw new ConflictException('Sequence cannot move backwards');
      return tx.sequence.update({ where: { id }, data: { ...input, updatedAt: new Date() } });
    }));
  }
  createSequence(input: SequenceInput) {
    return this.write(() => this.prisma.sequence.create({ data: { ...input, createdAt: new Date(), updatedAt: new Date() } }));
  }
  deleteSequence(id: number) { return this.write(() => this.prisma.sequence.delete({ where: { id } })); }

  nextSequence(code: string) {
    return this.prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM sequences WHERE code = ${code} FOR UPDATE`;
      if (!rows.length) throw new NotFoundException('Sequence not found');
      const sequence = await tx.sequence.findUniqueOrThrow({ where: { id: rows[0].id } });
      if (sequence.isActive === false) throw new ConflictException('Sequence is inactive');
      const number = sequence.nextNumber ?? 1;
      const increment = sequence.increment ?? 1;
      const next = number + increment;
      if (number < 1 || increment < 1 || !Number.isSafeInteger(next) || next > 2147483647) throw new ConflictException('Sequence range exhausted or invalid');
      await tx.sequence.update({ where: { id: sequence.id }, data: { nextNumber: next, updatedAt: new Date() } });
      return { number, value: `${sequence.prefix || ''}${String(number).padStart(sequence.padding ?? 5, '0')}${sequence.suffix || ''}` };
    });
  }
}
