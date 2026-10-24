import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { BadRequestException, NotFoundException, UseGuards, ValidationPipe } from '@nestjs/common';
import { GqlJwtGuard, GqlRbacGuard } from '../../../guards/index.js';
import { Permissions } from '../../../../core/decorators/permissions.decorator';
import { AdminSettingsService } from '../../../../modules/base/services/admin-settings.service';
import { SequenceInput, UpdateSequenceSettingsInput } from '../../../../modules/base/dtos/admin-settings.dto';
import { SequenceType } from '../types/sequence.type.js';
import { CreateSequenceInput } from '../inputs/create-sequence.input.js';
import { UpdateSequenceInput } from '../inputs/update-sequence.input.js';

@Resolver(() => SequenceType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
@Permissions('base.sequences.manage')
export class SequenceResolver {
  constructor(private readonly settings: AdminSettingsService) {}
  private readonly validation = new ValidationPipe({ transform: true, whitelist: true });

  private id(raw: string) {
    const id = Number(raw);
    if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(id)) throw new BadRequestException('Valid sequence ID required');
    return id;
  }
  private view(row: any) {
    return row && { ...row, id: String(row.id), nextValue: row.nextNumber ?? 1,
      step: row.increment ?? 1, padding: row.padding ?? 5, format: '{prefix}{number}{suffix}' };
  }
  private async input(input: CreateSequenceInput | UpdateSequenceInput, create: boolean) {
    if (input.format != null && !['{prefix}{number}', '{prefix}{number}{suffix}'].includes(input.format)) {
      throw new BadRequestException('Custom sequence formats are not supported');
    }
    if (['name','nextValue','step','padding'].some(key => input[key] === null)) throw new BadRequestException('Sequence fields cannot be null');
    const data = { name: input.name, prefix: input.prefix, nextNumber: input.nextValue,
      increment: input.step, padding: input.padding,
      ...(create ? { code: (input as CreateSequenceInput).code ?? input.name } : {}) };
    return this.validation.transform(data, { type: 'body', metatype: create ? SequenceInput : UpdateSequenceSettingsInput });
  }

  @Query(() => [SequenceType])
  async sequences() { return (await this.settings.sequences()).map(row => this.view(row)); }

  @Query(() => SequenceType, { nullable: true })
  async sequence(@Args('id', { type: () => String }) id: string) {
    return this.view(await this.settings.sequence(this.id(id)));
  }

  // Allocation writes state and must be a mutation, never a cacheable query.
  @Mutation(() => Int)
  async nextSequenceValue(@Args('id', { type: () => String }) id: string) {
    const row = await this.settings.sequence(this.id(id));
    if (!row) throw new NotFoundException('Sequence not found');
    return (await this.settings.nextSequence(row.code)).number;
  }

  @Mutation(() => SequenceType)
  async createSequence(@Args('input') input: CreateSequenceInput) {
    return this.view(await this.settings.createSequence(await this.input(input, true)));
  }

  @Mutation(() => SequenceType)
  async updateSequence(@Args('id', { type: () => String }) id: string, @Args('input') input: UpdateSequenceInput) {
    return this.view(await this.settings.updateSequence(this.id(id), await this.input(input, false)));
  }

  @Mutation(() => Boolean)
  async deleteSequence(@Args('id', { type: () => String }) id: string) {
    await this.settings.deleteSequence(this.id(id));
    return true;
  }
}
